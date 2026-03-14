import path from 'path'
import fsp from 'fs/promises'
import fs, { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { deflateSync } from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Auto-detect environment ─────────────────────────
function findJavaHome() {
    if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME
    for (const base of ['C:\\Program Files\\Eclipse Adoptium', 'C:\\Program Files\\Java']) {
        try {
            const jdk = readdirSync(base).find(d => d.startsWith('jdk-17') || d.startsWith('jdk-21'))
            if (jdk) return path.join(base, jdk)
        } catch { }
    }
    return ''
}

function findAndroidSdk() {
    for (const v of [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT]) {
        if (v && existsSync(v)) return v
    }
    const def = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
    return existsSync(def) ? def : ''
}

function findBuildTools(sdk) {
    try { return path.join(sdk, 'build-tools', readdirSync(path.join(sdk, 'build-tools')).sort().reverse()[0]) } catch { return '' }
}

function findAndroidJar(sdk) {
    try {
        for (const v of readdirSync(path.join(sdk, 'platforms')).sort().reverse()) {
            const jar = path.join(sdk, 'platforms', v, 'android.jar')
            if (existsSync(jar)) return jar
        }
    } catch { }
    return ''
}

// ─── Builder ─────────────────────────────────────────
class Builder {
    constructor(appUrl, appName, packageName, options = {}) {
        this.appUrl = appUrl
        this.appName = appName || 'MonApp'
        this.packageName = packageName || 'com.site2app.' + this.appName.toLowerCase().replace(/[^a-z0-9]/g, '')
        this.buildId = options.buildId || Date.now().toString()
        this.buildDir = path.join(__dirname, '../../storage/builds', this.buildId)
        this.javaHome = findJavaHome()
        this.sdk = findAndroidSdk()
        this.bt = findBuildTools(this.sdk)
        this.androidJar = findAndroidJar(this.sdk)

        // Options de personnalisation
        this.statusBarColor = options.statusBarColor || '#1a1a2e'
        this.splashBgColor = options.splashBgColor || '#1a1a2e'
        this.enableFullscreen = options.enableFullscreen || false
        this.orientation = options.orientation || 'portrait'

        // Feature flags
        this.features = options.features || {}

        // User-uploaded images (base64 data URLs)
        this.iconBase64 = options.iconBase64 || null
        this.splashImageBase64 = options.splashImageBase64 || null
        this.apiUrl = options.apiUrl || 'http://10.0.2.2:4000'

        this.versionCode = options.versionCode || 1
        this.versionName = options.versionName || "1.0"
        this.googleServicesJson = options.googleServicesJson || null
        this.bubbleApiUrl = options.bubbleApiUrl || 'https://site2app.online/api/1.1/obj'
        this.bubbleApiToken = options.bubbleApiToken || '59ef5eb57d786ff8eced03244342f32e'

        // Extraire le nom de domaine
        try { this.hostname = new URL(this.appUrl).hostname } catch { this.hostname = 'site2app' }
    }

    _run(cmd, cwd) {
        console.log(`[BUILD ${this.buildId}] $ ${cmd}`)
        const result = execSync(cmd, {
            cwd: cwd || this.buildDir,
            env: { ...process.env, JAVA_HOME: this.javaHome, ANDROID_HOME: this.sdk, ANDROID_SDK_ROOT: this.sdk },
            timeout: 1200000, maxBuffer: 50 * 1024 * 1024, shell: true, windowsHide: true,
        })
        const text = result.toString().trim()
        if (text) console.log(`[BUILD ${this.buildId}] ${text}`)
        return text
    }

    _write(filePath, content) {
        mkdirSync(path.dirname(filePath), { recursive: true })
        writeFileSync(filePath, Buffer.from(content, 'utf8'))
    }

    _findFiles(dir, ext) {
        const results = []
        for (const item of readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, item.name)
            if (item.isDirectory()) results.push(...this._findFiles(full, ext))
            else if (item.name.endsWith(ext)) results.push(full)
        }
        return results
    }

    /** Generate proper PNG icons for all densities + adaptive icon XML for API 26+ */
    _createIcon(baseDir) {
        const densities = {
            'mdpi': 48,
            'hdpi': 72,
            'xhdpi': 96,
            'xxhdpi': 144,
            'xxxhdpi': 192,
        }

        // Determine icon PNG data
        let iconPngBuffer = null
        let isCustomIcon = false

        if (this.iconBase64 && this.iconBase64.startsWith('data:')) {
            // User uploaded an icon as base64 data URL
            try {
                const base64Data = this.iconBase64.split(',')[1]
                iconPngBuffer = Buffer.from(base64Data, 'base64')
                console.log(`[BUILD ${this.buildId}] 🎨 Using user-uploaded icon (${iconPngBuffer.length} bytes)`)
                isCustomIcon = true
            } catch (e) {
                console.log(`[BUILD ${this.buildId}] ⚠️ Failed to decode icon base64 data URL, using fallback`)
            }
        } else if (this.iconBase64 && this.iconBase64.startsWith('http')) {
            // Icon is a URL — try to download it synchronously
            try {
                const result = execSync(`node -e "const h=require('${this.iconBase64.startsWith('https') ? 'https' : 'http'}');h.get('${this.iconBase64}',r=>{const c=[];r.on('data',d=>c.push(d));r.on('end',()=>process.stdout.write(Buffer.concat(c)))})"`, { timeout: 10000, maxBuffer: 5 * 1024 * 1024 })
                iconPngBuffer = result
                console.log(`[BUILD ${this.buildId}] 🎨 Downloaded icon from URL (${iconPngBuffer.length} bytes)`)
                isCustomIcon = true
            } catch (e) {
                console.log(`[BUILD ${this.buildId}] ⚠️ Failed to download icon URL, using fallback`)
            }
        } else if (this.iconBase64 && this.iconBase64.length > 100) {
            // Raw base64 string (from downloadBase64() in github-build-bubble.js which returns raw base64 without data: prefix)
            try {
                iconPngBuffer = Buffer.from(this.iconBase64, 'base64')
                if (iconPngBuffer.length > 100) {
                    console.log(`[BUILD ${this.buildId}] 🎨 Using raw base64 icon (${iconPngBuffer.length} bytes)`)
                    isCustomIcon = true
                } else {
                    iconPngBuffer = null
                    console.log(`[BUILD ${this.buildId}] ⚠️ Raw base64 icon too small, using fallback`)
                }
            } catch (e) {
                console.log(`[BUILD ${this.buildId}] ⚠️ Failed to decode raw base64 icon, using fallback`)
            }
        }

        // Fallback: generate a simple colored square PNG
        if (!iconPngBuffer) {
            const hexColor = this.statusBarColor.replace('#', '')
            const bgR = parseInt(hexColor.substring(0, 2), 16) || 52
            const bgG = parseInt(hexColor.substring(2, 4), 16) || 97
            const bgB = parseInt(hexColor.substring(4, 6), 16) || 245
            iconPngBuffer = this._createSimplePng(192, 192, bgR, bgG, bgB)
            console.log(`[BUILD ${this.buildId}] 🎨 Using generated fallback icon`)
        }

        // Detect real image type to avoid aapt2 PNG signature errors
        let ext = 'png'
        if (iconPngBuffer.length > 4) {
            if (iconPngBuffer[0] === 0xFF && iconPngBuffer[1] === 0xD8 && iconPngBuffer[2] === 0xFF) ext = 'jpg'
            else if (iconPngBuffer[0] === 0x52 && iconPngBuffer[1] === 0x49 && iconPngBuffer[2] === 0x46 && iconPngBuffer[3] === 0x46) ext = 'webp'
        }

        // Write icon to all mipmap densities (Android will scale)
        for (const [density, size] of Object.entries(densities)) {
            const dir = path.join(baseDir, 'res', `mipmap-${density}`)
            mkdirSync(dir, { recursive: true })
            writeFileSync(path.join(dir, `ic_launcher.${ext}`), iconPngBuffer)
            writeFileSync(path.join(dir, `ic_launcher_round.${ext}`), iconPngBuffer)
        }

        // Adaptive Icons for Android 8+ (API 26)
        // We ALWAYS provide these to ensure the icon is shown correctly on modern devices.
        // If it's a custom icon, we use it as the foreground and the statusBarColor as background.
        const valuesDir = path.join(baseDir, 'res', 'values')
        mkdirSync(valuesDir, { recursive: true })
        this._write(path.join(valuesDir, 'ic_launcher_background.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${this.statusBarColor}</color>
</resources>`)

        // Adaptive icon XMLs (API 26+)
        const anydpiDir = path.join(baseDir, 'res', 'mipmap-anydpi-v26')
        mkdirSync(anydpiDir, { recursive: true })

        if (isCustomIcon) {
            // For custom icons, we treat the icon as the foreground content
            // We use an INSET drawable to provide safe-zone padding (16%) so it doesn't look zoomed in/cropped
            const drawableDir = path.join(baseDir, 'res', 'drawable')
            mkdirSync(drawableDir, { recursive: true })
            writeFileSync(path.join(drawableDir, `ic_launcher_foreground_content.${ext}`), iconPngBuffer)

            this._write(path.join(drawableDir, 'ic_launcher_foreground.xml'),
                `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@drawable/ic_launcher_foreground_content"
    android:insetLeft="10%"
    android:insetRight="10%"
    android:insetTop="10%"
    android:insetBottom="10%" />`)

            this._write(path.join(anydpiDir, 'ic_launcher.xml'),
                `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`)
            this._write(path.join(anydpiDir, 'ic_launcher_round.xml'),
                `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`)
        } else {
            // Fallback vector foreground
            this._write(path.join(baseDir, 'res', 'drawable', 'ic_launcher_foreground.xml'),
                `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <group android:translateX="27" android:translateY="27">
        <path android:fillColor="#FFFFFF"
            android:pathData="M30,4 L14,30 L26,30 L22,50 L40,24 L28,24 L32,4 Z"/>
    </group>
</vector>`)

            this._write(path.join(anydpiDir, 'ic_launcher.xml'),
                `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`)
            this._write(path.join(anydpiDir, 'ic_launcher_round.xml'),
                `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`)
        }
    }

    /** Create a minimal valid PNG file (solid color square) */
    _createSimplePng(width, height, r, g, b) {
        // PNG file structure: signature + IHDR + IDAT + IEND
        const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

        // IHDR chunk
        const ihdrData = Buffer.alloc(13)
        ihdrData.writeUInt32BE(width, 0)
        ihdrData.writeUInt32BE(height, 4)
        ihdrData[8] = 8  // bit depth
        ihdrData[9] = 2  // color type (RGB)
        ihdrData[10] = 0 // compression
        ihdrData[11] = 0 // filter
        ihdrData[12] = 0 // interlace
        const ihdr = this._pngChunk('IHDR', ihdrData)

        // IDAT chunk - raw image data
        // Each row: filter byte (0) + RGB pixels
        const rawRow = Buffer.alloc(1 + width * 3)
        rawRow[0] = 0 // no filter
        for (let x = 0; x < width; x++) {
            rawRow[1 + x * 3 + 0] = r
            rawRow[1 + x * 3 + 1] = g
            rawRow[1 + x * 3 + 2] = b
        }

        // Build raw data for all rows
        const rawData = Buffer.alloc(rawRow.length * height)
        for (let y = 0; y < height; y++) {
            rawRow.copy(rawData, y * rawRow.length)
        }

        // Compress with zlib (deflate)
        const compressed = deflateSync(rawData)
        const idat = this._pngChunk('IDAT', compressed)

        // IEND chunk
        const iend = this._pngChunk('IEND', Buffer.alloc(0))

        return Buffer.concat([signature, ihdr, idat, iend])
    }

    /** Build a PNG chunk: length (4) + type (4) + data + CRC (4) */
    _pngChunk(type, data) {
        const typeBuffer = Buffer.from(type, 'ascii')
        const length = Buffer.alloc(4)
        length.writeUInt32BE(data.length, 0)

        const crcInput = Buffer.concat([typeBuffer, data])
        const crc = Buffer.alloc(4)
        crc.writeUInt32BE(this._crc32(crcInput) >>> 0, 0)

        return Buffer.concat([length, typeBuffer, data, crc])
    }

    /** CRC32 calculation for PNG */
    _crc32(buf) {
        let crc = -1
        for (let i = 0; i < buf.length; i++) {
            let byte = buf[i]
            for (let j = 0; j < 8; j++) {
                if ((crc ^ byte) & 1) {
                    crc = (crc >>> 1) ^ 0xEDB88320
                } else {
                    crc = crc >>> 1
                }
                byte >>>= 1
            }
        }
        return crc ^ -1
    }

    /** Create all source files */
    _prepareFiles(baseDir) {
        const pkgPath = this.packageName.replace(/\./g, '/')
        const srcDir = path.join(baseDir, 'src', pkgPath)
        const resDir = path.join(baseDir, 'res')
        const resV21 = path.join(resDir, 'values-v21')
        const drawableDir = path.join(resDir, 'drawable')
        const xmlDir = path.join(resDir, 'xml')
        const assetsDir = path.join(baseDir, 'assets', 'www')
        const valuesDir = path.join(resDir, 'values')

        for (const d of [srcDir, resDir, resV21, drawableDir, xmlDir, assetsDir, valuesDir]) {
            mkdirSync(d, { recursive: true })
        }

        // ── Determine orientation for manifest ──
        const orientationMap = { portrait: 'portrait', landscape: 'landscape', both: 'unspecified' }
        const manifestOrientation = orientationMap[this.orientation] || 'portrait'

        // ── Build permissions based on features ──
        const permissions = [
            '    <uses-permission android:name="android.permission.INTERNET" />',
            '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
            '    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />',
        ]
        const hardwareFeatures = []

        if (this.features.camera) {
            permissions.push('    <uses-permission android:name="android.permission.CAMERA" />')
            permissions.push('    <uses-permission android:name="android.permission.RECORD_AUDIO" />')
            hardwareFeatures.push('    <uses-feature android:name="android.hardware.camera" android:required="false" />')
            hardwareFeatures.push('    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />')
        }
        if (this.features.geolocation) {
            permissions.push('    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />')
            permissions.push('    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />')
            hardwareFeatures.push('    <uses-feature android:name="android.hardware.location.gps" android:required="false" />')
        }
        if (this.features.fileDownload) {
            permissions.push('    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />')
            permissions.push('    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />')
        }
        if (this.features.pushNotifications) {
            permissions.push('    <uses-permission android:name="android.permission.VIBRATE" />')
            permissions.push('    <uses-permission android:name="android.permission.WAKE_LOCK" />')
            permissions.push('    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />')
            permissions.push('    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />')
        }
        if (this.features.admob) {
            permissions.push('    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />')
        }

        // ── AndroidManifest.xml (feature-aware) ──
        this._write(path.join(baseDir, 'AndroidManifest.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${this.packageName}"
    android:versionCode="${this.versionCode}"
    android:versionName="${this.versionName}">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <!-- Permissions (auto-generated based on enabled features) -->
${permissions.join('\n')}

${hardwareFeatures.length > 0 ? hardwareFeatures.join('\n') : ''}

    <application
        android:label="${this.appName}"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="true"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:supportsRtl="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/SplashTheme">

        <!-- Splash Screen Activity -->
        <activity
            android:name=".SplashActivity"
            android:exported="true"
            android:theme="@style/SplashTheme"
            android:screenOrientation="${manifestOrientation}">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Main WebView Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="${this.features.deepLinking ? 'true' : 'false'}"
            android:theme="@style/AppTheme"
            android:configChanges="orientation|screenSize|keyboardHidden|keyboard|navigation"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:screenOrientation="${manifestOrientation}">
${this.features.deepLinking ? `            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${this.hostname}" />
                <data android:scheme="http" android:host="${this.hostname}" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${this.packageName}" />
            </intent-filter>` : ''}
        </activity>${this.features.admob ? `

        <!-- AdMob -->
        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy" />` : ''}

        <!-- File Provider for camera/downloads -->
        <provider
            android:name=".AppFileProvider"
            android:authorities="${this.packageName}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

        <!-- Background Push Service -->
        <service android:name=".PushJobService"
                 android:permission="android.permission.BIND_JOB_SERVICE"
                 android:exported="true" />
    </application>
</manifest>`)

        // ── Network Security Config ──
        this._write(path.join(xmlDir, 'network_security_config.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>`)

        // ── File Provider Paths ──
        this._write(path.join(xmlDir, 'file_paths.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<paths>
    <external-path name="external" path="." />
    <cache-path name="cache" path="." />
    <files-path name="files" path="." />
</paths>`)

        // ── Styles (Splash + App themes with fullscreen support) ──
        const fullscreenFlags = this.enableFullscreen ? `
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>` : `
        <item name="android:windowFullscreen">false</item>`

        this._write(path.join(valuesDir, 'styles.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="SplashTheme" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_background</item>
        <item name="android:statusBarColor">${this.statusBarColor}</item>
        <item name="android:navigationBarColor">${this.statusBarColor}</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">false</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>

    <style name="AppTheme" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">${this.statusBarColor}</item>
        <item name="android:navigationBarColor">${this.statusBarColor}</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:colorPrimary">${this.statusBarColor}</item>
        <item name="android:colorPrimaryDark">${this.statusBarColor}</item>
        <item name="android:colorAccent">${this.statusBarColor}</item>${fullscreenFlags}
    </style>
</resources>`)

        // ── Colors ──
        this._write(path.join(valuesDir, 'colors.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">${this.statusBarColor}</color>
    <color name="colorPrimaryDark">${this.statusBarColor}</color>
    <color name="colorAccent">#4fc3f7</color>
    <color name="splash_bg">${this.splashBgColor}</color>
    <color name="white">#FFFFFF</color>
</resources>`)

        // ── Strings ──
        this._write(path.join(valuesDir, 'strings.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${this.appName}</string>
</resources>`)

        // ── Splash screen drawable (API 21+ compatible — no android:width/height on <item>) ──
        this._write(path.join(drawableDir, 'splash_background.xml'),
            `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_bg" />
</layer-list>`)

        // ── Icon ──
        this._createIcon(baseDir)

        // ── Save user-uploaded splash image if provided ──
        let hasSplashImage = false
        let splashBuffer = null

        if (this.splashImageBase64 && this.splashImageBase64.startsWith('data:')) {
            try {
                const base64Data = this.splashImageBase64.split(',')[1]
                splashBuffer = Buffer.from(base64Data, 'base64')
            } catch (e) {
                console.log(`[BUILD ${this.buildId}] ⚠️ Failed to decode splash image data URL`)
            }
        } else if (this.splashImageBase64 && this.splashImageBase64.length > 100) {
            // Raw base64 from CI
            try {
                splashBuffer = Buffer.from(this.splashImageBase64, 'base64')
            } catch (e) {
                console.log(`[BUILD ${this.buildId}] ⚠️ Failed to decode raw splash image base64`)
            }
        }

        if (splashBuffer && splashBuffer.length > 100) {
            try {
                let ext = 'png'
                if (splashBuffer.length > 4) {
                    if (splashBuffer[0] === 0xFF && splashBuffer[1] === 0xD8 && splashBuffer[2] === 0xFF) ext = 'jpg'
                    else if (splashBuffer[0] === 0x52 && splashBuffer[1] === 0x49 && splashBuffer[2] === 0x46 && splashBuffer[3] === 0x46) ext = 'webp'
                }

                writeFileSync(path.join(drawableDir, `splash_custom.${ext}`), splashBuffer)
                // Also write to any other names referenced if needed, 
                // but SplashActivity uses splash_custom.
                hasSplashImage = true
                console.log(`[BUILD ${this.buildId}] 🖼️ Saved user splash image (${splashBuffer.length} bytes, ext: ${ext})`)
            } catch (e) {
                console.log(`[BUILD ${this.buildId}] ⚠️ Failed to write splash image file`)
            }
        }

        // ── SplashActivity.java — shows custom image if available, else default branded splash ──
        const splashImageCode = hasSplashImage
            ? `
        // User-provided splash image — display it full screen (CENTER_CROP)
        ImageView splashImg = new ImageView(this);
        splashImg.setImageResource(R.drawable.splash_custom);
        // CENTER_CROP covers the whole screen for a premium look
        splashImg.setScaleType(ImageView.ScaleType.CENTER_CROP);
        root.addView(splashImg, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));`
            : `
        // Default branded splash layout
        // Circle with app icon
        int circleSize = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 100, getResources().getDisplayMetrics());
        LinearLayout circle = new LinearLayout(this);
        circle.setGravity(Gravity.CENTER);
        GradientDrawable circleDrawable = new GradientDrawable();
        circleDrawable.setShape(GradientDrawable.OVAL);
        circleDrawable.setColor(0x44FFFFFF);
        circle.setBackground(circleDrawable);
        LinearLayout.LayoutParams circleParams = new LinearLayout.LayoutParams(circleSize, circleSize);
        circleParams.bottomMargin = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 24, getResources().getDisplayMetrics());

        // App icon inside circle
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        int iconSize = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 56, getResources().getDisplayMetrics());
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(iconSize, iconSize);
        circle.addView(icon, iconParams);
        root.addView(circle, circleParams);

        // App name text
        TextView nameView = new TextView(this);
        nameView.setText("${this.appName}");
        nameView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28);
        nameView.setTextColor(Color.WHITE);
        nameView.setTypeface(Typeface.DEFAULT_BOLD);
        nameView.setGravity(Gravity.CENTER);
        root.addView(nameView);

        // Loading text
        TextView loadingView = new TextView(this);
        loadingView.setText("Chargement...");
        loadingView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        loadingView.setTextColor(0x88FFFFFF);
        loadingView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams loadingParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        loadingParams.topMargin = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 12, getResources().getDisplayMetrics());
        root.addView(loadingView, loadingParams);`

        this._write(path.join(srcDir, 'SplashActivity.java'),
            `package ${this.packageName};
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
public class SplashActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar + nav bar color
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("${this.statusBarColor}"));
            window.setNavigationBarColor(Color.parseColor("${this.statusBarColor}"));
        }

        // Build splash layout
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("${this.splashBgColor}"));
${splashImageCode}

        setContentView(root);

        // Navigate to main activity after delay
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                startActivity(new Intent(SplashActivity.this, MainActivity.class));
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                finish();
            }
        }, 2000);
    }
}`)

        // ── AppFileProvider.java (for camera/file uploads) ──
        this._write(path.join(srcDir, 'AppFileProvider.java'),
            `package ${this.packageName};
import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.ProviderInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileNotFoundException;
public class AppFileProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    @Override public void attachInfo(Context context, ProviderInfo info) { super.attachInfo(context, info); }
    @Override public Cursor query(Uri uri, String[] p, String s, String[] sa, String so) { return null; }
    @Override public String getType(Uri uri) { return null; }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String s, String[] sa) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String s, String[] sa) { return 0; }
    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File file = new File(getContext().getCacheDir(), uri.getLastPathSegment());
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }
}`)

        // ── PushJobService.java (Native Background Notifications polling) ──
        this._write(path.join(srcDir, 'PushJobService.java'),
            `package ${this.packageName};
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

@SuppressLint("SpecifyJobSchedulerIdRange")
public class PushJobService extends JobService {
    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL("${this.apiUrl}/notifications/latest?appId=${this.buildId}");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(5000);
                    
                    if (conn.getResponseCode() == 200) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        reader.close();
                        
                        JSONObject n = new JSONObject(sb.toString());
                        String id = n.optString("id", null);
                        
                        if (id != null) {
                            SharedPreferences prefs = getSharedPreferences("S2A_PREFS", MODE_PRIVATE);
                            String last = prefs.getString("s2a_last_notif", "");
                            if (!last.equals(id)) {
                                prefs.edit().putString("s2a_last_notif", id).apply();
                                showLocalPush(id, n.optString("title", "Notification"), n.optString("body", ""));
                            }
                        }
                    }
                } catch (Exception e) {}
                jobFinished(params, false);
            }
        }).start();
        return true;
    }
    
    @Override
    public boolean onStopJob(JobParameters params) { return false; }
    
    private void showLocalPush(String id, String title, String body) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel("SITE2APP_PUSH", "Push Notifications", NotificationManager.IMPORTANCE_HIGH));
        }
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent, flags);
        
        Notification.Builder nb = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
            ? new Notification.Builder(this, "SITE2APP_PUSH") 
            : new Notification.Builder(this);
            
        int iconId = getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        nb.setContentTitle(title).setContentText(body).setSmallIcon(iconId == 0 ? android.R.drawable.ic_dialog_info : iconId)
          .setAutoCancel(true).setContentIntent(pi);
        nm.notify(id != null ? id.hashCode() : 1, nb.build());
    }
    
    public static void schedule(Context context) {
        JobScheduler js = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        JobInfo job = new JobInfo.Builder(101, new ComponentName(context, PushJobService.class))
            .setPeriodic(15 * 60 * 1000) // 15 mins
            .setPersisted(true)
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .build();
        js.schedule(job);
    }
}`)

        // ── MainActivity.java (full-featured WebView) ──
        this._write(path.join(srcDir, 'MainActivity.java'),
            `package ${this.packageName};
import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.DownloadListener;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
${this.features.pullToRefresh ? `import android.widget.ScrollView;
import android.view.ViewGroup;` : ''}
${this.features.popupSupport ? `import android.webkit.WebView.WebViewTransport;
import android.os.Message;` : ''}
${this.features.deepLinking ? '' : ''}

public class MainActivity extends Activity {
    public class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) { mContext = c; }
        
        @JavascriptInterface
        public void showNotification(String id, String title, String body) {
            NotificationManager nm = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel("SITE2APP_PUSH", "Push Notifications", NotificationManager.IMPORTANCE_HIGH);
                nm.createNotificationChannel(channel);
            }
            
            Intent intent = new Intent(mContext, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(mContext, 0, intent, flags);
            
            Notification.Builder nb;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                nb = new Notification.Builder(mContext, "SITE2APP_PUSH");
            } else {
                nb = new Notification.Builder(mContext);
            }
            
            int iconId = mContext.getResources().getIdentifier("ic_launcher", "mipmap", mContext.getPackageName());
            if(iconId == 0) iconId = android.R.drawable.ic_dialog_info;

            Notification n = nb.setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(iconId)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build();
                
            nm.notify(id != null ? id.hashCode() : 1, n);
            
            runOnUiThread(new Runnable() {
                public void run() {
                    // Optional toast Toast.makeText(mContext, "New notification: " + title, Toast.LENGTH_LONG).show();
                }
            });
        }
        
        @JavascriptInterface
        public void requestPushNotifications() {
            // Deprecated: Push notifications are now natively handled via auto-prompt on Android 13+
            // and FCM token registration in onCreate().
            runOnUiThread(new Runnable() {
                public void run() {
                    if (Build.VERSION.SDK_INT >= 33) {
                        if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                            requestPermissions(new String[]{ "android.permission.POST_NOTIFICATIONS" }, 1003);
                        }
                    }
                }
            });
        }
    }

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int PERMISSION_REQUEST = 1002;
${this.features.pullToRefresh ? `    private android.widget.FrameLayout swipeContainer;` : ''}
${this.features.popupSupport ? `    private WebView popupWebView;` : ''}

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar + navigation bar color
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("${this.statusBarColor}"));
            window.setNavigationBarColor(Color.parseColor("${this.statusBarColor}"));
            ${this.enableFullscreen ? `// Fullscreen immersive mode
            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);` : ''}
        }

        // Layout: ProgressBar on top of WebView
        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        layout.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 6);
        layout.addView(progressBar, pbParams);

        setContentView(layout);

${this.features.pullToRefresh ? `
        // ── Pull-to-refresh ──
        webView.setOnScrollChangeListener(new View.OnScrollChangeListener() {
            @Override
            public void onScrollChange(View v, int scrollX, int scrollY, int oldScrollX, int oldScrollY) {
                // Variable used for pull-to-refresh state tracking
            }
        });
        webView.setOverScrollMode(View.OVER_SCROLL_ALWAYS);
` : ''}
        setupWebView();
        requestPermissions();
        android.content.SharedPreferences prefs = getSharedPreferences("S2A_PREFS", android.content.Context.MODE_PRIVATE);
        String storedToken = prefs.getString("s2a_push_token", "");
        String baseUrl = "${this.appUrl}";
        if (!storedToken.isEmpty() && !baseUrl.contains("s2a_token=")) {
            baseUrl += (baseUrl.contains("?") ? "&" : "?") + "s2a_token=" + storedToken;
        }

${this.features.deepLinking ? `
        // ── Deep Linking — check if launched from an intent ──
        Intent launchIntent = getIntent();
        Uri launchData = launchIntent != null ? launchIntent.getData() : null;
        if (launchData != null && launchData.toString().length() > 0) {
            String lUrl = launchData.toString();
            if (!storedToken.isEmpty() && !lUrl.contains("s2a_token=")) {
                lUrl += (lUrl.contains("?") ? "&" : "?") + "s2a_token=" + storedToken;
            }
            webView.loadUrl(lUrl);
        } else {
            webView.loadUrl(baseUrl);
        }
` : `        webView.loadUrl(baseUrl);`}
        
        checkForUpdates();
    }
    
    private void checkForUpdates() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL("${this.apiUrl}/apps/check-update?package=${this.packageName}&versionCode=${this.versionCode}");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("User-Agent", "Site2App-Native-Android");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    
                    if (conn.getResponseCode() == 200) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        reader.close();
                        
                        JSONObject result = new JSONObject(sb.toString());
                        if (result.optBoolean("updateAvailable")) {
                            final String downloadUrl = result.optString("downloadUrl");
                            final String vName = result.optString("versionName");
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    new AlertDialog.Builder(MainActivity.this)
                                        .setTitle("Mise à jour disponible")
                                        .setMessage("Une nouvelle version de l'application (v" + vName + ") est requise. Voulez-vous télécharger la mise à jour ?")
                                        .setPositiveButton("Mettre à jour", new DialogInterface.OnClickListener() {
                                            public void onClick(DialogInterface dialog, int which) {
                                                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
                                                startActivity(browserIntent);
                                            }
                                        })
                                        .setNegativeButton("Plus tard", null)
                                        .setCancelable(false)
                                        .show();
                                }
                            });
                        }
                    }
                } catch (Exception e) {
                    // Fail silently
                }
            }
        }).start();
    }

    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setGeolocationEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " ${this.appName}/1.0");

${this.features.offlineMode ? `
        // ── Mode hors-ligne: cache agressif ──
        if (isNetworkAvailable()) {
            s.setCacheMode(WebSettings.LOAD_DEFAULT);
        } else {
            s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        }
        // Augmenter la taille du cache
        // setAppCacheEnabled is deprecated/removed in modern Android APIs
` : ''}
${this.features.popupSupport ? `
        // ── Support popups ──
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
` : ''}

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }
        CookieManager.getInstance().setAcceptCookie(true);
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                
                // Expose a requestPushNotifications so existing user scripts don't break
                ${this.features.pushNotifications ? `
                String script = "(function() { " +
                "  window.requestPushNotifications = function() { if(window.AndroidApp) window.AndroidApp.requestPushNotifications(); }; " +
                "})();";
                view.evaluateJavascript(script, null);
                
                // Ensure s2a_token stays in URL for SPA navigation
                String tokenSyncScript = "(function() { " +
                "  var token = null;" +
                "  try { " +
                "    var m = window.location.search.match(/s2a_token=([^&]+)/); " +
                "    if(m) token = m[1]; " +
                "  } catch(e) {} " +
                "  if(!token && window.SITE2APP_DEVICE_TOKEN) token = window.SITE2APP_DEVICE_TOKEN; " +
                "  if(!token) return; " +
                "  var patchHistory = function(method) { " +
                "    var orig = history[method]; " +
                "    history[method] = function(state, title, url) { " +
                "      if(url) { " +
                "        try { " +
                "          var u = new URL(url, window.location.href); " +
                "          if(!u.searchParams.has('s2a_token')) { " +
                "            u.searchParams.set('s2a_token', token); " +
                "            url = u.toString(); " +
                "          } " +
                "        } catch(e) {} " +
                "      } " +
                "      return orig.apply(this, [state, title, url]); " +
                "    }; " +
                "  }; " +
                "  if(!window.__s2a_patched) { " +
                "    patchHistory('pushState'); " +
                "    patchHistory('replaceState'); " +
                "    window.__s2a_patched = true; " +
                "  } " +
                "})();";
                view.evaluateJavascript(tokenSyncScript, null);
                ` : ""}
            }
${this.features.offlineMode ? `
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // Mode hors-ligne: afficher la page de fallback
                view.loadUrl("file:///android_asset/www/offline.html");
            }
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    view.loadUrl("file:///android_asset/www/offline.html");
                }
            }
` : ''}
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("whatsapp:") || url.startsWith("intent:")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) {}
                    return true;
                }
                
                android.content.SharedPreferences prefs = view.getContext().getSharedPreferences("S2A_PREFS", android.content.Context.MODE_PRIVATE);
                String storedToken = prefs.getString("s2a_push_token", "");
                if (!storedToken.isEmpty() && (url.startsWith("http://") || url.startsWith("https://"))) {
                    if (!url.contains("s2a_token=")) {
                        String newUrl = url + (url.contains("?") ? "&" : "?") + "s2a_token=" + storedToken;
                        view.loadUrl(newUrl);
                        return true;
                    }
                }
                return false;
            }
            // For older Android versions compatibility
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("whatsapp:") || url.startsWith("intent:")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) {}
                    return true;
                }
                
                android.content.SharedPreferences prefs = view.getContext().getSharedPreferences("S2A_PREFS", android.content.Context.MODE_PRIVATE);
                String storedToken = prefs.getString("s2a_push_token", "");
                if (!storedToken.isEmpty() && (url.startsWith("http://") || url.startsWith("https://"))) {
                    if (!url.contains("s2a_token=")) {
                        String newUrl = url + (url.contains("?") ? "&" : "?") + "s2a_token=" + storedToken;
                        view.loadUrl(newUrl);
                        return true;
                    }
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                if (progress >= 100) progressBar.setVisibility(View.GONE);
            }
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try { startActivityForResult(intent, FILE_CHOOSER_REQUEST); }
                catch (Exception e) { fileUploadCallback = null; return false; }
                return true;
            }
${this.features.popupSupport ? `
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView popupView = new WebView(MainActivity.this);
                popupView.getSettings().setJavaScriptEnabled(true);
                popupView.getSettings().setDomStorageEnabled(true);
                popupView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
                popupView.getSettings().setSupportMultipleWindows(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    CookieManager.getInstance().setAcceptThirdPartyCookies(popupView, true);
                }
                popupView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        ((FrameLayout) webView.getParent()).removeView(window);
                    }
                });
                popupView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        String popupUrl = request.getUrl().toString();
                        if (popupUrl.startsWith("tel:") || popupUrl.startsWith("mailto:") || popupUrl.startsWith("sms:")) {
                            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(popupUrl))); } catch (Exception e) {}
                            return true;
                        }
                        return false;
                    }
                });
                ((FrameLayout) webView.getParent()).addView(popupView, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
                WebViewTransport transport = (WebViewTransport) resultMsg.obj;
                transport.setWebView(popupView);
                resultMsg.sendToTarget();
                popupWebView = popupView;
                return true;
            }
            @Override
            public void onCloseWindow(WebView window) {
                if (popupWebView != null) {
                    ((FrameLayout) webView.getParent()).removeView(popupWebView);
                    popupWebView.destroy();
                    popupWebView = null;
                }
            }
