const admin = require("firebase-admin");
const geofire = require("geofire-common");
admin.initializeApp({projectId: "localpill-upcharmitra"});
const db = admin.firestore();

async function backfill() {
    console.log("Backfilling geohash and fixing isVerified field...");
    const snap = await db.collection("pharmacies").get();
    let geohashCount = 0;
    let verifiedFieldCount = 0;
    
    for (const doc of snap.docs) {
        const data = doc.data();
        const updates = {};
        
        // Fix 1: Add/update geohash field
        if (data.location && data.location.latitude && data.location.longitude) {
            const hash = geofire.geohashForLocation([data.location.latitude, data.location.longitude]);
            if (data.geohash !== hash) {
                updates.geohash = hash;
                geohashCount++;
            }
        }
        
        // Fix 2: Rename "verified" to "isVerified" (Cloud Function expects isVerified)
        if (data.verified !== undefined && data.isVerified === undefined) {
            updates.isVerified = data.verified;
            // Note: We keep old "verified" field for backward compatibility
            // Can remove later with: updates.verified = admin.firestore.FieldValue.delete();
            verifiedFieldCount++;
        }
        
        // Apply updates if any
        if (Object.keys(updates).length > 0) {
            await doc.ref.update(updates);
            console.log(`Updated pharmacy ${doc.id}:`, updates);
        }
    }
    
    console.log(`\nMigration complete:`);
    console.log(`- Fixed geohash: ${geohashCount} pharmacies`);
    console.log(`- Fixed isVerified field: ${verifiedFieldCount} pharmacies`);
}
backfill();
