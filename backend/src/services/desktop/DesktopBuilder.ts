import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DesktopBuildResult {
  windows?: { fileName: string; filePath: string; size: number };
  macos?: { fileName: string; filePath: string; size: number };
  updateFiles?: { fileName: string; filePath: string }[];
}

export class DesktopBuilder {
  private buildId: string;
  private appUrl: string;
  private appName: string;
  private iconBase64: string;
  private platforms: ('windows' | 'macos')[];
  private templatePath: string;
  private options: any;

  constructor(
    buildId: string,
    appUrl: string,
    appName: string,
    iconBase64: string,
    platforms: ('windows' | 'macos')[],
    options: any = {},
    templatePath: string = path.join(__dirname, 'electron-template')
  ) {
    this.buildId = buildId;
    this.appUrl = appUrl;
    this.appName = appName;
    this.iconBase64 = iconBase64;
    this.platforms = platforms;
    this.options = options;
    this.templatePath = templatePath;
  }

  private log(message: string) {
    console.log(`[DESKTOP BUILD ${this.buildId}] ${message}`);
  }

  private generateFallbackIcon(): Buffer {
    // Simple 1x1 red PNG
    const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    return Buffer.from(base64, 'base64');
  }

  private createIco(pngBuffer: Buffer): Buffer {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type (1 = ICO)
    header.writeUInt16LE(1, 4); // Count (1 image)

    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0); // Width (0 = 256)
    entry.writeUInt8(0, 1); // Height (0 = 256)
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
    entry.writeUInt32LE(22, 12); // Offset (6 + 16)

