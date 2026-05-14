import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2 } from 'lucide-react';

interface MPDPlayerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

const MPDPlayer: React.FC<MPDPlayerProps> = ({ url, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !url) return;

    const loadPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Loading MPD player with URL:', url);

        // Importer dashjs dynamiquement
        const dashjs = await import('dashjs');
        const MediaPlayer = dashjs.MediaPlayer;
        console.log('DASH MediaPlayer imported:', MediaPlayer);

        if (videoRef.current && MediaPlayer) {
          console.log('Initializing DASH player...');
          
          // Initialiser le lecteur DASH
          const player = MediaPlayer().create();
          console.log('DASH player created:', player);
          
          // Initialisation simple sans configuration complexe
          player.initialize(videoRef.current, url, true);
          console.log('DASH player initialized with URL:', url);
          
          playerRef.current = player;

          // Événements du lecteur
          player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
            console.error('DASH Player Error:', e);
            setError('Erreur de chargement du trailer: ' + (e.error?.message || 'Erreur inconnue'));
            setIsLoading(false);
          });

          player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
            console.log('DASH Stream initialized');
            setIsLoading(false);
          });

          player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
            console.log('DASH Playback started');
            setIsPlaying(true);
          });

          player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
            console.log('DASH Playback paused');
            setIsPlaying(false);
          });

          player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, () => {
            console.log('DASH Playback ended');
            setIsPlaying(false);
          });

          player.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, () => {
            console.log('DASH Manifest loaded successfully');
          });

          player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, () => {
            console.log('DASH Fragment loading completed');
          });
        } else {
          console.error('Video element or MediaPlayer not available');
          console.log('videoRef.current:', videoRef.current);
          console.log('MediaPlayer available:', !!MediaPlayer);
          setError('Élément vidéo non disponible - réessayez');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading MPD player:', err);
        setError('Impossible de charger le lecteur MPD: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
        setIsLoading(false);
      }
    };

    loadPlayer();

    // Nettoyage
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.reset();
        } catch (e) {
          console.error('Error resetting player:', e);
        }
      }
    };
  }, [isOpen, url]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '900px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(124, 58, 237, 0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: 'rgba(30, 30, 45, 0.9)',
            borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
          }}
        >
          <h3
            style={{
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Trailer
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '8px',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Container */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#000',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {error ? (
            <div
              style={{
                textAlign: 'center',
                color: '#ef4444',
                padding: '20px',
              }}
            >
              <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>{error}</p>
              <button
                onClick={() => window.open(url, '_blank')}
                style={{
                  background: 'var(--border-color)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  color: '#a855f7',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                Ouvrir dans le navigateur
              </button>
            </div>
          ) : isLoading ? (
            <div
              style={{
                color: '#a855f7',
                fontSize: '1.1rem',
                textAlign: 'center',
              }}
            >
              Chargement du trailer...
            </div>
          ) : (
            <video
              ref={videoRef}
              controls={false}
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          )}
        </div>

        {/* Controls */}
        {!isLoading && !error && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 20px',
              backgroundColor: 'rgba(30, 30, 45, 0.9)',
              borderTop: '1px solid rgba(124, 58, 237, 0.2)',
            }}
          >
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--border-color)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                color: '#a855f7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(124, 58, 237, 0.3)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(124, 58, 237, 0.2)';
              }}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Volume Control */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Volume2 size={18} color="#a855f7" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                style={{
                  width: '100px',
                  height: '4px',
                  background: 'var(--border-color)',
                  outline: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MPDPlayer;
