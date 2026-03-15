const admin = require('firebase-admin');

admin.initializeApp({
    projectId: "localpill-upcharmitra"
});
const db = admin.firestore();

async function run() {
    try {
        console.log("--- FCM TOKEN DIAGNOSTIC ---");
        const pSnap = await db.collection("pharmacies").where("fcmToken", "!=", null).limit(10).get();
        let tokenCount = 0;
        pSnap.forEach(doc => {
            const data = doc.data();
            const token = data.fcmToken;
            tokenCount++;
            console.log(`Pharmacy: ${doc.id}`);
            console.log(`  Token Length: ${token.length}`);
            console.log(`  Token Type: ${typeof token}`);
            console.log(`  Is Valid String? : ${typeof token === 'string' && token.length > 50}`);
        });
        if (tokenCount === 0) {
            console.log("NO PHARMACIES HAVE FCM TOKENS YET (or the query didn't find them).");
        }

        console.log("\n--- RECENT REQUESTS MULTICAST LOGS ---");
        const logSnap = await db.collection("matchingLogs").orderBy("timestamp", "desc").limit(5).get();
        logSnap.forEach(doc => {
            const data = doc.data();
            if (data.requestId) {
                console.log(`Request: ${data.requestId}`);
                console.log(`  Top 20 Found: ${data.top20 ? data.top20.length : 0}`);
                const tokensAttempted = data.top20 ? data.top20.filter(p => p.fcmToken != null).length : 0;
                console.log(`  Tokens Attempted in Array: ${tokensAttempted}`);
            }
        });

    } catch (err) {
        console.error("FAIL:", err.message);
    }
}
run();
