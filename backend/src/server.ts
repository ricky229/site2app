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
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
// @ts-ignore
import Builder from './services/Builder.js'
import { bubble } from './services/BubbleService.js'

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
app.get('/node/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Auth Middleware ─────────────────────────────────
const authMiddleware = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Auth header missing' })
    const token = authHeader.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Invalid or expired token' })
    try {
        const secret = process.env.JWT_SECRET || 'site2app_super_secret';
        const decoded = jwt.verify(token, secret) as any;
        const bubbleUser = await bubble.getUserById(decoded.userId);
        if (!bubbleUser) throw new Error('User not found in Bubble');
        
        const bubbleId = bubbleUser._id;
        
        // Load existing local user data (contains sensitive keys)
        const localUser = users.get(bubbleId) || {};
        
        // Merge: Bubble provides profile data, LOCAL provides sensitive config
        // LOCAL keys ALWAYS win to prevent loss of Firebase credentials
        const userSafe = { 
            id: bubbleId,
            email: bubbleUser.email || bubbleUser.emailAddress || localUser.email,
            name: bubbleUser.name || localUser.name,
            plan: bubbleUser.plan || localUser.plan || 'free',
            role: bubbleUser.role || localUser.role || 'user',
            // Sensitive keys: ALWAYS from local storage (never from Bubble)
            firebaseKey: localUser.firebaseKey || '',
            googleServicesJson: localUser.googleServicesJson || '',
            bubbleApiUrl: localUser.bubbleApiUrl || '',
        };
        
        users.set(bubbleId, userSafe);
        saveUsers();

        req.user = userSafe;
        next()
    } catch (err: any) {
        console.error('[Auth] Token invalid:', err.message);
        res.status(401).json({ error: 'Invalid or expired token' })
    }
}

