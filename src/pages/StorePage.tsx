import React, { useState, useEffect } from 'react';
import { Search, Star } from 'lucide-react';
import { Game } from '../data/games';
import GameCard from '../components/GameCard';
import { getRawgDetails, scoreCache } from '../services/rawgApi';
const storeQueue: Game[] = [];
let storeTimer: ReturnType<typeof setTimeout> | null = null;

function processStoreQueue() {
  if (storeQueue.length === 0) return;
  const batch = storeQueue.splice(0, 2);
  batch.forEach(game => {
    if (scoreCache.has(game.id)) return;
    getRawgDetails(game.title).then(data => {
      if (data) {
        scoreCache.set(game.id, { metacritic: data.metacritic, ratingsCount: data.ratingsCount });
      }
    });
  });
  if (storeQueue.length > 0) {
    storeTimer = setTimeout(() => processStoreQueue(), 800);
  }
}

interface StorePageProps {
  games: Game[];
  onDownload: (game: Game) => void;
  onUpdate: (game: Game) => void;
  onUninstall: (game: Game) => void;
  onPlay: (game: Game) => void;
  onDetails: (game: Game) => void;
  downloadingIds: Record<string, number>;
  downloadSpeeds?: Record<string, number>;
}

const StorePage: React.FC<StorePageProps> = ({
  games, onDownload, onUpdate, onUninstall, onPlay, onDetails, downloadingIds, downloadSpeeds
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [showInstalled, setShowInstalled] = useState<'all' | 'installed' | 'available'>('all');

  const allGenres = ['All', ...new Set(
    games.flatMap(g => [...(g.categories || []), ...(g.genre || [])])
  )].filter(Boolean).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (storeTimer) clearTimeout(storeTimer);
    const toEnrich = games.filter(g => !scoreCache.has(g.id));
    toEnrich.forEach(g => storeQueue.push(g));
    processStoreQueue();
    return () => { if (storeTimer) clearTimeout(storeTimer); };
  }, [games]);

  const getScore = (game: Game) => {
    const s = scoreCache.get(game.id);
    return s?.metacritic || game.metacritic || 0;
  };

  const filtered = games.filter(game => {
    const q = localSearch.toLowerCase();
    const matchSearch = !q ||
      game.title.toLowerCase().includes(q) ||
      (game.developer?.toLowerCase().includes(q) ?? false) ||
      (game.categories?.some(c => c.toLowerCase().includes(q)) ?? false) ||
      (game.genre?.some(g => g.toLowerCase().includes(q)) ?? false);
    const matchGenre = selectedGenre === 'All' ||
      game.categories?.some(c => c.toLowerCase().includes(selectedGenre.toLowerCase())) ||
      game.genre?.some(g => g.toLowerCase().includes(selectedGenre.toLowerCase()));
    const matchInstalled = showInstalled === 'all' ||
      (showInstalled === 'installed' && game.installed) ||
      (showInstalled === 'available' && !game.installed);
    return matchSearch && matchGenre && matchInstalled;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'size') return (b.sizeGB || 0) - (a.sizeGB || 0);
    return getScore(b) - getScore(a);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Star size={16} fill="white" color="white" />
          </span>
          Game Pass Store
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {`${games.length} games included with your Game Pass subscription`}
        </p>
      </div>

      {/* Search & filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input
            type="text"
            placeholder="Search a game..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', borderRadius: '10px', fontSize: '0.8rem' }}
          />
        </div>

        <select
          value={showInstalled}
          onChange={e => setShowInstalled(e.target.value as 'all' | 'installed' | 'available')}
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
          <option value="all" style={{ background: 'var(--bg-card)' }}>All Games</option>
          <option value="installed" style={{ background: 'var(--bg-card)' }}>Installed</option>
          <option value="available" style={{ background: 'var(--bg-card)' }}>Available</option>
        </select>

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
          <option value="title" style={{ background: 'var(--bg-card)' }}>Alphabetical</option>
          <option value="size" style={{ background: 'var(--bg-card)' }}>Largest</option>
          <option value="score" style={{ background: 'var(--bg-card)' }}>Top Rated</option>
        </select>
      </div>

      {/* Genre chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {allGenres.map(genre => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`filter-chip ${selectedGenre === genre ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              background: selectedGenre === genre ? 'rgba(124, 58, 237, 0.25)' : 'rgba(124, 58, 237, 0.06)',
              color: selectedGenre === genre ? '#c4b5fd' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: selectedGenre === genre ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} game{filtered.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Games grid */}
      {filtered.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {filtered.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onDownload={onDownload}
              onUpdate={onUpdate}
              onUninstall={onUninstall}
              onPlay={onPlay}
              onDetails={onDetails}
              downloading={game.id in downloadingIds}
              progress={downloadingIds[game.id] || 0}
              speed={downloadSpeeds?.[game.id] || 0}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4b5563' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>No results</div>
          <div style={{ fontSize: '0.85rem' }}>Try another filter or search term</div>
        </div>
      )}
    </div>
  );
};

export default StorePage;
