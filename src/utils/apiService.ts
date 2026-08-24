/**
 * UpMizik - Hostinger PHP / MySQL API Service Client
 * 
 * Modil sa a jere tout kominikasyon ant koòdone React la ak backend PHP / MySQL sou Hostinger.
 * Li sipòte telechajman fichye odyo (MP3) ak prèv dirèkteman nan dosye sèvè Hostinger a.
 */

import { ArtistUser, MusicItem, DonationItem, ArtistInboxMessage, SocialPost, PubItem, RpaItem } from '../types';

// API Base URL:
// Lè w sou Hostinger, li ka itilize chemen relatif '/backend/api' oswa URL domèn ou an
const API_BASE_URL = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PHP_API_URL as string) || 
  (typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? '/backend/api'
    : '/backend/api');

class ApiService {
  private baseUrl: string = API_BASE_URL;

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Telechaje yon fichye (Mizik MP3, Kouvèti, Prèv MonCash) dirèkteman sou sèvè Hostinger a
   */
  public async uploadFile(
    file: File | Blob,
    type: 'music' | 'covers' | 'proofs' | 'avatars' | 'banners' | 'media' | 'general' = 'general',
    customFileName?: string
  ): Promise<{ success: boolean; url: string; relativePath?: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file, customFileName || (file instanceof File ? file.name : 'upload.bin'));
      formData.append('type', type);

      const response = await fetch(`${this.baseUrl}/upload.php`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erè HTTP: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('[ApiService] Upload dirèk pa disponib nan preview lokal, fallback aktif.', error);
      // Fallback pou anviwònman dev lokal si sèvè PHP a poko deplwaye
      return {
        success: false,
        url: '',
        message: error instanceof Error ? error.message : 'Erè telechajman'
      };
    }
  }

  /**
   * Telechaje yon imaj oswa dokiman Base64 (Data URI) sou sèvè Hostinger a
   */
  public async uploadBase64(
    base64Data: string,
    type: 'music' | 'covers' | 'proofs' | 'avatars' | 'banners' | 'media' = 'covers'
  ): Promise<{ success: boolean; url: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/upload.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, type }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('[ApiService] Upload Base64 fallback:', error);
      return { success: false, url: base64Data };
    }
  }

  // ----------------------------------------------------------
  // ATIS (ARTISTS)
  // ----------------------------------------------------------

  public async getArtists(status?: string): Promise<ArtistUser[]> {
    try {
      const url = status ? `${this.baseUrl}/artists.php?status=${status}` : `${this.baseUrl}/artists.php`;
      const res = await fetch(url);
      const data = await res.json();
      return data.success ? data.artists : [];
    } catch {
      return [];
    }
  }

  public async registerArtist(artistData: Partial<ArtistUser>): Promise<{ success: boolean; artistId?: string; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/artists.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(artistData),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Erè enskripsyon' };
    }
  }

  public async validateArtist(artistId: string, accept: boolean, reason?: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/artists.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: artistId,
          status: accept ? 'active' : 'rejected',
          registrationRejectionReason: !accept ? reason : undefined,
        }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // MIZIK (MUSICS)
  // ----------------------------------------------------------

  public async getMusics(params?: { category?: string; artistId?: string; status?: string }): Promise<MusicItem[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'Tout') query.append('category', params.category);
      if (params?.artistId) query.append('artistId', params.artistId);
      if (params?.status) query.append('status', params.status);

      const res = await fetch(`${this.baseUrl}/musics.php?${query.toString()}`);
      const data = await res.json();
      return data.success ? data.musics : [];
    } catch {
      return [];
    }
  }

  public async addMusic(musicData: Partial<MusicItem>): Promise<{ success: boolean; musicId?: string; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/musics.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(musicData),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Erè piblikasyon mizik' };
    }
  }

  public async incrementStream(musicId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/musics.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: musicId, action: 'listen' }),
      });
    } catch (e) {
      // Non-blocking
    }
  }

  // ----------------------------------------------------------
  // DONASYON (DONATIONS)
  // ----------------------------------------------------------

  public async submitDonation(donation: Partial<DonationItem>): Promise<{ success: boolean; donationId?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/donations.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donation),
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  }

  public async validateDonation(donationId: string, accept: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/donations.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: donationId, accept }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // SENKRONIZASYON TOTAL (BULK SYNC)
  // ----------------------------------------------------------

  public async syncAllData(allData: {
    artists?: ArtistUser[];
    musics?: MusicItem[];
    pubs?: PubItem[];
    rpa?: RpaItem[];
  }): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/sync.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allData),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  }
}

export const UpMizikAPI = new ApiService();
