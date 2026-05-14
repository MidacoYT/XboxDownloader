import axios from 'axios';

const RAWG_KEY = '3af4f8deab0d4dc58acef4ef65fd3558';
const RAWG_BASE = 'https://api.rawg.io/api';
const CACHE_TTL = 30 * 60 * 1000;

const cache = new Map<string, { data: any; expiry: number }>();
export const scoreCache = new Map<string, { metacritic: number; ratingsCount: number; description: string; background: string; clipPreview: string }>();

async function fetchRawg(path: string): Promise<any | null> {
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && now < cached.expiry) return cached.data;

  try {
    const { data } = await axios.get(`${RAWG_BASE}${path}&key=${RAWG_KEY}`, { timeout: 10000 });
    cache.set(path, { data, expiry: now + CACHE_TTL });
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

function normalizeTitle(title: string): string {
  return title
    .replace(/:\s*(the|part|edition|ii|iii|iv|v)$/i, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/[^a-z0-9\s]/gi, '')
    .trim();
}

function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  const edits = levenshtein(shorter, longer);
  return (longer.length - edits) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export async function getMetacritic(gameTitle: string): Promise<{ metacritic: number; ratingsCount: number } | null> {
  const search = normalizeTitle(gameTitle);
  if (!search) return null;
  const data = await fetchRawg(`/games?search=${encodeURIComponent(search)}&page_size=5`);
  if (!data?.results?.length) return null;
  for (const g of data.results) {
    if (!g.metacritic) continue;
    const sim = similarity(search, normalizeTitle(g.name));
    if (sim >= 0.65) {
      return { metacritic: g.metacritic, ratingsCount: g.ratings_count || 0 };
    }
  }
  return null;
}

export async function getRawgDetails(gameTitle: string): Promise<{
  metacritic: number; ratingsCount: number; description: string; released: string; genres: string[]; background: string; clipPreview: string;
} | null> {
  const search = normalizeTitle(gameTitle);
  if (!search) return null;
  const data = await fetchRawg(`/games?search=${encodeURIComponent(search)}&page_size=5`);
  if (!data?.results?.length) return null;
  for (const g of data.results) {
    if (!g.metacritic) continue;
    const sim = similarity(search, normalizeTitle(g.name));
    if (sim >= 0.65) {
      return {
        metacritic: g.metacritic,
        ratingsCount: g.ratings_count || 0,
        description: g.description_raw || g.short_description || '',
        released: g.released || '',
        genres: g.genres?.map(r => r.name) || [],
        background: g.background_image || '',
        clipPreview: g.clip?.clip?.preview || g.clip?.preview || '',
      };
    }
  }
  return null;
}