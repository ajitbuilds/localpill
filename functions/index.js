const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onValueCreated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const functions = require('firebase-functions/v1');
const admin = require("firebase-admin");
const geofire = require("geofire-common");
const logger = require("firebase-functions/logger");
const { performance } = require("perf_hooks");

// Use Gen 1 CPU allocation: CPU is only allocated during request processing.
// This prevents always-on CPU reservation that causes quota errors on Gen 2.
setGlobalOptions({
  maxInstances: 10,
  cpu: "gcf_gen1"
});

admin.initializeApp();
const db = admin.firestore();

/**
 * Helper with exponential backoff for internal retries
 * Logs permanent failures to functionErrors collection
 * @param {function} operation The async function to execute
 * @param {string} requestId The ID associated with the operation
 * @param {string} errorContext Context name (e.g. function name)
 */
async function withRetry(operation, requestId, errorContext) {
  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        await db.collection("functionErrors").add({
          requestId: requestId,
          context: errorContext,
          errorMessage: error.message || String(error),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.error("Function Permanent Failure", {
          requestId: requestId,
          context: errorContext,
          errorMessage: error.message || String(error),
        });
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * 1. onCreate of medicineRequests
 * - Fetches all online pharmacies
 * - Filters by radius & distance
 * - Sorts by distance ascending, fastResponderScore desc, reliabilityScore desc
 * - Selects top 20
 * - Sends FCM notification
 * - Updates notifiedPharmacies count
 */
exports.processMedicineRequestV2 = onDocumentCreated("medicineRequests/{requestId}", async (event) => {
  try {
    const requestId = event.params.requestId;

    await withRetry(async () => {
      const startTime = performance.now();
      const freshSnap = await db.collection("medicineRequests").doc(requestId).get();
      if (!freshSnap.exists) return;

      const requestData = freshSnap.data();
      if (requestData.processingStatus === "completed" || requestData.processingStatus === "running") {
        return; // Idempotency check
      }

      const userId = requestData.userId;

      if (userId) {
        // Fetch the user's most recent request (limit 2 to ensure we get the previous one, not just the current)
        const recentSnap = await db.collection("medicineRequests")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(2)
          .get();

        const previousRequest = recentSnap.docs.find((d) => d.id !== requestId);

        if (previousRequest) {
          const prevData = previousRequest.data();
          const prevTime = prevData.createdAt ? prevData.createdAt.toMillis() : 0;
          const currentTime = requestData.createdAt ? requestData.createdAt.toMillis() : Date.now();
          const timeDiffMs = currentTime - prevTime;

          // 2. Minimum Time Gap (10 seconds)
          if (timeDiffMs < 10000) {
            logger.warn(`User ${userId} requested too fast. Diff: ${timeDiffMs}ms`);
            await freshSnap.ref.update({
              processingStatus: "failed",
              status: "closed",
              rejectionReason: "too_fast_requests",
              errorMessage: "Please wait at least 10 seconds before submitting another request.",
            });
            return;
          }

          // 1. Duplicate Request Block (within 2 minutes)
          if (timeDiffMs < 120000) {
            const normalize = (arr) =>
              (arr || [])
                .filter(Boolean)
                .map((m) => String(m).toLowerCase().trim())
                .sort()
                .join("|");

            const prevKey = normalize(prevData.typedMedicines);
            const currKey = normalize(requestData.typedMedicines);

            if (prevKey === currKey) {
              logger.info("Duplicate request blocked", { userId, prevKey });
              logger.warn(`User ${userId} submitted duplicate request. Diff: ${timeDiffMs}ms`);
              await freshSnap.ref.update({
                processingStatus: "failed",
                status: "closed",
                rejectionReason: "duplicate_request",
                errorMessage: "You have already submitted this request recently.",
              });
              return;
            }
          }
        }
      }

      // Mark as running
      await freshSnap.ref.update({ processingStatus: "running" });

      const reqLocation = requestData.location;
      const searchRadiusKm = requestData.searchRadiusKm || 5;

      if (!reqLocation || !reqLocation.latitude || !reqLocation.longitude) {
        console.log(`[processMedicineRequest] Missing location for request ${requestId}`);
        await freshSnap.ref.update({ processingStatus: "failed" });
        return;
      }

      // Use geofire-common for bounded radius search
      const center = [reqLocation.latitude, reqLocation.longitude];
      const radiusInM = searchRadiusKm * 1000;
      const bounds = geofire.geohashQueryBounds(center, radiusInM);
      const promises = [];

      for (const b of bounds) {
        // Note: We remove the 'isOnline' where clause from this initial query specifically
        // so we can see offline pharmacies and accurately log them in the Debug Viewer.
        const q = db.collection("pharmacies")
          .orderBy("geohash")
          .startAt(b[0])
          .endAt(b[1]);
        promises.push(q.get());
      }

      const snapshots = await Promise.all(promises);
      const targetPharmaciesMap = new Map();

      const matchingLog = {
        requestId: requestId,
        scanned: [],
        matchedPharmacies: [],
        executionTimeMs: 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      for (const s of snapshots) {
        for (const doc of s.docs) {
          const pharmacyData = doc.data();
          const pLoc = pharmacyData.location;

          if (!pLoc || !pLoc.latitude || !pLoc.longitude) continue;

          const distKm = geofire.distanceBetween([pLoc.latitude, pLoc.longitude], center);

          const scannedEntry = {
            pharmacyId: doc.id,
            name: pharmacyData.name || "Unknown",
            distanceKm: distKm,
            fastResponderScore: pharmacyData.fastResponderScore || 0,
            reliabilityScore: pharmacyData.reliabilityScore || 0,
            isOnline: pharmacyData.isOnline === true,
            isVerified: pharmacyData.isVerified === true,
            status: "valid",
            filterReason: null,
          };

          if (!scannedEntry.isVerified) {
            scannedEntry.status = "filtered";
            scannedEntry.filterReason = "Unverified Account";
          } else if (!scannedEntry.isOnline) {
            scannedEntry.status = "filtered";
            scannedEntry.filterReason = "Offline";
          } else if (distKm > searchRadiusKm) {
            scannedEntry.status = "filtered";
            scannedEntry.filterReason = `Outside radius (${distKm.toFixed(1)} > ${searchRadiusKm})`;
          } else if (scannedEntry.reliabilityScore < 0) {
            // Example of generic score filtering
            scannedEntry.status = "filtered";
            scannedEntry.filterReason = "Low reliability score";
          } else {
            if (!targetPharmaciesMap.has(doc.id)) {
              targetPharmaciesMap.set(doc.id, {
                id: doc.id,
                fcmToken: pharmacyData.fcmToken || null,
                distanceKm: distKm,
                fastResponderScore: scannedEntry.fastResponderScore,
                reliabilityScore: scannedEntry.reliabilityScore,
                name: scannedEntry.name,
              });
            }
          }

          matchingLog.scanned.push(scannedEntry);
        }
      }

      const targetPharmacies = Array.from(targetPharmaciesMap.values());
      // Sort logic: Distance asc, fastResponder desc, reliability desc
      targetPharmacies.sort((a, b) => {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        if (b.fastResponderScore !== a.fastResponderScore) {
          return b.fastResponderScore - a.fastResponderScore;
        }
        return b.reliabilityScore - a.reliabilityScore;
      });

      // Send to ALL pharmacies within the radius (no cap)
      matchingLog.matchedPharmacies = targetPharmacies;

      const pharmacyIds = targetPharmacies.map((p) => p.id);
      const tokens = targetPharmacies.map((p) => p.fcmToken).filter((t) => t !== null);

      // Send FCM notifications if we have tokens
      let fcmSuccess = 0;
      let fcmFailure = 0;
      if (tokens.length > 0) {
        const message = {
          notification: {
            title: "New Medicine Request Nearby",
            body: "A patient near you is searching for medicines",
          },
          data: {
            requestId: requestId,
            type: "NEW_REQUEST",
          },
          tokens: tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        fcmSuccess = response.successCount;
        fcmFailure = response.failureCount;

        // CRITICAL BUG FIX: Issue #9 - Clean up expired/invalid FCM tokens
        if (fcmFailure > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered') {
                failedTokens.push(tokens[idx]);
              }
            }
          });

          // Remove dead tokens from pharmacy docs
          // Note: Since pharmacies structure currently stores strings not arrays for fcmToken,
          // we will nullify them. If it was an array, we'd use FieldValue.arrayRemove().
          if (failedTokens.length > 0) {
            logger.info(`Cleaning up ${failedTokens.length} dead FCM tokens from pharmacies...`);
            // Fix #44: Use Promise.all+map so async writes are properly awaited
            await Promise.all(failedTokens.map(async (deadToken) => {
              try {
                const pRefs = await db.collection('pharmacies').where('fcmToken', '==', deadToken).get();
                await Promise.all(pRefs.docs.map(doc => doc.ref.update({ fcmToken: null })));
              } catch (e) { /* ignore cleanup errors */ }
            }));
          }
        }
      }

      // Update the request document with results using a transaction
      await db.runTransaction(async (transaction) => {
        transaction.update(freshSnap.ref, {
          notifiedPharmaciesCount: pharmacyIds.length,
          targetPharmacies: pharmacyIds,
          targetPharmacyIds: pharmacyIds, // added for Dashboard compatibility
          processingStatus: "completed",
        });
      });

      const executionTimeMs = performance.now() - startTime;
      matchingLog.executionTimeMs = executionTimeMs;

      // Save debug log securely to matchingLogs
      await db.collection("matchingLogs").doc(requestId).set(matchingLog);
      const totalAttempts = fcmSuccess + fcmFailure;
      const failureRate = totalAttempts > 0 ? fcmFailure / totalAttempts : 0;

      logger.info("processMedicineRequest Execution Stats", {
        requestId: requestId,
        executionTimeMs: executionTimeMs,
        notifiedPharmacies: pharmacyIds.length,
        fcmSuccessCount: fcmSuccess,
        fcmFailureCount: fcmFailure,
        fcmFailureRate: failureRate,
      });
    }, event.params.requestId, "processMedicineRequest");

    return null;
  } catch (error) {
    logger.error("processMedicineRequest wrapper error", { error: error.message, requestId: event.params.requestId });
    // Attempt to mark as failed
    await db.collection("medicineRequests").doc(event.params.requestId)
      .update({ processingStatus: "failed" }).catch(() => { });
    return null;
  }
});

/**
 * 2. onCreate of pharmacyResponses
 * - Calculates response time
 * - Marks fastResponder if < 60 sec
 * - Updates response score in pharmacy doc
 * - Increments responsesCount in request doc
 * - Checks if available, assigns, and stops
 */
exports.processPharmacyResponse = onDocumentCreated("medicineRequests/{requestId}/pharmacyResponses/{responseId}", async (event) => {
  try {
    const snap = event.data;
    const responseData = snap.data();
    const { requestId, responseId } = event.params;
    const pharmacyId = responseData.pharmacyId;

    // SEC FIX: Validate pharmacyId matches the document ID to prevent identity spoofing
    if (pharmacyId !== responseId) {
      logger.warn("Identity spoof attempt detected", {
        requestId,
        documentId: responseId,
        claimedPharmacyId: pharmacyId,
      });
      // Mark the response as fraudulent and exit
      await snap.ref.update({ flagged: true, flagReason: "pharmacyId_mismatch" });
      return null;
    }

    await withRetry(async () => {
      const requestRef = db.collection("medicineRequests").doc(requestId);
      const requestSnap = await requestRef.get();

      if (!requestSnap.exists) {
        console.log(`[processPharmacyResponse] Request ${requestId} not found.`);
        return;
      }

      const requestData = requestSnap.data();
      const reqCreatedAtMs = requestData.createdAt?.toMillis?.() ?? Date.now();
      const responseTimeMs = Date.now() - reqCreatedAtMs;
      const responseTimeSec = Math.max(0, Math.floor(responseTimeMs / 1000));

      const isFastResponder = responseTimeSec < 60;

      // Update response with calculated metrics
      await snap.ref.update({
        responseTimeSec: responseTimeSec,
        fastResponder: isFastResponder,
      });

      // Use transaction to update responses count and status safely
      await db.runTransaction(async (transaction) => {
        const tReqSnap = await transaction.get(requestRef);
        if (!tReqSnap.exists) return;

        const tReqData = tReqSnap.data();
        const currentResponsesCount = tReqData.responsesCount || 0;

        const updates = {
          responsesCount: currentResponsesCount + 1,
          respondedPharmacies: admin.firestore.FieldValue.arrayUnion(pharmacyId),
        };

        // The request status is NO LONGER auto-matched here.
        // The request stays 'pending' so multiple pharmacies can respond.
        // Only the patient should decide when to close or match it manually via the chat.

        transaction.update(requestRef, updates);
      });

      if (responseData.responseType === "available") {
        console.log(`[processPharmacyResponse] Request ${requestId} assigned to ${pharmacyId}`);
      }

      // Update pharmacy scores transactionally
      const pharmacyRef = db.collection("pharmacies").doc(pharmacyId);
      await db.runTransaction(async (transaction) => {
        const pSnap = await transaction.get(pharmacyRef);
        if (!pSnap.exists) return;

        const pData = pSnap.data();

        let newFastScore = pData.fastResponderScore || 0;
        let newReliability = pData.reliabilityScore || 0;

        newReliability += 1;
        if (isFastResponder) {
          newFastScore += 1;
        }

        transaction.update(pharmacyRef, {
          fastResponderScore: newFastScore,
          reliabilityScore: newReliability,
        });
      });

      console.log(`[processPharmacyResponse] Processed response for ${requestId} from ${pharmacyId} in ${responseTimeSec}s.`);

      // ── SEND NOTIFICATION TO PATIENT ──
      try {
        const patientId = requestData.userId;
        const patientSnap = await db.collection("users").doc(patientId).get();
        const patientFCM = patientSnap.exists ? patientSnap.data().fcmToken : null;

        if (patientFCM) {
          const pharmacyName = (await db.collection("pharmacies").doc(pharmacyId).get()).data()?.name || "A pharmacy";

          // Build message based on responseType
          const responseType = responseData.responseType || "available";
          let notifTitle, notifBody;
          if (responseType === "available") {
            notifTitle = "✅ Medicine Available!";
            notifBody = `${pharmacyName} has your medicine available. Open the app to chat!`;
          } else if (responseType === "partial") {
            notifTitle = "⚡ Partial Stock Available";
            notifBody = `${pharmacyName} has partial stock. Tap to check details and chat.`;
          } else {
            notifTitle = "❌ Not Available";
            notifBody = `${pharmacyName} doesn't have the medicine right now. You can still chat for alternatives.`;
          }

          const message = {
            notification: {
              title: notifTitle,
              body: notifBody,
            },
            data: {
              requestId: requestId,
              type: "PHARMACY_RESPONSE",
              responseType: responseType,
            },
            token: patientFCM,
          };

          // Save in-app notification to Firestore
          const notificationRef = db.collection("notifications").doc(patientId).collection("userNotifications").doc();
          await notificationRef.set({
            title: notifTitle,
            body: notifBody,
            type: "PHARMACY_RESPONSE",
            relatedId: requestId,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await admin.messaging().send(message);
          logger.info(`Notification sent to patient ${patientId} for ${responseType} response from ${pharmacyId}`);
        }
      } catch (notifErr) {
        logger.error("Error sending response notification to patient:", notifErr);
      }
    }, requestId, "processPharmacyResponse");

    return null;
  } catch (error) {
    console.error("[processPharmacyResponse] Hard failure: ", error);
    return null;
  }
});

/**
 * 3. onWrite of pharmacies
 * - Automatically computes and maintains the GeoHash field whenever location geometry updates
 * - Allows backend searches to seamlessly pivot around geographical constraints
 */
exports.onPharmacyLocationUpdate = onDocumentWritten("pharmacies/{pharmacyId}", async (event) => {
  const change = event.data;
  if (!change.after.exists) return null; // Pharmacy was deleted
  const data = change.after.data();

  const pLoc = data.location;
  if (!pLoc || !pLoc.latitude || !pLoc.longitude) return null;

  const hash = geofire.geohashForLocation([pLoc.latitude, pLoc.longitude]);

  if (data.geohash !== hash) {
    return change.after.ref.update({ geohash: hash });
  }
  return null;
});

/**
 * 4. Scheduled job (every 1 minute)
 * - Identifies expired pending requests
 * - Marks them as 'closed' safely using transactions
 */
exports.closeExpiredRequests = onSchedule("every 1 minutes", async (event) => {
  try {
    const now = admin.firestore.Timestamp.now();
    const expiredRequestsQuery = db.collection("medicineRequests")
      .where("status", "==", "pending")
      .where("expiresAt", "<", now)
      .limit(100);

    const snapshot = await expiredRequestsQuery.get();

    if (snapshot.empty) {
      return null;
    }

    let closedCount = 0;

    await db.runTransaction(async (transaction) => {
      const reads = snapshot.docs.map((doc) => transaction.get(doc.ref));
      const docSnaps = await Promise.all(reads);

      docSnaps.forEach((docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          if (data.status === "pending" && data.expiresAt.toMillis() < Date.now()) {
            transaction.update(docSnap.ref, { status: "closed", closeReason: "timeout" });
            closedCount++;
          }
        }
      });
    });

    if (closedCount > 0) {
      console.log(`[closeExpiredRequests] Successfully closed ${closedCount} expired requests.`);
    }
    return null;
  } catch (error) {
    console.error("[closeExpiredRequests] Error closing expired requests:", error);
    return null;
  }
});

/**
 * Callable function to explicitly test FCM connectivity * Callable to test FCM. Now secured for authenticated users only. Let's send to a specific FCM token.
 */
exports.sendTestFCM = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Endpoint restricted to authenticated users."
    );
  }
  const { token, title, body } = request.data;
  if (!token) {
    throw new HttpsError("invalid-argument", "FCM token is required.");
  }
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can execute diagnostic tests.");
  }

  const pharmacyId = request.data.pharmacyId;

  const message = {
    notification: {
      title: "LocalPill System Diagnostic",
      body: "Push notification connectivity successfully verified natively.",
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);

    if (pharmacyId) {
      await db.collection("pharmacies").doc(pharmacyId).update({
        lastNotificationAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      successCount: 1,
      failureCount: 0,
      messageId: response,
    };
  } catch (error) {
    logger.error("FCM Send Action Failure", error);

    // Bug 7 fix: Clean up dead tokens
    if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
      if (pharmacyId) {
        await db.collection("pharmacies").doc(pharmacyId).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => { });
        await db.collection("users").doc(pharmacyId).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => { });
      }
    }

    return {
      success: false,
      successCount: 0,
      failureCount: 1,
      error: error.message,
    };
  }
});

