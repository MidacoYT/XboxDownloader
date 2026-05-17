import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Play,
  RefreshCw,
  Star,
  Trash2,
  Info,
  CheckCircle,
  Loader2,
  Video,
  Image,
  HardDrive,
  Users,
  Shield,
  Gamepad2,
  MoreVertical,
  Folder,
  ExternalLink,
} from 'lucide-react';
import { Game } from '../data/games';
import { DownloadService } from '../services/downloadService';
import { scoreCache } from '../services/rawgApi';
import DownloadDialog from './DownloadDialog';

interface GameCardProps {
  game: Game;
  onDownload: (game: Game) => void;
  onUpdate: (game: Game) => void;
  onUninstall: (game: Game) => void;
  onPlay: (game: Game) => void;
  onDetails: (game: Game) => void;
  onOpenFolder?: (game: Game) => void;
  downloading?: boolean;
  progress?: number;
  speed?: number;
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  onDownload,
  onUpdate,
  onUninstall,
  onPlay,
  onDetails,
  onOpenFolder,
  downloading = false,
  progress = 0,
  speed = 0,
}) => {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  const formatSpeed = (bps: number) => {
    if (bps <= 0) return '';
    if (bps > 1024 * 1024 * 1024) return `${(bps / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
    if (bps > 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bps > 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
    return `${bps} B/s`;
  };

  const handleDownload = async () => {
    setShowDownloadDialog(true);
  };

  const handleDownloadConfirm = async (installPath: string) => {
    setShowDownloadDialog(false);
    try {
      const result = await DownloadService.downloadGame(game.id, 0, game.title, installPath);
      if (result.success) {
        onDownload(game);
      }
    } catch (error) {
      console.error('[GameCard] Download failed:', error);
    }
  };

  const handleDownloadCancel = () => {
    setShowDownloadDialog(false);
  };

  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const genreColor = (genre: string) => {
    const colors: Record<string, string> = {
      FPS: '#ef4444',
      RPG: '#f59e0b',
      Racing: '#22c55e',
      Strategy: '#3b82f6',
      Simulation: '#06b6d4',
      Adventure: '#a855f7',
      Action: '#f97316',
      JRPG: '#ec4899',
      Roguelike: '#84cc16',
      Sandbox: '#14b8a6',
    };
    return colors[genre] || '#7c3aed';
  };

  const primaryGenre = game.genre[0];

  return (
    <>
    <div
      className="game-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Cover image */}
      <div
        style={{
          position: 'relative',
          paddingTop: '56.25%',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--bg-card-hover), var(--bg-secondary))',
        }}
        onClick={() => onDetails(game)}
      >
        {!imgError ? (
          <img
            src={game.cover}
            alt={game.title}
            onError={() => setImgError(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.5s ease',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${genreColor(primaryGenre)}22, transparent)`,
            }}
          >
            <Gamepad2 size={40} color={genreColor(primaryGenre)} opacity={0.5} />
          </div>
        )}

        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(10,10,15,0.9) 0%, transparent 60%)',
          }}
        />

        {/* Badges */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
          }}
        >
          {game.isNew && (
            <span
              className="badge-new"
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                color: 'white',
                display: 'block',
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              }}
            >
              NEW
            </span>
          )}
          {game.hasUpdate && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                color: 'white',
                display: 'block',
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              }}
            >
              UPDATE
            </span>
          )}
          {game.installed && !game.hasUpdate && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.6rem',
                fontWeight: 700,
                background: 'rgba(22, 163, 74, 0.8)',
              }}
            >
              <CheckCircle size={8} />
              INSTALLED
            </span>
          )}
          {/* Trailers indicator */}
          {game.trailers && game.trailers.length > 0 && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.6rem',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.8)',
                backdropFilter: 'blur(4px)',
              }}
              title={`${game.trailers.length} trailer${game.trailers.length > 1 ? 's' : ''} available`}
            >
              <Video size={8} />
              {game.trailers.length}
            </span>
          )}
          {/* Screenshots indicator */}
          {game.screenshots && game.screenshots.length > 0 && (
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.6rem',
                fontWeight: 700,
                background: 'rgba(59, 130, 246, 0.8)',
                backdropFilter: 'blur(4px)',
              }}
              title={`${game.screenshots.length} screenshot${game.screenshots.length > 1 ? 's' : ''} available`}
            >
              <Image size={8} />
              {game.screenshots.length}
            </span>
          )}
        </div>

        {/* Rating badge */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '8px',
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#fbbf24',
          }}
        >
          <Star size={9} fill="#fbbf24" />
          {(() => {
            const rawgScore = scoreCache.get(game.id)?.metacritic;
            if (rawgScore) return rawgScore;
            return game.rating.toFixed(1);
          })()}
        </div>

        {/* Metacritic */}
        {(() => {
          const rawgScore = scoreCache.get(game.id)?.metacritic;
          const score = rawgScore || game.metacritic || 0;
          if (!score) return null;
          return (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: score >= 85 ? '#16a34a' : score >= 70 ? '#ca8a04' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'white',
                border: '2px solid rgba(255,255,255,0.15)',
              }}
              title={`Score Metacritic: ${score}${rawgScore ? ' (RAWG)' : ''}`}
            >
              {score}
            </div>
          );
        })()}

        {/* Genre chip */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.6rem',
            fontWeight: 600,
            color: 'white',
            background: `${genreColor(primaryGenre)}cc`,
            border: `1px solid ${genreColor(primaryGenre)}66`,
            backdropFilter: 'blur(4px)',
          }}
        >
          {primaryGenre}
        </div>
      </div>

      {/* Download progress bar */}
        {downloading && (
        <div style={{ height: '3px', background: 'var(--border-color)', position: 'relative' }}>
          <div
            className="download-bar"
            style={{
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {/* Card content */}
      <div
        style={{
          padding: '14px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Title & developer */}
        <div>
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '3px',
              lineHeight: 1.3,
              cursor: 'pointer',
            }}
            onClick={() => onDetails(game)}
          >
            {game.title}
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {game.developer}
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span title="Game size" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <HardDrive size={10} /> {game?.size}
          </span>
          <span title="Players" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Users size={10} /> {game?.players}
          </span>
          <span title="Age rating" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Shield size={10} /> {game?.ageRating}
          </span>
        </div>
        {/* Downloading state */}
        {downloading && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                fontSize: '0.72rem',
              }}
            >
              <span style={{ color: '#a855f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Downloading...
              </span>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {speed > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatSpeed(speed)}</span>}
                <span>{Math.round(progress)}%</span>
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                className="download-bar"
                style={{ height: '100%', width: `${progress}%`, borderRadius: '3px', transition: 'width 0.5s ease' }}
              />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
              {game.sizeGB > 0 ? `${(game.sizeGB * progress / 100).toFixed(1)} GB / ${game.size}` : `${Math.round(progress)}%`}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!downloading && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginTop: 'auto',
            }}
          >
            {game.state === 'unavailable' ? (
              <div
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-muted)',
                  cursor: 'default',
                }}
              >
                Unavailable
              </div>
            ) : game.installed ? (
              <>
                {game.hasUpdate ? (
                  <button
                    className="btn-primary"
                    onClick={() => onUpdate(game)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={13} />
                    UPDATE ({game.updateSize})
                  </button>
                ) : (
                  <button
                    onClick={() => onPlay(game)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      color: 'white',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Play size={13} fill="white" />
                    PLAY
                  </button>
                )}
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <MoreVertical size={13} />
                  </button>
                  {menuOpen && (
                    <div style={{
                      position: 'absolute', right: 0, bottom: '100%', marginBottom: '4px',
                      minWidth: '160px', padding: '4px',
                      borderRadius: '10px',
                      background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.3)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                      zIndex: 100,
                    }}>
                      {[
                        { icon: Info, label: 'Game Info', action: () => { onDetails(game); setMenuOpen(false); } },
                        { icon: Folder, label: 'Game Location', action: () => { setMenuOpen(false); onOpenFolder?.(game); } },
                        { icon: Trash2, label: 'Uninstall', color: '#f87171', action: () => { onUninstall(game); setMenuOpen(false); } },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={item.action}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 10px', border: 'none', background: 'transparent',
                            color: (item as any).color || 'var(--text-primary)',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                            borderRadius: '6px', transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.12)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <item.icon size={13} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  className="btn-primary"
                  onClick={handleDownload}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={13} />
                  Download
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onDetails(game)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Info size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>

      {showDownloadDialog && (
        <DownloadDialog
          gameId={game.id}
          gameName={game.title}
          onConfirm={handleDownloadConfirm}
          onCancel={handleDownloadCancel}
        />
      )}
    </>
  );
};

export default GameCard;
