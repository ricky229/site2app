import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({
    credential: admin.credential.cert(firebaseKey)
});

// NOUVEAU token de l'APK rebuild
const newToken = "eRLVVpQQQ32mtPUSb0sLwu:APA91bEnb7m4NcT-TJ86ojNqsNta-rxftBmRhpIqqYw0kCD-A-sfusjlbVWjnXEOMFTYh8N8nVNB8XbIqeeVGZse1Uwm2BbSXH_YQ3qzFV4ubGa6Vo7Ee_g";

console.log("=== Test 1: data-only message (nouveau mode) ===");
try {
    const resp1 = await admin.messaging().sendEachForMulticast({
        data: { title: "Push Data-Only", body: "Ce message utilise le nouveau mode data-only" },
        android: { priority: 'high' },
        tokens: [newToken]
    });
    console.log(`Résultat: Succès=${resp1.successCount}, Échecs=${resp1.failureCount}`);
    if (resp1.failureCount > 0) {
        resp1.responses.forEach((r, i) => { if (!r.success) console.error("Erreur:", r.error); });
    }
} catch (e) { console.error("Erreur:", e.message); }

console.log("\n=== Test 2: notification payload (ancien mode pour comparaison) ===");
try {
    const resp2 = await admin.messaging().send({
        notification: { title: "Push Notification classique", body: "Ce message utilise l'ancien mode notification" },
        android: { priority: 'high' },
        token: newToken
    });
    console.log(`Résultat: ${resp2}`);
} catch (e) { console.error("Erreur:", e.message); }
