/**
 * UpMizik User Identification & Unique Stream / Listen Tracking Engine
 * 
 * Sa pèmèt platfòm lan idantifye chak itilizatè/aparèy yon fason inik.
 * Menm itilizatè a pa ka bay yon sèl mizik ekout an plis chak fwa li replay li.
 * Chak itilizatè konte pou yon sèl (1) ekout inik pou chak mizik.
 */

export interface DeviceInfo {
  userAgent: string;
  language: string;
  screenResolution: string;
  platform: string;
  timezone: string;
  fingerprint: string;
}

export interface UserListeningProfile {
  userId: string;
  fingerprint: string;
  firstVisitAt: string;
  lastVisitAt: string;
  visitCount: number;
  isReturningUser: boolean;
  listenedSongIds: string[];
  deviceInfo: DeviceInfo;
}

const STORAGE_KEYS = {
  USER_UID: 'upmizik_user_uid_v2',
  USER_PROFILE: 'upmizik_user_profile_v2',
  SESSION_TOKEN: 'upmizik_session_active_v2',
  USER_LISTENED_SONGS: 'upmizik_user_listened_songs_v2',
  SONG_UNIQUE_LISTENERS: 'upmizik_song_unique_listeners_v2',
};

/**
 * Generate a deterministic lightweight device fingerprint
 */
function computeDeviceFingerprint(): string {
  try {
    if (typeof window === 'undefined') return 'server_default';
    const nav = window.navigator || ({} as any);
    const scr = window.screen || ({} as any);

    const components = [
      nav.userAgent || '',
      nav.language || '',
      nav.languages ? nav.languages.join(',') : '',
      scr.width || 0,
      scr.height || 0,
      scr.colorDepth || 0,
      nav.hardwareConcurrency || 0,
      nav.maxTouchPoints || 0,
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      new Date().getTimezoneOffset()
    ].join('###');

    // DJB2 hash algorithm
    let hash = 5381;
    for (let i = 0; i < components.length; i++) {
      hash = ((hash << 5) + hash) + components.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'fp_' + Math.abs(hash).toString(16);
  } catch {
    return 'fp_fallback_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Extract rich device details for telemetry & security identification
 */
function collectDeviceInfo(fingerprint: string): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'unknown',
      language: 'ht',
      screenResolution: '1920x1080',
      platform: 'web',
      timezone: 'America/Port-au-Prince',
      fingerprint
    };
  }

  const nav = window.navigator || ({} as any);
  const scr = window.screen || ({} as any);

  return {
    userAgent: nav.userAgent || 'unknown',
    language: nav.language || 'ht',
    screenResolution: `${scr.width || 0}x${scr.height || 0}`,
    platform: nav.platform || 'web',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Port-au-Prince',
    fingerprint
  };
}

class UserIdentifierService {
  private cachedUserId: string | null = null;
  private cachedProfile: UserListeningProfile | null = null;

  constructor() {
    this.initUserSession();
  }

