import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';

interface FolderSelectorProps {
  currentPath: string;
  onPathChange: (path: string) => void;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({ currentPath, onPathChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleBrowse = () => {
    // Open folder browser dialog
    window.electronAPI?.openFolderDialog?.().then((result) => {
      if (result && !result.canceled && result.filePaths.length > 0) {
        onPathChange(result.filePaths[0]);
      }
    });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        fontWeight: 500
      }}>
        Installation Folder
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={currentPath}
          onChange={(e) => onPathChange(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(124, 58, 237, 0.2)',
            border: '2px solid rgba(124, 58, 237, 0.4)',
            color: '#ffffff',
            fontSize: '0.85rem'
          }}
        />
        <button
          onClick={handleBrowse}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: '#7c3aed',
            border: '2px solid #9333ea',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
          }}
        >
          Browse
        </button>
      </div>
    </div>
  );
};

export default FolderSelector;
