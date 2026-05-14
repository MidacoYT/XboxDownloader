import React, { useState, useEffect } from 'react';
import { Download, Folder, Globe, Moon, Sliders, Layers, RotateCcw, Save, Check, Loader2, Zap } from 'lucide-react';
import { AppSettings } from '../types/settings';
import { SettingsService } from '../services/settingsService';
import FolderSelector from '../components/FolderSelector';
import SpeedSlider from '../components/SpeedSlider';
import ToggleSwitch from '../components/ToggleSwitch';

interface SettingsPageProps {
  onThemeChange?: (theme: 'dark' | 'light') => void;
  currentTheme?: 'dark' | 'light';
}

const cardStyle: React.CSSProperties = {
  borderRadius: '14px',
  background: 'var(--bg-card)',
  border: '1px solid rgba(124, 58, 237, 0.12)',
  padding: '24px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  background: 'rgba(124, 58, 237, 0.06)',
  border: '1px solid rgba(124, 58, 237, 0.2)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
  fontWeight: 500,
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onThemeChange, currentTheme }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const loadedSettings = await SettingsService.getSettings();
        setSettings(loadedSettings);
      } catch {
        setError('Impossible de charger les paramètres.');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      await SettingsService.saveSettings(settings);
      if (settings.theme !== currentTheme && onThemeChange) {
        onThemeChange(settings.theme);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Impossible de sauvegarder les paramètres.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await SettingsService.resetSettings();
      const defaultSettings = await SettingsService.getSettings();
      setSettings(defaultSettings);
    } catch {
      setError('Impossible de réinitialiser les paramètres.');
    } finally {
      setIsLoading(false);
    }
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  if (!settings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#a855f7', margin: '0 auto 16px' }} />
          <p>Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '4px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={22} style={{ color: '#a855f7' }} />
          Settings
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Configurez votre expérience de téléchargement</p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#fca5a5', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {/* General Settings */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <Globe size={15} style={{ color: '#a855f7' }} />
          General
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Theme</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                onClick={() => update('theme', t)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  background: settings.theme === t ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(124,58,237,0.06)',
                  border: settings.theme === t ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(124,58,237,0.15)',
                  color: settings.theme === t ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Moon size={14} />
                {t === 'dark' ? 'Sombre' : 'Clair'}
              </button>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Langue</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['en', 'fr'] as const).map(l => (
              <button
                key={l}
                onClick={() => update('language', l)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  background: settings.language === l ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(124,58,237,0.06)',
                  border: settings.language === l ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(124,58,237,0.15)',
                  color: settings.language === l ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {l === 'en' ? 'English' : 'Français'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Download Settings */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <Download size={15} style={{ color: '#a855f7' }} />
          Downloads
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Dossier d'installation</label>
          <FolderSelector
            currentPath={settings.downloadPath || 'C:\\Xbox Games\\'}
            onPathChange={(path) => update('downloadPath', path)}
          />
        </div>

        <div style={fieldStyle}>
          <SpeedSlider
            value={settings.downloadSpeed ?? 0}
            onChange={(speed) => update('downloadSpeed', speed)}
            max={100}
            min={0}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid rgba(124,58,237,0.06)' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Téléchargements simultanés</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Maximum de téléchargements en parallèle</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => update('maxConcurrentDownloads', Math.max(1, (settings.maxConcurrentDownloads ?? 3) - 1))}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >−</button>
            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 700, color: '#a855f7', fontSize: '1rem' }}>
              {settings.maxConcurrentDownloads ?? 3}
            </span>
            <button
              onClick={() => update('maxConcurrentDownloads', Math.min(10, (settings.maxConcurrentDownloads ?? 3) + 1))}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
          </div>
        </div>
      </div>

      {/* Advanced */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <Layers size={15} style={{ color: '#a855f7' }} />
          Avancé
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 0',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Mises à jour automatiques</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Télécharger automatiquement les mises à jour des jeux installés
            </div>
          </div>
          <ToggleSwitch
            checked={settings.autoDownload ?? false}
            onChange={(checked) => update('autoDownload', checked)}
            label=""
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          style={{
            flex: 1, padding: '12px 20px', borderRadius: '10px',
            border: 'none',
            background: isLoading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: 'white', fontSize: '0.88rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: isLoading ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {isLoading ? (
            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sauvegarde...</>
          ) : saved ? (
            <><Check size={16} /> Sauvegardé</>
          ) : (
            <><Save size={16} /> Sauvegarder</>
          )}
        </button>

        <button
          onClick={handleResetSettings}
          disabled={isLoading}
          style={{
            padding: '12px 20px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171', fontSize: '0.88rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; } }}
          onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; } }}
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
