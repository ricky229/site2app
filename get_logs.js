const admin = require('firebase-admin');  
const serviceAccount = require('../../site2app-ba735-firebase-adminsdk-h4a3v-0d6b9d6a3b.json');  
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });  
const db = admin.firestore();  
db.collection('webhook_logs').orderBy('receivedAt', 'desc').limit(3).get().then(snap => { if (snap.empty) { console.log('No logs found'); } else { snap.docs.forEach(doc => console.log(JSON.stringify(doc.data(), null, 2))); } }).catch(console.error);  
