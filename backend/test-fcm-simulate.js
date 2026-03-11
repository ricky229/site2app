import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];

console.log('firebaseKey present:', !!user.firebaseKey);

const firebaseKey = JSON.parse(user.firebaseKey);

const appName = `app_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`;
console.log('App name:', appName);
console.log('Admin apps before init:', admin.apps.length);

let userApp;
if (!admin.apps.some((a) => a?.name === appName)) {
    userApp = admin.initializeApp({ credential: admin.credential.cert(firebaseKey) }, appName);
    console.log('New app initialized');
} else {
    userApp = admin.app(appName);
    console.log('Reusing existing app');
}

const token = "e_C7PTQbSo-_FheVhSZjaJ:APA91bEukRgo-OFORLYJAz4j5gKu4-f3OcYaA2d8DlnrcrpE53MPaBDIF_m-cjEfCv-RvuHdNbC9_W2hzL4ynqKfpJtLAxs2Pk15ehVuTIU3VjkzAHeyY6A";

const notificationPayload = { title: "Test via code UI path", body: "Ceci simule exactement le chemin du formulaire web" };

console.log('Sending via sendEachForMulticast with token...');
const response = await userApp.messaging().sendEachForMulticast({
    notification: notificationPayload,
    tokens: [token]
});

console.log(`Succès=${response.successCount}, Échecs=${response.failureCount}`);
if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
        if (!resp.success) console.error(`Erreur token[${idx}]:`, resp.error);
    });
}
