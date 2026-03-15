const admin = require('firebase-admin');
const serviceAccount = require('./service-acc.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://localpill-upcharmitra-default-rtdb.firebaseio.com'
});

async function syncAdmins() {
    const db = admin.firestore();
    const rtdb = admin.database();

    const snapshot = await db.collection('users').where('role', '==', 'admin').get();
    console.log(`Found ${snapshot.size} admins in Firestore.`);

    if (snapshot.empty) {
        console.log('No admins found.');
        return;
    }

    const updates = {};
    snapshot.forEach(doc => {
        updates[doc.id] = true;
    });

    await rtdb.ref('admins').update(updates);
    console.log('Successfully synced admins to RTDB:', updates);
}

syncAdmins().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
