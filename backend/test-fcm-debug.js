import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({ credential: admin.credential.cert(firebaseKey) });

const token = "eRLVVpQQQ32mtPUSb0sLwu:APA91bEnb7m4NcT-TJ86ojNqsNta-rxftBmRhpIqqYw0kCD-A-sfusjlbVWjnXEOMFTYh8N8nVNB8XbIqeeVGZse1Uwm2BbSXH_YQ3qzFV4ubGa6Vo7Ee_g";

const response = await admin.messaging().sendEachForMulticast({
    notification: { title: "Test", body: "Test" },
    android: { priority: 'high' },
    tokens: [token]
});

console.log(`Succès=${response.successCount}, Échecs=${response.failureCount}`);
response.responses.forEach((r, i) => {
    console.log(`Token[${i}]: success=${r.success}`);
    if (!r.success) {
        console.log(`  Code: ${r.error?.code}`);
        console.log(`  Message: ${r.error?.message}`);
        console.log(`  Full:`, JSON.stringify(r.error, null, 2));
    }
});
