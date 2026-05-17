export interface AppSettings {
  downloadPath: string;
  language: 'en' | 'fr';
  theme: 'dark' | 'light';
  autoDownload: boolean;
  downloadSpeed: number;
  maxConcurrentDownloads: number;
}

export interface SettingsStore {
  settings: AppSettings;
  lastUpdated: number;
}
