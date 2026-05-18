import React, { useEffect, useRef, useState } from 'react';
import { Download, X, CheckCircle, Clock, HardDrive, Loader2, Zap, ChevronDown, ChevronUp, AlertTriangle, Pause, Play } from 'lucide-react';
import { Game } from '../data/games';

interface DownloadItem {
  game: Game;
  progress: number;
  paused?: boolean;
}

interface DownloadsPageProps {
  downloadingIds: Record<string, number>;
  allGames: Game[];
  onCancelDownload: (gameId: string) => void;
  onPauseDownload: (gameId: string) => void;
  onResumeDownload: (gameId: string) => void;
  completedDownloads: string[];
  downloadProgressMap?: Record<string, { receivedBytes: number; totalBytes: number; speed: number }>;
  downloadSpeeds?: Record<string, number>;
  extractingIds?: Record<string, string>;
  extractErrors?: Record<string, string>;
  pausedDownloads?: Record<string, number>;
}

const ErrorBadge: React.FC<{ error?: string }> = ({ error }) => {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          padding: '5px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600,
          color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
          whiteSpace: 'nowrap', transition: 'all 0.2s ease',
        }}
      >
        <AlertTriangle size={11} />
        Failed
        {showDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {showDetails && error && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          width: '320px', padding: '10px 12px', borderRadius: '8px',
          background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', fontSize: '0.72rem', lineHeight: 1.5,
          zIndex: 100, wordBreak: 'break-all',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#f87171', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Error details
          </div>
          {error}
        </div>
      )}
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  return (bytes / Math.pow(1000, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
};

const formatSpeed = (bytesPerSec: number): string => {
  if (bytesPerSec <= 0) return '-- MiB/s';
  const units = ['B/s', 'KiB/s', 'MiB/s', 'GiB/s'];
  const i = Math.min(Math.floor(Math.log10(bytesPerSec) / 3), units.length - 1);
  return (bytesPerSec / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
};

const formatEta = (remainingBytes: number, speed: number): string => {
  if (speed <= 0 || remainingBytes <= 0) return '--';
  const seconds = remainingBytes / speed;
  if (seconds < 60) return `~${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `~${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  return `~${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const SmoothValue: React.FC<{ target: number; children: (value: number) => React.ReactNode }> = ({ target, children }) => {
  const [displayed, setDisplayed] = useState(target);
  const targetRef = useRef(target);
  const rafRef = useRef<number>();
  targetRef.current = target;

  useEffect(() => {
    const animate = () => {
      setDisplayed(prev => {
        const t = targetRef.current;
        if (Math.abs(prev - t) < 0.05) return t;
        return prev + (t - prev) * 0.15;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return <>{children(displayed)}</>;
};

const DownloadsPage: React.FC<DownloadsPageProps> = ({
  downloadingIds,
  allGames,
  onCancelDownload,
  onPauseDownload,
  onResumeDownload,
  completedDownloads,
  downloadProgressMap = {},
  downloadSpeeds = {},
  extractingIds = {},
  extractErrors = {},
  pausedDownloads = {},
}) => {
  const activeDownloads: DownloadItem[] = [
    ...Object.entries(downloadingIds).map(([id, progress]) => ({
      game: allGames.find(g => g.id === id)!,
      progress,
    })),
    ...Object.entries(extractingIds)
      .filter(([id]) => !(id in downloadingIds) && !(id in pausedDownloads))
      .map(([id]) => ({
        game: allGames.find(g => g.id === id)!,
        progress: 100,
      })),
  ].filter(d => d.game);

  const pausedList: DownloadItem[] = Object.entries(pausedDownloads)
    .map(([id, progress]) => ({
      game: allGames.find(g => g.id === id)!,
      progress,
      paused: true,
    }))
    .filter(d => d.game);

  const totalActive = activeDownloads.length + pausedList.length;
  const completed = allGames.filter(g => completedDownloads.includes(g.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Download size={24} style={{ color: '#a855f7' }} />
          Downloads
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {totalActive} download{totalActive !== 1 ? 's' : ''} in progress
        </p>
      </div>

      {/* Active downloads */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={16} style={{ color: '#a855f7', animation: totalActive > 0 ? 'spin 1s linear infinite' : 'none' }} />
          In Progress ({totalActive})
        </h2>

        {totalActive === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            borderRadius: '14px',
            background: 'var(--bg-card)',
            border: '1px dashed rgba(124, 58, 237, 0.2)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              No active downloads
            </div>
            <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>
              Visit the Store to download games
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...activeDownloads, ...pausedList].map(({ game, progress, paused }) => (
              <div
                key={game.id}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: paused
                    ? '1px solid rgba(234, 179, 8, 0.25)'
                    : '1px solid rgba(124, 58, 237, 0.2)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Background shimmer (only for active) */}
                {!paused && (
                  <div
                    className="shimmer-bg"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '14px',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                <div style={{ position: 'relative', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {/* Cover */}
                  <img
                    src={game.cover}
                    alt={game.title}
                    style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title & action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {game.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {game.developer}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                        {paused ? (
                          <>
                            <button
                              onClick={() => onResumeDownload(game.id)}
                              className="btn-primary"
                              style={{
                                padding: '5px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                color: '#22c55e', background: 'rgba(34,197,94,0.1)',
                                border: '1px solid rgba(34,197,94,0.25)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <Play size={11} />
                              Resume
                            </button>
                            <button
                              onClick={() => onCancelDownload(game.id)}
                              className="btn-danger"
                              style={{
                                padding: '5px 8px', borderRadius: '8px', fontSize: '0.7rem',
                                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                              }}
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </>
                        ) : extractingIds[game.id] === 'error' ? (
                          <ErrorBadge error={extractErrors[game.id]} />
                        ) : (
                          <>
                            <button
                              onClick={() => onPauseDownload(game.id)}
                              style={{
                                padding: '5px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                color: '#eab308', background: 'rgba(234,179,8,0.1)',
                                border: '1px solid rgba(234,179,8,0.25)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <Pause size={11} />
                              Pause
                            </button>
                            <button
                              onClick={() => onCancelDownload(game.id)}
                              className="btn-danger"
                              style={{
                                padding: '5px 8px', borderRadius: '8px', fontSize: '0.7rem',
                                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                              }}
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {paused ? (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#eab308', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Pause size={11} />
                            Paused
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <SmoothValue target={progress}>{v => <>{Math.round(v)}%</>}</SmoothValue>
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${progress}%`,
                            borderRadius: '3px', background: '#eab308',
                          }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '0.72rem', color: extractingIds[game.id] === 'error' ? '#f87171' : '#a855f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {extractingIds[game.id] === 'extracting' ? (
                              <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Extracting...</>
                            ) : extractingIds[game.id] === 'error' ? (
                              <><span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} /> Download failed</>
                            ) : (
                              <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Downloading in progress</>
                            )}
                          </span>
                          {extractingIds[game.id] === 'extracting' && game.id in downloadingIds && (
                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {(() => {
                                const spd = downloadProgressMap[game.id]?.speed || downloadSpeeds[game.id] || 0;
                                return spd > 0 ? (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatSpeed(spd)}</span>
                                ) : null;
                              })()}
                              <SmoothValue target={progress}>{v => <>{Math.round(v)}%</>}</SmoothValue>
                            </span>
                          )}
                          {!extractingIds[game.id] && game.id in downloadingIds && (
                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {(() => {
                                const spd = downloadProgressMap[game.id]?.speed || downloadSpeeds[game.id] || 0;
                                return spd > 0 ? (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatSpeed(spd)}</span>
                                ) : null;
                              })()}
                              <SmoothValue target={progress}>{v => <>{Math.round(v)}%</>}</SmoothValue>
                            </span>
                          )}
                        </div>
                        <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                          {extractingIds[game.id] === 'extracting' ? (
                            game.id in downloadingIds ? (
                              <div className="download-bar" style={{
                                height: '100%', width: `${progress}%`,
                                borderRadius: '3px', transition: 'width 0.5s ease',
                              }} />
                            ) : (
                              <div style={{
                                height: '100%', width: '25%',
                                borderRadius: '3px',
                                background: 'linear-gradient(90deg, #7c3aed, #a855f7, #7c3aed)',
                                animation: 'loading-bar 1.8s ease-in-out infinite',
                              }} />
                            )
                          ) : extractingIds[game.id] === 'error' ? (
                            <div style={{ height: '100%', width: '100%', borderRadius: '3px', background: '#ef4444' }} />
                          ) : (
                            <div className="download-bar" style={{
                              height: '100%', width: `${progress}%`,
                              borderRadius: '3px', transition: 'width 0.5s ease',
                            }} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} style={{ color: '#22c55e' }} />
            Completed ({completed.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completed.map(game => (
              <div
                key={game.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(34, 197, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <img
                  src={game.cover}
                  alt={game.title}
                  style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{game.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{game.size} installed</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontSize: '0.78rem', fontWeight: 600 }}>
                  <CheckCircle size={14} />
                  Installed
                </div>
                <div style={{ height: '4px', width: '80px', background: 'rgba(34, 197, 94, 0.3)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: '100%', background: '#22c55e', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DownloadsPage;