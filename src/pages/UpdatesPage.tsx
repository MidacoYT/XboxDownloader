import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, HardDrive, Loader2, Download, ExternalLink } from 'lucide-react';
import { Game } from '../data/games';

interface UpdatesPageProps {
  gamesWithUpdates: Game[];
  onUpdate: (game: Game) => void;
  downloadingIds: Record<string, number>;
  updatingAll: boolean;
  onUpdateAll: () => void;
}

const UpdatesPage: React.FC<UpdatesPageProps> = ({
  gamesWithUpdates,
  onUpdate,
  downloadingIds,
  updatingAll,
  onUpdateAll,
}) => {
  const [appUpdate, setAppUpdate] = useState<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string; downloadUrl?: string | null; releaseUrl?: string; releaseName?: string } | null>(null);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);

  useEffect(() => {
    window.electronAPI?.checkAppUpdate().then(setAppUpdate);
  }, []);

  const handleDownloadAppUpdate = async () => {
    if (!appUpdate?.downloadUrl || downloadingUpdate) return;
    setDownloadingUpdate(true);
    await window.electronAPI?.downloadAppUpdate(appUpdate.downloadUrl);
    setDownloadingUpdate(false);
  };
  const totalUpdateSize = gamesWithUpdates.reduce((acc, g) => {
    const size = g.updateSize ? parseFloat(g.updateSize.replace(/[^0-9.]/g, '')) : 0;
    return acc + size;
  }, 0);

  const isUpdating = (game: Game) => game.id in downloadingIds;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RefreshCw size={24} style={{ color: '#a855f7' }} />
            Updates
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {gamesWithUpdates.length} update{gamesWithUpdates.length !== 1 ? 's' : ''} available{gamesWithUpdates.length !== 1 ? 's' : ''}
            {totalUpdateSize > 0 && ` — ${totalUpdateSize.toFixed(1)} ${gamesWithUpdates[0]?.updateSize?.includes('MB') && totalUpdateSize < 1000 ? 'MB' : 'GB'} total`}
          </p>
        </div>

        {gamesWithUpdates.length > 0 && (
          <button
            className="btn-primary"
            onClick={onUpdateAll}
            disabled={updatingAll}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: updatingAll ? 'not-allowed' : 'pointer',
              opacity: updatingAll ? 0.7 : 1,
            }}
          >
            {updatingAll ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Updating in progress...
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                Update All
              </>
            )}
          </button>
        )}
      </div>

      {/* App Update */}
      {appUpdate?.hasUpdate && (
        <div style={{
          padding: '20px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(168,85,247,0.06))',
          border: '1px solid rgba(124,58,237,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} color="#a855f7" />
                Xbox Downloader {appUpdate.latestVersion} available
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Current version: v{appUpdate.currentVersion} → <strong style={{ color: '#a855f7' }}>v{appUpdate.latestVersion}</strong>
                {appUpdate.releaseName && <span> — {appUpdate.releaseName}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownloadAppUpdate}
                disabled={downloadingUpdate}
                className="btn-primary"
                style={{
                  padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', gap: '7px', cursor: downloadingUpdate ? 'not-allowed' : 'pointer',
                  fontWeight: 600, opacity: downloadingUpdate ? 0.7 : 1,
                }}
              >
                {downloadingUpdate ? (
                  <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Downloading...</>
                ) : (
                  <><Download size={15} /> Download & Install</>
                )}
              </button>
              {appUpdate.releaseUrl && (
                <button
                  onClick={() => window.open(appUpdate.releaseUrl!, '_blank')}
                  style={{
                    padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem',
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500,
                  }}
                >
                  <ExternalLink size={14} /> Release notes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game Update list */}
      {gamesWithUpdates.length === 0 && !appUpdate?.hasUpdate ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          borderRadius: '16px',
          background: 'var(--bg-card)',
          border: '1px dashed rgba(124, 58, 237, 0.2)',
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle size={30} style={{ color: '#22c55e' }} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Everything is up to date! 🎉
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            All your games are up to date. Enjoy your gaming session!
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {gamesWithUpdates.map(game => {
            const updating = isUpdating(game);
            const progress = downloadingIds[game.id] || 0;

            return (
              <div
                key={game.id}
                style={{
                  padding: '18px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: `1px solid ${updating ? 'rgba(124, 58, 237, 0.4)' : 'rgba(59, 130, 246, 0.2)'}`,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {/* Cover */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={game.cover}
                      alt={game.title}
                      style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {updating && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '12px',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Loader2 size={20} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                          {game.title}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{game.developer}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#60a5fa',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <HardDrive size={11} />
                          {game.updateSize}
                        </div>

                        {!updating && (
                          <button
                            className="btn-primary"
                            onClick={() => onUpdate(game)}
                            style={{
                              padding: '7px 14px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            <RefreshCw size={12} />
                            Update
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Version info */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', marginBottom: updating ? '10px' : '0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Current version: <strong style={{ color: 'var(--text-secondary)' }}>v{game.version}</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        →<strong style={{ color: '#a855f7', marginLeft: '4px' }}>v{game.latestVersion}</strong>
                      </span>
                    </div>

                    {/* Progress bar when updating */}
                    {updating && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                            Installing...
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{progress}%</span>
                        </div>
                        <div style={{ height: '5px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            className="download-bar"
                            style={{ height: '100%', width: `${progress}%`, borderRadius: '3px', transition: 'width 0.5s ease' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpdatesPage;