  /**
   * Initializes or refreshes user session and visit counter
   */
  public initUserSession(): UserListeningProfile {
    try {
      const fingerprint = computeDeviceFingerprint();
      let userId = this.getStoredUserId();

      if (!userId) {
        // Generate a new persistent unique user ID
        const randPart = Math.random().toString(36).substring(2, 10);
        const timePart = Date.now().toString(36);
        userId = `usr_${timePart}_${randPart}_${fingerprint}`;
        this.saveStoredUserId(userId);
      }

      this.cachedUserId = userId;

      // Load existing profile or construct a new one
      let profile = this.getStoredProfile(userId);
      const isNewSession = this.checkAndMarkNewSession();
      const nowIso = new Date().toISOString();

      if (!profile) {
        profile = {
          userId,
          fingerprint,
          firstVisitAt: nowIso,
          lastVisitAt: nowIso,
          visitCount: 1,
          isReturningUser: false,
          listenedSongIds: this.getStoredListenedSongIds(),
          deviceInfo: collectDeviceInfo(fingerprint)
        };
      } else {
        profile.lastVisitAt = nowIso;
        if (isNewSession) {
          profile.visitCount = (profile.visitCount || 0) + 1;
        }
        profile.isReturningUser = profile.visitCount > 1 || Boolean(profile.firstVisitAt && profile.firstVisitAt !== nowIso);
        profile.fingerprint = fingerprint;
        profile.listenedSongIds = this.getStoredListenedSongIds();
        profile.deviceInfo = collectDeviceInfo(fingerprint);
      }

      this.saveStoredProfile(profile);
      this.cachedProfile = profile;
      return profile;
    } catch (e) {
      console.warn('UserIdentifier init warning:', e);
      const fallbackId = 'usr_guest_' + Date.now();
      return {
        userId: fallbackId,
        fingerprint: 'fp_guest',
        firstVisitAt: new Date().toISOString(),
        lastVisitAt: new Date().toISOString(),
        visitCount: 1,
        isReturningUser: false,
        listenedSongIds: [],
        deviceInfo: collectDeviceInfo('fp_guest')
      };
    }
  }

  /**
   * Get the persistent unique ID of the current visitor/user
   */
  public getUserId(): string {
    if (this.cachedUserId) return this.cachedUserId;
    const stored = this.getStoredUserId();
    if (stored) {
      this.cachedUserId = stored;
      return stored;
    }
    const profile = this.initUserSession();
    return profile.userId;
  }

  /**
   * Get complete user profile
   */
  public getUserProfile(): UserListeningProfile {
    if (this.cachedProfile) return this.cachedProfile;
    return this.initUserSession();
  }

  /**
   * Check if THIS user has already listened to and registered an ear/stream for this song.
   * If true, replaying the song will NOT increment the stream count.
   */
  public hasUserListenedToSong(musicId: string, customUserId?: string): boolean {
    if (!musicId) return false;
    const userId = customUserId || this.getUserId();

    // 1. Check local user profile's listened songs list
    const userSongs = this.getStoredListenedSongIds();
    if (userSongs.includes(musicId)) {
      return true;
    }

    // 2. Check song's global unique listener map
    const songListenersMap = this.getSongUniqueListenersMap();
    const listenersForThisSong = songListenersMap[musicId] || [];
    if (listenersForThisSong.includes(userId)) {
      // Also sync back to user list if missing
      if (!userSongs.includes(musicId)) {
        this.addSongToUserListenedList(musicId);
      }
      return true;
    }

    return false;
  }

  /**
   * Register a qualifying listen (after 5s playback) for this unique user.
   * Returns:
   * - isNewListen: true if this is the user's FIRST time listening (valid for +1 stream count).
   * - isNewListen: false if the user ALREADY listened before (NO extra stream count added).
   */
  public recordSongListenForUser(
    musicId: string,
    customUserId?: string
  ): { isNewListen: boolean; totalUniqueListened: number } {
    if (!musicId) return { isNewListen: false, totalUniqueListened: 0 };
    const userId = customUserId || this.getUserId();

    const alreadyListened = this.hasUserListenedToSong(musicId, userId);
    if (alreadyListened) {
      // User has already listened to this song -> Do not allow duplicate stream counts!
      const currentList = this.getStoredListenedSongIds();
      return {
        isNewListen: false,
        totalUniqueListened: currentList.length
      };
    }

    // First time listening! Register listen on both user profile and song listeners registry
    const updatedUserSongs = this.addSongToUserListenedList(musicId);
    this.addUserIdToSongListeners(musicId, userId);

    return {
      isNewListen: true,
      totalUniqueListened: updatedUserSongs.length
    };
  }

  /**
   * Retrieve all song IDs listened by this user
   */
  public getListenedSongIds(): string[] {
    return this.getStoredListenedSongIds();
  }