` : ''}
        });

        // Downloads
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    request.setTitle(filename);
                    request.setDescription("Downloading...");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    request.setMimeType(mimetype);
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    if (dm != null) dm.enqueue(request);
                    Toast.makeText(MainActivity.this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ex) {}
                }
            }
        });
    }

    private void requestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.List<String> permsList = new java.util.ArrayList<>();
            ${this.features.camera ? `permsList.add(Manifest.permission.CAMERA); permsList.add(Manifest.permission.RECORD_AUDIO);` : ''}
            ${this.features.location ? `permsList.add(Manifest.permission.ACCESS_FINE_LOCATION);` : ''}
            ${this.features.pushNotifications ? `
            if (Build.VERSION.SDK_INT >= 33) {
                permsList.add("android.permission.POST_NOTIFICATIONS");
            }
            ` : ''}
            
            if (permsList.isEmpty()) return;
            
            String[] perms = permsList.toArray(new String[0]);
            boolean needRequest = false;
            for (String p : perms) {
                if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) { needRequest = true; break; }
            }
            if (needRequest) requestPermissions(perms, PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && fileUploadCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) results = new Uri[]{ Uri.parse(dataString) };
            }
            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
${this.features.popupSupport ? `
        if (popupWebView != null) {
            ((FrameLayout) webView.getParent()).removeView(popupWebView);
            popupWebView.destroy();
            popupWebView = null;
            return;
        }
