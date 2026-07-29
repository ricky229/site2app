import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
    const snapshot = await db.collection('builds').get();
    console.log('Total builds:', snapshot.size);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(doc.id, data.appName, data.userId);
    });
}
run().catch(console.error);
