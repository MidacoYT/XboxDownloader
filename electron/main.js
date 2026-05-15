const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
const isDev = !app.isPackaged;
const xvdToolPath = path.join(isDev ? path.dirname(__dirname) : process.resourcesPath, 'Xvd', 'XvdTool.Streaming.exe');
const onlineFixDir = path.join(isDev ? path.dirname(__dirname) : process.resourcesPath, 'OnlineFix');
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

// IPC handler - simple version check (manual only)
ipcMain.handle('check_for_updates', async () => {
  try {
    const data = await new Promise((resolve, reject) => {
      https.get('https://api.github.com/repos/MidacoYT/XboxDownloader/releases/latest', { headers: { 'User-Agent': 'Xbox-Downloader/1.0' }, timeout: 5000 }, (res) => {
        let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch { reject(); } });
      }).on('error', reject);
    });
    const latest = (data.tag_name || '').replace(/^v/, '');
    return { currentVersion: appVersion, latestVersion: latest, hasUpdate: latest && latest !== appVersion };
  } catch { return { currentVersion: appVersion, latestVersion: appVersion, hasUpdate: false }; }
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
    log('[XvdTool] Input:', input.slice(0, 80), '...');
    log('[XvdTool] Output:', outputDir);

    // Decrypt CIK files into Cik/ subdirectory where XvdTool auto-detects them
    const xvdDir = path.dirname(xvdToolPath);
    const cikDir = path.join(xvdDir, 'Cik');
    const xorKey = Buffer.from('XboxDownloader2024!@#$');
    let hasCik = false;
    try {
      const { CIK_ENCRYPTED } = require('./cik-bundle.js');
      if (CIK_ENCRYPTED && Object.keys(CIK_ENCRYPTED).length > 0) {
        if (fs.existsSync(cikDir)) fs.rmSync(cikDir, { recursive: true });
        fs.mkdirSync(cikDir, { recursive: true });
        for (const [name, b64] of Object.entries(CIK_ENCRYPTED)) {
          const buf = Buffer.from(b64, 'base64');
          for (let i = 0; i < buf.length; i++) buf[i] ^= xorKey[i % xorKey.length];
          fs.writeFileSync(path.join(cikDir, name), buf);
        }
        hasCik = true;
        log('[XvdTool] Decrypted', Object.keys(CIK_ENCRYPTED).length, 'CIK files to', cikDir);
      }
    } catch (e) {
      log('[XvdTool] No CIK bundle found');
    }

    const args = ['extract', input, '-o', outputDir, '-n'];
    log('[XvdTool] Cmd:', xvdToolPath, args.join(' '));

    const proc = spawn(xvdToolPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: xvdDir,
    });
    let stderr = '';
    let stdout = '';
    let cleaned = false;
    const cleanup = () => {
      if (!cleaned && hasCik) {
        try { fs.rmSync(cikDir, { recursive: true, force: true }); } catch {}
        cleaned = true;
      }
    };

    const timeout = setTimeout(() => {
      log('[XvdTool] TIMEOUT');
      proc.kill();
      cleanup();
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
      cleanup();
      if (code === 0) resolve(outputDir);
      else reject(new Error(stderr.trim() || stdout.trim() || `Exit code ${code}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error(`Cannot launch XvdTool: ${err.message}. Ensure .NET 8 Runtime is installed.`));
    });
  });
}

// IPC - Uninstall game
ipcMain.handle('uninstall_game', async (event, { gameId, folderPath }) => {
  log('[Uninstall] gameId:', gameId, 'folder:', folderPath);
  if (!folderPath || !fs.existsSync(folderPath)) return { success: false, error: 'Game folder not found' };

  // Try to unregister with wdapp
  const manifest = path.join(folderPath, 'appxmanifest.xml');
  const wdapp = path.join(folderPath, 'wdapp.exe');
  if (fs.existsSync(manifest) && fs.existsSync(wdapp)) {
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(wdapp, ['unregister', manifest], { stdio: 'pipe', cwd: folderPath });
        let err = '';
        proc.stderr.on('data', (c) => err += c.toString());
        proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(err.trim() || `exit ${code}`)));
        proc.on('error', reject);
      });
      log('[Uninstall] Unregistered successfully');
    } catch (e) {
      log('[Uninstall] Unregister failed (continuing):', e.message);
    }
  }

  // Delete folder
  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
    log('[Uninstall] Deleted folder:', folderPath);
    return { success: true };
  } catch (e) {
    log('[Uninstall] Delete failed:', e.message);
    return { success: false, error: e.message };
  }
});

// IPC - Scan for installed games in download path
ipcMain.handle('scan_installed_games', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    let downloadPath = 'C:\\Xbox Games';
    try { const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); if (s.downloadPath) downloadPath = s.downloadPath; } catch {}
    if (!fs.existsSync(downloadPath)) return { downloadPath, games: [] };

    const folders = fs.readdirSync(downloadPath, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    log('[Scan] Found folders:', folders.length);
    return { downloadPath, games: folders };
  } catch (e) {
    log('[Scan] Error:', e.message);
    return { downloadPath: 'C:\\Xbox Games', games: [] };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
