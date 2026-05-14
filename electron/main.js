const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
const xvdToolPath = path.join(__dirname, '..', 'Xvd', 'XvdTool.Streaming.exe');
const onlineFixDir = path.join(__dirname, '..', 'OnlineFix');
const isDev = !app.isPackaged;
const appVersion = require('../package.json').version;

function log(...args) {
  const msg = args.join(' ');
  console.log(msg);
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send('console_log', msg); } catch {}
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for window controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// IPC Handler - Get Game Pass games
ipcMain.handle('get_gamepass_games', async () => {
  try {
    const options = {
      hostname: 'raw.githubusercontent.com',
      path: '/MidacoYT/Games/refs/heads/main/games.json',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Xbox-Downloader/1.0'
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            let gameIds = [];
            if (Array.isArray(data)) {
              const seen = new Set();
              gameIds = data
                .filter(item => item.productId && item.productId.trim() !== '')
                .filter(item => {
                  if (seen.has(item.productId)) return false;
                  seen.add(item.productId);
                  return true;
                })
                .map((item) => ({
                  id: item.productId,
                  name: item.name || 'Unknown Game'
                }));
            } else if (data.Products && Array.isArray(data.Products)) {
              gameIds = data.Products.map((p) => ({ id: p.ProductId }));
            } else if (data.items && Array.isArray(data.items)) {
              gameIds = data.items.filter(item => item.productId).map((p) => ({ id: p.productId }));
            }
            resolve(gameIds);
          } catch (error) {
            console.error('[Games] JSON parse error:', error instanceof SyntaxError ? error.message : error);
            resolve([]);
          }
        });
      });
      req.on('error', () => resolve([]));
      req.end();
    });
  } catch (error) {
    return [];
  }
});

