/**
 * Script to build the productId → CIK GUID mapping.
 * For each game in games.json, finds the required CIK key
 * by running XvdTool briefly and parsing the error message.
 *
 * Usage: node scripts/build-cik-mapping.js
 *
 * Requires: XvdTool.Streaming.exe in ./Xvd/
 * Optional: pass CIK folder path as arg (e.g., node scripts/build-cik-mapping.js ./Cik)
 *   If provided, the script verifies the CIK file exists before mapping.
 */

const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const GAMES_JSON_URL = 'https://raw.githubusercontent.com/MidacoYT/Games/refs/heads/main/games.json';
const XVDTOOL = path.join(__dirname, '..', 'Xvd', 'XvdTool.Streaming.exe');
const XVD_DIR = path.dirname(XVDTOOL);
const CIK_DIR = process.argv[2] ? path.resolve(process.argv[2]) : null;

if (!fs.existsSync(XVDTOOL)) {
  console.error('XvdTool not found at:', XVDTOOL);
  process.exit(1);
}

const DEFAULT_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const SKYDEVIL_HEADERS = {
  'accept': '*/*',
  'referer': 'https://xbox.skydevil.xyz/',
  'x-author': 'Devil',
  'x-organization': 'XboxDownload',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
};

function httpGet(url, extraHeaders) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { ...DEFAULT_HEADERS, ...extraHeaders } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getPackageInfo(productId) {
  const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${productId}&market=US&languages=en-us&MS-CV=DGU1mcuYo0WMMp+F.1`;
  try {
    const body = await httpGet(url);
    const data = JSON.parse(body);
    const product = data?.Products?.[0];
    if (!product) return null;

    for (const sku of (product.DisplaySkuAvailabilities || [])) {
      for (const pkg of (sku?.Sku?.Properties?.Packages || [])) {
        if (pkg.PackageFormat === 'MSIXVC' && pkg.ContentId) {
          return {
            contentId: pkg.ContentId,
            size: pkg.MaxDownloadSizeInBytes || 0,
            name: product.LocalizedProperties?.[0]?.ProductTitle || productId,
          };
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function getDownloadUrl(contentId, size) {
  const url = `https://xbox.skydevil.xyz/Game/GetGamePackage?contentId=${encodeURIComponent(contentId)}&platform=0&size=${size}`;
  try {
    const body = await httpGet(url, SKYDEVIL_HEADERS);
    const data = JSON.parse(body);
    if ((data.code == 200 || data.code === '200') && data.data?.url) {
      return data.data.url;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getRequiredCikGuid(downloadUrl, timeoutMs = 10000) {
  return new Promise((resolve) => {
    // Create empty temp dir so XvdTool reports which key is needed
    const emptyCikDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cik-scan-'));
    const proc = spawn(XVDTOOL, ['extract', downloadUrl, '-o', os.tmpdir(), '-n', '-k', emptyCikDir], {
      cwd: XVD_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
    }, timeoutMs);

    proc.on('close', () => {
      clearTimeout(timer);
      // Clean up empty temp dir
      try { fs.rmSync(emptyCikDir, { recursive: true, force: true }); } catch {}
      // Look for the CIK GUID in stdout (XvdTool writes errors to stdout, not stderr)
      const match = stdout.match(/Could not find key ([a-f0-9-]+) loaded/);
      if (match) {
        resolve(match[1]);
      } else {
        // If no key error, log output for debugging
        const trimmed = stdout.trim().slice(0, 300) || '(empty)';
        console.log('XvdTool output:', trimmed);
        resolve(null);
      }
    });

    proc.on('error', () => {
      clearTimeout(timer);
      try { fs.rmSync(emptyCikDir, { recursive: true, force: true }); } catch {}
      resolve(null);
    });
  });
}

async function main() {
  console.log('Fetching games.json...');
  const gamesJson = await httpGet(GAMES_JSON_URL, DEFAULT_HEADERS);
  const games = JSON.parse(gamesJson);
  const productIds = Object.keys(games);
  console.log(`Found ${productIds.length} games\n`);

  const mapping = {};
  let done = 0;
  let found = 0;
  let errors = 0;

  for (const key of productIds) {
    const game = games[key] || {};
    const productId = game.productId;
    const gameName = game.name || productId || key;
    if (!productId) {
      done++;
      console.log(`[${done}/${productIds.length}] ${gameName}... SKIP (no productId)`);
      errors++;
      continue;
    }
    done++;
    process.stdout.write(`[${done}/${productIds.length}] ${gameName}... `);

    try {
      // Step 1: Get ContentId + size from Xbox API
      const pkgInfo = await getPackageInfo(productId);
      if (!pkgInfo || !pkgInfo.contentId) {
        console.log('SKIP (no package info)');
        errors++;
        continue;
      }

      // Step 2: Get download URL from skydevil API
      const downloadUrl = await getDownloadUrl(pkgInfo.contentId, pkgInfo.size);
      if (!downloadUrl) {
        console.log('SKIP (no download URL)');
        errors++;
        continue;
      }

      // Step 3: Find required CIK GUID via XvdTool
      const cikGuid = await getRequiredCikGuid(downloadUrl);
      if (!cikGuid) {
        console.log('SKIP (could not determine CIK)');
        errors++;
        continue;
      }

      // Check CIK file exists (optional, just logs a warning)
      if (CIK_DIR) {
        const cikFile = path.join(CIK_DIR, cikGuid + '.cik');
        if (!fs.existsSync(cikFile)) {
          console.log(`WARN (CIK file ${cikGuid}.cik not in ${CIK_DIR}) -> mapping saved anyway`);
        } else {
          console.log(`OK -> ${cikGuid} (CIK file found)`);
        }
      } else {
        console.log(`OK -> ${cikGuid}`);
      }

      mapping[productId] = { name: gameName, cik: cikGuid };
      found++;
    } catch (e) {
      console.log('ERROR:', e.message);
      errors++;
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Output the mapping
  console.log(`\n=== Results: ${found} mapped, ${errors} errors ===\n`);
  console.log(JSON.stringify(mapping, null, 2));

  // Save to file
  const outputPath = path.join(__dirname, 'cik-mapping.json');
  fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
}

main().catch(console.error);