// ─── Site Analysis (server-side to avoid CORS) ───────
app.get('/node/analyze', async (req, res) => {
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
app.post('/node/build', authMiddleware, (req: any, res) => {
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

app.get('/node/internal/build/:buildId/config', internalAuth, (req, res) => {
    const build = builds.get(req.params.buildId);
    if (!build || !build.builderConfig) return res.status(404).json({ error: 'Config not found' });
    res.json(build.builderConfig);
});

app.post('/node/internal/build/:buildId/upload', internalAuth, express.raw({ type: '*/*', limit: '100mb' }), async (req: any, res) => {
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

app.post('/node/internal/build/:buildId/fail', internalAuth, (req, res) => {
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
app.get('/node/build/:buildId/status', authMiddleware, (req: any, res) => {
    const build = builds.get(req.params.buildId)
    if (!build || build.userId !== req.user.id) return res.status(404).json({ error: 'Build not found' })
    res.json(build)
})

app.delete('/node/build/:buildId', authMiddleware, async (req: any, res) => {
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
app.get('/node/builds', authMiddleware, (req: any, res) => {
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
app.get('/node/notifications', authMiddleware, (req: any, res) => {
    const allNotifs = Array.from(notifications.values())
        .filter(n => !n.userId || n.userId === req.user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    res.json(allNotifs)
})

app.delete('/node/notifications', authMiddleware, (req: any, res) => {
    const notifsToDelete = Array.from(notifications.values()).filter(n => n.userId === req.user.id);
    for (const n of notifsToDelete) {
        notifications.delete(n.id);
    }
    saveNotifications();
    res.json({ success: true, message: 'All notifications cleared' });
})

app.delete('/node/notifications/:id', authMiddleware, (req: any, res) => {
    const id = req.params.id;
    const notif = notifications.get(id);
    if (!notif || notif.userId !== req.user.id) {
        return res.status(404).json({ error: 'Notification not found' });
    }
    notifications.delete(id);
    saveNotifications();
    res.json({ success: true, message: 'Notification deleted' });
})

app.get('/node/notifications/latest', (req: any, res) => {
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
app.post('/node/devices/register', async (req: any, res) => {
    const { deviceId, buildId, os } = req.body;
    console.log(`[API] Device registration: deviceId=${deviceId?.substring(0, 20)}... buildId=${buildId}`);
    if (!deviceId || !buildId) return res.status(400).json({ error: 'Missing deviceId or buildId' });

    // Find the owner of this build to get the Bubble URL
    const build = builds.get(buildId);
    const buildOwnerId = build?.userId;
    const buildOwner = buildOwnerId ? Array.from(users.values()).find((u: any) => u.id === buildOwnerId) : null;
    
    // Smart URL extraction: extract up to /api/1.1/obj
    let customBubbleUrl = '';
    if (buildOwner?.bubbleApiUrl) {
        const parts = buildOwner.bubbleApiUrl.split('/api/1.1/obj');
        if (parts.length > 0) {
            customBubbleUrl = parts[0] + '/api/1.1/obj';
        }
    }
    const customBubbleToken = process.env.BUBBLE_API_TOKEN;

    // 1. Sync to local memory
    const existingLocal = devices.get(deviceId);
    if (!existingLocal || existingLocal.buildId !== buildId) {
        devices.set(deviceId, { id: deviceId, buildId, os: os || 'android', createdAt: new Date().toISOString() });
        saveDevices();

        if (build) {
            const count = Array.from(devices.values()).filter(d => d.buildId === buildId).length;
            build.activeUsers = count;
            saveBuilds();
        }
    }

    // 2. Sync to Bubble Data API (Smart Upsert)
    try {
        await bubble.upsertDevice({
            pushToken: deviceId,
            buildId: buildId,
            os: os || 'android'
        }, customBubbleUrl, customBubbleToken);
    } catch (e: any) {
        console.error(`[API] Bubble device sync failed (${customBubbleUrl}):`, e.message);
    }

    res.json({ success: true });
})

app.get('/node/devices', authMiddleware, async (req: any, res) => {
    const userBuilds = Array.from(builds.values())
        .filter((b: any) => !b.userId || b.userId === req.user.id)
        .map(b => b.id);

    // Initial set from local storage
    const deviceMap = new Map<string, any>();
    Array.from(devices.values())
        .filter(d => userBuilds.includes(d.buildId))
        .forEach(d => deviceMap.set(d.id, d));

    // FETCH from Bubble to ensure we see everything (and handle tenancy if needed)
    try {
        let customUrl = '';
        if ((req.user as any).bubbleApiUrl) {
            const parts = (req.user as any).bubbleApiUrl.split('/api/1.1/obj');
            if (parts.length > 0) {
                customUrl = parts[0] + '/api/1.1/obj';
            }
        }
        
        console.log(`[API] Fetching devices from Bubble: ${customUrl || 'default'}`);
        const bubbleDevices = await bubble.getDevicesByApp('all', customUrl);
        
        bubbleDevices.forEach((d: any) => {
            const token = d.pushToken || d.push_token || d.id || d._id;
            const bId = d.buildId || d.build_id || 'all';
            
            // Only add if it belongs to user's builds OR if it's broad
            if (userBuilds.includes(bId) || bId === 'all') {
                deviceMap.set(token, {
                    id: token,
                    buildId: bId,
                    os: d.os || 'android',
                    createdAt: d.Created_Date || d['Created Date'] || d.createdAt || new Date().toISOString()
                });
            }
        });
        console.log(`[API] Found ${bubbleDevices.length} devices total on Bubble.`);
    } catch (e: any) {
        console.error(`[API] Failed to fetch devices from Bubble:`, e.message);
    }

    const result = Array.from(deviceMap.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(result);
})

const sendNotificationCore = async (user: any, payload: any) => {
    const { title, body, buildId, target, image, actionUrl, scheduledAt } = payload;
    
    console.log(`[CORE] Sending: title=${title}, user=${user.id}, target=${JSON.stringify(target)}`);

    const notif: any = {
        id: Date.now().toString(),
        title,
        body,
        image: image || null,
        targetUrl: actionUrl || null,
        targetApp: buildId || 'all',
        targetOs: target || 'all',
        userId: user.id,
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
    };

    let fcmError: string | null = null;

    if (!scheduledAt) {
        if (!user.firebaseKey) {
            console.warn(`[CORE] No Firebase key configured for user ${user.id}. Notification saved but NOT sent via FCM.`);
            fcmError = 'Aucune clé Firebase configurée. Allez dans Configuration Firebase pour enregistrer votre clé.';
        } else {
            try {
                const parsedKey = typeof user.firebaseKey === 'string' ? JSON.parse(user.firebaseKey) : user.firebaseKey;
                
                // Validate the key has required fields
                if (!parsedKey.project_id || !parsedKey.private_key || !parsedKey.client_email) {
                    throw new Error('Clé Firebase invalide: project_id, private_key et client_email sont requis.');
                }

                // Use project_id + user_id for stable app naming
                const safeUserId = user.id.replace(/[^a-zA-Z0-9]/g, '');
                const appName = `fcm_${safeUserId}_${parsedKey.project_id}`;
                let userApp;

                try {
                    userApp = admin.app(appName);
                } catch (e: any) {
                    // App doesn't exist yet, cleanup any old apps for this user first
                    for (const a of admin.apps) {
                        if (a?.name?.startsWith(`fcm_${safeUserId}_`) || a?.name?.startsWith(`app_${safeUserId}_`)) {
                            try { await a.delete(); } catch(delErr) {}
                        }
                    }
                    userApp = admin.initializeApp({ credential: admin.credential.cert(parsedKey) }, appName);
                    console.log(`[CORE] Firebase app initialized: ${appName}`);
                }

                const notificationPayload: any = { title, body };
                if (image) notificationPayload.imageUrl = image;

                const dataPayload: any = { title, body };
                if (image) dataPayload.image = image;
                if (actionUrl) dataPayload.actionUrl = actionUrl;

                // Resolve target tokens
                let tokensToSend: string[] = [];
                if (Array.isArray(target) && target.length > 0) {
                    console.log(`[CORE] Targeting specific tokens: ${target.length}`);
                    tokensToSend = target;
                } else {
                    console.log(`[CORE] Targeting group: buildId=${buildId}, os=${target}`);
                    // Fetch from local memory
                    const allDevicesList = Array.from(devices.values()) as any[];
                    const userBuildIds = Array.from(builds.values()).filter((b: any) => b.userId === user.id).map(b => b.id);
                    
                    let filteredLocal = buildId && buildId !== 'all'
                        ? allDevicesList.filter((d: any) => d.buildId === buildId)
                        : allDevicesList.filter((d: any) => userBuildIds.includes(d.buildId));
                    
                    if (target && target !== 'all') {
                        filteredLocal = filteredLocal.filter((d: any) => d.os === target);
                    }
                    
                    tokensToSend = filteredLocal.map((d: any) => d.id).filter((id: string) => id && id.includes(':'));
                    
                    // ALWAYS also try to fetch from Bubble for group targets to ensure we don't miss anyone
                    if (user.bubbleApiUrl) {
                        try {
                            const deviceUrl = user.bubbleApiUrl.replace('/notification_queue', '/device').replace('/notification', '/device');
                            const bubbleToken = process.env.BUBBLE_API_TOKEN || '59ef5eb57d786ff8eced03244342f32e';
                            let fetchUrl = deviceUrl;
                            if (buildId && buildId !== 'all') {
                                const constraints = JSON.stringify([{ key: 'buildId', constraint_type: 'equals', value: buildId }]);
                                fetchUrl += `?constraints=${encodeURIComponent(constraints)}`;
                            }
                            
                            const bubbleResp = await fetch(fetchUrl, {
                                headers: { 'Authorization': `Bearer ${bubbleToken}`, 'Accept': 'application/json' }
                            });
                            
                            if (bubbleResp.ok) {
                                const bubbleData = await bubbleResp.json() as any;
                                const bubbleResults = bubbleData?.response?.results || bubbleData?.results || [];
                                const bubbleTokens = bubbleResults
                                    .filter((d: any) => {
                                        if (target && target !== 'all') return d.os === target;
                                        return true;
                                    })
                                    .map((d: any) => d.pushToken || d.push_token || d.id || d._id)
                                    .filter((t: any) => typeof t === 'string' && t.includes(':'));
                                
                                // Merge and deduplicate
                                tokensToSend = Array.from(new Set([...tokensToSend, ...bubbleTokens]));
                                console.log(`[CORE] Group discovery: ${tokensToSend.length} tokens found (Local + Bubble ${fetchUrl})`);
                            }
                        } catch (err: any) { console.error(`[CORE] Bubble token fetch failed:`, err.message); }
                    }
                }

                if (tokensToSend.length > 0) {
                    const response = await userApp.messaging().sendEachForMulticast({
                        notification: notificationPayload,
                        data: dataPayload,
                        android: { priority: 'high' as const },
                        tokens: tokensToSend
                    });
                    
                    notif.stats.sent = tokensToSend.length;
                    notif.stats.delivered = response.successCount;
                    notif.stats.deliveryRate = Math.round((response.successCount / tokensToSend.length) * 100);
                    
                    console.log(`[CORE] FCM Result: ${response.successCount}/${tokensToSend.length} delivered`);

                    // Log individual failures for debugging
                    if (response.failureCount > 0) {
                        response.responses.forEach((r: any, i: number) => {
                            if (!r.success) {
                                const errorCode = r.error?.code || 'unknown';
                                console.warn(`[CORE] Token failed [${errorCode}]: ${tokensToSend[i]?.substring(0, 30)}...`);
                                
                                // Remove invalid/unregistered tokens automatically
                                if (errorCode === 'messaging/registration-token-not-registered' ||
                                    errorCode === 'messaging/invalid-registration-token') {
                                    const tokenToRemove = tokensToSend[i];
                                    if (tokenToRemove && devices.has(tokenToRemove)) {
                                        devices.delete(tokenToRemove);
                                        console.log(`[CORE] Removed stale token: ${tokenToRemove.substring(0, 30)}...`);
                                    }
                                }
                            }
                        });
                        saveDevices();
                    }
                } else {
                    console.warn(`[CORE] No valid tokens found to send notification.`);
                }
            } catch (err: any) {
                console.error('[CORE] Firebase Error:', err.message);
                fcmError = err.message;
                
                // If it's a credential error, delete the cached firebase app so it re-inits next time
                if (err.message?.includes('credential') || err.message?.includes('OAuth')) {
                    const safeUserId = user.id.replace(/[^a-zA-Z0-9]/g, '');
                    for (const a of admin.apps) {
                        if (a?.name?.startsWith(`fcm_${safeUserId}_`) || a?.name?.startsWith(`app_${safeUserId}_`)) {
                            try { await a.delete(); } catch(delErr) {}
                        }
                    }
                    console.log(`[CORE] Cleaned up Firebase apps for user ${user.id} after credential error.`);
                }
            }
        }
    }

    // Always save the notification to history
    notifications.set(notif.id, notif);
    saveNotifications();

    // Sync to Bubble (History) - don't let this block/fail the response
    try {
        await bubble.createNotification({
            title: notif.title,
            body: notif.body,
            image: notif.image,
            targetUrl: notif.targetUrl,
            targetApp: notif.targetApp,
            targetOs: typeof notif.targetOs === 'string' ? notif.targetOs : JSON.stringify(notif.targetOs),
            owner: user.id,
            status: 'Sent',
            sentCount: notif.stats?.sent || 0,
            deliveredCount: notif.stats?.delivered || 0
        });
    } catch (e: any) {
        console.error(`[CORE] Bubble History Sync Failed:`, e.message);
    }

    // If there was an FCM error, attach it to the response but don't throw
    if (fcmError) {
        notif.fcmError = fcmError;
    }

    return notif;
};

app.post('/node/notifications/send', authMiddleware, async (req: any, res) => {
    try {
        const notif = await sendNotificationCore(req.user, req.body);
        res.json(notif);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
})

// ─── Analytics API (données réelles) ────────────────────────────────────
app.get('/node/analytics', authMiddleware, async (req: any, res) => {
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
app.get('/node/download/:buildId', async (req, res) => {
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
app.get('/node/download-latest', async (req, res) => {
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
app.get('/node/apps/check-update', (req: any, res) => {
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
                const downloadUrl = `${req.protocol}://${req.get('host')}/node/download/${latest.id}`;
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
app.get('/node/stats', authMiddleware, (req: any, res) => {
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
app.post('/node/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await bubble.getUserByEmail(email);
        
        if (!user || !(await bcrypt.compare(password, user.passwordHash || ''))) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }

        const secret = process.env.JWT_SECRET || 'site2app_super_secret';
        const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '30d' });

        // Load existing local data to preserve Firebase keys
        const existingLocal = users.get(user._id) || {};

        const userSafe = {
            id: user._id,
            email: user.email || user.emailAddress,
            name: user.name,
            plan: user.plan || 'free',
            role: user.role || 'user',
            // Preserve locally-stored sensitive config 
            firebaseKey: existingLocal.firebaseKey || '',
            googleServicesJson: existingLocal.googleServicesJson || '',
            bubbleApiUrl: existingLocal.bubbleApiUrl || '',
        };

        // Sync to local storage (preserving Firebase keys)
        users.set(userSafe.id, userSafe);
        saveUsers();

        res.json({
            user: userSafe,
            token: token
        })
    } catch (err: any) {
        console.error('[Auth] Login error:', err.message);
        res.status(500).json({ error: 'Erreur système lors de la connexion' })
    }
})

app.post('/node/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body

        const existing = await bubble.getUserByEmail(email)
        if (existing) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' })
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await bubble.createUser({
            email: email,
            emailAddress: email,
            passwordHash: hash,
            name: name,
            plan: 'free',
            role: 'user',
            appsCount: 0,
            downloadsCount: 0,
        })

        const secret = process.env.JWT_SECRET || 'site2app_super_secret';
        const id = newUser._id || newUser.id;
        const token = jwt.sign({ userId: id }, secret, { expiresIn: '30d' });

        const userSafe = {
            id,
            email,
            name,
            plan: 'free',
            role: 'user',
            firebaseKey: '',
            googleServicesJson: '',
            bubbleApiUrl: '',
        };

        // Sync to local storage
        users.set(id, userSafe);
        saveUsers();

        res.json({
            user: userSafe,
            token: token
        })
    } catch (err: any) {
        console.error('[Auth] Register error:', err.message);
        res.status(500).json({ error: 'Impossible de créer le profile sur Bubble.io. Vérifiez les champs du Type User.' })
    }
})

app.get('/node/auth/me', authMiddleware, (req: any, res) => {
    const user = { ...req.user }
    delete user.passwordHash // safety
    res.json(user)
})

app.post('/node/auth/firebase-config', authMiddleware, async (req: any, res) => {
    const { adminSdkJson, googleServicesJson, bubbleApiUrl } = req.body
    
    // 1. Update LOCAL map (for immediate polling effect)
    const user = users.get(req.user.id)
    if (user) {
        if (adminSdkJson !== undefined) user.firebaseKey = adminSdkJson
        if (googleServicesJson !== undefined) user.googleServicesJson = googleServicesJson
        if (bubbleApiUrl !== undefined) user.bubbleApiUrl = bubbleApiUrl
        saveUsers()
    }

    // 2. Return success (User config is now solely in Node Backend's users.json)
    res.json({ success: true, user: users.get(req.user.id) })
})

app.delete('/node/user', authMiddleware, (req: any, res) => {
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

// Trigger polling manually from UI (GET to avoid 405)
app.get('/node/notifications/poll', authMiddleware, async (req: any, res) => {
    console.log(`[API] Manual poll requested by user ${req.user?.id}`);
    try {
        await pollExternalNotifications();
        console.log(`[API] Manual poll completed successfully`);
        res.json({ success: true, message: 'Polling cycle executed' });
    } catch (err: any) {
        console.error(`[API] Manual poll failed:`, err.message);
        res.status(500).json({ error: err.message });
    }
})

// ─── Polling Service (Bubble.io / External Webhooks via Pull) ──────
const POLLING_INTERVAL_MS = 15000; // 15 seconds

async function pollExternalNotifications() {
    const allUsers = Array.from(users.values());
    if (allUsers.length === 0) {
        // Log locally if no users are in memory yet
        return;
    }

    console.log(`[Polling] 🕒 Starting cycle for ${allUsers.length} users...`);
    const defaultBubbleBase = 'https://site2app.online/api/1.1/obj';
    const bubbleToken = process.env.BUBBLE_API_TOKEN || '59ef5eb57d786ff8eced03244342f32e';

    for (const user of allUsers) {
        try {
            // 1. Determine the right URLs
            let queueUrl = user.bubbleApiUrl;
            let historyUrl = '';
            
            if (!queueUrl) {
                queueUrl = `${defaultBubbleBase}/notification_queue`;
                historyUrl = `${defaultBubbleBase}/notification`;
            } else {
                // Check if user provided the full notification_queue URL or just the base
                if (queueUrl.includes('/notification_queue')) {
                    historyUrl = queueUrl.replace('/notification_queue', '/notification');
                } else if (queueUrl.includes('/obj/')) {
                    // It's a base URL ending in /obj/ or similar
                    historyUrl = queueUrl.replace(/\/$/, '') + '/notification';
                    queueUrl = queueUrl.replace(/\/$/, '') + '/notification_queue';
                } else {
                    // It's likely just the site URL or something incomplete
                    const base = queueUrl.replace(/\/$/, '');
                    queueUrl = `${base}/api/1.1/obj/notification_queue`;
                    historyUrl = `${base}/api/1.1/obj/notification`;
                }
            }

            // 2. Fetch notifications from Bubble
            const constraints = JSON.stringify([
                { key: 'owner', constraint_type: 'equals', value: user.id },
                { key: 'status', constraint_type: 'not equal', value: 'Sent' }
            ]);
            
            const fetchUrl = `${queueUrl}?constraints=${encodeURIComponent(constraints)}`;
            console.log(`[Polling] Checking ${user.email} -> ${queueUrl}`);

            const response = await fetch(fetchUrl, {
                headers: { 
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${bubbleToken}`
                }
            });

            if (!response.ok) {
                if (response.status !== 404) {
                    console.warn(`[Polling] Bubble fetch failed (${response.status}) for ${user.email}`);
                }
                continue;
            }

            const data = await response.json() as any;
            const pendingNotifs = data?.response?.results || data?.results || (Array.isArray(data) ? data : []);

            if (!Array.isArray(pendingNotifs) || pendingNotifs.length === 0) {
                continue;
            }

            console.log(`[Polling] Found ${pendingNotifs.length} notifications for ${user.email}`);

            for (const notif of pendingNotifs) {
                // Safety check: skip if invalid or already processed in this runtime
                if (!notif._id || notif.status === 'Sent' || processedBubbleNotifs.has(notif._id)) {
                    continue;
                }

                const reqBody = {
                    title: notif.title || 'Sans titre',
                    body: notif.body || '',
                    buildId: notif.targetApp || notif.buildId || 'all',
                    target: notif.targetToken ? notif.targetToken.split(',').map((t: any) => String(t).trim()).filter(Boolean) : (notif.targetOs || 'all'),
                    image: notif.image || null,
                    actionUrl: notif.targetUrl || null,
                };

                try {
                    console.log(`[Polling] 🚀 Sending: "${reqBody.title}" to ${Array.isArray(reqBody.target) ? reqBody.target.length + ' tokens' : reqBody.target}`);
                    
                    const fcmResult = await sendNotificationCore(user, reqBody);

                    if (fcmResult) {
                        // Mark as processed locally
                        processedBubbleNotifs.add(notif._id);
                        saveProcessedBubble();

                        // Update Status in Queue
                        try {
                            const updateRes = await fetch(`${queueUrl}/${notif._id}`, {
                                method: 'PATCH',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${bubbleToken}`
                                },
                                body: JSON.stringify({ status: 'Sent' })
                            });
                            if (!updateRes.ok) console.warn(`[Polling] Failed to update status for ${notif._id}`);
                        } catch (e) {
                            console.error(`[Polling] Error updating status:`, e);
                        }

                        // Create History Record
                        try {
                            console.log(`[Polling] Creating history entry at ${historyUrl}`);
                            const historyRes = await fetch(historyUrl, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${bubbleToken}`
                                },
                                body: JSON.stringify({
                                    title: reqBody.title,
                                    body: reqBody.body,
                                    image: reqBody.image || '',
                                    targetUrl: reqBody.actionUrl || '',
                                    targetApp: reqBody.buildId || 'all',
                                    targetOs: Array.isArray(reqBody.target) ? 'specific' : reqBody.target,
                                    targetToken: notif.targetToken || '',
                                    status: 'Sent',
                                    owner: user.id,
                                    sentAt: new Date().toISOString()
                                })
                            });
                            if (!historyRes.ok) {
                                const errTxt = await historyRes.text();
                                console.warn(`[Polling] History creation failed: ${historyRes.status} - ${errTxt}`);
                            } else {
                                console.log(`[Polling] ✅ History record created for ${notif._id}`);
                            }
                        } catch (e) {
                            console.error(`[Polling] Error creating history:`, e);
                        }
                    } else {
                        console.warn(`[Polling] ⚠️ Notification dispatch returned null (possibly no targets found)`);
                    }
                } catch (e: any) {
                    console.error(`[Polling] 🚨 Dispatch error for ${notif._id}:`, e.message);
                }
            }
        } catch (err: any) {
            console.error(`[Polling] 🚨 Cycle error for user ${user.id}:`, err.message);
        }
    }
}

// Start polling daemon in background
setInterval(() => pollExternalNotifications().catch(console.error), POLLING_INTERVAL_MS);

// ─── Start Server ────────────────────────────────────
const PORT = parseInt(process.env.PORT as string) || 4000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Site2App Backend running on port ${PORT} (0.0.0.0)`)
    console.log(`📦 Build storage: ${path.join(__dirname, '../storage/builds')}`)
    console.log(`❤️  Health check: http://localhost:${PORT}/node/health\n`)
})
