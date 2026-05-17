import React, { useState, useEffect } from 'react';
import { Download, X, FolderOpen, Loader2 } from 'lucide-react';
import { SettingsService } from '../services/settingsService';

interface DownloadDialogProps {
  gameId: string;
  gameName: string;
  onConfirm: (path: string) => void;
  onCancel: () => void;
}

const DownloadDialog: React.FC<DownloadDialogProps> = ({ gameId, gameName, onConfirm, onCancel }) => {
  const [path, setPath] = useState('');

  useEffect(() => {
    SettingsService.getSettings().then(s => setPath(s.downloadPath || 'C:\\Xbox Games\\'));
  }, []);

  const handleBrowse = () => {
    window.electronAPI?.openFolderDialog?.().then((result) => {
      if (result && !result.canceled && result.filePaths.length > 0) {
        setPath(result.filePaths[0]);
      }
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
    }} onClick={onCancel}>
      <div style={{
        width: '460px', maxWidth: '90vw',
        borderRadius: '16px', overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid rgba(124,58,237,0.25)',
        boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(124,58,237,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Download size={20} style={{ color: '#a855f7' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Download Game
            </span>
          </div>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '4px', borderRadius: '6px',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Game name */}
        <div style={{ padding: '16px 24px 8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Game
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {gameName}
          </div>
        </div>

        {/* Path selector */}
        <div style={{ padding: '12px 24px 20px' }}>
          <label style={{
            display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)',
            marginBottom: '8px', fontWeight: 500,
          }}>
            Installation folder
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text" value={path}
              onChange={e => setPath(e.target.value)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.2)',
                color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
              }}
            />
            <button onClick={handleBrowse} style={{
              padding: '10px 16px', borderRadius: '8px',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
              color: 'var(--text-primary)', cursor: 'pointer',
            }}>
              <FolderOpen size={18} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid rgba(124,58,237,0.08)',
          display: 'flex', gap: '10px', justifyContent: 'flex-end',
        }}>
          <button onClick={onCancel} style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
            color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(path)} style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: 'white', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          }}>
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadDialog;
