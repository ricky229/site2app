import admin from 'firebase-admin';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const user = users["user_e8275e23-5e87-4da8-a78c-61c52c1fda5d"];
const firebaseKey = JSON.parse(user.firebaseKey);

admin.initializeApp({ credential: admin.credential.cert(firebaseKey) });

const NEW_TOKEN = "cZQkXNYBRF6lR4-3Q2wcP3:APA91bEt_T8SZOc5EAfow68c34723MfQw6b6hS9_oJqgW4gwwQJ-W_gptc57UziXTeZItflHKUlFW93SLCg-Wb0wvV8mi1DpGRUBhkP15VdJIVrPpbAFCFs";

console.log("=== Test A: DATA-ONLY (ancien mode qui marchait en premier plan) ===");
try {
    const r1 = await admin.messaging().sendEachForMulticast({
        data: { title: "Test A Data", body: "Si vous voyez ceci, le mode data fonctionne" },
        android: { priority: 'high' },
        tokens: [NEW_TOKEN]
    });
    console.log(`Résultat A: Succès=${r1.successCount}, Échecs=${r1.failureCount}`);
    r1.responses.forEach((r, i) => { if (!r.success) console.log("  Erreur A:", r.error?.code, r.error?.message); });
} catch (e) { console.error("Erreur A:", e.message); }

await new Promise(r => setTimeout(r, 2000));

console.log("\n=== Test B: NOTIFICATION seul (mode classique Android) ===");
try {
    const r2 = await admin.messaging().send({
        notification: { title: "Test B Notif", body: "Si vous voyez ceci, le mode notification fonctionne" },
        android: { priority: 'high' },
        token: NEW_TOKEN
    });
    console.log(`Résultat B: ${r2}`);
} catch (e) { console.error("Erreur B:", e.code, e.message); }

await new Promise(r => setTimeout(r, 2000));

console.log("\n=== Test C: NOTIFICATION + DATA combinés ===");
try {
    const r3 = await admin.messaging().send({
        notification: { title: "Test C Hybride", body: "Si vous voyez ceci, le mode hybride fonctionne" },
        data: { title: "Test C Hybride", body: "Mode hybride" },
        android: { priority: 'high' },
        token: NEW_TOKEN
    });
    console.log(`Résultat C: ${r3}`);
} catch (e) { console.error("Erreur C:", e.code, e.message); }

console.log("\nFINI. 3 notifications envoyées. Dites lesquelles vous avez reçues (A, B, C) !");
