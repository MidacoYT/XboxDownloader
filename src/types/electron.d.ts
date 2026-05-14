interface PackageInfo {
  contentId: string;
  size: number;
}

interface DownloadResult {
  success: boolean;
  extractDir?: string;
}

interface DownloadProgressData {
  receivedBytes: number;
  totalBytes: number;
  speed: number;
}

interface GameDetails {
  id: string;
  title: string;
  [key: string]: unknown;
}

interface ElectronAPI {
  getGamePassGames: () => Promise<{ id: string; name?: string }[]>;
  getGameDetails: (productId: string) => Promise<GameDetails | null>;
  getPackageInfo: (productId: string) => Promise<PackageInfo | null>;
  openFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  checkForUpdates: () => Promise<{ currentVersion: string; latestVersion: string; hasUpdate: boolean }>;
  checkNow: () => Promise<{ checking: boolean }>;
  downloadUpdate: () => void;
  installUpdate: () => void;
  onUpdateAvailable: (callback: (data: { version: string }) => void) => void;
  onUpdateProgress: (callback: (data: { percent: number; bytesPerSecond: number }) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  downloadFile: (url: string, downloadPath: string, gameId: string, gameName?: string) => Promise<DownloadResult>;
  onDownloadProgress: (callback: (data: { gameId: string; receivedBytes: number; totalBytes: number; speed: number }) => void) => void;
  onDownloadComplete: (callback: (data: { gameId: string; filePath?: string; success: boolean; state?: string }) => void) => void;
  onExtractProgress: (callback: (data: { gameId: string; status: 'extracting' | 'done' | 'error'; filePath: string; extractDir?: string; error?: string }) => void) => void;
  onConsoleLog: (callback: (msg: string) => void) => void;
  extractMsixvc: (filePath: string, outputDir: string) => Promise<{ success: boolean; extractDir?: string; error?: string }>;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  windowIsMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