/**
 * Generates a time-limited signed URL for prescription access.
 */
exports.generateSignedPrescriptionUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User session expired or invalid.");
  }

  const { requestId } = request.data;
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Missing required file identifiers.");
  }

  // 2. Cross-reference Firestore to lock down permissions geographically
  const requestSnap = await admin.firestore().collection("medicineRequests").doc(requestId).get();
  if (!requestSnap.exists) {
    throw new HttpsError("not-found", "The targeting request does not exist.");
  }

  const reqData = requestSnap.data();
  if (!reqData.prescriptionUrl) {
    throw new HttpsError("not-found", "No prescription associated with this request.");
  }

  const userId = request.auth.uid;

  // Rule: It's the Patient who uploaded it
  const isOwner = reqData.userId === userId;

  // Rule: It's genuinely a Pharmacy that HAS explicitly responded to this specific request
  let isRespondingPharmacy = false;
  if (!isOwner) {
    const responseSnap = await requestSnap.ref.collection("pharmacyResponses").doc(userId).get();
    if (responseSnap.exists) {
      isRespondingPharmacy = true;
    }
  }

  if (!isOwner && !isRespondingPharmacy) {
    throw new HttpsError("permission-denied", "HIPAA Violation: You do not have permission to view this specific patient's prescription.");
  }

  // 3. Generate the Ephemeral Signed URL native to Google Cloud backend keys
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(reqData.prescriptionUrl);

    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", "File was purged from the backend bucket.");
    }

    // URL is valid for exactly 10 Minutes (600 seconds)
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 10 * 60 * 1000,
    });

    return {
      success: true,
      url: signedUrl,
    };
  } catch (error) {
    logger.error("Signed URL Cryptography Failure", error);
    throw new HttpsError("internal", "Failed to generate symmetric key wrapper.");
  }
});

