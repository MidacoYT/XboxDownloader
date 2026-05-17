// Xbox API Service
// Uses Xbox Store API endpoints for real game data

import { Game } from '../data/games';

// Interfaces
export interface XboxGame {
  id: string;
  title: string;
  imageTile: string;
  hero?: string;
  poster?: string;
  screenshots?: string[];
  trailers?: XboxTrailer[];
  heroTrailer?: XboxTrailer;
  description?: string;
  productDescription?: string;
  shortDescription?: string;
  platforms: XboxPlatforms;
  price?: XboxPrice;
  EAPlay?: boolean;
  dateAdded?: string;
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  publisherWebsite?: string;
  supportUri?: string;
  genres?: string[];
  rating?: number;
  ageRating?: string;
  size?: string;
  players?: string;
  achievements?: number;
  gamerscore?: number;
  franchises?: string[];
  contentRatings?: XboxContentRating[];
  lastModifiedDate?: string;
  usageData?: XboxUsageData[];
  interactive3DEnabled?: boolean;
  language?: string;
  markets?: string[];
  searchTitles?: XboxSearchTitle[];
  categories?: string[];
  category?: string;
  attributes?: Array<{ name: string; min?: number; max?: number }>;
}

export interface XboxTrailer {
  id: string;
  caption: string;
  dash: string;
  hls: string;
  previewImage: string;
  purpose: string;
}

export interface XboxPlatforms {
  one: boolean;
  series: boolean;
  windows: boolean;
  cloud: boolean;
}

export interface XboxPrice {
  currency: string;
  amount: number;
  discountPercent?: number;
}

export interface XboxContentRating {
  system: string;
  id: string;
  descriptors: string[];
  disclaimers: string[];
  interactiveElements: string[];
}

export interface XboxUsageData {
  aggregateTimeSpan: string;
  averageRating: number;
  playCount: number;
  ratingCount: number;
  rentalCount: string;
  trialCount: string;
  purchaseCount: string;
}

export interface XboxSearchTitle {
  searchString: string;
  type: string;
}

export interface XboxGamePassData {
  id: string;
  title: string;
  imageTile: string;
  EAPlay: boolean;
  platforms: XboxPlatforms;
  price?: any;
  dateAdded?: string;
}

const HARDCODED_STATES: Record<string, string> = {
  '9NGLST31DG26': 'unavailable',
};

class XboxApiService {
  private readonly catalogUrl = 'https://catalog.gamepass.com/sigls/v2';
  private readonly detailsUrl = 'https://displaycatalog.mp.microsoft.com/v7.0/products';
  private readonly listId = 'fdd9e2a7-0fee-49f6-ad69-4354098401ff';
  private readonly batchSize = 10;
  private readonly batchDelay = 100;
  private readonly cacheKey = 'xbox-games-cache';
  private readonly cacheExpiry = 30 * 60 * 1000; // 30 minutes

  // Cached games storage
  private gamesCache: { games: Game[]; timestamp: number } | null = null;

