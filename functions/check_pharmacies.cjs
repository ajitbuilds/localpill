const admin = require('firebase-admin');

// Ensure you have application default credentials configured or use a service account key
admin.initializeApp({
    projectId: "localpill-upcharmitra"
});
const db = admin.firestore();

async function run() {
    try {
        console.log("Fetching pharmacies...");
        const pSnap = await db.collection("pharmacies").get();
        let total = 0;
        let online = 0;
        pSnap.forEach(doc => {
            total++;
            const data = doc.data();
            if (data.isOnline === true) online++;
            console.log(`Pharmacy ${doc.id}: ${data.name} - Online: ${data.isOnline === true}`);
        });
        console.log(`Total: ${total}, Online: ${online}`);
    } catch (err) {
        console.error("FAIL:", err.message);
    }
}
run();
