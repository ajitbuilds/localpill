process.env.FIRESTORE_EMULATOR_HOST="127.0.0.1:8080";
const admin = require("firebase-admin");
admin.initializeApp({projectId: "localpill-upcharmitra"});

const db = admin.firestore();

async function checkReq() {
    console.log("Checking Matching Logs...");
    const snap = await db.collection("matchingLogs").orderBy("timestamp", "desc").limit(3).get();
    
    if (snap.empty) {
        console.log("No matching logs found!");
    }

    snap.forEach(doc => {
        let d = doc.data();
        console.log("Log ID:", doc.id);
        console.log("Target Request:", d.requestId);
        console.log("Pharmacies Scanned:", d.scanned?.length);
        console.log("Pharmacies Notified (Top 20):", d.top20?.length);
        
        if (d.scanned && d.scanned.length > 0) {
             console.log("--- Detail Breakdown ---");
             d.scanned.forEach(s => {
                  console.log(`- ${s.name} (${s.pharmacyId})`);
                  console.log(`   Status: ${s.status}`);
                  console.log(`   Distance: ${s.distanceKm?.toFixed(2)} km`);
                  console.log(`   Is Verified: ${s.isVerified}`);
                  console.log(`   Is Online: ${s.isOnline}`);
                  if (s.filterReason) {
                      console.log(`   Filtered Because: ${s.filterReason}`);
                  }
             });
        }
        console.log("===================================");
    });
}
checkReq();