/**
 * 6. onWrite of RTDB chat messages
 * - Triggers when a new message is added to a chat
 * - Sends notification to the recipient (patient or pharmacy)
 */
exports.notifyNewChatMessage = onValueCreated("/chats/{chatId}/{messageId}", async (event) => {
  const data = event.data.val();
  if (!data || event.params.messageId === "typing" || event.params.messageId === "lastRead" || event.params.messageId === "reactions") return null;

  const { chatId } = event.params;
  const senderId = data.senderId;

  // Parse chatId {requestId}_{pharmacyId}
  const parts = chatId.split("_");
  if (parts.length < 2) return null;
  const requestId = parts[0];
  const pharmacyId = parts[1];

  // Fix #42: Moved recipientId before try block so catch block can reference it
  let recipientId;
  try {
    const requestSnap = await db.collection("medicineRequests").doc(requestId).get();
    if (!requestSnap.exists) return null;
    const patientId = requestSnap.data().userId;

    if (senderId === patientId) {
      recipientId = pharmacyId;
    } else if (senderId === pharmacyId) {
      recipientId = patientId;
    } else {
      return null;
    }

    // Issue #4 fix: Register both participants in chatMembers via Admin SDK
    // Admin SDK bypasses RTDB rules, enabling the write-once chatMembers system.
    // This ensures unread badge reads work from patient dashboard before chat is opened.
    const chatMembersRef = admin.database().ref(`chatMembers/${chatId}`);
    const existingMembers = await chatMembersRef.once("value");
    const membersData = existingMembers.val() || {};
    const updates = {};
    if (!membersData[patientId]) updates[patientId] = true;
    if (!membersData[pharmacyId]) updates[pharmacyId] = true;
    if (Object.keys(updates).length > 0) {
      await chatMembersRef.update(updates);
    }

    // Get recipient token
    // Check users collection first, then pharmacies (though pharmacies should also be users)
    let recipientSnap = await db.collection("users").doc(recipientId).get();
    let fcmToken = recipientSnap.exists ? recipientSnap.data().fcmToken : null;

    if (!fcmToken && recipientId === pharmacyId) {
      recipientSnap = await db.collection("pharmacies").doc(recipientId).get();
      fcmToken = recipientSnap.exists ? recipientSnap.data().fcmToken : null;
    }

    if (fcmToken) {
      const senderName = data.senderName || "New message";
      const message = {
        notification: {
          title: `Message from ${senderName}`,
          body: data.text || "Sent a message",
        },
        data: {
          requestId: requestId,
          pharmacyId: pharmacyId,
          type: "CHAT_MESSAGE",
          chatId: chatId,
        },
        token: fcmToken,
      };

      // Save in-app notification to Firestore
      const notificationRef = db.collection("notifications").doc(recipientId).collection("userNotifications").doc();
      await notificationRef.set({
        title: message.notification.title,
        body: message.notification.body,
        type: "CHAT_MESSAGE",
        relatedId: chatId,
        senderId: senderId,
        senderName: data.senderName || null,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await admin.messaging().send(message);
      logger.info(`Chat notification sent to ${recipientId} from ${senderId}`);
    }
  } catch (error) {
    logger.error("Chat notification failure:", error);
    // Bug 7 fix: Clean up dead tokens
    if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
      if (recipientId) {
        await db.collection("users").doc(recipientId).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => { });
        await db.collection("pharmacies").doc(recipientId).update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => { });
      }
    }
  }
  return null;
});