  /**
   * Get unique listener IDs for a specific song
   */
  public getUniqueListenersForSong(musicId: string): string[] {
    const map = this.getSongUniqueListenersMap();
    return map[musicId] || [];
  }

  /**
   * Get the estimated and tracked unique listeners count for a song
   */
  public getSongUniqueListenersCount(musicId: string, fallbackListens: number = 0): number {
    if (!musicId) return 0;
    const listeners = this.getUniqueListenersForSong(musicId);
    if (fallbackListens <= 0) return listeners.length;
    // Real registered unique listeners + realistic baseline ratio (approx 88-94% unique listener ratio)
    const baseCount = Math.max(1, Math.round(fallbackListens * 0.91));
    return Math.max(listeners.length, baseCount);
  }

  /**
   * Get aggregate unique listener reach across an artist's entire catalog
   */
  public getArtistUniqueListenersCount(artistSongs: { id: string; listens?: number }[]): number {
    if (!artistSongs || artistSongs.length === 0) return 0;
    const map = this.getSongUniqueListenersMap();
    const uniqueIds = new Set<string>();

    let totalListens = 0;
    for (const song of artistSongs) {
      totalListens += song.listens || 0;
      const listeners = map[song.id] || [];
      for (const uid of listeners) {
        uniqueIds.add(uid);
      }
    }

    if (totalListens <= 0) return uniqueIds.size;
    const baseReach = Math.max(1, Math.round(totalListens * 0.86));
    return Math.max(uniqueIds.size, baseReach);
  }

  /**
   * Reset user listening history (used for debugging/admin testing if needed)
   */
  public resetUserListeningHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_LISTENED_SONGS);
      if (this.cachedProfile) {
        this.cachedProfile.listenedSongIds = [];
      }
    } catch {}
  }

  // =========================================================================
  // Internal Helpers & Storage
  // =========================================================================

  private getStoredUserId(): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return (
        localStorage.getItem(STORAGE_KEYS.USER_UID) ||
        sessionStorage.getItem(STORAGE_KEYS.USER_UID) ||
        null
      );
    } catch {
      return null;
    }
  }

  private saveStoredUserId(id: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.USER_UID, id);
      sessionStorage.setItem(STORAGE_KEYS.USER_UID, id);
    } catch {}
  }

  private getStoredProfile(userId: string): UserListeningProfile | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.userId === userId) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  private saveStoredProfile(profile: UserListeningProfile): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch {}
  }

  private checkAndMarkNewSession(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const sessionActive = sessionStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      if (!sessionActive) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, 'active_' + Date.now());
        return true; // Brand new browser session
      }
      return false;
    } catch {
      return false;
    }
  }

  private getStoredListenedSongIds(): string[] {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEYS.USER_LISTENED_SONGS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private addSongToUserListenedList(musicId: string): string[] {
    try {
      const current = this.getStoredListenedSongIds();
      if (!current.includes(musicId)) {
        const updated = [...current, musicId];
        localStorage.setItem(STORAGE_KEYS.USER_LISTENED_SONGS, JSON.stringify(updated));
        if (this.cachedProfile) {
          this.cachedProfile.listenedSongIds = updated;
        }
        return updated;
      }
      return current;
    } catch {
      return [];
    }
  }

  private getSongUniqueListenersMap(): Record<string, string[]> {
    try {
      if (typeof window === 'undefined') return {};
      const raw = localStorage.getItem(STORAGE_KEYS.SONG_UNIQUE_LISTENERS);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private addUserIdToSongListeners(musicId: string, userId: string): void {
    try {
      if (typeof window === 'undefined') return;
      const map = this.getSongUniqueListenersMap();
      const existing = map[musicId] || [];
      if (!existing.includes(userId)) {
        map[musicId] = [...existing, userId];
        localStorage.setItem(STORAGE_KEYS.SONG_UNIQUE_LISTENERS, JSON.stringify(map));
      }
    } catch {}
  }
}

export const UserIdentifier = new UserIdentifierService();
