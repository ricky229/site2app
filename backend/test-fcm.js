import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({
    credential: admin.credential.cert(firebaseKey)
});

const token = "e_C7PTQbSo-_FheVhSZjaJ:APA91bEukRgo-OFORLYJAz4j5gKu4-f3OcYaA2d8DlnrcrpE53MPaBDIF_m-cjEfCv-RvuHdNbC9_W2hzL4ynqKfpJtLAxs2Pk15ehVuTIU3VjkzAHeyY6A";

admin.messaging().send({
    token: token,
    notification: {
        title: "Test de validation FCM",
        body: "Dites-moi si vous me recevez directement !"
    }
}).then(res => {
    console.log("Success:", res);
}).catch(err => {
    console.error("Firebase error", err);
});
