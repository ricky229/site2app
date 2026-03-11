import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({ credential: admin.credential.cert(firebaseKey) });

const token = "eRLVVpQQQ32mtPUSb0sLwu:APA91bEnb7m4NcT-TJ86ojNqsNta-rxftBmRhpIqqYw0kCD-A-sfusjlbVWjnXEOMFTYh8N8nVNB8XbIqeeVGZse1Uwm2BbSXH_YQ3qzFV4ubGa6Vo7Ee_g";

// Mode NOTIFICATION + DATA combinés (exactement comme le serveur le fait maintenant)
// - notification: Android affiche automatiquement en arrière-plan
// - data: onMessageReceived utilise ces données en premier plan
const response = await admin.messaging().sendEachForMulticast({
    notification: { title: "✅ Notification Hybride", body: "Ce message arrive même si l'app est fermée !" },
    data: { title: "Notification Hybride", body: "Ce message arrive même si l'app est fermée !" },
    android: { priority: 'high' },
    tokens: [token]
});

console.log(`Succès=${response.successCount}, Échecs=${response.failureCount}`);
console.log("FERMEZ L'APP sur votre téléphone et attendez la notification !");