// IPC Handler - Get game details
ipcMain.handle('get_game_details', async (event, gameId) => {
  try {
    const options = {
      hostname: 'displaycatalog.mp.microsoft.com',
      path: `/v7.0/products?bigIds=${gameId}&market=US&languages=en-us&MS-CV=DGU1mcuYo0WMMp+F.1`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.Products && data.Products[0]) {
              const product = data.Products[0];
              const localized = product.LocalizedProperties?.[0] || {};

              const images = localized.Images || [];
              const boxArt = images.find(img => img.ImagePurpose === 'BoxArt');
              const superHeroArt = images.find(img => img.ImagePurpose === 'SuperHeroArt');
              const titledHeroArt = images.find(img => img.ImagePurpose === 'TitledHeroArt');
              const posters = images.find(img => img.ImagePurpose === 'Poster');
              const screenshots = images.filter(img => img.ImagePurpose === 'Screenshot');
              const trailers = localized.CMSVideos || [];
              const heroTrailer = trailers.find(video => video.VideoPurpose === 'HeroTrailer');
              const franchises = localized.Franchises || [];
              const marketProperties = product.MarketProperties || [];
              const usageData = marketProperties[0]?.UsageData || [];
              const contentRatings = localized.ContentRatings || [];
              const interactiveElements = localized.InteractiveElements || [];
              const systemRequirements = localized.SystemRequirements || [];
              const firstMarketProperty = marketProperties[0] || {};
              const displaySkuAvailabilities = product.DisplaySkuAvailabilities || [];
              const firstSkuAvailability = displaySkuAvailabilities[0] || {};
              const firstAvailability = firstSkuAvailability.Availabilities?.[0] || {};
              const availabilityProperties = firstAvailability.Properties || {};
              const originalReleaseDate = availabilityProperties.OriginalReleaseDate || '';
              const minimumUserAge = firstMarketProperty.MinimumUserAge || 0;
              const category = localized.Category || '';
              const categories = localized.Categories || [];
              const productAttributes = product.Properties?.Attributes || [];
              const players = productAttributes.length > 0 ?
                `${productAttributes.find(attr => attr.Name === "XblOnlineCoop")?.Minimum || 1}-${productAttributes.find(attr => attr.Name === "XblOnlineCoop")?.Maximum || 4} players` :
                '1 player';
              const sizeInBytes = (firstSkuAvailability.Sku?.Properties?.Packages?.[0]?.MaxDownloadSizeInBytes) || (firstSkuAvailability.MaxDownloadSizeInBytes) || (product.InstallAttributes?.[0]?.Size) || product.PackageSize;
              const sizeInGB = sizeInBytes ? (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'N/A';

              const gameData = {
                id: product.ProductId || '',
                title: localized.ProductTitle || 'Unknown Game',
                imageTile: boxArt?.Uri ? `https:${boxArt.Uri}` : (localized.ImageUrl || ''),
                hero: superHeroArt?.Uri ? `https:${superHeroArt.Uri}` : (titledHeroArt?.Uri ? `https:${titledHeroArt.Uri}` : ''),
                poster: posters?.Uri ? `https:${posters.Uri}` : '',
                players: players,
                screenshots: screenshots.filter((_, index) => index % 2 === 0).map(screenshot => `https:${screenshot.Uri}`),
                trailers: trailers.map(trailer => ({
                  id: trailer.TrailerId,
                  caption: trailer.Caption,
                  dash: trailer.DASH,
                  hls: trailer.HLS,
                  previewImage: trailer.PreviewImage?.Uri ? `https:${trailer.PreviewImage.Uri}` : '',
                  purpose: trailer.VideoPurpose
                })),
                heroTrailer: heroTrailer ? {
                  id: heroTrailer.TrailerId,
                  caption: heroTrailer.Caption,
                  dash: heroTrailer.DASH,
                  hls: heroTrailer.HLS,
                  previewImage: heroTrailer.PreviewImage?.Uri ? `https:${heroTrailer.PreviewImage.Uri}` : ''
                } : null,
                description: localized.Description || '',
                platforms: {
                  one: product.Platforms?.includes('XboxOne') || false,
                  series: product.Platforms?.includes('XboxSeriesX|S') || false,
                  windows: product.Platforms?.includes('WindowsOneCore') || false,
                  cloud: product.Platforms?.includes('Cloud') || false,
                },
                price: product.PriceInfo ? {
                  currency: product.PriceInfo.CurrencyCode || 'USD',
                  amount: product.PriceInfo.ListPrice || 0,
                  discountPercent: product.PriceInfo.PercentSavings || 0,
                } : undefined,
                EAPlay: product.IsEAPlay || false,
                dateAdded: product.DateAdded,
                releaseDate: localized.ReleaseDate || product.ReleaseDate,
                developer: localized.DeveloperName || '',
                publisher: localized.PublisherName || '',
                publisherWebsite: localized.PublisherWebsiteUri || '',
                supportUri: localized.SupportUri || '',
                genres: localized.Genres || [],
                category: category,
                categories: categories,
                rating: contentRatings.find(r => r.RatingSystem === 'PEGI')?.RatingId ||
                       contentRatings.find(r => r.RatingSystem === 'ESRB')?.RatingId ||
                       'PEGI ' + minimumUserAge,
                originalReleaseDate: originalReleaseDate,
                size: sizeInGB,
                achievements: product.Achievements?.AchievementCount,
                gamerscore: product.Achievements?.GamerscoreTotal,
                franchises: franchises.map(f => f.Name || '').filter(Boolean),
                contentRatings: contentRatings.map(rating => ({
                  system: rating.RatingSystem,
                  id: rating.RatingId,
                  descriptors: rating.RatingDescriptors || [],
                  disclaimers: rating.RatingDisclaimers || [],
                  interactiveElements: rating.InteractiveElements || []
                })),
                interactiveElements: interactiveElements,
                systemRequirements: systemRequirements,
                lastModifiedDate: product.LastModifiedDate,
                productDescription: localized.ProductDescription || '',
                shortDescription: localized.ShortDescription || '',
                searchTitles: localized.SearchTitles || [],
                voiceTitle: localized.VoiceTitle || '',
                renderGroupDetails: localized.RenderGroupDetails || null,
                interactive3DEnabled: localized.Interactive3DEnabled || false,
                language: localized.Language || 'en-us',
                markets: product.MarketProperties?.map(m => m.Market) || [],
                usageData: Array.isArray(usageData) ? usageData.map(data => ({
                  aggregateTimeSpan: data.AggregateTimeSpan,
                  ratingCount: parseInt(data.RatingCount),
                  playCount: parseInt(data.PlayCount),
                  rentalCount: parseInt(data.RentalCount),
                  trialCount: parseInt(data.TrialCount),
                  purchaseCount: parseInt(data.PurchaseCount)
                })) : [],
                ratingCount: Array.isArray(usageData) && usageData.length > 0 ?
                (usageData.find(data => data.AggregateTimeSpan === "AllTime")?.RatingCount || 0) : 0,
              };

              resolve(gameData);
            } else {
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.end();
    });
  } catch (error) {
    return null;
  }
});

