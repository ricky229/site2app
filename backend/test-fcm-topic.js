import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({
    credential: admin.credential.cert(firebaseKey)
});

async function test() {
    try {
        await admin.messaging().send({
            notification: { title: "Topic Test", body: "Topic test", imageUrl: null },
            topic: "1772904081909-all"
        });
        console.log("Success with topic");
    } catch (e) {
        console.error("Error with topic:", e.message);
    }
}
test();
