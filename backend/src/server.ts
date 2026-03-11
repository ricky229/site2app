import express from 'express'
import admin from 'firebase-admin'
import os from 'os'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises' // For async operations like readdir
import { existsSync } from 'fs' // For sync exists check
import fsSync from 'fs' // For sync operations like readFileSync, writeFileSync, mkdirSync
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
// @ts-ignore
import Builder from './services/Builder.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STORAGE_PATH = path.join(__dirname, '../storage')
const BUILDS_JSON = path.join(STORAGE_PATH, 'builds.json')
const NOTIFS_JSON = path.join(STORAGE_PATH, 'notifications.json')
const USERS_JSON = path.join(STORAGE_PATH, 'users.json')

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fsSync.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
        const serviceAccount = JSON.parse(fsSync.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[Firebase] FCM Initialized.')
    } else {
        console.log('[Firebase] No Service Account configured. Notifications will be simulated.')
    }
} catch (e) {
    console.error('[Firebase] Failed to initialize FCM:', e)
}

// Ensure storage exists
if (!fsSync.existsSync(STORAGE_PATH)) fsSync.mkdirSync(STORAGE_PATH, { recursive: true })
if (!fsSync.existsSync(path.join(STORAGE_PATH, 'builds'))) fsSync.mkdirSync(path.join(STORAGE_PATH, 'builds'), { recursive: true })

// ─── Build Management ────────────────────────────────
interface BuildInfo {
    id: string
    appName: string
    url: string
    packageName: string
    platform: 'android' | 'ios' | 'both'
    status: 'pending' | 'building' | 'completed' | 'failed'
    startedAt: string
    completedAt?: string
    fileName?: string
    size?: number
    error?: string
    config?: any
    userId?: string
    versionCode?: number
    versionName?: string
    activeUsers?: number
    downloadCount?: number
    builderConfig?: any
}

// In-memory maps
const builds = new Map<string, BuildInfo>()
const notifications = new Map<string, any>()
const users = new Map<string, any>()
const sessions = new Map<string, string>() // token -> userId
const devices = new Map<string, any>()

const DEVICES_JSON = path.join(STORAGE_PATH, 'devices.json')
const PROCESSED_BUBBLE_JSON = path.join(STORAGE_PATH, 'processed_bubble.json')
const processedBubbleNotifs = new Set<string>()

function loadBuilds() {
    try {
        if (fsSync.existsSync(BUILDS_JSON)) {
            const data = JSON.parse(fsSync.readFileSync(BUILDS_JSON, 'utf8'))
            Object.entries(data).forEach(([id, build]) => builds.set(id, build as BuildInfo))
            console.log(`[Storage] Loaded ${builds.size} builds from disk.`)
        }
        if (fsSync.existsSync(NOTIFS_JSON)) {
            const data = JSON.parse(fsSync.readFileSync(NOTIFS_JSON, 'utf8'))
            Object.entries(data).forEach(([id, notif]) => notifications.set(id, notif))
            console.log(`[Storage] Loaded ${notifications.size} notifications.`)
        }
        if (fsSync.existsSync(USERS_JSON)) {
            const data = JSON.parse(fsSync.readFileSync(USERS_JSON, 'utf8'))
            Object.entries(data).forEach(([id, u]) => users.set(id, u))
            console.log(`[Storage] Loaded ${users.size} users.`)
        }
        if (fsSync.existsSync(DEVICES_JSON)) {
            const data = JSON.parse(fsSync.readFileSync(DEVICES_JSON, 'utf8'))
            Object.entries(data).forEach(([id, d]) => devices.set(id, d))
            console.log(`[Storage] Loaded ${devices.size} devices.`)
        }
        if (fsSync.existsSync(PROCESSED_BUBBLE_JSON)) {
            const data = JSON.parse(fsSync.readFileSync(PROCESSED_BUBBLE_JSON, 'utf8'))
            if (Array.isArray(data)) data.forEach((id: string) => processedBubbleNotifs.add(id))
            console.log(`[Storage] Loaded ${processedBubbleNotifs.size} processed Bubble notifications.`)
        }
    } catch (e) {
        console.error('[Storage] Error loading data:', e)
    }
}

function saveUsers() {
    try {
        const data = Object.fromEntries(users)
        fsSync.writeFileSync(USERS_JSON, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('[Storage] Error saving users:', e)
    }
}

function saveBuilds() {
    try {
        const data = Object.fromEntries(builds)
        fsSync.writeFileSync(BUILDS_JSON, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('[Storage] Error saving builds:', e)
    }
}

function saveNotifications() {
    try {
        const data = Object.fromEntries(notifications)
        fsSync.writeFileSync(NOTIFS_JSON, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('[Storage] Error saving notifications:', e)
    }
}

function saveDevices() {
    try {
        const data = Object.fromEntries(devices)
        fsSync.writeFileSync(DEVICES_JSON, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('[Storage] Error saving devices:', e)
    }
}

function saveProcessedBubble() {
    try {
        fsSync.writeFileSync(PROCESSED_BUBBLE_JSON, JSON.stringify(Array.from(processedBubbleNotifs)))
    } catch (e) {
        console.error('[Storage] Error saving processed Bubble records:', e)
    }
}

loadBuilds()

const app = express()

// Middlewares
app.use(cors({
    origin: function (origin, callback) {
        callback(null, true) // Allow all origins explicitly for credentials
    },
    credentials: true
}))
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '50mb' }))

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Auth Middleware ─────────────────────────────────
const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Auth header missing' })
    const token = authHeader.split(' ')[1]
    if (!token || !sessions.has(token)) return res.status(401).json({ error: 'Invalid or expired token' })
    const userId = sessions.get(token)
    const user = users.get(userId as string)
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = user
    next()
}

