const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');



let mainWindow = null;
const activeProcesses = new Map(); // gameId -> ChildProcess (XvdTool)
const pendingDownloads = new Map(); // gameId -> http.ClientRequest[] (parallel download requests)
const downloadActions = new Map(); // gameId -> 'pause' | 'cancel'
const downloadParams = new Map(); // gameId -> { url, extractDir, gameName, gameSize }

function toggleDeveloperMode(enable) {
  const val = enable ? '1' : '0';
  const key = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock';
  return new Promise((resolve, reject) => {
    // Try direct first, fall back to elevated if access denied
    const tryReg = (elevate) => {
      const args = elevate
        ? ['-Command', `Start-Process reg -ArgumentList 'add ${key} /t REG_DWORD /v AllowDevelopmentWithoutDevLicense /d ${val} /f' -Verb RunAs -Wait`]
        : ['add', key, '/t', 'REG_DWORD', '/v', 'AllowDevelopmentWithoutDevLicense', '/d', val, '/f'];
      const cmd = elevate ? 'powershell' : 'reg';
      const proc = spawn(cmd, args);
      let err = '';
      proc.stderr?.on('data', (c) => err += c.toString());
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else if (!elevate) tryReg(true); // retry elevated
        else reject(new Error(err.trim() || `reg add exited with code ${code}`));
      });
    };
    tryReg(false);
  });
}


const isDev = !app.isPackaged;
const xvdToolPath = path.join(isDev ? path.dirname(__dirname) : process.resourcesPath, 'Xvd', 'XvdTool.Streaming.exe');
const onlineFixDir = path.join(isDev ? path.dirname(__dirname) : process.resourcesPath, 'OnlineFix');

// CIK API configuration
const CIK_API_URL = 'https://xboxapi.netlify.app';
const CIK_API_KEY = '9eEo0ksYvZTsXgPiJUz7hQCio18hW+mPlQhy0UBq+10=';

// Persistent CIK cache location (survives app restarts)
const cikCacheDir = path.join(app.getPath('userData'), 'cik-cache');


function ensureCikCacheDir() {
  if (!fs.existsSync(cikCacheDir)) {
    fs.mkdirSync(cikCacheDir, { recursive: true });
    log('[CIK] Created cache dir:', cikCacheDir);
  }
}

function log(...args) {
  const msg = args.join(' ');
  console.log(msg);
  try {
    const logPath = path.join(app.getPath('userData'), 'app.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
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
    // Try Netlify API first if configured, fall back to GitHub
    const urls = CIK_API_URL
      ? [`${CIK_API_URL.replace(/\/+$/, '')}/games`]
      : ['https://raw.githubusercontent.com/MidacoYT/Games/refs/heads/main/games.json'];

    for (const url of urls) {
      try {
        const body = await new Promise((resolve, reject) => {
          const opts = CIK_API_KEY ? { headers: { 'Authorization': `Bearer ${CIK_API_KEY}` } } : {};
          https.get(url, opts, (res) => {
            let d = '';
            res.on('data', (c) => d += c);
            res.on('end', () => resolve(d));
          }).on('error', reject);
        });

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
            .map((item) => ({ id: item.productId, name: item.name || 'Unknown Game', state: item.state }));
        } else if (data.Products && Array.isArray(data.Products)) {
          gameIds = data.Products.map((p) => ({ id: p.ProductId, state: p.state }));
        } else if (data.items && Array.isArray(data.items)) {
          gameIds = data.items.filter(item => item.productId).map((p) => ({ id: p.productId }));
        } else if (typeof data === 'object') {
          // Object with numeric keys: { "0": { productId, name, state? }, "1": {...} }
          gameIds = Object.values(data)
            .filter(item => item && item.productId)
            .map((item) => ({ id: item.productId, name: item.name || 'Unknown Game', state: item.state }));
        }

        if (gameIds.length > 0) {
          // Pre-fetch CIK for all games in background (don't await)
          setTimeout(() => prefetchAllCiks(gameIds.map(g => g.id)), 100);
          return gameIds;
        }
      } catch (e) {
        console.error('[Games] Error fetching from', url, e.message);
      }
    }
    return [];
  } catch (error) {
    log('[Games] Error fetching games');
    return [];
  }
});

