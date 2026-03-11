import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Builder from '../src/services/Builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const buildId = process.env.BUILD_ID;
    const apiUrl = process.env.API_URL;
    const secret = process.env.BUILDER_SECRET;

    if (!buildId || !apiUrl || !secret) {
        console.error('Missing required env variables: BUILD_ID, API_URL, BUILDER_SECRET');
        process.exit(1);
    }

    try {
        console.log(`Fetching config from ${apiUrl}/api/internal/build/${buildId}/config`);
        const res = await fetch(`${apiUrl}/api/internal/build/${buildId}/config`, {
            headers: { 'Authorization': `Bearer ${secret}` }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch config. Status: ${res.status} ${await res.text()}`);
        }

        const { appUrl, appName, packageName, options } = await res.json();

        // Ensure storage directory exists
        fs.mkdirSync(path.join(__dirname, '../../storage'), { recursive: true });

        console.log('Starting builder for', appName);
        const builder = new Builder(appUrl, appName, packageName, options);
        
        const result = await builder.buildApk();
        console.log('Build finished. Uploading APK to backend...', result.apkPath);
        
        const apkBuffer = fs.readFileSync(result.apkPath);
        const uploadRes = await fetch(`${apiUrl}/api/internal/build/${buildId}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Content-Type': 'application/vnd.android.package-archive',
                'X-File-Name': result.fileName
            },
            body: apkBuffer
        });

        if (!uploadRes.ok) {
            throw new Error(`Failed to upload APK. Status: ${uploadRes.status} ${await uploadRes.text()}`);
        }
        console.log('APK uploaded successfully!');
    } catch (e) {
        console.error('Build failed locally in CI:', e);
        
        // Notify backend of failure
        try {
            await fetch(`${apiUrl}/api/internal/build/${buildId}/fail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secret}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
            });
            console.log('Notified backend of failure.');
        } catch(notifyErr) {
            console.error('Failed to notify backend of failure.', notifyErr);
        }
        
        process.exit(1); // Fail the GitHub action run
    }
}

run();