    return Buffer.concat([header, entry, pngBuffer]);
  }

  private createIcns(pngBuffer: Buffer): Buffer {
    const type = Buffer.from('icns');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(8 + 8 + pngBuffer.length, 0); // Total size

    const entryType = Buffer.from('ic10');
    const entryLength = Buffer.alloc(4);
    entryLength.writeUInt32BE(8 + pngBuffer.length, 0); // Entry size

    return Buffer.concat([type, length, entryType, entryLength, pngBuffer]);
  }

  public async build(): Promise<DesktopBuildResult> {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), `desktop-build-${this.buildId}-`));
    const result: DesktopBuildResult = {};

    try {
      this.log(`Creating workspace at ${workspaceDir}`);
      
      fs.cpSync(this.templatePath, workspaceDir, { recursive: true });

      const configPath = path.join(workspaceDir, 'app-config.json');
      const backendUrl = process.env.API_URL || 'http://localhost:4000';
      const appConfig = {
        appUrl: this.appUrl,
        appName: this.appName,
        buildId: this.buildId,
        backendUrl: backendUrl,
        features: this.options?.features || {},
        customCss: this.options?.customCss || '',
        customJs: this.options?.customJs || ''
      };
      fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));

      const pkgPath = path.join(workspaceDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const safeName = this.appName.toLowerCase().replace(/[^a-z0-9]/g, '');
      pkg.name = `com.site2app.desktop.${safeName}`;
      // Generate a dynamic version number for auto-updates (e.g. 1.0.X)
      // Because electron-builder requires standard semver, we use the elapsed days or minutes
      const elapsedMinutes = Math.floor(Date.now() / 60000) % 100000;
      const buildVersion = `1.0.${elapsedMinutes}`;
      pkg.version = buildVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

      const yamlPath = path.join(workspaceDir, 'electron-builder.yml');
      let yamlContent = fs.readFileSync(yamlPath, 'utf8');
      yamlContent = yamlContent.replace(/APP_NAME_PLACEHOLDER/g, safeName);
      yamlContent = yamlContent.replace(/APP_DISPLAY_NAME_PLACEHOLDER/g, this.appName);
      fs.writeFileSync(yamlPath, yamlContent);

      const buildDir = path.join(workspaceDir, 'build');
      if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

      let pngBuffer: Buffer;
      if (this.iconBase64) {
        let rawBuffer: Buffer;
        if (this.iconBase64.startsWith('http')) {
          this.log(`Downloading icon from URL: ${this.iconBase64}`);
          const res = await fetch(this.iconBase64);
          if (!res.ok) throw new Error(`Failed to fetch icon: ${res.statusText}`);
          const arrayBuf = await res.arrayBuffer();
          rawBuffer = Buffer.from(arrayBuf);
          this.log(`Downloaded ${rawBuffer.length} bytes`);
        } else {
          const base64Data = this.iconBase64.replace(/^data:image\/\w+;base64,/, "");
          rawBuffer = Buffer.from(base64Data, 'base64');
          this.log(`Parsed base64, ${rawBuffer.length} bytes`);
        }
        
        this.log('Processing icon with Jimp...');
        const { Jimp } = await import('jimp');
        const image = await Jimp.read(rawBuffer);
        // Resize to 256x256 exactly, which matches the createIco header (0 = 256)
        image.resize({ w: 256, h: 256 });
        pngBuffer = await image.getBuffer('image/png');
      } else {
        pngBuffer = this.generateFallbackIcon();
      }

      this.log('Writing standardized icon.png and icon.ico');
      fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer);
      
      if (this.platforms.includes('windows')) {
        this.log('Creating .ico file');
        fs.writeFileSync(path.join(buildDir, 'icon.ico'), this.createIco(pngBuffer));
      }
      
      if (this.platforms.includes('macos')) {
        this.log('Creating .icns file');
        fs.writeFileSync(path.join(buildDir, 'icon.icns'), this.createIcns(pngBuffer));
      }


      this.log('Installing dependencies...');
      await execAsync('npm install', { cwd: workspaceDir });

      if (this.platforms.includes('windows')) {
        this.log('Building for Windows...');
        await execAsync('npx electron-builder --win -p never', { 
          cwd: workspaceDir,
          env: { ...process.env, BUILD_ID: this.buildId }
        });
        
        const distDir = path.join(workspaceDir, 'dist');
        const files = fs.readdirSync(distDir);
        const exeFile = files.find(f => f.endsWith('.exe'));
        
        if (exeFile) {
          const filePath = path.join(distDir, exeFile);
          const fileSize = fs.statSync(filePath).size;
          result.windows = {
            fileName: exeFile,
            filePath: filePath,
            size: fileSize
          };
          
          // Generate latest.yml manually since -p never doesn't create it
          const crypto = await import('crypto');
          const fileBuffer = fs.readFileSync(filePath);
          const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('base64');
          
          // Read package.json to get the version we generated
          const pkg = JSON.parse(fs.readFileSync(path.join(workspaceDir, 'package.json'), 'utf8'));
          const currentVersion = pkg.version || '1.0.0';
          
          const latestYml = [
            `version: ${currentVersion}`,
            `files:`,
            `  - url: ${exeFile}`,
            `    sha512: ${sha512}`,
            `    size: ${fileSize}`,
            `path: ${exeFile}`,
            `sha512: ${sha512}`,
            `releaseDate: '${new Date().toISOString()}'`,
          ].join('\n');
          
          const latestYmlPath = path.join(distDir, 'latest.yml');
          fs.writeFileSync(latestYmlPath, latestYml);
          
          result.updateFiles = result.updateFiles || [];
          result.updateFiles.push({ fileName: 'latest.yml', filePath: latestYmlPath });
          
          // Collect blockmap files if they exist
          files.filter(f => f.endsWith('.blockmap')).forEach(f => {
            result.updateFiles!.push({ fileName: f, filePath: path.join(distDir, f) });
          });
          
          this.log(`Windows build success: ${exeFile}`);
        } else {
          throw new Error('Windows executable not found in dist output.');
        }
      }

      if (this.platforms.includes('macos')) {
        this.log('Building for macOS...');
        await execAsync('npx electron-builder --mac -p never', { 
          cwd: workspaceDir,
          env: { ...process.env, BUILD_ID: this.buildId }
        });
        
        const distDir = path.join(workspaceDir, 'dist');
        const files = fs.readdirSync(distDir);
        const dmgFile = files.find(f => f.endsWith('.dmg'));
        
        if (dmgFile) {
          const filePath = path.join(distDir, dmgFile);
          result.macos = {
            fileName: dmgFile,
            filePath: filePath,
            size: fs.statSync(filePath).size
          };
          
          result.updateFiles = result.updateFiles || [];
          files.filter(f => f === 'latest-mac.yml' || f.endsWith('.blockmap')).forEach(f => {
            result.updateFiles!.push({ fileName: f, filePath: path.join(distDir, f) });
          });
          
          this.log(`macOS build success: ${dmgFile}`);
        } else {
          throw new Error('macOS DMG not found in dist output.');
        }
      }

      return result;
    } catch (error) {
      this.log(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      this.log(`Cleaning up workspace...`);
      try {
        if (result.windows) {
          const newPath = path.join(os.tmpdir(), result.windows.fileName);
          fs.copyFileSync(result.windows.filePath, newPath);
          result.windows.filePath = newPath;
        }
        if (result.macos) {
          const newPath = path.join(os.tmpdir(), result.macos.fileName);
          fs.copyFileSync(result.macos.filePath, newPath);
          result.macos.filePath = newPath;
        }
        if (result.updateFiles) {
          result.updateFiles.forEach(uf => {
            const newPath = path.join(os.tmpdir(), uf.fileName);
            fs.copyFileSync(uf.filePath, newPath);
            uf.filePath = newPath;
          });
        }
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch (cleanupError) {
        this.log(`Cleanup failed: ${cleanupError}`);
      }
    }
  }
}
