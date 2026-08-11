import fs from 'fs';
import path from 'path';
import { DesktopBuilder } from '../src/services/desktop/DesktopBuilder.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const buildDataStr = process.env.BUILD_DATA;
  if (!buildDataStr) {
    console.error('Missing BUILD_DATA environment variable');
    process.exit(1);
  }

  const buildData = JSON.parse(buildDataStr);
  const { buildId, appName, appUrl, platforms, iconUrl } = buildData;
  const FUNCTIONS_URL = process.env.FUNCTIONS_URL;
  const BUILDER_SECRET = process.env.BUILDER_SECRET || 'dev_secret_123';

  if (!FUNCTIONS_URL) {
    console.error('Missing FUNCTIONS_URL');
    process.exit(1);
  }

  console.log(`Starting desktop build for ${buildId}`);

  let iconBase64 = '';
  if (iconUrl) {
    console.log(`Downloading icon from ${iconUrl}`);
    try {
      const response = await fetch(iconUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        iconBase64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        console.warn('Failed to download icon, using fallback.');
      }
    } catch (e) {
      console.warn('Error downloading icon:', e);
    }
  }

  const currentPlatform = process.platform;
  const targetPlatforms = [];
  
  if (currentPlatform === 'win32' && platforms.includes('windows')) targetPlatforms.push('windows');
  if (currentPlatform === 'darwin' && platforms.includes('macos')) targetPlatforms.push('macos');
  
  const builder = new DesktopBuilder(
    buildId,
    appUrl,
    appName,
    iconBase64,
    targetPlatforms.length ? targetPlatforms : platforms,
    { features: buildData.features || {}, customCss: buildData.customCss || '', customJs: buildData.customJs || '' },
    path.resolve(__dirname, '../src/services/desktop/electron-template')
  );

  try {
    const result = await builder.build();

    const uploadArtifact = async (artifact, platformName) => {
      if (!artifact) return;
      console.log(`Uploading ${platformName} artifact...`);
      const fileBuffer = fs.readFileSync(artifact.filePath);
      
      // 1. Get Signed URL
      console.log(`Requesting signed URL for ${artifact.fileName}...`);
      const urlRes = await fetch(`${FUNCTIONS_URL}/api/internal/desktop/${buildId}/upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BUILDER_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName: artifact.fileName })
      });
      
      if (!urlRes.ok) {
        const errText = await urlRes.text();
        throw new Error(`Failed to get signed URL (${urlRes.status}): ${errText}`);
      }
      
      const { uploadUrl } = await urlRes.json();
      
      // 2. Upload to Signed URL
      console.log(`Uploading directly to Google Cloud Storage...`);
      const gcsRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileBuffer.length.toString()
        },
        body: fileBuffer
      });
      
      if (!gcsRes.ok) {
        const errText = await gcsRes.text();
        throw new Error(`GCS upload failed (${gcsRes.status}): ${errText}`);
      }
      
      // 3. Notify backend that upload is complete
      console.log(`Notifying backend of completion...`);
      const completeRes = await fetch(`${FUNCTIONS_URL}/api/internal/desktop/${buildId}/upload-complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BUILDER_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: artifact.fileName,
          platform: platformName
        })
      });
      
      if (!completeRes.ok) {
        const errText = await completeRes.text();
        throw new Error(`Completion notification failed (${completeRes.status}): ${errText}`);
      }
      
      console.log(`Upload successful for ${platformName}`);
    };

    if (result.windows) await uploadArtifact(result.windows, 'windows');
    if (result.macos) await uploadArtifact(result.macos, 'macos');

    console.log('Build and upload complete.');
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error);
    try {
      await fetch(`${FUNCTIONS_URL}/api/internal/desktop/${buildId}/fail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BUILDER_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: error.message })
      });
    } catch (e) {
      console.error('Failed to report failure:', e);
    }
    process.exit(1);
  }
}

main();
