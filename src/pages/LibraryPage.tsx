import React, { useState } from 'react';
import { Search, Play, RefreshCw, Trash2, HardDrive, Gamepad2 } from 'lucide-react';
import { Game } from '../data/games';
import GameCard from '../components/GameCard';

interface LibraryPageProps {
  installedGames: Game[];
  onDownload: (game: Game) => void;
  onUpdate: (game: Game) => void;
  onUninstall: (game: Game) => void;
  onPlay: (game: Game) => void;
  onDetails: (game: Game) => void;
  onOpenFolder?: (game: Game) => void;
  onRefresh?: () => Promise<void>;
  downloadingIds: Record<string, number>;
}

const LibraryPage: React.FC<LibraryPageProps> = ({
  installedGames, onDownload, onUpdate, onUninstall, onPlay, onDetails, onOpenFolder, onRefresh, downloadingIds
}) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('title');
  const [localSearch, setLocalSearch] = useState('');

  const sorted = [...installedGames]
    .filter(g => g.title.toLowerCase().includes(localSearch.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.sizeGB - a.sizeGB;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  const totalSize = installedGames.reduce((acc, g) => acc + g.sizeGB, 0);
  const updatesCount = installedGames.filter(g => g.hasUpdate).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Gamepad2 size={24} style={{ color: '#a855f7' }} />
          My Library
          <button
            onClick={onRefresh}
            title="Scan for installed games"
            style={{
              marginLeft: 'auto', padding: '6px 10px', borderRadius: '8px',
              border: '1px solid var(--border-color)', background: 'var(--glass-bg)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            <RefreshCw size={13} />
            Scan
          </button>
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {installedGames.length} game{installedGames.length !== 1 ? 's' : ''} installed — {totalSize.toFixed(1)} GB used
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
      }}>
        {[
          { label: 'Installed Games', value: installedGames.length, icon: '🎮', color: '#7c3aed' },
          { label: 'Updates', value: updatesCount, icon: '🔄', color: '#3b82f6' },
          { label: 'Space Used', value: `${totalSize.toFixed(0)} GB`, icon: '💾', color: '#22c55e' },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input
            type="text"
            placeholder="Search in library..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', borderRadius: '10px', fontSize: '0.8rem' }}
          />
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '9px 14px',
            borderRadius: '10px',
            background: 'rgba(124, 58, 237, 0.06)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="title" style={{ background: 'var(--bg-card)' }}>Sort by name</option>
          <option value="size" style={{ background: 'var(--bg-card)' }}>Sort by size</option>
          <option value="rating" style={{ background: 'var(--bg-card)' }}>Sort by rating</option>
        </select>

        {/* View toggle */}
        <div style={{
          display: 'flex',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}>
          {['grid', 'list'].map(v => (
            <button
              key={v}
              onClick={() => setView(v as 'grid' | 'list')}
              style={{
                padding: '8px 14px',
                background: view === v ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
                border: 'none',
                color: view === v ? '#c4b5fd' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              {v === 'grid' ? '⊞ Grid' : '☰ List'}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4b5563' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎮</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            {localSearch ? 'No results' : 'Library empty'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
            {localSearch ? `No games match "${localSearch}"` : 'You have no games installed. Visit the Store to download games.'}
          </div>
        </div>
      )}

      {/* Game grid */}
      {view === 'grid' && sorted.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {sorted.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onDownload={onDownload}
              onUpdate={onUpdate}
              onUninstall={onUninstall}
              onPlay={onPlay}
               onDetails={onDetails}
               onOpenFolder={onOpenFolder}
               downloading={game.id in downloadingIds}
               progress={downloadingIds[game.id] || 0}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map(game => (
            <div
              key={game.id}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124, 58, 237, 0.4)';
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124, 58, 237, 0.15)';
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)';
              }}
            >
              <img
                src={game.cover}
                alt={game.title}
                style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>{game.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{game.developer} • {game.genre.join(', ')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <HardDrive size={12} />
                {game.size}
              </div>
              {game.hasUpdate && (
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  whiteSpace: 'nowrap',
                }}>
                  UPDATE: {game.updateSize}
                </span>
              )}
              <div style={{ display: 'flex', gap: '6px' }}>
                {game.hasUpdate ? (
                  <button
                    className="btn-primary"
                    onClick={() => onUpdate(game)}
                    style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                  >
                    <RefreshCw size={12} />
                    Update
                  </button>
                ) : (
                  <button
                    onClick={() => onPlay(game)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      color: 'white',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Play size={12} fill="white" />
                    Play
                  </button>
                )}
                <button
                  className="btn-danger"
                  onClick={() => onUninstall(game)}
                  style={{ padding: '7px 10px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
