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

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Accès refusé. Privilèges administrateur requis.' });
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
// PAYDUNYA ROUTES
// ----------------------------------------------------------------------
api.post('/payment/create-invoice', authMiddleware, async (req: any, res) => {
  try {
    const { plan } = req.body;
    if (!plan || (plan !== 'yearly' && plan !== 'lifetime')) {
      return res.status(400).json({ error: 'Plan invalide.' });
    }

    const PAYDUNYA_MASTER_KEY = process.env.PAYDUNYA_MASTER_KEY;
    const PAYDUNYA_PRIVATE_KEY = process.env.PAYDUNYA_PRIVATE_KEY;
    const PAYDUNYA_TOKEN = process.env.PAYDUNYA_TOKEN;
    const PAYDUNYA_MODE = process.env.PAYDUNYA_MODE || 'test';

    if (!PAYDUNYA_MASTER_KEY || !PAYDUNYA_PRIVATE_KEY || !PAYDUNYA_TOKEN) {
      console.error('[PayDunya] Clés API manquantes. Vérifiez vos GitHub Secrets.');
      return res.status(500).json({ error: 'Configuration serveur manquante. Veuillez vérifier que les secrets GitHub (PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN) sont bien configurés et non vides.', details: { master: !!PAYDUNYA_MASTER_KEY, private: !!PAYDUNYA_PRIVATE_KEY, token: !!PAYDUNYA_TOKEN } });
    }

    const settingsDoc = await db.collection('settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data()! : { pricing: { starter: 25000, pro: 75000 } };
    const pricing = settings.pricing || { starter: 25000, pro: 75000 };
    const amount = plan === 'yearly' ? (pricing.starter || 25000) : (pricing.pro || 75000);
    const description = plan === 'yearly' ? 'Abonnement Annuel Site2App' : 'Accès À Vie Site2App';

    const payload = {
      invoice: {
        total_amount: amount,
        description: description,
      },
      store: {
        name: 'Site2App',
      },
      custom_data: {
        userId: req.user.id,
        plan: plan,
      },
      actions: {
        cancel_url: 'https://site2app.online/dashboard/pricing?payment=cancelled',
        return_url: 'https://site2app.online/dashboard/pricing?payment=success',
        callback_url: 'https://us-central1-site2app-ba735.cloudfunctions.net/api/api/payment/webhook'
      }
    };

    let response;
    try {
      const baseUrl = PAYDUNYA_MODE === 'test' ? 'https://app.paydunya.com/sandbox-api/v1' : 'https://app.paydunya.com/api/v1';
      response = await fetch(`${baseUrl}/checkout-invoice/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
          'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
          'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
          'PAYDUNYA-MODE': PAYDUNYA_MODE
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchErr: any) {
      console.error('[PayDunya] Fetch Failed:', fetchErr);
      return res.status(500).json({ error: 'Erreur réseau vers PayDunya', details: fetchErr.message });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr: any) {
      console.error('[PayDunya] JSON Parse Failed:', parseErr);
      const text = await response.text().catch(() => 'no text');
      return res.status(500).json({ error: 'Erreur de parsing de la réponse PayDunya', status: response.status, bodyText: text });
    }

    if (data.response_code === '00') {
      return res.json({ invoiceUrl: data.response_text });
    } else {
      console.error('[PayDunya] Erreur:', data);
      return res.status(500).json({ error: 'Erreur lors de la création de la facture', details: data });
    }
  } catch (err: any) {
    console.error('[PayDunya] Exception:', err);
    res.status(500).json({ error: 'Exception interne', details: err.message });
  }
});

api.post('/payment/softpay', authMiddleware, async (req: any, res) => {
  try {
    const { plan, paymentMethod, phoneNumber, fullName, email } = req.body;
    if (!plan || (plan !== 'yearly' && plan !== 'lifetime')) {
      return res.status(400).json({ error: 'Plan invalide.' });
    }
    if (!paymentMethod || !phoneNumber) {
      return res.status(400).json({ error: 'Moyen de paiement et numéro de téléphone requis.' });
    }

    const PAYDUNYA_MASTER_KEY = process.env.PAYDUNYA_MASTER_KEY;
    const PAYDUNYA_PRIVATE_KEY = process.env.PAYDUNYA_PRIVATE_KEY;
    const PAYDUNYA_TOKEN = process.env.PAYDUNYA_TOKEN;
    const PAYDUNYA_MODE = process.env.PAYDUNYA_MODE || 'test';

    if (!PAYDUNYA_MASTER_KEY || !PAYDUNYA_PRIVATE_KEY || !PAYDUNYA_TOKEN) {
      return res.status(500).json({ error: 'Configuration serveur manquante.' });
    }

    const settingsDoc = await db.collection('settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data()! : { pricing: { starter: 25000, pro: 75000 } };
    const pricing = settings.pricing || { starter: 25000, pro: 75000 };
    const amount = plan === 'yearly' ? (pricing.starter || 25000) : (pricing.pro || 75000);
    const description = plan === 'yearly' ? 'Abonnement Annuel Site2App' : 'Accès À Vie Site2App';

    const payload = {
      invoice: { total_amount: amount, description: description },
      store: { name: 'Site2App' },
      custom_data: { userId: req.user.id, plan: plan },
      actions: {
        cancel_url: 'https://site2app.online/dashboard/pricing?payment=cancelled',
        return_url: 'https://site2app.online/dashboard/pricing?payment=success',
        callback_url: 'https://us-central1-site2app-ba735.cloudfunctions.net/api/api/payment/webhook'
      }
    };

    // 1. Generate Checkout Invoice Token
    const baseUrl = PAYDUNYA_MODE === 'test' ? 'https://app.paydunya.com/sandbox-api/v1' : 'https://app.paydunya.com/api/v1';
    const invoiceRes = await fetch(`${baseUrl}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
        'PAYDUNYA-MODE': PAYDUNYA_MODE
      },
      body: JSON.stringify(payload),
    });

    const invoiceData = await invoiceRes.json();
    if (invoiceData.response_code !== '00') {
      return res.status(500).json({ error: 'Erreur génération facture', details: invoiceData });
    }

    const invoiceToken = invoiceData.token;

    // 2. Call SoftPay
    if (PAYDUNYA_MODE === 'test') {
      // Mock responses in test mode because Sandbox Softpay endpoints don't exist
      if (paymentMethod === 'wave_senegal') {
        return res.json({ success: true, url: invoiceData.response_text }); // Redirect to sandbox checkout for simulation
      } else if (paymentMethod === 'orange_money_senegal') {
        return res.json({ success: true, url: invoiceData.response_text, other_url: { om_url: invoiceData.response_text } });
      } else if (paymentMethod === 'free_money_senegal') {
        return res.json({ success: true, message: 'Opération réussie, Veuillez tapez #150# pour finaliser votre paiement.' });
      } else {
        return res.json({ success: true, url: invoiceData.response_text });
      }
    }

    // LIVE MODE
    const endpointPath = paymentMethod.replace(/_/g, '-');
    const softpayUrl = `https://app.paydunya.com/api/v1/softpay/${endpointPath}`;
    
    const softpayPayload = {
      // Generic parameters
      customer_name: fullName || req.user.id,
      customer_email: email || 'test@site2app.online',
      phone_number: phoneNumber,
      phone_phone: phoneNumber,
      invoice_token: invoiceToken,
      payment_token: invoiceToken,
      
      // Wave parameters
      wave_senegal_fullName: fullName || req.user.id,
      wave_senegal_email: email || 'test@site2app.online',
      wave_senegal_phone: phoneNumber,
      wave_senegal_payment_token: invoiceToken,
      
      // Wave CI parameters (guessing based on pattern if needed)
      wave_ci_fullName: fullName || req.user.id,
      wave_ci_email: email || 'test@site2app.online',
      wave_ci_phone: phoneNumber,
      wave_ci_payment_token: invoiceToken,

      // Expresso parameters
      expresso_sn_fullName: fullName || req.user.id,
      expresso_sn_email: email || 'test@site2app.online',
      expresso_sn_phone: phoneNumber,

      // Celtiis parameters
      celtiis_cash_customer_fullname: fullName || req.user.id,
      celtiis_cash_customer_email: email || 'test@site2app.online',
      celtiis_cash_phone_number: phoneNumber,

      // Djamo parameters
      djamo_fullName: fullName || req.user.id,
      djamo_email: email || 'test@site2app.online',
      djamo_phone: phoneNumber,
      djamo_payment_token: invoiceToken,
      
      // MTN Benin parameters
      mtn_benin_customer_fullname: fullName || req.user.id,
      mtn_benin_email: email || 'test@site2app.online',
      mtn_benin_phone_number: phoneNumber,
      mtn_benin_wallet_provider: "MTNBENIN",

      // Moov Benin parameters
      moov_benin_customer_fullname: fullName || req.user.id,
      moov_benin_email: email || 'test@site2app.online',
      moov_benin_phone_number: phoneNumber,
      moov_benin_wallet_provider: "MOOVBENIN"
    };

    const softRes = await fetch(softpayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
      },
      body: JSON.stringify(softpayPayload)
    });

    const softText = await softRes.text();
    let softData;
    try {
      softData = JSON.parse(softText);
    } catch (e) {
      console.error('[PayDunya SoftPay] Réponse invalide (non-JSON):', softText.substring(0, 200));
      return res.status(502).json({ error: 'Exception interne SoftPay (Réponse non-JSON du serveur bancaire)', details: softText.substring(0, 100) });
    }

    return res.json(softData);

  } catch (err: any) {
    console.error('[SoftPay] Exception:', err);
    res.status(500).json({ error: 'Exception interne SoftPay', details: err.message });
  }
});

