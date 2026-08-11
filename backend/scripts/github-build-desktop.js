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
  const BUILDER_SECRET = process.env.BUILDER_SECRET;

  if (!FUNCTIONS_URL || !BUILDER_SECRET) {
    console.error('Missing FUNCTIONS_URL or BUILDER_SECRET');
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
    path.resolve(__dirname, '../src/services/desktop/electron-template')
  );

  try {
    const result = await builder.build();

    const uploadArtifact = async (artifact, platformName) => {
      if (!artifact) return;
      console.log(`Uploading ${platformName} artifact...`);
      const fileBuffer = fs.readFileSync(artifact.filePath);
      const uploadRes = await fetch(`${FUNCTIONS_URL}/node/internal/desktop/${buildId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BUILDER_SECRET}`,
          'Content-Type': 'application/octet-stream',
          'X-File-Name': artifact.fileName,
          'X-Platform': platformName
        },
        body: fileBuffer
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
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
      await fetch(`${FUNCTIONS_URL}/node/internal/desktop/${buildId}/fail`, {
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
