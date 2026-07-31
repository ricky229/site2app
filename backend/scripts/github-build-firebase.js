import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Builder from '../src/services/Builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Cloud Functions URL for updating build status
const FUNCTIONS_URL = process.env.FUNCTIONS_URL || 'https://us-central1-site2app-app.cloudfunctions.net/api';
const BUILDER_SECRET = process.env.BUILDER_SECRET || 'dev_secret_123';

async function updateBuildStatus(buildId, data, retries = 3) {
    const endpoint = data.status === 'failed' 
        ? `${FUNCTIONS_URL}/api/internal/build/${buildId}/fail`
        : null;
    
    if (!endpoint) return; // Upload handled separately
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[CI] Updating build ${buildId} status (attempt ${attempt}/${retries})...`);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BUILDER_SECRET}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                console.log(`[CI] Build ${buildId} status updated.`);
                return;
            }
            const errText = await res.text();
            console.error(`[CI] Failed to update status (${res.status}):`, errText);
            if (attempt < retries) await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            console.error(`[CI] Network error:`, e);
            if (attempt < retries) await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.error(`[CI] CRITICAL: Failed to update build ${buildId} after ${retries} attempts!`);
}

async function uploadApkToBackend(buildId, filePath, fileName) {
    const uploadUrl = `${FUNCTIONS_URL}/api/internal/build/${buildId}/upload`;
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`[CI] Uploading APK to Firebase backend: ${uploadUrl}`);
    console.log(`[CI] File size: ${fileBuffer.length} bytes`);
    
    const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${BUILDER_SECRET}`,
            'Content-Type': 'application/octet-stream',
            'X-File-Name': fileName
        },
        body: fileBuffer
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed (${res.status}): ${errText}`);
    }
    
    const result = await res.json();
    console.log(`[CI] ✅ APK uploaded successfully!`);
    return result;
}

async function downloadBase64(url) {
    if (!url) return null;
    url = url.trim();
    try {
        if (url.startsWith('//')) url = 'https:' + url;
        console.log(`[CI] Downloading image from ${url}`);
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GitHubActions/1.0' }
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch(e) {
        console.error(`[CI] Error downloading image from ${url}:`, e);
        return null;
    }
}

async function run() {
    let buildData = {};
    if (process.env.BUILD_DATA && process.env.BUILD_DATA !== 'null') {
        try { buildData = JSON.parse(process.env.BUILD_DATA); } catch(e) { console.error('Error parsing BUILD_DATA JSON', e); }
    } else {
        console.error('Missing BUILD_DATA environment variable');
        process.exit(1);
    }
    
    const buildId = buildData.buildId;
    const appName = buildData.appName || 'MonApp';
    const appUrl = buildData.url || buildData.appUrl || 'https://example.com';
    const packageName = buildData.packageName || 'com.site2app.monapp';
    const themeColor = buildData.themeColor || '#3461f5';
    const splashBgColor = buildData.splashBgColor || '#3461f5';
    const orientation = buildData.orientation || 'portrait';
    const enableFullscreen = buildData.enableFullscreen === true || buildData.enableFullscreen === 'true';
    const platform = buildData.platform || 'android';
    const versionCode = parseInt(buildData.versionCode) || 1;
    const versionName = buildData.versionName || '1.0';
    const parsedFeatures = buildData.features || {};
    const parsedGoogleServices = buildData.googleServicesJson || buildData.googleServices || null;

    if (!buildId) {
        console.error('Missing BUILD_ID in BUILD_DATA');
        process.exit(1);
    }

    try {
        console.log(`[CI] Starting build for ${appName} (ID: ${buildId})`);
        
        fs.mkdirSync(path.join(__dirname, '../storage/builds', buildId), { recursive: true });

        // Resolve icon
        let iconBase64 = buildData.iconBase64 || null;
        if (!iconBase64 && buildData.iconUrl) {
            console.log('[CI] No direct base64 icon, downloading from URL...');
            iconBase64 = await downloadBase64(buildData.iconUrl);
        }
        if (iconBase64) {
            console.log(`[CI] ✅ Icon base64 ready (${iconBase64.length} chars)`);
        } else {
            console.log('[CI] ⚠️ No icon provided, will use fallback generated icon');
        }

        // Resolve splash
        let splashImageBase64 = buildData.splashImageBase64 || null;
        if (!splashImageBase64 && buildData.splashUrl) {
            console.log('[CI] No direct base64 splash, downloading from URL...');
            splashImageBase64 = await downloadBase64(buildData.splashUrl);
        }

        const builderOptions = {
            buildId: buildId,
            userPlan: buildData.userPlan || 'free',
            apiUrl: buildData.apiUrl || '',
            statusBarColor: themeColor,
            themeColor: themeColor,
            splashBgColor: splashBgColor,
            enableFullscreen: enableFullscreen,
            platform: platform,
            orientation: orientation,
            features: parsedFeatures,
            iconBase64: iconBase64,
            splashImageBase64: splashImageBase64,
            versionCode: versionCode,
            versionName: versionName,
            googleServicesJson: parsedGoogleServices,
        };

        const builder = new Builder(appUrl, appName, packageName, builderOptions);
        const result = await builder.buildApk();
        
        console.log(`[CI] Build complete: ${result.fileName} (${result.size} bytes)`);
        console.log(`[CI] APK path: ${result.apkPath}`);
        
        // Upload APK to Firebase backend (which stores in Firebase Storage)
        await uploadApkToBackend(buildId, result.apkPath, result.fileName);
        
        console.log('[CI] ✅ Build and upload completed successfully!');
        
    } catch (e) {
        console.error('[CI] Build failed:', e);
        
        await updateBuildStatus(buildId, {
            status: 'failed',
            error: e instanceof Error ? e.message : String(e)
        });
        
        process.exit(1);
    }
}

run();