// Background pre-fetch all CIK keys so downloads are instant
async function prefetchAllCiks(productIds) {
  ensureCikCacheDir();
  log('[CIK] Pre-fetching CIK for', productIds.length, 'games...');
  let fetched = 0;
  const batchSize = 5;
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    await Promise.all(batch.map(async (pid) => {
      try {
        // fetchCikForProduct already checks cache and saves persistently
        await fetchCikForProduct(pid);
        fetched++;
      } catch {}
    }));
    if (fetched > 0 && fetched % 10 === 0) log(`[CIK] Pre-fetched ${fetched}/${productIds.length}`);
  }
  log(`[CIK] Pre-fetch complete: ${fetched}/${productIds.length} CIK keys cached`);
}

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
              const category = product.Properties?.Category || localized.Category || '';
              const categories = product.Properties?.Categories || localized.Categories || [];
              const productAttributes = product.Properties?.Attributes || [];
              const players = productAttributes.length > 0 ?
                `${productAttributes.find(attr => attr.Name === "XblOnlineCoop")?.Minimum || 1}-${productAttributes.find(attr => attr.Name === "XblOnlineCoop")?.Maximum || 4} players` :
                '1 player';
              const attributes = productAttributes.map(attr => ({
                name: attr.Name || '',
                min: attr.Minimum,
                max: attr.Maximum,
              }));
              const sizeInBytes = (firstSkuAvailability.Sku?.Properties?.Packages?.[0]?.MaxDownloadSizeInBytes) || (firstSkuAvailability.MaxDownloadSizeInBytes) || (product.InstallAttributes?.[0]?.Size) || product.PackageSize;
              const sizeInGB = sizeInBytes ? (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'N/A';

              log('[get_game_details] Categories:', JSON.stringify(categories), '| Category:', category, '| from:', product.Properties?.Categories ? 'Properties' : 'LocalizedProperties', '| for:', gameId);

              const gameData = {
                id: product.ProductId || '',
                title: localized.ProductTitle || 'Unknown Game',
                imageTile: boxArt?.Uri ? `https:${boxArt.Uri}` : (localized.ImageUrl || ''),
                hero: superHeroArt?.Uri ? `https:${superHeroArt.Uri}` : (titledHeroArt?.Uri ? `https:${titledHeroArt.Uri}` : ''),
                poster: posters?.Uri ? `https:${posters.Uri}` : '',
                players: players,
                attributes: attributes,
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
    title: 'Select installation folder',
  });
  return result;
});

// IPC Handler - Download & extract directly via XvdTool streaming
ipcMain.handle('download_file', async (event, { url, downloadPath, gameId, gameName, gameSize }) => {
  log('[download_file] START gameId:', gameId, '| name:', gameName, '| size:', gameSize, '| path:', downloadPath);

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

  // Store params for potential pause/resume
  downloadParams.set(gameId, { url, extractDir, gameName, gameSize });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download_progress', { gameId, receivedBytes: 0, totalBytes: 1, speed: 0 });
  }

  // Run extraction asynchronously (fire-and-forget), return immediately
  runExtraction(url, extractDir, gameId, gameSize);
  return { success: true, extractDir };
});

// IPC Handler - Pause download (abort parallel download or suspend process threads)
ipcMain.handle('pause_download', async (event, gameId) => {
  log('[pause_download] gameId:', gameId);

  // Abort parallel download phase
  const dlReqs = pendingDownloads.get(gameId);
  if (dlReqs) {
    downloadActions.set(gameId, 'pause');
    dlReqs.forEach(r => { try { r.req.destroy(); } catch {} });
    log('[pause_download] Aborted parallel download for', gameId);
  }

  // Suspend XvdTool process if in extraction phase
  const proc = activeProcesses.get(gameId);
  if (proc) {
    try {
      await suspendResumeProcess(proc.pid, 'SuspendProcess');
      log('[pause_download] Suspended process', proc.pid, 'for', gameId);
    } catch (e) {
      log('[pause_download] Suspend error:', e.message);
    }
  }

  // If nothing was running, mark for future interruption
  if (!dlReqs && !proc) {
    downloadActions.set(gameId, 'pause');
    log('[pause_download] No active download, marked for interruption');
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download_paused', { gameId });
  }
  return { success: true };
});

// IPC Handler - Resume download (resume process threads, or restart if never started)
ipcMain.handle('resume_download', async (event, gameId) => {
  log('[resume_download] gameId:', gameId);

  const proc = activeProcesses.get(gameId);
  if (proc) {
    try {
      await suspendResumeProcess(proc.pid, 'ResumeProcess');
      log('[resume_download] Resumed process', proc.pid, 'for', gameId);
      return { success: true };
    } catch (e) {
      log('[resume_download] Resume error:', e.message);
      // Process may have died — fall through to restart path
    }
  }

  // Process already exited or never started — re-run extraction
  const params = downloadParams.get(gameId);
  if (params) {
    log('[resume_download] Restarting extraction for', gameId);
    fs.mkdirSync(params.extractDir, { recursive: true });
    runExtraction(params.url, params.extractDir, gameId, params.gameSize);
    return { success: true };
  }

  log('[resume_download] No saved params for', gameId);
  return { success: false, error: 'No download state found' };
});