/**
 * Admin Panel: Broadcast Notification to Pharmacies
 * Allows admins to send custom push notifications to either online or all verified pharmacies.
 */
exports.broadcastToPharmacies = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can broadcast messages.");
  }

  const { title, body, target } = request.data;
  if (!title || !body) {
    throw new HttpsError("invalid-argument", "Title and Body are required.");
  }

  try {
    let query = db.collection("pharmacies").where("isVerified", "==", true);
    if (target === "online") {
      query = query.where("isOnline", "==", true);
    }

    const pharmaciesSnap = await query.get();
    const tokens = [];

    pharmaciesSnap.forEach((doc) => {
      const token = doc.data().fcmToken;
      if (token) tokens.push(token);
    });

    if (tokens.length === 0) {
      return { success: true, sentCount: 0, message: "No devices found to broadcast to." };
    }

    // Firebase Admin messaging.sendMulticast max limit is 500 per call
    const messages = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);
      messages.push(
        admin.messaging().sendEachForMulticast({
          tokens: chunk,
          notification: {
            title: title,
            body: body,
          },
          data: {
            type: "BROADCAST_MESSAGE",
          },
        }),
      );
    }

    const responses = await Promise.all(messages);

    let successCount = 0;
    let failureCount = 0;

    responses.forEach((response) => {
      successCount += response.successCount;
      failureCount += response.failureCount;
    });

    logger.info(`Broadcast sent: ${successCount} successful, ${failureCount} failed.`);

    return {
      success: true,
      sentCount: successCount,
      failureCount: failureCount,
    };
  } catch (error) {
    logger.error("Broadcast failed", error);
    throw new HttpsError("internal", "Failed to send broadcast message.");
  }
});