  private getCachedGames(): Game[] | null {
    if (this.gamesCache) {
      return this.gamesCache.games;
    }

    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        if (age < this.cacheExpiry) {
          this.gamesCache = data;
          return data.games;
        }
      }
    } catch {}
    return null;
  }

  private setCachedGames(games: Game[]): void {
    this.gamesCache = { games, timestamp: Date.now() };
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.gamesCache));
    } catch {}
  }

  async getGamePassGames(): Promise<{ id: string; state?: string }[]> {
    try {
      if (!window.electronAPI?.getGamePassGames) {
        return [];
      }
      return await window.electronAPI.getGamePassGames();
    } catch {
      return [];
    }
  }

  async getGameDetails(gameId: string): Promise<XboxGame | null> {
    try {
      if (!window.electronAPI?.getGameDetails) {
        return null;
      }
      return await window.electronAPI.getGameDetails(gameId);
    } catch {
      return null;
    }
  }

  async getMultipleGameDetails(gameIds: string[]): Promise<XboxGame[]> {
    if (!gameIds?.length) return [];

    try {
      const allGames: XboxGame[] = [];

      for (let i = 0; i < gameIds.length; i += this.batchSize) {
        const batch = gameIds.slice(i, i + this.batchSize);

        const results = await Promise.allSettled(
          batch.map(gameId => this.getGameDetails(gameId))
        );

        const validGames = results
          .filter((result): result is PromiseFulfilledResult<XboxGame> =>
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);

        allGames.push(...validGames);

        if (i + this.batchSize < gameIds.length) {
          await this.delay(this.batchDelay);
        }
      }

      return allGames;
    } catch {
      return [];
    }
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Transformation helpers
  private transformXboxGameToGame = (xboxGame: XboxGame): Game => ({
    id: xboxGame.id || '',
    title: xboxGame.title || 'Unknown',
    developer: xboxGame.developer || '',
    publisher: xboxGame.publisher || '',
    publisherWebsite: xboxGame.publisherWebsite || '',
    supportUri: xboxGame.supportUri || '',
    genre: xboxGame.genres || [],
    rating: xboxGame.EAPlay ? 4.5 : 4,
    size: xboxGame.size || '? GB',
    sizeGB: xboxGame.size ? parseFloat(xboxGame.size.replace(/[^0-9.]/g, '')) || 0 : 0,
    releaseDate: xboxGame.releaseDate || xboxGame.dateAdded || '',
    description: xboxGame.productDescription || xboxGame.description || '',
    shortDescription: xboxGame.shortDescription || '',
    cover: xboxGame.imageTile || 'https://placehold.co/400x600/1a1a2e/7c3aed?text=Game',
    hero: xboxGame.hero || 'https://placehold.co/1200x600/1a1a2e/7c3aed?text=Game',
    poster: xboxGame.poster || '',
    screenshots: xboxGame.screenshots || [],
    trailers: xboxGame.trailers || [],
    heroTrailer: xboxGame.heroTrailer || undefined,
    tags: [...new Set([
      ...(xboxGame.genres || []),
      ...(xboxGame.categories || []),
      ...(xboxGame.searchTitles?.map(st => st.searchString) || [])
    ])],
    players: xboxGame.players || '1',
    ageRating: xboxGame.rating || 'PEGI 12',
    achievements: xboxGame.achievements || 0,
    gamerscore: xboxGame.gamerscore || 0,
    categories: xboxGame.categories || [],
    category: xboxGame.category || '',
    attributes: xboxGame.attributes || [],
    platforms: xboxGame.platforms || { one: false, series: false, windows: false, cloud: false },
    EAPlay: xboxGame.EAPlay || false,
    contentRatings: xboxGame.contentRatings || [],
    lastModifiedDate: xboxGame.lastModifiedDate || '',
    usageData: xboxGame.usageData?.map(usage => ({
      aggregateTimeSpan: usage.aggregateTimeSpan,
      averageRating: usage.averageRating,
      playCount: usage.playCount,
      ratingCount: usage.ratingCount,
      rentalCount: parseInt(String(usage.rentalCount)) || 0,
      trialCount: parseInt(String(usage.trialCount)) || 0,
      purchaseCount: parseInt(String(usage.purchaseCount)) || 0,
    })) || [],
    interactive3DEnabled: xboxGame.interactive3DEnabled || false,
    language: xboxGame.language || 'en-us',
    markets: xboxGame.markets || [],
  });

  // Main game fetching methods
  async getGamePassGamesFull(): Promise<Game[]> {
    const cached = this.getCachedGames();
    if (cached && cached.length > 0) {
      return cached.map(g => {
        if (HARDCODED_STATES[g.id]) g.state = HARDCODED_STATES[g.id];
        return g;
      });
    }

    try {
      const gameIds = await this.getGamePassGames();
      if (!gameIds.length) {
        return [];
      }

      const ids = gameIds.map(g => g.id);
      const xboxGames = await this.getMultipleGameDetails(ids);
      if (!xboxGames.length) {
        return [];
      }

      // Build state map (productId → state) — API response first, then hardcoded
      const stateMap: Record<string, string> = {};
      for (const g of gameIds) {
        if (g.state) stateMap[g.id] = g.state;
      }
      for (const [id, state] of Object.entries(HARDCODED_STATES)) {
        stateMap[id] = state;
      }

      const finalGames = xboxGames
        .filter(game => game?.id)
        .map(g => {
          const game = this.transformXboxGameToGame(g);
          if (stateMap[game.id]) game.state = stateMap[game.id];
          return game;
        });

      this.setCachedGames(finalGames);
      return finalGames;
    } catch {
      return [];
    }
  }

  async searchGame(gameId: string): Promise<Game | null> {
    const xboxGame = await this.getGameDetails(gameId);
    return xboxGame ? this.transformXboxGameToGame(xboxGame) : null;
  }

  async getNewGamePassGames(): Promise<Game[]> {
    return [];
  }

  async getLeavingGamePassGames(): Promise<Game[]> {
    return [];
  }

  async getTopGames(): Promise<Game[]> {
    try {
      const games = await this.getGamePassGamesFull();
      return games.slice(0, 20);
    } catch {
      return [];
    }
  }
}

export   const xboxApi = new XboxApiService();
// Get all games from API (combines catalog IDs + details)
export async function getGamePassGamesFull(): Promise<Game[]> {
  return xboxApi.getGamePassGamesFull();
}

// Get new games from API
export async function getNewGamesFull(): Promise<Game[]> {
  return xboxApi.getNewGamePassGames() as unknown as Game[];
}