// ─── Site Analysis (server-side to avoid CORS) ───────
app.get('/api/analyze', async (req, res) => {
    const targetUrl = req.query.url as string
    if (!targetUrl) return res.status(400).json({ error: 'url parameter required' })

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Site2App/1.0)',
                'Accept': 'text/html',
            },
        })
        clearTimeout(timeout)

        const html = await response.text()
        const colors: string[] = []

        // Extract meta theme-color
        const themeMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([#][0-9a-fA-F]{3,8})["'][^>]*name=["']theme-color["']/i)
        if (themeMatch?.[1]) colors.push(themeMatch[1])

        // Extract msapplication-TileColor
        const tileMatch = html.match(/<meta[^>]*name=["']msapplication-TileColor["'][^>]*content=["']([^"']+)["']/i)
        if (tileMatch?.[1]) colors.push(tileMatch[1])

        // Extract CSS hex colors from HTML
        const hexRegex = /#([0-9a-fA-F]{6})\b/g
        const allHex = new Set<string>()
        let m
        while ((m = hexRegex.exec(html)) !== null) {
            const hex = '#' + (m[1] || '').toLowerCase()
            if (!['#000000', '#ffffff', '#333333', '#666666', '#999999', '#cccccc', '#f5f5f5', '#eeeeee', '#e5e5e5', '#f8f9fa', '#212529'].includes(hex)) {
                allHex.add(hex)
            }
        }
        for (const c of allHex) {
            if (colors.length >= 6) break
            if (!colors.includes(c)) colors.push(c)
        }

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        const title = titleMatch?.[1]?.trim() || ''

        // Extract favicon
        const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i)
        let favicon = ''
        if (faviconMatch?.[1]) {
            try {
                favicon = new URL(faviconMatch[1], targetUrl).href
            } catch {
                favicon = faviconMatch[1]
            }
        }
        if (!favicon) {
            try {
                const domain = new URL(targetUrl).hostname
                favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
            } catch { /* */ }
        }

        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
        const description = descMatch?.[1]?.trim() || ''

        console.log(`[API] Analyzed ${targetUrl}: ${colors.length} colors found, title: "${title}"`)
        res.json({ colors, title, favicon, description })
    } catch (err: any) {
        console.error(`[API] Analysis failed for ${targetUrl}:`, err.message)
        res.json({ colors: [], title: '', favicon: '', description: '', error: err.message })
    }
})

// ─── Build Request ─────────────────────────────────
app.post('/api/build', authMiddleware, (req: any, res) => {
    const {
        appName,
        url,
        platform,
        packageName,
        statusBarColor,
        themeColor,
        splashBgColor,
        enableFullscreen,
        primaryColor,
        secondaryColor,
        orientation,
        features,
        icon,
        splashImage
    } = req.body

    const buildId = Date.now().toString()

    const buildData: BuildInfo = {
        id: buildId,
        appName: appName || 'My App',
        url: url || 'https://google.com',
        platform: platform || 'android',
        packageName: packageName || `com.site2app.${(appName || 'myapp').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        status: 'building',
        startedAt: new Date().toISOString(),
        userId: req.user.id,
        config: {
            statusBarColor, themeColor, splashBgColor, enableFullscreen, primaryColor, secondaryColor,
            orientation, features
        }
    }

    const userAppBuilds = Array.from(builds.values()).filter(b => b.packageName === buildData.packageName && b.userId === req.user.id);
    buildData.versionCode = userAppBuilds.length + 1;
    buildData.versionName = `1.${buildData.versionCode}`;

    builds.set(buildId, buildData)
    saveBuilds()

    console.log(`\n[API] ═══════════════════════════════════════`)
    console.log(`[API] New build request: ${buildData.appName} (ID: ${buildId})`)
    console.log(`[API] URL: ${buildData.url}`)
    console.log(`[API] Platform: ${buildData.platform}`)
    console.log(`[API] Orientation: ${orientation || 'portrait'}`)
    console.log(`[API] Features: ${features ? Object.entries(features).filter(([, v]) => v).map(([k]) => k).join(', ') : 'default'}`)
    console.log(`[API] ═══════════════════════════════════════\n`)

    let rawHost = req.get('host') || 'localhost:4000';
    if (rawHost.includes('localhost') || rawHost.startsWith('127.')) {
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name] || []) {
                if (net.family === 'IPv4' && !net.internal) {
                    rawHost = net.address + (rawHost.includes(':') ? ':' + rawHost.split(':')[1] : ':4000');
                    break;
                }
            }
        }
    }

    console.log(`[API] ⚙️ Configuration du builder pour ${buildData.appName} :`)
    console.log(`[API]   - Push Feature: ${!!features?.pushNotifications}`)
    console.log(`[API]   - Google Services JSON: ${req.user?.googleServicesJson ? 'Trouvé' : 'MANQUANT'}`)

    const builderOptions = {
        buildId: buildId,
        apiUrl: req.protocol + '://' + rawHost,
        statusBarColor: statusBarColor || primaryColor || '#3461f5',
        themeColor: themeColor || primaryColor || '#3461f5',
        splashBgColor: splashBgColor || primaryColor || '#3461f5',
        enableFullscreen: !!enableFullscreen,
        platform: buildData.platform,
        orientation: orientation || 'portrait',
        features: features || {},
        iconBase64: icon || null,
        splashImageBase64: splashImage || null,
        versionCode: buildData.versionCode,
        versionName: buildData.versionName,
        googleServicesJson: req.user?.googleServicesJson || null,
    };

    buildData.builderConfig = {
        appUrl: buildData.url,
        appName: buildData.appName,
        packageName: buildData.packageName,
        options: builderOptions
    };
    builds.set(buildId, buildData);
    saveBuilds();

    if (process.env.GITHUB_PAT && process.env.GITHUB_REPO) {
        console.log(`[API] 🚀 Triggering GitHub Action for build ${buildId}...`);
        fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/dispatches`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${process.env.GITHUB_PAT}`,
                'User-Agent': 'Site2App-Backend'
            },
            body: JSON.stringify({
                event_type: 'build_apk',
                client_payload: {
                    buildId: buildId,
                    apiUrl: req.protocol + '://' + rawHost
                }
            })
        }).then(res => {
            if (!res.ok) console.error('[API] ❌ Failed to trigger GitHub Action:', res.status, res.statusText);
            else console.log(`[API] ✅ GitHub Action triggered successfully.`);
        }).catch(err => {
            console.error('[API] ❌ Error triggering GitHub Action:', err);
        });
        
        return res.json({ buildId, status: 'building' });
    }

    const builder = new Builder(buildData.url, buildData.appName, buildData.packageName, builderOptions);

    builder.buildApk()
        .then((result: any) => {
            const build = builds.get(buildId)
            if (build) {
                build.status = 'completed'
                build.completedAt = new Date().toISOString()
                build.fileName = result.fileName
                build.size = result.size
                saveBuilds()
            }
            console.log(`[API] ✅ Build ${buildId} completed: ${result.fileName} (${result.size} bytes)`)
        })
        .catch((err: any) => {
            console.error(`[API] ❌ Build ${buildId} failed:`, err)
            const build = builds.get(buildId)
            if (build) {
                build.status = 'failed'
                build.error = err.message
                saveBuilds()
            }
        })

    res.json({ buildId, status: 'building' })
})

// ─── Internal Webhooks for CI (GitHub Actions) ─────────
const internalAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const secret = process.env.BUILDER_SECRET || 'dev_secret_123';
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized CI' });
    }
    next();
};

app.get('/api/internal/build/:buildId/config', internalAuth, (req, res) => {
    const build = builds.get(req.params.buildId);
    if (!build || !build.builderConfig) return res.status(404).json({ error: 'Config not found' });
    res.json(build.builderConfig);
});

app.post('/api/internal/build/:buildId/upload', internalAuth, express.raw({ type: '*/*', limit: '100mb' }), async (req: any, res) => {
    const buildId = req.params.buildId;
    const build = builds.get(buildId);
    if (!build) return res.status(404).json({ error: 'Build not found' });

    try {
        const buildDir = path.join(STORAGE_PATH, 'builds', buildId);
        if (!fsSync.existsSync(buildDir)) fsSync.mkdirSync(buildDir, { recursive: true });
        
        const fileName = req.headers['x-file-name'] || `${build.packageName}.apk`;
        const filePath = path.join(buildDir, fileName);
        
        await fs.writeFile(filePath, req.body);
        
        build.status = 'completed';
        build.completedAt = new Date().toISOString();
        build.fileName = fileName;
        build.size = req.body.length;
        delete build.builderConfig; // Cleanup config to save space
        saveBuilds();
        
        console.log(`[CI] ✅ Build ${buildId} apk received successfully (${req.body.length} bytes)`);
        res.json({ success: true });
    } catch (e: any) {
        console.error(`[CI] ❌ Failed to save uploaded APK:`, e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/internal/build/:buildId/fail', internalAuth, (req, res) => {
    const buildId = req.params.buildId;
    const build = builds.get(buildId);
    if (build) {
        build.status = 'failed';
        build.error = req.body.error || 'CI Build Failed';
        delete build.builderConfig;
        saveBuilds();
        console.log(`[CI] ❌ Build ${buildId} failed in CI:`, build.error);
    }
    res.json({ success: true });
});

// ─── Build Status & List ───────────────────────────
app.get('/api/build/:buildId/status', authMiddleware, (req: any, res) => {
    const build = builds.get(req.params.buildId)
    if (!build || build.userId !== req.user.id) return res.status(404).json({ error: 'Build not found' })
    res.json(build)
})

app.delete('/api/build/:buildId', authMiddleware, async (req: any, res) => {
    const buildId = req.params.buildId;
    const targetBuild = builds.get(buildId);

    if (!targetBuild || targetBuild.userId !== req.user.id) {
        return res.status(404).json({ error: 'Build not found' });
    }

    const packageToDelete = targetBuild.packageName || targetBuild.id;

    // Delete all builds associated with this package sequentially
    const buildsToDelete = Array.from(builds.values()).filter(b =>
        (b.packageName === packageToDelete) && (b.userId === req.user.id)
    );

    for (const b of buildsToDelete) {
        builds.delete(b.id);
        const buildDir = path.join(__dirname, '../storage/builds', b.id);
        try {
            await fs.rm(buildDir, { recursive: true, force: true });
        } catch (e: any) {
            // ignore
        }
    }

    saveBuilds();
    res.json({ success: true, deletedCount: buildsToDelete.length });
})

// ─── List Builds ─────────────────────────────────────
app.get('/api/builds', authMiddleware, (req: any, res) => {
    // Return all builds if no user id present yet (migration) or belonging to user
    const allBuilds = Array.from(builds.values()).filter(b => !b.userId || b.userId === req.user.id).sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )

    // Group builds by package name so the dashboard only shows the *latest* version of each app
    const groupedBuilds = new Map<string, BuildInfo>()
    for (const build of allBuilds) {
        const key = build.packageName || build.id
        if (!groupedBuilds.has(key)) {
            groupedBuilds.set(key, build)
        }
    }

    res.json(Array.from(groupedBuilds.values()))
})

// ─── Push Notifications ──────────────────────────────
app.get('/api/notifications', authMiddleware, (req: any, res) => {
    const allNotifs = Array.from(notifications.values())
        .filter(n => !n.userId || n.userId === req.user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    res.json(allNotifs)
})

app.delete('/api/notifications', authMiddleware, (req: any, res) => {
    const notifsToDelete = Array.from(notifications.values()).filter(n => n.userId === req.user.id);
    for (const n of notifsToDelete) {
        notifications.delete(n.id);
    }
    saveNotifications();
    res.json({ success: true, message: 'All notifications cleared' });
})

app.delete('/api/notifications/:id', authMiddleware, (req: any, res) => {
    const id = req.params.id;
    const notif = notifications.get(id);
    if (!notif || notif.userId !== req.user.id) {
        return res.status(404).json({ error: 'Notification not found' });
    }
    notifications.delete(id);
    saveNotifications();
    res.json({ success: true, message: 'Notification deleted' });
})

app.get('/api/notifications/latest', (req: any, res) => {
    const { appId } = req.query;

    // Safety check - we isolate only push payloads belonging to that specific Application explicitly or 'all' broadcasts for that User
    const allNotifs = Array.from(notifications.values())
        .filter(n => {
            // Basic matching if appId provided
            if (!appId) return true;
            return n.targetApp === 'all' || n.targetApp === appId;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const result = allNotifs.length > 0 ? allNotifs[0] : null;

    // Optional: Real delivery tracker
    if (result && result.targetApp !== 'all') {
        // Marking delivery increment on ping
        // result.stats.delivered += 1
        // saveNotifications()
    }

    res.json(result)
})

// ─── Device Registration ─────────────────────────────
app.post('/api/devices/register', (req: any, res) => {
    const { deviceId, buildId, os } = req.body;
    console.log(`[API] Device registration attempt: deviceId=${deviceId}, buildId=${buildId}, os=${os}`);
    if (!deviceId || !buildId) return res.status(400).json({ error: 'Missing deviceId or buildId' });

    if (!devices.has(deviceId) || devices.get(deviceId).os !== (os || 'android')) {
        devices.set(deviceId, { id: deviceId, buildId, os: os || 'android', createdAt: new Date().toISOString() });
        saveDevices();

        // Update activeUsers shortcut for the dashboard
        const count = Array.from(devices.values()).filter(d => d.buildId === buildId).length;
        const build = builds.get(buildId);
        if (build) {
            build.activeUsers = count;
            saveBuilds();
        }
    }
    res.json({ success: true });
})

app.get('/api/devices', authMiddleware, (req: any, res) => {
    const userBuilds = Array.from(builds.values())
        .filter((b: any) => !b.userId || b.userId === req.user.id)
        .map(b => b.id);

    const allDevices = Array.from(devices.values())
        .filter(d => userBuilds.includes(d.buildId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(allDevices);
})

app.post('/api/notifications/send', authMiddleware, async (req: any, res) => {
    const { title, body, buildId, target, image, actionUrl, scheduledAt } = req.body

    console.log(`[SEND] Requête reçue: title=${title}, buildId=${buildId}, target=${JSON.stringify(target)}, image=${image}, actionUrl=${actionUrl}`);
    console.log(`[SEND] User has firebaseKey: ${!!req.user?.firebaseKey}, target is Array: ${Array.isArray(target)}`);

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' })
    }

    const notif = {
        id: Date.now().toString(),
        title,
        body,
        image: image || null,
        targetUrl: actionUrl || null,
        targetApp: buildId || 'all',
        targetOs: target || 'all',
        userId: req.user.id,
        createdAt: new Date().toISOString(),
        status: scheduledAt ? 'scheduled' : 'sent',
        scheduledAt: scheduledAt || null,
        sentAt: scheduledAt ? null : new Date().toISOString(),
        stats: scheduledAt ? null : {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            deliveryRate: 0,
            openRate: 0,
            clickRate: 0
        }
    }

    // The Android native app (via PushJobService) and the Javascript bridge
    // will continuously poll /api/notifications/latest locally to retrieve this.
    // ADDITIONALLY, we will trigger Firebase Native Push if configured!
    const userBuilds = Array.from(builds.values()).filter((b: any) => b.userId === req.user.id)
    const mockActiveUsers = userBuilds.reduce((sum, b: any) => sum + (b.activeUsers || 0), 0) || 1;

    if (!scheduledAt) {
        let sentCount = target === 'all' ? mockActiveUsers : 1;

        // --- FIREBASE FCM BROADCAST ---
        if (req.user?.firebaseKey) {
            try {
                const parsedKey = typeof req.user.firebaseKey === 'string' ? JSON.parse(req.user.firebaseKey) : req.user.firebaseKey;
                const appName = `app_${req.user.id.replace(/[^a-zA-Z0-9]/g, '')}`;
                let userApp;

                if (!admin.apps.some((a: any) => a?.name === appName)) {
                    userApp = admin.initializeApp({
                        credential: admin.credential.cert(parsedKey)
                    }, appName);
                } else {
                    userApp = admin.app(appName);
                }

                // Payload notification (Android l'affiche auto en arrière-plan)
                const notificationPayload: any = { title, body };
                if (image) notificationPayload.imageUrl = image;

                // Payload data (pour onMessageReceived quand app en premier plan)
                const dataPayload: any = { title, body };
                if (image) dataPayload.image = image;
                if (actionUrl) dataPayload.actionUrl = actionUrl;

                // Construire la liste de tokens réels à cibler
                let tokensToSend: string[] = [];

                if (Array.isArray(target) && target.length > 0) {
                    // Mode "appareils spécifiques" — les tokens sont directement dans target
                    tokensToSend = target;
                } else {
                    // Mode "tous les appareils" — récupérer tous les tokens enregistrés
                    const allDevices = Array.from(devices.values()) as any[];
                    // Filtrer par buildId si spécifié, sinon prendre tous
                    const filteredDevices = buildId && buildId !== 'all'
                        ? allDevices.filter((d: any) => d.buildId === buildId)
                        : allDevices;
                    tokensToSend = filteredDevices
                        .map((d: any) => d.id)
                        .filter((id: string) => id && !id.startsWith('android-') && id !== 'test_token'); // Exclure les anciens IDs non-FCM
                }

                console.log(`[FIREBASE] Envoi à ${tokensToSend.length} token(s) réel(s)`);

                if (tokensToSend.length === 0) {
                    notif.stats!.sent = 0;
                    notif.stats!.delivered = 0;
                    notif.stats!.deliveryRate = 0;
                } else {
                    const response = await userApp.messaging().sendEachForMulticast({
                        notification: notificationPayload,
                        data: dataPayload,
                        android: { priority: 'high' as const },
                        tokens: tokensToSend
                    });

                    console.log(`[Firebase] Résultat: Succès=${response.successCount}, Échecs=${response.failureCount}`);
                    if (response.failureCount > 0) {
                        response.responses.forEach((resp: any, idx: number) => {
                            if (!resp.success) console.error(`[Firebase] Token[${idx}] erreur:`, resp.error?.code);
                        });
                    }

                    // Stats RÉELLES basées sur la réponse Firebase
                    notif.stats!.sent = tokensToSend.length;
                    notif.stats!.delivered = response.successCount;
                    notif.stats!.deliveryRate = tokensToSend.length > 0 ? Math.round((response.successCount / tokensToSend.length) * 100) : 0;

                    if (response.successCount === 0 && tokensToSend.length > 0) {
                        return res.status(500).json({ error: `Firebase a refusé ${response.failureCount} token(s). Vérifiez que les appareils sont actifs.` });
                    }
                }
            } catch (err: any) {
                console.error('[Firebase] Erreur:', err.message);
                return res.status(500).json({ error: "Erreur Firebase : " + err.message });
            }
        } else {
            notif.stats!.sent = 0;
            notif.stats!.delivered = 0;
            notif.stats!.deliveryRate = 0;
            console.log(`[Push] Aucune clé Firebase configurée. Notification ${notif.id} enregistrée localement uniquement.`)
        }
    }

    notifications.set(notif.id, notif)
    saveNotifications()

    res.json(notif)
})

// ─── Analytics API (données réelles) ────────────────────────────────────
app.get('/api/analytics', authMiddleware, async (req: any, res) => {
    const userId = req.user.id
    const periodDays = parseInt(req.query.period as string) || 30

    const now = new Date()
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    // Récupérer les données réelles de l'utilisateur
    const userNotifs = Array.from(notifications.values()).filter((n: any) => n.userId === userId) as any[]
    const userDevices = Array.from(devices.values()) as any[]
    const userBuilds = Array.from(builds.values()).filter((b: any) => b.userId === userId) as any[]

    // Filtrer les appareils liés aux builds de l'utilisateur
    const userBuildIds = userBuilds.map((b: any) => b.id)
    const linkedDevices = userDevices.filter((d: any) => userBuildIds.includes(d.buildId))

    // Notifications dans la période
    const periodNotifs = userNotifs.filter(n => new Date(n.createdAt) >= periodStart)

    // Stats globales
    const totalSent = periodNotifs.reduce((sum, n) => sum + (n.stats?.sent || 0), 0)
    const totalDelivered = periodNotifs.reduce((sum, n) => sum + (n.stats?.delivered || 0), 0)
    const avgDeliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0

    // Historique d'envoi par jour (graphique)
    const dailySendData: Record<string, { sent: number, delivered: number }> = {}
    for (let i = 0; i < periodDays; i++) {
        const day = new Date(now.getTime() - (periodDays - 1 - i) * 24 * 60 * 60 * 1000)
        const key = day.toISOString().split('T')[0] as string
        dailySendData[key] = { sent: 0, delivered: 0 }
    }
    periodNotifs.forEach(n => {
        const key = new Date(n.createdAt).toISOString().split('T')[0] as string
        if (dailySendData[key]) {
            dailySendData[key]!.sent += n.stats?.sent || 0
            dailySendData[key]!.delivered += n.stats?.delivered || 0
        }
    })

    const sendTimeline = Object.entries(dailySendData).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        sent: data.sent,
        delivered: data.delivered
    }))

    // Appareil inscrits par jour
    const deviceTimeline = Object.keys(dailySendData).map(dateKey => {
        const dayDevices = linkedDevices.filter((d: any) => {
            const regDate = d.createdAt ? (new Date(d.createdAt).toISOString().split('T')[0] as string) : ''
            return regDate && regDate <= dateKey
        })
        return {
            date: new Date(dateKey).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            devices: dayDevices.length
        }
    })

    // Répartition par OS
    const osCounts: Record<string, number> = {}
    linkedDevices.forEach((d: any) => {
        const os = (d.os || 'android').toLowerCase()
        osCounts[os] = (osCounts[os] || 0) + 1
    })
    const totalDeviceCount = linkedDevices.length || 1
    const platformData = Object.entries(osCounts).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round((count / totalDeviceCount) * 100),
        count,
        color: name === 'android' ? '#3461f5' : name === 'ios' ? '#7c3aed' : '#f59e0b'
    }))
    if (platformData.length === 0) {
        platformData.push({ name: 'Android', value: 100, count: 0, color: '#3461f5' })
    }

    // Stats par application
    const appStats = userBuilds.map((build: any) => {
        const appDevices = linkedDevices.filter((d: any) => d.buildId === build.id)
        const appNotifs = periodNotifs.filter(n => n.targetApp === build.id)
        const appSent = appNotifs.reduce((sum, n) => sum + (n.stats?.sent || 0), 0)
        const appDelivered = appNotifs.reduce((sum, n) => sum + (n.stats?.delivered || 0), 0)
        return {
            id: build.id,
            name: build.name,
            devices: appDevices.length,
            notificationsSent: appSent,
            deliveryRate: appSent > 0 ? Math.round((appDelivered / appSent) * 100) : 0,
            lastBuild: build.createdAt
        }
    })

    // Top notifications (les plus récentes avec stats)
    const topNotifications = periodNotifs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(n => ({
            id: n.id,
            title: n.title,
            body: n.body,
            sent: n.stats?.sent || 0,
            delivered: n.stats?.delivered || 0,
            deliveryRate: n.stats?.deliveryRate || 0,
            sentAt: n.sentAt
        }))

    // Devices inscrits récemment
    const recentDevices = linkedDevices
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((d: any) => ({
            id: d.id.substring(0, 20) + '...',
            fullId: d.id,
            os: d.os || 'android',
            buildId: d.buildId,
            buildName: userBuilds.find((b: any) => b.id === d.buildId)?.name || 'App',
            registeredAt: d.createdAt
        }))

    res.json({
        summary: {
            totalNotifications: periodNotifs.length,
            totalSent,
            totalDelivered,
            avgDeliveryRate,
            totalDevices: linkedDevices.length,
            totalApps: userBuilds.length,
        },
        sendTimeline,
        deviceTimeline,
        platformData,
        appStats,
        topNotifications,
        recentDevices,
        period: periodDays
    })
})

// ─── Download APK ────────────────────────────────────
app.get('/api/download/:buildId', async (req, res) => {
    const { buildId } = req.params;
    const build = builds.get(buildId);

    // Fonction utilitaire pour envoyer le fichier avec les bons headers
    const sendApk = (filePath: string, fileName: string) => {
        const encodedFilename = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');

        // C'est vital d'utiliser octet-stream pour forcer le téléchargement si package-archive fait défaut sur certains browsers
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('X-Content-Type-Options', 'nosniff');

        return res.sendFile(filePath);
    };

    // First: try the tracked build filename from in-memory map (most reliable)
    const buildDir = path.join(__dirname, '../storage/builds', buildId);
    if (build && build.fileName && build.status === 'completed') {
        const expectedPath = path.join(buildDir, build.fileName);
        if (existsSync(expectedPath)) {
            console.log(`[API] 📥 Download tracked: ${build.fileName}`);
            return sendApk(expectedPath, build.fileName);
        }
    }

    // Second: search in storage/builds/{buildId}/ directory for signed APK
    // Exclude intermediate build artifacts that are NOT the final signed APK
    const intermediateNames = ['app-aligned.apk', 'app-release-unsigned.apk'];
    try {
        const files = await fs.readdir(buildDir);
        const apkFile = files.find(f => f.endsWith('.apk') && !intermediateNames.includes(f));

        if (apkFile) {
            const filePath = path.join(buildDir, apkFile);
            console.log(`[API] 📥 Download from disk: ${apkFile}`);
            return sendApk(filePath, apkFile);
        }
    } catch (err: any) {
        // Directory doesn't exist
        console.error(`[API] Build directory not found: ${buildDir}`);
    }

    // No APK found — return clear error (no dummy fallback!)
    res.status(404).json({ error: 'APK not found. Build may still be in progress or failed.' });
})

// ─── Download Latest ─────────────────────────────────
app.get('/api/download-latest', async (req, res) => {
    // Find the most recent completed build
    const completedBuilds = Array.from(builds.values())
        .filter(b => b.status === 'completed' && b.fileName)
        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())

    if (completedBuilds.length > 0) {
        const latest = completedBuilds[0]
        if (latest && latest.fileName) {
            const latestApkPath = path.join(__dirname, '../storage/builds', latest.id, latest.fileName);
            if (fsSync.existsSync(latestApkPath)) {
                console.log(`[API] 📥 Downloading latest: ${latest.fileName} `)
                res.setHeader('Content-Type', 'application/vnd.android.package-archive')
                res.setHeader('Content-Disposition', `attachment; filename = "${latest.fileName}"`)
                return res.download(latestApkPath, latest.fileName)
            }
        }
    }

    // Fallback: scan storage directory for most recent build
    const buildsDir = path.join(__dirname, '../storage/builds')
    try {
        const dirs = await fs.readdir(buildsDir)
        const numericDirs = dirs.filter(d => /^\d+$/.test(d)).sort((a, b) => Number(b) - Number(a))

        for (const dir of numericDirs) {
            const files = await fs.readdir(path.join(buildsDir, dir))
            const apkFile = files.find(f => f.endsWith('.apk'))
            if (apkFile) {
                const filePath = path.join(buildsDir, dir, apkFile)
                console.log(`[API] 📥 Downloading from storage: ${apkFile} `)
                res.setHeader('Content-Type', 'application/vnd.android.package-archive')
                res.setHeader('Content-Disposition', `attachment; filename = "${apkFile}"`)
                return res.download(filePath, apkFile)
            }
        }
    } catch (err) {
        console.error('[API] Error scanning builds:', err)
    }

    res.status(404).json({ error: 'No completed builds found' })
})

// ─── App Updates (Called from Android device) ────────
app.get('/api/apps/check-update', (req: any, res) => {
    const pkg = req.query.package as string;
    const currentVersionCode = parseInt(req.query.versionCode as string) || 1;

    if (!pkg) {
        return res.status(400).json({ error: 'Missing package parameter' });
    }

    const completedBuilds = Array.from(builds.values())
        .filter(b => b.packageName === pkg && b.status === 'completed' && b.fileName)
        .sort((a, b) => (b.versionCode || 1) - (a.versionCode || 1));

    if (completedBuilds.length > 0) {
        const latest = completedBuilds[0];
        if (latest) {
            const latestVersionCode = latest.versionCode || 1;

            if (latestVersionCode > currentVersionCode) {
                const downloadUrl = `${req.protocol}://${req.get('host')}/api/download/${latest.id}`;
                return res.json({
                    updateAvailable: true,
                    versionCode: latestVersionCode,
                    versionName: latest.versionName || `1.${latestVersionCode}`,
                    downloadUrl: downloadUrl
                });
            }
        }
    }

    res.json({ updateAvailable: false });
});

