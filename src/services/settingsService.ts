import { AppSettings, SettingsStore } from '../types/settings';

export class SettingsService {
  private static readonly SETTINGS_KEY = 'xbox-downloader-settings';

  /**
   * Get current settings from local storage
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Return default settings
      return {
        downloadPath: 'C:\\Xbox Games\\',
        language: 'en',
        theme: 'dark',
        autoDownload: true,
        downloadSpeed: 10,
        maxConcurrentDownloads: 3,
      };
    } catch (error) {
      console.error('💥 Error loading settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Save settings to local storage
   */
  static async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
      console.log('💾 Settings saved:', updated);
    } catch (error) {
      console.error('💥 Error saving settings:', error);
    }
  }

  /**
   * Get default settings
   */
  private static getDefaultSettings(): AppSettings {
    return {
      downloadPath: 'C:\\Xbox Games\\',
      language: 'en',
      theme: 'dark',
      autoDownload: true,
      downloadSpeed: 10,
      maxConcurrentDownloads: 3,
    };
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<void> {
    await this.saveSettings(this.getDefaultSettings());
    console.log('🔄 Settings reset to defaults');
  }

  /**
   * Get settings store for electron
   */
  static getSettingsStore(): SettingsStore {
    const settings = localStorage.getItem(this.SETTINGS_KEY);
    return {
      settings: settings ? JSON.parse(settings) : this.getDefaultSettings(),
      lastUpdated: Date.now(),
    };
  }
}
