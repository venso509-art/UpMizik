import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ActiveView,
  MusicItem,
  ArtistUser,
  AdminUser,
  DonationItem,
  PubItem,
  RpaItem,
  ArchiveRecord,
  CommentItem,
  MusicCategory,
  SocialPost,
  ThemeMode
} from './types';
import { StorageService } from './utils/storage';
import { HostingerService } from './utils/hostingerService';
import { INITIAL_ARTISTS } from './data/initialData';
import { globalSoundEngine } from './utils/audioEngine';

// Components
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { HeroBanner } from './components/HeroBanner';
import { TopTrending } from './components/TopTrending';
import { ArtistLeaderboard } from './components/ArtistLeaderboard';
import { RecommendedSection } from './components/RecommendedSection';
import { CategoryFilter } from './components/CategoryFilter';
import { MusicGrid } from './components/MusicGrid';
import { UpMizikSocial } from './components/UpMizikSocial';
import { RpaSection } from './components/RpaSection';
import { PubsBanner } from './components/PubsBanner';
import { SupportModal } from './components/SupportModal';
import { CommentModal } from './components/CommentModal';
import { ArtistProfileModal } from './components/ArtistProfileModal';
import { ShareModal } from './components/ShareModal';
import { ArtistAuthModal } from './components/ArtistAuthModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ArtistDashboard } from './components/ArtistDashboard';
import { AdminDashboard, DEFAULT_HTG_EXCHANGE_RATE } from './components/AdminDashboard';
import { GlobalAudioPlayer } from './components/GlobalAudioPlayer';
import { Footer } from './components/Footer';
import { ToastNotification, ToastMessage } from './components/ToastNotification';
import { updateDocumentMetaTags, updateArtistDocumentMetaTags, clearDeepLinkUrlParams } from './utils/deepLink';
import { offlineManager } from './utils/offlineManager';
import { OfflinePlaylistModal } from './components/OfflinePlaylistModal';
import { ArtistStoryBar } from './components/ArtistStoryBar';
import { MobileBottomNav } from './components/MobileBottomNav';

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<ActiveView>('public');

  // Enforce robust viewport meta tag & prevent accidental zoom on mobile clicks/inputs
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover';

    // Prevent multi-touch gesture zoom and double-tap zoom
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        // Prevent double tap zoom
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'A' || target.getAttribute('role') === 'button')) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Automatically scroll to the very top whenever the view or page changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tout');

  // Offline Cached Track IDs from Service Worker / Storage
  const [cachedTrackIds, setCachedTrackIds] = useState<string[]>(() =>
    offlineManager.getCachedTrackIds()
  );

  // Auth Users
  const [currentArtist, setCurrentArtist] = useState<ArtistUser | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);

  // Recommendations refresh tracker
  const [recRefreshKey, setRecRefreshKey] = useState(0);

  // Global Theme Mode (Atmospheric Night vs High Contrast Light)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => StorageService.getThemeMode());

  // Apply theme to document root
  useEffect(() => {
    if (themeMode === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.body.setAttribute('data-theme', 'night');
    }
    StorageService.saveThemeMode(themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const nextTheme = prev === 'night' ? 'light' : 'night';
      addToast('info', nextTheme === 'light' ? '☀️ Mod Klè (High Contrast Light) aktive' : '🌙 Mod Nwit (Atmospheric Night) aktive');
      return nextTheme;
    });
  };

  // Offline Download handler with user toast notification
  const handleDownloadOffline = async (music: MusicItem) => {
    try {
      await offlineManager.cacheTrackForOffline(music);
      addToast(
        'success',
        `📥 "${music.title}" telechaje avèk siksè nan aparèy ou! W ap ka koute l san entènèt.`
      );
    } catch {
      addToast('error', `Pa rive telechaje "${music.title}" pou oflayn.`);
    }
  };

  // App Data collections from StorageService
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [artists, setArtists] = useState<ArtistUser[]>([]);
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [pubs, setPubs] = useState<PubItem[]>([]);
  const [rpaList, setRpaList] = useState<RpaItem[]>([]);
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [top3Override, setTop3Override] = useState<{ enabled: boolean; topIds: string[] }>({
    enabled: false,
    topIds: []
  });

  // Modal States
  const deepLinkProcessedRef = useRef(false);
  const [musicToSupport, setMusicToSupport] = useState<MusicItem | null>(null);
  const [musicForComment, setMusicForComment] = useState<MusicItem | null>(null);
  const [musicToShare, setMusicToShare] = useState<MusicItem | null>(null);
  const [selectedArtistForProfile, setSelectedArtistForProfile] = useState<ArtistUser | null>(null);
  const [showArtistAuth, setShowArtistAuth] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineModalInitialTab, setOfflineModalInitialTab] = useState<'playlists' | 'queue' | 'add'>('playlists');

  const handleOpenOfflineModal = (tab: 'playlists' | 'queue' | 'add' = 'playlists') => {
    setOfflineModalInitialTab(tab);
    setShowOfflineModal(true);
  };

  const handleAddToOfflineQueue = (music: MusicItem) => {
    const addedCount = offlineManager.addToQueue(music);
    if (addedCount > 0) {
      addToast('success', `📥 "${music.title}" ajoute nan ke telechajman oflayn an!`);
    } else {
      addToast('info', `"${music.title}" te deja nan ke telechajman an.`);
    }
  };

  const handlePlayPlaylist = (tracks: MusicItem[]) => {
    if (!tracks || tracks.length === 0) return;
    handlePlayToggle(tracks[0]);
    addToast('info', `▶️ Kòmanse jwe playlist oflayn (${tracks.length} moso)`);
  };

  // Audio Playback & 5-Second Listen Logic
  const [currentTrack, setCurrentTrack] = useState<MusicItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [hasListened5s, setHasListened5s] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Load from Storage & Firestore Cloud Sync
  useEffect(() => {
    // Record and increment live platform visit counter (unlimited scaling)
    StorageService.trackSiteVisit();

    const localMusic = StorageService.getMusic();
    const localArtists = StorageService.getArtists();
    const localSocial = StorageService.getSocialPosts();

    setMusicList(localMusic);
    setArtists(localArtists);
    setPubs(StorageService.getPubs());
    setRpaList(StorageService.getRpa());
    setSocialPosts(localSocial);
    setTop3Override(StorageService.getTop3Override());

    // Check existing logins
    const savedArtist = StorageService.getLoggedInArtist();
    if (savedArtist) {
      const freshArtist = localArtists.find(a => a.id === savedArtist.id) || savedArtist;
      if (freshArtist.status === 'active') {
        setCurrentArtist(freshArtist);
      } else {
        StorageService.setLoggedInArtist(null);
        setCurrentArtist(null);
      }
    }

    const savedAdmin = StorageService.getLoggedInAdmin();
    if (savedAdmin && savedAdmin.role === 'super_admin') {
      setCurrentAdmin(savedAdmin);
      // Only load sensitive financial data if admin is verified
      setDonations(StorageService.getDonations(savedAdmin));
      setArchives(StorageService.getArchives(savedAdmin));
    } else {
      // Keep financial records completely empty in memory for public users
      setDonations([]);
      setArchives([]);
    }

    // Cloud Firestore Sync in background
    (async () => {
      try {
        const [cloudMusic, cloudArtists, cloudPosts] = await Promise.all([
          HostingerService.fetchMusic(),
          HostingerService.fetchArtists(),
          HostingerService.fetchSocialPosts()
        ]);

        if (cloudMusic && cloudMusic.length > 0) {
          setMusicList(cloudMusic);
          StorageService.saveMusic(cloudMusic);
        } else if (localMusic.length > 0) {
          // Seed cloud database on first run
          HostingerService.syncMusic(localMusic);
        }

        if (cloudArtists && cloudArtists.length > 0) {
          // Merge cloud artists with local artists, preserving validated/rejected/active local state
          const currentLocal = StorageService.getArtists();
          const localMap = new Map(currentLocal.map(a => [a.id, a]));
          const merged: ArtistUser[] = [];
          const processedIds = new Set<string>();

          for (const ca of cloudArtists) {
            const la = localMap.get(ca.id);
            if (la) {
              if (la.status && la.status !== 'pending' && ca.status === 'pending') {
                merged.push({ ...ca, ...la, status: la.status });
              } else {
                merged.push({ ...ca, ...la });
              }
            } else {
              merged.push(ca);
            }
            processedIds.add(ca.id);
          }
          for (const la of currentLocal) {
            if (!processedIds.has(la.id)) {
              merged.push(la);
            }
          }
          setArtists(merged);
          StorageService.saveArtists(merged);
        } else if (localArtists.length > 0) {
          HostingerService.syncArtists(localArtists);
        }

        if (cloudPosts && cloudPosts.length > 0) {
          setSocialPosts(cloudPosts);
          StorageService.saveSocialPosts(cloudPosts);
        } else if (localSocial.length > 0) {
          HostingerService.syncSocialPosts(localSocial);
        }
      } catch {
        // Hostinger VPS background sync deferred silently in local / sandboxed mode
      }
    })();

    // Real-time Firestore Subscriptions with onSnapshot across the app
    const unsubArtists = HostingerService.subscribeToArtists((cloudArtists) => {
      if (cloudArtists && cloudArtists.length > 0) {
        const currentLocal = StorageService.getArtists();
        const localMap = new Map(currentLocal.map(a => [a.id, a]));
        const merged: ArtistUser[] = [];
        const processedIds = new Set<string>();

        for (const ca of cloudArtists) {
          const la = localMap.get(ca.id);
          if (la) {
            if (la.status && la.status !== 'pending' && ca.status === 'pending') {
              merged.push({ ...ca, ...la, status: la.status });
            } else {
              merged.push({ ...ca, ...la });
            }
          } else {
            merged.push(ca);
          }
          processedIds.add(ca.id);
        }
        for (const la of currentLocal) {
          if (!processedIds.has(la.id)) {
            merged.push(la);
          }
        }
        setArtists(merged);
        StorageService.saveArtists(merged);
      }
    });

    const unsubDonations = HostingerService.subscribeToDonations((cloudDonations) => {
      if (cloudDonations && cloudDonations.length > 0) {
        const activeAdmin = StorageService.getLoggedInAdmin();
        if (activeAdmin && activeAdmin.role === 'super_admin') {
          const currentLocal = StorageService.getDonations(activeAdmin);
          const localMap = new Map(currentLocal.map(d => [d.id, d]));
          const merged: DonationItem[] = [];
          const processedIds = new Set<string>();

          for (const cd of cloudDonations) {
            const ld = localMap.get(cd.id);
            if (ld) {
              if (ld.status && ld.status !== 'pending' && cd.status === 'pending') {
                merged.push({ ...cd, ...ld, status: ld.status });
              } else {
                merged.push({ ...cd, ...ld });
              }
            } else {
              merged.push(cd);
            }
            processedIds.add(cd.id);
          }
          for (const ld of currentLocal) {
            if (!processedIds.has(ld.id)) {
              merged.push(ld);
            }
          }
          setDonations(merged);
          StorageService.saveDonations(merged);
        }
      }
    });

    const unsubMusic = HostingerService.subscribeToMusic((cloudMusic) => {
      if (cloudMusic && cloudMusic.length > 0) {
        const currentLocal = StorageService.getMusic();
        const cloudMap = new Map(cloudMusic.map(m => [m.id, m]));
        const merged = [...cloudMusic];
        for (const lm of currentLocal) {
          if (!cloudMap.has(lm.id)) {
            merged.push(lm);
            cloudMap.set(lm.id, lm);
          }
        }
        setMusicList(merged);
        StorageService.saveMusic(merged);
      }
    });

    const unsubPosts = HostingerService.subscribeToSocialPosts((cloudPosts) => {
      if (cloudPosts && cloudPosts.length > 0) {
        setSocialPosts(cloudPosts);
        StorageService.saveSocialPosts(cloudPosts);
      }
    });

    return () => {
      unsubArtists();
      unsubDonations();
      unsubMusic();
      unsubPosts();
    };
  }, []);

  // Cross-view and Storage Sync Listener for Music, Artists, and Donations updates
  useEffect(() => {
    const handleSync = () => {
      const freshMusic = StorageService.getMusic();
      const freshArtists = StorageService.getArtists();
      setMusicList(freshMusic);
      setArtists(freshArtists);

      const activeAdmin = currentAdmin || StorageService.getLoggedInAdmin();
      if (activeAdmin && activeAdmin.role === 'super_admin') {
        setDonations(StorageService.getDonations(activeAdmin));
        setArchives(StorageService.getArchives(activeAdmin));
      }

      // If current track is playing and was updated, sync its metadata live
      if (currentTrack) {
        const matching = freshMusic.find((m) => m.id === currentTrack.id);
        if (matching) {
          setCurrentTrack(matching);
        }
      }
    };

    const handleMusicValidated = (e: any) => {
      const detail = e.detail;
      if (detail && detail.song) {
        if (currentArtist && (currentArtist.id === detail.song.artistId || currentArtist.stageName.toLowerCase() === detail.song.artistName.toLowerCase())) {
          addToast('success', `🎉 Felisitasyon! Admin fenk valide moso mizik "${detail.song.title}" ou a!`);
        }
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('upmizik_music_updated', handleSync);
    window.addEventListener('upmizik_artist_updated', handleSync);
    window.addEventListener('upmizik_donation_updated', handleSync);
    window.addEventListener('upmizik_music_validated', handleMusicValidated);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('upmizik_music_updated', handleSync);
      window.removeEventListener('upmizik_artist_updated', handleSync);
      window.removeEventListener('upmizik_donation_updated', handleSync);
      window.removeEventListener('upmizik_music_validated', handleMusicValidated);
    };
  }, [currentTrack, currentArtist, currentAdmin]);

  // Pwoteksyon Espas Admin (admin_dashboard route guard):
  // Asire ke si yon admin pa konekte ak wòl 'super_admin', li otomatikman redirije sou 'public' san okenn done finansye pa chaje nan memwa.
  useEffect(() => {
    if (currentView === 'admin_dashboard') {
      const activeAdmin = currentAdmin || StorageService.getLoggedInAdmin();
      if (activeAdmin && activeAdmin.role === 'super_admin') {
        if (!currentAdmin) {
          setCurrentAdmin(activeAdmin);
        }
        setDonations(StorageService.getDonations(activeAdmin));
        setArchives(StorageService.getArchives(activeAdmin));
        setArtists(StorageService.getArtists());
        setMusicList(StorageService.getMusic());
      } else {
        // Pa gen wòl 'super_admin': vide tout done finansye nan memwa imedyatman epi redirije sou 'public'
        setDonations([]);
        setArchives([]);
        setCurrentAdmin(null);
        setCurrentView('public');
        addToast('error', 'Aksè refize: Ou dwe konekte kòm Administratè prensipal (Super Admin) pou w ka wè espas sa a.');
      }
    }
  }, [currentView, currentAdmin]);

  // Pwoteksyon Espas Atis (artist_dashboard route guard):
  // Menm si yon atis gen imèl ak kòd, si status li pa 'active', li pap ka rete oswa aksede artist_dashboard.
  // Wout la voye l tounen sou 'public' otomatikman ak yon mesaj notifikasyon ki koresponn.
  useEffect(() => {
    if (currentView === 'artist_dashboard') {
      const allArtists = StorageService.getArtists();
      const freshArtist = currentArtist
        ? allArtists.find((a) => a.id === currentArtist.id) || currentArtist
        : null;

      if (!freshArtist || freshArtist.status !== 'active') {
        setCurrentView('public');
        if (freshArtist?.status === 'pending' || (freshArtist as any)?.statut === 'en_attente') {
          addToast('info', 'Aksè refize: Kont atis ou a an atant validasyon toujou pa Administratè a.');
        } else if (freshArtist?.status === 'rejected' || (freshArtist as any)?.statut === 'rejete') {
          addToast('error', 'Aksè refize: Enskripsyon atis ou a te rejte pa Administratè a.');
        } else if (freshArtist?.status === 'suspended' || (freshArtist as any)?.statut === 'sispann') {
          addToast('error', 'Aksè refize: Kont atis ou a tanporèman sispann pa Administratè a.');
        } else {
          addToast('error', 'Aksè refize: Ou dwe gen yon kont atis aktif ki valide pou w ka aksede Espas Atis la.');
        }
      }
    }
  }, [currentView, currentArtist, artists]);
  // Deep-Link & URL Routing Manager
  // Lè yon moun ouvri yon lyen dirèk (?artist=, ?track=, ?post=, #...), li dirije moun nan imedyatman,
  // epi li netwaye URL la (retounen sou baz upmizik.com) pou moun nan ka navige lib e libè san lyen an pa bloke l.
  useEffect(() => {
    if (deepLinkProcessedRef.current) return;
    if (musicList.length === 0) return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const trackQuery = searchParams.get('track');
      const artistQuery = searchParams.get('artist');
      const postQuery = searchParams.get('post');
      const hash = window.location.hash;
      const cleanHash = hash ? hash.replace(/^#(track-|music-|post-|artist-)?/, '') : null;

      const hasDeepLink = Boolean(trackQuery || artistQuery || postQuery || (cleanHash && !cleanHash.includes('section')));

      if (hasDeepLink) {
        deepLinkProcessedRef.current = true;

        // Handle direct artist profile deep-link (?artist=id or #artist-id)
        const targetArtistId = artistQuery || (cleanHash && cleanHash.startsWith('artist-') ? cleanHash.replace('artist-', '') : null);
        if (targetArtistId) {
          handleOpenArtistProfile(targetArtistId);
        }

        // Handle direct post deep-link (?post=id or #sp-id)
        const targetPostId = postQuery || (cleanHash && cleanHash.startsWith('sp-') ? cleanHash : null);
        if (targetPostId) {
          setCurrentView('social');
          setTimeout(() => {
            const postEl = document.getElementById(`post-${targetPostId}`);
            if (postEl) {
              postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              postEl.classList.add('ring-4', 'ring-blue-500', 'shadow-2xl', 'transition-all');
              setTimeout(() => {
                postEl.classList.remove('ring-4', 'ring-blue-500', 'shadow-2xl');
              }, 4000);
            }
          }, 800);
        }

        // Handle direct track deep-link (?track=id or #track-id)
        const targetId = trackQuery || (cleanHash && !cleanHash.includes('section') && !cleanHash.startsWith('sp-') && !cleanHash.startsWith('artist-') ? cleanHash : null);

        if (targetId) {
          const found = musicList.find((m) => m.id === targetId || m.id === `music-${targetId}`);
          if (found) {
            updateDocumentMetaTags(found);
            addToast('info', `🔗 Moso louvri pa lyen dirèk: "${found.title}" pa ${found.artistName}`);

            // Highlight and scroll to music card after render
            setTimeout(() => {
              const cardEl = document.getElementById(`music-card-${found.id}`);
              if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardEl.classList.add('ring-4', 'ring-yellow-400', 'shadow-2xl', 'transition-all');
                setTimeout(() => {
                  cardEl.classList.remove('ring-4', 'ring-yellow-400', 'shadow-2xl');
                }, 4000);
              }
            }, 600);
          }
        }

        // Otomatikman netwaye query params yo pou adrès la retounen sou baz upmizik.com
        clearDeepLinkUrlParams();
      }
    } catch {
      // Ignore deep link parse errors
    }
  }, [musicList, socialPosts]);

  // Audio Progress & 5-second Threshold Tracker
  useEffect(() => {
    const unsubscribe = globalSoundEngine.onTimeUpdate((currentTime, duration) => {
      setPlaybackSeconds(currentTime);
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
      setPlaybackProgress(progressPercent);

      // Listen count logic: Increment after 5 continuous seconds of listening (Unique per user/device)
      if (currentTime >= 5 && !hasListened5s && currentTrack) {
        setHasListened5s(true);
        StorageService.addRecentListenedId(currentTrack.id);
        const wasIncremented = StorageService.incrementListenCount(currentTrack.id);
        if (wasIncremented) {
          // Sync state when a new unique listen is registered
          setMusicList(StorageService.getMusic());
          setArtists(StorageService.getArtists());
          setRecRefreshKey(prev => prev + 1);
          addToast('info', `🎧 +1 Ekout valide pou "${currentTrack.title}"!`);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentTrack, hasListened5s]);

  // Subscribe to Offline Cached Tracks updates
  useEffect(() => {
    const unsubscribe = offlineManager.onCacheChange((cachedIds) => {
      setCachedTrackIds(cachedIds);
    });
    return () => unsubscribe();
  }, []);

  // Handle Play/Pause Toggle
  const handlePlayToggle = (music: MusicItem) => {
    if (currentTrack?.id === music.id) {
      if (isPlaying) {
        globalSoundEngine.pause();
        setIsPlaying(false);
      } else {
        globalSoundEngine.play();
        setIsPlaying(true);
      }
    } else {
      // Switching to a new track
      StorageService.addRecentListenedId(music.id);
      setRecRefreshKey(prev => prev + 1);
      setCurrentTrack(music);
      setHasListened5s(false);
      setPlaybackSeconds(0);
      setPlaybackProgress(0);

      // Note: Tracks are only downloaded/cached offline upon explicit user choice via the download button or offline playlist manager

      globalSoundEngine.loadTrack(music.id, music.audioUrl, music.title, music.category, music.duration);
      globalSoundEngine.play();
      setIsPlaying(true);
    }
  };

  const handleClosePlayer = () => {
    globalSoundEngine.stop();
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  const [playerVolume, setPlayerVolume] = useState(0.9);
  const [playerMuted, setPlayerMuted] = useState(false);

  const handleSeek = (seconds: number) => {
    globalSoundEngine.seek(seconds);
    setPlaybackSeconds(seconds);
    if (currentTrack && currentTrack.duration > 0) {
      setPlaybackProgress((seconds / currentTrack.duration) * 100);
    }
  };

  const handleSkip = (delta: number) => {
    globalSoundEngine.skip(delta);
  };

  const handleVolumeChange = (vol: number) => {
    setPlayerVolume(vol);
    globalSoundEngine.setVolume(vol);
    setPlayerMuted(vol === 0);
  };

  const handleToggleMute = () => {
    const nextMuted = !playerMuted;
    setPlayerMuted(nextMuted);
    globalSoundEngine.setMuted(nextMuted);
  };

  // Top 3 computation (Only active/published tracks)
  const top3Songs = useMemo(() => {
    const activeList = musicList.filter(m => m.status === 'active' || !m.status);
    if (top3Override.enabled && top3Override.topIds.length > 0) {
      const selected = top3Override.topIds
        .map((id) => activeList.find((m) => m.id === id))
        .filter(Boolean) as MusicItem[];
      if (selected.length > 0) return selected;
    }
    // Fallback: Highest listens among active songs
    return [...activeList].sort((a, b) => b.listens - a.listens).slice(0, 3);
  }, [musicList, top3Override]);

  // Filtered Music List for Feed (Only active/published tracks are public)
  const filteredMusic = useMemo(() => {
    return musicList.filter((item) => {
      const isPublished = item.status === 'active' || !item.status;
      if (!isPublished) return false;

      const matchSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.feat && item.feat.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.collab && item.collab.artistName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (selectedCategory === 'Oflayn') {
        const isCached = cachedTrackIds.includes(item.id);
        return matchSearch && isCached;
      }

      const matchCategory =
        selectedCategory === 'Tout' || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [musicList, searchQuery, selectedCategory, cachedTrackIds]);

  // Category selection handler with smooth scroll to music grid
  const handleSelectCategory = (cat: MusicCategory | string) => {
    setSelectedCategory(cat);
    const feedSection = document.getElementById('music-feed-section') || document.getElementById('music-grid-section');
    if (feedSection) {
      feedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Artist specific songs (both authored tracks and collaborative linked tracks)
  const currentArtistSongs = useMemo(() => {
    if (!currentArtist) return [];
    return musicList.filter((m) => {
      const matchId = m.artistId === currentArtist.id || m.collab?.artistId === currentArtist.id;
      const matchName =
        (m.artistName && currentArtist.stageName && m.artistName.trim().toLowerCase() === currentArtist.stageName.trim().toLowerCase()) ||
        (m.collab?.artistName && currentArtist.stageName && m.collab.artistName.trim().toLowerCase() === currentArtist.stageName.trim().toLowerCase());
      return matchId || matchName;
    });
  }, [musicList, currentArtist]);

  // Handlers for Modals & Views
  const handleOpenArtistProfile = (artistOrId: string | ArtistUser) => {
    if (!artistOrId) return;
    if (typeof artistOrId === 'object' && artistOrId.id) {
      setSelectedArtistForProfile(artistOrId);
      return;
    }
    const targetStr = String(artistOrId).trim().toLowerCase();
    const allArtists = artists.length > 0 ? artists : StorageService.getArtists();
    let found = allArtists.find(
      (a) =>
        (a.id && a.id.toLowerCase() === targetStr) ||
        (a.stageName && a.stageName.toLowerCase() === targetStr) ||
        (a.name && a.name.toLowerCase() === targetStr)
    );
    if (!found) {
      found = INITIAL_ARTISTS.find(
        (a) =>
          (a.id && a.id.toLowerCase() === targetStr) ||
          (a.stageName && a.stageName.toLowerCase() === targetStr) ||
          (a.name && a.name.toLowerCase() === targetStr)
      );
    }
    if (!found) {
      // Find matching song to deduce artist info
      const matchingSong = musicList.find(
        (m) =>
          (m.artistId && m.artistId.toLowerCase() === targetStr) ||
          (m.artistName && m.artistName.toLowerCase() === targetStr) ||
          (m.collab?.artistId && m.collab.artistId.toLowerCase() === targetStr) ||
          (m.collab?.artistName && m.collab.artistName.toLowerCase() === targetStr)
      );
      if (matchingSong) {
        const isCollab =
          matchingSong.collab &&
          (matchingSong.collab.artistId.toLowerCase() === targetStr ||
            matchingSong.collab.artistName.toLowerCase() === targetStr);
        const stageName = isCollab ? matchingSong.collab!.artistName : matchingSong.artistName;
        const id = isCollab ? matchingSong.collab!.artistId : matchingSong.artistId;
        const fallbackArtist: ArtistUser = {
          id: id || `artist-${Date.now()}`,
          name: stageName,
          stageName: stageName,
          email: `${stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`,
          phone: '+509 30 00 0000',
          city: 'Ayiti (Pòtoprens)',
          pin: '0000',
          avatarUrl:
            matchingSong.coverUrl ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
          bio: `${stageName} se yon atis kreyòl talan k ap kreye e pataje bèl mizik sou platfòm UpMizik Ayiti. Li devwe pou l anrichi kilti nasyonal la epi fè vwa li tande toupatou nan mond lan.`,
          musicalRoots: matchingSong.category || 'Mizik Kreyòl',
          musicalInfluences: 'Kilti Kreyòl Ayisyen',
          artisticVision: 'Enspire fanatik yo ak bèl melodi epi leve drapo kilti ayisyen an wo.',
          artistQuote: 'Mizik se nanm nou, se lanmou ak respè pou kilti nou.',
          status: 'active',
          registrationDate: matchingSong.createdAt || '2026-01-01',
          totalListens: matchingSong.listens || 1200,
          totalDonationsReceived: matchingSong.totalDonations || 0
        };
        found = fallbackArtist;
      }
    }
    if (found) {
      setSelectedArtistForProfile(found);
    }
  };

  // Auth Handlers
  const handleArtistLoginSuccess = (artist: ArtistUser) => {
    if (artist.status !== 'active') {
      setCurrentArtist(null);
      StorageService.setLoggedInArtist(null);
      setCurrentView('public');
      if (artist.status === 'pending' || (artist as any)?.statut === 'en_attente') {
        addToast('info', 'Aksè refize: Kont atis ou a an atant validasyon toujou pa Administratè a.');
      } else if (artist.status === 'rejected' || (artist as any)?.statut === 'rejete') {
        addToast('error', 'Aksè refize: Enskripsyon atis ou a te rejte pa Administratè a.');
      } else if (artist.status === 'suspended' || (artist as any)?.statut === 'sispann') {
        addToast('error', 'Aksè refize: Kont atis ou a tanporèman sispann pa Administratè a.');
      } else {
        addToast('error', 'Aksè refize: Ou dwe gen yon kont atis aktif ki valide pou w ka aksede Espas Atis la.');
      }
      return;
    }
    setCurrentArtist(artist);
    StorageService.setLoggedInArtist(artist);
    setCurrentView('artist_dashboard');
    addToast('success', `Byenvini ${artist.stageName}! Ou konekte nan Espas Atis ou.`);
  };

  const handleArtistRegister = (newArtist: ArtistUser) => {
    StorageService.saveArtist(newArtist);
    HostingerService.saveSingleArtist(newArtist);
    setArtists(StorageService.getArtists());
    addToast('success', `Kont ou kreye avèk siksè! Prèv $4.99 la voye bay Admin.`);
  };

  const handleAdminLoginSuccess = (admin: AdminUser) => {
    setCurrentAdmin(admin);
    StorageService.setLoggedInAdmin(admin);
    // Reload all dynamic datasets from StorageService so new pending artists and submissions are 100% up to date
    setArtists(StorageService.getArtists());
    setMusicList(StorageService.getMusic());
    setDonations(StorageService.getDonations(admin));
    setArchives(StorageService.getArchives(admin));
    setCurrentView('admin_dashboard');
    addToast('success', `Konekte kòm Administratè: ${admin.name}`);
  };

  const handleLogoutArtist = () => {
    setCurrentArtist(null);
    StorageService.setLoggedInArtist(null);
    setCurrentView('public');
    addToast('info', 'Ou dekonekte nan Espas Atis.');
  };

  const handleLogoutAdmin = () => {
    setCurrentAdmin(null);
    StorageService.setLoggedInAdmin(null);
    // Immediately purge financial data from React memory
    setDonations([]);
    setArchives([]);
    setCurrentView('public');
    addToast('info', 'Ou sòti nan Espas Administratè.');
  };

  // Add Music Handler (Artist & Admin)
  const handleAddNewSong = (songData: Omit<MusicItem, 'id' | 'listens' | 'totalDonations' | 'createdAt'>) => {
    const newSong: MusicItem = {
      ...songData,
      id: `music-${Date.now()}`,
      listens: 0,
      totalDonations: 0,
      status: songData.status || 'active',
      createdAt: new Date().toISOString().split('T')[0],
      commentsCount: 0,
      sharesCount: 0
    };
    StorageService.saveMusic(newSong);
    HostingerService.saveSingleMusic(newSong);
    const updatedList = StorageService.getMusic();
    setMusicList(updatedList);
    setArtists(StorageService.getArtists());
    setRecRefreshKey(prev => prev + 1);
    addToast('success', `Moso "${newSong.title}" pibliye avèk siksè sou UpMizik!`);
  };

  // Share Handler (Updates dynamic OpenGraph meta-tags, opens rich story share modal, & records metric)
  const handleShare = (music: MusicItem) => {
    updateDocumentMetaTags(music);
    setMusicToShare(music);
  };

  const handleShareCompleted = (musicId: string) => {
    const updatedCount = StorageService.incrementShareCount(musicId);
    setMusicList(StorageService.getMusic());
    const targetSong = musicList.find(m => m.id === musicId);
    if (targetSong) {
      HostingerService.saveSingleMusic(targetSong);
    }
    addToast('success', `🔗 Lyen "${targetSong?.title || 'mizik la'}" kopye! Mèsi pou pataj la (${updatedCount} pataj).`);
  };

  // Admin & Artist Actions
  const handleSaveMusicItem = (song: MusicItem) => {
    StorageService.saveMusic(song);
    HostingerService.saveSingleMusic(song);
    const updatedList = StorageService.getMusic();
    setMusicList(updatedList);
    setArtists(StorageService.getArtists());
    setRecRefreshKey(prev => prev + 1);

    // If the edited song is currently loaded in the player, update its data live
    if (currentTrack && currentTrack.id === song.id) {
      setCurrentTrack(song);
      if (currentTrack.audioUrl !== song.audioUrl && isPlaying) {
        globalSoundEngine.loadTrack(song.id, song.audioUrl, song.title, song.category, song.duration);
        globalSoundEngine.play();
      }
    }
    addToast('success', `Moso mizik "${song.title}" anrejistre avèk siksè!`);
  };

  const handleDeleteMusicItem = (musicId: string) => {
    if (currentTrack && currentTrack.id === musicId) {
      globalSoundEngine.stop();
      setIsPlaying(false);
      setCurrentTrack(null);
    }
    StorageService.deleteMusic(musicId);
    HostingerService.deleteMusic(musicId);
    setMusicList(StorageService.getMusic());
    setArtists(StorageService.getArtists());
    setRecRefreshKey(prev => prev + 1);
    addToast('info', 'Moso mizik la efase.');
  };

  const handleDeleteSocialPost = (postId: string) => {
    const actorName = currentAdmin?.name || currentArtist?.stageName || 'Administratè';
    StorageService.deleteSocialPost(postId, actorName);
    HostingerService.deleteSinglePost(postId).catch(() => {});
    setSocialPosts(prev => prev.filter(p => p.id !== postId));
    addToast('success', 'Pòs atis la siprime avèk siksè!');
  };

  const handleSaveTop3Override = (override: { enabled: boolean; topIds: string[] }) => {
    StorageService.saveTop3Override(override);
    setTop3Override(override);
    addToast('success', 'Konfigirasyon Top 3 anrejistre!');
  };

  const handleValidateDonation = (donationId: string, accept: boolean) => {
    const adminName = currentAdmin?.name || 'Mr Clauvens';
    const result = StorageService.validateDonation(donationId, accept, adminName);
    if (result.donation) {
      HostingerService.saveSingleDonation(result.donation);
    }
    if (result.generatedEmail) {
      HostingerService.saveInboxMessage(result.generatedEmail);
    }
    setDonations(StorageService.getDonations(currentAdmin));
    setMusicList(StorageService.getMusic());
    setArtists(StorageService.getArtists());
    
    if (accept && result.generatedEmail) {
      addToast(
        'success',
        `💰 Sipò valide! Alèt imèl voye otomatikman nan bwat lèt ${result.generatedEmail.artistName} (upmizik.com).`
      );
    } else {
      addToast(accept ? 'success' : 'info', accept ? 'Sipò valide! 85% ajoute pou atis la.' : 'Sipò refize.');
    }
  };

  const handleValidateArtist = (artistId: string, accept: boolean, reason?: string) => {
    const adminName = currentAdmin?.name || 'Mr Clauvens';
    const result = StorageService.validateArtist(artistId, accept, adminName, reason);
    if (result.artist) {
      HostingerService.saveSingleArtist(result.artist);
    }
    if (result.generatedEmail) {
      HostingerService.saveInboxMessage(result.generatedEmail);
    }

    const newStatus = accept ? ('active' as const) : ('rejected' as const);
    
    // Explicitly update React artists state immediately
    setArtists((prevArtists) => {
      const exists = prevArtists.some(a => a.id === artistId);
      if (exists) {
        return prevArtists.map(a => {
          if (a.id === artistId) {
            return {
              ...a,
              ...(result.artist || {}),
              status: newStatus,
              registrationRejectionReason: !accept ? (reason || 'Foto prèv transfè a pa klè oswa referans lan pa koresponn. Tanpri telechaje yon nouvo prèv.') : undefined
            };
          }
          return a;
        });
      } else if (result.artist) {
        return [...prevArtists, result.artist];
      }
      return StorageService.getArtists();
    });

    if (currentArtist && currentArtist.id === artistId && result.artist) {
      setCurrentArtist(result.artist);
    }

    // Broadcast update across the whole app
    window.dispatchEvent(
      new CustomEvent('upmizik_artist_updated', {
        detail: {
          action: accept ? 'validate' : 'reject',
          artistId,
          status: newStatus,
          artist: result.artist
        }
      })
    );

    if (result.artist && result.generatedEmail) {
      if (accept) {
        addToast(
          'success',
          `✅ Kont Atis "${result.artist.stageName}" valide! Imèl konfimasyon voye sou ${result.artist.email}.`
        );
      } else {
        addToast(
          'info',
          `⚠️ Enskripsyon "${result.artist.stageName}" refize. Imèl notifikasyon voye sou ${result.artist.email}.`
        );
      }
    } else {
      addToast(accept ? 'success' : 'info', accept ? 'Kont Atis verifye & valide!' : 'Enskripsyon atis refize.');
    }
  };

  const handlePurgeAllPendingValidations = async () => {
    const purgedArtists = StorageService.purgeAllPendingArtists();
    const purgedDonations = StorageService.purgeAllPendingDonations();
    try {
      await Promise.all([
        HostingerService.purgePendingArtists(),
        HostingerService.purgePendingDonations()
      ]);
    } catch {}
    setArtists(StorageService.getArtists());
    setDonations(StorageService.getDonations(currentAdmin));
    addToast(
      'success',
      `Tout demand ki te an atant yo vide nèt! (${purgedArtists} atis, ${purgedDonations} don retire)`
    );
  };

  const handleSuspendArtist = (artistId: string, days: number, reason?: string) => {
    const adminName = currentAdmin?.name || 'Mr Clauvens';
    const result = StorageService.suspendArtist(artistId, days, reason, adminName);
    if (result.artist) {
      HostingerService.saveSingleArtist(result.artist);
    }
    if (result.generatedEmail) {
      HostingerService.saveInboxMessage(result.generatedEmail);
    }
    const updatedArtists = StorageService.getArtists();
    setArtists(updatedArtists);

    if (currentArtist && currentArtist.id === artistId) {
      const refreshed = updatedArtists.find((a) => a.id === artistId);
      if (refreshed) {
        setCurrentArtist(refreshed);
        StorageService.setLoggedInArtist(refreshed);
      }
    }

    if (result.artist) {
      addToast(
        'info',
        `⚠️ Atis "${result.artist.stageName}" mete an sispansyon pou ${days} jou. Imèl avètisman voye sou ${result.artist.email}.`
      );
    }
  };

  const handleReactivateArtist = (artistId: string) => {
    const adminName = currentAdmin?.name || 'Mr Clauvens';
    const result = StorageService.reactivateArtist(artistId, adminName);
    if (result.artist) {
      HostingerService.saveSingleArtist(result.artist);
    }
    if (result.generatedEmail) {
      HostingerService.saveInboxMessage(result.generatedEmail);
    }
    const updatedArtists = StorageService.getArtists();
    setArtists(updatedArtists);

    if (currentArtist && currentArtist.id === artistId) {
      const refreshed = updatedArtists.find((a) => a.id === artistId);
      if (refreshed) {
        setCurrentArtist(refreshed);
        StorageService.setLoggedInArtist(refreshed);
      }
    }

    if (result.artist) {
      addToast(
        'success',
        `✅ Sispansyon "${result.artist.stageName}" leve avèk siksè! Kont lan re-aktif kounye a.`
      );
    }
  };

  const handleDeleteArtist = (artistId: string, deleteSongs?: boolean) => {
    const target = artists.find((a) => a.id === artistId);
    StorageService.deleteArtist(artistId, deleteSongs);
    HostingerService.deleteArtist(artistId);
    setArtists(StorageService.getArtists());
    if (deleteSongs) {
      setMusicList(StorageService.getMusic());
    }

    if (currentArtist && currentArtist.id === artistId) {
      setCurrentArtist(null);
      StorageService.setLoggedInArtist(null);
      setCurrentView('public');
    }

    addToast('info', `Kont atis "${target?.stageName || ''}" siprime nèt sou platfòm nan.`);
  };

  const handleToggleArtistPaymentStatus = (
    artistId: string,
    isPaid: boolean,
    details?: {
      paidAmount?: number;
      reference?: string;
      paymentMethod?: string;
      notes?: string;
      sendNotification?: boolean;
    }
  ) => {
    const adminName = currentAdmin?.name || 'Mr Clauvens';
    const res = StorageService.markArtistPaidStatus(artistId, isPaid, {
      ...details,
      adminName
    });
    if (res.artist) {
      HostingerService.saveSingleArtist(res.artist);
    }
    if (res.generatedEmail) {
      HostingerService.saveInboxMessage(res.generatedEmail);
    }
    const updatedArtists = StorageService.getArtists();
    setArtists(updatedArtists);

    if (currentArtist && currentArtist.id === artistId) {
      const refreshed = updatedArtists.find((a) => a.id === artistId);
      if (refreshed) {
        setCurrentArtist(refreshed);
        StorageService.setLoggedInArtist(refreshed);
      }
    }

    if (isPaid) {
      addToast(
        'success',
        `💰 Peman pou "${res.artist?.stageName}" make kòm PEYE (✅). Notifikasyon otomatik voye nan bwat mesaj li!`
      );
    } else {
      addToast('info', `Estati peman pou "${res.artist?.stageName}" retounen sou "Poko Peye".`);
    }
  };

  const handleSavePubs = (newPubs: PubItem[]) => {
    StorageService.savePubs(newPubs);
    setPubs(newPubs);
    addToast('success', 'Piblisite yo mete ajou!');
  };

  const handleSaveRpa = (newRpa: RpaItem[]) => {
    StorageService.saveRpa(newRpa);
    setRpaList(newRpa);
    addToast('success', 'Ribrik Pouse Atis (RPA) mete ajou!');
  };

  const handleResetMonthlyDonations = (periodName?: string) => {
    StorageService.resetAndArchiveMonthlyDonations(periodName);
    setMusicList(StorageService.getMusic());
    setDonations(StorageService.getDonations(currentAdmin));
    setArchives(StorageService.getArchives(currentAdmin));
    addToast('success', 'Tout sipò yo fin achive e reset a $0.00 pou nouvo mwa a!');
  };

  // Support Submission
  const handleConfirmSupport = (newDonation: DonationItem) => {
    const saved = StorageService.addDonation(newDonation);
    HostingerService.saveSingleDonation(saved);
    const activeAdmin = currentAdmin || StorageService.getLoggedInAdmin();
    if (activeAdmin && activeAdmin.role === 'super_admin') {
      setDonations(StorageService.getDonations(activeAdmin));
    }
    addToast(
      'success',
      `🎉 Mèsi ${newDonation.donorName}! Prèv sipò w la pou ${newDonation.artistName} voye bay Admin pou validasyon!`
    );
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      themeMode === 'light' 
        ? 'bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white' 
        : 'bg-slate-950 text-slate-100 selection:bg-red-500 selection:text-white'
    }`}>
      
      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />

      {/* Main Top Header */}
      <Header
        currentView={currentView}
        currentArtist={currentArtist}
        currentAdmin={currentAdmin}
        setCurrentView={setCurrentView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        musicList={musicList}
        artists={artists}
        currentPlayingId={currentTrack?.id || null}
        isPlaying={isPlaying}
        onPlayToggle={handlePlayToggle}
        onOpenSupport={(m) => setMusicToSupport(m)}
        onOpenArtistProfile={handleOpenArtistProfile}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat as MusicCategory);
          setCurrentView('public');
        }}
        onOpenArtistAuth={() => setShowArtistAuth(true)}
        onOpenAdminAuth={() => setShowAdminAuth(true)}
        onLogoutArtist={handleLogoutArtist}
        onLogoutAdmin={handleLogoutAdmin}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        onOpenOfflineModal={() => handleOpenOfflineModal('playlists')}
        offlineTracksCount={cachedTrackIds.length}
      />

      {/* Offline & Intermittent Connectivity Banner */}
      <OfflineBanner
        cachedSongsCount={cachedTrackIds.length}
        onFilterOfflineTracks={() => {
          setCurrentView('public');
          setSelectedCategory('Oflayn');
        }}
        onOpenOfflineModal={() => handleOpenOfflineModal('playlists')}
      />

      {/* Main Body View Switching */}
      <main className="flex-1 w-full pb-36 md:pb-24">
        {currentView === 'public' && (
          <div className="space-y-10 sm:space-y-14 animate-fadeIn">
            {/* Hero Search & Stats Banner */}
            <HeroBanner
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              musicList={musicList}
              artists={artists}
              currentPlayingId={currentTrack?.id || null}
              isPlaying={isPlaying}
              onPlayToggle={handlePlayToggle}
              onOpenSupport={(m) => setMusicToSupport(m)}
              onOpenArtistProfile={handleOpenArtistProfile}
              onSelectCategory={handleSelectCategory}
              onOpenArtistAuth={() => setShowArtistAuth(true)}
              totalArtists={artists.length}
              totalSongs={musicList.length}
            />

            {/* Top Trending 3 Haitian Songs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TopTrending
                topMusic={top3Songs}
                currentPlayingId={currentTrack?.id || null}
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
                onOpenSupport={(m) => setMusicToSupport(m)}
                onOpenArtistProfile={handleOpenArtistProfile}
                onShare={handleShare}
                onOpenArtistAuth={() => setShowArtistAuth(true)}
              />
            </div>

            {/* WhatsApp-Style Artist Story & Profile Circles (Top 5 Listened / Algorithmic Recommendations) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ArtistStoryBar
                artists={artists}
                musicList={musicList}
                onOpenArtistProfile={handleOpenArtistProfile}
              />
            </div>

            {/* Top 10 Artist Leaderboard (Klasman Atis Pa Donasyon) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ArtistLeaderboard
                artists={artists}
                musicList={musicList}
                currentPlayingId={currentTrack?.id || null}
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
                onOpenSupport={(m) => setMusicToSupport(m)}
                onOpenArtistProfile={handleOpenArtistProfile}
                onOpenArtistAuth={() => setShowArtistAuth(true)}
              />
            </div>

            {/* RPA Section (Ribrik Pouse Atis) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <RpaSection rpaList={rpaList} />
            </div>

            {/* 'Atis Pou Ou' (Recommended for You) Smart Heuristic Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <RecommendedSection
                key={`rec-sec-${recRefreshKey}`}
                musicList={musicList}
                currentPlayingId={currentTrack?.id || null}
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
                onOpenSupport={(m) => setMusicToSupport(m)}
                onOpenComment={(m) => setMusicForComment(m)}
                onOpenArtistProfile={handleOpenArtistProfile}
                onShare={handleShare}
                onHistoryReset={() => {
                  setRecRefreshKey(prev => prev + 1);
                  addToast('info', 'Rekòmandasyon yo re-inisyalize!');
                }}
              />
            </div>

            {/* Category Filter Chips */}
            <div id="music-feed-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
              <CategoryFilter
                selectedCategory={selectedCategory as MusicCategory}
                onSelectCategory={handleSelectCategory}
                offlineCount={cachedTrackIds.length}
                onOpenOfflineModal={() => handleOpenOfflineModal('playlists')}
              />
            </div>

            {/* Main Music Feed (Fluid CSS Grid / Carousel on Mobile) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <MusicGrid
                musicList={filteredMusic}
                currentPlayingId={currentTrack?.id || null}
                isPlaying={isPlaying}
                playbackProgress={playbackProgress}
                playbackSeconds={playbackSeconds}
                hasListened5s={hasListened5s}
                cachedTrackIds={cachedTrackIds}
                onPlayToggle={handlePlayToggle}
                onOpenSupport={(m) => setMusicToSupport(m)}
                onOpenComment={(m) => setMusicForComment(m)}
                onOpenArtistProfile={handleOpenArtistProfile}
                onShare={handleShare}
                onDownloadOffline={handleDownloadOffline}
                onAddToOfflineQueue={handleAddToOfflineQueue}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
              />
            </div>

            {/* UpMizik Social Feed (Live X/Twitter & Instagram posts from registered Haitian artists) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <UpMizikSocial
                posts={socialPosts}
                artists={artists}
                musicList={musicList}
                currentArtist={currentArtist}
                currentPlayingId={currentTrack?.id || null}
                isPlaying={isPlaying}
                isAdmin={Boolean(currentAdmin)}
                onPlayToggle={handlePlayToggle}
                onOpenSupport={(m) => setMusicToSupport(m)}
                onOpenArtistProfile={handleOpenArtistProfile}
                onShare={handleShare}
                onDeletePost={handleDeleteSocialPost}
                onNewPostAdded={(newPost) => {
                  setSocialPosts(StorageService.getSocialPosts());
                  addToast('success', 'UpMizik Social mete ajou avèk siksè!');
                }}
              />
            </div>

            {/* Partner Advertising (3 Pubs) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <PubsBanner pubs={pubs} />
            </div>
          </div>
        )}

        {/* DEDICATED SOCIAL FEED VIEW */}
        {currentView === 'social' && (
          <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fadeIn">
            <UpMizikSocial
              posts={socialPosts}
              artists={artists}
              musicList={musicList}
              currentArtist={currentArtist}
              currentPlayingId={currentTrack?.id || null}
              isPlaying={isPlaying}
              isAdmin={Boolean(currentAdmin)}
              onPlayToggle={handlePlayToggle}
              onOpenSupport={(m) => setMusicToSupport(m)}
              onOpenArtistProfile={handleOpenArtistProfile}
              onShare={handleShare}
              onDeletePost={handleDeleteSocialPost}
              onNewPostAdded={(newPost) => {
                setSocialPosts(prev => [newPost, ...prev]);
                addToast('success', 'Nouvo pòs ou an pibliye avèk siksè sou UpMizik Social!');
              }}
            />
          </div>
        )}

        {/* ARTIST DASHBOARD VIEW */}
        {currentView === 'artist_dashboard' && currentArtist && currentArtist.status === 'active' && (
          <ArtistDashboard
            currentArtist={currentArtist}
            artistSongs={currentArtistSongs}
            rpaList={rpaList}
            donations={donations}
            exchangeRate={DEFAULT_HTG_EXCHANGE_RATE}
            currentPlayingId={currentTrack?.id || null}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            onAddNewSong={handleAddNewSong}
            onEditSong={handleSaveMusicItem}
            onDeleteSong={handleDeleteMusicItem}
            onLogout={handleLogoutArtist}
            onOpenSocial={() => setCurrentView('social')}
            onArtistUpdated={(updated) => {
              setCurrentArtist(updated);
              setArtists(StorageService.getArtists());
            }}
          />
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {currentView === 'admin_dashboard' && currentAdmin && currentAdmin.role === 'super_admin' && (
          <AdminDashboard
            currentAdmin={currentAdmin}
            musicList={musicList}
            artists={artists}
            donations={donations}
            pubs={pubs}
            rpaList={rpaList}
            archives={archives}
            socialPosts={socialPosts}
            top3Override={top3Override}
            onSaveTop3Override={handleSaveTop3Override}
            onValidateDonation={handleValidateDonation}
            onValidateArtist={handleValidateArtist}
            onPurgePendingValidations={handlePurgeAllPendingValidations}
            onSuspendArtist={handleSuspendArtist}
            onReactivateArtist={handleReactivateArtist}
            onDeleteArtist={handleDeleteArtist}
            onDeleteSocialPost={handleDeleteSocialPost}
            onToggleArtistPaymentStatus={handleToggleArtistPaymentStatus}
            onSaveMusicItem={handleSaveMusicItem}
            onDeleteMusicItem={handleDeleteMusicItem}
            onSavePubs={handleSavePubs}
            onSaveRpa={handleSaveRpa}
            onResetMonthlyDonations={handleResetMonthlyDonations}
            onLogoutAdmin={handleLogoutAdmin}
          />
        )}
      </main>

      {/* Floating Bottom Audio Player */}
      <GlobalAudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        playbackProgress={playbackProgress}
        playbackSeconds={playbackSeconds}
        hasListened5s={hasListened5s}
        isCachedOffline={currentTrack ? cachedTrackIds.includes(currentTrack.id) : false}
        volume={playerVolume}
        isMuted={playerMuted}
        onPlayToggle={() => currentTrack && handlePlayToggle(currentTrack)}
        onClosePlayer={handleClosePlayer}
        onOpenSupport={(m) => setMusicToSupport(m)}
        onOpenArtistProfile={handleOpenArtistProfile}
        onSeek={handleSeek}
        onSkip={handleSkip}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onDownloadOffline={handleDownloadOffline}
      />

      {/* Persistent Mobile Bottom Navigation Dock */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentArtist={currentArtist}
        currentAdmin={currentAdmin}
        onOpenArtistAuth={() => setShowArtistAuth(true)}
        onOpenAdminAuth={() => setShowAdminAuth(true)}
        onOpenOfflineModal={() => handleOpenOfflineModal('playlists')}
        offlineTracksCount={cachedTrackIds.length}
        hasActivePlayer={Boolean(currentTrack)}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        pendingArtistsCount={artists.filter((a) => a && a.status === 'pending').length}
      />

      {/* Footer */}
      <Footer
        setCurrentView={setCurrentView}
        onOpenArtistAuth={() => setShowArtistAuth(true)}
        onOpenAdminAuth={() => setShowAdminAuth(true)}
      />

      {/* MODAL 2: COMMENTS & MODERATION MODAL */}
      <CommentModal
        music={musicForComment}
        currentAdmin={currentAdmin}
        isAdmin={Boolean(currentAdmin)}
        onClose={() => {
          setMusicForComment(null);
          clearDeepLinkUrlParams();
        }}
        onUpdateCommentCount={(musicId, count) => {
          setMusicList((prev) =>
            prev.map((m) => (m.id === musicId ? { ...m, commentsCount: count } : m))
          );
        }}
      />

      {/* MODAL 3: ARTIST PUBLIC PROFILE */}
      <ArtistProfileModal
        artist={selectedArtistForProfile}
        artistSongs={
          selectedArtistForProfile
            ? musicList.filter(
                (m) =>
                  m.artistId === selectedArtistForProfile.id ||
                  m.collab?.artistId === selectedArtistForProfile.id ||
                  (m.artistName && selectedArtistForProfile.stageName && m.artistName.trim().toLowerCase() === selectedArtistForProfile.stageName.trim().toLowerCase()) ||
                  (m.collab?.artistName && selectedArtistForProfile.stageName && m.collab.artistName.trim().toLowerCase() === selectedArtistForProfile.stageName.trim().toLowerCase())
              )
            : []
        }
        currentPlayingId={currentTrack?.id || null}
        isPlaying={isPlaying}
        onClose={() => {
          setSelectedArtistForProfile(null);
          clearDeepLinkUrlParams();
        }}
        onPlayToggle={handlePlayToggle}
        onOpenSupport={(m) => setMusicToSupport(m)}
        onOpenArtistProfile={handleOpenArtistProfile}
      />

      {/* MODAL 1: DONATION / SUPPORT MODAL */}
      <SupportModal
        music={musicToSupport}
        onClose={() => {
          setMusicToSupport(null);
          clearDeepLinkUrlParams();
        }}
        onConfirmSupport={handleConfirmSupport}
        onSubmitDonation={(data) => {
          const newDonation: DonationItem = {
            id: `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            musicId: data.musicId,
            musicTitle: data.musicTitle,
            artistId: data.artistId,
            artistName: data.artistName,
            amount: data.amount,
            currency: data.currency,
            donorName: data.donorName,
            donorPhone: data.donorPhone,
            proofUrl: data.proofUrl,
            status: 'pending',
            createdAt: new Date().toISOString(),
            artistShare: parseFloat((data.amount * 0.85).toFixed(2)),
            platformShare: parseFloat((data.amount * 0.15).toFixed(2))
          };
          handleConfirmSupport(newDonation);
        }}
      />

      {/* MODAL 4: ARTIST SIGNUP / LOGIN MODAL */}
      {showArtistAuth && (
        <ArtistAuthModal
          onClose={() => {
            setShowArtistAuth(false);
            clearDeepLinkUrlParams();
          }}
          onLoginSuccess={handleArtistLoginSuccess}
          onRegisterArtist={handleArtistRegister}
          existingArtists={artists}
        />
      )}

      {/* MODAL 5: ADMIN AUTH MODAL */}
      {showAdminAuth && (
        <AdminAuthModal
          onClose={() => {
            setShowAdminAuth(false);
            clearDeepLinkUrlParams();
          }}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      )}

      {/* MODAL 6: DEEP LINK & SOCIAL STORY SHARING MODAL */}
      {musicToShare && (
        <ShareModal
          music={musicToShare}
          onClose={() => {
            setMusicToShare(null);
            clearDeepLinkUrlParams();
          }}
          onShareCompleted={handleShareCompleted}
        />
      )}

      {/* MODAL 7: OFFLINE PLAYLISTS & BATCH DOWNLOAD QUEUE */}
      <OfflinePlaylistModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        musicList={musicList}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayToggle={handlePlayToggle}
        onPlayPlaylist={handlePlayPlaylist}
        onToast={addToast}
        initialTab={offlineModalInitialTab}
      />

    </div>
  );
}