` : ''}
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
${this.features.deepLinking ? `
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && webView != null) {
            webView.loadUrl(data.toString());
        }
    }
` : ''}
${this.features.offlineMode ? `
    private boolean isNetworkAvailable() {
        android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        android.net.NetworkInfo activeNetwork = cm != null ? cm.getActiveNetworkInfo() : null;
        return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
    }
` : ''}

    @Override
    protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }

    @Override
    protected void onPause() { super.onPause(); if (webView != null) webView.onPause(); }

    @Override
    protected void onDestroy() {
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}`)

        // ── assets/www/index.html (offline fallback) ──
        this._write(path.join(assetsDir, 'index.html'),
            `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${this.appName}</title></head><body>
<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:${this.splashBgColor};color:#fff;font-family:system-ui,sans-serif;text-align:center">
<div><h2>${this.appName}</h2><p>Chargement...</p></div></div>
<script>setTimeout(function(){location.href="${this.appUrl}"},1000)</script></body></html>`)

        // ── assets/www/offline.html (offline mode fallback page) ──
        if (this.features.offlineMode) {
            const offlineHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
                '<title>' + this.appName + ' - Hors-ligne</title>' +
                '<style>' +
                '*{margin:0;padding:0;box-sizing:border-box}' +
                'body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;' +
                'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);' +
                'color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}' +
                '.container{text-align:center;padding:2rem;max-width:400px}' +
                '.icon{width:80px;height:80px;margin:0 auto 1.5rem;background:rgba(255,255,255,0.1);' +
                'border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:2.5rem}' +
                'h1{font-size:1.5rem;margin-bottom:0.5rem;font-weight:700}' +
                'p{color:rgba(255,255,255,0.7);margin-bottom:2rem;line-height:1.6}' +
                '.btn{display:inline-flex;align-items:center;gap:8px;padding:0.875rem 2rem;' +
                'background:linear-gradient(135deg,#3461f5,#7c3aed);color:#fff;border:none;' +
                'border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;' +
                'box-shadow:0 4px 20px rgba(52,97,245,0.4);transition:transform 0.2s}' +
                '.btn:active{transform:scale(0.95)}' +
                '.dots{display:flex;gap:6px;justify-content:center;margin-top:2rem}' +
                '.dots span{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.3);animation:pulse 1.5s ease-in-out infinite}' +
                '.dots span:nth-child(2){animation-delay:0.3s}' +
                '.dots span:nth-child(3){animation-delay:0.6s}' +
                '@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}' +
                '</style></head><body>' +
                '<div class="container">' +
                '<div class="icon">📡</div>' +
                '<h1>Mode hors-ligne</h1>' +
                '<p>Impossible de se connecter. Vérifiez votre connexion et réessayez.</p>' +
                '<button class="btn" onclick="location.href=\'' + this.appUrl + '\'">🔄 Réessayer</button>' +
                '<div class="dots"><span></span><span></span><span></span></div>' +
                '</div>' +
                '<script>setInterval(function(){fetch(\'' + this.appUrl + '\',{mode:\'no-cors\',cache:\'no-store\'}).then(function(){location.href=\'' + this.appUrl + '\';}).catch(function(){});},5000);</script>' +
                '</body></html>'
            this._write(path.join(assetsDir, 'offline.html'), offlineHtml)
        }
    }

    async buildApk() {
        const hasFCMFeature = this.features && this.features.pushNotifications === true
        const hasConfig = !!this.googleServicesJson && this.googleServicesJson !== '{}'

        console.log(`[BUILD ${this.buildId}] 🔍 ANALYSE DU MODE DE BUILD: `)
        console.log(`[BUILD ${this.buildId}]- Feature Push: ${hasFCMFeature ? 'Activée' : 'Désactivée'} `)
        console.log(`[BUILD ${this.buildId}]- Config Google: ${hasConfig ? 'Présente' : 'Manquante'} `)

        if (hasFCMFeature && hasConfig) {
            console.log(`[BUILD ${this.buildId}] 🔨 DÉMARRAGE MODE GRADLE(Puissant, long)`)
            return await this._buildApkWithGradle()
        }

        if (hasFCMFeature && !hasConfig) {
            console.warn(`[BUILD ${this.buildId}] ⚠️ ATTENTION: Notifications demandées mais google - services.json MANQUANT!`)
        }

        console.log(`[BUILD ${this.buildId}] 💨 DÉMARRAGE MODE FAST(Simple, rapide)`)
        return await this._buildApkFast()
    }

    async _buildApkFast() {
        const safeName = this.appName.replace(/[^a-zA-Z0-9_-]/g, '_')
        const pkgPath = this.packageName.replace(/\./g, '/')

        console.log(`[BUILD ${this.buildId}] ══════════════════════════════════`)
        console.log(`[BUILD ${this.buildId}] 🚀 BUILD APK(SDK direct)`)
        console.log(`[BUILD ${this.buildId}]App:     ${this.appName} `)
        console.log(`[BUILD ${this.buildId}]URL:     ${this.appUrl} `)
        console.log(`[BUILD ${this.buildId}]Package: ${this.packageName} `)
        console.log(`[BUILD ${this.buildId}]Theme:   ${this.statusBarColor} `)
        console.log(`[BUILD ${this.buildId}] ══════════════════════════════════`)

        if (!this.javaHome || !this.sdk || !this.bt || !this.androidJar) {
            throw new Error('Environment manquant: JDK ou Android SDK')
        }

        const isWin = process.platform === 'win32'
        const exe = isWin ? '.exe' : ''
        const bat = isWin ? '.bat' : ''

        const aapt2 = path.join(this.bt, `aapt2${exe}`)
        const d8 = path.join(this.bt, isWin ? 'd8.bat' : 'd8')
        const zipalign = path.join(this.bt, `zipalign${exe}`)
        const javac = path.join(this.javaHome, 'bin', `javac${exe}`)
        const jar = path.join(this.javaHome, 'bin', `jar${exe}`)
        const keytool = path.join(this.javaHome, 'bin', `keytool${exe}`)
        const apksigner = path.join(this.bt, isWin ? 'apksigner.bat' : 'apksigner')

        // ── Clean entire build directory for total isolation ──
        if (existsSync(this.buildDir)) {
            try { fs.rmSync(this.buildDir, { recursive: true, force: true }); } catch (_) { }
        }

        const genDir = path.join(this.buildDir, 'gen')
        const objDir = path.join(this.buildDir, 'obj')
        const binDir = path.join(this.buildDir, 'bin')
        const compiledDir = path.join(this.buildDir, 'compiled_res')

        for (const d of [genDir, objDir, binDir, compiledDir]) {
            mkdirSync(d, { recursive: true })
        }

        // ── STEP 1: Generate all source files ──
        console.log(`[BUILD ${this.buildId}] 📝 Step 1: Source files + icons + splash`)
        this._prepareFiles(this.buildDir)

        // ── STEP 2: aapt2 compile ──
        console.log(`[BUILD ${this.buildId}] 📦 Step 2: aapt2 compile`)
        const resRoot = path.join(this.buildDir, 'res')
        this._run(`"${aapt2}" compile --dir "${resRoot}" -o "${compiledDir}"`)

        // ── STEP 3: aapt2 link ──
        console.log(`[BUILD ${this.buildId}] 🔗 Step 3: aapt2 link`)
        const flatFiles = readdirSync(compiledDir)
            .filter(f => f.endsWith('.flat'))
            .map(f => `"${path.join(compiledDir, f)}"`)
            .join(' ')
        const unalignedApk = path.join(binDir, 'unaligned.apk')

        this._run(
            `"${aapt2}" link -o "${unalignedApk}" -I "${this.androidJar}" --manifest "${path.join(this.buildDir, 'AndroidManifest.xml')}" --java "${genDir}" -A "${path.join(this.buildDir, 'assets')}" --auto-add-overlay ${flatFiles}`
        )

        // ── STEP 4: javac ──
        console.log(`[BUILD ${this.buildId}] ☕ Step 4: javac`)
        const srcDir = path.join(this.buildDir, 'src', this.packageName.replace(/\./g, '/'))
        const allJava = [...this._findFiles(srcDir, '.java'), ...this._findFiles(genDir, '.java')]
        // Deduplicate by basename to prevent "defined multiple times"
        const seen = new Set()
        const uniqueJava = allJava.filter(f => {
            const base = path.basename(f)
            if (seen.has(base)) return false
            seen.add(base)
            return true
        })
        const javaStr = uniqueJava.map(f => `"${f}"`).join(' ')
        this._run(`"${javac}" -source 1.8 -target 1.8 -bootclasspath "${this.androidJar}" -classpath "${this.androidJar}" -d "${objDir}" ${javaStr}`)

        // ── STEP 5: d8 (via intermediate jar to prevent cross-platform command line bugs) ──
        console.log(`[BUILD ${this.buildId}] 🔄 Step 5: d8`)
        
        // 5.1: Package classes into a temporary jar
        const tempJar = path.join(binDir, 'temp_classes.jar')
        this._run(`"${jar}" cvf "${tempJar}" -C "${objDir}" .`)
        
        // 5.2: Convert jar to DEX using d8
        this._run(`"${d8}" --release --min-api 21 --output "${binDir}" "${tempJar}"`)

        if (!existsSync(path.join(binDir, 'classes.dex'))) throw new Error('classes.dex not generated')

        // ── STEP 6: Add dex to APK ──
        console.log(`[BUILD ${this.buildId}] 📥 Step 6: Add DEX`)
        this._run(`"${jar}" uf "${unalignedApk}" -C "${binDir}" classes.dex`)

        // ── STEP 7: zipalign ──
        console.log(`[BUILD ${this.buildId}] 📐 Step 7: zipalign`)
        const alignedApk = path.join(binDir, 'aligned.apk')
        this._run(`"${zipalign}" -f 4 "${unalignedApk}" "${alignedApk}"`)

        // ── STEP 8: Sign with apksigner (v1+v2+v3) ──
        console.log(`[BUILD ${this.buildId}] 🔑 Step 8: apksigner(v1 + v2 + v3)`)

        const ks = path.join(__dirname, 'site2app.keystore')
        const finalApk = path.join(this.buildDir, `${safeName}.apk`)

        if (!existsSync(ks)) {
            console.error(`[BUILD ${this.buildId}] CRITICAL: Static keystore missing at ${ks}! Signature failed.`);
            throw new Error('Static keystore missing.');
        } else {
            console.log(`[BUILD ${this.buildId}] Using static keystore for package ${this.packageName}`)
        }

        copyFileSync(alignedApk, finalApk)
        this._run(`"${apksigner}" sign --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --min-sdk-version 24 --ks "${ks}" --ks-pass pass:android --ks-key-alias app "${finalApk}"`)
        this._run(`"${apksigner}" verify --verbose "${finalApk}"`)

        // Cleanup intermediate APKs to prevent download confusion
        try { fs.unlinkSync(alignedApk); } catch (_) { }
        try { fs.unlinkSync(unalignedApk); } catch (_) { }

        const stat = await fsp.stat(finalApk)
        console.log(`[BUILD ${this.buildId}] ✅ APK: ${safeName}.apk(${(stat.size / 1024).toFixed(1)} Ko)`)

        return { buildId: this.buildId, apkPath: finalApk, fileName: `${safeName}.apk`, size: stat.size, type: 'compiled' }
    }

    async _ensureGradle() {
        const gradleDir = path.join(__dirname, '../../storage/gradle');
        const isWin = process.platform === 'win32';
        const gradlePath = path.join(gradleDir, 'gradle-8.5', 'bin', isWin ? 'gradle.bat' : 'gradle');
        if (fs.existsSync(gradlePath)) return gradlePath;

        console.log(`[BUILD ${this.buildId}] 🌍 Downloading Gradle 8.5...`);
        fs.mkdirSync(gradleDir, { recursive: true });
        const zipPath = path.join(gradleDir, 'gradle.zip');

        return new Promise((resolve, reject) => {
            try {
                execSync(`curl -L -o "${zipPath}" "https://services.gradle.org/distributions/gradle-8.5-bin.zip"`);
                console.log(`[BUILD ${this.buildId}] 📦 Extracting Gradle...`);
                if (isWin) {
                    execSync(`powershell Expand-Archive -Path "${zipPath}" -DestinationPath "${gradleDir}" -Force`);
                } else {
                    execSync(`unzip -o "${zipPath}" -d "${gradleDir}"`);
                }
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                
                if (!isWin) {
                    execSync(`chmod +x "${gradlePath}"`);
                }
                
                resolve(gradlePath);
            } catch (err) {
                console.error(`[BUILD ${this.buildId}] ❌ Error installing Gradle: `, err.message);
                reject(err);
            }
        });
    }

    async _buildApkWithGradle() {
        const safeName = this.appName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const pkgPath = this.packageName.replace(/\./g, '/');

        console.log(`[BUILD ${this.buildId}] ══════════════════════════════════`);
        console.log(`[BUILD ${this.buildId}] 🔥 BUILD APK(FCM Gradle Mode)`);
        console.log(`[BUILD ${this.buildId}] ══════════════════════════════════`);

        if (!this.javaHome || !this.sdk) throw new Error('Environment manquant: JDK ou Android SDK');

        const gradleBat = await this._ensureGradle();

        // ── Clean entire build directory for total isolation ──
        if (fs.existsSync(this.buildDir)) {
            try { fs.rmSync(this.buildDir, { recursive: true, force: true }); } catch (_) { }
        }

        // Setup directories
        const appDir = path.join(this.buildDir, 'app');
        const srcMain = path.join(appDir, 'src', 'main');
        const javaDir = path.join(srcMain, 'java');
        const resDir = path.join(srcMain, 'res');
        const assetsDir = path.join(srcMain, 'assets', 'www');

        // Create standard Gradle directories
        fs.mkdirSync(javaDir, { recursive: true });
        fs.mkdirSync(resDir, { recursive: true });
        fs.mkdirSync(assetsDir, { recursive: true });

        // Use our existing method to prep all files dynamically into a temp dir
        const tempRawDir = path.join(this.buildDir, 'temp_raw');
        this._prepareFiles(tempRawDir);

        // Sanitize MainActivity for Gradle: remove ALL PushJobService references
        const rawMain = path.join(tempRawDir, 'src', pkgPath, 'MainActivity.java');
        if (fs.existsSync(rawMain)) {
            let srcContent = fs.readFileSync(rawMain, 'utf8');
            // Remove any line that references PushJobService
            srcContent = srcContent.split('\n').filter(line => !line.includes('PushJobService')).join('\n');
            // Inject Firebase topic subscriptions AND token registration
            const tokenRegCode = `super.onCreate(savedInstanceState);
if (android.os.Build.VERSION.SDK_INT >= 33) {
    if (androidx.core.content.ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
        androidx.core.app.ActivityCompat.requestPermissions(this, new String[]{ "android.permission.POST_NOTIFICATIONS"}, 101);
    }
}
try {
    com.google.firebase.messaging.FirebaseMessaging.getInstance().subscribeToTopic("all-all");
    com.google.firebase.messaging.FirebaseMessaging.getInstance().subscribeToTopic("${this.buildId}-all");
    com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken().addOnCompleteListener(new com.google.android.gms.tasks.OnCompleteListener < String > () {
                @Override
        public void onComplete(com.google.android.gms.tasks.Task < String > task) {
        if(!task.isSuccessful()) return;
                    final String token = task.getResult();
                    android.util.Log.d("S2A_PUSH", "Token obtained: " + token);
    new Thread(new Runnable() {
        public void run() {
        try {
            // 1. Enregistrement direct sur Bubble (anti-doublon: cherche d'abord si le token existe)
            if (!"${this.bubbleApiUrl}".isEmpty()) {
                android.util.Log.d("S2A_PUSH", "Registering to Bubble: ${this.bubbleApiUrl}");
                
                // Step A: Search for existing device with same pushToken
                String searchConstraint = "[{\\"key\\":\\"pushToken\\",\\"constraint_type\\":\\"equals\\",\\"value\\":\\"" + token + "\\"}]";
                String encodedConstraint = java.net.URLEncoder.encode(searchConstraint, "utf-8");
                java.net.URL searchUrl = new java.net.URL("${this.bubbleApiUrl}/device?constraints=" + encodedConstraint);
                java.net.HttpURLConnection searchConn = (java.net.HttpURLConnection) searchUrl.openConnection();
                searchConn.setRequestMethod("GET");
                searchConn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                searchConn.setRequestProperty("Authorization", "Bearer ${this.bubbleApiToken}");
                searchConn.setRequestProperty("User-Agent", "Site2App-Native-Android");
                
                int searchCode = searchConn.getResponseCode();
                String existingId = null;
                
                if (searchCode == 200) {
                    java.io.InputStream is = searchConn.getInputStream();
                    java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(is, "utf-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    String responseBody = sb.toString();
                    // Simple JSON parsing: find "_id" in first result
                    if (responseBody.contains("\\"_id\\"")) {
                        int idx = responseBody.indexOf("\\"_id\\":\\"");
                        if (idx > 0) {
                            int start = idx + 7;
                            int end = responseBody.indexOf("\\"", start);
                            if (end > start) existingId = responseBody.substring(start, end);
                        }
                    }
                }
                
                if (existingId != null && !existingId.isEmpty()) {
                    // Step B: Device exists -> PATCH to update timestamp
                    android.util.Log.d("S2A_PUSH", "Device already registered, updating: " + existingId);
                    java.net.URL patchUrl = new java.net.URL("${this.bubbleApiUrl}/device/" + existingId);
                    java.net.HttpURLConnection patchConn = (java.net.HttpURLConnection) patchUrl.openConnection();
                    patchConn.setRequestMethod("PATCH");
                    patchConn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    patchConn.setRequestProperty("Authorization", "Bearer ${this.bubbleApiToken}");
                    patchConn.setRequestProperty("User-Agent", "Site2App-Native-Android");
                    patchConn.setDoOutput(true);
                    String patchJson = "{\\"pushToken\\": \\"" + token + "\\", \\"os\\": \\"android\\"}";
                    try(java.io.OutputStream os = patchConn.getOutputStream()) {
                        os.write(patchJson.getBytes("utf-8"), 0, patchJson.length());
                    }
                    android.util.Log.d("S2A_PUSH", "Bubble PATCH response: " + patchConn.getResponseCode());
                } else {
                    // Step C: Device does not exist -> POST to create
                    android.util.Log.d("S2A_PUSH", "New device, creating entry");
                    java.net.URL createUrl = new java.net.URL("${this.bubbleApiUrl}/device");
                    java.net.HttpURLConnection createConn = (java.net.HttpURLConnection) createUrl.openConnection();
                    createConn.setRequestMethod("POST");
                    createConn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    createConn.setRequestProperty("Authorization", "Bearer ${this.bubbleApiToken}");
                    createConn.setRequestProperty("User-Agent", "Site2App-Native-Android");
                    createConn.setDoOutput(true);
                    String jsonInputString = "{\\"pushToken\\": \\"" + token + "\\", \\"buildId\\": \\"${this.buildId}\\", \\"os\\": \\"android\\"}";
                    try(java.io.OutputStream os = createConn.getOutputStream()) {
                        os.write(jsonInputString.getBytes("utf-8"), 0, jsonInputString.length());
                    }
                    android.util.Log.d("S2A_PUSH", "Bubble POST response: " + createConn.getResponseCode());
                }
            }
            
            // 2. Enregistrement sur le backend Node (pour routage FCM)
            if (!"${this.apiUrl}".isEmpty()) {
                android.util.Log.d("S2A_PUSH", "Registering to Node: ${this.apiUrl}");
                java.net.URL nodeUrl = new java.net.URL("${this.apiUrl}/devices/register");
                java.net.HttpURLConnection nodeConn = (java.net.HttpURLConnection) nodeUrl.openConnection();
                nodeConn.setRequestMethod("POST");
                nodeConn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                nodeConn.setRequestProperty("User-Agent", "Site2App-Native-Android");
                nodeConn.setDoOutput(true);
                String nodeJson = "{\\"deviceId\\": \\"" + token + "\\", \\"buildId\\": \\"${this.buildId}\\", \\"os\\": \\"android\\"}";
                try(java.io.OutputStream os = nodeConn.getOutputStream()) {
                    os.write(nodeJson.getBytes("utf-8"), 0, nodeJson.length());
                }
                android.util.Log.d("S2A_PUSH", "Node response: " + nodeConn.getResponseCode());
            }
        } catch (Exception e) { android.util.Log.e("S2A_PUSH", "Registration error", e); }
                        }
                    }).start();

runOnUiThread(new Runnable() {
    public void run() {
    try {
        android.content.SharedPreferences pr = getSharedPreferences("S2A_PREFS", android.content.Context.MODE_PRIVATE);
        String oldToken = pr.getString("s2a_push_token", "");
        if (!oldToken.equals(token)) {
            pr.edit().putString("s2a_push_token", token).apply();
            if(webView != null) {
                String currentUrl = webView.getUrl();
                if (currentUrl != null && !currentUrl.contains("s2a_token=")) {
                    String newUrl = currentUrl + (currentUrl.contains("?") ? "&" : "?") + "s2a_token=" + token;
                    webView.loadUrl(newUrl);
                }
            }
        }
        if(webView != null) {
            String script = "(function() { window.SITE2APP_DEVICE_TOKEN = '" + token + "'; })();";
            webView.evaluateJavascript(script, null);
        }
        // Small toast for visual confirmation during debug if needed:
        // Toast.makeText(MainActivity.this, "Appareil prêt pour les notifications", Toast.LENGTH_SHORT).show();
    } catch (Exception e) { }
    }
});
                }
            });
        } catch (Exception e) { } `;
            srcContent = srcContent.replace('super.onCreate(savedInstanceState);', tokenRegCode);
            fs.writeFileSync(rawMain, srcContent, 'utf8');
        }

        // Copy everything from temp_raw/res -> app/src/main/res
        try {
            await fsp.cp(path.join(tempRawDir, 'res'), resDir, { recursive: true });
            await fsp.cp(path.join(tempRawDir, 'assets', 'www'), assetsDir, { recursive: true });
            await fsp.cp(path.join(tempRawDir, 'src'), javaDir, { recursive: true });
        } catch (e) {
            console.error("Copy failed", e);
        }

        // Generate AndroidManifest for Gradle (start with the one from _prepareFiles and add FCM service)
        const manifestPath = path.join(tempRawDir, 'AndroidManifest.xml');
        let manifestContent = fs.readFileSync(manifestPath, 'utf8');

        // Remove PushJobService which is native-poll specific
        manifestContent = manifestContent.replace(/<service android:name="\.PushJobService"[\s\S]*?<\/service>/, '');

        // Add FCM Service before </application>
        const fcmServiceXml = `
        <service android:name=".MyFirebaseMessagingService" android:exported="true">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>`;
        manifestContent = manifestContent.replace('</application>', fcmServiceXml + '\n    </application>');

        this._write(path.join(srcMain, 'AndroidManifest.xml'), manifestContent);

        // Modify google-services.json to match the current package name if needed
        let modifiedGoogleServices = this.googleServicesJson;
        try {
            const parsed = JSON.parse(modifiedGoogleServices);
            if (parsed.client && parsed.client.length > 0) {
                const hasMatchingClient = parsed.client.some(c => c.client_info && c.client_info.android_client_info && c.client_info.android_client_info.package_name === this.packageName);
                if (!hasMatchingClient) {
                    let newClient = JSON.parse(JSON.stringify(parsed.client[0]));
                    if (newClient.client_info && newClient.client_info.android_client_info) {
                        newClient.client_info.android_client_info.package_name = this.packageName;
                        parsed.client.push(newClient);
                        modifiedGoogleServices = JSON.stringify(parsed, null, 2);
                    }
                }
            }
        } catch (e) { }
        this._write(path.join(appDir, 'google-services.json'), modifiedGoogleServices);

        // ── Ensure resources are copied correctly ──
        // This ensures Styles, Colors, and Strings from _prepareFiles are used
        // which contains the proper Splash Screen branding.
        const gradleValuesDir = path.join(resDir, 'values');
        mkdirSync(gradleValuesDir, { recursive: true });
        
        // No need to manually write Styles/Colors/Strings here anymore as they are copied from tempRawDir
        // BUT we need to make sure we don't have conflicts.
        // Actually, cp already did the job.

        // ── Ensure splash drawable exists ──
        const gradleDrawableDir = path.join(resDir, 'drawable');
        fs.mkdirSync(gradleDrawableDir, { recursive: true });
        // Make sure splash_background.xml is there (it was copied, but just in case)
        if (!fs.existsSync(path.join(gradleDrawableDir, 'splash_background.xml'))) {
            this._write(path.join(gradleDrawableDir, 'splash_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_bg" />
</layer-list>`);
        }

        // Inject FCM Java Service
        const fcmService = `package ${this.packageName};
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
                    // Lire les data-only messages (garantit un appel en premier plan ET en arrière-plan)
                    String title = "Notification";
                    String body = "";

        if (remoteMessage.getData().size() > 0) {
            title = remoteMessage.getData().get("title") != null ? remoteMessage.getData().get("title") : "Notification";
            body = remoteMessage.getData().get("body") != null ? remoteMessage.getData().get("body") : "";
        }

        // Fallback sur le notification payload classique si présent 
        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null) title = remoteMessage.getNotification().getTitle();
            if (remoteMessage.getNotification().getBody() != null) body = remoteMessage.getNotification().getBody();
        }
        
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        NotificationChannel channel = new NotificationChannel("default", "Notifications", NotificationManager.IMPORTANCE_HIGH);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            manager.createNotificationChannel(channel);
        }
        
                    Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    PendingIntent pi = PendingIntent.getActivity(this, (int) System.currentTimeMillis(), intent, PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "default")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

                    // ID unique basé sur le timestamp pour éviter l'écrasement
                    int notifId = (int)(System.currentTimeMillis() % Integer.MAX_VALUE);
        manager.notify(notifId, builder.build());
    }

    @Override
    public void onNewToken(String token) {
        android.util.Log.d("FCM", "Refreshed token: " + token);
        final String t = token;
        new Thread(new Runnable() {
            public void run() {
            try {
                java.net.URL url = new java.net.URL("${this.bubbleApiUrl}/device");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Authorization", "Bearer ${this.bubbleApiToken}");
                conn.setRequestProperty("User-Agent", "Site2App-Native-Android");
                conn.setDoOutput(true);
                String jsonInputString = "{\\"pushToken\\": \\"" + t + "\\", \\"buildId\\": \\"${this.buildId}\\", \\"os\\": \\"android\\"}";
        try(java.io.OutputStream os = conn.getOutputStream()) {
            byte[] input = jsonInputString.getBytes("utf-8");
            os.write(input, 0, input.length);
        }
        conn.getResponseCode();
    } catch(Exception e) { }
}
        }).start();
    }
} `;
        this._write(path.join(javaDir, pkgPath, 'MyFirebaseMessagingService.java'), fcmService);

        // Remove PushJobService which is native-poll specific
        const pushJobPath = path.join(javaDir, pkgPath, 'PushJobService.java');
        if (fs.existsSync(pushJobPath)) fs.unlinkSync(pushJobPath);

        // ── CRITICAL: gradle.properties (AndroidX + Jetifier required by Firebase) ──
        this._write(path.join(this.buildDir, 'gradle.properties'), `
