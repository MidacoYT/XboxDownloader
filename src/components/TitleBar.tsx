import React, { useState, useEffect } from 'react';
import logo from '../assets/icon.png';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.electronAPI?.windowIsMaximized?.();
      setIsMaximized(maximized);
    };
    checkMaximized();

    const interval = setInterval(checkMaximized, 500);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize?.();
  };

  const handleMaximize = async () => {
    await window.electronAPI?.windowMaximize?.();
    const maximized = await window.electronAPI?.windowIsMaximized?.();
    setIsMaximized(maximized);
  };

  const handleClose = () => {
    window.electronAPI?.windowClose?.();
  };

  return (
    <div style={{
      height: '36px',
      background: 'linear-gradient(180deg, var(--bg-card-hover) 0%, var(--bg-card) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: '12px',
      paddingRight: '4px',
      WebkitAppRegion: 'drag',
      userSelect: 'none',
      flexShrink: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logo} alt="Logo" style={{ width: '20px', height: '20px' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>Xbox Downloader</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleMinimize}
          style={{
            width: '36px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)';
            e.currentTarget.style.color = '#f0f0ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          style={{
            width: '36px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)';
            e.currentTarget.style.color = '#f0f0ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="0" width="8" height="8" />
              <rect x="0" y="2" width="8" height="8" fill="#13131f" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0" y="0" width="10" height="10" />
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          style={{
            width: '36px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
