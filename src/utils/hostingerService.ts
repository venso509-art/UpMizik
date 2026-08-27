/**
 * UpMizik - Hostinger VPS (PHP + MySQL) Database & Storage Synchronization Service
 * 
 * Sèvis sa a konekte dirèkteman ak sèvè Hostinger VPS ou a atravè backend PHP & baz done MySQL,
 * epi li itilize senkronizasyon an tan reyèl ak evènman CustomEvent pou yon eksperyans ultra-rapid.
 */

import {
  ArtistUser,
  MusicItem,
  DonationItem,
  SocialPost,
  SocialPostComment,
  ArtistInboxMessage,
  ArchiveRecord
} from '../types';
import { UpMizikAPI } from './apiService';
import { StorageService } from './storage';

export type Unsubscribe = () => void;

class HostingerSyncService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      // Koute evènman chanjman pou mete tout konpozan yo ajou imedyatman
      window.addEventListener('upmizik_data_sync', (e: Event) => {
        const customEvent = e as CustomEvent<{ type: string; data: any }>;
        if (customEvent.detail) {
          this.notifySubscribers(customEvent.detail.type, customEvent.detail.data);
        }
      });
    }
  }

  private notifySubscribers(type: string, data: any) {
    const subs = this.listeners.get(type);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.warn(`[HostingerService] Listener error for ${type}:`, err);
        }
      });
    }
  }

  private emitChange(type: string, data: any) {
    this.notifySubscribers(type, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('upmizik_data_sync', {
          detail: { type, data }
        })
      );
    }
  }

  // ==========================================
  // ARTISTS (ATIS YO)
  // ==========================================
  async fetchArtists(): Promise<ArtistUser[] | null> {
    try {
      const apiArtists = await UpMizikAPI.getArtists();
      if (apiArtists && apiArtists.length > 0) {
        return apiArtists;
      }
      return StorageService.getArtists();
    } catch {
      return StorageService.getArtists();
    }
  }

  async syncArtists(list: ArtistUser[]) {
    try {
      StorageService.saveArtists(list);
      this.emitChange('artists', list);
      // Senkronize an background ak Hostinger MySQL
      await UpMizikAPI.syncAllData({ artists: list });
    } catch (e) {
      console.warn('[HostingerService] Sync artists warn:', e);
    }
  }

  subscribeToArtists(callback: (artists: ArtistUser[]) => void): Unsubscribe {
    if (!this.listeners.has('artists')) {
      this.listeners.set('artists', new Set());
    }
    const set = this.listeners.get('artists')!;
    set.add(callback);

    // Voye eta aktyèl la imedyatman
    const current = StorageService.getArtists();
    callback(current);

    return () => {
      set.delete(callback);
    };
  }

  async saveSingleArtist(artist: ArtistUser) {
    try {
      const all = StorageService.getArtists();
      const idx = all.findIndex((a) => a.id === artist.id);
      let updated: ArtistUser[];
      if (idx >= 0) {
        updated = [...all];
        updated[idx] = { ...updated[idx], ...artist };
      } else {
        updated = [artist, ...all];
      }
      StorageService.saveArtists(updated);
      this.emitChange('artists', updated);

      // Voye nan backend Hostinger MySQL
      await UpMizikAPI.registerArtist(artist);
    } catch (e) {
      console.warn('[HostingerService] saveSingleArtist warn:', e);
    }
  }

  async deleteArtist(artistId: string) {
    try {
      const result = StorageService.deleteArtist(artistId, true);
      this.emitChange('artists', StorageService.getArtists());
      return result;
    } catch (e) {
      console.warn('[HostingerService] deleteArtist warn:', e);
    }
  }

  async purgePendingArtists() {
    try {
      const purgedCount = StorageService.purgeAllPendingArtists();
      this.emitChange('artists', StorageService.getArtists());
      return purgedCount;
    } catch (e) {
      console.warn('[HostingerService] purgePendingArtists warn:', e);
    }
  }

  // ==========================================
  // MUSIC (MIZIK YO)
  // ==========================================
  async fetchMusic(): Promise<MusicItem[] | null> {
    try {
      const apiMusic = await UpMizikAPI.getMusics();
      if (apiMusic && apiMusic.length > 0) {
        return apiMusic;
      }
      return StorageService.getMusic();
    } catch {
      return StorageService.getMusic();
    }
  }

  async syncMusic(list: MusicItem[]) {
    try {
      StorageService.saveMusic(list);
      this.emitChange('music', list);
      await UpMizikAPI.syncAllData({ musics: list });
    } catch (e) {
      console.warn('[HostingerService] syncMusic warn:', e);
    }
  }

  subscribeToMusic(callback: (music: MusicItem[]) => void): Unsubscribe {
    if (!this.listeners.has('music')) {
      this.listeners.set('music', new Set());
    }
    const set = this.listeners.get('music')!;
    set.add(callback);

    const current = StorageService.getMusic();
    callback(current);

    return () => {
      set.delete(callback);
    };
  }

  async saveSingleMusic(item: MusicItem) {
    try {
      const all = StorageService.getMusic();
      const idx = all.findIndex((m) => m.id === item.id);
      let updated: MusicItem[];
      if (idx >= 0) {
        updated = [...all];
        updated[idx] = { ...updated[idx], ...item };
      } else {
        updated = [item, ...all];
      }
      StorageService.saveMusic(updated);
      this.emitChange('music', updated);

      // Voye nan Hostinger MySQL
      await UpMizikAPI.addMusic(item);
    } catch (e) {
      console.warn('[HostingerService] saveSingleMusic warn:', e);
    }
  }

  async deleteMusic(musicId: string) {
    try {
      StorageService.deleteMusic(musicId);
      this.emitChange('music', StorageService.getMusic());
    } catch (e) {
      console.warn('[HostingerService] deleteMusic warn:', e);
    }
  }

  // ==========================================
  // DONATIONS (SIPÒ & DONASYON)
  // ==========================================
  async fetchDonations(): Promise<DonationItem[] | null> {
    return StorageService.getDonations();
  }

  subscribeToDonations(callback: (donations: DonationItem[]) => void): Unsubscribe {
    if (!this.listeners.has('donations')) {
      this.listeners.set('donations', new Set());
    }
    const set = this.listeners.get('donations')!;
    set.add(callback);

    const current = StorageService.getDonations();
    callback(current);

    return () => {
      set.delete(callback);
    };
  }

  async saveSingleDonation(don: DonationItem) {
    try {
      const all = StorageService.getDonations();
      const idx = all.findIndex((d) => d.id === don.id);
      let updated: DonationItem[];
      if (idx >= 0) {
        updated = [...all];
        updated[idx] = { ...updated[idx], ...don };
      } else {
        updated = [don, ...all];
      }
      StorageService.saveDonations(updated);
      this.emitChange('donations', updated);

      // Voye nan Hostinger MySQL
      await UpMizikAPI.submitDonation(don);
    } catch (e) {
      console.warn('[HostingerService] saveSingleDonation warn:', e);
    }
  }

  async deleteDonation(id: string) {
    try {
      const all = StorageService.getDonations().filter((d) => d.id !== id);
      StorageService.saveDonations(all);
      this.emitChange('donations', all);
    } catch (e) {
      console.warn('[HostingerService] deleteDonation warn:', e);
    }
  }

  async purgePendingDonations() {
    try {
      const purgedCount = StorageService.purgeAllPendingDonations();
      this.emitChange('donations', StorageService.getDonations());
      return purgedCount;
    } catch (e) {
      console.warn('[HostingerService] purgePendingDonations warn:', e);
    }
  }

  // ==========================================
  // SOCIAL POSTS & COMMENTS (UPMIZIK SOCIAL)
  // ==========================================
  async fetchSocialPosts(): Promise<SocialPost[] | null> {
    return StorageService.getSocialPosts();
  }

  async syncSocialPosts(list: SocialPost[]) {
    try {
      StorageService.saveSocialPosts(list);
      this.emitChange('social_posts', list);
    } catch (e) {
      console.warn('[HostingerService] syncSocialPosts warn:', e);
    }
  }

  subscribeToSocialPosts(callback: (posts: SocialPost[]) => void): Unsubscribe {
    if (!this.listeners.has('social_posts')) {
      this.listeners.set('social_posts', new Set());
    }
    const set = this.listeners.get('social_posts')!;
    set.add(callback);

    const current = StorageService.getSocialPosts();
    callback(current);

    return () => {
      set.delete(callback);
    };
  }

  async saveSinglePost(post: SocialPost) {
    try {
      const all = StorageService.getSocialPosts();
      const idx = all.findIndex((p) => p.id === post.id);
      let updated: SocialPost[];
      if (idx >= 0) {
        updated = [...all];
        updated[idx] = { ...updated[idx], ...post };
      } else {
        updated = [post, ...all];
      }
      StorageService.saveSocialPosts(updated);
      this.emitChange('social_posts', updated);
    } catch (e) {
      console.warn('[HostingerService] saveSinglePost warn:', e);
    }
  }

  async deleteSinglePost(postId: string) {
    try {
      const all = StorageService.getSocialPosts().filter((p) => p.id !== postId);
      StorageService.saveSocialPosts(all);
      this.emitChange('social_posts', all);
    } catch (e) {
      console.warn('[HostingerService] deleteSinglePost warn:', e);
    }
  }

  async saveSingleComment(comment: SocialPostComment) {
    try {
      StorageService.addSocialPostComment(comment.postId, {
        authorName: comment.authorName,
        content: comment.content,
        authorAvatar: comment.authorAvatar
      });
      this.emitChange('social_posts', StorageService.getSocialPosts());
    } catch (e) {
      console.warn('[HostingerService] saveSingleComment warn:', e);
    }
  }

  async fetchCommentsForPost(postId: string): Promise<SocialPostComment[] | null> {
    try {
      return StorageService.getSocialPostComments(postId);
    } catch {
      return [];
    }
  }

  // ==========================================
  // INBOX NOTIFICATIONS (NOTIFIKASYON ATIS)
  // ==========================================
  async saveInboxMessage(msg: ArtistInboxMessage) {
    try {
      const currentList = StorageService.getArtistInboxMessages(msg.artistId);
      StorageService.saveArtistInboxMessages([msg, ...currentList]);
      this.emitChange('inbox', msg);
    } catch (e) {
      console.warn('[HostingerService] saveInboxMessage warn:', e);
    }
  }

  // ==========================================
  // ARCHIVES (ACHIV CHAK MWA)
  // ==========================================
  async syncArchives(list: ArchiveRecord[]) {
    try {
      StorageService.saveArchives(list);
      this.emitChange('archives', list);
    } catch (e) {
      console.warn('[HostingerService] syncArchives warn:', e);
    }
  }

  // ==========================================
  // RESET TOTAL POU ADMIN
  // ==========================================
  async clearAllCollections() {
    try {
      StorageService.resetContentData();
      this.emitChange('artists', []);
      this.emitChange('music', []);
      this.emitChange('donations', []);
      this.emitChange('social_posts', []);
      this.emitChange('archives', []);
    } catch (e) {
      console.warn('[HostingerService] clearAllCollections warn:', e);
    }
  }
}

export const HostingerService = new HostingerSyncService();