/**
 * Sync Firestore Admin Roles to RTDB
 * Required because RTDB rules cannot natively read Firestore collections
 */
exports.syncAdminRoleToRTDB = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const adminRef = admin.database().ref(`admins/${userId}`);
  const change = event.data;

  if (!change.after.exists) {
    // User was deleted
    return adminRef.remove();
  }

  const userData = change.after.data();
  if (userData.role === "admin") {
    return adminRef.set(true);
  } else {
    return adminRef.remove();
  }
});

/**
 * Endpoint to get public stats for the landing page (Issue #34)
 * Uses Firestore Count queries which are highly optimized and cheap.
 */
exports.getPublicStats = onCall(async (request) => {
  try {
    const [reqsSnap, pharmSnap] = await Promise.all([
      db.collection("medicineRequests").count().get(),
      db.collection("pharmacies").where("isVerified", "==", true).count().get()
    ]);

    return {
      requestsCount: reqsSnap.data().count,
      pharmaciesCount: pharmSnap.data().count
    };
  } catch (err) {
    logger.error("Failed to fetch public stats", err);
    throw new HttpsError("internal", "Failed to fetch stats");
  }
});

/**
 * ONE-TIME MIGRATION: Fix pharmacy documents
 * - Adds geohash field for geo-queries
 * - Renames "verified" to "isVerified" field
 * Call this once after deploying to fix existing pharmacies.
 * Admin-only: Requires admin claim in auth token.
 */
exports.migratePharmacyData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  const adminCheck = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminCheck.exists) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  logger.info("Starting pharmacy data migration...");
  const snap = await db.collection("pharmacies").get();
  let geohashCount = 0;
  let verifiedFieldCount = 0;

  for (const doc of snap.docs) {
    const docData = doc.data();
    const updates = {};

    // Fix 1: Add/update geohash field
    if (docData.location && docData.location.latitude && docData.location.longitude) {
      const hash = geofire.geohashForLocation([docData.location.latitude, docData.location.longitude]);
      if (docData.geohash !== hash) {
        updates.geohash = hash;
        geohashCount++;
      }
    }

    // Fix 2: Copy "verified" to "isVerified" if only old field exists
    if (docData.verified !== undefined && docData.isVerified === undefined) {
      updates.isVerified = docData.verified;
      verifiedFieldCount++;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      logger.info(`Updated pharmacy ${doc.id}`, updates);
    }
  }

  const result = {
    success: true,
    totalPharmacies: snap.docs.length,
    geohashFixed: geohashCount,
    verifiedFieldFixed: verifiedFieldCount
  };

  logger.info("Migration complete", result);
  return result;
});

/**
 * Auth Bridge: Exchanges a Native Firebase ID token for a Web SDK Custom Token.
 * This is used by the mobile app so that it can use both Native Auth (for OTP)
 * and Web SDK (for Firestore) without permission issues.
 */
exports.exchangeCustomToken = onCall(async (request) => {
  const { idToken } = request.data;
  if (!idToken) {
    throw new HttpsError("invalid-argument", "idToken is required.");
  }

  try {
    // 1. Verify the Native ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "Invalid token.");
    }

    // 2. Generate a Custom Token for the Web SDK
    const customToken = await admin.auth().createCustomToken(uid);

    return { customToken };
  } catch (error) {
    logger.error("Error exchanging custom token", error);
    throw new HttpsError("unauthenticated", "Failed to exchange token.");
  }
});

// ==========================================
// NEW NOTIFICATION ENHANCEMENTS
// ==========================================

/**
 * 1. Profile Completion Reminders
 * Runs daily to remind customers to complete their profiles.
 */
exports.remindProfileCompletion = onSchedule("every 24 hours", async (event) => {
  try {
    const usersSnap = await db.collection("users").get();
    const tokens = [];
    const userIds = [];

    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken && data.role !== "pharmacy" && data.role !== "admin") {
        if (!data.name || !data.age) {
          tokens.push(data.fcmToken);
          userIds.push(doc.id);
        }
      }
    });

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: "Complete Your Profile 👤",
          body: "Please complete your profile so pharmacies can assist you better!",
        },
        data: { type: "PROFILE_INCOMPLETE" }
      };

      const messages = [];
      for (let i = 0; i < tokens.length; i += 500) {
        messages.push(admin.messaging().sendEachForMulticast({ ...message, tokens: tokens.slice(i, i + 500) }));
      }
      await Promise.all(messages);
      logger.info(`Sent profile completion reminders to ${tokens.length} users.`);

      let currentBatch = db.batch();
      let count = 0;
      for (const uid of userIds) {
        const notifRef = db.collection("notifications").doc(uid).collection("userNotifications").doc();
        currentBatch.set(notifRef, {
          title: message.notification.title,
          body: message.notification.body,
          type: "PROFILE_INCOMPLETE",
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
        if (count === 400) {
          await currentBatch.commit();
          currentBatch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await currentBatch.commit();
    }
    return null;
  } catch (err) {
    logger.error("Error in remindProfileCompletion", err);
    return null;
  }
});

/**
 * 2. Onboarding/Welcome Messages
 * Sends a welcome notification when a new user document is created.
 */
exports.sendWelcomeNotification = onDocumentCreated("users/{uid}", async (event) => {
  const snap = event.data;
  const data = snap.data();
  if (!data) return null;

  if (data.role === "pharmacy") return null;

  const notifTitle = "Welcome to LocalPill! 👋";
  const notifBody = "Search for your first medicine or upload a prescription now.";

  const notificationRef = db.collection("notifications").doc(event.params.uid).collection("userNotifications").doc();
  await notificationRef.set({
    title: notifTitle,
    body: notifBody,
    type: "WELCOME",
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (data.fcmToken) {
    try {
      await admin.messaging().send({
        notification: { title: notifTitle, body: notifBody },
        data: { type: "WELCOME" },
        token: data.fcmToken,
      });
    } catch (e) {
      logger.error("Error sending welcome FCM", e);
    }
  }
  return null;
});

/**
 * 3. Pharmacy Status Alerts
 * Runs every 4 hours to alert pharmacies if they are online for > 12 hours.
 */
exports.remindPharmacyStatus = onSchedule("every 4 hours", async (event) => {
  try {
    const pharmaciesSnap = await db.collection("pharmacies")
      .where("isOnline", "==", true)
      .where("isVerified", "==", true)
      .get();

    const tokens = [];

    pharmaciesSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: "Still Open? 🏪",
          body: "Are you still open? Don't forget to go Offline if your pharmacy is closed.",
        },
        data: { type: "STATUS_REMINDER" }
      };

      const messages = [];
      for (let i = 0; i < tokens.length; i += 500) {
        messages.push(admin.messaging().sendEachForMulticast({ ...message, tokens: tokens.slice(i, i + 500) }));
      }
      await Promise.all(messages);
      logger.info(`Sent status reminder to ${tokens.length} pharmacies.`);
    }
    return null;
  } catch (err) {
    logger.error("Error in remindPharmacyStatus", err);
    return null;
  }
});