// ─── App Statistics ─────────────────────────────────
app.get('/api/stats', authMiddleware, (req: any, res) => {
    const allBuilds = Array.from(builds.values()).filter(b => !b.userId || b.userId === req.user.id)
    const totalApps = new Set(allBuilds.map(b => b.packageName)).size
    const totalDownloads = allBuilds.reduce((sum, b) => sum + (b.status === 'completed' ? 1 : 0), 0) // Simulé
    const totalBuilds = allBuilds.length
    const pendingBuilds = allBuilds.filter(b => b.status === 'building').length

    res.json({
        totalApps,
        totalDownloads: totalDownloads,
        activeUsers: totalDownloads, // In reality, you'd track this via analytics
        totalBuilds,
        pendingBuilds,
        storageUsed: allBuilds.reduce((sum, b) => sum + (b.size || 0), 0),
        storageLimit: 1024 * 1024 * 1024,
    })
})

// ─── Auth routes ─────────────────────────
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body

    // Check credentials natively
    const allUsers = Array.from(users.values())
    const user = allUsers.find(u => u.email === email && u.password === password) // NOTE: Plain text pass for MVP demo purposes only

    if (!user) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const token = uuidv4()
    sessions.set(token, user.id)

    // Exclude password from response
    const { password: _, ...userSafe } = user

    res.json({
        user: userSafe,
        token: token
    })
})

