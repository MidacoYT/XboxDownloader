import { SettingsService } from './settingsService';

const PRODUCT_ID_REGEX = /^[\w-]{8,}$/;
const FETCH_TIMEOUT = 30000;
const MAX_RETRIES = 2;

export interface DownloadResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  size?: number;
  extractDir?: string;
}

export class DownloadService {
  private static readonly baseUrl = 'https://xbox.skydevil.xyz/Game/GetGamePackage';

  static async getGameDownloadUrl(contentId: string, size: number, platform: number = 0): Promise<DownloadResponse> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const url = `${this.baseUrl}?contentId=${encodeURIComponent(contentId)}&platform=${platform}&size=${size}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'accept': '*/*',
            'referer': 'https://xbox.skydevil.xyz/',
            'x-author': 'Devil',
            'x-organization': 'XboxDownload',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
          },
          credentials: 'include',
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (attempt < MAX_RETRIES) continue;
          return { success: false, message: `Server responded with ${response.status}` };
        }

        const data = await response.json();

        if ((data.code == 200 || data.code === '200') && data.data?.url) {
          return {
            success: true,
            message: 'Direct download URL received',
            downloadUrl: data.data.url,
            size: data.data.size,
          };
        }

        return { success: false, message: data.msg || data.message || 'No download URL found' };
      } catch (error) {
        if (attempt < MAX_RETRIES) continue;
        const message = error instanceof DOMException && error.name === 'AbortError'
          ? 'Request timed out'
          : 'Failed to get download URL';
        return { success: false, message };
      }
    }

    return { success: false, message: 'Failed to get download URL' };
  }

  static async fetchPackageInfo(productId: string) {
    try {
      const info = await window.electronAPI?.getPackageInfo(productId);
      return info || null;
    } catch {
      return null;
    }
  }

  static async downloadGame(productId: string, platform: number = 0, gameName?: string, customPath?: string): Promise<DownloadResponse> {
    if (!PRODUCT_ID_REGEX.test(productId)) {
      return { success: false, message: 'Invalid product ID format' };
    }

    try {
      const pkgInfo = await this.fetchPackageInfo(productId);
      const contentId = pkgInfo?.contentId || productId;
      const size = pkgInfo?.size || 0;

      const response = await this.getGameDownloadUrl(contentId, size, platform);

      if (!response.success || !response.downloadUrl) {
        return { success: false, message: response.message || 'Failed to get download URL' };
      }

      const downloadPath = customPath || (await SettingsService.getSettings()).downloadPath || 'C:\\Xbox Games\\';

      const result = await window.electronAPI.downloadFile(response.downloadUrl, downloadPath, productId, gameName);

      return {
        success: result.success,
        message: result.success ? 'Extracting...' : 'Download failed',
        downloadUrl: response.downloadUrl,
        size: response.size,
        extractDir: result.extractDir,
      };
    } catch (error) {
      return { success: false, message: 'Download failed' };
    }
  }
}
