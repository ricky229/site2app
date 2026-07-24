import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

const app = express();
app.use(cors({ origin: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'site2app_super_secret';
const BUILDER_SECRET = process.env.BUILDER_SECRET || 'dev_secret_123';
const GITHUB_PAT = process.env.GITHUB_PAT || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// ----------------------------------------------------------------------
// MIDDLEWARE
// ----------------------------------------------------------------------
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (!decoded.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = { id: userDoc.id, ...userDoc.data() };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized', details: error.message });
  }
};

const builderAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${BUILDER_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized CI' });
  }
  next();
};

const api = express.Router();
app.use('/api', api);

// ----------------------------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------------------------
api.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const usersRef = db.collection('users');
    const existing = await usersRef.where('email', '==', email).limit(1).get();
    if (!existing.empty) return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    const userData = {
      email,
      name: name || 'Utilisateur',
      password: hashedPassword,
      plan: 'free',
      role: 'user',
      firebaseKey: '',
      googleServicesJson: '',
      appsCount: 0,
      downloadsCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await usersRef.doc(userId).set(userData);
    
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
    const userSafe = { id: userId, email, name: userData.name, plan: 'free', role: 'user', firebaseKey: '', googleServicesJson: '' };
    res.json({ user: userSafe, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    
    const userDoc = snapshot.docs[0]!;
    const user = userDoc.data();
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    
    const token = jwt.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: '30d' });
    const userSafe = {
      id: userDoc.id,
      email: user.email,
      name: user.name || 'Utilisateur',
      plan: user.plan || 'free',
      role: user.role || 'user',
      firebaseKey: user.firebaseKey || '',
      googleServicesJson: user.googleServicesJson || '',
    };
    res.json({ user: userSafe, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/auth/me', authMiddleware, (req, res) => {
  const { password, ...userProfile } = req.user;
  res.json(userProfile);
});

api.post('/auth/firebase-config', authMiddleware, async (req, res) => {
  try {
    const { adminSdkJson, googleServicesJson } = req.body;
    await db.collection('users').doc(req.user.id).update({
      firebaseKey: adminSdkJson || null,
      googleServicesJson: googleServicesJson || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.delete('/user', authMiddleware, async (req, res) => {
  try {
    await db.collection('users').doc(req.user.id).delete();
    // In a real scenario, you'd also delete associated builds/notifications
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// BUILD ROUTES
// ----------------------------------------------------------------------
api.post('/build', authMiddleware, async (req, res) => {
  try {
    const {
      appName, url, platform, packageName,
      statusBarColor, themeColor, splashBgColor, enableFullscreen,
      primaryColor, secondaryColor, orientation, features,
      icon, splashImage, versionCode, versionName
    } = req.body;

    const buildId = Date.now().toString();
    const finalPackage = packageName || `com.site2app.${(appName || 'myapp').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '.').replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '')}`;

    // Get max version code for this package
    const existingBuilds = await db.collection('builds')
      .where('packageName', '==', finalPackage)
      .orderBy('versionCode', 'desc')
      .limit(1)
      .get();
    
    const maxVersion = existingBuilds.empty ? 0 : (existingBuilds.docs[0]!.data().versionCode || 0);
    const reqVersionCode = parseInt(versionCode) || 0;
    const finalVersionCode = Math.max(reqVersionCode, maxVersion + 1);
    const finalVersionName = versionName || `1.${finalVersionCode}`;

    const buildData: any = {
      id: buildId,
      appName: appName || 'My App',
      url: url || 'https://google.com',
      platform: platform || 'android',
      packageName: finalPackage,
      status: 'building',
      startedAt: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user.id,
      versionCode: finalVersionCode,
      versionName: finalVersionName,
      config: Object.fromEntries(
        Object.entries({
          statusBarColor: statusBarColor || primaryColor || '#3461f5',
          themeColor: themeColor || primaryColor || '#3461f5',
          splashBgColor: splashBgColor || primaryColor || '#3461f5',
          enableFullscreen: !!enableFullscreen,
          primaryColor: primaryColor || '#3461f5',
          secondaryColor: secondaryColor || '#3461f5',
          orientation: orientation || 'portrait',
          features: features || {}
        }).filter(([_, v]) => v !== undefined)
      )
    };

    // Fetch the master google-services.json (from the admin who configured it)
    const masterUserSnap = await db.collection('users').orderBy('googleServicesJson').startAfter('').limit(1).get();
    const masterGoogleServices = masterUserSnap.empty ? null : masterUserSnap.docs[0].data().googleServicesJson;

    const builderConfig = {
      buildId,
      appUrl: buildData.url,
      appName: buildData.appName,
      packageName: buildData.packageName,
      options: {
        buildId,
        statusBarColor: statusBarColor || primaryColor || '#3461f5',
        themeColor: themeColor || primaryColor || '#3461f5',
        splashBgColor: splashBgColor || primaryColor || '#3461f5',
        enableFullscreen: !!enableFullscreen,
        platform: buildData.platform,
        orientation: orientation || 'portrait',
        features: features || {},
        iconBase64: (icon && !icon.startsWith('http')) ? icon : null,
        iconUrl: (icon && icon.startsWith('http')) ? icon : null,
        splashImageBase64: (splashImage && !splashImage.startsWith('http')) ? splashImage : null,
        splashUrl: (splashImage && splashImage.startsWith('http')) ? splashImage : null,
        versionCode: finalVersionCode,
        versionName: finalVersionName,
        googleServicesJson: masterGoogleServices || req.user?.googleServicesJson || null,
      }
    };

    buildData.builderConfig = builderConfig;
    await db.collection('builds').doc(buildId).set(buildData);

    // Trigger GitHub Action
    if (GITHUB_PAT && GITHUB_REPO) {
      console.log(`[API] 🚀 Triggering GitHub Action for build ${buildId}...`);
      console.log(`[API] GITHUB_REPO=${GITHUB_REPO}, PAT length=${GITHUB_PAT.length}`);
      try {
        const dispatchRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${GITHUB_PAT}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Site2App-Functions'
          },
          body: JSON.stringify({
            event_type: 'build_apk',
            client_payload: {
              buildData: JSON.stringify({
                ...builderConfig,
                ...builderConfig.options,
                url: buildData.url,
                appUrl: buildData.url,
              })
            }
          })
        });
        if (!dispatchRes.ok) {
          const errText = await dispatchRes.text();
          console.error(`[API] ❌ GitHub Action trigger failed: ${dispatchRes.status} - ${errText}`);
          // Mark build as failed so frontend stops waiting
          await db.collection('builds').doc(buildId).update({
            status: 'failed',
            error: `GitHub Action trigger failed (${dispatchRes.status}): ${errText}`,
          });
          return res.json({ buildId, status: 'failed', error: 'GitHub Action trigger failed' });
        } else {
          console.log('[API] ✅ GitHub Action triggered');
        }
      } catch (dispatchErr: any) {
        console.error('[API] ❌ GitHub dispatch error:', dispatchErr.message);
        await db.collection('builds').doc(buildId).update({
          status: 'failed',
          error: `GitHub dispatch error: ${dispatchErr.message}`,
        });
        return res.json({ buildId, status: 'failed', error: dispatchErr.message });
      }
    } else {
      console.error(`[API] ❌ GITHUB_PAT or GITHUB_REPO not configured! PAT=${GITHUB_PAT ? 'SET' : 'EMPTY'}, REPO=${GITHUB_REPO || 'EMPTY'}`);
      await db.collection('builds').doc(buildId).update({
        status: 'failed',
        error: 'Configuration serveur manquante: GITHUB_PAT ou GITHUB_REPO non configuré.',
      });
      return res.json({ buildId, status: 'failed', error: 'Server configuration missing: GITHUB_PAT or GITHUB_REPO not set' });
    }

    res.json({ buildId, status: 'building' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/build/:buildId/status', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('builds').doc(req.params.buildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Build not found' });
    
    const build = doc.data();
    if (build.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    
    res.json(build);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.delete('/build/:buildId', authMiddleware, async (req, res) => {
  try {
    const buildId = req.params.buildId;
    const doc = await db.collection('builds').doc(buildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Build not found' });
    
    const build = doc.data();
    if (build.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    
    const packageName = build.packageName;
    
    // Delete all builds with the same package name for this user
    const buildsSnapshot = await db.collection('builds')
      .where('userId', '==', req.user.id)
      .where('packageName', '==', packageName)
      .get();
      
    const batch = db.batch();
    buildsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/builds', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('builds')
      .where('userId', '==', req.user.id)
      .orderBy('createdAt', 'desc')
      .get();
      
    const builds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Group by packageName
    const grouped = builds.reduce((acc: any, current: any) => {
      const pkg = current.packageName || current.id;
      if (!acc[pkg]) acc[pkg] = [];
      acc[pkg].push(current);
      return acc;
    }, {});
    
    // Add analytics to the latest build of each group
    const devicesSnap = await db.collection('devices').where('userId', '==', req.user.id).get();
    const deviceCounts = devicesSnap.docs.reduce((acc: any, doc: any) => {
        const d = doc.data();
        if (d.buildId) {
            acc[d.buildId] = (acc[d.buildId] || 0) + 1;
        }
        return acc;
    }, {});

    Object.keys(grouped).forEach(pkg => {
        if (grouped[pkg].length > 0) {
            const latestBuild = grouped[pkg][0];
            latestBuild.activeUsers = deviceCounts[latestBuild.id] || 0;
            // Accumulate total devices for the whole package history
            latestBuild.downloadCount = grouped[pkg].reduce((sum: number, b: any) => sum + (deviceCounts[b.id] || 0), 0);
        }
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/apps/:buildId/publish', authMiddleware, async (req, res) => {
  try {
    const { publishedVersionCode } = req.body;
    const doc = await db.collection('builds').doc(req.params.buildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Build not found' });
    if (doc.data().userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    
    await db.collection('builds').doc(req.params.buildId).update({
      publishedVersionCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// INTERNAL CI ROUTES
// ----------------------------------------------------------------------
api.get('/internal/build/:buildId/config', builderAuthMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('builds').doc(req.params.buildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Build not found' });
    
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/internal/build/:buildId/upload', builderAuthMiddleware, express.raw({ type: '*/*', limit: '100mb' }), async (req: any, res) => {
  try {
    const buildId = req.params.buildId;
    const doc = await db.collection('builds').doc(buildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Build not found' });
    
    const build = doc.data()!;
    const fileName = req.headers['x-file-name'] || `${build.packageName || 'app'}.apk`;
    const bucket = storage.bucket();
    const file = bucket.file(`builds/${buildId}/${fileName}`);
    
    await file.save(req.body, {
      metadata: {
        contentType: 'application/vnd.android.package-archive',
        metadata: { buildId, packageName: build.packageName }
      }
    });
    
    // Make file publicly accessible
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/builds/${buildId}/${fileName}`;
    
    await db.collection('builds').doc(buildId).update({
      status: 'completed',
      completedAt: new Date().toISOString(),
      fileName,
      size: req.body.length,
      downloadUrl: publicUrl,
      apkFile: publicUrl,
    });
    
    // Clean up builderConfig to save space
    await db.collection('builds').doc(buildId).update({
      builderConfig: admin.firestore.FieldValue.delete()
    });
    
    console.log(`[CI] ✅ Build ${buildId} APK uploaded (${req.body.length} bytes)`);
    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error(`[CI] ❌ Upload failed:`, err);
    res.status(500).json({ error: err.message });
  }
});

api.post('/internal/build/:buildId/fail', builderAuthMiddleware, async (req, res) => {
  try {
    await db.collection('builds').doc(req.params.buildId).update({
      status: 'failed',
      error: req.body.error || 'CI Build Failed',
      completedAt: new Date().toISOString(),
    });
    // Clean up builderConfig
    await db.collection('builds').doc(req.params.buildId).update({
      builderConfig: admin.firestore.FieldValue.delete()
    });
    console.log(`[CI] ❌ Build ${req.params.buildId} marked as failed`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// NOTIFICATION LOGIC
// ----------------------------------------------------------------------
const sendNotificationCore = async (user, payload) => {
  const { title, body, buildId, target, image, actionUrl, scheduledAt } = payload;
  
  const notifId = uuidv4();
  const notificationRecord: any = {
    id: notifId,
    userId: user.id,
    title: payload.title || '',
    body: payload.body || payload.message || '',
    buildId: payload.buildId || payload.appId || null,
    target: payload.target || 'all',
    status: scheduledAt ? 'scheduled' : 'sent',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  if (payload.image) notificationRecord.image = payload.image;
  if (payload.actionUrl || payload.url) notificationRecord.actionUrl = payload.actionUrl || payload.url;
  if (scheduledAt) notificationRecord.scheduledAt = new Date(scheduledAt);
  
  if (!scheduledAt) {
    try {
      let tokens: string[] = [];
      if (Array.isArray(target) && target.length > 0) {
        tokens = target;
      } else {
        let devicesQuery = db.collection('devices').where('userId', '==', user.id);
        if (buildId && buildId !== 'all') {
          devicesQuery = devicesQuery.where('buildId', '==', buildId);
        }
        const devicesSnap = await devicesQuery.get();
        tokens = devicesSnap.docs.map(d => d.data().pushToken).filter(Boolean);
      }
      
      if (tokens.length > 0) {
        const message = {
          notification: { title, body, ...(image && { image }) },
          data: { actionUrl: actionUrl || '' },
          tokens
        };
        const response = await admin.messaging().sendEachForMulticast(message);
        
        notificationRecord['stats'] = {
          successCount: response.successCount,
          failureCount: response.failureCount
        };
        
        // Remove stale tokens
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered')) {
            failedTokens.push(tokens[idx]);
          }
        });
        
        if (failedTokens.length > 0) {
          const batch = db.batch();
          const staleDevicesSnap = await db.collection('devices')
            .where('userId', '==', user.id)
            .where('pushToken', 'in', failedTokens)
            .get();
          staleDevicesSnap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } else {
        notificationRecord['stats'] = { successCount: 0, failureCount: 0, note: 'No tokens found' };
      }
    } catch (err) {
      console.error('FCM Send Error:', err);
      notificationRecord['status'] = 'failed';
      notificationRecord['error'] = err.message;
    }
  }
  
  await db.collection('notifications').doc(notifId).set(notificationRecord);
  return notificationRecord;
};

api.post('/notifications/send', authMiddleware, async (req, res) => {
  try {
    const result = await sendNotificationCore(req.user, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('notifications')
      .where('userId', '==', req.user.id)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.delete('/notifications', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('notifications').where('userId', '==', req.user.id).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.delete('/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('notifications').doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== req.user.id) {
      return res.status(404).json({ error: 'Not found or forbidden' });
    }
    await doc.ref.delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/notifications/latest', async (req, res) => {
  try {
    const appId = req.query.appId as string;
    if (!appId) return res.status(400).json({ error: 'appId required' });
    
    const snap = await db.collection('notifications')
      .where('buildId', '==', appId)
      .where('status', '==', 'sent')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
      
    if (snap.empty) return res.json(null);
    res.json({ id: snap.docs[0].id, ...snap.docs[0].data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/notifications/webhook', async (req, res) => {
  try {
    // Requires a userId in the payload or via some auth
    const { userId, ...payload } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required in webhook payload' });
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    
    const user = { id: userDoc.id, ...userDoc.data() };
    const result = await sendNotificationCore(user, payload);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/notifications/poll', (req, res) => res.json({ success: true, message: 'No-op' }));

// ----------------------------------------------------------------------
// DEVICES
// ----------------------------------------------------------------------
api.post('/devices/register', async (req, res) => {
  try {
    const { pushToken, buildId, userId, platform } = req.body;
    if (!pushToken || !userId) return res.status(400).json({ error: 'pushToken and userId required' });
    
    const id = crypto.createHash('md5').update(`${userId}_${pushToken}`).digest('hex');
    await db.collection('devices').doc(id).set({
      pushToken,
      buildId,
      userId,
      platform,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/devices', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('devices').where('userId', '==', req.user.id).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// ANALYTICS & STATS
// ----------------------------------------------------------------------
api.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const devicesSnap = await db.collection('devices').where('userId', '==', req.user.id).get();
    const notificationsSnap = await db.collection('notifications').where('userId', '==', req.user.id).get();
    
    res.json({
      totalDevices: devicesSnap.size,
      totalNotifications: notificationsSnap.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/stats', authMiddleware, async (req, res) => {
  try {
    const buildsSnap = await db.collection('builds').where('userId', '==', req.user.id).get();
    const activeApps = new Set(buildsSnap.docs.map(d => d.data().packageName)).size;
    const completedBuilds = buildsSnap.docs.filter(d => d.data().status === 'completed').length;
    
    res.json({
      activeApps,
      completedBuilds,
      totalBuilds: buildsSnap.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// DOWNLOAD
// ----------------------------------------------------------------------
api.get(['/download/:buildId', '/download/:buildId/:type'], async (req, res) => {
  try {
    const doc = await db.collection('builds').doc(req.params.buildId).get();
    if (!doc.exists) return res.status(404).send('Not found');
    
    const build = doc.data();
    if (build.status !== 'completed' || !build.apkUrl) {
      return res.status(400).send('Build not ready');
    }
    
    res.redirect(build.apkUrl);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

api.get('/download-latest', async (req, res) => {
  try {
    const appId = req.query.appId as string;
    if (!appId) return res.status(400).send('appId required');
    
    const snap = await db.collection('builds')
      .where('packageName', '==', appId)
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
      
    if (snap.empty || !snap.docs[0].data().apkUrl) {
      return res.status(404).send('No builds found');
    }
    
    res.redirect(snap.docs[0].data().apkUrl);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ----------------------------------------------------------------------
// OTHER
// ----------------------------------------------------------------------
api.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

api.get('/apps/check-update', async (req, res) => {
  try {
    const packageName = req.query.packageName as string;
    const versionCode = parseInt(req.query.versionCode as string);
    if (!packageName) return res.status(400).json({ error: 'packageName required' });
    
    const snap = await db.collection('builds')
      .where('packageName', '==', packageName)
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
      
    if (snap.empty) return res.json({ updateAvailable: false });
    
    const latestBuild = snap.docs[0].data();
    const updateAvailable = latestBuild.publishedVersionCode && latestBuild.publishedVersionCode > (versionCode || 0);
    
    res.json({ updateAvailable, latestVersionCode: latestBuild.publishedVersionCode, apkUrl: latestBuild.apkUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/analyze', async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).json({ error: 'URL required' });
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 10000
    });
    
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Extract favicon
    const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    let favicon = iconMatch ? iconMatch[1].trim() : '';
    if (favicon && !favicon.startsWith('http')) {
      const urlObj = new URL(targetUrl);
      favicon = new URL(favicon, urlObj.origin).toString();
    }
    
    // Extract colors
    const colorsCount = new Map<string, number>();
    
    const addColor = (c: string, weight: number = 1) => {
      const color = c.toLowerCase();
      // Expanded filter for generic grays and whites
      const genericColors = ['#ffffff', '#000000', '#fff', '#000', '#f4f5f6', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529', '#111111', '#222222', '#333333', '#f0f0f0', '#fafafa'];
      if (genericColors.includes(color)) return;
      colorsCount.set(color, (colorsCount.get(color) || 0) + weight);
    };

    // Theme color gets a big weight
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (themeColorMatch) addColor(themeColorMatch[1], 20);
    
    // Regex for colors
    const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/gi;
    const cssVarRegex = /--[\w-]+:\s*(#[A-Fa-f0-9]{3,8}|rgba?\([^)]+\))/gi;
    
    let match;
    while ((match = hexRegex.exec(html)) !== null) addColor(match[0]);
    while ((match = rgbRegex.exec(html)) !== null) addColor(match[0]);
    while ((match = cssVarRegex.exec(html)) !== null) addColor(match[1]);
    
    // Fetch external CSS up to 5
    const cssMatches = [...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].slice(0, 5);
    for (const cssMatch of cssMatches) {
      try {
        let cssUrl = cssMatch[1];
        if (!cssUrl.startsWith('http')) cssUrl = new URL(cssUrl, new URL(targetUrl).origin).toString();
        
        const cssRes = await fetch(cssUrl, { timeout: 5000 });
        if (cssRes.ok) {
          const cssText = await cssRes.text();
          while ((match = hexRegex.exec(cssText)) !== null) addColor(match[0]);
          while ((match = rgbRegex.exec(cssText)) !== null) addColor(match[0]);
        }
      } catch (e) {
        // ignore css fetch errors
      }
    }
    
    // Sort by frequency
    const sortedColors = Array.from(colorsCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    res.json({
      title,
      description,
      favicon,
      colors: sortedColors.slice(0, 10), // Limit to top 10 unique colors
      ssl: targetUrl.startsWith('https://')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

exports.api = onRequest({ cors: true, timeoutSeconds: 540, memory: '1GiB', region: 'us-central1' }, app);