// IPC Handler - Get package info (ContentId + size) from product
ipcMain.handle('get_package_info', async (event, productId) => {
  try {
    const options = {
      hostname: 'displaycatalog.mp.microsoft.com',
      path: `/v7.0/products?bigIds=${productId}&market=US&languages=en-us&MS-CV=DGU1mcuYo0WMMp+F.1`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const product = data?.Products?.[0];
            if (!product) return resolve(null);

            const skus = product.DisplaySkuAvailabilities || [];
            for (const sku of skus) {
              const packages = sku?.Sku?.Properties?.Packages || [];
              for (const pkg of packages) {
                if (pkg.PackageFormat === 'MSIXVC' && pkg.ContentId) {
                  return resolve({
                    contentId: pkg.ContentId,
                    size: pkg.MaxDownloadSizeInBytes || 0,
                  });
                }
              }
            }
            return resolve(null);
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.end();
    });
  } catch {
    return null;
  }
});

// IPC Handler - Open folder dialog
ipcMain.handle('open_folder_dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choisir le dossier d\'installation',
  });
  return result;
});

// Auto-updater
function setupAutoUpdater() {
  if (isDev) {
    log('[AutoUpdater] Skipped in dev mode');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = false;

  log('[AutoUpdater] Initializing...');
  log('[AutoUpdater] Current version:', appVersion);
  log('[AutoUpdater] Feed URL:', autoUpdater.getFeedURL ? 'checking...' : 'N/A');

  autoUpdater.on('checking-for-update', () => log('[AutoUpdater] Checking for updates...'));
  autoUpdater.on('update-available', (info) => {
    log('[AutoUpdater] ✅ Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('console_log', '[AutoUpdater] ✅ Update available: ' + info.version);
      mainWindow.webContents.send('update_available', { version: info.version });
    }
  });
  autoUpdater.on('update-not-available', (info) => {
    log('[AutoUpdater] ❌ No update available');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('console_log', '[AutoUpdater] ❌ Already up to date');
    }
  });
  autoUpdater.on('error', (err) => {
    log('[AutoUpdater] ❌ Error:', err.message, err.stack);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('console_log', '[AutoUpdater] ❌ Error: ' + err.message);
    }
  });
  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_download_progress', { percent: progress.percent, bytesPerSecond: progress.bytesPerSecond });
    }
  });
  autoUpdater.on('update-downloaded', () => {
    log('[AutoUpdater] ✅ Downloaded, restarting...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_downloaded');
    }
  });

  try {
    autoUpdater.checkForUpdates().catch(err => {
      log('[AutoUpdater] checkForUpdates() rejected:', err.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('console_log', '[AutoUpdater] checkForUpdates failed: ' + err.message);
      }
    });
  } catch (err) {
    log('[AutoUpdater] checkForUpdates() threw:', err.message);
  }
}

ipcMain.handle('check_for_updates', () => {
  if (isDev) return { currentVersion: appVersion, latestVersion: appVersion, hasUpdate: false };
  return autoUpdater.checkForUpdates().then(info => ({
    currentVersion: appVersion,
    latestVersion: info?.updateInfo?.version || appVersion,
    hasUpdate: !!info,
  })).catch(() => ({ currentVersion: appVersion, latestVersion: appVersion, hasUpdate: false }));
});