/**
 * 4. Request Follow-up Alerts
 * Runs every 60 minutes to remind customers to chat on matched requests.
 */
exports.remindUnansweredRequests = onSchedule("every 60 minutes", async (event) => {
  try {
    const nowMs = Date.now();
    const oneHourAgo = nowMs - (60 * 60 * 1000);

    const requestsSnap = await db.collection("medicineRequests")
      .where("status", "==", "pending")
      .get();

    const notificationsMap = {};

    requestsSnap.forEach(doc => {
      const data = doc.data();
      if (data.responsesCount > 0 && data.createdAt) {
        if (data.createdAt.toMillis() < oneHourAgo) {
          if (!notificationsMap[data.userId]) {
            notificationsMap[data.userId] = [];
          }
          notificationsMap[data.userId].push(doc.id);
        }
      }
    });

    const userIds = Object.keys(notificationsMap);
    if (userIds.length === 0) return null;

    const userDocs = await Promise.all(userIds.map(id => db.collection("users").doc(id).get()));
    const tokens = [];

    let currentBatch = db.batch();
    let count = 0;

    userDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.fcmToken) tokens.push(data.fcmToken);

        const requestIdList = notificationsMap[doc.id];
        const reqId = requestIdList[0];

        const notifRef = db.collection("notifications").doc(doc.id).collection("userNotifications").doc();
        currentBatch.set(notifRef, {
          title: "Waiting for your reply! 🕒",
          body: "A pharmacy has your medicine! Tap here to see details and chat before they run out of stock.",
          type: "MATCH_FOUND",
          relatedId: reqId,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
      }
    });

    if (count > 0) {
      await currentBatch.commit();
    }

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: "Waiting for your reply! 🕒",
          body: "A pharmacy has your medicine! Tap here to chat before they run out of stock.",
        },
        data: { type: "MATCH_FOUND" }
      };

      const messages = [];
      for (let i = 0; i < tokens.length; i += 500) {
        messages.push(admin.messaging().sendEachForMulticast({ ...message, tokens: tokens.slice(i, i + 500) }));
      }
      await Promise.all(messages);
      logger.info(`Sent request follow-up reminders to ${tokens.length} users.`);
    }

    return null;
  } catch (err) {
    logger.error("Error in remindUnansweredRequests", err);
    return null;
  }
});

/**
 * 5. Admin Broadcasts to Users
 * Allows admin to send custom push notifications to all users.
 */
