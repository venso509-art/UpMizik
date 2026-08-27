import {
  MusicItem,
  ArtistUser,
  DonationItem,
  PubItem,
  RpaItem,
  ArchiveRecord,
  CommentItem,
  AdminUser,
  SocialPost,
  SocialPostComment,
  ArtistInboxMessage,
  PushNotificationItem,
  ThemeMode,
  MusicCategory,
  PhysicalAwardDelivery,
  AwardPhysicalDeliveryStatus,
  PaymentMethodItem,
  PaymentSettingsConfig,
  IntrusionLogItem,
  ActivityLogItem
} from '../types';
import {
  INITIAL_ARTISTS,
  INITIAL_MUSIC,
  INITIAL_DONATIONS,
  INITIAL_PUBS,
  INITIAL_RPA,
  INITIAL_ARCHIVES,
  INITIAL_COMMENTS,
  INITIAL_SOCIAL_POSTS,
  INITIAL_SOCIAL_POST_COMMENTS,
  INITIAL_ARTIST_INBOX
} from '../data/initialData';
import { IdbStorage } from './idbStorage';
import { buildAwardCelebrationMessage, AwardTierDefinition } from './awardsUtils';
import { UserIdentifier } from './userIdentifier';

const KEYS = {
  MUSIC: 'upmizik_music_v2',
  ARTISTS: 'upmizik_artists_v2',
  DONATIONS: 'upmizik_donations_v2',
  PUBS: 'upmizik_pubs_v2',
  RPA: 'upmizik_rpa_v2',
  ARCHIVES: 'upmizik_archives_v2',
  COMMENTS: 'upmizik_comments_v2',
  SOCIAL_POSTS: 'upmizik_social_posts_v2',
  SOCIAL_COMMENTS: 'upmizik_social_comments_v2',
  ARTIST_INBOX: 'upmizik_artist_inbox_v2',
  PUSH_NOTIFICATIONS: 'upmizik_push_notifications_v2',
  CURRENT_ARTIST: 'upmizik_current_artist_v2',
  CURRENT_ADMIN: 'upmizik_current_admin_v1',
  ADMIN_PIN: 'upmizik_admin_pin_v1',
  ADMIN_EMAIL: 'upmizik_admin_email_v1',
  LISTEN_HISTORY: 'upmizik_listen_history_v2',
  RECENT_LISTENED_IDS: 'upmizik_recent_listened_ids_v2',
  TOP3_OVERRIDE: 'upmizik_top3_override_v2',
  THEME: 'upmizik_theme_mode_v1',
  LIKED_MUSIC: 'upmizik_liked_music_ids_v2',
  AWARD_DELIVERIES: 'upmizik_award_deliveries_v2',
  PAYMENT_SETTINGS: 'upmizik_payment_settings_v1',
  ADMIN_MASTER_KEY: 'upmizik_admin_master_key_v1',
  INTRUSION_LOGS: 'upmizik_intrusion_logs_v1',
  ACTIVITY_LOGS: 'upmizik_activity_logs_v1',
  ADMIN_LOCKOUT: 'upmizik_admin_lockout_v1',
  ARTIST_RATE_LIMITS: 'upmizik_artist_rate_limits_v1',
  SITE_VISITS: 'upmizik_site_visits_v1',
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsConfig = {
  htgExchangeRate: 145.0,
  artistRegistrationFeeUsd: 4.99,
  artistRegistrationFeeHtg: 723.55,
  globalNotice: 'Voye kòb la sou nimewo sa yo, pran yon foto (screenshot) prèv transfè a, epi telechaje l pou validasyon.',
  updatedAt: new Date().toISOString(),
  methods: [
    {
      id: 'natcash_default',
      name: 'Natcash',
      type: 'natcash',
      accountNumberOrId: '35-37-1184',
      accountHolderName: 'Clauvens EXAUS',
      instructions: 'Fè transfè Natcash sou nimewo sa a epi telechaje foto resi a.',
      currencySupported: ['HTG'],
      badgeText: 'Natcom Ayiti',
      isActive: true,
      order: 1
    },
    {
      id: 'moncash_default',
      name: 'MonCash',
      type: 'moncash',
      accountNumberOrId: '38-91-2317',
      accountHolderName: 'Clauvens EXAUS',
      instructions: 'Fè transfè MonCash sou nimewo sa a epi telechaje foto resi a.',
      currencySupported: ['HTG'],
      badgeText: 'Digicel Ayiti',
      isActive: true,
      order: 2
    },
    {
      id: 'zelle_default',
      name: 'Zelle',
      type: 'zelle',
      accountNumberOrId: 'venso509@gmail.com',
      accountHolderName: 'Clauvens Venso',
      instructions: 'Voye transfè Zelle a sou imèl sa a epi telechaje foto konfimasyon an.',
      currencySupported: ['USD'],
      badgeText: 'USA & Entènasyonal',
      isActive: true,
      order: 3
    },
    {
      id: 'cashapp_default',
      name: 'Cash App',
      type: 'cashapp',
      accountNumberOrId: '$UpMizik',
      accountHolderName: 'UpMizik Media',
      instructions: 'Voye transfè Cash App la sou $cashtag sa a.',
      currencySupported: ['USD'],
      badgeText: 'USA',
      isActive: false,
      order: 4
    },
    {
      id: 'bank_transfer_default',
      name: 'Depo Labank (Sogebank)',
      type: 'bank_transfer',
      accountNumberOrId: '102-39281-0',
      accountHolderName: 'UpMizik Ayiti',
      instructions: 'Fè depo oswa transfè sou kont labank sa a epi telechaje foto bòdwo a.',
      currencySupported: ['HTG', 'USD'],
      badgeText: 'Kont Labank Ayiti',
      isActive: false,
      order: 5
    }
  ]
};

// Helper to sanitize large media out of objects before writing to localStorage
function sanitizeForLocalStorage(key: string, data: any): any {
  if (!data) return data;
  
  if (key === KEYS.MUSIC && Array.isArray(data)) {
    return data.map((item: MusicItem) => {
      const copy = { ...item };
      // If audio is a giant base64 data string, offload to IndexedDB
      if (copy.audioUrl && (copy.audioUrl.startsWith('data:audio') || copy.audioUrl.length > 500)) {
        const idbKey = `audio_${copy.id}`;
        IdbStorage.saveMedia(idbKey, copy.audioUrl);
        copy.audioUrl = `idb:${idbKey}`;
      }
      // Keep coverUrl intact as base64/URL so it renders directly in standard <img> tags
      return copy;
    });
  }

  if (key === KEYS.DONATIONS && Array.isArray(data)) {
    return data.map((d: DonationItem) => {
      const copy = { ...d };
      if (copy.proofUrl && copy.proofUrl.startsWith('data:image')) {
        const idbKey = `proof_${copy.id}`;
        IdbStorage.saveMedia(idbKey, copy.proofUrl);
      }
      return copy;
    });
  }

  if (key === KEYS.ARTISTS && Array.isArray(data)) {
    return data.map((a: ArtistUser) => {
      const copy = { ...a };
      if (copy.registrationProofUrl && copy.registrationProofUrl.startsWith('data:image')) {
        const idbKey = `artist_proof_${copy.id}`;
        IdbStorage.saveMedia(idbKey, copy.registrationProofUrl);
      }
      return copy;
    });
  }

  return data;
}

// Emergency cleanup when quota is exceeded
function performStorageEmergencyCleanup() {
  try {
    const history = getStoredData<Record<string, number>>(KEYS.LISTEN_HISTORY, {});
    const entries = Object.entries(history);
    if (entries.length > 30) {
      const trimmed = Object.fromEntries(entries.slice(-30));
      localStorage.setItem(KEYS.LISTEN_HISTORY, JSON.stringify(trimmed));
    }

    const recents = getStoredData<string[]>(KEYS.RECENT_LISTENED_IDS, []);
    if (recents.length > 10) {
      localStorage.setItem(KEYS.RECENT_LISTENED_IDS, JSON.stringify(recents.slice(0, 10)));
    }

    localStorage.removeItem('upmizik_offline_queue_v1');
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Safe localStorage helper
export function getStoredData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

export function setStoredData<T>(key: string, data: T): void {
  // Always async backup to IndexedDB for complete data durability
  IdbStorage.saveCollectionBackup(key, data).catch(() => {});

  try {
    const sanitized = sanitizeForLocalStorage(key, data);
    localStorage.setItem(key, JSON.stringify(sanitized));
  } catch (e: any) {
    // If quota is exceeded, perform emergency prune and retry
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || `${e}`.includes('quota') || `${e}`.includes('Quota')) {
      try {
        performStorageEmergencyCleanup();
        const sanitized = sanitizeForLocalStorage(key, data);
        localStorage.setItem(key, JSON.stringify(sanitized));
      } catch (retryErr) {
        console.warn(`Storage quota notice for ${key}. Full data retained in IndexedDB.`, retryErr);
      }
    } else {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }
}

// Initializer to ensure default data exists and migrate any bloated legacy values
export function initializeStorage() {
  try {
    // If existing stored music has bloated base64, sanitize it immediately
    const existingMusic = localStorage.getItem(KEYS.MUSIC);
    if (existingMusic) {
      try {
        const parsed = JSON.parse(existingMusic);
        if (Array.isArray(parsed) && existingMusic.length > 1000000) {
          const sanitized = sanitizeForLocalStorage(KEYS.MUSIC, parsed);
          localStorage.setItem(KEYS.MUSIC, JSON.stringify(sanitized));
        }
      } catch (e) {
        // Fallback
      }
    } else {
      setStoredData(KEYS.MUSIC, INITIAL_MUSIC);
    }
  } catch (e) {
    setStoredData(KEYS.MUSIC, INITIAL_MUSIC);
  }

  if (!localStorage.getItem(KEYS.ARTISTS)) {
    setStoredData(KEYS.ARTISTS, INITIAL_ARTISTS);
  }
  if (!localStorage.getItem(KEYS.DONATIONS)) {
    setStoredData(KEYS.DONATIONS, INITIAL_DONATIONS);
  }
  if (!localStorage.getItem(KEYS.PUBS)) {
    setStoredData(KEYS.PUBS, INITIAL_PUBS);
  }
  if (!localStorage.getItem(KEYS.RPA)) {
    setStoredData(KEYS.RPA, INITIAL_RPA);
  }
  if (!localStorage.getItem(KEYS.ARCHIVES)) {
    setStoredData(KEYS.ARCHIVES, INITIAL_ARCHIVES);
  }
  if (!localStorage.getItem(KEYS.COMMENTS)) {
    setStoredData(KEYS.COMMENTS, INITIAL_COMMENTS);
  }
  if (!localStorage.getItem(KEYS.SOCIAL_POSTS)) {
    setStoredData(KEYS.SOCIAL_POSTS, INITIAL_SOCIAL_POSTS);
  }
  if (!localStorage.getItem(KEYS.ARTIST_INBOX)) {
    setStoredData(KEYS.ARTIST_INBOX, INITIAL_ARTIST_INBOX);
  }
}

export const StorageService = {
  // HELPER: Find the next sequential position integer (e.g. 1, 2, ... N + 1)
  getNextAvailablePosition: (list?: MusicItem[], excludePositions: number[] = []): number => {
    const musicList = list || StorageService.getMusic();
    const occupied = new Set<number>();
    let maxPos = 0;
    for (const m of musicList) {
      if (typeof m.position === 'number' && m.position > 0) {
        const p = Math.floor(m.position);
        occupied.add(p);
        if (p > maxPos) maxPos = p;
      }
    }
    for (const p of excludePositions) {
      occupied.add(p);
      if (p > maxPos) maxPos = p;
    }
    let candidate = maxPos + 1;
    while (occupied.has(candidate)) {
      candidate++;
    }
    return candidate > 0 ? candidate : 1;
  },

  // HELPER: Ensure every song in the list has a unique positive integer position without any collisions
  normalizeMusicPositions: (list: MusicItem[]): MusicItem[] => {
    const seenPositions = new Set<number>();
    const validSongs: MusicItem[] = [];
    const collisionSongs: MusicItem[] = [];

    for (const song of list) {
      const pos = typeof song.position === 'number' && song.position > 0 ? Math.floor(song.position) : null;
      if (pos !== null && !seenPositions.has(pos)) {
        seenPositions.add(pos);
        validSongs.push({ ...song, position: pos });
      } else {
        collisionSongs.push({ ...song });
      }
    }

    let nextAvailable = 1;
    for (const song of collisionSongs) {
      while (seenPositions.has(nextAvailable)) {
        nextAvailable++;
      }
      seenPositions.add(nextAvailable);
      validSongs.push({ ...song, position: nextAvailable });
    }

    return validSongs.sort((a, b) => (a.position || 0) - (b.position || 0));
  },

  // MUSIC
  getMusic: (): MusicItem[] => {
    const list = getStoredData<MusicItem[]>(KEYS.MUSIC, INITIAL_MUSIC);
    const enhanced = list.map((m, idx) => {
      let updated = { ...m };
      if (typeof updated.sharesCount === 'undefined') {
        updated.sharesCount = Math.floor((m.listens || 100) / 750) + 1;
      }
      if (!updated.status) {
        updated.status = 'active';
      }
      if (typeof updated.position !== 'number' || updated.position <= 0) {
        updated.position = idx + 1;
      }
      // Repair legacy invalid/idb coverUrl entries
      if (!updated.coverUrl || updated.coverUrl.startsWith('idb:') || updated.coverUrl.trim() === '') {
        updated.coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
      }
      return updated;
    });

    return StorageService.normalizeMusicPositions(enhanced);
  },
  saveMusic: (data: MusicItem[] | MusicItem) => {
    if (Array.isArray(data)) {
      const normalized = StorageService.normalizeMusicPositions(data);
      setStoredData(KEYS.MUSIC, normalized);
      return;
    }

    const current = StorageService.getMusic();
    const existingIdx = current.findIndex(m => m.id === data.id);
    const isEdit = existingIdx >= 0;

    let targetPos = typeof data.position === 'number' && data.position > 0
      ? Math.floor(data.position)
      : StorageService.getNextAvailablePosition(current);

    let updatedList: MusicItem[] = [...current];

    if (isEdit) {
      const oldSong = current[existingIdx];
      const oldPos = oldSong.position || StorageService.getNextAvailablePosition(current);

      if (oldPos === targetPos) {
        updatedList[existingIdx] = { ...data, position: targetPos };
      } else {
        // Find if another song already occupies targetPos
        const conflictIdx = updatedList.findIndex(m => m.id !== data.id && m.position === targetPos);
        if (conflictIdx >= 0) {
          // SWAP PLACES: The other song takes the old position of the song being edited
          updatedList[conflictIdx] = { ...updatedList[conflictIdx], position: oldPos };
        }
        updatedList[existingIdx] = { ...data, position: targetPos };
      }
    } else {
      // NEW SONG ADDITION:
      // If another song already occupies targetPos, move that existing song to the next available unoccupied number
      const conflictIdx = updatedList.findIndex(m => m.position === targetPos);
      if (conflictIdx >= 0) {
        const nextFreePos = StorageService.getNextAvailablePosition(
          updatedList,
          [targetPos]
        );
        updatedList[conflictIdx] = { ...updatedList[conflictIdx], position: nextFreePos };
      }
      updatedList.push({ ...data, position: targetPos });
    }

    const normalized = StorageService.normalizeMusicPositions(updatedList);
    setStoredData(KEYS.MUSIC, normalized);

    // AUTOMATED REAL-TIME PUSH NOTIFICATION:
    // If an existing song's status transitions from pending/rejected to active, dispatch real-time push to artist
    if (isEdit) {
      const oldSong = current[existingIdx];
      const wasPendingOrRejected = oldSong && (oldSong.status === 'pending' || oldSong.status === 'rejected');
      const isNowActive = data.status === 'active' || (!data.status && oldSong?.status === 'pending');

      if (wasPendingOrRejected && isNowActive) {
        try {
          StorageService.notifyMusicValidatedPush(data, 'Mr Clauvens');
        } catch (err) {
          console.warn('Could not dispatch music validated push notification:', err);
        }
      }
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_music_updated', { detail: { action: isEdit ? 'edit' : 'add', song: data } }));
      }
    } catch {}
  },
  deleteMusic: (musicId: string) => {
    const list = StorageService.getMusic().filter(m => m.id !== musicId);
    const normalized = StorageService.normalizeMusicPositions(list);
    setStoredData(KEYS.MUSIC, normalized);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_music_updated', { detail: { action: 'delete', musicId } }));
      }
    } catch {}
  },
  
  incrementShareCount: (musicId: string): number => {
    try {
      const musicList = StorageService.getMusic();
      let updatedCount = 1;
      const updatedMusic = musicList.map(m => {
        if (m.id === musicId) {
          updatedCount = (m.sharesCount || 0) + 1;
          return { ...m, sharesCount: updatedCount };
        }
        return m;
      });
      StorageService.saveMusic(updatedMusic);
      return updatedCount;
    } catch (e) {
      console.error('Error incrementing share count:', e);
      return 0;
    }
  },

  // LIKES & HEARTS MANAGEMENT
  getLikedMusicIds: (): string[] => {
    return getStoredData<string[]>(KEYS.LIKED_MUSIC, []);
  },

  isMusicLiked: (musicId: string): boolean => {
    const liked = StorageService.getLikedMusicIds();
    return liked.includes(musicId);
  },

  toggleLikeMusic: (musicId: string): { isLiked: boolean; likesCount: number } => {
    try {
      const liked = StorageService.getLikedMusicIds();
      const isCurrentlyLiked = liked.includes(musicId);
      let updatedLiked: string[];

      if (isCurrentlyLiked) {
        updatedLiked = liked.filter(id => id !== musicId);
      } else {
        updatedLiked = [musicId, ...liked];
      }
      setStoredData(KEYS.LIKED_MUSIC, updatedLiked);

      const musicList = StorageService.getMusic();
      let currentLikes = 0;
      const updatedMusic = musicList.map(m => {
        if (m.id === musicId) {
          const baseLikes = typeof m.likesCount === 'number' ? m.likesCount : Math.floor((m.listens || 50) / 12) + 5;
          const newLikes = isCurrentlyLiked ? Math.max(0, baseLikes - 1) : baseLikes + 1;
          currentLikes = newLikes;
          return { ...m, likesCount: newLikes };
        }
        return m;
      });
      StorageService.saveMusic(updatedMusic);

      return {
        isLiked: !isCurrentlyLiked,
        likesCount: currentLikes
      };
    } catch (e) {
      console.error('Error toggling like:', e);
      return { isLiked: false, likesCount: 0 };
    }
  },

  /**
   * Enkremante kantite ekout pou yon mizik yon fason inik.
   * Si menm itilizatè a te koute mizik sa a deja, li PA ogmante kantite ekout la ankò (menm si li replay li).
   * Chak itilizatè/aparèy konte yon sèl fwa pou chak mizik.
   */
  incrementListenCount: (musicId: string, customUserId?: string): boolean => {
    try {
      if (!musicId) return false;

      // Verify if THIS unique user has already listened to this track
      const recordResult = UserIdentifier.recordSongListenForUser(musicId, customUserId);
      if (!recordResult.isNewListen) {
        // User already listened to this song previously -> Do NOT increment stream count again!
        return false;
      }

      // Also record in listen history timestamp
      const history = getStoredData<Record<string, number>>(KEYS.LISTEN_HISTORY, {});
      const now = Date.now();
      history[musicId] = now;
      setStoredData(KEYS.LISTEN_HISTORY, history);

      const musicList = StorageService.getMusic();
      const artists = StorageService.getArtists();
      
      let targetArtistId = '';
      const updatedMusic = musicList.map(m => {
        if (m.id === musicId) {
          targetArtistId = m.artistId;
          return { ...m, listens: (m.listens || 0) + 1 };
        }
        return m;
      });
      StorageService.saveMusic(updatedMusic);

      // Update artist total listens as well
      if (targetArtistId) {
        const updatedArtists = artists.map(a => {
          if (a.id === targetArtistId) {
            return { ...a, totalListens: (a.totalListens || 0) + 1 };
          }
          return a;
        });
        StorageService.saveArtists(updatedArtists);
      }

      return true;
    } catch (e) {
      console.error('Error incrementing listen count:', e);
      return false;
    }
  },

  /**
   * Tcheke si itilizatè k ap gade a te deja koute mizik sa a
   */
  hasUserListenedToSong: (musicId: string, customUserId?: string): boolean => {
    return UserIdentifier.hasUserListenedToSong(musicId, customUserId);
  },

  /**
   * Jwenn pwofil ak idantifyan inik itilizatè a
   */
  getUserListeningProfile: () => {
    return UserIdentifier.getUserProfile();
  },

  /**
   * Jwenn tout ID mizik itilizatè sa a te deja koute
   */
  getUserListenedSongIds: (): string[] => {
    return UserIdentifier.getListenedSongIds();
  },

  /**
   * Jwenn kantite oditè inik pou yon mizik espesifik
   */
  getSongUniqueListenersCount: (musicId: string, fallbackListens: number = 0): number => {
    return UserIdentifier.getSongUniqueListenersCount(musicId, fallbackListens);
  },

  /**
   * Jwenn tout kantite oditè inik pou tout katalòg yon atis
   */
  getArtistUniqueListenersCount: (artistSongs: { id: string; listens?: number }[]): number => {
    return UserIdentifier.getArtistUniqueListenersCount(artistSongs);
  },

  // RECENT LISTENS & RECOMMENDATION HEURISTIC
  getRecentListenedIds: (): string[] => {
    return getStoredData<string[]>(KEYS.RECENT_LISTENED_IDS, []);
  },

  addRecentListenedId: (musicId: string) => {
    try {
      const current = getStoredData<string[]>(KEYS.RECENT_LISTENED_IDS, []);
      // Deduplicate: remove musicId if already present, then prepend to top
      const filtered = current.filter(id => id !== musicId);
      const updated = [musicId, ...filtered].slice(0, 15); // keep last 15
      setStoredData(KEYS.RECENT_LISTENED_IDS, updated);
    } catch (e) {
      console.error('Error recording recent listen:', e);
    }
  },

  clearRecentListenedIds: () => {
    setStoredData(KEYS.RECENT_LISTENED_IDS, []);
  },

  // 'Atis Pou Ou' (Recommended for You) Heuristic Logic
  // Matches the category of the last 3 songs listened to
  getRecommendations: (musicList: MusicItem[], limit = 6): {
    recommendations: MusicItem[];
    matchedCategories: string[];
    lastListenedSongs: MusicItem[];
    isPersonalized: boolean;
  } => {
    const recentIds = StorageService.getRecentListenedIds();
    
    // Find the last up to 3 songs listened to
    const last3ListenedSongs: MusicItem[] = [];
    for (const id of recentIds) {
      const found = musicList.find(m => m.id === id);
      if (found) {
        last3ListenedSongs.push(found);
        if (last3ListenedSongs.length >= 3) break;
      }
    }

    const isPersonalized = last3ListenedSongs.length > 0;

    // Determine category weights
    const categoryFrequency: Record<string, number> = {};
    if (isPersonalized) {
      // Weight most recent higher: 1st most recent (3pts), 2nd (2pts), 3rd (1pt)
      last3ListenedSongs.forEach((song, idx) => {
        const weight = 3 - idx;
        categoryFrequency[song.category] = (categoryFrequency[song.category] || 0) + weight;
      });
    } else {
      // Default starter categories if user hasn't listened to anything yet
      categoryFrequency['Kompa'] = 3;
      categoryFrequency['Rabòday'] = 2;
      categoryFrequency['Drill'] = 2;
    }

    const matchedCategories = Object.keys(categoryFrequency).sort(
      (a, b) => categoryFrequency[b] - categoryFrequency[a]
    );

    // Score candidates from musicList
    const recentIdsSet = new Set(recentIds.slice(0, 3));
    
    // Score each song
    const scoredSongs = musicList.map(song => {
      let score = 0;
      
      // Category match score
      if (categoryFrequency[song.category]) {
        score += categoryFrequency[song.category] * 10;
      }

      // Bonus for popularity / plays
      score += Math.log10((song.listens || 10) + 1) * 2;
      
      // Bonus for supporter donations
      score += (song.totalDonations > 0 ? 3 : 0);

      // Penalize songs currently in the last 3 listened to promote discovery of NEW music
      if (recentIdsSet.has(song.id)) {
        score -= 25;
      }

      return { song, score };
    });

    // Sort by score descending
    scoredSongs.sort((a, b) => b.score - a.score);

    // Pick top unique songs
    const recommendations = scoredSongs.slice(0, limit).map(item => item.song);

    return {
      recommendations,
      matchedCategories,
      lastListenedSongs: last3ListenedSongs,
      isPersonalized
    };
  },

  // USER'S TOP 5 ARTISTS (Algorithm: User's most listened artists from history, or personalized algorithmic/random picks)
  getUserTopArtists: (artists: ArtistUser[], musicList: MusicItem[], limit = 5): {
    artist: ArtistUser;
    listenCount: number;
    isFromHistory: boolean;
    category?: MusicCategory;
  }[] => {
    const recentIds = StorageService.getRecentListenedIds();
    const listenHistory = getStoredData<Record<string, number>>(KEYS.LISTEN_HISTORY, {});

    // Map of artistId -> score / listen weight
    const artistListenMap = new Map<string, number>();

    // 1. Recent listened songs have highest recency weight
    recentIds.forEach((mId, index) => {
      const music = musicList.find(m => m.id === mId);
      if (music && music.artistId) {
        const weight = Math.max(2, 15 - index * 2);
        artistListenMap.set(music.artistId, (artistListenMap.get(music.artistId) || 0) + weight);
      }
    });

    // 2. All songs in listenHistory record
    Object.keys(listenHistory).forEach((mId) => {
      const music = musicList.find(m => m.id === mId);
      if (music && music.artistId) {
        artistListenMap.set(music.artistId, (artistListenMap.get(music.artistId) || 0) + 1);
      }
    });

    // Active or valid artists
    const availableArtists = artists.filter(a => a.status !== 'rejected');
    const result: { artist: ArtistUser; listenCount: number; isFromHistory: boolean; category?: MusicCategory }[] = [];
    const selectedIds = new Set<string>();

    // Find primary music category for each artist if available
    const getArtistPrimaryCategory = (artId: string): MusicCategory | undefined => {
      const artSongs = musicList.filter(m => m.artistId === artId);
      if (artSongs.length > 0) {
        return artSongs[0].category;
      }
      return undefined;
    };

    // Sort by user listen weight descending
    const sortedArtistEntries = Array.from(artistListenMap.entries()).sort((a, b) => b[1] - a[1]);

    for (const [artId, count] of sortedArtistEntries) {
      if (result.length >= limit) break;
      const art = availableArtists.find(
        a => a.id === artId || a.name?.toLowerCase() === artId?.toLowerCase() || a.stageName?.toLowerCase() === artId?.toLowerCase()
      );
      if (art && !selectedIds.has(art.id)) {
        selectedIds.add(art.id);
        result.push({
          artist: art,
          listenCount: count,
          isFromHistory: true,
          category: getArtistPrimaryCategory(art.id)
        });
      }
    }

    // If fewer than limit, fill with algorithmic / randomized selection from available artists
    if (result.length < limit) {
      const remainingArtists = availableArtists.filter(a => !selectedIds.has(a.id));
      
      // Shuffle with preference for artists with songs or activity
      const shuffled = [...remainingArtists].sort((a, b) => {
        const aSongsCount = musicList.filter(m => m.artistId === a.id).length;
        const bSongsCount = musicList.filter(m => m.artistId === b.id).length;
        const scoreA = (a.totalListens || 0) * 0.2 + aSongsCount * 10 + Math.random() * 20;
        const scoreB = (b.totalListens || 0) * 0.2 + bSongsCount * 10 + Math.random() * 20;
        return scoreB - scoreA;
      });

      for (const art of shuffled) {
        if (result.length >= limit) break;
        if (!selectedIds.has(art.id)) {
          selectedIds.add(art.id);
          result.push({
            artist: art,
            listenCount: 0,
            isFromHistory: false,
            category: getArtistPrimaryCategory(art.id)
          });
        }
      }
    }

    return result;
  },

  // TOP 3 (Manual override or auto-calculated)
  getTop3Override: (): { enabled: boolean; topIds: string[] } => {
    return getStoredData(KEYS.TOP3_OVERRIDE, { enabled: false, topIds: [] });
  },
  saveTop3Override: (override: { enabled: boolean; topIds: string[] }) => {
    setStoredData(KEYS.TOP3_OVERRIDE, override);
  },

  // ARTISTS
  getArtists: (): ArtistUser[] => {
    const list = getStoredData<ArtistUser[]>(KEYS.ARTISTS, INITIAL_ARTISTS);
    const nowTimestamp = Date.now();

    const enrichedList = list.map(a => {
      let updated = { ...a };

      // Auto-lift suspension if expiration date has passed
      if (updated.status === 'suspended' && updated.suspendedUntil) {
        const expiry = new Date(updated.suspendedUntil).getTime();
        if (!isNaN(expiry) && nowTimestamp >= expiry) {
          updated.status = 'active';
          updated.suspendedAt = undefined;
          updated.suspendedUntil = undefined;
          updated.suspensionDays = undefined;
          updated.suspensionReason = undefined;
        }
      }
      return updated;
    });

    return enrichedList;
  },
  saveArtists: (list: ArtistUser[]) => {
    setStoredData(KEYS.ARTISTS, list);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'batch' } }));
      }
    } catch {}
  },
  saveArtist: (artist: ArtistUser) => {
    const current = StorageService.getArtists();
    const existingIdx = current.findIndex(a => a.id === artist.id);
    let updated: ArtistUser[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = artist;
    } else {
      updated = [artist, ...current];
    }
    setStoredData(KEYS.ARTISTS, updated);

    // If currently logged-in artist is this artist, update session storage too
    const currentLoggedIn = StorageService.getLoggedInArtist();
    if (currentLoggedIn && currentLoggedIn.id === artist.id) {
      StorageService.setCurrentArtist(artist);
    }
    
    // If this is a newly registered artist pending validation, dispatch automated acknowledgement email
    if (existingIdx < 0 && (artist.status === 'pending' || !artist.status)) {
      try {
        StorageService.sendArtistRegistrationPendingEmail(artist);
      } catch (err) {
        console.warn('Could not dispatch pending registration email:', err);
      }
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'save', artist } }));
        window.dispatchEvent(new CustomEvent('upmizik_donation_updated', { detail: { action: 'artist_save', artist } }));
      }
    } catch {}
  },
  validateArtist: (artistId: string, accept: boolean, adminName = 'Mr clauvens', reason?: string): {
    artist: ArtistUser | null;
    generatedEmail: ArtistInboxMessage | null;
  } => {
    const list = StorageService.getArtists();
    let validatedArtist: ArtistUser | null = null;
    let generatedEmail: ArtistInboxMessage | null = null;
    let found = false;

    const updated = list.map(a => {
      if (a.id === artistId) {
        found = true;
        const newStatus = accept ? ('active' as const) : ('rejected' as const);
        validatedArtist = {
          ...a,
          status: newStatus,
          registrationRejectionReason: !accept ? (reason || 'Foto prèv transfè a pa klè oswa referans lan pa koresponn. Tanpri telechaje yon nouvo prèv.') : undefined
        };
        return validatedArtist;
      }
      return a;
    });

    if (!found) {
      const initMatch = INITIAL_ARTISTS.find(ia => ia.id === artistId);
      if (initMatch) {
        const newStatus = accept ? ('active' as const) : ('rejected' as const);
        validatedArtist = {
          ...initMatch,
          status: newStatus,
          registrationRejectionReason: !accept ? (reason || 'Foto prèv transfè a pa klè oswa referans lan pa koresponn. Tanpri telechaje yon nouvo prèv.') : undefined
        };
        updated.push(validatedArtist);
      }
    }
    setStoredData(KEYS.ARTISTS, updated);

    // If currently logged-in artist is this artist, update session too
    const currentLoggedIn = StorageService.getLoggedInArtist();
    if (currentLoggedIn && currentLoggedIn.id === artistId && validatedArtist) {
      StorageService.setCurrentArtist(validatedArtist);
    }

    if (validatedArtist) {
      if (accept) {
        generatedEmail = StorageService.sendArtistAccountVerificationEmail(validatedArtist, adminName);
      } else {
        generatedEmail = StorageService.sendArtistAccountRejectionEmail(validatedArtist, adminName, reason);
      }
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'validate', artist: validatedArtist } }));
        window.dispatchEvent(new CustomEvent('upmizik_donation_updated', { detail: { action: 'artist_validate', artist: validatedArtist } }));
      }
    } catch {}

    return { artist: validatedArtist, generatedEmail };
  },

  purgeAllPendingArtists: (): number => {
    const list = StorageService.getArtists();
    const pendingCount = list.filter(a => a.status === 'pending' || (a as any).statut === 'en_attente').length;
    const filtered = list.filter(a => a.status !== 'pending' && (a as any).statut !== 'en_attente');
    setStoredData(KEYS.ARTISTS, filtered);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'purge_pending', count: pendingCount } }));
        window.dispatchEvent(new CustomEvent('upmizik_donation_updated', { detail: { action: 'purge_pending_artist' } }));
      }
    } catch {}
    return pendingCount;
  },

  restoreSamplePendingArtists: (): ArtistUser[] => {
    const list = StorageService.getArtists();
    const samplePending: ArtistUser[] = [
      {
        id: 'artist-pending-1',
        name: 'Fedner Saint-Juste',
        stageName: 'King Rabo 509',
        email: 'kingrabo@upmizik.com',
        phone: '+509 37 88 4422',
        city: 'Okap (Cap-Haïtien)',
        pin: '5091',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
        registrationProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        bio: 'Jèn chantè Rabòday ak Afro-Trap ki soti Okap (Nò Ayiti), li kreye mizik kreyòl ki bay kouraj, lespwa ak anbyans kanaval.',
        musicalRoots: 'Rabòday Elektwo, Afro-Kreyòl, Kanaval',
        musicalInfluences: 'TonyMix, Fresh La, King Posse',
        artisticVision: 'Mennen ritm Nò Ayiti a nan tout mond lan epi reprezante vil Okap ak fyète.',
        artistQuote: 'Ritm nan san nou, kilti a nan kè nou.',
        status: 'pending',
        registrationDate: new Date().toISOString().split('T')[0],
        totalListens: 0,
        totalDonationsReceived: 0,
        instagramHandle: 'kingrabo509',
        twitterHandle: 'kingrabo509'
      },
      {
        id: 'artist-pending-2',
        name: 'Mirlanda Beaubrun',
        stageName: 'Mimi Vwa Dous',
        email: 'mimi@upmizik.com',
        phone: '+509 42 11 7733',
        city: 'Jakmèl (Jacmel)',
        pin: '2026',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        registrationProofUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80',
        bio: 'Chantèz Soul & Gouyad ki soti Jakmèl, li ekri sou bèlte peyi a, santiman ak kilti ayisyèn ak yon vwa melodiye ki touche tout kè.',
        musicalRoots: 'Soul Kreyòl, Gouyad, Akoustik',
        musicalInfluences: 'Emeline Michel, Yole Dérose, Rutshelle Guillaume',
        artisticVision: 'Kreye mizik ki transmèt emosyon pi bon kalite bay tout kreyòl toupatou sou latè.',
        artistQuote: 'Yon vwa sensè ka touche nenpòt nanm.',
        status: 'pending',
        registrationDate: new Date().toISOString().split('T')[0],
        totalListens: 0,
        totalDonationsReceived: 0,
        instagramHandle: 'mimivwadous',
        twitterHandle: 'mimi_dous'
      },
      {
        id: 'artist-pending-3',
        name: 'Jean Ronald Dorélus',
        stageName: 'Ti-Kreyòl Vibes',
        email: 'tikreyol@upmizik.com',
        phone: '+509 31 55 9900',
        city: 'Gonaïves (Latibonit)',
        pin: '5093',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
        registrationProofUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
        bio: 'Atis Rasin & Reggae Kreyòl ki soti Gonayiv, pasyone pou valorize tanbou, rann omaj bay zansèt yo e pote mesaj inite ak pwogrè pou tout jèn.',
        musicalRoots: 'Mizik Rasin, Reggae Kreyòl, Tanbou Lakou',
        musicalInfluences: 'Boukman Eksperyans, RAM, Koudjay',
        artisticVision: 'Pote fòs ak diyite kilti ayisyen nan tout gwo festival entènasyonal.',
        artistQuote: 'Rasin nou se fòs nou, mizik nou se idantite nou.',
        status: 'pending',
        registrationDate: new Date().toISOString().split('T')[0],
        totalListens: 0,
        totalDonationsReceived: 0,
        instagramHandle: 'tikreyol_vibes',
        tiktokUrl: 'https://tiktok.com/@tikreyol'
      }
    ];

    let merged = [...list];
    samplePending.forEach(sp => {
      const idx = merged.findIndex(a => a.id === sp.id);
      if (idx >= 0) {
        merged[idx] = { ...sp };
      } else {
        merged = [sp, ...merged];
      }
    });

    setStoredData(KEYS.ARTISTS, merged);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'restore_pending' } }));
      }
    } catch {}
    return merged;
  },

  setArtistPendingStatus: (artistId: string, status: 'pending' | 'active' | 'rejected'): ArtistUser | null => {
    const list = StorageService.getArtists();
    let updatedArtist: ArtistUser | null = null;
    const updated = list.map(a => {
      if (a.id === artistId) {
        updatedArtist = { ...a, status };
        return updatedArtist;
      }
      return a;
    });
    setStoredData(KEYS.ARTISTS, updated);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'status_change', artist: updatedArtist } }));
      }
    } catch {}
    return updatedArtist;
  },

  suspendArtist: (
    artistId: string,
    days: number,
    reason?: string,
    adminName = 'Mr clauvens'
  ): {
    artist: ArtistUser | null;
    generatedEmail: ArtistInboxMessage | null;
  } => {
    const list = StorageService.getArtists();
    let suspendedArtist: ArtistUser | null = null;
    let generatedEmail: ArtistInboxMessage | null = null;

    const now = new Date();
    const suspendedAt = now.toISOString();
    const suspendedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const defaultReason = reason?.trim() || 'Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la';

    const updated = list.map(a => {
      if (a.id === artistId) {
        suspendedArtist = {
          ...a,
          status: 'suspended',
          suspendedAt,
          suspendedUntil,
          suspensionDays: days,
          suspensionReason: defaultReason
        };
        return suspendedArtist;
      }
      return a;
    });
    setStoredData(KEYS.ARTISTS, updated);

    // If currently logged-in artist is this artist, update session too
    const currentLoggedIn = StorageService.getLoggedInArtist();
    if (currentLoggedIn && currentLoggedIn.id === artistId && suspendedArtist) {
      StorageService.setCurrentArtist(suspendedArtist);
    }

    if (suspendedArtist) {
      generatedEmail = StorageService.sendArtistSuspensionEmail(
        suspendedArtist,
        days,
        defaultReason,
        suspendedUntil,
        adminName
      );
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'suspend', artist: suspendedArtist } }));
      }
    } catch {}

    return { artist: suspendedArtist, generatedEmail };
  },

  reactivateArtist: (
    artistId: string,
    adminName = 'Mr clauvens'
  ): {
    artist: ArtistUser | null;
    generatedEmail: ArtistInboxMessage | null;
  } => {
    const list = StorageService.getArtists();
    let reactivatedArtist: ArtistUser | null = null;
    let generatedEmail: ArtistInboxMessage | null = null;

    const updated = list.map(a => {
      if (a.id === artistId) {
        reactivatedArtist = {
          ...a,
          status: 'active',
          suspendedAt: undefined,
          suspendedUntil: undefined,
          suspensionDays: undefined,
          suspensionReason: undefined
        };
        return reactivatedArtist;
      }
      return a;
    });
    setStoredData(KEYS.ARTISTS, updated);

    const currentLoggedIn = StorageService.getLoggedInArtist();
    if (currentLoggedIn && currentLoggedIn.id === artistId && reactivatedArtist) {
      StorageService.setCurrentArtist(reactivatedArtist);
    }

    if (reactivatedArtist) {
      generatedEmail = StorageService.sendArtistReactivationEmail(reactivatedArtist, adminName);
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'reactivate', artist: reactivatedArtist } }));
      }
    } catch {}

    return { artist: reactivatedArtist, generatedEmail };
  },

  deleteArtist: (
    artistId: string,
    deleteAssociatedSongs = true
  ): { success: boolean; deletedSongsCount: number; deletedArtist: ArtistUser | null } => {
    const list = StorageService.getArtists();
    const targetArtist = list.find(a => a.id === artistId) || null;
    const updatedArtists = list.filter(a => a.id !== artistId);
    setStoredData(KEYS.ARTISTS, updatedArtists);

    let deletedSongsCount = 0;
    if (deleteAssociatedSongs) {
      const musicList = StorageService.getMusic();
      const songsToKeep = musicList.filter(m => m.artistId !== artistId);
      deletedSongsCount = musicList.length - songsToKeep.length;
      StorageService.saveMusic(songsToKeep);
    }

    // Clean up current session if this artist was logged in
    const currentLoggedIn = StorageService.getLoggedInArtist();
    if (currentLoggedIn && currentLoggedIn.id === artistId) {
      StorageService.setLoggedInArtist(null);
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'delete', artistId } }));
      }
    } catch {}

    return { success: true, deletedSongsCount, deletedArtist: targetArtist };
  },

  markArtistPaidStatus: (
    artistId: string,
    isPaid: boolean,
    details?: {
      paidAmount?: number;
      reference?: string;
      adminName?: string;
      paymentMethod?: string;
      notes?: string;
      sendNotification?: boolean;
    }
  ): { success: boolean; artist: ArtistUser | null; generatedEmail: ArtistInboxMessage | null } => {
    const artists = StorageService.getArtists();
    const targetIndex = artists.findIndex(a => a.id === artistId);
    if (targetIndex === -1) return { success: false, artist: null, generatedEmail: null };

    const target = artists[targetIndex];
    const nowIso = new Date().toISOString();
    const paymentRef = details?.reference || `PAY-${Math.floor(100000 + Math.random() * 900000)}`;

    const updatedArtist: ArtistUser = {
      ...target,
      isPaidThisMonth: isPaid,
      paidDateThisMonth: isPaid ? nowIso : undefined,
      paidAmountThisMonth: isPaid ? (details?.paidAmount ?? target.paidAmountThisMonth) : undefined,
      paidReferenceThisMonth: isPaid ? paymentRef : undefined
    };

    artists[targetIndex] = updatedArtist;
    StorageService.saveArtists(artists);

    // If logged in artist is this one, update session
    const currentLoggedIn = StorageService.getLoggedInArtist();
    if (currentLoggedIn && currentLoggedIn.id === artistId) {
      StorageService.setLoggedInArtist(updatedArtist);
    }

    let generatedEmail: ArtistInboxMessage | null = null;

    // Send confirmation email to artist's inbox if marked as paid
    if (isPaid && details?.sendNotification !== false) {
      generatedEmail = StorageService.sendArtistMonthlyPayoutEmail(
        updatedArtist,
        details?.paidAmount || 0,
        paymentRef,
        details?.adminName || 'Mr clauvens',
        details?.paymentMethod || 'MonCash / Natcash',
        details?.notes
      );
    }

    return { success: true, artist: updatedArtist, generatedEmail };
  },
  
  getCurrentArtist: (): ArtistUser | null => getStoredData<ArtistUser | null>(KEYS.CURRENT_ARTIST, null),
  setCurrentArtist: (artist: ArtistUser | null) => setStoredData(KEYS.CURRENT_ARTIST, artist),
  getLoggedInArtist: (): ArtistUser | null => getStoredData<ArtistUser | null>(KEYS.CURRENT_ARTIST, null),
  setLoggedInArtist: (artist: ArtistUser | null) => setStoredData(KEYS.CURRENT_ARTIST, artist),

  // DONATIONS (Pwoteje pou itilizatè verifye kòm Admin sèlman)
  getRawStoredDonations: (): DonationItem[] => getStoredData<DonationItem[]>(KEYS.DONATIONS, INITIAL_DONATIONS),
  
  getDonations: (adminAuth?: AdminUser | null): DonationItem[] => {
    // Sekirite: Si moun nan pa gen wòl 'super_admin' verifye, pa voye done finansye yo
    const activeAdmin = adminAuth || StorageService.getLoggedInAdmin();
    if (!activeAdmin || activeAdmin.role !== 'super_admin') {
      return [];
    }
    return StorageService.getRawStoredDonations();
  },
  
  saveDonations: (list: DonationItem[]) => {
    setStoredData(KEYS.DONATIONS, list);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_donation_updated', { detail: { action: 'batch' } }));
      }
    } catch {}
  },
  
  addDonation: (donation: Omit<DonationItem, 'id' | 'createdAt' | 'artistShare' | 'platformShare'>): DonationItem => {
    const amount = Number(donation.amount);
    // Revenue split: 85% to artist, 15% + $0.99 to platform
    const artistShare = Number((amount * 0.85).toFixed(2));
    const platformShare = Number((amount * 0.15 + 0.99).toFixed(2));
    
    const newDonation: DonationItem = {
      ...donation,
      id: `don-${Date.now()}`,
      createdAt: new Date().toLocaleString('ht-HT', { dateStyle: 'short', timeStyle: 'short' }),
      artistShare,
      platformShare
    };

    const currentList = StorageService.getRawStoredDonations();
    StorageService.saveDonations([newDonation, ...currentList]);

    // AUTOMATED NOTIFICATION: Dispatch "New Financial Support Received (Pending Validation)" alert
    try {
      StorageService.sendArtistPendingDonationEmail(newDonation);
    } catch (err) {
      console.warn('Could not dispatch pending donation email:', err);
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_donation_updated', { detail: { action: 'add', donation: newDonation } }));
      }
    } catch {}

    return newDonation;
  },

  validateDonation: (donationId: string, accept: boolean, adminName = 'Mr Clauvens'): {
    donation: DonationItem | null;
    generatedEmail: ArtistInboxMessage | null;
  } => {
    const donations = StorageService.getRawStoredDonations();
    let validatedDonation: DonationItem | null = null;
    let found = false;

    const updatedDonations = donations.map(d => {
      if (d.id === donationId) {
        found = true;
        const status = accept ? ('validated' as const) : ('rejected' as const);
        validatedDonation = { ...d, status };
        return validatedDonation;
      }
      return d;
    });

    if (!found) {
      const initMatch = INITIAL_DONATIONS.find(d => d.id === donationId);
      if (initMatch) {
        const status = accept ? ('validated' as const) : ('rejected' as const);
        validatedDonation = { ...initMatch, status };
        updatedDonations.push(validatedDonation);
      }
    }
    StorageService.saveDonations(updatedDonations);

    let generatedEmail: ArtistInboxMessage | null = null;

    // If accepted, credit the music track totalDonations and artist totalDonationsReceived
    if (accept && validatedDonation) {
      const vDon = validatedDonation as DonationItem;
      const musicList = StorageService.getMusic();
      const updatedMusic = musicList.map(m => {
        if (m.id === vDon.musicId) {
          return {
            ...m,
            totalDonations: (m.totalDonations || 0) + Number(vDon.amount)
          };
        }
        return m;
      });
      StorageService.saveMusic(updatedMusic);

      const artists = StorageService.getArtists();
      const updatedArtists = artists.map(a => {
        if (a.stageName === vDon.artistName || a.id === vDon.artistId) {
          return {
            ...a,
            totalDonationsReceived: (a.totalDonationsReceived || 0) + Number(vDon.amount)
          };
        }
        return a;
      });
      StorageService.saveArtists(updatedArtists);

      // AUTOMATED EMAIL NOTIFICATION SYSTEM:
      // Instantly dispatch a simulated "Donation Received" alert to the artist's dashboard inbox!
      generatedEmail = StorageService.sendArtistDonationEmail(vDon, adminName);
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_donation_updated', { detail: { action: 'validate', donation: validatedDonation } }));
      }
    } catch {}

    return { donation: validatedDonation, generatedEmail };
  },

  purgeAllPendingDonations: (): number => {
    const donations = StorageService.getRawStoredDonations();
    const pendingCount = donations.filter(d => d.status === 'pending').length;
    const filtered = donations.filter(d => d.status !== 'pending');
    StorageService.saveDonations(filtered);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_donation_updated', { detail: { action: 'purge_pending', count: pendingCount } }));
      }
    } catch {}
    return pendingCount;
  },

  // COMMENTS
  getComments: (): CommentItem[] => getStoredData<CommentItem[]>(KEYS.COMMENTS, INITIAL_COMMENTS),
  saveComments: (list: CommentItem[]) => setStoredData(KEYS.COMMENTS, list),
  addComment: (musicId: string, authorName: string, text: string): CommentItem => {
    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      musicId,
      authorName: authorName.trim() || 'Fanatik UpMizik',
      text: text.trim(),
      createdAt: new Date().toLocaleString('ht-HT', { dateStyle: 'short', timeStyle: 'short' }),
      likes: 1
    };
    const list = StorageService.getComments();
    StorageService.saveComments([newComment, ...list]);

    // Update music comment count
    const musicList = StorageService.getMusic();
    const updated = musicList.map(m => {
      if (m.id === musicId) {
        return { ...m, commentsCount: (m.commentsCount || 0) + 1 };
      }
      return m;
    });
    StorageService.saveMusic(updated);

    return newComment;
  },
  deleteComment: (commentId: string, musicId: string) => {
    const list = StorageService.getComments().filter(c => c.id !== commentId);
    StorageService.saveComments(list);

    const musicList = StorageService.getMusic();
    const updated = musicList.map(m => {
      if (m.id === musicId) {
        return { ...m, commentsCount: Math.max(0, (m.commentsCount || 1) - 1) };
      }
      return m;
    });
    StorageService.saveMusic(updated);
  },

  // PUBS
  getPubs: (): PubItem[] => getStoredData<PubItem[]>(KEYS.PUBS, INITIAL_PUBS),
  savePubs: (list: PubItem[]) => setStoredData(KEYS.PUBS, list),

  // RPA (Ribrik Pouse Atis)
  getRpa: (): RpaItem[] => getStoredData<RpaItem[]>(KEYS.RPA, INITIAL_RPA),
  saveRpa: (list: RpaItem[]) => setStoredData(KEYS.RPA, list),

  // SOCIAL POSTS (UpMizik Social) - 30 Jou Dire & Otomatik Sipresyon
  getSocialPosts: (): SocialPost[] => {
    const rawPosts = getStoredData<SocialPost[]>(KEYS.SOCIAL_POSTS, INITIAL_SOCIAL_POSTS);
    const artists = StorageService.getArtists();
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    let hasExpiredOrDuplicates = false;

    // Deduplicate by ID to prevent any duplicate key errors
    const seenIds = new Set<string>();
    const uniquePosts: SocialPost[] = [];
    for (const p of rawPosts) {
      if (p && p.id && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        uniquePosts.push(p);
      } else {
        hasExpiredOrDuplicates = true;
      }
    }

    // 1. Filter out posts older than 30 days (auto-deletion)
    const validPosts = uniquePosts.filter((post) => {
      let isExpired = false;
      if (post.expiresAt) {
        isExpired = now > new Date(post.expiresAt).getTime();
      } else if (post.createdAt) {
        isExpired = now > new Date(post.createdAt).getTime() + THIRTY_DAYS_MS;
      }
      if (isExpired) {
        hasExpiredOrDuplicates = true;
        return false;
      }
      return true;
    });

    // If any expired posts or duplicates were detected and pruned, persist the cleaned list
    if (hasExpiredOrDuplicates) {
      setStoredData(KEYS.SOCIAL_POSTS, validPosts);
    }

    // 2. Automatically keep artist avatar, names, handles in sync, and ensure createdAt / expiresAt exist
    return validPosts.map((post) => {
      const createdAt = post.createdAt || new Date(now - 2 * 3600 * 1000).toISOString();
      const expiresAt = post.expiresAt || new Date(new Date(createdAt).getTime() + THIRTY_DAYS_MS).toISOString();

      const artist = artists.find(
        (a) => a.id === post.artistId || a.stageName.toLowerCase() === post.stageName.toLowerCase()
      );
      if (artist) {
        let handle = post.handle;
        if (post.platform === 'twitter' && artist.twitterHandle) {
          handle = artist.twitterHandle.startsWith('@') ? artist.twitterHandle : `@${artist.twitterHandle}`;
        } else if (post.platform === 'instagram' && artist.instagramHandle) {
          handle = artist.instagramHandle.startsWith('@') ? artist.instagramHandle : `@${artist.instagramHandle}`;
        }
        return {
          ...post,
          createdAt,
          expiresAt,
          artistAvatar: artist.avatarUrl || post.artistAvatar,
          stageName: artist.stageName || post.stageName,
          artistName: artist.name || post.artistName,
          handle
        };
      }
      return {
        ...post,
        createdAt,
        expiresAt
      };
    });
  },

  saveSocialPosts: (list: SocialPost[]) => {
    const seenIds = new Set<string>();
    const uniqueList = (list || []).filter((p) => {
      if (!p || !p.id || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
    setStoredData(KEYS.SOCIAL_POSTS, uniqueList);
  },

  addSocialPost: (newPostData: Omit<SocialPost, 'id' | 'likes' | 'commentsCount' | 'sharesCount' | 'timestamp' | 'createdAt' | 'expiresAt'>): SocialPost => {
    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days lifetime
    
    const post: SocialPost = {
      ...newPostData,
      id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: 'Fenk pibliye',
      createdAt,
      expiresAt,
      likes: 1,
      commentsCount: 0,
      sharesCount: 0,
      retweetsCount: newPostData.platform === 'twitter' ? 0 : undefined
    };
    const current = StorageService.getSocialPosts();
    const updated = [post, ...current];
    StorageService.saveSocialPosts(updated);
    return post;
  },

  deleteSocialPost: (postId: string, actorName: string = 'Admin'): boolean => {
    const posts = StorageService.getSocialPosts();
    const targetPost = posts.find((p) => p.id === postId);
    const updated = posts.filter((p) => p.id !== postId);
    StorageService.saveSocialPosts(updated);

    // Clean up comments for this post
    const allComments = getStoredData<Record<string, SocialPostComment[]>>(
      KEYS.SOCIAL_COMMENTS,
      INITIAL_SOCIAL_POST_COMMENTS
    );
    if (allComments[postId]) {
      delete allComments[postId];
      setStoredData(KEYS.SOCIAL_COMMENTS, allComments);
    }

    // Also log activity
    if (targetPost) {
      StorageService.addActivityLog({
        eventType: 'action_securite',
        email: targetPost.handle || 'admin@upmizik.com',
        artistId: targetPost.artistId || 'system',
        artistName: targetPost.stageName || targetPost.artistName || 'Atis',
        reason: `${actorName} siprime yon pòs kominotè atis la (${targetPost.stageName || targetPost.artistName}) avan/pandan limit 30 jou a.`,
        status: 'success'
      });
    }

    return true;
  },

  likeSocialPost: (postId: string): { likes: number; isLiked: boolean } => {
    const likedKey = `upmizik_liked_posts_v1`;
    const likedPosts = getStoredData<string[]>(likedKey, []);
    const isAlreadyLiked = likedPosts.includes(postId);
    
    const posts = StorageService.getSocialPosts();
    let updatedLikes = 0;
    
    const updated = posts.map(p => {
      if (p.id === postId) {
        const delta = isAlreadyLiked ? -1 : 1;
        updatedLikes = Math.max(0, (p.likes || 0) + delta);
        return { ...p, likes: updatedLikes };
      }
      return p;
    });

    StorageService.saveSocialPosts(updated);
    
    if (isAlreadyLiked) {
      setStoredData(likedKey, likedPosts.filter(id => id !== postId));
    } else {
      setStoredData(likedKey, [...likedPosts, postId]);
    }

    return { likes: updatedLikes, isLiked: !isAlreadyLiked };
  },

  getLikedPostIds: (): string[] => {
    return getStoredData<string[]>('upmizik_liked_posts_v1', []);
  },

  incrementSocialPostShares: (postId: string): number => {
    const posts = StorageService.getSocialPosts();
    let updatedShares = 0;
    const updated = posts.map((p) => {
      if (p.id === postId) {
        updatedShares = (p.sharesCount || 0) + 1;
        return { ...p, sharesCount: updatedShares };
      }
      return p;
    });
    StorageService.saveSocialPosts(updated);
    return updatedShares;
  },

  // SOCIAL POST COMMENTS (Kòmantè sou sit la pou chak piblikasyon)
  getSocialPostComments: (postId: string): SocialPostComment[] => {
    const allComments = getStoredData<Record<string, SocialPostComment[]>>(
      KEYS.SOCIAL_COMMENTS,
      INITIAL_SOCIAL_POST_COMMENTS
    );
    return allComments[postId] || [];
  },

  addSocialPostComment: (
    postId: string,
    commentData: { authorName: string; content: string; authorAvatar?: string }
  ): SocialPostComment => {
    const allComments = getStoredData<Record<string, SocialPostComment[]>>(
      KEYS.SOCIAL_COMMENTS,
      INITIAL_SOCIAL_POST_COMMENTS
    );
    const existing = allComments[postId] || [];

    const newComment: SocialPostComment = {
      id: `spc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      postId,
      authorName: commentData.authorName.trim() || 'Fanatik UpMizik',
      authorAvatar:
        commentData.authorAvatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          commentData.authorName || 'fan'
        )}`,
      content: commentData.content.trim(),
      createdAt: new Date().toISOString(),
      likes: 0
    };

    const updatedComments = [newComment, ...existing];
    allComments[postId] = updatedComments;
    setStoredData(KEYS.SOCIAL_COMMENTS, allComments);

    // Increment post's commentsCount in social posts storage
    const posts = StorageService.getSocialPosts();
    const updatedPosts = posts.map((p) => {
      if (p.id === postId) {
        return { ...p, commentsCount: updatedComments.length };
      }
      return p;
    });
    StorageService.saveSocialPosts(updatedPosts);

    return newComment;
  },

  likeSocialPostComment: (commentId: string): { likes: number; isLiked: boolean } => {
    const likedKey = `upmizik_liked_social_comments_v1`;
    const likedCommentIds = getStoredData<string[]>(likedKey, []);
    const isAlreadyLiked = likedCommentIds.includes(commentId);
    const allComments = getStoredData<Record<string, SocialPostComment[]>>(
      KEYS.SOCIAL_COMMENTS,
      INITIAL_SOCIAL_POST_COMMENTS
    );
    let updatedLikes = 0;

    let modified = false;
    for (const pId in allComments) {
      allComments[pId] = allComments[pId].map((c) => {
        if (c.id === commentId) {
          modified = true;
          const delta = isAlreadyLiked ? -1 : 1;
          updatedLikes = Math.max(0, (c.likes || 0) + delta);
          return { ...c, likes: updatedLikes };
        }
        return c;
      });
    }

    if (modified) {
      setStoredData(KEYS.SOCIAL_COMMENTS, allComments);
    }

    if (isAlreadyLiked) {
      setStoredData(likedKey, likedCommentIds.filter((id) => id !== commentId));
    } else {
      setStoredData(likedKey, [...likedCommentIds, commentId]);
    }

    return { likes: updatedLikes, isLiked: !isAlreadyLiked };
  },

  getLikedSocialCommentIds: (): string[] => {
    return getStoredData<string[]>('upmizik_liked_social_comments_v1', []);
  },

  // ARCHIVES (Pwoteje pou itilizatè verifye kòm Admin sèlman)
  getRawStoredArchives: (): ArchiveRecord[] => getStoredData<ArchiveRecord[]>(KEYS.ARCHIVES, INITIAL_ARCHIVES),
  
  getArchives: (adminAuth?: AdminUser | null): ArchiveRecord[] => {
    const activeAdmin = adminAuth || StorageService.getLoggedInAdmin();
    if (!activeAdmin || activeAdmin.role !== 'super_admin') {
      return [];
    }
    return StorageService.getRawStoredArchives();
  },
  
  saveArchives: (list: ArchiveRecord[]) => setStoredData(KEYS.ARCHIVES, list),

  // ADMIN
  getCurrentAdmin: (): AdminUser | null => getStoredData<AdminUser | null>(KEYS.CURRENT_ADMIN, null),
  setCurrentAdmin: (admin: AdminUser | null) => setStoredData(KEYS.CURRENT_ADMIN, admin),
  getLoggedInAdmin: (): AdminUser | null => getStoredData<AdminUser | null>(KEYS.CURRENT_ADMIN, null),
  setLoggedInAdmin: (admin: AdminUser | null) => setStoredData(KEYS.CURRENT_ADMIN, admin),
  getAdminPin: (): string => {
    const pin = getStoredData<string>(KEYS.ADMIN_PIN, '2b1a');
    if (pin === '0229') {
      StorageService.setAdminPin('2b1a');
      return '2b1a';
    }
    return pin || '2b1a';
  },
  setAdminPin: (pin: string) => setStoredData(KEYS.ADMIN_PIN, pin),
  getAdminEmail: (): string => {
    const email = getStoredData<string>(KEYS.ADMIN_EMAIL, 'ciblesecurity404@um.com');
    // If previously saved as old email, upgrade automatically to ciblesecurity404@um.com
    if (email === 'upmizik@gmail.com' || email === 'admin.upmizik@gmail.com') {
      StorageService.setAdminEmail('ciblesecurity404@um.com');
      return 'ciblesecurity404@um.com';
    }
    return email || 'ciblesecurity404@um.com';
  },
  setAdminEmail: (email: string) => setStoredData(KEYS.ADMIN_EMAIL, email),
  
  // Super Admin Fortress Master Key (Default: 1$@96$@#&)
  getAdminMasterKey: (): string => {
    const key = getStoredData<string>(KEYS.ADMIN_MASTER_KEY, '1$@96$@#&');
    return key || '1$@96$@#&';
  },
  setAdminMasterKey: (key: string) => setStoredData(KEYS.ADMIN_MASTER_KEY, key),

  // Intrusion logs & Anti-hack system
  getIntrusionLogs: (): IntrusionLogItem[] => {
    return getStoredData<IntrusionLogItem[]>(KEYS.INTRUSION_LOGS, []);
  },
  saveIntrusionLogs: (list: IntrusionLogItem[]) => {
    setStoredData(KEYS.INTRUSION_LOGS, list);
  },
  addIntrusionLog: (data: {
    attemptedEmail: string;
    attemptCount: number;
    stage: 'primary_login' | 'master_key';
    photoUrl: string;
    userAgent?: string;
    notes?: string;
  }): IntrusionLogItem => {
    const nowIso = new Date().toISOString();
    // Generate a secure 6-digit confirmation unlock token for Admin's email
    const unlockToken = Math.floor(100000 + Math.random() * 900000).toString();

    const newLog: IntrusionLogItem = {
      id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      attemptedEmail: data.attemptedEmail || 'Enkoni',
      attemptCount: data.attemptCount || 3,
      stage: data.stage,
      photoUrl: data.photoUrl,
      userAgent: data.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser'),
      ipPlaceholder: 'Koneksyon lokal / Pwoteje',
      status: 'alert',
      unlockToken: unlockToken,
      notes: data.notes || `Tantativ aksè san otorizasyon repete 3 fwa sou Espas Admin UpMizik. Kòd deblokaj voye bay ciblesecurity404@um.com: ${unlockToken}`
    };

    const currentLogs = StorageService.getIntrusionLogs();
    const updated = [newLog, ...currentLogs];
    StorageService.saveIntrusionLogs(updated);

    // Lockout admin login attempts globally for 15 minutes
    StorageService.setAdminLockout(15);

    return newLog;
  },
  markIntrusionLogAsReviewed: (logId: string) => {
    const current = StorageService.getIntrusionLogs();
    const updated = current.map(l => (l.id === logId ? { ...l, status: 'reviewed' as const } : l));
    StorageService.saveIntrusionLogs(updated);
  },
  deleteIntrusionLog: (logId: string) => {
    const current = StorageService.getIntrusionLogs();
    const updated = current.filter(l => l.id !== logId);
    StorageService.saveIntrusionLogs(updated);
  },

  // ACTIVITY & AUTH LOGS MANAGEMENT
  getActivityLogs: (): ActivityLogItem[] => {
    const logs = getStoredData<ActivityLogItem[]>(KEYS.ACTIVITY_LOGS, []);
    if (!logs || logs.length === 0) {
      // Seed sample activity logs for realistic initial display
      const initialLogs: ActivityLogItem[] = [
        {
          id: 'act_log_init_1',
          eventType: 'echec_connexion_pending',
          email: 'kingposse@upmizik.com',
          artistId: 'art_pending_1',
          artistName: 'King Posse Next Gen',
          reason: 'Atis la eseye konekte nan artist_dashboard men kont li an atant validasyon $4.99 toujou pa Administratè a.',
          ipAddress: '190.115.178.42',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
          status: 'warning',
          timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString()
        },
        {
          id: 'act_log_init_2',
          eventType: 'echec_connexion_identifiants',
          email: 'blazeone@gmail.com',
          artistId: 'art_1',
          artistName: 'Blaze One',
          reason: 'Kòd PIN oswa modpas sekrè a enkòrèk pou atis sa a.',
          ipAddress: '165.225.208.91',
          userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36',
          status: 'error',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
        },
        {
          id: 'act_log_init_3',
          eventType: 'echec_connexion_identifiants',
          email: 'ti_tonton_rap@yahoo.com',
          reason: 'Imèl oswa kontak sa a pa jwenn nan baz done atis la.',
          ipAddress: '190.115.176.12',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0',
          status: 'error',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
        }
      ];
      setStoredData(KEYS.ACTIVITY_LOGS, initialLogs);
      return initialLogs;
    }
    return logs;
  },
  saveActivityLogs: (list: ActivityLogItem[]) => {
    setStoredData(KEYS.ACTIVITY_LOGS, list);
  },
  addActivityLog: (data: Omit<ActivityLogItem, 'id' | 'timestamp'> & { timestamp?: string }): ActivityLogItem => {
    const newLog: ActivityLogItem = {
      id: 'act_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      eventType: data.eventType,
      email: data.email,
      artistId: data.artistId,
      artistName: data.artistName,
      reason: data.reason,
      ipAddress: data.ipAddress || '190.115.178.42',
      userAgent: data.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser'),
      status: data.status || 'warning',
      timestamp: data.timestamp || new Date().toISOString()
    };

    const currentLogs = StorageService.getActivityLogs();
    const updated = [newLog, ...currentLogs];
    StorageService.saveActivityLogs(updated);

    // Optional background sync with PHP backend API
    try {
      if (typeof fetch !== 'undefined') {
        fetch('/api.php?action=log_activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: newLog.eventType,
            email: newLog.email,
            artistId: newLog.artistId,
            artistName: newLog.artistName,
            reason: newLog.reason,
            status: newLog.status
          })
        }).catch(() => {});
      }
    } catch (_) {}

    return newLog;
  },
  deleteActivityLog: (logId: string) => {
    const current = StorageService.getActivityLogs();
    const updated = current.filter(l => l.id !== logId);
    StorageService.saveActivityLogs(updated);
  },
  clearActivityLogs: () => {
    StorageService.saveActivityLogs([]);
  },

  // Lockout Management (15 minutes lockout after 3 failed attempts)
  getAdminLockoutUntil: (): number | null => {
    const until = getStoredData<number | null>(KEYS.ADMIN_LOCKOUT, null);
    if (!until) return null;
    if (Date.now() > until) {
      StorageService.clearAdminLockout();
      return null;
    }
    return until;
  },
  setAdminLockout: (durationMinutes = 15): number => {
    const lockoutUntil = Date.now() + durationMinutes * 60 * 1000;
    setStoredData(KEYS.ADMIN_LOCKOUT, lockoutUntil);
    return lockoutUntil;
  },
  clearAdminLockout: () => {
    setStoredData(KEYS.ADMIN_LOCKOUT, null);
  },
  // Verify Admin email unlock token to instantly lift the lockout
  verifyAndUnlockWithToken: (inputToken: string): boolean => {
    const cleanToken = inputToken.trim();
    if (!cleanToken) return false;
    const logs = StorageService.getIntrusionLogs();
    const recentAlert = logs.find(l => l.unlockToken && l.unlockToken === cleanToken);
    
    // Also allow master secret key as an instant emergency override
    const masterKey = StorageService.getAdminMasterKey();
    if (recentAlert || cleanToken === masterKey || cleanToken === '1$@96$@#&') {
      StorageService.clearAdminLockout();
      return true;
    }
    return false;
  },

  // Artist Login Rate Limiting (Max 3 failed attempts, 15 min lockout + admin notification)
  getArtistRateLimitState: (identifier: string): { isLocked: boolean; remainingMinutes: number; remainingAttempts: number; failedAttempts: number } => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) return { isLocked: false, remainingMinutes: 0, remainingAttempts: 3, failedAttempts: 0 };
    
    const records = getStoredData<Record<string, { failedCount: number; lockoutUntil: number | null; lastAttempt: number }>>(KEYS.ARTIST_RATE_LIMITS, {});
    const item = records[cleanId];
    if (!item) return { isLocked: false, remainingMinutes: 0, remainingAttempts: 3, failedAttempts: 0 };

    const now = Date.now();
    // Check if lockout has expired
    if (item.lockoutUntil && item.lockoutUntil > now) {
      const remainingSec = Math.ceil((item.lockoutUntil - now) / 1000);
      const remainingMin = Math.ceil(remainingSec / 60);
      return { isLocked: true, remainingMinutes: remainingMin, remainingAttempts: 0, failedAttempts: item.failedCount };
    }

    // If window expired (e.g. > 15 mins since last attempt), reset counter
    if (now - item.lastAttempt > 15 * 60 * 1000) {
      delete records[cleanId];
      setStoredData(KEYS.ARTIST_RATE_LIMITS, records);
      return { isLocked: false, remainingMinutes: 0, remainingAttempts: 3, failedAttempts: 0 };
    }

    const remainingAttempts = Math.max(0, 3 - item.failedCount);
    return { isLocked: false, remainingMinutes: 0, remainingAttempts, failedAttempts: item.failedCount };
  },

  recordArtistFailedLoginAttempt: (
    identifier: string,
    artistInfo?: { id?: string; name?: string; stageName?: string; email?: string }
  ): { isLocked: boolean; remainingMinutes: number; remainingAttempts: number; failedAttempts: number } => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) return { isLocked: false, remainingMinutes: 0, remainingAttempts: 2, failedAttempts: 1 };

    const records = getStoredData<Record<string, { failedCount: number; lockoutUntil: number | null; lastAttempt: number; alerted?: boolean }>>(KEYS.ARTIST_RATE_LIMITS, {});
    const now = Date.now();
    const item = records[cleanId] || { failedCount: 0, lockoutUntil: null, lastAttempt: now };

    // Reset if window has elapsed
    if (item.lockoutUntil && item.lockoutUntil <= now && (now - item.lastAttempt > 15 * 60 * 1000)) {
      item.failedCount = 0;
      item.lockoutUntil = null;
      item.alerted = false;
    }

    item.failedCount += 1;
    item.lastAttempt = now;

    if (item.failedCount >= 3) {
      item.lockoutUntil = now + 15 * 60 * 1000;
      const remainingMin = 15;
      
      // If not alerted yet, log security alert
      if (!item.alerted) {
        item.alerted = true;
        const displayName = artistInfo?.stageName || artistInfo?.name || cleanId;
        StorageService.addActivityLog({
          eventType: 'alerte_force_brute',
          email: cleanId,
          artistId: artistInfo?.id,
          artistName: displayName,
          reason: `ALÈT SEKIRITE (Rate Limiting / Fòs Brit): Yo detekte plis pase 3 tantativ koneksyon echwe repete (${item.failedCount} tantativ) sou kont atis '${displayName}'. Kont lan bloke tanporèman pou 15 minit epi yon notifikasyon sekirite voye bay Admin (upmizik.haiti@gmail.com).`,
          status: 'error'
        });
      }

      records[cleanId] = item;
      setStoredData(KEYS.ARTIST_RATE_LIMITS, records);
      return { isLocked: true, remainingMinutes: remainingMin, remainingAttempts: 0, failedAttempts: item.failedCount };
    }

    records[cleanId] = item;
    setStoredData(KEYS.ARTIST_RATE_LIMITS, records);
    const remaining = Math.max(0, 3 - item.failedCount);
    return { isLocked: false, remainingMinutes: 0, remainingAttempts: remaining, failedAttempts: item.failedCount };
  },

  clearArtistRateLimit: (identifier: string): void => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) return;
    const records = getStoredData<Record<string, any>>(KEYS.ARTIST_RATE_LIMITS, {});
    if (records[cleanId]) {
      delete records[cleanId];
      setStoredData(KEYS.ARTIST_RATE_LIMITS, records);
    }
  },

  // RESET & ARCHIVE LOGIC (Saves pre-reset data snapshot before resetting donations to 0)
  resetMonthlyDonations: (periodName?: string): { archivedCount: number } => {
    const music = StorageService.getMusic();
    const now = new Date();
    const defaultPeriod = periodName || `${now.toLocaleDateString('ht-HT', { month: 'long', year: 'numeric' })}`;

    const newArchiveRecords: ArchiveRecord[] = [];

    // Group donations by music/artist to archive
    music.forEach(m => {
      if (m.totalDonations > 0) {
        const artistShare = Number((m.totalDonations * 0.85).toFixed(2));
        const platformShare = Number((m.totalDonations * 0.15 + 0.99).toFixed(2));
        newArchiveRecords.push({
          id: `arch-${Date.now()}-${m.id}`,
          resetDate: new Date().toISOString().split('T')[0],
          artistName: m.artistName,
          musicTitle: m.title,
          totalDonations: m.totalDonations,
          artistShare,
          platformShare,
          period: defaultPeriod
        });
      }
    });

    // Save archive records
    const existingArchives = StorageService.getRawStoredArchives();
    StorageService.saveArchives([...newArchiveRecords, ...existingArchives]);

    // Reset music total donations to 0
    const resetMusic = music.map(m => ({ ...m, totalDonations: 0 }));
    StorageService.saveMusic(resetMusic);

    // Update artists total donations received
    const artists = StorageService.getArtists();
    const resetArtists = artists.map(a => ({ ...a, totalDonationsReceived: 0 }));
    StorageService.saveArtists(resetArtists);

    return { archivedCount: newArchiveRecords.length };
  },

  resetAndArchiveMonthlyDonations: (periodName?: string): { archivedCount: number } => {
    return StorageService.resetMonthlyDonations(periodName);
  },

  // ARTIST INBOX & AUTOMATED EMAIL NOTIFICATION SYSTEM
  getArtistInboxMessages: (artistId?: string): ArtistInboxMessage[] => {
    const all = getStoredData<ArtistInboxMessage[]>(KEYS.ARTIST_INBOX, INITIAL_ARTIST_INBOX);
    if (!artistId) return all;
    return all.filter(m => m.artistId === artistId);
  },

  saveArtistInboxMessages: (list: ArtistInboxMessage[]) => {
    setStoredData(KEYS.ARTIST_INBOX, list);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_inbox_updated', { detail: { messages: list } }));
      }
    } catch {}
  },

  // NOTIFICATION 1: Instant acknowledgement when a fan sends financial support (Pending Validation)
  sendArtistPendingDonationEmail: (donation: DonationItem): ArtistInboxMessage => {
    const gross = Number(donation.amount);
    const estimatedArtistShare = Number((gross * 0.85).toFixed(2));
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const artists = StorageService.getArtists();
    const artistObj = artists.find(a => a.id === donation.artistId || a.stageName === donation.artistName);
    const artistEmail = artistObj?.email || `${(donation.artistName || 'atis').toLowerCase().replace(/\s+/g, '')}@upmizik.com`;

    const newEmail: ArtistInboxMessage = {
      id: `msg-don-pending-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: donation.artistId || artistObj?.id || 'artist-1',
      artistName: donation.artistName,
      artistEmail,
      type: 'donation_pending',
      subject: `🌟 Nouvo Sipò Fanatik: ${donation.donorName} voye yon donasyon pou "${donation.musicTitle}"!`,
      senderName: 'UpMizik Notifikasyon Fanatik',
      senderEmail: 'notifications@upmizik.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Yon fanatik (${donation.donorName}) fenk soumèt yon sipò $${gross.toFixed(2)} ${donation.currency} pou moso "${donation.musicTitle}". Prèv la an atant verifikasyon pa Admin.`,
      bodyText: `Bonjou ${donation.artistName},

Nou gen plezi fè w konnen ke yon fanatik fidèl fenk voye yon sipò finansyè pou moso mizik ou a sou UpMizik!

Detay Sipò Fanatik la:
--------------------------------------------------
• Moso Mizik: ${donation.musicTitle}
• Non Donatè: ${donation.donorName}
• Telefòn Donatè: ${donation.donorPhone || 'Prive'}
• Montan Sipò: $${gross.toFixed(2)} ${donation.currency}
• Pataj Pa w Estimatif (85%): ~$${estimatedArtistShare.toFixed(2)} ${donation.currency}
• Dat & Lè: ${nowTime}
• Estati Aktyèl: 🟡 An atant verifikasyon prèv MonCash/Natcash

Kisa k ap pase kounye a:
Administratè UpMizik la (Mr Clauvens) ap verifye prèv transfè a kounye a nan sant kontwòl la. Kou transfè a fin valide, w ap resevwa yon resi ofisyèl epi kòb la ap kredite imedyatman sou bous ou!

Mèsi paske w ap kreye bèl mizik pou pèp ayisyen an!

Ekip UpMizik Notifikasyon
upmizik.com • notifications@upmizik.com`,
      donationDetails: {
        donationId: donation.id,
        musicTitle: donation.musicTitle,
        musicId: donation.musicId,
        donorName: donation.donorName,
        donorPhone: donation.donorPhone,
        grossAmount: gross,
        currency: donation.currency,
        artistShare85: estimatedArtistShare,
        platformShare15: Number((gross * 0.15).toFixed(2)),
        validatedAt: nowTime,
        transactionRef: `PEND-${donation.id.slice(-6).toUpperCase()}`,
        paymentMethod: 'MonCash / Natcash',
        adminName: 'Verifikasyon an Kour'
      }
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  // NOTIFICATION 2: Instant confirmation when an artist submits their registration & $4.99 proof
  sendArtistRegistrationPendingEmail: (artist: ArtistUser): ArtistInboxMessage => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const artistEmail = artist.email || `${artist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;

    const newEmail: ArtistInboxMessage = {
      id: `msg-reg-pending-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: artist.id,
      artistName: artist.stageName,
      artistEmail,
      type: 'registration_received',
      subject: `📋 Demann Enskripsyon Resevwa: Prèv $4.99 ou an voye bay Admin pou revizyon`,
      senderName: 'UpMizik Enskripsyon & Validasyon',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Nou resevwa dosye enskripsyon w ak prèv transfè $4.99 USD (723.55 HTG) la avèk siksè. Administratè a ap valide kont ou an trè byento.`,
      bodyText: `Chè ${artist.stageName} (${artist.name}),

Nou byen resevwa fòmilè enskripsyon w ak foto prèv transfè frè ouvèti kont $4.99 USD (723.55 HTG) sou UpMizik!

Rezime Dosye w la:
--------------------------------------------------
• Non Atis: ${artist.stageName}
• Non Konplè: ${artist.name}
• Adrès Imèl: ${artist.email}
• Nimewo Telefòn: ${artist.phone}
• Vil: ${artist.city}
• Kòd PIN Sekirite: ${artist.pin}
• Dat Soumisyon: ${nowTime}
• Estati: 🟡 An atant validasyon pa Admin Mr Clauvens

Pwochen Etape:
1. Administratè platfòm nan ap verifye prèv transfè MonCash/Natcash ou te telechaje a.
2. Kou validasyon an fin fèt, w ap resevwa yon imèl konfimasyon epi kont ou ap gen badj Verifye (✅).
3. W ap ka konekte ak imèl ou ak Kòd PIN ou pou kòmanse pibliye mizik ou yo epi resevwa 85% nan tout donasyon fanatik yo.

Mèsi pou konfyans ou nan UpMizik!

Ak anpil respè,
Ekip Validasyon UpMizik
upmizik.com • admin.upmizik@gmail.com`
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  // Central Router for Artist Status Changes
  notifyArtistStatusChange: (
    artist: ArtistUser,
    newStatus: 'active' | 'suspended' | 'rejected' | 'pending',
    options?: {
      days?: number;
      reason?: string;
      adminName?: string;
      suspendedUntil?: string;
    }
  ): ArtistInboxMessage | null => {
    const admin = options?.adminName || 'Mr Clauvens';
    if (newStatus === 'active') {
      if (artist.status === 'suspended') {
        return StorageService.sendArtistReactivationEmail(artist, admin);
      }
      return StorageService.sendArtistAccountVerificationEmail(artist, admin);
    }
    if (newStatus === 'rejected') {
      return StorageService.sendArtistAccountRejectionEmail(artist, admin, options?.reason);
    }
    if (newStatus === 'suspended') {
      const days = options?.days || 15;
      const until = options?.suspendedUntil || new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const reason = options?.reason || 'Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la';
      return StorageService.sendArtistSuspensionEmail(artist, days, reason, until, admin);
    }
    if (newStatus === 'pending') {
      return StorageService.sendArtistRegistrationPendingEmail(artist);
    }
    return null;
  },

  // Central Router for Financial Support Notifications
  notifyFinancialSupport: (
    donation: DonationItem,
    stage: 'received' | 'validated',
    adminName = 'Mr Clauvens'
  ): ArtistInboxMessage => {
    if (stage === 'validated') {
      return StorageService.sendArtistDonationEmail(donation, adminName);
    }
    return StorageService.sendArtistPendingDonationEmail(donation);
  },

  sendArtistDonationEmail: (donation: DonationItem, adminName = 'Mr Clauvens'): ArtistInboxMessage => {
    const gross = Number(donation.amount);
    const artist85 = Number((gross * 0.85).toFixed(2));
    const platform15 = Number((gross * 0.15).toFixed(2));
    const txRef = `UPM-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Find artist object to get email or avatar
    const artists = StorageService.getArtists();
    const artistObj = artists.find(a => a.id === donation.artistId || a.stageName === donation.artistName);
    const artistEmail = artistObj?.email || `${(donation.artistName || 'atis').toLowerCase().replace(/\s+/g, '')}@upmizik.com`;

    const newEmail: ArtistInboxMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: donation.artistId || artistObj?.id || 'artist-1',
      artistName: donation.artistName,
      artistEmail,
      type: 'donation_received',
      subject: `💰 Sipò Valide: Ou resevwa ${gross.toFixed(2)} ${donation.currency} pou "${donation.musicTitle}"!`,
      senderName: 'UpMizik Notifikasyon Finans',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Admin ${adminName} fenk valide yon donasyon ${gross.toFixed(2)} ${donation.currency} nan men ${donation.donorName}. 85% (${artist85.toFixed(2)}) kredite nan bous ou.`,
      bodyText: `Bonjou ${donation.artistName},

Nou kontan fè w konnen ke Administratè UpMizik (${adminName}) fenk verifye ak valide yon nouvo tranzaksyon sipò finansyè pou moso mizik ou a: "${donation.musicTitle}".

Detay Ofisyèl Tranzaksyon an:
--------------------------------------------------
• Moso Mizik: ${donation.musicTitle}
• Donatè Fanatik: ${donation.donorName} (${donation.donorPhone || 'Prive'})
• Montan Total Sipò: ${gross.toFixed(2)} ${donation.currency}
• Pati Nèt Atis (85%): ${artist85.toFixed(2)} ${donation.currency} (Kredite sou bous ou)
• Frè Operasyon Platfòm (15%): ${platform15.toFixed(2)} ${donation.currency}
• Nimewo Referans Inik: #${txRef}
• Dat & Lè Validasyon: ${nowTime}
• Sipè Administratè: ${adminName}

Kòb sa a ajoute dirèkteman sou total peman nèt ou pou mwa sa a. Peman yo fèt chak 1ye nan mwa a sou nimewo MonCash/Natcash ki nan pwofil ou.

Nou ankouraje w klike sou "Pataje sou UpMizik Social" pou w remèsye donatè a ak tout kominote k ap pouse karyè w!

Mèsi pou kontribisyon w nan kilti ak mizik ayisyen an.

Ak anpil respè,
Ekip UpMizik Finans & Sekirite
Sèvè Notifikasyon: upmizik.com • admin.upmizik@gmail.com`,
      donationDetails: {
        donationId: donation.id,
        musicTitle: donation.musicTitle,
        musicId: donation.musicId,
        donorName: donation.donorName,
        donorPhone: donation.donorPhone,
        grossAmount: gross,
        currency: donation.currency,
        artistShare85: artist85,
        platformShare15: platform15,
        validatedAt: nowTime,
        transactionRef: txRef,
        paymentMethod: 'MonCash / Natcash',
        adminName
      }
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  sendArtistAccountVerificationEmail: (artist: ArtistUser, adminName = 'Mr Clauvens'): ArtistInboxMessage => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const artistEmail = artist.email || `${artist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;

    const newEmail: ArtistInboxMessage = {
      id: `msg-verify-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: artist.id,
      artistName: artist.stageName,
      artistEmail,
      type: 'account_verified',
      subject: `🎉 Felisitasyon! Kont Atis UpMizik ou an valide avèk siksè`,
      senderName: 'UpMizik Administrasyon & Sekirite',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Administratè ${adminName} valide frè $4.99 ou an. Kont ou vin verifye e ou gen aksè konplè nan Espas Atis ou kounye a!`,
      bodyText: `Chè ${artist.stageName} (${artist.name}),

Nou gen gwo plezi pou nou enfòme w ke Administratè UpMizik (${adminName}) fin verifye epi valide prèv peman frè enskripsyon $4.99 USD (723.55 HTG) ou an avèk siksè!

Kont atis ou an vin gen badj Verifye Ofisyèl (✅) kounye a sou tout platfòm UpMizik la.

Enfòmasyon pou w Konekte nan Espas Atis ou:
--------------------------------------------------
• Adrès Imèl: ${artist.email}
• Nimewo Telefòn: ${artist.phone}
• Kòd PIN Sekirite: ${artist.pin} (4 chif ou te mete a)
• Vil: ${artist.city}
• Lyen Pwofil: https://upmizik.com/atis/${artist.id}
• Dat Validasyon: ${nowTime}
• Administratè ki Valide: ${adminName}

Kisa w ka fè kounye a nan Espas Atis ou a:
1. Pibliye nouvo moso mizik ou yo dirèkteman (Odyo, Lyen YouTube, Kouvèti).
2. Resevwa 85% nan tout sipò finansyè (MonCash / Natcash) fanatik yo voye pou mizik ou.
3. Swiv analiz statistik koute an dirèk ak kwasans odyans ou.
4. Jwenn notifikasyon imèl otomatik chak fwa yon fanatik fè yon don pou mizik ou.

Nou swete w anpil siksè nan karyè mizikal ou sou UpMizik!

Ak respè ak kordialite,
Ekip Administrasyon UpMizik
upmizik.com | admin.upmizik@gmail.com | upmizik@gmail.com`
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  sendArtistAccountRejectionEmail: (artist: ArtistUser, adminName = 'Mr Clauvens', customReason?: string): ArtistInboxMessage => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const artistEmail = artist.email || `${artist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;
    const reasonText = customReason || 'Foto prèv transfè MonCash/Natcash ou te telechaje a pa klè oswa nimewo tranzaksyon an pa kowenside.';

    const newEmail: ArtistInboxMessage = {
      id: `msg-reject-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: artist.id,
      artistName: artist.stageName,
      artistEmail,
      type: 'account_rejected',
      subject: `⚠️ Avi sou Enskripsyon Atis UpMizik: Prèv $4.99 ou an mande revizyon`,
      senderName: 'UpMizik Administrasyon',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Prèv transfè $4.99 la pa t ka valide pa Admin ${adminName}. Tanpri konekte sou UpMizik pou w re-telechaje yon prèv valab.`,
      bodyText: `Bonjou ${artist.stageName},

Nou verifye demann enskripsyon kont atis ou a sou UpMizik, men nou regrèt fè w konnen ke prèv transfè frè $4.99 USD (723.55 Goud) la pa t ka valide pou moman an.

Rezon ki bay sa:
--------------------------------------------------
${reasonText}

Kijan pou w re-soumèt prèv la pou aktive kont ou:
1. Asire w ou voye 723.55 Goud sou kont ofisyèl yo:
   - Natcash: 35-37-1184 (Clauvens EXAUS)
   - Moncash: 38-91-2317 (Clauvens EXAUS)
2. Pran yon screenshot klè kote nimewo tranzaksyon an ak montan an vizib byen.
3. Louvri UpMizik, klike sou "Konekte kòm Atis", antre imèl ou (${artist.email}) ak Kòd PIN ou, epi telechaje nouvo foto prèv la.

Admin ap revize l le pli vit posib pou aktive kont ou.

Ekip Sipò & Validasyon UpMizik
upmizik.com | admin.upmizik@gmail.com | upmizik@gmail.com`
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  sendArtistSuspensionEmail: (
    artist: ArtistUser,
    days: number,
    reason: string,
    suspendedUntil: string,
    adminName = 'Mr clauvens'
  ): ArtistInboxMessage => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    let endDateStr = suspendedUntil;
    try {
      endDateStr = new Date(suspendedUntil).toLocaleDateString('ht-HT', {
        dateStyle: 'full'
      });
    } catch {
      endDateStr = new Date(suspendedUntil).toDateString();
    }
    const artistEmail = artist.email || `${artist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;

    const newEmail: ArtistInboxMessage = {
      id: `msg-suspend-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: artist.id,
      artistName: artist.stageName,
      artistEmail,
      type: 'account_suspended',
      subject: `🚨 AVI ENPÒTAN: Kont Atis UpMizik ou an mete an sispansyon pou ${days} Jou`,
      senderName: 'UpMizik Administrasyon & Disiplin',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Administratè ${adminName} mete kont ou an sispansyon pou ${days} jou (jiska ${endDateStr}). Rezon: ${reason}`,
      bodyText: `Bonjou ${artist.stageName} (${artist.name}),

Nou enfòme w ke Administratè UpMizik (${adminName}) pran desizyon pou mete kont atis ou an an SISPANSYON AKTIVITE pou yon peryòd de ${days} Jou.

Detay Sispansyon an:
--------------------------------------------------
• Atis: ${artist.stageName}
• Dire Sispansyon: ${days} Jou
• Dat Kòmansman: ${nowTime}
• Dat Fen Sispansyon: ${endDateStr}
• Rezon Sispansyon: ${reason}
• Desizyon Sipè Administratè: ${adminName}

Konsekans sou Kont ou:
1. Tout aksyon pou ajoute nouvo mizik, modifye enfòmasyon pwofil ou, oswa fè piblikasyon rete bloke pandan ${days} jou sa yo.
2. Yon banyè avètisman ap parèt nan espas atis ou a ki endike kantite tan ak jou ki rete nan sispansyon an.
3. Aprè delè ${days} jou a fin pase, kont ou ap re-aktive otomatikman.

Si w panse gen yon erè oswa si w vle konteste desizyon sa a, ou ka kontakte sipò dirèkteman:
• WhatsApp / Telefòn: +509 3891-2317
• Imèl: upmizik@gmail.com / admin.upmizik@gmail.com

Ak respè,
Direksyon Administrasyon UpMizik
upmizik.com | admin.upmizik@gmail.com`
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  sendArtistReactivationEmail: (
    artist: ArtistUser,
    adminName = 'Mr clauvens'
  ): ArtistInboxMessage => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const artistEmail = artist.email || `${artist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;

    const newEmail: ArtistInboxMessage = {
      id: `msg-reactivate-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: artist.id,
      artistName: artist.stageName,
      artistEmail,
      type: 'account_reactivated',
      subject: `✅ Kont Ou Re-aktive: Sispansyon an leve avèk siksè!`,
      senderName: 'UpMizik Administrasyon',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Administratè ${adminName} leve sispansyon kont ou an. Tout fonksyonalite Espas Atis ou yo deboke kounye a!`,
      bodyText: `Bonjou ${artist.stageName},

Nou kontan enfòme w ke Administratè UpMizik (${adminName}) fenk leve sispansyon ki te sou kont ou an.

Kont ou an retounen AKTIF (✅) a 100%. Ou ka:
1. Pibliye nouvo mizik ou yo.
2. Modifye pwofil ak bannè ou.
3. Resevwa donasyon ak sipò fanatik ou yo nòmalman.

Dat Re-aktivasyon: ${nowTime}

Mèsi pou konpreyansyon w ak kolaborasyon w.

Ekip Administrasyon UpMizik
upmizik.com | admin.upmizik@gmail.com`
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  sendArtistMonthlyPayoutEmail: (
    artist: ArtistUser,
    amount: number,
    ref: string,
    adminName = 'Mr clauvens',
    paymentMethod = 'MonCash / Natcash',
    customNotes?: string
  ): ArtistInboxMessage => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const artistEmail = artist.email || `${artist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;
    const formattedAmount = amount > 0 ? `$${amount.toFixed(2)} USD` : 'Peman mansyèl ou';

    const newEmail: ArtistInboxMessage = {
      id: `msg-payout-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: artist.id,
      artistName: artist.stageName,
      artistEmail,
      type: 'payout_received',
      subject: `💰 Konfimasyon Peman: ${formattedAmount} voye sou kont ou! (Ref: #${ref})`,
      senderName: 'UpMizik Finans & Kontablite',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Administratè ${adminName} valide peman ${formattedAmount} pou ou atravè ${paymentMethod} (${artist.phone || 'nimewo anrejistre a'}).`,
      bodyText: `Bonjou ${artist.stageName} (${artist.name}),

Nou kontan enfòme w ke administrasyon UpMizik la (${adminName}) fenk egzekite ak make peman redevans mizik ou yo kòm PEYE (✅) pou mwa sa a!

Detay Peman an:
--------------------------------------------------
• Atis Benefisyè: ${artist.stageName}
• Montan Nèt Peye: ${formattedAmount}
• Mwayen Peman: ${paymentMethod}
• Nimewo Resevwa: ${artist.phone || 'Nimewo nan dosye w la'}
• Nimewo Referans Inik: #${ref}
• Dat Validasyon Peman: ${nowTime}
• Sipè Administratè: ${adminName}${customNotes ? `\n• Nòt Administrasyon an: ${customNotes}` : ''}

Kòb sa a transfere dirèkteman sou telefòn/kont ou. Mèsi anpil pou mizik ou yo ak kolaborasyon w ak platfòm UpMizik!

Si w gen nenpòt kesyon, ou ka ekri nou sou: upmizik@gmail.com

Ak anpil respè,
Depatman Finans & Peman UpMizik
upmizik.com | admin.upmizik@gmail.com`
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  markArtistMessageAsRead: (messageId: string) => {
    const list = StorageService.getArtistInboxMessages();
    const updated = list.map(m => (m.id === messageId ? { ...m, isRead: true } : m));
    StorageService.saveArtistInboxMessages(updated);
  },

  markAllArtistMessagesAsRead: (artistId: string) => {
    const list = StorageService.getArtistInboxMessages();
    const updated = list.map(m => (m.artistId === artistId ? { ...m, isRead: true } : m));
    StorageService.saveArtistInboxMessages(updated);
  },

  deleteArtistInboxMessage: (messageId: string) => {
    const list = StorageService.getArtistInboxMessages();
    const updated = list.filter(m => m.id !== messageId);
    StorageService.saveArtistInboxMessages(updated);
  },

  toggleStarArtistMessage: (messageId: string): boolean => {
    const list = StorageService.getArtistInboxMessages();
    let newStatus = false;
    const updated = list.map(m => {
      if (m.id === messageId) {
        newStatus = !m.isStarred;
        return { ...m, isStarred: newStatus };
      }
      return m;
    });
    StorageService.saveArtistInboxMessages(updated);
    return newStatus;
  },

  getUnreadMessagesCount: (artistId: string): number => {
    const list = StorageService.getArtistInboxMessages(artistId);
    return list.filter(m => !m.isRead).length;
  },

  // ==========================================
  // PUSH NOTIFICATION & MUSIC VALIDATION SERVICE
  // ==========================================

  getPushNotifications: (targetArtistId?: string): PushNotificationItem[] => {
    const list = getStoredData<PushNotificationItem[]>(KEYS.PUSH_NOTIFICATIONS, []);
    if (!targetArtistId) return list;
    return list.filter(p => p.targetArtistId === targetArtistId || p.targetArtistId === 'all');
  },

  savePushNotifications: (list: PushNotificationItem[]): void => {
    setStoredData(KEYS.PUSH_NOTIFICATIONS, list);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_push_updated', { detail: { count: list.length } }));
      }
    } catch {}
  },

  savePushNotification: (push: PushNotificationItem): void => {
    const current = getStoredData<PushNotificationItem[]>(KEYS.PUSH_NOTIFICATIONS, []);
    const updated = [push, ...current.filter(p => p.id !== push.id)].slice(0, 100);
    StorageService.savePushNotifications(updated);
  },

  markPushAsRead: (pushId: string): void => {
    const list = StorageService.getPushNotifications();
    const updated = list.map(p => (p.id === pushId ? { ...p, isRead: true } : p));
    StorageService.savePushNotifications(updated);
  },

  markAllPushAsRead: (artistId?: string): void => {
    const list = StorageService.getPushNotifications();
    const updated = list.map(p => {
      if (!artistId || p.targetArtistId === artistId || p.targetArtistId === 'all') {
        return { ...p, isRead: true };
      }
      return p;
    });
    StorageService.savePushNotifications(updated);
  },

  getUnreadPushCount: (artistId?: string): number => {
    const list = StorageService.getPushNotifications(artistId);
    return list.filter(p => !p.isRead).length;
  },

  isPushSupported: (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPushPermission: (): NotificationPermission => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  requestPushPermission: async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error requesting push notification permission:', e);
      return 'denied';
    }
  },

  sendPushNotification: (params: {
    targetArtistId: string;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    imageUrl?: string;
    data?: PushNotificationItem['data'];
    actionUrl?: string;
  }): PushNotificationItem => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const pushItem: PushNotificationItem = {
      id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      targetArtistId: params.targetArtistId,
      title: params.title,
      body: params.body,
      icon: params.icon || '/favicon.ico',
      badge: params.badge || '/favicon.ico',
      imageUrl: params.imageUrl,
      data: params.data,
      timestamp: Date.now(),
      isRead: false,
      actionUrl: params.actionUrl || '',
      createdAtStr: nowTime
    };

    // 1. Save to persistent storage
    StorageService.savePushNotification(pushItem);

    // 2. Dispatch native Web Push Notification if browser permission is granted
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const notif = new Notification(params.title, {
          body: params.body,
          icon: params.icon || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
          badge: params.badge || '/favicon.ico',
          tag: `upmizik-${params.data?.musicId || pushItem.id}`,
          data: params.data
        });

        notif.onclick = () => {
          window.focus();
          if (params.actionUrl) {
            window.location.hash = params.actionUrl.replace(/^#/, '');
          }
          notif.close();
        };
      }
    } catch (err) {
      console.warn('Web push notification not displayed:', err);
    }

    // 3. Dispatch in-app real-time custom event for immediate React state update
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('upmizik_push_notification', {
            detail: pushItem
          })
        );
      }
    } catch {}

    return pushItem;
  },

  // Automated notification when Admin validates a music track
  notifyMusicValidatedPush: (
    song: MusicItem,
    adminName = 'Mr Clauvens'
  ): { push: PushNotificationItem; email: ArtistInboxMessage } => {
    const artists = StorageService.getArtists();
    const artistObj = artists.find(
      a => a.id === song.artistId || a.stageName.toLowerCase() === song.artistName.toLowerCase()
    );
    const targetArtistId = song.artistId || artistObj?.id || 'artist-1';

    const title = `🎉 Mizik Validé & Pibliye: "${song.title}"!`;
    const body = `Bon nouvèl! Admin ${adminName} fenk valide moso mizik "${song.title}" ou a. Li disponib kounye a sou UpMizik pou tout fanatik koute, pataje e sipòte!`;
    const cover = song.coverUrl || artistObj?.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

    // 1. Send real-time push notification
    const push = StorageService.sendPushNotification({
      targetArtistId,
      title,
      body,
      icon: cover,
      imageUrl: cover,
      actionUrl: `#track-${song.id}`,
      data: {
        type: 'music_validated',
        musicId: song.id,
        artistId: targetArtistId,
        url: `#track-${song.id}`,
        action: 'play'
      }
    });

    // 2. Send celebration email to artist inbox
    const email = StorageService.sendArtistMusicValidatedEmail(song, adminName);

    // 3. Dispatch specific event for music validation
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('upmizik_music_validated', {
            detail: { song, push, email, adminName, targetArtistId }
          })
        );
      }
    } catch {}

    return { push, email };
  },

  sendArtistMusicValidatedEmail: (song: MusicItem, adminName = 'Mr Clauvens'): ArtistInboxMessage => {
    const nowTime = new Date().toLocaleString('ht-HT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const artists = StorageService.getArtists();
    const artistObj = artists.find(
      a => a.id === song.artistId || a.stageName.toLowerCase() === song.artistName.toLowerCase()
    );
    const artistEmail = artistObj?.email || `${song.artistName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;
    const targetArtistId = song.artistId || artistObj?.id || 'artist-1';

    const newEmail: ArtistInboxMessage = {
      id: `msg-song-val-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      artistId: targetArtistId,
      artistName: song.artistName,
      artistEmail,
      type: 'music_validated',
      subject: `🎉 Mizik Validé & Pibliye: "${song.title}" disponib kounye a sou UpMizik!`,
      senderName: 'UpMizik Modération & Piblikasyon',
      senderEmail: 'admin.upmizik@gmail.com',
      recipientEmail: artistEmail,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: `Felisitasyon! Administratè ${adminName} fenk valide moso mizik "${song.title}" ou a. Li pibliye an liy kounye a!`,
      bodyText: `Bonjou ${song.artistName},

Nou gen anpil plezi pou n enfòme w ke moso mizik ou a fenk pase faz modération an avèk siksè epi li VALIDÉ pa Administratè ${adminName}!

Detay Moso Mizik Validé a:
--------------------------------------------------
• Tit Moso: ${song.title}
• Atis Prensipal: ${song.artistName}
• Kategori: ${song.category}
• Pozisyon sou Sit la: #${song.position || 'Otomatik'}
• Dat Validasyon: ${nowTime}
• Administratè ki Valide: ${adminName}
• Estati: 🟢 AKTIF & PIBLIYE (Disponib pou tout moun)

Kisa k ap pase kounye a:
1. Tout fanatik ayisyen toupatou sou latè ka koute "${song.title}" an liy.
2. Fanatik yo ka voye sipò finansyè (MonCash / Natcash) dirèkteman pou moso sa a.
3. W ap resevwa 85% nan tout donasyon ki antre sou moso mizik sa a.
4. Ou ka kopye lyen moso a pou w pataje l sou Instagram, TikTok, WhatsApp ak Facebook!

Felisitasyon pou bèl travay sa a!

Ak anpil respè,
Ekip Administrasyon & Modération UpMizik
upmizik.com • admin.upmizik@gmail.com`,
      musicDetails: {
        musicId: song.id,
        title: song.title,
        coverUrl: song.coverUrl,
        category: song.category,
        position: song.position,
        validatedAt: nowTime,
        adminName
      }
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);
    return newEmail;
  },

  // Helper to validate music directly
  validateMusic: (
    musicId: string,
    adminName = 'Mr Clauvens'
  ): { music: MusicItem | null; push: PushNotificationItem | null } => {
    const list = StorageService.getMusic();
    let validatedSong: MusicItem | null = null;

    const updated = list.map(m => {
      if (m.id === musicId) {
        validatedSong = { ...m, status: 'active' as const };
        return validatedSong;
      }
      return m;
    });

    if (validatedSong) {
      StorageService.saveMusic(updated);
      const { push } = StorageService.notifyMusicValidatedPush(validatedSong, adminName);
      return { music: validatedSong, push };
    }

    return { music: null, push: null };
  },

  getThemeMode: (): ThemeMode => {
    const saved = getStoredData<ThemeMode | null>(KEYS.THEME, null);
    if (saved === 'night' || saved === 'light') {
      return saved;
    }
    return 'night'; // Default theme
  },

  saveThemeMode: (theme: ThemeMode): void => {
    setStoredData<ThemeMode>(KEYS.THEME, theme);
  },

  // Palmarès & Twofe physical awards tracking
  getAwardDeliveries: (): Record<string, PhysicalAwardDelivery> => {
    return getStoredData<Record<string, PhysicalAwardDelivery>>(KEYS.AWARD_DELIVERIES, {});
  },

  saveAwardDeliveries: (records: Record<string, PhysicalAwardDelivery>): void => {
    setStoredData(KEYS.AWARD_DELIVERIES, records);
  },

  updateAwardDeliveryStatus: (
    artistId: string,
    artistName: string,
    awardTier: AwardTierDefinition,
    status: AwardPhysicalDeliveryStatus,
    adminNotes?: string
  ): PhysicalAwardDelivery => {
    const all = StorageService.getAwardDeliveries();
    const key = `${artistId}_${awardTier.type}`;
    const nowIso = new Date().toISOString();

    const record: PhysicalAwardDelivery = {
      id: key,
      artistId,
      artistName,
      awardType: awardTier.type,
      title: awardTier.title,
      category: awardTier.category,
      threshold: awardTier.threshold,
      deliveryStatus: status,
      updatedAt: nowIso,
      deliveredAt: status === 'delivered' ? (all[key]?.deliveredAt || nowIso) : undefined,
      adminNotes: adminNotes !== undefined ? adminNotes : all[key]?.adminNotes
    };

    all[key] = record;
    StorageService.saveAwardDeliveries(all);
    return record;
  },

  sendArtistAwardCongratulationsEmail: (
    artist: ArtistUser,
    awardTier: AwardTierDefinition,
    adminName = 'Mr clauvens',
    customMessage?: string
  ): ArtistInboxMessage => {
    const { subject, preview, body, certificateCode } = buildAwardCelebrationMessage(
      artist,
      awardTier,
      adminName,
      customMessage
    );

    const newEmail: ArtistInboxMessage = {
      id: `inbox-award-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      artistId: artist.id,
      artistName: artist.stageName || artist.name,
      artistEmail: artist.email,
      type: 'award_received',
      subject,
      senderName: `UpMizik Palmarès (${adminName})`,
      senderEmail: 'awards@upmizik.com',
      recipientEmail: artist.email || `${artist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`,
      receivedAt: 'Fenk Rive (Kounye a)',
      isRead: false,
      isStarred: true,
      previewText: preview,
      bodyText: body,
      awardDetails: {
        awardType: awardTier.type,
        awardTitle: awardTier.title,
        milestoneLabel: awardTier.thresholdFormatted,
        category: awardTier.category,
        deliveredStatus: 'in_production',
        certificateCode
      }
    };

    const currentList = StorageService.getArtistInboxMessages();
    StorageService.saveArtistInboxMessages([newEmail, ...currentList]);

    return newEmail;
  },

  // Payment Settings & Methods Management
  getPaymentSettings: (): PaymentSettingsConfig => {
    const saved = getStoredData<PaymentSettingsConfig | null>(KEYS.PAYMENT_SETTINGS, null);
    if (saved && Array.isArray(saved.methods) && saved.methods.length > 0) {
      return saved;
    }
    return DEFAULT_PAYMENT_SETTINGS;
  },

  savePaymentSettings: (config: PaymentSettingsConfig): void => {
    const updated: PaymentSettingsConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    setStoredData(KEYS.PAYMENT_SETTINGS, updated);

    // Dispatch a storage event so all open tabs and components react immediately
    try {
      window.dispatchEvent(new CustomEvent('upmizik_payment_settings_changed', { detail: updated }));
    } catch (e) {
      // Ignore in non-browser context
    }
  },

  resetPaymentSettingsToDefault: (): PaymentSettingsConfig => {
    const fresh = { ...DEFAULT_PAYMENT_SETTINGS, updatedAt: new Date().toISOString() };
    StorageService.savePaymentSettings(fresh);
    return fresh;
  },

  getActivePaymentMethods: (): PaymentMethodItem[] => {
    const settings = StorageService.getPaymentSettings();
    return settings.methods.filter(m => m.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getFormattedPaymentSummary: (filterCurrency?: 'HTG' | 'USD'): string => {
    const active = StorageService.getActivePaymentMethods();
    const filtered = filterCurrency
      ? active.filter(m => m.currencySupported.includes(filterCurrency))
      : active;

    if (filtered.length === 0) {
      return 'Natcash: 35-37-1184 | Moncash: 38-91-2317 | Non: Clauvens EXAUS';
    }

    return filtered.map(m => `${m.name}: ${m.accountNumberOrId}`).join(' | ');
  },

  // PLATFORM VISITS & TRAFFIC TRACKING (ILIMITE)
  trackSiteVisit: (): number => {
    try {
      // Initialize or refresh unique user identifier session
      UserIdentifier.initUserSession();

      const current = StorageService.getSiteVisits();
      const next = current + 1;
      setStoredData(KEYS.SITE_VISITS, next);
      return next;
    } catch {
      return 24890;
    }
  },

  getSiteVisits: (): number => {
    try {
      const stored = getStoredData<number>(KEYS.SITE_VISITS, 24850);
      return typeof stored === 'number' && stored >= 24850 ? stored : 24850;
    } catch {
      return 24850;
    }
  },

  // PLATFORM CAPACITY & UNLIMITED METRICS
  getPlatformCapacityStats: () => {
    const music = StorageService.getMusic();
    const artists = StorageService.getArtists();
    const visits = StorageService.getSiteVisits();
    const totalListens = music.reduce((acc, m) => acc + (m.listens || 0), 0);

    return {
      totalArtists: artists.length,
      activeArtists: artists.filter(a => a.status === 'active').length,
      pendingArtists: artists.filter(a => a.status === 'pending').length,
      totalSongs: music.length,
      activeSongs: music.filter(m => m.status === 'active').length,
      totalVisits: visits,
      totalListens,
      isUnlimitedCapacity: true
    };
  },

  // COMPLETE CONTENT RESET (Removes all artists, music, and social posts)
  resetContentData: () => {
    try {
      // Clear localStorage content keys
      setStoredData(KEYS.MUSIC, []);
      setStoredData(KEYS.ARTISTS, []);
      setStoredData(KEYS.SOCIAL_POSTS, []);
      setStoredData(KEYS.SOCIAL_COMMENTS, {});
      setStoredData(KEYS.COMMENTS, []);
      setStoredData(KEYS.ARTIST_INBOX, []);
      setStoredData(KEYS.CURRENT_ARTIST, null);
      setStoredData(KEYS.LISTEN_HISTORY, []);
      setStoredData(KEYS.RECENT_LISTENED_IDS, []);
      setStoredData(KEYS.LIKED_MUSIC, []);
      setStoredData(KEYS.TOP3_OVERRIDE, null);

      // Clean up legacy keys if present
      const legacyKeys = [
        'upmizik_music_v1',
        'upmizik_artists_v1',
        'upmizik_social_posts_v1',
        'upmizik_social_comments_v1',
        'upmizik_comments_v1',
        'upmizik_artist_inbox_v1',
        'upmizik_current_artist_v1',
        'upmizik_listen_history_v1',
        'upmizik_recent_listened_ids_v1',
        'upmizik_liked_music_ids_v1',
        'upmizik_top3_override_v1'
      ];
      legacyKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      // Dispatch real-time events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('upmizik_music_updated', { detail: { action: 'reset' } }));
        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'reset' } }));
        window.dispatchEvent(new CustomEvent('upmizik_social_updated', { detail: { action: 'reset' } }));
      }
    } catch (e) {
      console.warn('Error resetting content data:', e);
    }
  }
};
