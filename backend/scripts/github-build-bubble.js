import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Builder from '../src/services/Builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUBBLE_API_URL = process.env.BUBBLE_API_URL || 'https://site2app-34905.bubbleapps.io/version-test/api/1.1/obj';
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN || '59ef5eb57d786ff8eced03244342f32e';

async function updateBubbleApp(appId, data) {
    const res = await fetch(`${BUBBLE_API_URL}/app/${appId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${BUBBLE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) console.error('Failed to update Bubble app:', await res.text());
}


async function run() {
    const buildId = process.env.BUILD_ID;
    const appName = process.env.APP_NAME || 'MonApp';
    const appUrl = process.env.APP_URL || 'https://example.com';
    const packageName = process.env.PACKAGE_NAME || 'com.site2app.monapp';
    const themeColor = process.env.THEME_COLOR || '#3461f5';
    const splashBgColor = process.env.SPLASH_BG_COLOR || '#3461f5';
    const orientation = process.env.ORIENTATION || 'portrait';
    const enableFullscreen = process.env.ENABLE_FULLSCREEN === 'true';
    const platform = process.env.PLATFORM || 'android';
    const versionCode = parseInt(process.env.VERSION_CODE) || 1;
    const versionName = process.env.VERSION_NAME || '1.0';

    if (!buildId) {
        console.error('Missing BUILD_ID');
        process.exit(1);
    }

    try {
        console.log(`[CI] Starting build for ${appName} (ID: ${buildId})`);
        
        // Prepare storage
        fs.mkdirSync(path.join(__dirname, '../storage/builds', buildId), { recursive: true });

        const builderOptions = {
            buildId: buildId,
            apiUrl: '',
            statusBarColor: themeColor,
            themeColor: themeColor,
            splashBgColor: splashBgColor,
            enableFullscreen: enableFullscreen,
            platform: platform,
            orientation: orientation,
            features: {},
            iconBase64: null,
            splashImageBase64: null,
            versionCode: versionCode,
            versionName: versionName,
            googleServicesJson: null,
        };

        const builder = new Builder(appUrl, appName, packageName, builderOptions);
        const result = await builder.buildApk();
        
        console.log(`[CI] Build complete: ${result.fileName} (${result.size} bytes)`);
        console.log(`[CI] APK path: ${result.apkPath}`);
        
        // Read the APK file and convert to base64
        const apkBuffer = fs.readFileSync(result.apkPath);
        const apkBase64 = apkBuffer.toString('base64');
        const fileUploadString = `${result.fileName}|data:application/vnd.android.package-archive;base64,${apkBase64}`;
        
        // Update Bubble with completed status, file size, and the actual APK file
        await updateBubbleApp(buildId, {
            status: 'completed',
            fileSize: result.size,
            apkFile: fileUploadString
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
