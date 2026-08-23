// Client-side Service Worker & Offline Connectivity Manager for UpMizik Ayiti
import { MusicItem, OfflinePlaylist, OfflineQueueItem } from '../types';

const OFFLINE_TRACKS_KEY = 'upmizik_offline_tracks_v1';
const OFFLINE_PLAYLISTS_KEY = 'upmizik_offline_playlists_v1';
const OFFLINE_QUEUE_KEY = 'upmizik_offline_queue_v1';
const MAX_OFFLINE_TRACKS = 60;

type NetworkStatusListener = (isOnline: boolean, isIntermittent: boolean) => void;
type CacheUpdateListener = (cachedIds: string[]) => void;
type QueueUpdateListener = (queue: OfflineQueueItem[], isDownloading: boolean, overallProgress: number) => void;
type PlaylistUpdateListener = (playlists: OfflinePlaylist[]) => void;

class OfflineManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isIntermittent: boolean = false;
  private networkListeners: NetworkStatusListener[] = [];
  private cacheListeners: CacheUpdateListener[] = [];
  private queueListeners: QueueUpdateListener[] = [];
  private playlistListeners: PlaylistUpdateListener[] = [];
  private swRegistration: ServiceWorkerRegistration | null = null;
  private cachedTrackIds: Set<string> = new Set();
  private playlists: OfflinePlaylist[] = [];
  private downloadQueue: OfflineQueueItem[] = [];
  private isBatchDownloading: boolean = false;
  private cancelRequested: boolean = false;
  private checkInterval: any = null;

  constructor() {
    this.loadCachedIdsFromStorage();
    this.loadPlaylistsFromStorage();
    this.loadQueueFromStorage();
    if (typeof window !== 'undefined') {
      this.initNetworkListeners();
      this.initServiceWorker();
    }
  }

  private loadCachedIdsFromStorage() {
    try {
      const stored = localStorage.getItem(OFFLINE_TRACKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.cachedTrackIds = new Set(parsed);
        }
      }
    } catch {
      // Graceful storage read fallback
    }
  }

  private saveCachedIdsToStorage() {
    try {
      const arr = Array.from(this.cachedTrackIds).slice(-MAX_OFFLINE_TRACKS);
      localStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(arr));
    } catch {
      // Graceful storage write fallback
    }
  }

  private loadPlaylistsFromStorage() {
    try {
      const stored = localStorage.getItem(OFFLINE_PLAYLISTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.playlists = parsed;
          return;
        }
      }
    } catch {
      // Graceful fallback
    }

    // Default Initial Offline Playlist
    this.playlists = [
      {
        id: 'default-offline-playlist',
        title: 'Mizik Oflayn Mwen Yo',
        description: 'Playlist pèsonalize pou mizik ou vle koute san entènèt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trackIds: Array.from(this.cachedTrackIds),
        isDefault: true
      }
    ];
    this.savePlaylistsToStorage();
  }

  private savePlaylistsToStorage() {
    try {
      localStorage.setItem(OFFLINE_PLAYLISTS_KEY, JSON.stringify(this.playlists));
    } catch {
      // Graceful storage write fallback
    }
  }

  private loadQueueFromStorage() {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Reset any stuck "downloading" to "pending"
          this.downloadQueue = parsed.map(item => ({
            ...item,
            status: item.status === 'downloading' ? 'pending' : item.status
          }));
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.downloadQueue));
    } catch {
      // Graceful storage write fallback
    }
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleNetworkChange(false);
    });

    // Periodic lightweight ping to detect intermittent / dead connections
    this.checkInterval = setInterval(() => {
      this.checkRealConnectivity();
    }, 25000);
  }

  public async checkRealConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      this.handleNetworkChange(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(`/manifest.json?_t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (!this.isOnline || this.isIntermittent) {
          this.isIntermittent = false;
          this.handleNetworkChange(true);
        }
        return true;
      } else {
        this.isIntermittent = true;
        this.notifyNetworkListeners();
        return false;
      }
    } catch (err) {
      // Failed ping while navigator.onLine might be true = intermittent or offline
      this.isIntermittent = true;
      this.notifyNetworkListeners();
      return false;
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    if (!online) {
      this.isIntermittent = false;
    }
    this.notifyNetworkListeners();
  }

  private notifyNetworkListeners() {
    this.networkListeners.forEach(listener => listener(this.isOnline, this.isIntermittent));
  }

  private notifyCacheListeners() {
    const list = Array.from(this.cachedTrackIds);
    this.cacheListeners.forEach(listener => listener(list));
  }

  private notifyQueueListeners(overallProgress = 0) {
    this.queueListeners.forEach(listener => 
      listener([...this.downloadQueue], this.isBatchDownloading, overallProgress)
    );
  }

  private notifyPlaylistListeners() {
    this.playlistListeners.forEach(listener => listener([...this.playlists]));
  }

  public onNetworkChange(callback: NetworkStatusListener): () => void {
    this.networkListeners.push(callback);
    callback(this.isOnline, this.isIntermittent);
    return () => {
      this.networkListeners = this.networkListeners.filter(cb => cb !== callback);
    };
  }

  public onCacheChange(callback: CacheUpdateListener): () => void {
    this.cacheListeners.push(callback);
    callback(Array.from(this.cachedTrackIds));
    return () => {
      this.cacheListeners = this.cacheListeners.filter(cb => cb !== callback);
    };
  }

  public onQueueChange(callback: QueueUpdateListener): () => void {
    this.queueListeners.push(callback);
    callback([...this.downloadQueue], this.isBatchDownloading, 0);
    return () => {
      this.queueListeners = this.queueListeners.filter(cb => cb !== callback);
    };
  }

  public onPlaylistChange(callback: PlaylistUpdateListener): () => void {
    this.playlistListeners.push(callback);
    callback([...this.playlists]);
    return () => {
      this.playlistListeners = this.playlistListeners.filter(cb => cb !== callback);
    };
  }

  // Register Service Worker
  public async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        this.swRegistration = registration;

        // Listen for SW messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'CACHE_AUDIO_TRACK_RESULT') {
            const { trackId, success } = event.data.payload || {};
            if (trackId && success) {
              this.cachedTrackIds.add(trackId);
              this.saveCachedIdsToStorage();
              this.notifyCacheListeners();
            }
          }
        });

        // Query SW for existing cache stats
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_STATS' });
        }
      } catch {
        // Graceful silent fallback if in sandboxed iframe environment
      }
    }
  }

  // Automatically or manually cache a single song for offline access
  public async cacheTrackForOffline(track: MusicItem): Promise<boolean> {
    this.cachedTrackIds.add(track.id);
    this.saveCachedIdsToStorage();
    this.notifyCacheListeners();

    // Auto-add to default offline playlist if not present
    this.addTrackToPlaylist('default-offline-playlist', track.id);

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_AUDIO_TRACK',
        payload: {
          trackId: track.id,
          audioUrl: track.audioUrl,
          coverUrl: track.coverUrl
        }
      });
      return true;
    } else {
      if ('caches' in window) {
        try {
          const cache = await caches.open('upmizik-audio-v1.0.0');
          if (track.audioUrl && track.audioUrl.startsWith('http')) {
            const res = await fetch(track.audioUrl, { mode: 'cors' }).catch(() => null);
            if (res && res.ok) await cache.put(track.audioUrl, res);
          }
          if (track.coverUrl && track.coverUrl.startsWith('http')) {
            const res = await fetch(track.coverUrl, { mode: 'no-cors' }).catch(() => null);
            if (res) await cache.put(track.coverUrl, res);
          }
        } catch {
          // Silent fallback
        }
      }
      return true;
    }
  }

  // ==================== OFFLINE PLAYLISTS API ====================

  public getPlaylists(): OfflinePlaylist[] {
    return [...this.playlists];
  }

  public getPlaylistById(id: string): OfflinePlaylist | undefined {
    return this.playlists.find(p => p.id === id);
  }

  public createPlaylist(title: string, description?: string): OfflinePlaylist {
    const newPlaylist: OfflinePlaylist = {
      id: `offline-playlist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || 'Nouvo Playlist Oflayn',
      description: description?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackIds: [],
      isDefault: false
    };

    this.playlists.push(newPlaylist);
    this.savePlaylistsToStorage();
    this.notifyPlaylistListeners();
    return newPlaylist;
  }

  public updatePlaylist(id: string, updates: Partial<Omit<OfflinePlaylist, 'id' | 'createdAt'>>): void {
    const index = this.playlists.findIndex(p => p.id === id);
    if (index !== -1) {
      this.playlists[index] = {
        ...this.playlists[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.savePlaylistsToStorage();
      this.notifyPlaylistListeners();
    }
  }

  public deletePlaylist(id: string): boolean {
    const p = this.playlists.find(item => item.id === id);
    if (p && p.isDefault) {
      // Do not delete default playlist, just empty its track IDs
      p.trackIds = [];
      p.updatedAt = new Date().toISOString();
      this.savePlaylistsToStorage();
      this.notifyPlaylistListeners();
      return true;
    }

    this.playlists = this.playlists.filter(item => item.id !== id);
    this.savePlaylistsToStorage();
    this.notifyPlaylistListeners();
    return true;
  }

  public addTrackToPlaylist(playlistId: string, trackId: string): boolean {
    let playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist && playlistId === 'default-offline-playlist') {
      this.loadPlaylistsFromStorage();
      playlist = this.playlists.find(p => p.id === playlistId);
    }
    if (!playlist) return false;

    if (!playlist.trackIds.includes(trackId)) {
      playlist.trackIds.push(trackId);
      playlist.updatedAt = new Date().toISOString();
      this.savePlaylistsToStorage();
      this.notifyPlaylistListeners();
      return true;
    }
    return false;
  }

  public removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
      playlist.updatedAt = new Date().toISOString();
      this.savePlaylistsToStorage();
      this.notifyPlaylistListeners();
    }
  }

  // ==================== BATCH DOWNLOAD QUEUE API ====================

  public getQueue(): OfflineQueueItem[] {
    return [...this.downloadQueue];
  }

  public addToQueue(tracks: MusicItem | MusicItem[], targetPlaylistId?: string): number {
    const items = Array.isArray(tracks) ? tracks : [tracks];
    let addedCount = 0;

    for (const track of items) {
      // If already in queue, update target playlist
      const existing = this.downloadQueue.find(q => q.trackId === track.id);
      if (!existing) {
        this.downloadQueue.push({
          trackId: track.id,
          trackTitle: track.title,
          artistName: track.artistName,
          coverUrl: track.coverUrl,
          audioUrl: track.audioUrl,
          status: this.isTrackCached(track.id) ? 'completed' : 'pending',
          progress: this.isTrackCached(track.id) ? 100 : 0,
          addedAt: new Date().toISOString()
        });
        addedCount++;
      }

      if (targetPlaylistId) {
        this.addTrackToPlaylist(targetPlaylistId, track.id);
      } else {
        this.addTrackToPlaylist('default-offline-playlist', track.id);
      }
    }

    this.saveQueueToStorage();
    this.notifyQueueListeners();
    return addedCount;
  }

  public removeFromQueue(trackId: string): void {
    this.downloadQueue = this.downloadQueue.filter(q => q.trackId !== trackId);
    this.saveQueueToStorage();
    this.notifyQueueListeners();
  }

  public clearQueue(): void {
    this.downloadQueue = [];
    this.saveQueueToStorage();
    this.notifyQueueListeners();
  }

  public clearCompletedFromQueue(): void {
    this.downloadQueue = this.downloadQueue.filter(q => q.status !== 'completed');
    this.saveQueueToStorage();
    this.notifyQueueListeners();
  }

  public cancelBatchDownload(): void {
    if (this.isBatchDownloading) {
      this.cancelRequested = true;
      this.isBatchDownloading = false;
      this.notifyQueueListeners();
    }
  }

  public getIsBatchDownloading(): boolean {
    return this.isBatchDownloading;
  }

  /**
   * Start batch downloading all pending items in the queue with live progress simulation
   */
  public async startBatchDownload(): Promise<{ downloaded: number; failed: number }> {
    if (this.isBatchDownloading) {
      return { downloaded: 0, failed: 0 };
    }

    this.isBatchDownloading = true;
    this.cancelRequested = false;
    this.notifyQueueListeners(0);

    const pendingItems = this.downloadQueue.filter(q => q.status === 'pending' || q.status === 'error');
    if (pendingItems.length === 0) {
      this.isBatchDownloading = false;
      this.notifyQueueListeners(100);
      return { downloaded: 0, failed: 0 };
    }

    let successCount = 0;
    let failCount = 0;
    const totalToDownload = pendingItems.length;

    for (let i = 0; i < pendingItems.length; i++) {
      if (this.cancelRequested) {
        break;
      }

      const item = pendingItems[i];
      item.status = 'downloading';
      item.progress = 10;
      this.notifyQueueListeners(Math.round(((i) / totalToDownload) * 100));

      try {
        // Incremental progress simulation for visual feedback
        for (let p = 20; p <= 85; p += 25) {
          if (this.cancelRequested) break;
          await new Promise(r => setTimeout(r, 120));
          item.progress = p;
          this.notifyQueueListeners(Math.round(((i + (p / 100)) / totalToDownload) * 100));
        }

        if (this.cancelRequested) break;

        // Perform actual caching
        const mockMusicItem: MusicItem = {
          id: item.trackId,
          title: item.trackTitle,
          artistId: 'unknown',
          artistName: item.artistName,
          category: 'Kompa',
          coverUrl: item.coverUrl,
          audioUrl: item.audioUrl,
          duration: 225,
          listens: 0,
          totalDonations: 0,
          createdAt: new Date().toISOString()
        };

        await this.cacheTrackForOffline(mockMusicItem);

        item.status = 'completed';
        item.progress = 100;
        successCount++;
      } catch {
        item.status = 'error';
        item.errorMsg = 'Echèk telechajman';
        failCount++;
      }

      this.saveQueueToStorage();
      this.notifyQueueListeners(Math.round(((i + 1) / totalToDownload) * 100));
      await new Promise(r => setTimeout(r, 150));
    }

    this.isBatchDownloading = false;
    this.cancelRequested = false;
    this.saveQueueToStorage();
    this.notifyQueueListeners(100);

    return { downloaded: successCount, failed: failCount };
  }

  // ==================== GENERAL CACHE HELPERS ====================

  public isTrackCached(trackId: string): boolean {
    return this.cachedTrackIds.has(trackId);
  }

  public getCachedTrackIds(): string[] {
    return Array.from(this.cachedTrackIds);
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public getIsIntermittent(): boolean {
    return this.isIntermittent;
  }

  public async clearOfflineCache() {
    this.cachedTrackIds.clear();
    this.saveCachedIdsToStorage();
    this.notifyCacheListeners();

    // Reset default playlist track list
    const def = this.playlists.find(p => p.isDefault);
    if (def) {
      def.trackIds = [];
      this.savePlaylistsToStorage();
      this.notifyPlaylistListeners();
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUDIO_CACHE' });
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        if (k.includes('audio')) {
          await caches.delete(k);
        }
      }
    }
  }
}

export const offlineManager = new OfflineManager();
