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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    console.log('[MPDPlayer] useEffect triggered - isOpen:', isOpen, 'url:', url);
    if (!isOpen || !url) {
      console.log('[MPDPlayer] Skipping - not open or no url');
      return;
    }

    const loadPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('[MPDPlayer] Starting loadPlayer, url type:', url.endsWith('.mpd') ? 'mpd' : 'other');

        if (!videoRef.current) {
          console.error('[MPDPlayer] videoRef.current is null');
          setError('Video element not available');
          setIsLoading(false);
          return;
        }

        // Set up video event listeners before any player initialization
        const video = videoRef.current;
        video.ontimeupdate = () => setCurrentTime(video.currentTime);
        video.onloadedmetadata = () => setDuration(video.duration || 0);
        video.onerror = () => {
          setError('Failed to load video. Try opening in browser.');
          setIsLoading(false);
        };

        if (url.endsWith('.mpd')) {
          // Try dashjs for MPD streams
          try {
            console.log('[MPDPlayer] Importing dashjs...');
            const dashjs = await import('dashjs');
            console.log('[MPDPlayer] dashjs imported successfully:', Object.keys(dashjs));
            const MediaPlayer = dashjs.MediaPlayer;
            console.log('[MPDPlayer] MediaPlayer constructor:', !!MediaPlayer);
            if (MediaPlayer) {
              console.log('[MPDPlayer] Creating player instance...');
              const player = MediaPlayer().create();
              console.log('[MPDPlayer] Player created, initializing with URL:', url);
              console.log('[MPDPlayer] videoRef.current:', videoRef.current);
              player.initialize(videoRef.current, url, true);
              console.log('[MPDPlayer] Player initialized successfully');
              playerRef.current = player;

              player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
                console.log('[MPDPlayer] DASH ERROR EVENT FIRED:', JSON.stringify(e));
                console.error('[MPDPlayer] DASH Player Error object:', e);
                fallbackToVideo(url);
              });
              player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                console.log('[MPDPlayer] STREAM_INITIALIZED event');
                setIsLoading(false);
              });
              player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
                console.log('[MPDPlayer] PLAYBACK_STARTED event');
                setIsPlaying(true);
              });
              player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
                console.log('[MPDPlayer] PLAYBACK_PAUSED event');
                setIsPlaying(false);
              });
              player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, () => {
                console.log('[MPDPlayer] PLAYBACK_ENDED event');
                setIsPlaying(false);
              });
              console.log('[MPDPlayer] All event listeners registered, returning');
              return;
            } else {
              console.log('[MPDPlayer] MediaPlayer is falsy');
            }
          } catch (dashErr) {
            console.log('[MPDPlayer] dashjs import/init failed:', dashErr);
            console.warn('dashjs not available, falling back to native video:', dashErr);
          }
        } else {
          console.log('[MPDPlayer] URL is not .mpd, using native video directly');
        }

        console.log('[MPDPlayer] Falling back to native HTML5 video with URL:', url);
        fallbackToVideo(url);
      } catch (err) {
        console.log('[MPDPlayer] Top-level error in loadPlayer:', err);
        console.error('Error loading player:', err);
        setError('Unable to load video: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setIsLoading(false);
      }
    };

    const fallbackToVideo = (videoUrl: string) => {
      console.log('[MPDPlayer] fallbackToVideo called with:', videoUrl);
      if (!videoRef.current) return;
      const video = videoRef.current;
      video.src = videoUrl;
      video.onloadeddata = () => {
        setIsLoading(false);
        setDuration(video.duration || 0);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      };
    };

    console.log('[MPDPlayer] Calling loadPlayer()');
    loadPlayer();

    return () => {
      console.log('[MPDPlayer] Cleanup running');
      if (playerRef.current) {
        console.log('[MPDPlayer] Resetting dashjs player');
        try { playerRef.current.reset(); } catch {}
        playerRef.current = null;
      }
      if (videoRef.current) {
        console.log('[MPDPlayer] Cleaning up video element');
        videoRef.current.pause();
        videoRef.current.src = '';
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

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const time = pct * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
        e.stopPropagation();
      }}
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
                Open in browser
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
              Loading trailer...
            </div>
          ) : null}
          <video
            ref={videoRef}
            onClick={togglePlayPause}
            style={{
              width: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              display: error || isLoading ? 'none' : 'block',
            }}
          />
        </div>

        {/* Controls */}
        {!isLoading && !error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px 20px',
              backgroundColor: 'rgba(30, 30, 45, 0.9)',
              borderTop: '1px solid rgba(124, 58, 237, 0.2)',
            }}
          >
            {/* Timeline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', minWidth: '35px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatTime(currentTime)}</span>
              <div
                onMouseDown={handleSeek}
                onMouseMove={(e) => { if (e.buttons & 1) handleSeek(e); }}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div style={{
                  height: '100%',
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  borderRadius: '3px',
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  transition: 'width 0.1s linear',
                }} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#a855f7',
                  boxShadow: '0 0 6px rgba(168,85,247,0.6)',
                }} />
              </div>
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', minWidth: '35px', fontVariantNumeric: 'tabular-nums' }}>{formatTime(duration)}</span>
            </div>

            {/* Bottom row: Play/Pause + Volume */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={togglePlayPause}
                style={{
                  width: '40px',
                  height: '40px',
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
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} color="#a855f7" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  style={{
                    width: '80px',
                    height: '4px',
                    outline: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MPDPlayer;