app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body

    if (Array.from(users.values()).some(u => u.email === email)) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    }

    const newUser = {
        id: `user_${uuidv4()}`,
        email: email,
        password: password, // For live demo/MVP
        name: name,
        plan: 'free',
        role: 'user',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        appsCount: 0,
        downloadsCount: 0,
    }

    users.set(newUser.id, newUser)
    saveUsers()

    // Login immediately
    const token = uuidv4()
    sessions.set(token, newUser.id)

    const { password: _, ...userSafe } = newUser

    res.json({
        user: userSafe,
        token: token
    })
})

app.get('/api/auth/me', authMiddleware, (req: any, res) => {
    const user = { ...req.user }
    delete user.password // safety
    res.json(user)
})

app.post('/api/auth/firebase-config', authMiddleware, (req: any, res) => {
    const { adminSdkJson, googleServicesJson, bubbleApiUrl } = req.body
    const user = users.get(req.user.id)
    if (user) {
        if (adminSdkJson !== undefined) user.firebaseKey = adminSdkJson
        if (googleServicesJson !== undefined) user.googleServicesJson = googleServicesJson
        if (bubbleApiUrl !== undefined) user.bubbleApiUrl = bubbleApiUrl
        saveUsers()
    }
    res.json({ success: true, user })
})

app.delete('/api/user', authMiddleware, (req: any, res) => {
    const userId = req.user.id;

    // Revoke all sessions for this user
    for (const [token, sid] of Array.from(sessions.entries())) {
        if (sid === userId) sessions.delete(token);
    }

    // Clean up builds matching user
    for (const [bid, build] of Array.from(builds.entries())) {
        if (build.userId === userId) {
            builds.delete(bid);
            // Note: file system cleanup could go here
        }
    }

    // Delete the user record
    users.delete(userId);
    saveUsers();
    saveBuilds();

    res.json({ success: true, message: 'Account deleted' });
})