ipcMain.handle('download_update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('install_update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('check_now', () => {
  if (isDev) return { currentVersion: appVersion, latestVersion: appVersion, hasUpdate: false };
  autoUpdater.checkForUpdates();
  return { checking: true };
});

// IPC Handler - Download & extract directly via XvdTool streaming
ipcMain.handle('download_file', async (event, { url, downloadPath, gameId, gameName }) => {
  log('[download_file] START gameId:', gameId, '| name:', gameName, '| path:', downloadPath);

  if (!url || typeof url !== 'string') { log('[download_file] Invalid URL'); throw new Error('Invalid URL'); }
  if (!downloadPath || typeof downloadPath !== 'string') { log('[download_file] Invalid path'); throw new Error('Invalid download path'); }
  if (!gameId || typeof gameId !== 'string') { log('[download_file] Invalid gameId'); throw new Error('Invalid gameId'); }

  let urlObj;
  try { urlObj = new URL(url); } catch { log('[download_file] Malformed URL:', url); throw new Error('Malformed download URL'); }
  log('[download_file] URL OK:', urlObj.href);

  if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') throw new Error('Only HTTP(S) downloads are allowed');

  if (!path.isAbsolute(downloadPath)) throw new Error('Download path must be an absolute path');
  const resolvedPath = path.resolve(downloadPath);
  const folderName = gameName ? gameName.replace(/[<>:"/\\|?*]/g, '_').trim() : gameId;
  const extractDir = path.join(resolvedPath, folderName);

  log('[download_file] Output dir:', extractDir);
  fs.mkdirSync(extractDir, { recursive: true });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download_progress', { gameId, receivedBytes: 0, totalBytes: 1, speed: 0 });
    mainWindow.webContents.send('extract_progress', { gameId, status: 'extracting', filePath: url });
  }

  // Run extraction asynchronously (fire-and-forget), return immediately
  runExtraction(url, extractDir, gameId);
  return { success: true, extractDir };
});

function runExtraction(url, extractDir, gameId) {
  (async () => {
    try {
      log('[download_file] Starting XvdTool extraction...');
      await extractMsixvc(url, extractDir, (pct) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download_progress', { gameId, receivedBytes: pct, totalBytes: 100, speed: 0 });
        }
      });
      log('[download_file] Extraction completed successfully');

      // Copy OnlineFix files
      log('[download_file] Copying OnlineFix files...');
      for (const file of ['wdapp.exe', 'xsapi.dll']) {
        const src = path.join(onlineFixDir, file);
        const dest = path.join(extractDir, file);
        try { fs.copyFileSync(src, dest); log('[download_file] Copied:', file); } catch (e) {
          log('[download_file] Failed to copy', file, ':', e.message);
        }
      }

      // Auto-install: run wdapp register
      log('[download_file] Running wdapp register...');
      const manifest = path.join(extractDir, 'appxmanifest.xml');
      if (fs.existsSync(manifest)) {
        try {
          await new Promise((resolve, reject) => {
            const proc = spawn(path.join(extractDir, 'wdapp.exe'), ['register', manifest], {
              stdio: ['ignore', 'pipe', 'pipe'], cwd: extractDir,
            });
            let err = '';
            proc.stderr.on('data', (c) => { err += c.toString(); });
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(err.trim() || `wdapp exited with code ${code}`)));
            proc.on('error', (e) => reject(e));
          });
          log('[download_file] Game registered successfully');
        } catch (e) { log('[download_file] Register failed:', e.message); }
      } else {
        log('[download_file] No appxmanifest.xml found, skipping register');
      }

      // Clean up OnlineFix files
      for (const file of ['wdapp.exe', 'xsapi.dll']) {
        const p = path.join(extractDir, file);
        try { if (fs.existsSync(p)) { fs.unlinkSync(p); log('[download_file] Cleaned up:', file); } } catch {}
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download_progress', { gameId, receivedBytes: 1, totalBytes: 1, speed: 0 });
        mainWindow.webContents.send('extract_progress', { gameId, status: 'done', extractDir });
        mainWindow.webContents.send('download_complete', { gameId, filePath: extractDir, success: true });
      }
    } catch (err) {
      log('[download_file] ERROR:', err.message);
      if (fs.existsSync(extractDir)) {
        try { fs.rmSync(extractDir, { recursive: true, force: true }); log('[download_file] Cleaned up empty dir:', extractDir); } catch {}
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('extract_progress', { gameId, status: 'error', error: err.message });
        mainWindow.webContents.send('download_complete', { gameId, success: false, state: err.message });
      }
    }
  })();
}

function extractMsixvc(input, outputDir, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    log('[XvdTool] Checking path:', xvdToolPath);
    if (!fs.existsSync(xvdToolPath)) {
      log('[XvdTool] NOT FOUND at:', xvdToolPath);
      return reject(new Error(`XvdTool not found at ${xvdToolPath}`));
    }
    log('[XvdTool] Found. Input starts with:', input.slice(0, 80), '...');
    log('[XvdTool] Output:', outputDir);

    const args = ['extract', input, '-o', outputDir, '-n'];
    log('[XvdTool] Cmd:', xvdToolPath, args.join(' '));

    const proc = spawn(xvdToolPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: path.dirname(xvdToolPath),
    });
    let stderr = '';
    let stdout = '';

    const timeout = setTimeout(() => {
      log('[XvdTool] TIMEOUT - killing process');
      proc.kill();
      reject(new Error('Extraction timed out after 10 minutes'));
    }, 600000);

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      const trimmed = text.trim();
      if (trimmed) log('[XvdTool]', trimmed);
      const m = trimmed.match(/(\d{1,3})%/);
      if (m) onProgress(parseInt(m[1], 10));
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      const trimmed = text.trim();
      if (trimmed) log('[XvdTool]', trimmed);
      const m = trimmed.match(/(\d{1,3})%/);
      if (m) onProgress(parseInt(m[1], 10));
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      log('[XvdTool] Exit code:', code, '| stdout:', stdout.length, 'chars | stderr:', stderr.length, 'chars');
      if (code === 0) {
        log('[XvdTool] SUCCESS →', outputDir);
        resolve(outputDir);
      } else {
        const msg = stderr.trim() || stdout.trim() || `XvdTool exited with code ${code}`;
        log('[XvdTool] FAILED:', msg);
        reject(new Error(msg));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      log('[XvdTool] SPAWN ERROR:', err.message, err.code);
      reject(new Error(`Cannot launch XvdTool: ${err.message}. Ensure .NET 8 Runtime is installed.`));
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
