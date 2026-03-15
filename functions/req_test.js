const admin = require("firebase-admin");
const serviceAccount = require("./service-acc.json");

let db;
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://localpill-upcharmitra-default-rtdb.firebaseio.com"
  });
  db = admin.firestore();
} catch (e) {}

async function test() {
   const q = await db.collection("medicineRequests").orderBy("createdAt", "desc").limit(3).get();
   q.forEach(d => {
       const dd = d.data();
       console.log(d.id, "=>", {
           createdAt: dd.createdAt.toDate(),
           targetPharmacies: dd.targetPharmacyIds ? dd.targetPharmacyIds.length : 0,
           processingStatus: dd.processingStatus,
           rejectionReason: dd.rejectionReason,
           status: dd.status,
           userId: dd.userId
       })
   })
}
test()