// ─── Polling Service (Bubble.io / External Webhooks via Pull) ──────
const POLLING_INTERVAL_MS = 15000; // 15 seconds

async function pollExternalNotifications() {
    const allUsers = Array.from(users.values());
    for (const user of allUsers) {
        if (!user.bubbleApiUrl) continue;

        try {
            // Demander les notifications "en attente" à Bubble
            const response = await fetch(user.bubbleApiUrl, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) continue;

            const data = await response.json();
            // Data API Bubble returns { response: { results: [...] } }
            const pendingNotifs = data?.response?.results || data?.results || (Array.isArray(data) ? data : []);

            if (!Array.isArray(pendingNotifs) || pendingNotifs.length === 0) continue;

            console.log(`[Polling] ${pendingNotifs.length} pending notifications found for user ${user.email} at ${user.bubbleApiUrl}`);

            for (const notif of pendingNotifs) {
                // Ignore si déjà envoyé côté Bubble OU DÉJÀ envoyé par nous (sécurité locale très stricte)
                if (!notif._id || !notif.title || notif.status === 'Sent' || processedBubbleNotifs.has(notif._id)) continue;

                // Préparer le payload interne
                const reqBody = {
                    title: notif.title,
                    body: notif.body,
                    buildId: notif.buildId || 'all',
                    target: notif.targetToken ? [decodeURIComponent(notif.targetToken)] : 'all',
                    image: notif.image || null,
                    actionUrl: notif.actionUrl || null,
                };

                // Simuler une requête interne Firebase (réutilisation route /send)
                // En appelant directement notre contrôleur (simulation sans repasser par le réseau)
                try {
                    console.log(`[Polling] Sending: "${notif.title}" to ${reqBody.target}`);

                    // Appel HTTP interne pour profiter de la même logique `/send` existante
                    const port = process.env.PORT || 4000;
                    // Récupération token user
                    let userToken = '';
                    for (const [token, uid] of Array.from(sessions.entries())) {
                        if (uid === user.id) { userToken = token; break; }
                    }

                    if (userToken) {
                        const sendRes = await fetch(`http://127.0.0.1:${port}/api/notifications/send`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${userToken}`
                            },
                            body: JSON.stringify(reqBody)
                        });

                        // Si envoi réussi, mémoriser localement l'ID quoiqu'il arrive pour ne jamais le renvoyer.
                        if (sendRes.ok) {
                            processedBubbleNotifs.add(notif._id);
                            saveProcessedBubble();

                            // Tenter de l'acquitter aussi sur Bubble (mais sans bloquer si Bubble refuse par sécurité/règles)
                            try {
                                await fetch(`${user.bubbleApiUrl}/${notif._id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'Sent' })
                                });
                                console.log(`[Polling] Notification ${notif._id} marked as Sent on Bubble.`);
                            } catch (errBubble) {
                                console.log(`[Polling] Local deduplication protected us (Bubble PATCH failed).`);
                            }
                        }
                    }
                } catch (e: any) {
                    console.error(`[Polling] Failed to send notif ${notif._id}:`, e.message);
                }
            }
        } catch (err: any) {
            console.error(`[Polling] Erreur récupération Bubble API pour user ${user.id}:`, err.message);
        }
    }
}

// Start polling daemon in background
setInterval(() => pollExternalNotifications().catch(console.error), POLLING_INTERVAL_MS);

// ─── Start Server ────────────────────────────────────
const PORT = parseInt(process.env.PORT as string) || 4000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Site2App Backend running on port ${PORT} (0.0.0.0)`)
    console.log(`📦 Build storage: ${path.join(__dirname, '../storage/builds')}`)
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`)
})
