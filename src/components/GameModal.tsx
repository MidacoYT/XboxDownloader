import React, { useState } from 'react';
import {
  X,
  Download,
  Play,
  RefreshCw,
  Trash2,
  Star,
  Users,
  HardDrive,
  Calendar,
  Shield,
  Trophy,
  Loader2,
  Video,
  Image,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Game } from '../data/games';
import { DownloadService } from '../services/downloadService';
import MPDPlayer from './MPDPlayer';

// Styles constants
const styles = {
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.8)',
    backdropFilter: 'blur(8px)',
  },
  modalContent: {
    width: '90%',
    maxWidth: '820px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    borderRadius: '16px',
    overflow: 'hidden',
    background: 'var(--bg-card)',
    border: '1px solid rgba(124,58,237,.25)',
    boxShadow: '0 25px 80px rgba(0,0,0,.8), 0 0 40px rgba(124,58,237,.2)',
    animation: 'fadeInUp 0.3s ease',
  },
  hero: {
    position: 'relative' as const,
    height: '220px',
    flexShrink: 0,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  heroGradient: {
    position: 'absolute' as const,
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(10,10,15,.3) 0%, rgba(10,10,15,.85) 100%)',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,.6)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    transition: 'background .2s',
    zIndex: 2,
  },
  heroInfo: {
    position: 'absolute' as const,
    bottom: '16px',
    left: '20px',
    right: '20px',
    zIndex: 1,
  },
  badges: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '.6rem',
    fontWeight: 700,
    color: 'white',
    textTransform: 'uppercase' as const,
    letterSpacing: '.05em',
  },
  badgeNew: {
    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
  },
  badgeUpdate: {
    background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
  },
  badgePass: {
    background: 'linear-gradient(135deg,#16a34a,#22c55e)',
  },
  heroTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '4px',
    textShadow: '0 2px 10px rgba(0,0,0,.5)',
  },
  heroSub: {
    fontSize: '.8rem',
    color: 'var(--text-secondary)',
  },
  modalBody: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px',
  },
  statsBar: {
    display: 'flex',
    gap: '2px',
    background: 'var(--glass-bg)',
    borderRadius: '12px',
    padding: '2px',
    marginBottom: '20px',
  },
  stat: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 4px',
    borderRadius: '10px',
    background: 'rgba(30,30,45,.8)',
    fontSize: '.72rem',
    color: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  descriptionBox: {
    fontSize: '.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    background: 'rgba(30,30,45,.4)',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    marginBottom: '24px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  infoCard: {
    padding: '12px',
    background: 'rgba(30,30,45,.6)',
    border: '1px solid rgba(124,58,237,.2)',
    borderRadius: '8px',
  },
  infoLabel: {
    fontSize: '.78rem',
    color: 'var(--text-muted)',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '.9rem',
    color: '#e5e7eb',
    fontWeight: 500,
  },
  infoLink: {
    fontSize: '.9rem',
    color: '#a855f7',
    fontWeight: 500,
    textDecoration: 'none',
    wordBreak: 'break-all' as const,
    overflowWrap: 'break-word' as const,
    maxWidth: '100%',
  },
  infoLinkGreen: {
    fontSize: '.9rem',
    color: '#10b981',
    fontWeight: 500,
    textDecoration: 'none',
  },
  tagsWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginBottom: '24px',
  },
  tag: {
    padding: '4px 12px',
    background: 'rgba(124,58,237,.2)',
    border: '1px solid rgba(124,58,237,.3)',
    borderRadius: '20px',
    fontSize: '.78rem',
    color: '#a855f7',
  },
  carousel: {
    position: 'relative' as const,
    marginBottom: '24px',
  },
  carouselRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  carouselNav: {
    background: 'rgba(124,58,237,.2)',
    border: '1px solid rgba(124,58,237,.3)',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    color: '#a855f7',
    flexShrink: 0,
    transition: 'background .2s',
    display: 'flex',
    alignItems: 'center',
  },
  carouselMain: {
    flex: 1,
    textAlign: 'center' as const,
  },
  carouselMainImg: {
    width: '100%',
    maxHeight: '280px',
    objectFit: 'contain' as const,
    borderRadius: '8px',
    background: 'rgba(30,30,45,.6)',
  },
  carouselDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '10px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(124,58,237,.3)',
    transition: 'background .2s',
  },
  dotActive: {
    background: '#a855f7',
  },
  trailerThumb: {
    position: 'relative' as const,
    display: 'inline-block',
    width: '100%',
  },
  playCircle: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: '64px',
    height: '64px',
    background: 'rgba(0,0,0,.8)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '3px solid rgba(168,85,247,.5)',
    zIndex: 100,
    opacity: 0.9,
  },
  trailerCaption: {
    fontSize: '.8rem',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    marginTop: '8px',
    fontStyle: 'italic' as const,
  },
  gameInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  giCard: {
    padding: '16px',
    background: 'rgba(30,30,45,.6)',
    border: '1px solid rgba(124,58,237,.2)',
    borderRadius: '10px',
  },
  giCardEA: {
    borderColor: 'rgba(239,68,68,.3)',
  },
  giCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  giCardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  giCardSub: {
    fontSize: '.78rem',
    color: 'var(--text-muted)',
  },
  giBigValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    textAlign: 'center' as const,
  },
  giPlatformRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  dotGreen: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
    flexShrink: 0,
  },
  eaBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    color: 'white',
    fontSize: '.65rem',
    flexShrink: 0,
  },
  actionBar: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(124,58,237,.2)',
    background: 'rgba(30,30,45,.9)',
    flexShrink: 0,
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
  },
  btn: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform .2s, box-shadow .2s',
  },
  btnDownload: {
    flex: 1,
    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
    color: 'white',
  },
  btnPlay: {
    flex: 1,
    background: 'linear-gradient(135deg,#22c55e,#16a34a)',
    color: 'white',
  },
  btnUninstall: {
    padding: '12px 16px',
    background: 'rgba(239,68,68,.15)',
    border: '1px solid rgba(239,68,68,.3)',
    borderRadius: '10px',
    color: '#ef4444',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background .2s',
  },
  btnUpdate: {
    padding: '12px 20px',
    background: 'rgba(59,130,246,.15)',
    border: '1px solid rgba(59,130,246,.3)',
    borderRadius: '10px',
    color: '#3b82f6',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background .2s',
  },
};

