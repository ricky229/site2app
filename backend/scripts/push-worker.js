import admin from 'firebase-admin';

const BUBBLE_BASE = 'https://site2app.online/api/1.1';
const BUBBLE_TOKEN = '59ef5eb57d786ff8eced03244342f32e';

// Cache pour les instances Firebase
const firebaseApps = new Map();

async function initFirebase(user) {
    if (!user.firebaseKey) return null;
    try {
        const serviceAccount = typeof user.firebaseKey === 'string' ? JSON.parse(user.firebaseKey) : user.firebaseKey;
        const projectId = serviceAccount.project_id;
        
        if (firebaseApps.has(projectId)) {
            return firebaseApps.get(projectId);
        }
        
        const appName = `fcm_worker_${projectId}_${Date.now()}`;
        const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        }, appName);
        
        firebaseApps.set(projectId, app);
        return app;
    } catch (err) {
        console.error(`[Worker] Clé Firebase invalide pour l'utilisateur ${user._id || user.id}:`, err.message);
        return null;
    }
}

async function runWorker() {
    console.log('🔄 Démarrage du Worker de Notifications...');
    
    try {
        // 1. Récupérer les notifications en attente (status !== 'Sent')
        // On récupère tout et on filtre manuellement pour plus de fiabilité
        const queueUrl = `${BUBBLE_BASE}/obj/notification_queue`;
        console.log(`[Worker] Tentative de lecture de la file: ${queueUrl}`);
        const res = await fetch(queueUrl, {
            headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}`, 'Accept': 'application/json' }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erreur Bubble Queue: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        const queue = data.response?.results || [];
        
        console.log(`[Worker] ${queue.length} lignes totales dans la table Bubble.`);
        const pending = queue.filter(n => n.status !== 'Sent');
        
        if (pending.length === 0) {
            console.log('✅ Aucune notification "en attente" (status !== Sent) dans la file.');
            return;
        }

        console.log(`📫 ${pending.length} notification(s) à traiter.`);

        for (const notif of pending) {
            console.log(`\n👉 Traitement: "${notif.title}" (ID: ${notif._id})`);
            
            try {
                if (!notif.owner) throw new Error('Propriétaire (owner) manquant');
                
                // Récupérer les infos de l'utilisateur (pour la clé Firebase)
                const userRes = await fetch(`${BUBBLE_BASE}/obj/user/${notif.owner}`, {
                    headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}` }
                });
                if (!userRes.ok) throw new Error(`Utilisateur ${notif.owner} introuvable sur Bubble`);
                const userData = await userRes.json();
                const user = userData.response;

                const firebaseApp = await initFirebase(user);
                if (!firebaseApp) throw new Error('Configuration Firebase manquante ou invalide pour cet utilisateur');

                // Résolution des jetons cibles
                let targetTokens = [];
                
                if (notif.targetOs === 'specific' && notif.targetToken) {
                    targetTokens = notif.targetToken.split(',').map(s => s.trim()).filter(Boolean);
                } else {
                    // Recherche globale ou par application
                    let deviceUrl = `${BUBBLE_BASE}/obj/device`;
                    const constraints = [];
                    if (notif.targetApp && notif.targetApp !== 'all') {
                        constraints.push({ key: 'buildId', constraint_type: 'equals', value: notif.targetApp });
                    }
                    if (notif.targetOs && notif.targetOs !== 'all') {
                        constraints.push({ key: 'os', constraint_type: 'equals', value: notif.targetOs });
                    }
                    
                    if (constraints.length > 0) {
                        deviceUrl += `?constraints=${encodeURIComponent(JSON.stringify(constraints))}`;
                    }

                    const devRes = await fetch(deviceUrl, {
                        headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}` }
                    });
                    if (devRes.ok) {
                        const devData = await devRes.json();
                        const devices = devData.response?.results || [];
                        targetTokens = devices
                            .map(d => d.pushToken || d.push_token || d.id || d._id)
                            .filter(t => typeof t === 'string' && t.includes(':'));
                    }
                }

                if (targetTokens.length === 0) {
                    console.warn('⚠️ Aucun appareil trouvé pour cette notification.');
                } else {
                    console.log(`📱 Envoi à ${targetTokens.length} appareils...`);
                    
                    const message = {
                        notification: {
                            title: notif.title,
                            body: notif.body || ''
                        },
                        data: {
                            actionUrl: notif.targetUrl || ''
                        },
                        tokens: targetTokens,
                        android: { priority: 'high' }
                    };

                    if (notif.image) {
                        message.notification.image = notif.image;
                        message.data.image = notif.image;
                    }

                    const response = await firebaseApp.messaging().sendEachForMulticast(message);
                    console.log(`✅ Succès: ${response.successCount}/${targetTokens.length}`);
                }

                // 2. Créer l'entrée dans l'historique (Table "notification")
                await fetch(`${BUBBLE_BASE}/obj/notification`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${BUBBLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: notif.title,
                        body: notif.body,
                        owner: notif.owner,
                        status: 'Sent',
                        targetApp: notif.targetApp,
                        targetOs: notif.targetOs,
                        targetToken: notif.targetToken || '',
                        image: notif.image,
                        targetUrl: notif.targetUrl,
                        sentAt: new Date().toISOString()
                    })
                });

                // 3. Marquer comme envoyé dans la file ou Supprimer
                // On met à jour le statut pour éviter les doublons
                await fetch(`${BUBBLE_BASE}/obj/notification_queue/${notif._id}`, {
                    method: 'PATCH',
                    headers: { 
                        'Authorization': `Bearer ${BUBBLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'Sent' })
                });

                console.log(`✨ Notification ${notif._id} traitée avec succès.`);

            } catch (err) {
                console.error(`🚨 Erreur sur la notification ${notif._id}:`, err.message);
                // Optionnel: marquer comme "Failed" sur Bubble
                try {
                    await fetch(`${BUBBLE_BASE}/obj/notification_queue/${notif._id}`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Failed' })
                    });
                } catch (e) {}
            }
        }
    } catch (err) {
        console.error('🚨 Erreur Critique Worker:', err.message);
    }
}

runWorker();
