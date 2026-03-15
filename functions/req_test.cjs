const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-acc.json'); // Provide path to a test service account json OR let it default in GCP/Functions Shell

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function test() {
    console.log("Fetching matching logs");
    const doc = await db.collection("matchingLogs").orderBy("timestamp", "desc").limit(3).get();
    doc.forEach(d => {
        const data = d.data();
        console.log("RequestId:", data.requestId, "Top 20:", data.top20?.length, "Scanned:", data.scanned?.length);
        if (data.scanned) {
             data.scanned.forEach(s => {
                  console.log("   -", s.name, s.status, s.filterReason, `(${s.distanceKm}km)`)
             });
        }
    })
}
test().catch(e => console.error(e));
