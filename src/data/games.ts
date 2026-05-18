export interface Game {
  id: string;
  title: string;
  developer: string;
  publisher: string;
  publisherWebsite?: string;
  supportUri?: string;
  genre: string[];
  rating: number;
  size: string;
  sizeGB: number;
  releaseDate: string;
  description: string;
  productDescription?: string;
  shortDescription?: string;
  cover: string;
  hero: string;
  poster?: string;
  screenshots?: string[];
  trailers?: Array<{
    id: string;
    caption: string;
    dash: string;
    hls: string;
    previewImage: string;
    purpose: string;
  }>;
  heroTrailer?: {
    id: string;
    caption: string;
    dash: string;
    hls: string;
    previewImage: string;
  };
  tags: string[];
  isNew?: boolean;
  hasUpdate?: boolean;
  updateSize?: string;
  players: string;
  metacritic?: number;
  metacriticScore?: number;
  metacriticRatingCount?: number;
  ageRating: string;
  originalReleaseDate?: string;
  category?: string;
  categories?: string[];
  ratingCount?: number;
  installed?: boolean;
  downloadProgress?: number;
  state?: string;
  installPath?: string;
  version?: string;
  latestVersion?: string;
  achievements?: number;
  gamerscore?: number;
  platforms?: {
    one: boolean;
    series: boolean;
    windows: boolean;
    cloud: boolean;
  };
  EAPlay?: boolean;
  contentRatings?: Array<{
    system: string;
    id: string;
    descriptors: string[];
    disclaimers: string[];
    interactiveElements: string[];
  }>;
  interactiveElements?: string[];
  systemRequirements?: any[];
  lastModifiedDate?: string;
  searchTitles?: Array<{
    searchString: string;
    type: string;
  }>;
  voiceTitle?: string;
  renderGroupDetails?: any;
  interactive3DEnabled?: boolean;
  language?: string;
  markets?: string[];
  attributes?: Array<{ name: string; min?: number; max?: number }>;
  usageData?: Array<{
    aggregateTimeSpan: string;
    averageRating: number;
    playCount: number;
    ratingCount: number;
    rentalCount: number;
    trialCount: number;
    purchaseCount: number;
  }>;
}

