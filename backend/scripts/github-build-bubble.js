import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Builder from '../src/services/Builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUBBLE_API_URL = process.env.BUBBLE_API_URL || 'https://site2app.online/api/1.1/obj';
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN || '59ef5eb57d786ff8eced03244342f32e';

async function updateBubbleApp(appId, data, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[CI] Updating Bubble app ${appId} (attempt ${attempt}/${retries})...`);
            console.log(`[CI] Using BUBBLE_API_URL: ${BUBBLE_API_URL}`);
            const res = await fetch(`${BUBBLE_API_URL}/app/${appId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${BUBBLE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                console.log(`[CI] Bubble app ${appId} updated successfully.`);
                return;
            }
            const errText = await res.text();
            console.error(`[CI] Failed to update Bubble app (${res.status}):`, errText);
            if (attempt < retries) {
                console.log(`[CI] Retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            console.error(`[CI] Network error updating Bubble app:`, e);
            if (attempt < retries) {
                console.log(`[CI] Retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    console.error(`[CI] CRITICAL: Failed to update Bubble app ${appId} after ${retries} attempts!`);
}


async function uploadFileToBubble(filePath, fileName) {
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.android.package-archive' });
    
    const formData = new FormData();
    formData.append('file', blob, fileName);
    
    // Upload to Bubble file manager directly via the native /fileupload endpoint
    let uploadUrl = BUBBLE_API_URL.replace('/api/1.1/obj', '/fileupload');
    if (!uploadUrl.endsWith('/fileupload')) {
        // Fallback robust construction
        const urlObj = new URL(BUBBLE_API_URL);
        const versionPath = BUBBLE_API_URL.includes('/version-test') ? '/version-test' : '';
        uploadUrl = urlObj.origin + versionPath + '/fileupload';
    }
    
    const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${BUBBLE_API_TOKEN}`,
        },
        body: formData
    });
    
    if (!res.ok) {
        console.error('Bubble file upload failed:', await res.text());
        return null;
    }
    
    // The endpoint returns the URL directly as a string or a JSON
    let text = await res.text();
    text = text.replace(/^"|"$/g, ''); // Remove surrounding quotes if any
    try {
        const json = JSON.parse(text);
        return json.response?.file || json.file || text;
    } catch(e) {
        return text;
    }
}

async function downloadBase64(url) {
    if (!url) return null;
    url = url.trim();
    try {
        if (url.startsWith('//')) {
            url = 'https:' + url;
        }
        console.log(`[CI] Downloading image from ${url}`);
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GitHubActions/1.0' }
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
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
    const parsedGoogleServices = buildData.googleServices || null;

    if (!buildId) {
        console.error('Missing BUILD_ID in BUILD_DATA');
        process.exit(1);
    }

    try {
        console.log(`[CI] Starting build for ${appName} (ID: ${buildId})`);
        
        // Prepare storage
        fs.mkdirSync(path.join(__dirname, '../storage/builds', buildId), { recursive: true });

        // Resolve icon: prefer raw base64 sent directly from frontend, fallback to URL download
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

        // Resolve splash: prefer raw base64 sent directly from frontend, fallback to URL download
        let splashImageBase64 = buildData.splashBase64 || null;
        if (!splashImageBase64 && buildData.splashUrl) {
            console.log('[CI] No direct base64 splash, downloading from URL...');
            splashImageBase64 = await downloadBase64(buildData.splashUrl);
        }
        if (splashImageBase64) {
            console.log(`[CI] ✅ Splash base64 ready (${splashImageBase64.length} chars)`);
        } else {
            console.log('[CI] No splash image provided, will use default splash');
        }

        const builderOptions = {
            buildId: buildId,
            apiUrl: '',
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
        
        console.log(`[CI] Uploading file to Bubble...`);
        const uploadRes = await uploadFileToBubble(result.apkPath, result.fileName);
        let finalApkUrl = uploadRes?.response?.file || uploadRes?.file;
        if (!finalApkUrl && uploadRes && typeof uploadRes === 'string') finalApkUrl = uploadRes;
        
        if (finalApkUrl && finalApkUrl.startsWith('//')) {
            finalApkUrl = 'https:' + finalApkUrl;
        }

        console.log(`[CI] File uploaded successfully to Bubble! URL: ${finalApkUrl}`);
        
        // Update Bubble with completed status, file size, and the actual APK file
        await updateBubbleApp(buildId, {
            status: 'completed',
            fileSize: result.size,
            ...(finalApkUrl ? { apkFile: finalApkUrl } : {})
        });

        console.log('[CI] Bubble app record updated with APK file!');
        
    } catch (e) {
        console.error('[CI] Build failed:', e);
        
        // Mark as failed in Bubble
        await updateBubbleApp(buildId, {
            status: 'failed',
            errorMessage: e instanceof Error ? e.message : String(e)
        });
        
        process.exit(1);
    }
}

run();
