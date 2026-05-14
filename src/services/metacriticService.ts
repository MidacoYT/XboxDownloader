import metacriticAPI from '@alepertu/metacritic-api';

const api = metacriticAPI('xbox-series-x');

const cacheKey = 'metacritic-cache';
const cacheExpiry = 60 * 60 * 1000;

interface MetacriticCache {
  [gameId: string]: { score: number; ratingCount: number; timestamp: number };
}

function getCache(): MetacriticCache {
  try {
    const raw = localStorage.getItem(cacheKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(cache: MetacriticCache): void {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch {}
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s*-\s*Edition\b.*$/gi, '')
    .replace(/\s*-\s*Definitive\s*/gi, ' ')
    .replace(/\s*20\d{2}\s*Edition\b/gi, '')
    .replace(/\s*Game\s*Pass\b/gi, '')
    .replace(/Remastered|Remake|Ultimate|Deluxe|Enhanced/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface MetacriticScore {
  score: number;
  ratingCount: number;
}

export async function getMetacriticScore(gameTitle: string, gameId: string): Promise<MetacriticScore | null> {
  const cache = getCache();
  const now = Date.now();

  if (cache[gameId] && (now - cache[gameId].timestamp) < cacheExpiry) {
    return { score: cache[gameId].score, ratingCount: cache[gameId].ratingCount };
  }

  try {
    const cleanName = cleanTitle(gameTitle);

    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 5000);
    });

    await Promise.race([
      api.loadMetacriticPage(cleanName),
      timeoutPromise,
    ]);

    const data = api.getMetacriticScores();

    if (data?.metacritic_score !== undefined && data.metacritic_score !== null) {
      const result = {
        score: data.metacritic_score,
        ratingCount: data.number_of_reviews || 0,
      };

      const newCache = { ...cache, [gameId]: { ...result, timestamp: now } };
      setCache(newCache);

      return result;
    }
  } catch {}
  return null;
}