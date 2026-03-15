const admin = require("firebase-admin");
try {
  admin.initializeApp();
  const db = admin.firestore();
  console.log("Success with default creds!");
} catch(e) {
  console.error("Needs creds.");
}
