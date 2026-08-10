const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;

// Load config
let config = {
  appUrl: 'https://example.com',
  appName: 'My App',
  buildId: 'test',
};

try {
  const configPath = path.join(__dirname, 'app-config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.error('Failed to load config:', e);
}

// CRITICAL: Create app-update.yml in a writable location.
// electron-builder with -p never does NOT generate this file,
// but electron-updater requires it. C:\Program Files is read-only,
// so we write to AppData (userData) instead and redirect autoUpdater.
const backendBase = config.backendUrl || 'https://site2app.online';
const feedUrl = `${backendBase.replace(/\/node$/, '')}/node/desktop/updates/${config.buildId}/windows`;

try {
  const userDataDir = app.getPath('userData');
  const appUpdateYmlPath = path.join(userDataDir, 'app-update.yml');
  // Always recreate to ensure URL is up-to-date
  const ymlContent = `provider: generic\nurl: "${feedUrl}"\nupdaterCacheDirName: "${(config.appName || 'site2app').replace(/[^a-zA-Z0-9]/g, '')}-updater"`;
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(appUpdateYmlPath, ymlContent, 'utf-8');
  console.log('Created app-update.yml at', appUpdateYmlPath);
  
  // Point electron-updater to the writable copy
  autoUpdater.updateConfigPath = appUpdateYmlPath;
} catch (e) {
  console.error('Failed to create app-update.yml:', e);
}

// Auto-updater configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.setFeedURL({
  provider: 'generic',
  url: feedUrl
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('error', (err) => {
  console.error('Erreur de mise à jour:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    const percent = Math.round(progressObj.percent);
    const speed = Math.round(progressObj.bytesPerSecond / 1024 / 1024 * 10) / 10;
    
    // Inject a premium glassmorphism progress widget in the bottom right corner
    mainWindow.webContents.executeJavaScript(`
      (function() {
        let pb = document.getElementById('s2a-update-progress');
        if (!pb) {
          pb = document.createElement('div');
          pb.id = 's2a-update-progress';
          pb.style.position = 'fixed';
          pb.style.bottom = '20px';
          pb.style.right = '20px';
          pb.style.background = 'rgba(15, 23, 42, 0.85)';
          pb.style.backdropFilter = 'blur(12px)';
          pb.style.WebkitBackdropFilter = 'blur(12px)';
          pb.style.color = 'white';
          pb.style.padding = '16px 20px';
          pb.style.borderRadius = '16px';
          pb.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25), 0 1px 3px rgba(255,255,255,0.1) inset';
          pb.style.zIndex = '2147483647';
          pb.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
          pb.style.display = 'flex';
          pb.style.flexDirection = 'column';
          pb.style.gap = '10px';
          pb.style.width = '300px';
          pb.style.opacity = '0';
          pb.style.transform = 'translateY(10px)';
          pb.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
          
          pb.innerHTML = \`
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; letter-spacing: 0.3px;">
              <span>Mise à jour en cours...</span>
              <span id="s2a-percent" style="color: #60a5fa;">0%</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.15); border-radius: 999px; overflow: hidden;">
              <div id="s2a-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 999px; transition: width 0.2s ease;"></div>
            </div>
            <div style="font-size: 11px; color: #94a3b8; text-align: right; font-weight: 500;" id="s2a-speed">Calcul...</div>
          \`;
          document.body.appendChild(pb);
          
          // Animate in
          requestAnimationFrame(() => {
            pb.style.opacity = '1';
            pb.style.transform = 'translateY(0)';
          });
        }
        document.getElementById('s2a-percent').innerText = '${percent}%';
        document.getElementById('s2a-bar').style.width = '${percent}%';
        document.getElementById('s2a-speed').innerText = '${speed} Mo/s';
      })();
    `).catch(e => console.error('Failed to inject progress', e));
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  if (mainWindow) {
    // Remove the progress widget
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const pb = document.getElementById('s2a-update-progress');
        if (pb) {
          pb.style.opacity = '0';
          pb.style.transform = 'translateY(10px)';
          setTimeout(() => pb.remove(), 400);
        }
      })();
    `).catch(e => console.error(e));

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise à jour prête',
      message: 'La nouvelle version a été téléchargée en arrière-plan.\nVoulez-vous l\'installer maintenant ?',
      buttons: ['Redémarrer et Installer', 'Plus tard'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: config.appName,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Fullscreen feature
  if (config.features && config.features.fullscreen) {
    mainWindow.setFullScreen(true);
  }

  // Load splash screen first
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates shortly after showing window
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.error('Failed to check for updates:', err);
      });
    }, 3000);
  });

  // Start loading the main URL
  const mainUrl = process.env.APP_URL || config.appUrl;
  
  setTimeout(() => {
    mainWindow.loadURL(mainUrl).catch(err => {
      console.error('Failed to load main URL:', err);
    });
  }, 1000);

  // ProgressBar feature (on page load)
  if (config.features && config.features.progressBar) {
    mainWindow.webContents.on('did-start-loading', () => {
      mainWindow.webContents.executeJavaScript(`
        (function() {
          if (!document.getElementById('s2a-page-progress')) {
            const pb = document.createElement('div');
            pb.id = 's2a-page-progress';
            pb.style.position = 'fixed';
            pb.style.top = '0';
            pb.style.left = '0';
            pb.style.height = '3px';
            pb.style.backgroundColor = '#3461f5';
            pb.style.width = '10%';
            pb.style.zIndex = '999999';
            pb.style.transition = 'width 0.3s, opacity 0.3s';
            document.body.appendChild(pb);
            
            let width = 10;
            pb.dataset.interval = setInterval(() => {
              if (width < 90) {
                width += Math.random() * 10;
                pb.style.width = width + '%';
              }
            }, 500);
          }
        })();
      `).catch(e => {});
    });

    mainWindow.webContents.on('did-stop-loading', () => {
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const pb = document.getElementById('s2a-page-progress');
          if (pb) {
            clearInterval(pb.dataset.interval);
            pb.style.width = '100%';
            setTimeout(() => {
              pb.style.opacity = '0';
              setTimeout(() => pb.remove(), 300);
            }, 300);
          }
        })();
      `).catch(e => {});
    });
  }

  // Custom CSS/JS
  mainWindow.webContents.on('did-finish-load', () => {
    if (config.customCss) {
      mainWindow.webContents.insertCSS(config.customCss).catch(e => console.error('Custom CSS error:', e));
    }
    if (config.customJs) {
      mainWindow.webContents.executeJavaScript(config.customJs).catch(e => console.error('Custom JS error:', e));
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes(new URL(mainUrl).hostname)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F5') {
      mainWindow.reload();
      event.preventDefault();
    }
    if (input.key === 'ArrowLeft' && input.alt) {
      if (mainWindow.webContents.canGoBack()) {
        mainWindow.webContents.goBack();
      }
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  // Initialize SSE Push Notifications if enabled
  if (config.features && config.features.pushNotifications) {
    const http = require('http');
    const https = require('https');
    
    function listenToSSE() {
      const backendUrl = config.backendUrl || 'https://site2app.online';
      const url = backendUrl + '/node/notifications/stream/' + (config.buildId || 'all');
      const lib = url.startsWith('https') ? https : http;
      
      const req = lib.get(url, (res) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          let lines = buffer.split('\\n');
          buffer = lines.pop(); // keep the last incomplete part in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.type === 'notification' && data.payload) {
                  const { Notification } = require('electron');
                  if (Notification.isSupported()) {
                    const notif = new Notification({
                      title: data.payload.title,
                      body: data.payload.body,
                      icon: path.join(__dirname, 'build', 'icon.png')
                    });
                    
                    notif.on('click', () => {
                      if (mainWindow) {
                        if (mainWindow.isMinimized()) mainWindow.restore();
                        mainWindow.show();
                        mainWindow.focus();
                        if (data.payload.url) {
                          mainWindow.loadURL(data.payload.url);
                        }
                      }
                    });
                    
                    notif.show();
                  }
                }
              } catch(e) {}
            }
          }
        });
      });
      
      req.on('error', (e) => {
        setTimeout(listenToSSE, 10000); // retry in 10s
      });
    }
    
    listenToSSE();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
