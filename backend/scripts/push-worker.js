const axios = require('axios');
const admin = require('firebase-admin');

const BUBBLE_BASE = 'https://site2app.online/api/1.1';
const BUBBLE_TOKEN = '59ef5eb57d786ff8eced03244342f32e';

const api = axios.create({
    baseURL: BUBBLE_BASE,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BUBBLE_TOKEN}`,
    },
});

// Cache for initialized firebase apps
const firebaseApps = {};

async function initFirebase(user) {
    if (!user.firebaseKey) return null;
    try {
        const serviceAccount = JSON.parse(user.firebaseKey);
        const projectId = serviceAccount.project_id;
        
        if (firebaseApps[projectId]) {
            return firebaseApps[projectId];
        }
        
        const appName = `app_${projectId}_${Date.now()}`;
        const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        }, appName);
        
        firebaseApps[projectId] = app;
        return app;
    } catch (err) {
        console.error(`Invalid Firebase Key for user ${user._id}:`, err.message);
        return null;
    }
}

async function runWorker() {
    console.log('🔄 Starting Push Notification Worker...');
    
    try {
        // 1. Fetch queued notifications
        const queueRes = await api.get('/obj/notification_queue');
        const queue = queueRes.data.response.results || [];
        
        if (queue.length === 0) {
            console.log('✅ No notifications in queue.');
            return;
        }

        console.log(`📫 Found ${queue.length} notifications to process.`);

        for (const notif of queue) {
            console.log(`\n👉 Processing notification: "${notif.title}" (ID: ${notif._id})`);
            let sentCount = 0;
            let deliveredCount = 0;

            try {
                // Fetch Owner
                if (!notif.owner) throw new Error('Missing owner ID');
                const userRes = await api.get(`/obj/user/${notif.owner}`);
                const user = userRes.data.response;
                
                // Init Firebase
                const firebaseApp = await initFirebase(user);
                if (!firebaseApp) {
                    throw new Error('User has no valid Firebase config');
                }
                const messaging = firebaseApp.messaging();

                // Build Device Constraints
                const constraints = [];
                if (notif.targetApp && notif.targetApp !== 'all') {
                    constraints.push({ key: 'buildId', constraint_type: 'equals', value: notif.targetApp });
                }
                if (notif.targetOs && notif.targetOs !== 'all') {
                    constraints.push({ key: 'os', constraint_type: 'equals', value: notif.targetOs });
                }

                // Fetch target devices
                let deviceUrl = '/obj/device';
                if (constraints.length > 0) {
                    deviceUrl += `?constraints=${encodeURIComponent(JSON.stringify(constraints))}`;
                }
                const devicesRes = await api.get(deviceUrl);
                const devices = devicesRes.data.response.results || [];

                if (devices.length === 0) {
                    console.log(`⚠️ No devices found matching constraints for this notification.`);
                } else {
                    console.log(`📱 Found ${devices.length} target devices. Sending Push...`);
                    
                    const payload = {
                        notification: {
                            title: notif.title || 'Notification',
                            body: notif.body || '',
                        },
                        data: {}
                    };
                    
                    if (notif.image) payload.notification.image = notif.image;
                    if (notif.targetUrl) payload.data.url = notif.targetUrl;

                    for (const device of devices) {
                        try {
                            if (!device.pushToken) continue;
                            sentCount++;
                            const message = {
                                ...payload,
                                token: device.pushToken
                            };
                            await messaging.send(message);
                            deliveredCount++;
                            console.log(`✅ Sent to ${device.pushToken.substring(0, 15)}...`);
                        } catch (sendErr) {
                            console.error(`❌ FCM Error for ${device.pushToken}:`, sendErr.message);
                            // If invalid token, you could delete it from Bubble here.
                        }
                    }
                }

                // Create History Record
                await api.post('/obj/notification', {
                    title: notif.title,
                    body: notif.body,
                    owner: notif.owner,
                    status: 'Sent',
                    targetApp: notif.targetApp,
                    targetOs: notif.targetOs,
                    image: notif.image,
                    targetUrl: notif.targetUrl
                });

                // Delete from Queue
                await api.delete(`/obj/notification_queue/${notif._id}`);
                console.log(`✅ Successfully processed and moved to history (${deliveredCount}/${sentCount} delivered).`);

            } catch (err) {
                console.error(`🚨 Error processing notification ${notif._id}:`, err.message);
                
                // Move back to history with Failed status so it isn't stuck blocking
                await api.post('/obj/notification', {
                    title: notif.title,
                    body: notif.body,
                    owner: notif.owner,
                    status: 'Failed',
                    targetApp: notif.targetApp,
                    targetOs: notif.targetOs,
                    image: notif.image,
                    targetUrl: notif.targetUrl
                });
                await api.delete(`/obj/notification_queue/${notif._id}`);
            }
        }
    } catch (err) {
        console.error('🚨 Global Worker Error:', err.message);
    }
}

runWorker();