export const games: Game[] = [
  {
    id: "halo-mcc",
    title: "Halo: The Master Chief Collection",
    developer: "343 Industries",
    publisher: "Xbox Game Studios",
    genre: ["Action", "FPS", "Shooter"],
    rating: 4.8,
    size: "97.6 GB",
    sizeGB: 97.6,
    releaseDate: "2019-12-03",
    description: "Halo: The Master Chief Collection is a compilation of first-person shooter video games in the Halo series. Experience all 6 Halo games in one legendary collection.",
    cover: "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["FPS", "Sci-Fi", "Campaign", "Multiplayer"],
    players: "1-4",
    metacritic: 87,
    ageRating: "PEGI 16",
    installed: true,
    hasUpdate: true,
    updateSize: "2.1 GB",
    version: "1.2.3",
    latestVersion: "1.3.0",
  },
  {
    id: "forza-horizon-5",
    title: "Forza Horizon 5",
    developer: "Playground Games",
    publisher: "Xbox Game Studios",
    genre: ["Racing", "Open World"],
    rating: 4.9,
    size: "103 GB",
    sizeGB: 103,
    releaseDate: "2021-11-09",
    description: "Explore the vibrant open world landscapes of Mexico with limitless, fun driving action in hundreds of the world's greatest cars.",
    cover: "https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["Racing", "Open World", "Mexico", "Co-op"],
    players: "1-12",
    metacritic: 92,
    ageRating: "PEGI 3",
    installed: false,
    isNew: false,
    downloadProgress: 0,
  },
  {
    id: "doom-dark-ages",
    title: "DOOM: The Dark Ages",
    developer: "id Software",
    publisher: "Bethesda Softworks",
    genre: ["Action", "FPS", "Shooter"],
    rating: 4.7,
    size: "85 GB",
    sizeGB: 85,
    releaseDate: "2025-05-15",
    description: "The prequel to DOOM (2016). Before he was the DOOM Slayer, he was the Hell Walker. Experience raw, brutal combat in a dark medieval world.",
    cover: "https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["FPS", "Dark", "Medieval", "Action"],
    players: "1",
    metacritic: 88,
    ageRating: "PEGI 18",
    installed: false,
    isNew: true,
    downloadProgress: 0,
  },
  {
    id: "starfield",
    title: "Starfield",
    developer: "Bethesda Game Studios",
    publisher: "Bethesda Softworks",
    genre: ["RPG", "Action", "Sci-Fi"],
    rating: 4.2,
    size: "139 GB",
    sizeGB: 139,
    releaseDate: "2023-09-06",
    description: "Starfield is the first new universe in 25 years from Bethesda Game Studios. In this next-generation role-playing game set amongst the stars, create any character you want and explore with unparalleled freedom.",
    cover: "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["RPG", "Space", "Sci-Fi", "Exploration"],
    players: "1",
    metacritic: 83,
    ageRating: "PEGI 18",
    installed: true,
    hasUpdate: false,
    version: "1.12.36",
    latestVersion: "1.12.36",
  },
  {
    id: "metaphor-refantazio",
    title: "Metaphor: ReFantazio",
    developer: "Atlus",
    publisher: "SEGA",
    genre: ["RPG", "JRPG", "Turn-Based"],
    rating: 4.9,
    size: "27.3 GB",
    sizeGB: 27.3,
    releaseDate: "2024-10-11",
    description: "A new fantasy RPG from the award-winning Persona series creator. Embark on an epic journey in a dark medieval world filled with monsters and magic.",
    cover: "https://images.pexels.com/photos/1293120/pexels-photo-1293120.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1293120/pexels-photo-1293120.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["JRPG", "Fantasy", "Turn-Based", "Story"],
    players: "1",
    metacritic: 94,
    ageRating: "PEGI 12",
    installed: false,
    isNew: true,
    downloadProgress: 0,
  },
  {
    id: "star-wars-jedi-survivor",
    title: "STAR WARS Jedi: Survivor",
    developer: "Respawn Entertainment",
    publisher: "Electronic Arts",
    genre: ["Action", "Adventure", "Soulslike"],
    rating: 4.6,
    size: "55 GB",
    sizeGB: 55,
    releaseDate: "2023-04-28",
    description: "Jedi Cal Kestis must keep the spark of hope alive in the galaxy. Journey to hidden outposts, a shattered world, and beyond as you uncover the next chapter of Cal's story.",
    cover: "https://images.pexels.com/photos/1422291/pexels-photo-1422291.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1422291/pexels-photo-1422291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["Action", "Star Wars", "Adventure", "Story"],
    players: "1",
    metacritic: 85,
    ageRating: "PEGI 16",
    installed: false,
    downloadProgress: 0,
  },
  {
    id: "balatro",
    title: "Balatro",
    developer: "LocalThunk",
    publisher: "Playstack",
    genre: ["Strategy", "Card Game", "Roguelike"],
    rating: 4.8,
    size: "0.3 GB",
    sizeGB: 0.3,
    releaseDate: "2024-02-20",
    description: "A poker-inspired roguelike where you create poker hands, discover unique joker cards, and build increasingly powerful builds as you progress.",
    cover: "https://images.pexels.com/photos/3758104/pexels-photo-3758104.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/3758104/pexels-photo-3758104.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["Roguelike", "Cards", "Strategy", "Indie"],
    players: "1",
    metacritic: 90,
    ageRating: "PEGI 3",
    installed: true,
    hasUpdate: true,
    updateSize: "45 MB",
    version: "1.0.1",
    latestVersion: "1.0.2",
  },
  {
    id: "cities-skylines-2",
    title: "Cities: Skylines II",
    developer: "Colossal Order",
    publisher: "Paradox Interactive",
    genre: ["Simulation", "Strategy", "City Builder"],
    rating: 3.8,
    size: "12.8 GB",
    sizeGB: 12.8,
    releaseDate: "2023-10-24",
    description: "Build and manage the city of your dreams. Cities: Skylines II raises the bar, placing you in charge of a living world that reacts to your decisions.",
    cover: "https://images.pexels.com/photos/1603650/pexels-photo-1603650.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1603650/pexels-photo-1603650.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["City Builder", "Strategy", "Simulation"],
    players: "1",
    metacritic: 75,
    ageRating: "PEGI 3",
    installed: false,
    downloadProgress: 0,
  },
  {
    id: "minecraft",
    title: "Minecraft",
    developer: "Mojang Studios",
    publisher: "Xbox Game Studios",
    genre: ["Sandbox", "Survival", "Adventure"],
    rating: 4.9,
    size: "1.2 GB",
    sizeGB: 1.2,
    releaseDate: "2011-11-18",
    description: "Explore infinite randomly generated worlds and build amazing things from the simplest of homes to the grandest of castles.",
    cover: "https://images.pexels.com/photos/1040157/pexels-photo-1040157.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1040157/pexels-photo-1040157.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["Sandbox", "Creative", "Survival", "Multiplayer"],
    players: "1-8",
    metacritic: 93,
    ageRating: "PEGI 7",
    installed: true,
    hasUpdate: true,
    updateSize: "120 MB",
    version: "1.21.3",
    latestVersion: "1.21.4",
  },
  {
    id: "sea-of-thieves",
    title: "Sea of Thieves",
    developer: "Rare",
    publisher: "Xbox Game Studios",
    genre: ["Action", "Adventure", "Open World"],
    rating: 4.4,
    size: "47.5 GB",
    sizeGB: 47.5,
    releaseDate: "2018-03-20",
    description: "An epic pirate adventure set in a shared world. Sail the seas, hunt treasure, and fight rival pirates in this open-world action-adventure game.",
    cover: "https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["Pirate", "Open World", "Co-op", "Adventure"],
    players: "1-4",
    metacritic: 80,
    ageRating: "PEGI 12",
    installed: false,
    downloadProgress: 0,
  },
  {
    id: "age-of-empires-4",
    title: "Age of Empires IV",
    developer: "Relic Entertainment",
    publisher: "Xbox Game Studios",
    genre: ["Strategy", "RTS", "Historical"],
    rating: 4.3,
    size: "50.5 GB",
    sizeGB: 50.5,
    releaseDate: "2021-10-28",
    description: "Age of Empires IV puts you at the center of epic historical battles. Choose your civilization and guide it through the ages.",
    cover: "https://images.pexels.com/photos/4842572/pexels-photo-4842572.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/4842572/pexels-photo-4842572.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["RTS", "Historical", "Strategy", "Multiplayer"],
    players: "1-8",
    metacritic: 81,
    ageRating: "PEGI 12",
    installed: false,
    downloadProgress: 0,
  },
  {
    id: "outer-wilds",
    title: "Outer Wilds",
    developer: "Mobius Digital",
    publisher: "Annapurna Interactive",
    genre: ["Adventure", "Mystery", "Exploration"],
    rating: 4.9,
    size: "4.1 GB",
    sizeGB: 4.1,
    releaseDate: "2019-05-28",
    description: "An award-winning mystery about a solar system trapped in an endless time loop. Explore a hand-crafted world filled with wonder and intrigue.",
    cover: "https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop",
    hero: "https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    tags: ["Mystery", "Space", "Exploration", "Indie"],
    players: "1",
    metacritic: 85,
    ageRating: "PEGI 7",
    installed: false,
    isNew: false,
    downloadProgress: 0,
  },
];

export const getInstalledGames = () => games.filter(g => g.installed);
export const getAvailableGames = () => games.filter(g => !g.installed);
export const getGamesWithUpdates = () => games.filter(g => g.hasUpdate);
