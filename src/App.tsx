import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Home, Store, Gamepad2, Download, RefreshCw, Settings as SettingsIcon, Play } from 'lucide-react';
import { Game } from './data/games';
import { xboxApi } from './services/xboxApi';
import HomePage from './pages/HomePage';
const StorePage = lazy(() => import('./pages/StorePage'));
import LibraryPage from './pages/LibraryPage';
import DownloadsPage from './pages/DownloadsPage';
import UpdatesPage from './pages/UpdatesPage';
import SettingsPage from './pages/SettingsPage';
import GameModal from './components/GameModal';
import TitleBar from './components/TitleBar';
import AppLogo from './components/AppLogo';
import { SettingsService } from './services/settingsService';
import { getMetacriticScore } from './services/metacriticService';


type TabId = 'home' | 'store' | 'library' | 'downloads' | 'updates' | 'settings';

const navItems: { id: TabId; label: string; icon: React.ComponentType<{ size?: number | string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'store', label: 'Store', icon: Store },
  { id: 'library', label: 'Library', icon: Gamepad2 },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'updates', label: 'Updates', icon: RefreshCw },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [gameList, setGameList] = useState<Game[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Record<string, number>>({});
  const [downloadSpeeds, setDownloadSpeeds] = useState<Record<string, number>>({});
  const [completedDownloads, setCompletedDownloads] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [playingGame, setPlayingGame] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingStatus('Loading settings...');
        const settings = await SettingsService.getSettings();
        setTheme(settings.theme || 'dark');
      } catch {}

      try {
        setLoadingStatus('Fetching game list...');
        const xboxGames = await xboxApi.getGamePassGamesFull();
          const transformedGames: Game[] = xboxGames.map(game => ({
            id: game.id,
            title: game.title,
            developer: game.developer || 'Unknown',
            publisher: game.publisher || 'Xbox Game Studios',
            genre: game.genre?.length ? game.genre : ['Action'],
            rating: game.rating || 4.5,
            size: game.size || '50 GB',
            sizeGB: game.sizeGB || 0,
            releaseDate: game.releaseDate || new Date().toISOString().split('T')[0],
            description: game.description || 'Available on Xbox Game Pass',
            cover: game.cover || 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop',
            hero: game.hero || 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            tags: game.tags?.length ? game.tags : ['Game Pass'],
            categories: game.categories || [],
            category: game.category || '',
            attributes: game.attributes || [],
            players: game.players || '1',
            metacritic: game.metacritic || 80,
            ageRating: game.ageRating || 'PEGI 12',
            state: game.state,
            installed: false,
            downloadProgress: 0,
          }));
        setGameList(transformedGames);

        // Scan for installed games on disk
        try {
          const s = await SettingsService.getSettings();
          const scan = await window.electronAPI?.scanInstalledGames(s.downloadPath || 'C:\\Xbox Games\\');
          if (scan?.games?.length) {
            const basePath = (s.downloadPath || 'C:\\Xbox Games').replace(/\\+$/, '');
            setGameList(prev => prev.map(g => {
              const matchedFolder = scan.games.find(f => f.toLowerCase() === g.title.toLowerCase() || f === g.id);
              if (!matchedFolder) return g;
              const folderSizeBytes = scan.sizes?.[matchedFolder] || 0;
              const folderSizeGB = folderSizeBytes > 0 ? folderSizeBytes / (1024 * 1024 * 1024) : g.sizeGB;
              return { ...g, installed: true, installPath: basePath + '\\' + matchedFolder, sizeGB: folderSizeGB };
            }));
          }
        } catch {}
      } catch {}

      setLoadingStatus('Ready!');
      setTimeout(() => setIsInitialLoading(false), 400);
    };

    init();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedGame(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
        searchInput?.focus();
      }
      if (e.key === 'Enter' && activeTab !== 'store') setActiveTab('store');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGame, activeTab]);



  // Track screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [downloadProgressMap, setDownloadProgressMap] = useState<Record<string, { receivedBytes: number; totalBytes: number; speed: number }>>({});
  const [extractingIds, setExtractingIds] = useState<Record<string, string>>({});
  const [extractErrors, setExtractErrors] = useState<Record<string, string>>({});
  const [pausedDownloads, setPausedDownloads] = useState<Record<string, number>>({});
  const downloadingIdsRef = useRef(downloadingIds);
  downloadingIdsRef.current = downloadingIds;

  useEffect(() => {
    window.electronAPI?.onConsoleLog((msg) => console.log('[main]', msg));
    window.electronAPI?.onDownloadProgress(({ gameId, receivedBytes, totalBytes, speed }) => {
      console.log('[App:onDownloadProgress]', gameId, receivedBytes, totalBytes, speed);
      if (receivedBytes >= totalBytes && totalBytes > 0) console.log('[App:onDownloadProgress] ===> 100% DETECTED', gameId);
      setDownloadingIds(prev => {
        if (!(gameId in prev)) return prev;
        const pct = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 50;
        console.log('[App:onDownloadProgress] pct:', pct);
        if (pct >= 100) console.log('[App:onDownloadProgress] ===> SETTING 100% FOR', gameId);
        return { ...prev, [gameId]: pct };
      });
      if (speed > 0) setDownloadSpeeds(prev => ({ ...prev, [gameId]: speed }));
      setDownloadProgressMap(prev => ({ ...prev, [gameId]: { receivedBytes, totalBytes, speed } }));
    });
    window.electronAPI?.onDownloadPaused(({ gameId }) => {
      const progress = downloadingIdsRef.current[gameId] || 50;
      setDownloadingIds(prev => {
        const n = { ...prev };
        delete n[gameId];
        return n;
      });
      setPausedDownloads(prev => ({ ...prev, [gameId]: progress }));
    });
    window.electronAPI?.onExtractProgress(({ gameId, status, extractDir, error }) => {
      console.log('[App:onExtractProgress]', gameId, status, error);
      if (status === 'extracting') {
        setExtractingIds(prev => ({ ...prev, [gameId]: 'extracting' }));
        // Ensure game is in downloadingIds (in case onDownload's setState hasn't committed yet)
        setDownloadingIds(prev => {
          if (gameId in prev) return prev;
          console.log('[App:onExtractProgress] adding game to downloadingIds:', gameId);
          return { ...prev, [gameId]: 0 };
        });
      } else if (status === 'done') {
        console.log('[App:onExtractProgress] ===> EXTRACTION DONE FOR', gameId, 'extractDir:', extractDir);
        setDownloadingIds(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setExtractingIds(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setDownloadProgressMap(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setGameList(prevGames =>
          prevGames.map(g =>
            g.id === gameId
              ? { ...g, installed: true, installPath: extractDir, hasUpdate: false, downloadProgress: 100, version: g.latestVersion }
              : g
          )
        );
        setCompletedDownloads(prev => prev.includes(gameId) ? prev : [...prev, gameId]);
      } else if (status === 'error') {
        console.log('[App:onExtractProgress] ===> EXTRACTION ERROR FOR', gameId, error);
        setExtractingIds(prev => ({ ...prev, [gameId]: 'error' }));
        setExtractErrors(prev => ({ ...prev, [gameId]: event.error || 'Unknown error' }));
      }
    });
    window.electronAPI?.onDownloadComplete(({ gameId, success, state }) => {
      console.log('[App:onDownloadComplete]', gameId, success, state);
      if (success) {
        setDownloadingIds(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setDownloadProgressMap(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setExtractingIds(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setGameList(prevGames =>
          prevGames.map(g =>
            g.id === gameId
              ? { ...g, installed: true, hasUpdate: false, downloadProgress: 100, version: g.latestVersion }
              : g
          )
        );
        setCompletedDownloads(prev => prev.includes(gameId) ? prev : [...prev, gameId]);
      } else if (state === 'cancelled') {
        // Cancelled by user — clean up all state
        setDownloadingIds(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setDownloadProgressMap(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setExtractingIds(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setPausedDownloads(prev => { const n = { ...prev }; delete n[gameId]; return n; });
        setExtractErrors(prev => { const n = { ...prev }; delete n[gameId]; return n; });
      }
    });
  }, []);

  const handleDownload = useCallback((game: Game) => {
    if (downloadingIds[game.id] !== undefined) return;
    setDownloadingIds(prev => ({ ...prev, [game.id]: 0 }));
    setActiveTab('downloads');
  }, [downloadingIds]);

  const handleUpdate = useCallback((game: Game) => {
    if (downloadingIds[game.id] !== undefined) return;
    setDownloadingIds(prev => ({ ...prev, [game.id]: 0 }));
  }, [downloadingIds]);

  const handleUpdateAll = useCallback(() => {
    setUpdatingAll(true);
    const gamesWithUpdates = gameList.filter(g => g.hasUpdate);
    const newIds: Record<string, number> = {};
    gamesWithUpdates.forEach(g => {
      if (downloadingIds[g.id] === undefined) {
        newIds[g.id] = 0;
      }
    });
    setDownloadingIds(prev => ({ ...prev, ...newIds }));
    setTimeout(() => setUpdatingAll(false), 3000);
  }, [gameList, downloadingIds]);

  const handleUninstall = useCallback(async (game: Game) => {
    setGameList(prev =>
      prev.map(g =>
        g.id === game.id ? { ...g, installed: false, downloadProgress: 0 } : g
      )
    );
    setCompletedDownloads(prev => prev.filter(id => id !== game.id));
    try {
      // Use stored installPath, else fallback to settings path
      let folderPath = game.installPath;
      if (!folderPath) {
        const settings = await SettingsService.getSettings();
        const basePath = (settings.downloadPath || 'C:\\Xbox Games').replace(/\\+$/, '');
        const folderName = game.title.replace(/[<>:"/\\|?*]/g, '_').trim();
        folderPath = basePath + '\\' + folderName;
      }
      await window.electronAPI?.uninstallGame(game.id, folderPath);
    } catch {}
  }, []);

  const handlePlay = useCallback(async (game: Game) => {
    setPlayingGame(game.id);
    try {
      const settings = await SettingsService.getSettings();
      const folder = (settings.downloadPath || 'C:\\Xbox Games').replace(/\\+$/, '') + '\\' + game.title.replace(/[<>:"/\\|?*]/g, '_').trim();
      await window.electronAPI?.launchGame(folder);
    } catch {}
    setTimeout(() => setPlayingGame(null), 3000);
  }, []);

  const handleDetails = useCallback(async (game: Game) => {
    try {
      const gameDetails = await window.electronAPI.getGameDetails(game.id);
      const merged = { ...game, ...gameDetails };
      console.log('[Details] game.categories:', game.categories, '| merged.categories:', merged.categories);
      console.log('[Details] game.genre:', game.genre, '| merged.genre:', merged.genre);
      setSelectedGame(merged);
    } catch {
      setSelectedGame(game);
    }
    getMetacriticScore(game.title, game.id).then(metacritic => {
      if (!metacritic) return;
      setSelectedGame(prev => prev ? {
        ...prev,
        metacriticScore: metacritic.score,
        metacriticRatingCount: metacritic.ratingCount,
        metacritic: metacritic.score,
      } : prev);
    });
  }, []);

  const handleOpenFolder = useCallback(async (game: Game) => {
    try {
      const settings = await SettingsService.getSettings();
      const base = (settings.downloadPath || 'C:\\Xbox Games').replace(/\\+$/, '');
      const folder = base + '\\' + game.title.replace(/[<>:"/\\|?*]/g, '_').trim();
      console.log('[Game Location] Opening folder:', folder);
      await window.electronAPI?.openFolder(folder);
    } catch (e) {
      console.error('[Game Location] Error:', e);
    }
  }, []);

  const handleRefreshLibrary = useCallback(async () => {
    try {
      const settings = await SettingsService.getSettings();
      const scan = await window.electronAPI?.scanInstalledGames(settings.downloadPath || 'C:\\Xbox Games\\');
      if (scan?.games?.length) {
        const basePath = (settings.downloadPath || 'C:\\Xbox Games').replace(/\\+$/, '');
        setGameList(prev => prev.map(g => {
          const matchedFolder = scan.games.find(f => f.toLowerCase() === g.title.toLowerCase() || f === g.id);
          if (!matchedFolder) return { ...g, installed: false };
          const folderSizeBytes = scan.sizes?.[matchedFolder] || 0;
          const folderSizeGB = folderSizeBytes > 0 ? folderSizeBytes / (1024 * 1024 * 1024) : g.sizeGB;
          return { ...g, installed: true, installPath: basePath + '\\' + matchedFolder, sizeGB: folderSizeGB };
        }));
      }
    } catch {}
  }, []);

  const handleCancelDownload = useCallback((gameId: string) => {
    window.electronAPI?.cancelDownload(gameId);
    // IPC handler will send download_complete with cancelled state which cleans up
  }, []);

  const handlePauseDownload = useCallback((gameId: string) => {
    window.electronAPI?.pauseDownload(gameId);
    // IPC handler will send download_paused which removes from downloadingIds
  }, []);

  const handleResumeDownload = useCallback((gameId: string) => {
    setPausedDownloads(prev => {
      const pct = prev[gameId] || 0;
      const n = { ...prev };
      delete n[gameId];
      setDownloadingIds(d => ({ ...d, [gameId]: pct }));
      return n;
    });
    window.electronAPI?.resumeDownload(gameId);
  }, []);

  const installedGames = gameList.filter(g => g.installed);
  const gamesWithUpdates = gameList.filter(g => g.hasUpdate && g.installed);
  const updatesCount = gamesWithUpdates.length;
  const downloadsCount = Object.keys(downloadingIds).length;

  const filteredGames = gameList;

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomePage
            games={filteredGames}
            onDownload={handleDownload}
            onUpdate={handleUpdate}
            onUninstall={handleUninstall}
            onPlay={handlePlay}
            onDetails={handleDetails}
            downloadingIds={downloadingIds}
            downloadSpeeds={downloadSpeeds}
            setActiveTab={setActiveTab}
          />
        );
      case 'store':
        return (
          <Suspense fallback={<div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading...</div>}>
            <StorePage
              games={filteredGames}
              onDownload={handleDownload}
              onUpdate={handleUpdate}
              onUninstall={handleUninstall}
              onPlay={handlePlay}
            onDetails={handleDetails}
            downloadingIds={downloadingIds}
            downloadSpeeds={downloadSpeeds}
          />
          </Suspense>
        );
      case 'library':
        return (
          <LibraryPage
            installedGames={installedGames}
            onDownload={handleDownload}
            onUpdate={handleUpdate}
            onUninstall={handleUninstall}
            onPlay={handlePlay}
            onDetails={handleDetails}
            onOpenFolder={handleOpenFolder}
            onRefresh={handleRefreshLibrary}
            downloadingIds={downloadingIds}
            downloadSpeeds={downloadSpeeds}
          />
        );
      case 'downloads':
        return (
          <DownloadsPage
            downloadingIds={downloadingIds}
            allGames={gameList}
            onCancelDownload={handleCancelDownload}
            onPauseDownload={handlePauseDownload}
            onResumeDownload={handleResumeDownload}
            completedDownloads={completedDownloads}
            downloadProgressMap={downloadProgressMap}
            downloadSpeeds={downloadSpeeds}
            extractingIds={extractingIds}
            extractErrors={extractErrors}
            pausedDownloads={pausedDownloads}
          />
        );
      case 'updates':
        return (
          <UpdatesPage
            gamesWithUpdates={gamesWithUpdates}
            onUpdate={handleUpdate}
            // onPlay={handlePlay}
            downloadingIds={downloadingIds}
            updatingAll={updatingAll}
            onUpdateAll={handleUpdateAll}
          />
        );
      case 'settings':
        return <SettingsPage onThemeChange={setTheme} currentTheme={theme} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Loading Screen */}
      {isInitialLoading && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {/* Floating orbs */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(124,58,237,${0.06 - i * 0.01}) 0%, transparent 70%)`,
                width: `${400 + i * 100}px`,
                height: `${400 + i * 100}px`,
                left: `${10 + i * 20}%`,
                top: `${5 + i * 25}%`,
                animation: `float ${5 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.6}s`,
              }} />
            ))}
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <AppLogo size={72} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Xbox Launcher</div>
              <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '4px' }}>Game Pass PC</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <div style={{
                width: '20px', height: '20px',
                border: '2px solid rgba(124,58,237,0.3)',
                borderTopColor: '#a855f7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{loadingStatus}</span>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '40px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Xbox Downloader v1.0
          </div>
        </div>
      )}

      {!isInitialLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            position: 'relative',
            overflow: 'hidden',
            animation: 'fadeIn 0.4s ease',
          }}
        >
          {/* Background particles */}
          <div style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'hidden',
          }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(124,58,237,${0.08 - i * 0.01}) 0%, transparent 70%)`,
                  width: `${300 + i * 80}px`,
                  height: `${300 + i * 80}px`,
                  left: `${i * 18 - 5}%`,
                  top: `${i * 15 - 10}%`,
                  animation: `float ${4 + i}s ease-in-out infinite`,
                  animationDelay: `${i * 0.8}s`,
                }}
              />
            ))}
          </div>

      {/* Playing overlay */}
      {playingGame && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '20px',
            backdropFilter: 'blur(20px)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(34, 197, 94, 0.5)',
            animation: 'pulse-glow 1.5s ease-in-out infinite',
          }}>
            <Play size={36} fill="white" color="white" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Launching...
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {gameList.find(g => g.id === playingGame)?.title}
            </div>
          </div>
          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '100%',
              background: 'linear-gradient(90deg, #16a34a, #22c55e, #16a34a)',
              backgroundSize: '200% 100%',
              animation: 'downloading 1s linear infinite',
            }} />
          </div>
        </div>
      )}

      {/* Title Bar */}
      <TitleBar />

      {/* Main layout wrapper */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', zIndex: 1, paddingTop: '36px' }}>

        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside
            style={{
              width: sidebarCollapsed ? '64px' : '220px',
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'width 0.3s ease',
              flexShrink: 0,
              position: 'fixed',
              top: '36px',
              left: 0,
              bottom: 0,
              zIndex: 10,
              overflowY: 'auto',
            }}
          >
            {/* Logo */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minHeight: '64px',
                cursor: 'pointer',
              }}
              onClick={() => setSidebarCollapsed(c => !c)}
            >
              <AppLogo size={36} />
              {!sidebarCollapsed && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Xbox Launcher</div>
                  <div style={{ fontSize: '0.6rem', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Game Pass PC</div>
                </div>
              )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const showBadge = item.id === 'updates' && updatesCount > 0;
                const showDownBadge = item.id === 'downloads' && downloadsCount > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: sidebarCollapsed ? '11px 16px' : '11px 18px',
                      border: 'none',
                      background: 'transparent',
                      color: isActive ? '#a855f7' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 400,
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span style={{ position: 'relative', flexShrink: 0 }}>
                      <Icon size={17} />
                      {(showBadge || showDownBadge) && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: '#a855f7',
                          border: '1.5px solid var(--bg-sidebar)',
                        }} />
                      )}
                    </span>
                    {!sidebarCollapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {showBadge && (
                          <span style={{
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            color: 'white',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '8px',
                          }}>
                            {updatesCount}
                          </span>
                        )}
                        {showDownBadge && !showBadge && (
                          <span style={{
                            background: 'rgba(124, 58, 237, 0.3)',
                            color: '#c4b5fd',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '8px',
                          }}>
                            {downloadsCount}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Bottom */}
            <div style={{ borderTop: '1px solid var(--border-color)', padding: '8px 0' }}>

              <button
                onClick={() => setActiveTab('settings')}
                className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: sidebarCollapsed ? '11px 16px' : '11px 18px',
                  border: 'none',
                  background: 'transparent',
                  color: activeTab === 'settings' ? '#a855f7' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === 'settings' ? 600 : 400,
                }}
                title={sidebarCollapsed ? 'Settings' : undefined}
              >
                <SettingsIcon size={17} />
                {!sidebarCollapsed && <span>Settings</span>}
              </button>
            </div>
          </aside>
        )}

        {/* Main content area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? '64px' : '220px'),
        }}>

          {/* Top bar */}
          <div style={{
            height: '56px',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '10px',
            backdropFilter: 'blur(20px)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            flexShrink: 0,
          }}>
            {/* Right side */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            </div>
          </div>

          {/* Page content */}
          <main style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px', overflowY: 'auto' }}>
            {renderPage()}
          </main>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: '260px',
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              padding: '20px 0',
              display: 'flex', flexDirection: 'column',
              animation: 'slideInLeft 0.3s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AppLogo size={32} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Xbox Launcher</div>
                <div style={{ fontSize: '0.65rem', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Game Pass PC</div>
              </div>
            </div>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 20px', border: 'none', background: 'transparent',
                    color: isActive ? '#a855f7' : 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: isActive ? 600 : 400, textAlign: 'left',
                  }}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.id === 'updates' && updatesCount > 0 && (
                    <span style={{
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: 'white', fontSize: '0.65rem', fontWeight: 700,
                      padding: '2px 7px', borderRadius: '8px',
                    }}>{updatesCount}</span>
                  )}
                </button>
              );
            })}

            <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', border: 'none', background: 'transparent',
                  color: activeTab === 'settings' ? '#a855f7' : 'var(--text-secondary)', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: activeTab === 'settings' ? 600 : 400, textAlign: 'left',
                  borderRadius: '10px',
                }}
              >
                <SettingsIcon size={18} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      {isMobile && (
        <nav className="mobile-nav" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '60px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-around', padding: '0 8px', zIndex: 100,
        }}>
          {[...navItems.slice(0, 4), { id: 'settings' as TabId, label: 'Settings', icon: SettingsIcon }].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  padding: '6px 10px', border: 'none', background: 'transparent',
                  color: isActive ? '#a855f7' : '#4b5563', cursor: 'pointer', minWidth: '48px',
                  borderRadius: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Game detail modal */}
      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onDownload={(g) => { handleDownload(g); setSelectedGame(null); }}
          onUpdate={(g) => { handleUpdate(g); setSelectedGame(null); }}
          onUninstall={(g) => { handleUninstall(g); setSelectedGame(null); }}
          onPlay={(g) => { handlePlay(g); setSelectedGame(null); }}
          downloading={selectedGame.id in downloadingIds}
          progress={downloadingIds[selectedGame.id] || 0}
        />
      )}
      </div>
      )}
    </>
  );
};
