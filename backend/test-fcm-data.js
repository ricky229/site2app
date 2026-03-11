import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({
    credential: admin.credential.cert(firebaseKey)
});

const token = "e_C7PTQbSo-_FheVhSZjaJ:APA91bEukRgo-OFORLYJAz4j5gKu4-f3OcYaA2d8DlnrcrpE53MPaBDIF_m-cjEfCv-RvuHdNbC9_W2hzL4ynqKfpJtLAxs2Pk15ehVuTIU3VjkzAHeyY6A";

// Test en data-only message (exactement comme le serveur va envoyer maintenant)
const response = await admin.messaging().sendEachForMulticast({
    data: { title: "Test data-only", body: "Confirmez reception sur téléphone !" },
    android: { priority: 'high' },
    tokens: [token]
});

console.log(`Succès=${response.successCount}, Échecs=${response.failureCount}`);
if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
        if (!resp.success) console.error(`Erreur:`, resp.error);
    });
}
