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
  getGamePassGames: () => Promise<{ id: string; name?: string; state?: string }[]>;
  getGameDetails: (productId: string) => Promise<GameDetails | null>;
  getPackageInfo: (productId: string) => Promise<PackageInfo | null>;
  openFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  uninstallGame: (gameId: string, folderPath: string) => Promise<{ success: boolean; error?: string }>;
  scanInstalledGames: (downloadPath?: string) => Promise<{ downloadPath: string; games: string[]; sizes: Record<string, number> }>;
  downloadFile: (url: string, downloadPath: string, gameId: string, gameName?: string, gameSize?: number) => Promise<DownloadResult>;
  onDownloadProgress: (callback: (data: { gameId: string; receivedBytes: number; totalBytes: number; speed: number }) => void) => void;
  onDownloadComplete: (callback: (data: { gameId: string; filePath?: string; success: boolean; state?: string }) => void) => void;
  onExtractProgress: (callback: (data: { gameId: string; status: 'extracting' | 'done' | 'error'; filePath: string; extractDir?: string; error?: string }) => void) => void;
  onConsoleLog: (callback: (msg: string) => void) => void;
  openFolder: (folderPath: string) => void;
  launchGame: (folderPath: string) => void;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  windowIsMaximized: () => Promise<boolean>;
  checkAppUpdate: () => Promise<{
    hasUpdate: boolean;
    currentVersion?: string;
    latestVersion?: string;
    downloadUrl?: string | null;
    releaseUrl?: string;
    releaseName?: string;
    releaseNotes?: string;
  }>;
  downloadAppUpdate: (url: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