interface GameModalProps {
  game: Game | null;
  onClose: () => void;
  onDownload: (game: Game) => void;
  onUpdate: (game: Game) => void;
  onUninstall: (game: Game) => void;
  onPlay: (game: Game) => void;
  downloading?: boolean;
  progress?: number;
}

const GameModal: React.FC<GameModalProps> = ({
  game,
  onClose,
  onDownload,
  onUpdate,
  onUninstall,
  onPlay,
  downloading = false,
  progress = 0,
}) => {
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);
  const [currentTrailerIndex, setCurrentTrailerIndex] = useState(0);
  const [showMPDPlayer, setShowMPDPlayer] = useState(false);
  const [selectedTrailerUrl, setSelectedTrailerUrl] = useState<string>('');
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!game) return null;

  const screenshots = game.screenshots || [];
  const trailers = game.trailers || [];

  const handlePrevScreenshot = () => {
    setCurrentScreenshotIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const handleNextScreenshot = () => {
    setCurrentScreenshotIndex((prev) => (prev + 1) % screenshots.length);
  };

  const handlePrevTrailer = () => {
    setCurrentTrailerIndex((prev) => (prev - 1 + trailers.length) % trailers.length);
  };

  const handleNextTrailer = () => {
    setCurrentTrailerIndex((prev) => (prev + 1) % trailers.length);
  };

  const handleDownloadModal = async () => {
    if (downloadStarted) return;
    const result = await DownloadService.downloadGame(game.id, 0, game.title);
    if (result.success) {
      setDownloadStarted(true);
      onDownload(game);
    }
  };

  const currentScreenshot = screenshots[currentScreenshotIndex];
  const currentTrailer = trailers[currentTrailerIndex];

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <img
            src={game.hero || 'https://placehold.co/1200x600/1a1a2e/7c3aed?text=Game'}
            alt={game.title}
            style={styles.heroImage}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/1200x600/1a1a2e/7c3aed?text=Game';
            }}
          />
          <div style={styles.heroGradient} />

          {/* Close Button */}
          <button
            style={styles.closeBtn}
            onClick={onClose}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(0,0,0,.6)';
            }}
          >
            <X size={16} />
          </button>

          {/* Hero Info */}
          <div style={styles.heroInfo}>
            <div style={styles.badges}>
              {game.isNew && <span style={{...styles.badge, ...styles.badgeNew}}>New</span>}
              {game.hasUpdate && <span style={{...styles.badge, ...styles.badgeUpdate}}>Update Available</span>}
              <span style={{...styles.badge, ...styles.badgePass}}>Game Pass Included</span>
            </div>
            <h2 style={styles.heroTitle}>{game.title}</h2>
            <p style={styles.heroSub}>{game.developer} &bull; {game.publisher}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div style={styles.modalBody}>
          {/* Stats Bar */}
          <div style={styles.statsBar}>
            <div style={styles.stat}>
              <Star size={14} color="#a855f7" />
              {(() => {
                const count = game.ratingCount;
                if (!count || count === 0) return 'New game';
                return count.toLocaleString() + ' avis';
              })()}
            </div>
            <div style={styles.stat}>
              <Users size={14} color="#a855f7" />
              {game.players}
            </div>
            <div style={styles.stat}>
              <HardDrive size={14} color="#a855f7" />
              {game.size}
            </div>
            <div style={styles.stat}>
              <Calendar size={14} color="#a855f7" />
              {(() => {
                const dateStr = game.originalReleaseDate || game.releaseDate;
                if (!dateStr) return 'N/A';
                const date = new Date(dateStr);
                const timestamp = date.getTime();
                if (isNaN(timestamp) || timestamp <= 0) return 'N/A';
                return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
              })()}
            </div>
            <div style={{...styles.stat, background: game.metacriticScore ? (game.metacriticScore >= 75 ? 'rgba(34,197,94,.12)' : game.metacriticScore >= 50 ? 'rgba(234,179,8,.12)' : 'rgba(239,68,68,.12)') : 'rgba(30,30,45,.8)'}}>
              <Shield size={14} color="#a855f7" />
              <span style={{fontSize: '.85rem', fontWeight: 700}}>{game.ageRating || 'PEGI 12'}</span>
            </div>
          </div>

          {/* Description */}
          <h3 style={styles.sectionTitle}>
            Description
          </h3>
          <div style={styles.descriptionBox}>
            {game.shortDescription || game.description || 'No description available.'}
          </div>

          {/* Additional Info */}
          <h3 style={styles.sectionTitle}>
            Additional Information
          </h3>
          <div style={styles.infoGrid}>
            {game.publisherWebsite && (
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Website</div>
                <a 
                  href={game.publisherWebsite} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.infoLink}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  {game.publisherWebsite.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              </div>
            )}

            {game.supportUri && (
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Support</div>
                <a 
                  href={game.supportUri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.infoLinkGreen}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  Get Help
                </a>
              </div>
            )}

            {game.language && (
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Language</div>
                <div style={styles.infoValue}>{game.language.toUpperCase()}</div>
              </div>
            )}

            {game.lastModifiedDate && (
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Last Updated</div>
                <div style={styles.infoValue}>
                  {(() => {
                    const date = new Date(game.lastModifiedDate);
                    if (isNaN(date.getTime())) return 'N/A';
                    return date.toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          {game.categories && game.categories.length > 0 && (
            <>
              <h3 style={styles.sectionTitle}>
                Categories
              </h3>
              <div style={styles.tagsWrap}>
                {game.categories.map((category, i) => (
                  <span key={i} style={styles.tag}>{category}</span>
                ))}
              </div>
            </>
          )}

          {/* Tags */}
          {game.tags && game.tags.length > 0 && (
            <>
              <h3 style={styles.sectionTitle}>
                Tags
              </h3>
              <div style={styles.tagsWrap}>
                {game.tags.map((tag, i) => (
                  <span key={i} style={styles.tag}>{tag}</span>
                ))}
              </div>
            </>
          )}

          {/* Screenshots Carousel */}
          {screenshots.length > 0 && (
            <div style={styles.carousel}>
              <h3 style={styles.sectionTitle}>
                <Image size={16} />
                Screenshots ({screenshots.length})
              </h3>
              <div style={styles.carouselRow}>
                <button
                  style={styles.carouselNav}
                  onClick={handlePrevScreenshot}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.2)';
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <div style={styles.carouselMain}>
                  <img
                    src={currentScreenshot}
                    alt={`Screenshot ${currentScreenshotIndex + 1}`}
                    style={styles.carouselMainImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/800x280/1a1a2e/7c3aed?text=No+Image';
                    }}
                  />
                </div>
                <button
                  style={styles.carouselNav}
                  onClick={handleNextScreenshot}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.2)';
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div style={styles.carouselDots}>
                {screenshots.map((_, i) => (
                  <button
                    key={i}
                    style={{
                      ...styles.dot,
                      ...(i === currentScreenshotIndex ? styles.dotActive : {})
                    }}
                    onClick={() => setCurrentScreenshotIndex(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trailers Carousel */}
          {trailers.length > 0 && (
            <div style={styles.carousel}>
              <h3 style={styles.sectionTitle}>
                <Video size={16} />
                Trailers ({trailers.length})
              </h3>
              <div style={styles.carouselRow}>
                <button
                  style={styles.carouselNav}
                  onClick={handlePrevTrailer}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.2)';
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <div style={styles.carouselMain}>
                  {currentTrailer?.previewImage ? (
                    <div style={styles.trailerThumb}>
                      <img
                        src={currentTrailer.previewImage}
                        alt={`Trailer ${currentTrailerIndex + 1}`}
                        style={{
                          width: '100%',
                          maxHeight: '260px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          background: 'rgba(30,30,45,.6)'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/800x260/1a1a2e/7c3aed?text=Trailer';
                        }}
                      />
                      <div
                        style={styles.playCircle}
                        onClick={() => {
                          const trailerUrl = currentTrailer.dash || currentTrailer.hls;
                          if (trailerUrl && trailerUrl.endsWith('.mpd')) {
                            setSelectedTrailerUrl(trailerUrl);
                            setShowMPDPlayer(true);
                          } else {
                            window.open(trailerUrl || '#', '_blank');
                          }
                        }}
                        onMouseEnter={(e) => {
                          const elem = e.currentTarget;
                          elem.style.background = 'rgba(168,85,247,1)';
                          elem.style.transform = 'translate(-50%,-50%) scale(1.1)';
                          elem.style.border = '3px solid rgba(168,85,247,1)';
                          elem.style.boxShadow = '0 4px 20px rgba(168,85,247,0.8)';
                          elem.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          const elem = e.currentTarget;
                          elem.style.background = 'rgba(0,0,0,.8)';
                          elem.style.transform = 'translate(-50%,-50%)';
                          elem.style.border = '3px solid rgba(168,85,247,.5)';
                          elem.style.boxShadow = 'none';
                          elem.style.opacity = '0.9';
                        }}
                      >
                        <PlayCircle size={26} color="white" />
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px',
                      background: 'rgba(30,30,45,.6)',
                      borderRadius: '8px',
                      border: '1px solid rgba(124,58,237,.2)',
                      textAlign: 'center'
                    }}>
                      <Video size={48} color="#a855f7" />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', marginTop: '10px', textAlign: 'center' as const }}>
                        {currentTrailer?.caption || 'Trailer Available'}
                      </p>
                    </div>
                  )}
                  <p style={styles.trailerCaption}>
                    {currentTrailer?.caption || `Trailer ${currentTrailerIndex + 1}`}
                  </p>
                </div>
                <button
                  style={styles.carouselNav}
                  onClick={handleNextTrailer}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,.2)';
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div style={styles.carouselDots}>
                {trailers.map((_, i) => (
                  <button
                    key={i}
                    style={{
                      ...styles.dot,
                      ...(i === currentTrailerIndex ? styles.dotActive : {})
                    }}
                    onClick={() => setCurrentTrailerIndex(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Game Info Grid */}
          <h3 style={styles.sectionTitle}>
            <Trophy size={16} />
            Game Information
          </h3>
          <div style={styles.gameInfoGrid}>
            {/* Achievements */}
            {game.achievements !== undefined && (
              <div style={styles.giCard}>
                <div style={styles.giCardHeader}>
                  <Trophy size={24} color="#a855f7" />
                  <div>
                    <div style={styles.giCardTitle}>Achievements</div>
                    <div style={styles.giCardSub}>Total achievements available</div>
                  </div>
                </div>
                <div style={{...styles.giBigValue, color: '#a855f7'}}>
                  {game.achievements}
                </div>
              </div>
            )}

            {/* Gamerscore */}
            {game.gamerscore !== undefined && (
              <div style={styles.giCard}>
                <div style={styles.giCardHeader}>
                  <Star size={24} color="#fbbf24" fill="#fbbf24" />
                  <div>
                    <div style={styles.giCardTitle}>Gamerscore</div>
                    <div style={styles.giCardSub}>Xbox achievement points</div>
                  </div>
                </div>
                <div style={{...styles.giBigValue, color: '#fbbf24'}}>
                  {game.gamerscore} G
                </div>
              </div>
            )}

            {/* Platforms */}
            <div style={styles.giCard}>
              <div style={styles.giCardHeader}>
                <Shield size={24} color="#10b981" />
                <div>
                  <div style={styles.giCardTitle}>Platforms</div>
                  <div style={styles.giCardSub}>Availability</div>
                </div>
              </div>
              <div>
                {game.platforms?.one && (
                  <div style={styles.giPlatformRow}>
                    <div style={styles.dotGreen} />
                    <span style={{ fontSize: '.9rem', color: '#e5e7eb' }}>Xbox One</span>
                  </div>
                )}
                {game.platforms?.series && (
                  <div style={styles.giPlatformRow}>
                    <div style={styles.dotGreen} />
                    <span style={{ fontSize: '.9rem', color: '#e5e7eb' }}>Xbox Series X|S</span>
                  </div>
                )}
                {game.platforms?.windows && (
                  <div style={styles.giPlatformRow}>
                    <div style={styles.dotGreen} />
                    <span style={{ fontSize: '.9rem', color: '#e5e7eb' }}>Windows PC</span>
                  </div>
                )}
                {game.platforms?.cloud && (
                  <div style={styles.giPlatformRow}>
                    <div style={styles.dotGreen} />
                    <span style={{ fontSize: '.9rem', color: '#e5e7eb' }}>Cloud Gaming</span>
                  </div>
                )}
              </div>
            </div>

            {/* EA Play */}
            {game.EAPlay && (
              <div style={{...styles.giCard, ...styles.giCardEA}}>
                <div style={styles.giCardHeader}>
                  <div style={styles.eaBadge}>EA</div>
                  <div>
                    <div style={styles.giCardTitle}>EA Play</div>
                    <div style={styles.giCardSub}>Included with EA Play</div>
                  </div>
                </div>
                <div style={{ fontSize: '.9rem', fontWeight: 600, color: '#a855f7', textAlign: 'center' as const, fontStyle: 'italic' as const }}>
                  This game is included with EA Play subscription
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div style={styles.actionBar}>
          <div style={styles.actionRow}>
            {!game.installed ? (
              <button
                style={{...styles.btn, ...styles.btnDownload}}
                onClick={handleDownloadModal}
                onMouseEnter={(e) => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.transform = 'translateY(-2px)';
                  btn.style.boxShadow = '0 8px 25px rgba(124,58,237,.4)';
                }}
                onMouseLeave={(e) => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.transform = '';
                  btn.style.boxShadow = '';
                }}
              >
                {downloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {progress > 0 ? `${Math.round(progress)}%` : 'Downloading...'}
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  style={{...styles.btn, ...styles.btnPlay}}
                  onClick={() => onPlay(game)}
                  onMouseEnter={(e) => {
                    const btn = e.target as HTMLButtonElement;
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 8px 25px rgba(34,197,94,.4)';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.target as HTMLButtonElement;
                    btn.style.transform = '';
                    btn.style.boxShadow = '';
                  }}
                >
                  <Play size={16} color="white" />
                  Play
                </button>

                <button
                  style={styles.btnUninstall}
                  onClick={() => onUninstall(game)}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,.15)';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}

            {game.hasUpdate && (
              <button
                style={styles.btnUpdate}
                onClick={() => onUpdate(game)}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(59,130,246,.3)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(59,130,246,.15)';
                }}
              >
                <RefreshCw size={16} />
                Mettre à jour
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MPD Player Modal */}
      <MPDPlayer
        url={selectedTrailerUrl}
        isOpen={showMPDPlayer}
        onClose={() => {
          setShowMPDPlayer(false);
          setSelectedTrailerUrl('');
        }}
      />
    </div>
  );
};

export default GameModal;