// IPC Handler - Cancel download
ipcMain.handle('cancel_download', async (event, gameId) => {
  log('[cancel_download] gameId:', gameId);

  // Abort parallel download phase
  const dlReqs = pendingDownloads.get(gameId);
  if (dlReqs) {
    downloadActions.set(gameId, 'cancel');
    dlReqs.forEach(r => { try { r.req.destroy(); } catch {} });
    log('[cancel_download] Aborted parallel download for', gameId);
  }

  // Kill XvdTool process if in extraction phase
  const proc = activeProcesses.get(gameId);
  if (proc) {
    downloadActions.set(gameId, 'cancel');
    proc.kill();
    log('[cancel_download] Killed process for', gameId);
  }

  // Clean up partial extraction directory
  const params = downloadParams.get(gameId);
  if (params && params.extractDir) {
    try {
      if (fs.existsSync(params.extractDir)) {
        fs.rmSync(params.extractDir, { recursive: true, force: true });
        log('[cancel_download] Deleted partial dir:', params.extractDir);
      }
    } catch (e) {
      log('[cancel_download] Cleanup error:', e.message);
    }
  }

  downloadParams.delete(gameId);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download_complete', { gameId, success: false, state: 'cancelled' });
  }
  return { success: true };
});

// Suspend or resume a process via Windows API (PowerShell P/Invoke)
function suspendResumeProcess(pid, action) {
  return new Promise((resolve, reject) => {
    const script =
`$code = @'
using System;
using System.Runtime.InteropServices;
public class ProcessUtil {
    [DllImport("kernel32.dll")]
    public static extern IntPtr OpenThread(uint dwDesiredAccess, bool bInheritHandle, uint dwThreadId);
    [DllImport("kernel32.dll")]
    public static extern uint SuspendThread(IntPtr hThread);
    [DllImport("kernel32.dll")]
    public static extern int ResumeThread(IntPtr hThread);
    [DllImport("kernel32.dll")]
    public static extern void CloseHandle(IntPtr hHandle);

    public static void SuspendProcess(int pid) {
        try {
            var p = System.Diagnostics.Process.GetProcessById(pid);
            if (p == null || p.HasExited) return;
            foreach (System.Diagnostics.ProcessThread t in p.Threads) {
                var h = OpenThread(0x0002, false, (uint)t.Id);
                if (h != IntPtr.Zero) { SuspendThread(h); CloseHandle(h); }
            }
        } catch {}
    }

    public static void ResumeProcess(int pid) {
        try {
            var p = System.Diagnostics.Process.GetProcessById(pid);
            if (p == null || p.HasExited) return;
            foreach (System.Diagnostics.ProcessThread t in p.Threads) {
                var h = OpenThread(0x0002, false, (uint)t.Id);
                if (h != IntPtr.Zero) { ResumeThread(h); CloseHandle(h); }
            }
        } catch {}
    }
}
'@
Add-Type -TypeDefinition $code
[ProcessUtil]::${action}(${pid})
`;
    const tmpFile = path.join(app.getPath('temp'), `xbox_suspend_${pid}.ps1`);
    try { fs.writeFileSync(tmpFile, script, 'utf8'); } catch (e) { reject(e); return; }
    const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpFile]);
    let err = '';
    child.stderr?.on('data', (c) => err += c.toString());
    child.on('close', (code) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (code === 0) resolve();
      else reject(new Error(`PowerShell ${action} (pid ${pid}) exited ${code}: ${err.trim()}`));
    });
    child.on('error', (e) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      reject(e);
    });
  });
}