android.useAndroidX = true
android.enableJetifier = true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
    `);

        // ── local.properties (SDK path) ──
        const sdkPathForGradle = this.sdk.replace(/\\/g, '/');
        this._write(path.join(this.buildDir, 'local.properties'), `sdk.dir=${sdkPathForGradle}\n`);

        // Write settings.gradle
        this._write(path.join(this.buildDir, 'settings.gradle'), `include ':app'`);
        // Write build.gradle (project)
        this._write(path.join(this.buildDir, 'build.gradle'), `
buildscript {
    repositories { google(); mavenCentral() }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.4'
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
allprojects {
    repositories { google(); mavenCentral() }
}
`);
        // Write app/build.gradle
        this._write(path.join(appDir, 'build.gradle'), `
plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services'
}

android {
    namespace '${this.packageName}'
    compileSdk 34
    defaultConfig {
        applicationId "${this.packageName}"
        minSdk 24
        targetSdk 34
        versionCode ${this.versionCode}
        versionName "${this.versionName}"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'androidx.core:core:1.12.0'
    // Force unified Kotlin stdlib to prevent duplicate class conflicts
    implementation(platform("org.jetbrains.kotlin:kotlin-bom:1.8.22"))
${this.features.admob ? `    implementation 'com.google.android.gms:play-services-ads:22.6.0'` : ''}
}

configurations.all {
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
}
`);

        try {
            console.log(`[BUILD ${this.buildId}] 🔨 Compiling via Gradle... (can take several minutes)`);
            this._run(`"${gradleBat}" assembleRelease -Dorg.gradle.daemon=false --no-daemon --stacktrace`, this.buildDir);

            const apkGenerated = path.join(appDir, 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk');
            const apkAligned = path.join(this.buildDir, 'app-aligned.apk');
            const finalApk = path.join(this.buildDir, `${safeName}.apk`);

            const bt = findBuildTools(this.sdk);
            const javaHome = this.javaHome;

            this._run(`"${path.join(bt, 'zipalign')}" -f -v -p 4 "${apkGenerated}" "${apkAligned}"`);

            const ksPath = path.join(__dirname, 'site2app.keystore');

            if (!fs.existsSync(ksPath)) {
                console.error(`[BUILD ${this.buildId}] CRITICAL: Static keystore missing at ${ksPath}! Signature failed.`);
                throw new Error('Static keystore missing.');
            } else {
                console.log(`[BUILD ${this.buildId}] Using static keystore for package ${this.packageName}`);
            }

            fs.copyFileSync(apkAligned, finalApk);
            this._run(`"${path.join(bt, 'apksigner')}" sign --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --min-sdk-version 24 --ks "${ksPath}" --ks-pass pass:android --ks-key-alias app "${finalApk}"`);
            this._run(`"${path.join(bt, 'apksigner')}" verify --verbose "${finalApk}"`);

            // ── CRITICAL: Remove intermediate APKs to prevent download confusion ──
            try { fs.unlinkSync(apkAligned); } catch (_) { }
            // Also clean up the entire app/build directory (Gradle intermediates)
            try { fs.rmSync(path.join(appDir, 'build'), { recursive: true, force: true }); } catch (_) { }

            const stat = await fsp.stat(finalApk);
            console.log(`[BUILD ${this.buildId}] ✅ Succès(FCM Injected).`);
            return { buildId: this.buildId, apkPath: finalApk, fileName: `${safeName}.apk`, size: stat.size, type: 'compiled' };
        } catch (e) {
            console.error(`[BUILD ${this.buildId}] ❌ BUILD FAILED: `, e);
            throw e;
        }
    }
}

export default Builder
