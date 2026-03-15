const admin = require('firebase-admin');
// Using default application credentials or assuming they're handled
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function check() {
    const pharmacies = await db.collection('pharmacies').limit(5).get();
    pharmacies.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
    });
}

check().catch(console.error);
