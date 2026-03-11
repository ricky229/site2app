import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({ credential: admin.credential.cert(firebaseKey) });

const newToken = "eRLVVpQQQ32mtPUSb0sLwu:APA91bEnb7m4NcT-TJ86ojNqsNta-rxftBmRhpIqqYw0kCD-A-sfusjlbVWjnXEOMFTYh8N8nVNB8XbIqeeVGZse1Uwm2BbSXH_YQ3qzFV4ubGa6Vo7Ee_g";

console.log("Envoi dans 5 secondes... Ouvrez l'app sur le téléphone !");
await new Promise(r => setTimeout(r, 5000));

// Test avec notification payload classique (le plus fiable pour les apps en premier plan)
try {
    const r = await admin.messaging().send({
        notification: { title: "🔔 TEST EN DIRECT", body: "Ouvrez l'app et dites-moi si vous voyez ça !" },
        data: { title: "TEST EN DIRECT", body: "Message data backup" },
        android: { priority: 'high' },
        token: newToken
    });
    console.log("Envoyé avec succès:", r);
} catch (e) {
    console.error("ERREUR:", e.code, e.message);
}
