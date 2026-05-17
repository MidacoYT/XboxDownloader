import React, { useEffect } from 'react';
import { TrendingUp, Download, RefreshCw, Zap } from 'lucide-react';
import { Game } from '../data/games';
import GameCard from '../components/GameCard';
import { getRawgDetails, scoreCache } from '../services/rawgApi';

interface HomePageProps {
  games: Game[];
  onDownload: (game: Game) => void;
  onUpdate: (game: Game) => void;
  onUninstall: (game: Game) => void;
  onPlay: (game: Game) => void;
  onDetails: (game: Game) => void;
  downloadingIds: Record<string, number>;
  setActiveTab: (tab: any) => void;
}

const queue: Game[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function processQueue() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 2);
  batch.forEach(game => {
    if (scoreCache.has(game.id)) return;
    getRawgDetails(game.title).then(data => {
      if (data) {
        scoreCache.set(game.id, data);
      }
    });
  });
  if (queue.length > 0) {
    timer = setTimeout(() => processQueue(), 800);
  }
}

const HomePage: React.FC<HomePageProps> = ({
  games,
  onDownload, onUpdate, onUninstall, onPlay, onDetails, downloadingIds, setActiveTab
}) => {
  useEffect(() => {
    if (timer) clearTimeout(timer);
    const toEnrich = games.filter(g => !scoreCache.has(g.id));
    toEnrich.forEach(g => queue.push(g));
    processQueue();
    return () => { if (timer) clearTimeout(timer); };
  }, [games]);

  const getScore = (game: Game) => {
    const e = scoreCache.get(game.id);
    return e?.metacritic || game.metacritic || 0;
  };
  const newGames = games.filter(g => g.isNew);
  const trending = [...games].sort((a, b) => getScore(b) - getScore(a)).slice(0, 8);
  const topGames = [...games].sort((a, b) => getScore(b) - getScore(a)).slice(0, 12);

  if (games.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{
          position: 'relative', borderRadius: '20px', overflow: 'hidden',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        }}>
          <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Top Games</h2>
          </div>
          <div style={{ display: 'flex', gap: '16px', padding: '24px 32px', overflowX: 'auto' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                minWidth: '200px', height: '280px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.1))',
                border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          padding: '60px 32px', textAlign: 'center', borderRadius: '20px',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No games available</h3>
          <p style={{ color: 'var(--text-muted)' }}>Check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{
        position: 'relative', borderRadius: '20px', overflow: 'hidden',
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      }}>
        <div style={{
          padding: '24px 32px 16px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <TrendingUp size={18} style={{ color: '#a855f7', marginRight: '8px' }} />
            Top Games
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{games.length} games</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', padding: '24px 32px', overflowX: 'auto', scrollBehavior: 'smooth' }}>
          {topGames.map(game => {
            const e = scoreCache.get(game.id);
            const score = e?.metacritic || game.metacritic || 0;
            return (
              <div key={game.id} style={{
                minWidth: '200px', height: '280px', borderRadius: '14px', overflow: 'hidden',
                position: 'relative', flexShrink: 0, cursor: 'pointer',
                border: '1px solid var(--border-color)',
              }} onClick={() => onDetails(game)}>
                <img
                  src={game.cover || game.hero}
                  alt={game.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x280/1a1a2e/7c3aed?text=Game'; }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{game.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{game.developer}</div>
                </div>
                {score > 0 && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px', padding: '2px 6px', borderRadius: '4px',
                    background: score >= 85 ? '#16a34a' : score >= 70 ? '#ca8a04' : 'var(--text-muted)',
                    fontSize: '0.65rem', fontWeight: 800, color: 'white',
                  }}>
                    {score}
                  </div>
                )}
                {e?.ratingsCount ? (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px', padding: '2px 6px', borderRadius: '4px',
                    background: 'rgba(0,0,0,0.75)', fontSize: '0.6rem', color: 'var(--text-secondary)',
                  }}>
                    {e.ratingsCount.toLocaleString()} reviews
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {[
          { icon: <Zap size={20} />, label: 'Available Games', value: `${games.length}+`, color: '#a855f7' },
          { icon: <Download size={20} />, label: 'Installed Games', value: String(games.filter(g => g.installed).length), color: '#22c55e' },
          { icon: <RefreshCw size={20} />, label: 'Updates', value: String(games.filter(g => g.hasUpdate).length), color: '#3b82f6' },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '16px', borderRadius: '14px', background: 'var(--bg-card)',
            border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px', background: `${stat.color}18`,
              border: `1px solid ${stat.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: stat.color, flexShrink: 0,
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {newGames.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#a855f7' }}>✦</span>New on Game Pass
            </h2>
            <button onClick={() => setActiveTab('store')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
              View All →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {newGames.map(game => (
              <GameCard
                key={game.id} game={game}
                onDownload={onDownload} onUpdate={onUpdate} onUninstall={onUninstall}
                onPlay={onPlay} onDetails={onDetails}
                downloading={game.id in downloadingIds}
                progress={downloadingIds[game.id] || 0}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: '#a855f7' }} />Trending Now
          </h2>
          <button onClick={() => setActiveTab('store')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
            View All →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {trending.map(game => (
            <GameCard
              key={game.id} game={game}
              onDownload={onDownload} onUpdate={onUpdate} onUninstall={onUninstall}
              onPlay={onPlay} onDetails={onDetails}
              downloading={game.id in downloadingIds}
              progress={downloadingIds[game.id] || 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;