exports.broadcastToUsers = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can broadcast messages.");
  }

  const { title, body } = request.data;
  if (!title || !body) throw new HttpsError("invalid-argument", "Title and Body are required.");
  if (typeof title !== 'string' || title.length > 100) throw new HttpsError("invalid-argument", "Title must be a string under 100 characters.");
  if (typeof body !== 'string' || body.length > 500) throw new HttpsError("invalid-argument", "Body must be a string under 500 characters.");

  try {
    // Only customer users
    const usersSnap = await db.collection("users").get();
    const tokens = [];
    const userIds = [];

    usersSnap.forEach((doc) => {
      const uData = doc.data();
      if ((uData.role === "customer" || uData.role === "user" || !uData.role) && uData.fcmToken) {
        tokens.push(uData.fcmToken);
        userIds.push(doc.id);
      }
    });

    if (tokens.length === 0) return { success: true, sentCount: 0, message: "No devices found." };

    const messages = [];
    for (let i = 0; i < tokens.length; i += 500) {
      messages.push(admin.messaging().sendEachForMulticast({
        tokens: tokens.slice(i, i + 500),
        notification: { title, body },
        data: { type: "BROADCAST_MESSAGE" },
      }));
    }
    const responses = await Promise.all(messages);

    let successCount = 0;
    responses.forEach((resp) => { successCount += resp.successCount; });

    let currentBatch = db.batch();
    let count = 0;
    for (const uid of userIds) {
      const notifRef = db.collection("notifications").doc(uid).collection("userNotifications").doc();
      currentBatch.set(notifRef, {
        title: title,
        body: body,
        type: "ADMIN_BROADCAST",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      if (count === 400) {
        await currentBatch.commit();
        currentBatch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await currentBatch.commit();

    logger.info(`Broadcast to users sent: ${successCount} successful.`);
    return { success: true, sentCount: successCount };
  } catch (error) {
    logger.error("Broadcast to users failed", error);
    throw new HttpsError("internal", "Failed to send broadcast message.");
  }
});

// ==========================================
// P1 BACKEND HARDENING
// ==========================================

/**
 * Server-Side Account Deletion Cleanup
 * Triggers when a Firebase Auth user is deleted (via client or admin).
 * Cleans up ALL orphan data across Firestore, RTDB, and Storage.
 * This ensures Play Store compliance for data deletion requirements.
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  logger.info(`User deleted: ${uid}. Starting cleanup...`);

  const results = {
    firestoreUserDoc: false,
    notifications: 0,
    medicineRequests: 0,
    medicine_requests_snake: 0,
    rtdbChatMembers: 0,
    storageProfilePics: false,
  };

  try {
    // 1. Delete Firestore user document
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.delete();
      results.firestoreUserDoc = true;
    }

    // 2. Delete all notifications for this user
    const notifsRef = db.collection("notifications").doc(uid).collection("userNotifications");
    const notifsSnap = await notifsRef.limit(500).get();
    if (!notifsSnap.empty) {
      let batch = db.batch();
      let count = 0;
      for (const doc of notifsSnap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      if (count % 400 !== 0) await batch.commit();
      results.notifications = count;
    }
    // Also delete the parent notifications doc
    await db.collection("notifications").doc(uid).delete().catch(() => { });

    // 3. Mark user's medicineRequests as deleted (preserve for pharmacy history)
    const reqSnap = await db.collection("medicineRequests")
      .where("userId", "==", uid)
      .get();
    if (!reqSnap.empty) {
      let batch = db.batch();
      let count = 0;
      for (const doc of reqSnap.docs) {
        batch.update(doc.ref, {
          status: "deleted",
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      if (count % 400 !== 0) await batch.commit();
      results.medicineRequests = count;
    }

    // 4. Mark mobile medicine_requests as deleted too
    const mobileReqSnap = await db.collection("medicine_requests")
      .where("userId", "==", uid)
      .get();
    if (!mobileReqSnap.empty) {
      let batch = db.batch();
      let count = 0;
      for (const doc of mobileReqSnap.docs) {
        batch.update(doc.ref, {
          status: "deleted",
          userDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      if (count % 400 !== 0) await batch.commit();
      results.medicine_requests_snake = count;
    }

    // 5. Clean up RTDB chatMembers — remove this user from all chats
    const rtdb = admin.database();
    const chatMembersSnap = await rtdb.ref("chatMembers").once("value");
    if (chatMembersSnap.exists()) {
      const updates = {};
      chatMembersSnap.forEach((chatSnap) => {
        if (chatSnap.hasChild(uid)) {
          updates[`chatMembers/${chatSnap.key}/${uid}`] = null;
          results.rtdbChatMembers++;
        }
      });
      if (Object.keys(updates).length > 0) {
        await rtdb.ref().update(updates);
      }
    }

    // 6. Delete profile pics from Storage
    try {
      const bucket = admin.storage().bucket();
      const [files] = await bucket.getFiles({ prefix: `profile_pics/${uid}/` });
      if (files.length > 0) {
        await Promise.all(files.map(file => file.delete()));
        results.storageProfilePics = true;
      }
    } catch (storageErr) {
      logger.warn(`Storage cleanup failed for ${uid}`, storageErr);
    }

    logger.info(`User ${uid} cleanup complete`, results);
  } catch (err) {
    logger.error(`User ${uid} cleanup failed`, { error: err.message, results });
    // Log to functionErrors for monitoring
    await db.collection("functionErrors").add({
      context: "onUserDeleted",
      requestId: uid,
      errorMessage: err.message || String(err),
      partialResults: results,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// ==========================================
// P2 RELIABILITY & MONITORING
// ==========================================

/**
 * 4. Stale Request Auto-Closer
 * Runs every 30 minutes to expire pending requests older than 4 hours.
 * Notifies users so they know to create a new request.
 */
exports.closeStaleRequests = onSchedule("every 30 minutes", async (event) => {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    // Check both collections
    const collections = ["medicineRequests", "medicine_requests"];
    let totalClosed = 0;

    for (const collName of collections) {
      const staleSnap = await db.collection(collName)
        .where("status", "==", "pending")
        .where("createdAt", "<", fourHoursAgo)
        .get();

      if (staleSnap.empty) continue;

      let batch = db.batch();
      let count = 0;
      const userTokens = new Map(); // uid -> fcmToken

      for (const doc of staleSnap.docs) {
        const data = doc.data();
        batch.update(doc.ref, {
          status: "expired",
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          expiredReason: "auto_expired_4h",
        });
        count++;

        // Collect user IDs for notification
        if (data.userId && !userTokens.has(data.userId)) {
          userTokens.set(data.userId, null);
        }

        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      if (count % 400 !== 0) await batch.commit();
      totalClosed += count;

      // Fetch FCM tokens and send notifications
      for (const [userId] of userTokens) {
        try {
          const userDoc = await db.collection("users").doc(userId).get();
          if (userDoc.exists && userDoc.data().fcmToken) {
            await admin.messaging().send({
              notification: {
                title: "⏰ Request Expired",
                body: "Your medicine search expired after 4 hours. Create a new request anytime!",
              },
              data: { type: "REQUEST_EXPIRED" },
              token: userDoc.data().fcmToken,
            }).catch(() => { }); // Ignore individual FCM errors

            // Save in-app notification
            const notifRef = db.collection("notifications").doc(userId).collection("userNotifications").doc();
            await notifRef.set({
              title: "⏰ Request Expired",
              body: "Your medicine search expired after 4 hours. Create a new request anytime!",
              type: "REQUEST_EXPIRED",
              isRead: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } catch (e) {
          // Skip individual notification errors
        }
      }
    }

    if (totalClosed > 0) {
      logger.info(`Closed ${totalClosed} stale requests across both collections.`);
    }
    return null;
  } catch (err) {
    logger.error("Error in closeStaleRequests", err);
    return null;
  }
});

/**
 * 5. FCM Token Cleanup
 * Runs weekly to nullify FCM tokens for users inactive for 30+ days.
 * Prevents wasted FCM sends to devices that will never receive them.
 */
exports.cleanupStaleFCMTokens = onSchedule({ schedule: "every monday 03:00", timeZone: "Asia/Kolkata" }, async (event) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let cleanedUsers = 0;
    let cleanedPharmacies = 0;

    // Clean user tokens
    const staleUsers = await db.collection("users")
      .where("lastActive", "<", thirtyDaysAgo)
      .get();

    if (!staleUsers.empty) {
      let batch = db.batch();
      let count = 0;
      for (const doc of staleUsers.docs) {
        if (doc.data().fcmToken) {
          batch.update(doc.ref, { fcmToken: null });
          cleanedUsers++;
          count++;
          if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
      }
      if (count % 400 !== 0) await batch.commit();
    }

    // Clean pharmacy tokens
    const stalePharmacies = await db.collection("pharmacies")
      .where("lastActive", "<", thirtyDaysAgo)
      .get();

    if (!stalePharmacies.empty) {
      let batch = db.batch();
      let count = 0;
      for (const doc of stalePharmacies.docs) {
        if (doc.data().fcmToken) {
          batch.update(doc.ref, { fcmToken: null });
          cleanedPharmacies++;
          count++;
          if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
      }
      if (count % 400 !== 0) await batch.commit();
    }

    logger.info(`FCM Token Cleanup: ${cleanedUsers} users, ${cleanedPharmacies} pharmacies cleaned.`);
    return null;
  } catch (err) {
    logger.error("Error in cleanupStaleFCMTokens", err);
    return null;
  }
});

/**
 * 6. Weekly Error Digest
 * Runs every Monday morning to summarize recent function errors.
 * Logs a summary to Cloud Logging for monitoring/alerting.
 */
exports.weeklyErrorDigest = onSchedule({ schedule: "every monday 09:00", timeZone: "Asia/Kolkata" }, async (event) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const errorsSnap = await db.collection("functionErrors")
      .where("timestamp", ">", sevenDaysAgo)
      .get();

    if (errorsSnap.empty) {
      logger.info("Weekly Error Digest: No errors in the past 7 days. 🎉");
      return null;
    }

    // Group errors by context
    const errorsByContext = {};
    errorsSnap.forEach(doc => {
      const data = doc.data();
      const ctx = data.context || "unknown";
      if (!errorsByContext[ctx]) errorsByContext[ctx] = 0;
      errorsByContext[ctx]++;
    });

    const digest = {
      period: "Last 7 days",
      totalErrors: errorsSnap.size,
      breakdown: errorsByContext,
      generatedAt: new Date().toISOString(),
    };

    // Log as a structured warning so it shows up in Cloud Monitoring
    logger.warn("⚠️ WEEKLY ERROR DIGEST", digest);

    // Also save to admin_stats for dashboard visibility
    await db.collection("admin_stats").doc("weekly_error_digest").set(digest);

    return null;
  } catch (err) {
    logger.error("Error in weeklyErrorDigest", err);
    return null;
  }
});

/**
 * 7. Automated Firestore Backup
 * Runs daily at 2 AM IST to export all Firestore data to Cloud Storage.
 * Retains backups for manual recovery.
 */
exports.scheduledFirestoreBackup = onSchedule({ schedule: "every day 02:00", timeZone: "Asia/Kolkata" }, async (event) => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const bucket = `gs://${projectId}-firestore-backups/${timestamp}`;

  try {
    const client = new admin.firestore.v1.FirestoreAdminClient();
    const databaseName = client.databasePath(projectId, '(default)');

    const [response] = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: bucket,
      collectionIds: [], // empty = export all collections
    });

    logger.info(`Firestore backup started: ${bucket}`, { operationName: response.name });
    return null;
  } catch (err) {
    logger.error("Firestore backup failed", { error: err.message, bucket });
    await db.collection("functionErrors").add({
      context: "scheduledFirestoreBackup",
      errorMessage: err.message || String(err),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return null;
  }
});

const { onRequest } = require("firebase-functions/v2/https");

/**
 * 8. Dynamic Sitemap Generator
 * Generates an XML sitemap caching it for 24 hours on the CDN.
 * Includes static routes, medicine pages, and verified pharmacy pages.
 */
exports.generateSitemap = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 30
}, async (req, res) => {
  try {
    // 1. Setup caching: Cache in CDN for 24 hours, browser for 1 hour
    res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.set("Content-Type", "application/xml");

    const baseUrl = "https://localpill.com";
    const dateToday = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 2. Static Pages
    const staticPages = [
      "/",
      "/setup",
      "/about-us",
      "/how-it-works",
      "/privacy-policy",
      "/terms",
      "/legal",
      "/disclaimer",
      "/grievance"
    ];

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page}</loc>\n`;
      xml += `    <lastmod>${dateToday}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      // Homepage gets higher priority
      xml += `    <priority>${page === "/" ? "1.0" : "0.8"}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 3. Known Medicine Pages (from previous sitemap)
    const medicines = [
      "dolo-650", "calpol-500", "augmentin-625", "crocin-advance", "pan-d"
    ];
    for (const med of medicines) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/medicine/${med}</loc>\n`;
      xml += `    <lastmod>${dateToday}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // 4. Known City/Area Pages (from previous sitemap)
    const areas = [
      "patna/boring-road", "patna/kankarbagh", "delhi/connaught-place"
    ];
    for (const area of areas) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/pharmacy/${area}</loc>\n`;
      xml += `    <lastmod>${dateToday}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // 5. Dynamic Verified Pharmacies Focus
    // We fetch verified pharmacies to build their public URLs if required.
    // E.g., /pharmacy/{city}/{id}
    const pharmaciesSnap = await db.collection("pharmacies")
      .where("isVerified", "==", true)
      .get();

    for (const doc of pharmaciesSnap.docs) {
      const p = doc.data();
      // Ensure we have address info to build a friendly URL if your site supports it, 
      // otherwise, we fall back to generic id-based urls or ignore.
      if (p.address && p.address.city) {
        // e.g., /pharmacy/patna/12345
        const citySlug = p.address.city.toLowerCase().replace(/\\s+/g, '-');
        const urlPath = `/pharmacy/${citySlug}/${doc.id}`;

        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}${urlPath}</loc>\n`;
        // Use updatedAt or createdAt if available
        let lastMod = dateToday;
        if (p.updatedAt) lastMod = p.updatedAt.toDate().toISOString();
        else if (p.createdAt) lastMod = p.createdAt.toDate().toISOString();

        xml += `    <lastmod>${lastMod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    res.status(200).send(xml);
  } catch (error) {
    logger.error("Error generating sitemap", error);
    // Even if it fails, return a basic XML to not break search engine parsers completely
    let fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    fallbackXml += `  <url><loc>https://localpill.com/</loc></url>\n</urlset>`;
    res.status(500).send(fallbackXml);
  }
});

