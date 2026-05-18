const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getGamePassGames: () => ipcRenderer.invoke('get_gamepass_games'),
  getGameDetails: (productId) => {
    if (typeof productId !== 'string' || !productId) return Promise.reject(new Error('Invalid productId'));
    return ipcRenderer.invoke('get_game_details', productId);
  },
  getPackageInfo: (productId) => {
    if (typeof productId !== 'string' || !productId) return Promise.reject(new Error('Invalid productId'));
    return ipcRenderer.invoke('get_package_info', productId);
  },
  openFolderDialog: () => ipcRenderer.invoke('open_folder_dialog'),
  downloadFile: (url, downloadPath, gameId, gameName, gameSize) => {
    if (typeof url !== 'string' || !url) return Promise.reject(new Error('Invalid URL'));
    if (typeof downloadPath !== 'string' || !downloadPath) return Promise.reject(new Error('Invalid download path'));
    if (typeof gameId !== 'string' || !gameId) return Promise.reject(new Error('Invalid gameId'));
    return ipcRenderer.invoke('download_file', { url, downloadPath, gameId, gameName, gameSize });
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download_progress', (_event, data) => callback(data));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download_complete', (_event, data) => callback(data));
  },
  onExtractProgress: (callback) => {
    ipcRenderer.on('extract_progress', (_event, data) => callback(data));
  },
  onConsoleLog: (callback) => {
    ipcRenderer.on('console_log', (_event, msg) => callback(msg));
  },
  uninstallGame: (gameId, folderPath) => ipcRenderer.invoke('uninstall_game', { gameId, folderPath }),
  scanInstalledGames: (downloadPath) => ipcRenderer.invoke('scan_installed_games', downloadPath),
  openFolder: (folderPath) => ipcRenderer.invoke('open_folder', folderPath),
  launchGame: (folderPath) => ipcRenderer.invoke('launch_game', folderPath),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  checkAppUpdate: () => ipcRenderer.invoke('check_app_update'),
  downloadAppUpdate: (url) => ipcRenderer.invoke('download_app_update', url),

  // Pause / Resume / Cancel
  pauseDownload: (gameId) => ipcRenderer.invoke('pause_download', gameId),
  resumeDownload: (gameId) => ipcRenderer.invoke('resume_download', gameId),
  cancelDownload: (gameId) => ipcRenderer.invoke('cancel_download', gameId),
  onDownloadPaused: (callback) => {
    ipcRenderer.on('download_paused', (_event, data) => callback(data));
  },
});