function httpGet(url, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = apiKey ? { headers: { 'Authorization': `Bearer ${apiKey}` } } : {};
    https.get(url, opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function httpGetBuffer(url, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = apiKey ? { headers: { 'Authorization': `Bearer ${apiKey}` } } : {};
    https.get(url, opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function isBase64Json(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed.body === 'string' ? parsed : null;
  } catch { return null; }
}

async function fetchCikForProduct(productId) {
  if (!CIK_API_URL) return null;
  try {
    const mappingUrl = `${CIK_API_URL.replace(/\/+$/, '')}/mapping/${productId}`;
    log('[CIK API] Fetching mapping for product:', productId);

    const mappingBody = await httpGet(mappingUrl, CIK_API_KEY);
    const { cik: cikGuid } = JSON.parse(mappingBody);
    if (!cikGuid) { log('[CIK API] No CIK mapping for:', productId); return null; }
    log('[CIK API] CIK GUID:', cikGuid);

    ensureCikCacheDir();
    const cachedPath = path.join(cikCacheDir, cikGuid + '.cik');

    // Use a lock file to prevent concurrent writes from pre-fetch + on-demand
    const lockPath = cachedPath + '.lock';

    // Check persistent cache first — must be exactly 48 bytes (GUID header + AES key)
    if (fs.existsSync(cachedPath)) {
      const stat = fs.statSync(cachedPath);
      if (stat.size === 48) {
        log('[CIK API] Using persistent cached CIK:', cachedPath);
        return cachedPath;
      }
      log('[CIK API] Cached CIK has wrong size (' + stat.size + ' bytes), re-downloading');
      try { fs.unlinkSync(cachedPath); } catch {}
    }

    // Acquire lock
    while (true) {
      try {
        fs.writeFileSync(lockPath, '', { flag: 'wx' });
        break;
      } catch {
        // Another process is downloading this CIK — wait and retry
        await new Promise(r => setTimeout(r, 200));
        // If file appeared while waiting, use it
        if (fs.existsSync(cachedPath)) {
          const stat = fs.statSync(cachedPath);
          if (stat.size === 48) { return cachedPath; }
        }
      }
    }

    try {
      // Double-check after lock acquisition (pre-fetch may have written it)
      if (fs.existsSync(cachedPath)) {
        const stat = fs.statSync(cachedPath);
        if (stat.size === 48) { return cachedPath; }
      }

      // Download CIK file (may be base64-encoded JSON or raw binary)
      const cikUrl = `${CIK_API_URL.replace(/\/+$/, '')}/cik/${cikGuid}`;
      log('[CIK API] Downloading CIK:', cikUrl);
      const cikRaw = await httpGetBuffer(cikUrl, CIK_API_KEY);
      let cikBuf;

      // Check if response is base64 JSON (starts with '{')
      if (cikRaw.length > 0 && cikRaw[0] === 0x7b) {
        const jsonWrapper = isBase64Json(cikRaw.toString('utf8'));
        if (jsonWrapper) {
          cikBuf = Buffer.from(jsonWrapper.body, 'base64');
          log('[CIK API] Decoded CIK from base64 JSON:', cikBuf.length, 'bytes');
        } else {
          cikBuf = cikRaw;
          log('[CIK API] Using raw CIK bytes:', cikBuf.length, 'bytes');
        }
      } else {
        cikBuf = cikRaw;
        log('[CIK API] Using raw CIK bytes:', cikBuf.length, 'bytes');
      }

      // XvdTool -c expects 48 bytes (16-byte GUID header + 32-byte AES key)
      if (cikBuf.length !== 48) {
        log('[CIK API] Unexpected CIK size:', cikBuf.length, 'bytes — expected 48');
        return null;
      }

      fs.writeFileSync(cachedPath, cikBuf);
      log('[CIK API] Written CIK to persistent cache:', cachedPath, '(' + cikBuf.length, 'bytes)');
      return cachedPath;
    } finally {
      try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch {}
    }
  } catch (e) {
    log('[CIK API] Error:', e.message);
    return null;
  }
}

function runExtraction(url, extractDir, gameId, gameSize) {
  (async () => {
    try {
      const t0 = Date.now();
      log('[download_file] Starting extraction pipeline...');

      // Fetch CIK for this game from remote API (if configured)
      const t1 = Date.now();
      const cikPath = await fetchCikForProduct(gameId);
      const t2 = Date.now();
      if (cikPath) log('[download_file] Using CIK:', cikPath, '| fetch time:', (t2-t1)+'ms');

      // Shared speed-tracking helpers
      const speedSamples = [{ time: Date.now(), bytes: 0 }];
      const SPEED_WINDOW_MS = 30000;
      let lastKnownSpeed = 0;
      const sendProgress = (receivedBytes, totalBytes) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const now = Date.now();
        speedSamples.push({ time: now, bytes: receivedBytes });
        while (speedSamples.length > 1 && speedSamples[0].time < now - SPEED_WINDOW_MS) {
          speedSamples.shift();
        }
        let speed = lastKnownSpeed;
        if (speedSamples.length >= 2) {
          const first = speedSamples[0];
          const last = speedSamples[speedSamples.length - 1];
          const deltaBytes = last.bytes - first.bytes;
          const deltaMs = last.time - first.time;
          if (deltaBytes > 0 && deltaMs > 0) {
            speed = Math.round(deltaBytes / (deltaMs / 1000));
            lastKnownSpeed = speed;
          }
        }
        mainWindow.webContents.send('download_progress', { gameId, receivedBytes, totalBytes, speed: speed > 0 ? speed : 0 });
      };

      // Phase 1: Parallel download (for URLs only) — faster but may fall back to streaming
      let inputPath = url;
      const isUrl = url.startsWith('http://') || url.startsWith('https://');
      let tempXvcPath = null;

      if (isUrl) {
        tempXvcPath = path.join(extractDir, '.xvc_download');
        log('[download_file] Phase 1: Parallel download to', tempXvcPath);

        try {
          const dlResult = await downloadParallel(url, tempXvcPath, gameId, gameSize, sendProgress);
          if (dlResult === 'interrupted') {
            log('[download_file] Download interrupted by user');
            return;
          }
          inputPath = tempXvcPath;
          const dlTime = Date.now() - t2;
          log('[download_file] Phase 1 complete:', dlTime+'ms');

          sendProgress(gameSize, gameSize);

          // Reset speed tracking for extraction phase
          speedSamples.length = 0;
          speedSamples.push({ time: Date.now(), bytes: 0 });
          lastKnownSpeed = 0;
        } catch (e) {
          log('[download_file] Parallel download failed, falling back to streaming:', e.message);
          tempXvcPath = null;
          inputPath = url;
          // Clean up partial temp file
          try { if (fs.existsSync(path.join(extractDir, '.xvc_download'))) fs.unlinkSync(path.join(extractDir, '.xvc_download')); } catch {}
        }
      }

      // Phase 2: Extraction (local file or streaming from URL)
      if (tempXvcPath) {
        log('[download_file] Phase 2: Local extraction from', inputPath);
      } else {
        log('[download_file] Phase 2: Streaming extraction from', url);
      }

      // Signal UI to show "Extracting..." label
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('extract_progress', { gameId, status: 'extracting', filePath: inputPath });
      }

      const extractResult = await extractMsixvc(inputPath, extractDir, (pct) => {
        log('[download_file] extraction pct:', pct);
        if (pct >= 99) log('[download_file] ===> EXTRACTION REACHED', pct);
        const receivedBytes = gameSize > 0 ? Math.round(pct / 100 * gameSize) : pct;
        const totalBytes = gameSize > 0 ? gameSize : 100;
        sendProgress(receivedBytes, totalBytes);
      }, cikPath, gameId);

      if (extractResult === 'interrupted') {
        log('[download_file] Extraction interrupted by user');
        return;
      }

      const t3 = Date.now();
      const dlTimeStr = tempXvcPath ? `${Date.now() - t2}ms` : 'N/A (streaming)';
      log('[download_file] Extraction completed successfully | time:', (t3-t0)+'ms, CIK fetch:', (t2-t1)+'ms, download:', dlTimeStr+', XvdTool:', (t3-t2)+'ms');
      downloadParams.delete(gameId);

      // Clean up temp XVC
      if (tempXvcPath) {
        try { if (fs.existsSync(tempXvcPath)) { fs.unlinkSync(tempXvcPath); log('[download_file] Deleted temp XVC'); } } catch {}
      }

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
          log('[download_file] Enabling Developer Mode...');
          await toggleDeveloperMode(true);
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
        try { await toggleDeveloperMode(false); log('[download_file] Developer Mode disabled'); } catch {}
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
      // Clean up temp XVC on error
      const p = downloadParams.get(gameId);
      const tempXvc = p ? path.join(p.extractDir, '.xvc_download') : null;
      if (tempXvc && fs.existsSync(tempXvc)) {
        try { fs.unlinkSync(tempXvc); } catch {}
      }
      if (fs.existsSync(extractDir)) {
        try { fs.rmSync(extractDir, { recursive: true, force: true }); log('[download_file] Cleaned up empty dir:', extractDir); } catch {}
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('extract_progress', { gameId, status: 'error', error: err.message });
        mainWindow.webContents.send('download_complete', { gameId, success: false, state: err.message });
      }
      downloadParams.delete(gameId);
    }
  })();
}

// Parallel HTTP download using multiple Range connections
function downloadParallel(url, destPath, gameId, gameSize, onProgress) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // Check for pre-existing interruption
        const preAction = downloadActions.get(gameId);
        if (preAction) {
          downloadActions.delete(gameId);
          resolve('interrupted');
          return;
        }

        // Get file size via HEAD
        const size = await getFileSize(url);
        if (size <= 0) throw new Error('Could not determine file size');

        log('[download_parallel] File size:', size, 'bytes');
        onProgress(0, size);

        // Pre-allocate file
        const fd = fs.openSync(destPath, 'w');
        fs.ftruncateSync(fd, size);
        fs.closeSync(fd);

        const NUM_CONNECTIONS = 4;
        const MAX_RETRIES = 3;
        const chunkSize = Math.ceil(size / NUM_CONNECTIONS);
        const chunks = [];
        for (let i = 0; i < NUM_CONNECTIONS; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize - 1, size - 1);
          if (start > end) break;
          chunks.push({ start, end, index: i });
        }

        log('[download_parallel] Chunks:', chunks.length, 'x', chunkSize, 'bytes');
        const requests = [];
        pendingDownloads.set(gameId, requests);

        const progressCounters = new Array(chunks.length).fill(0);
        let lastProgressTime = 0;
        let completedExternally = false;
        let forceCompleteTimer = null;

        const downloadChunk = async (chunk, attempt = 0) => {
          return new Promise((resolveChunk) => {
            const urlObj = new URL(url);
            const fetcher = urlObj.protocol === 'https:' ? https : http;
            const options = {
              hostname: urlObj.hostname,
              port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
              path: urlObj.pathname + urlObj.search,
              headers: {
                'Range': `bytes=${chunk.start}-${chunk.end}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            };

            if (!fs.existsSync(destPath)) {
              resolveChunk('interrupted');
              return;
            }
            const chunkFd = fs.openSync(destPath, 'r+');
            let writeOffset = chunk.start;
            let chunkBytes = 0;
            let pendingWrites = 0;
            let closed = false;
            let finished = false;

            const closeAnd = (cb) => {
              if (closed) { if (cb) cb(); return; }
              if (pendingWrites > 0) {
                setImmediate(() => closeAnd(cb));
                return;
              }
              closed = true;
              try { fs.closeSync(chunkFd); } catch {}
              if (cb) cb();
            };

            const tryRetry = (errMsg) => {
              if (finished) return;
              finished = true;
              closeAnd(() => {
                if (downloadActions.get(gameId)) {
                  clearTimerAndResolve('interrupted');
                } else if (completedExternally) {
                  clearTimerAndResolve('ok');
                } else if (attempt < MAX_RETRIES) {
                  log('[download_parallel] Chunk', chunk.index, 'failed (attempt', attempt+1, '):', errMsg, '- retrying');
                  setTimeout(() => {
                    downloadChunk(chunk, attempt + 1).then(clearTimerAndResolve);
                  }, Math.min(1000 * Math.pow(2, attempt), 8000));
                } else {
                  clearTimerAndResolve('error');
                }
              });
            };

            // Chunk stall timeout: 30s without data = retry
            let chunkTimer;

            const resetChunkTimer = () => {
              clearTimeout(chunkTimer);
              chunkTimer = setTimeout(() => {
                log('[download_parallel] Chunk', chunk.index, 'stalled (30s no data) attempt', attempt+1);
                tryRetry('chunk_stalled');
              }, 30000);
            };

            // Wrap resolveChunk to clear the timeout
            const clearTimerAndResolve = (val) => { clearTimeout(chunkTimer); resolveChunk(val); };

            const req = fetcher.get(options, (res) => {
              if (res.statusCode !== 206) {
                tryRetry(`HTTP ${res.statusCode}`);
                return;
              }

              resetChunkTimer();

              res.on('data', (data) => {
                resetChunkTimer();
                pendingWrites++;
                fs.write(chunkFd, data, 0, data.length, writeOffset, (err) => {
                  pendingWrites--;
                  if (err) log('[download_parallel] write error:', err.message);
                });
                writeOffset += data.length;
                chunkBytes += data.length;
                progressCounters[chunk.index] = chunkBytes;

                const now = Date.now();
                if (now - lastProgressTime > 500) {
                  lastProgressTime = now;
                  const total = progressCounters.reduce((a, b) => a + b, 0);
                  onProgress(total, size);
                  // All bytes received? Start force-complete timer
                  if (total >= size && !completedExternally) {
                    completedExternally = true;
                    forceCompleteTimer = setTimeout(() => {
                      log('[download_parallel] Force-completing after 5s at 100%');
                      pendingDownloads.delete(gameId);
                      for (const r of requests) { try { r.req.destroy(); } catch {} }
                      // Chunks will error -> see completedExternally -> resolve 'ok'
                      // Promise.all settles -> completedExternally bail-out -> resolve via success path
                    }, 5000);
                  }
                }
              });

              res.on('end', () => {
                closeAnd(() => clearTimerAndResolve('ok'));
              });

              res.on('error', (e) => { tryRetry(e.message); });
            });

            req.on('error', (e) => { tryRetry(e.message); });

            requests.push({ req, chunkFd, chunkIndex: chunk.index });
          });
        };

        const chunkResults = await Promise.all(chunks.map(c => downloadChunk(c)));

        // Force-complete triggered, resolve and bail
        if (completedExternally) { resolve(destPath); return; }

        pendingDownloads.delete(gameId);

        // Check if intentionally interrupted
        if (chunkResults.includes('interrupted') || downloadActions.get(gameId)) {
          downloadActions.delete(gameId);
          onProgress(size, size);
          log('[download_parallel] Interrupted by user');
          resolve('interrupted');
          return;
        }

        // Check for errors
        const errors = chunkResults.filter(r => r !== 'ok');
        if (errors.length > 0) {
          throw new Error('Download failed: ' + errors.join(', '));
        }

        resolve(destPath);
      } catch (e) {
        // Clean up requests on error
        if (!completedExternally) {
          pendingDownloads.delete(gameId);
          reject(e);
        }
      }
    })();
  });
}

// Get file size via Range HEAD request
function getFileSize(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const fetcher = urlObj.protocol === 'https:' ? https : http;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'Range': 'bytes=0-0', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    };
    fetcher.get(options, (res) => {
      const cr = res.headers['content-range'];
      if (!cr) { resolve(0); return; }
      const match = cr.match(/bytes 0-0\/(\d+)/);
      if (match) resolve(parseInt(match[1], 10));
      else resolve(0);
      res.resume();
    }).on('error', reject);
  });
}

function extractMsixvc(input, outputDir, onProgress = () => {}, cikPath, gameId) {
  return new Promise((resolve, reject) => {
    // Check if already cancelled/paused before spawning
    const preAction = downloadActions.get(gameId);
    if (preAction) {
      downloadActions.delete(gameId);
      log('[XvdTool] Pre-spawn interruption:', preAction);
      resolve('interrupted');
      return;
    }

    log('[XvdTool] Checking path:', xvdToolPath);
    if (!fs.existsSync(xvdToolPath)) {
      log('[XvdTool] NOT FOUND at:', xvdToolPath);
      return reject(new Error(`XvdTool not found at ${xvdToolPath}`));
    }
    log('[XvdTool] Input:', input.slice(0, 80), '...');
    log('[XvdTool] Output:', outputDir);

    const xvdDir = path.dirname(xvdToolPath);

    const args = ['extract', input, '-o', outputDir, '-n', '-j'];
    if (cikPath && fs.existsSync(cikPath)) {
      args.push('-c', cikPath);
      log('[XvdTool] Added CIK via -c:', cikPath);
    }
    log('[XvdTool] Cmd:', xvdToolPath, args.join(' '));
    log('[XvdTool] CWD:', xvdDir);
    log('[XvdTool] ENV PATH:', process.env.PATH?.slice(0, 200));

    const proc = spawn(xvdToolPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: xvdDir,
    });
    activeProcesses.set(gameId, proc);
    let stderr = '';
    let stdout = '';

    const timeout = setTimeout(() => {
      log('[XvdTool] TIMEOUT');
      proc.kill();
      reject(new Error('Extraction timed out after 10 minutes'));
    }, 600000);

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      const trimmed = text.trim();
      // Log all stdout for debugging progress
      if (trimmed) log('[XvdTool:stdout]', trimmed);
      // Progress from main region only — match any hex region, ignore small metadata (0x40000003)
      const mainMatch = trimmed.match(/Extracting region (?:0x[0-9a-fA-F]+): (\d{1,3})%/);
      if (mainMatch && !trimmed.includes('0x40000003')) {
        log('[XvdTool] onProgress call:', parseInt(mainMatch[1], 10));
        onProgress(parseInt(mainMatch[1], 10));
      }
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      const trimmed = text.trim();
      if (trimmed) log('[XvdTool:stderr]', trimmed);
      const mainMatch = trimmed.match(/Extracting region (?:0x[0-9a-fA-F]+): (\d{1,3})%/);
      if (mainMatch && !trimmed.includes('0x40000003')) {
        log('[XvdTool] onProgress call (stderr):', parseInt(mainMatch[1], 10));
        onProgress(parseInt(mainMatch[1], 10));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      activeProcesses.delete(gameId);
      log('[XvdTool] Process closed with code:', code);
      log('[XvdTool] Full stdout:', stdout.slice(-500));
      log('[XvdTool] Full stderr:', stderr.slice(-500));

      if (code === 0) {
        // Check for ERR messages in output even with code 0
        const errLine = (stdout + '\n' + stderr).match(/^ERR:.+$/m);
        if (errLine) {
          log('[XvdTool] Exit code 0 but error detected:', errLine[0]);
          reject(new Error(errLine[0]));
          return;
        }
        log('[XvdTool] Completed successfully');
        // Ensure final 100% progress in case XvdTool never emitted it
        onProgress(100);
        resolve(outputDir);
        return;
      }

      const action = downloadActions.get(gameId);
      if (action) {
        downloadActions.delete(gameId);
        log('[XvdTool] Interrupted by user:', action);
        resolve('interrupted');
        return;
      }

      log('[XvdTool] Failed with code:', code);
      reject(new Error(stderr.trim() || stdout.trim() || `Exit code ${code}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Cannot launch XvdTool: ${err.message}. Ensure .NET 8 Runtime is installed.`));
    });
  });
}

// IPC - Uninstall game
ipcMain.handle('uninstall_game', async (event, { gameId, folderPath }) => {
  log('[Uninstall] gameId:', gameId, 'folder:', folderPath);
  if (!folderPath || !fs.existsSync(folderPath)) return { success: false, error: 'Game folder not found' };

  // Try to unregister with wdapp (use manifest to find PackageFullName)
  const manifest = path.join(folderPath, 'appxmanifest.xml');
  if (fs.existsSync(manifest)) {
    try {
      // Extract Package Name from manifest
      const manifestContent = fs.readFileSync(manifest, 'utf8');
      const nameMatch = manifestContent.match(/Identity\s+[^>]*Name\s*=\s*"([^"]+)"/);
      if (nameMatch) {
        const packageName = nameMatch[1];
        log('[Uninstall] Found package name:', packageName);

        // Use PowerShell to find and remove the package (handles PublisherId automatically)
        log('[Uninstall] Enabling Developer Mode for unregister...');
        await toggleDeveloperMode(true);

        const psScript = `
          $name = "${packageName}";
          $pkg = Get-AppxPackage -AllUsers -Name $name -ErrorAction SilentlyContinue;
          if ($pkg) {
            Write-Output "Found package: $($pkg.PackageFullName)";
            $pkg | Remove-AppxPackage -AllUsers -ErrorAction Stop;
            Write-Output "OK";
          } else {
            Write-Output "NOT_FOUND via Get-AppxPackage, trying provisioned...";
            $prov = Get-AppxProvisionedPackage -Online | Where-Object { $_.PackageName -like "${packageName}*" } | Select-Object -First 1;
            if ($prov) {
              Write-Output "Found provisioned: $($prov.PackageName)";
              Remove-AppxProvisionedPackage -Online -PackageName $($prov.PackageName) -ErrorAction Stop;
              Write-Output "OK";
            } else {
              Write-Output "NOT_FOUND";
            }
          }
        `;
        await new Promise((resolve, reject) => {
          const proc = spawn('powershell', ['-NoProfile', '-Command', psScript], { stdio: 'pipe' });
          let out = '', err = '';
          proc.stdout.on('data', (c) => out += c.toString());
          proc.stderr.on('data', (c) => err += c.toString());
          proc.on('close', (code) => {
            if (code === 0 && out.includes('OK')) resolve();
            else if (out.includes('NOT_FOUND')) { log('[Uninstall] Package not found, skipping'); resolve(); }
            else reject(new Error(err.trim() || `exit ${code}`));
          });
          proc.on('error', reject);
        });
        log('[Uninstall] Unregistered successfully');
        await toggleDeveloperMode(false);
        log('[Uninstall] Developer Mode disabled');
      } else {
        log('[Uninstall] Could not find Package Name in manifest');
      }
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
ipcMain.handle('scan_installed_games', async (event, downloadPath) => {
  downloadPath = downloadPath || 'C:\\Xbox Games';
  try {
    if (!fs.existsSync(downloadPath)) return { downloadPath, games: [], sizes: {} };
    const folders = fs.readdirSync(downloadPath, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    log('[Scan] Found folders:', folders.length);
    const sizes = {};
    for (const folder of folders) {
      try {
        sizes[folder] = getFolderSize(path.join(downloadPath, folder));
      } catch { sizes[folder] = 0; }
    }
    return { downloadPath, games: folders, sizes };
  } catch (e) {
    log('[Scan] Error:', e.message);
    return { downloadPath, games: [], sizes: {} };
  }
});

function getFolderSize(dirPath) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += getFolderSize(fullPath);
      } else if (entry.isFile()) {
        total += fs.statSync(fullPath).size;
      }
    }
  } catch {}
  return total;
}

// IPC - Open folder in Explorer
ipcMain.handle('open_folder', async (event, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') { log('[open_folder] Invalid path'); return; }
  if (!fs.existsSync(folderPath)) { log('[open_folder] Not found:', folderPath); return; }
  try {
    const result = await shell.openPath(folderPath);
    log('[open_folder] Result:', folderPath, '->', result);
  } catch (e) { log('[open_folder] Error:', e.message); }
});

// IPC - Launch game
ipcMain.handle('launch_game', async (event, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string' || !fs.existsSync(folderPath)) return;
  try {
    // Try to find and launch the game executable
    const files = fs.readdirSync(folderPath);
    const exe = files.find(f => f.endsWith('.exe') && !f.includes('wdapp'));
    if (exe) {
      const proc = spawn(path.join(folderPath, exe), [], { cwd: folderPath, detached: true, stdio: 'ignore' });
      proc.unref();
    }
  } catch {}
});

// IPC - Check for app updates
ipcMain.handle('check_app_update', async () => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const currentVersion = pkg.version;

    const options = {
      hostname: 'api.github.com',
      path: '/repos/MidacoYT/XboxDownloader/releases/latest',
      method: 'GET',
      headers: { 'User-Agent': 'Xbox-Downloader/1.0' },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data.tag_name) { resolve({ hasUpdate: false }); return; }
            const latestVersion = data.tag_name.replace(/^v/, '');
            const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
            const asset = (data.assets || []).find(a => a.name.endsWith('.exe') || a.name.endsWith('.Setup.exe'));
            resolve({
              hasUpdate,
              currentVersion,
              latestVersion,
              downloadUrl: asset?.browser_download_url || null,
              releaseUrl: data.html_url,
              releaseName: data.name || data.tag_name,
              releaseNotes: data.body || '',
            });
          } catch { resolve({ hasUpdate: false }); }
        });
      });
      req.on('error', () => resolve({ hasUpdate: false }));
      req.end();
    });
  } catch { return { hasUpdate: false }; }
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// IPC - Download and launch app update
ipcMain.handle('download_app_update', async (event, downloadUrl) => {
  if (!downloadUrl || typeof downloadUrl !== 'string') return { success: false };
  try {
    const tmpDir = app.getPath('temp');
    const fileName = downloadUrl.split('/').pop() || 'XboxDownloader-Setup.exe';
    const destPath = path.join(tmpDir, fileName);

    log('[update] Downloading:', downloadUrl);
    log('[update] To:', destPath);

    const file = fs.createWriteStream(destPath);
    await new Promise((resolve, reject) => {
      https.get(downloadUrl, (res) => {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    });

    log('[update] Downloaded, launching:', destPath);
    await shell.openPath(destPath);
    return { success: true };
  } catch (e) {
    log('[update] Error:', e.message);
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  for (const [gameId, proc] of activeProcesses) {
    try { proc.kill(); } catch {}
  }
  activeProcesses.clear();
});