/**
 * 20. IndexNow API Integration
 * - Triggers when a new pharmacy is created and verified
 * - Pings IndexNow so Bing/Yandex crawl the new profile instantly
 */
exports.pingIndexNowOnPharmacyCreated = onDocumentCreated("pharmacies/{pharmacyId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const pharmacyData = snapshot.data();

  // Only ping if the newly created pharmacy is verified (if that's a requirement at creation)
  // Or if it gets verified later, you might want an onDocumentUpdated trigger instead.
  // Assuming they are created and verified simultaneously or we want to index them anyway.
  if (pharmacyData.isVerified === true && pharmacyData.address && pharmacyData.address.city) {
    const citySlug = pharmacyData.address.city.toLowerCase().replace(/\\s+/g, '-');
    const pharmacyUrl = `https://localpill.com/pharmacy/${citySlug}/${event.params.pharmacyId}`;

    const host = "localpill.com";
    const key = "cWbVelzc0GZX7Nqztfo4bIpZLdASILU0"; // The IndexNow key we will use

    const indexNowEndpoint = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(pharmacyUrl)}&key=${key}`;

    try {
      // Using generic fetch API available in Node.js 18+
      const response = await fetch(indexNowEndpoint, {
        method: "GET",
      });

      if (response.ok) {
        logger.info(`Successfully pinged IndexNow for new pharmacy: ${pharmacyUrl}`);
      } else {
        logger.warn(`Failed to ping IndexNow. Status: ${response.status}`, await response.text());
      }
    } catch (error) {
      logger.error(`Error pinging IndexNow for ${pharmacyUrl}:`, error);
    }
  }
});