api.post('/payment/webhook', express.json(), async (req: any, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.custom_data) {
      return res.status(400).send('Invalid payload');
    }

    const { userId, plan } = data.custom_data;
    const status = data.status; // e.g. "completed"

    if (status === 'completed') {
      await db.collection('users').doc(userId).update({
        plan: plan,
        lastPaymentStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[PayDunya] Succès: Plan ${plan} activé pour l'utilisateur ${userId}`);
    } else {
      await db.collection('users').doc(userId).update({
        lastPaymentStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[PayDunya] Statut de paiement ${status} pour l'utilisateur ${userId}`);
    }

    res.status(200).send('OK');
  } catch (err: any) {
    console.error('[PayDunya Webhook] Erreur:', err);
    res.status(500).send('Internal Error');
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

    const buildId = req.body.buildId || Date.now().toString();
    const isNewBuild = !req.body.buildId;
    const finalPackage = packageName || `com.site2app.${(appName || 'myapp').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '.').replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '')}`;

    if (isNewBuild) {
        // App limit check
        const userPlan = req.user.plan || 'free';
        const limit = userPlan === 'free' ? 1 : (userPlan === 'yearly' ? 10 : 99999);
        const userBuildsSnap = await db.collection('builds').where('userId', '==', req.user.id).get();
        const activeApps = new Set(userBuildsSnap.docs.map(d => d.data().packageName)).size;
        if (activeApps >= limit) {
            return res.status(403).json({ error: `Limite atteinte. Votre plan (${userPlan}) vous autorise ${limit} application(s).` });
        }
    }


    // Get max version code for this package without requiring a composite index
    const existingBuilds = await db.collection('builds')
      .where('packageName', '==', finalPackage)
      .get();
    
    let maxVersion = 0;
    existingBuilds.docs.forEach((doc: any) => {
        const vc = parseInt(doc.data().versionCode) || 0;
        if (vc > maxVersion) maxVersion = vc;
    });
    
    // If it's an update, increment the highest version found. If new, default to 1.
    const reqVersionCode = parseInt(versionCode) || 0;
    const finalVersionCode = Math.max(reqVersionCode, maxVersion + 1);
    const finalVersionName = versionName || `1.${finalVersionCode}`;

    let finalIconUrl = null;
    let finalSplashUrl = null;
    
    const bucket = admin.storage().bucket();
    
    if (icon && !icon.startsWith('http')) {
        try {
            const buffer = icon.startsWith('data:') ? Buffer.from(icon.split(',')[1], 'base64') : Buffer.from(icon, 'base64');
            const ext = icon.startsWith('data:image/jpeg') ? 'jpg' : 'png';
            const mimeType = ext === 'jpg' ? 'image/jpeg' : 'image/png';
            const file = bucket.file(`builds/${buildId}/icon.${ext}`);
            await file.save(buffer, { metadata: { contentType: mimeType } });
            await file.makePublic().catch(() => {});
            finalIconUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        } catch(e) { console.error('Icon upload failed', e); }
    } else if (icon && icon.startsWith('http')) {
        finalIconUrl = icon;
    }

    if (splashImage && !splashImage.startsWith('http')) {
        try {
            const buffer = splashImage.startsWith('data:') ? Buffer.from(splashImage.split(',')[1], 'base64') : Buffer.from(splashImage, 'base64');
            const ext = splashImage.startsWith('data:image/png') ? 'png' : 'jpg';
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const file = bucket.file(`builds/${buildId}/splash.${ext}`);
            await file.save(buffer, { metadata: { contentType: mimeType } });
            await file.makePublic().catch(() => {});
            finalSplashUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        } catch(e) { console.error('Splash upload failed', e); }
    } else if (splashImage && splashImage.startsWith('http')) {
        finalSplashUrl = splashImage;
    }

    const buildData: any = {
      id: buildId,
      appName: appName || 'My App',
      url: url || 'https://google.com',
      platform: platform || 'android',
      packageName: finalPackage,
      status: 'building',
      startedAt: new Date().toISOString(),
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
          features: features || {},
          icon: finalIconUrl,
          splashImage: finalSplashUrl
        }).filter(([_, v]) => v !== undefined && v !== null)
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
        userPlan: req.user?.plan || 'free',
        statusBarColor: statusBarColor || primaryColor || '#3461f5',
        themeColor: themeColor || primaryColor || '#3461f5',
        splashBgColor: splashBgColor || primaryColor || '#3461f5',
        enableFullscreen: !!enableFullscreen,
        platform: buildData.platform,
        orientation: orientation || 'portrait',
        features: features || {},
        iconBase64: null, // Removed to prevent GitHub Action payload > 64KB limit
        iconUrl: finalIconUrl,
        splashImageBase64: null, // Removed to prevent GitHub Action payload > 64KB limit
        splashUrl: finalSplashUrl,
        versionCode: finalVersionCode,
        versionName: finalVersionName,
        googleServicesJson: masterGoogleServices || req.user?.googleServicesJson || null,
        apiUrl: 'https://us-central1-site2app-ba735.cloudfunctions.net/api/api',
      }
    };

    buildData.builderConfig = builderConfig;
    
    if (isNewBuild) {
      buildData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    } else {
      buildData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await db.collection('builds').doc(buildId).set(buildData, { merge: true });

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
    
    // Delete only this specific build
    await db.collection('builds').doc(buildId).delete();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/builds', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('builds')
      .where('userId', '==', req.user.id)
      .get();
      
    const builds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort builds in memory (descending by createdAt/startedAt)
    builds.sort((a: any, b: any) => {
        const getDate = (d: any, fallback: any) => {
            if (d?.toDate) return d.toDate().getTime();
            if (typeof d === 'string' || typeof d === 'number') return new Date(d).getTime() || 0;
            if (fallback) return getDate(fallback, null);
            return 0;
        };
        const dateA = getDate(a.createdAt, a.startedAt);
        const dateB = getDate(b.createdAt, b.startedAt);
        return dateB - dateA;
    });
    
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
    const buildId = req.params.buildId;
    const doc = await db.collection('builds').doc(buildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Build not found' });
    const buildData = doc.data()!;
    if (buildData.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    
    // 1. Mark as published
    await db.collection('builds').doc(buildId).update({
      publishedVersionCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 2. Find all builds for this packageName to get all associated devices
    const allBuildsSnap = await db.collection('builds')
        .where('userId', '==', req.user.id)
        .where('packageName', '==', buildData.packageName)
        .get();
    const buildIds = allBuildsSnap.docs.map(d => d.id);
    
    // 3. Find all devices associated with any of these buildIds
    const devicesSnap = await db.collection('devices')
        .where('userId', '==', req.user.id)
        .get();
        
    const tokens = devicesSnap.docs
        .filter(d => buildIds.includes(d.data().buildId))
        .map(d => d.data().pushToken)
        .filter(Boolean);

    // 4. Send update push notification
    if (tokens.length > 0) {
        await sendNotificationCore(req.user, {
            title: '🚀 Mise à jour disponible !',
            body: 'Une nouvelle version de votre application est disponible. Mettez à jour maintenant !',
            actionUrl: buildData.downloadUrl || '',
            target: tokens,
            buildId: buildId
        });
    }
    
    res.json({ success: true, notifiedCount: tokens.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public endpoint for Android app to check for updates
api.get('/public/app/:packageName/check-update', async (req, res) => {
    try {
        const packageName = req.params.packageName;
        const snap = await db.collection('builds')
            .where('packageName', '==', packageName)
            .where('status', '==', 'completed')
            .get();
            
        if (snap.empty) {
            return res.json({ updateAvailable: false });
        }
        
        const builds = snap.docs.map(d => d.data());
        builds.sort((a: any, b: any) => {
            const getDate = (d: any) => {
                if (d?.toDate) return d.toDate().getTime();
                if (typeof d === 'string' || typeof d === 'number') return new Date(d).getTime() || 0;
                return 0;
            };
            return getDate(b.createdAt) - getDate(a.createdAt);
        });

        const build = builds[0];
        res.json({
            latestVersionCode: parseInt(build.publishedVersionCode || build.versionCode || '1', 10),
            apkUrl: build.downloadUrl || null,
            releaseNotes: 'Nouvelles fonctionnalités et améliorations de performances.'
        });
    } catch (err) {
        console.error('Check update error:', err);
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
async function sendNotificationCore(user: any, payload: any) {
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
        const message: any = {
          notification: { title, body, ...(image && { imageUrl: image }) },
          data: { actionUrl: actionUrl || '' },
          android: {
            priority: 'high',
            notification: {
              sound: 'default'
            }
          },
          apns: {
            payload: {
              aps: {
                contentAvailable: true,
                sound: 'default'
              }
            }
          },
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
      .get();
      
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifs.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
    });
    
    res.json(notifs);
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
    // Android Builder app sends deviceId and buildId
    // New versions could send pushToken and userId
    const pushToken = req.body.pushToken || req.body.deviceId;
    const buildId = req.body.buildId;
    const platform = req.body.platform || req.body.os || 'android';
    
    if (!pushToken || !buildId) {
        return res.status(400).json({ error: 'pushToken and buildId required' });
    }
    
    // Auto-discover userId from the build to ensure backward compatibility
    let userId = req.body.userId;
    if (!userId) {
        const buildDoc = await db.collection('builds').doc(buildId).get();
        if (buildDoc.exists) {
            userId = buildDoc.data()?.userId;
        }
    }
    
    // If we STILL don't have a userId, we can't tie it to a dashboard
    if (!userId) {
        return res.status(400).json({ error: 'Could not determine userId for this device' });
    }
    
    const id = crypto.createHash('md5').update(`${userId}_${pushToken}`).digest('hex');
    const deviceRef = db.collection('devices').doc(id);
    const existingDevice = await deviceRef.get();
    const isNewDevice = !existingDevice.exists;
    
    await deviceRef.set({
      pushToken,
      buildId,
      userId,
      platform,
      createdAt: isNewDevice ? admin.firestore.FieldValue.serverTimestamp() : existingDevice.data()?.createdAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Automatically send a welcome push notification to confirm integration
    if (isNewDevice && pushToken) {
        try {
            const message: any = {
                notification: {
                    title: '🚀 Notifications Activées !',
                    body: 'Vous recevrez désormais les notifications importantes de cette application.'
                },
                android: {
                    priority: 'high',
                    notification: { sound: 'default' }
                },
                apns: {
                    payload: { aps: { contentAvailable: true, sound: 'default' } }
                },
                token: pushToken
            };
            await admin.messaging().send(message);
        } catch (e) {
            console.error('Failed to send welcome push notification:', e);
        }
    }
    
    res.json({ success: true, isNew: isNewDevice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/devices', authMiddleware, async (req, res) => {
  try {
    const appId = req.query.appId as string;
    let query: any = db.collection('devices').where('userId', '==', req.user.id);
    if (appId) {
        query = query.where('buildId', '==', appId);
    }
    const snap = await query.get();
    
    const devices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    devices.sort((a: any, b: any) => {
        const dateA = a.updatedAt?.toDate?.()?.getTime() || 0;
        const dateB = b.updatedAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
    });
    
    res.json(devices);
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

// ----------------------------------------------------------------------
// ADMIN ROUTES
// ----------------------------------------------------------------------
api.get('/admin/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const buildsSnapshot = await db.collection('builds').get();
    
    // Very basic MRR estimation (just summing up prices of paid plans)
    // In reality, this requires subscription management logic.
    let mrr = 0;
    usersSnapshot.forEach(doc => {
      const plan = doc.data().plan;
      if (plan === 'starter') mrr += 25000;
      else if (plan === 'pro') mrr += 75000;
      else if (plan === 'enterprise') mrr += 150000; // approximation
    });

    res.json({
      totalUsers: usersSnapshot.size,
      totalBuilds: buildsSnapshot.size,
      mrr: mrr
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.put('/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // Prevent updating protected fields carelessly
    const safeUpdates = {
      role: updates.role,
      plan: updates.plan,
      status: updates.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Clean up undefined values
    Object.keys(safeUpdates).forEach(key => safeUpdates[key as keyof typeof safeUpdates] === undefined && delete safeUpdates[key as keyof typeof safeUpdates]);

    await db.collection('users').doc(id).update(safeUpdates);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.delete('/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('users').doc(id).delete();
    // In a real scenario, you might also want to delete their builds, apps, etc.
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/admin/builds', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('builds').orderBy('createdAt', 'desc').limit(100).get();
    const builds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(builds);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/settings', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('global').get();
    if (!doc.exists) {
      // Return default settings
      return res.json({
        pricing: {
          starter: 25000,
          pro: 75000,
          enterprise: 150000
        }
      });
    }
    res.json(doc.data());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.put('/admin/settings', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    await db.collection('settings').doc('global').set(updates, { merge: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

exports.api = onRequest({ cors: true, timeoutSeconds: 540, memory: '1GiB', region: 'us-central1' }, app);
