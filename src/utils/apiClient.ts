/**
 * UpMizik - Frontend API Client pou kominike ak `api.php` sou Hostinger / MySQL
 */

import { MusicItem, ArtistUser, DonationItem, MusicCategory, ReleaseFormat } from '../types';

export const API_BASE_URL = typeof window !== 'undefined' ? '/api.php' : 'api.php';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Fonksyon jeneral pou voye requèt nan api.php
 */
async function fetchApi<T>(action: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    const url = isGet 
      ? `${API_BASE_URL}?action=${encodeURIComponent(action)}`
      : `${API_BASE_URL}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Si done yo voye an JSON epi se pa FormData
    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erè pandan kominikasyon ak api.php',
      data: null as any,
      timestamp: new Date().toISOString(),
    };
  }
}

// ==========================================
// 1. ATIS YO (SELECT, INSERT, UPDATE)
// ==========================================

export async function getArtistesApi(statut: string = 'actif', search: string = ''): Promise<ArtistUser[]> {
  const query = new URLSearchParams({ action: 'get_artistes', statut, search }).toString();
  const res = await fetch(`${API_BASE_URL}?${query}`);
  const json: ApiResponse<any[]> = await res.json();
  if (json.success && Array.isArray(json.data)) {
    return json.data.map(mapDbArtistToModel);
  }
  return [];
}

export async function getArtisteByIdApi(id: string): Promise<ArtistUser | null> {
  const res = await fetch(`${API_BASE_URL}?action=get_artiste&id=${encodeURIComponent(id)}`);
  const json: ApiResponse<any> = await res.json();
  if (json.success && json.data) {
    return mapDbArtistToModel(json.data);
  }
  return null;
}

export async function insertArtisteApi(artistData: Partial<ArtistUser> | FormData): Promise<ApiResponse<any>> {
  if (artistData instanceof FormData) {
    artistData.append('action', 'insert_artiste');
    return fetchApi('insert_artiste', {
      method: 'POST',
      body: artistData,
    });
  }

  return fetchApi('insert_artiste', {
    method: 'POST',
    body: JSON.stringify({
      action: 'insert_artiste',
      ...mapModelArtistToDb(artistData),
    }),
  });
}

export async function updateArtisteApi(id: string, updates: Partial<ArtistUser> | FormData): Promise<ApiResponse<any>> {
  if (updates instanceof FormData) {
    updates.append('action', 'update_artiste');
    updates.append('id', id);
    return fetchApi('update_artiste', {
      method: 'POST',
      body: updates,
    });
  }

  return fetchApi('update_artiste', {
    method: 'POST',
    body: JSON.stringify({
      action: 'update_artiste',
      id,
      ...mapModelArtistToDb(updates),
    }),
  });
}

// ==========================================
// 2. MIZIK YO (SELECT, INSERT, UPDATE, PLAY)
// ==========================================

export async function getMusiquesApi(categorie: string = 'Tout', search: string = '', sort: string = 'ecoutes'): Promise<MusicItem[]> {
  const query = new URLSearchParams({ action: 'get_musiques', categorie, search, sort }).toString();
  const res = await fetch(`${API_BASE_URL}?${query}`);
  const json: ApiResponse<any[]> = await res.json();
  if (json.success && Array.isArray(json.data)) {
    return json.data.map(mapDbMusicToModel);
  }
  return [];
}

export async function getMusiqueByIdApi(id: string): Promise<MusicItem | null> {
  const res = await fetch(`${API_BASE_URL}?action=get_musique&id=${encodeURIComponent(id)}`);
  const json: ApiResponse<any> = await res.json();
  if (json.success && json.data) {
    return mapDbMusicToModel(json.data);
  }
  return null;
}

export async function insertMusiqueApi(musicData: Partial<MusicItem> | FormData): Promise<ApiResponse<any>> {
  if (musicData instanceof FormData) {
    musicData.append('action', 'insert_musique');
    return fetchApi('insert_musique', {
      method: 'POST',
      body: musicData,
    });
  }

  return fetchApi('insert_musique', {
    method: 'POST',
    body: JSON.stringify({
      action: 'insert_musique',
      ...mapModelMusicToDb(musicData),
    }),
  });
}

export async function updateMusiqueApi(id: string, updates: Partial<MusicItem> | FormData): Promise<ApiResponse<any>> {
  if (updates instanceof FormData) {
    updates.append('action', 'update_musique');
    updates.append('id', id);
    return fetchApi('update_musique', {
      method: 'POST',
      body: updates,
    });
  }

  return fetchApi('update_musique', {
    method: 'POST',
    body: JSON.stringify({
      action: 'update_musique',
      id,
      ...mapModelMusicToDb(updates),
    }),
  });
}

export async function incrementEcoutesApi(musiqueId: string): Promise<boolean> {
  const res = await fetchApi('increment_ecoutes', {
    method: 'POST',
    body: JSON.stringify({ action: 'increment_ecoutes', id: musiqueId }),
  });
  return res.success;
}

// ==========================================
// 3. DONS & SIPÒ (SELECT, INSERT, UPDATE)
// ==========================================

export async function insertDonApi(donData: Partial<DonationItem> | FormData): Promise<ApiResponse<any>> {
  if (donData instanceof FormData) {
    donData.append('action', 'insert_don');
    return fetchApi('insert_don', {
      method: 'POST',
      body: donData,
    });
  }

  return fetchApi('insert_don', {
    method: 'POST',
    body: JSON.stringify({
      action: 'insert_don',
      artiste_id: donData.artistId,
      musique_id: donData.musicId,
      nom_artiste: donData.artistName,
      titre_musique: donData.musicTitle,
      montant: donData.amount,
      devise: donData.currency || 'USD',
      nom_donateur: donData.donorName,
      telephone_donateur: donData.donorPhone,
      methode_paiement: donData.paymentMethod || 'MonCash',
      preuve_url: donData.proofUrl,
    }),
  });
}

export async function getStatsApi(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}?action=get_stats`);
  const json: ApiResponse<any> = await res.json();
  return json.success ? json.data : null;
}

// ==========================================
// MAPPERS: Transfòme kolòn MySQL an TypeScript Models
// ==========================================

function mapDbArtistToModel(row: any): ArtistUser {
  return {
    id: row.id,
    name: row.nom_complet || row.nom_scene,
    stageName: row.nom_scene,
    email: row.email,
    phone: row.telephone,
    city: row.ville,
    pin: row.pin,
    avatarUrl: row.avatar_url,
    bio: row.bio || '',
    musicalRoots: row.racines_musicales,
    musicalInfluences: row.influences,
    artisticVision: row.vision_artistique,
    artistQuote: row.citation,
    status: (row.statut === 'actif' ? 'active' : row.statut === 'rejete' ? 'rejected' : row.statut === 'suspendu' ? 'suspended' : 'pending') as any,
    registrationProofUrl: row.preuve_inscription_url,
    registrationRejectionReason: row.raison_rejet,
    registrationDate: row.date_inscription || new Date().toISOString(),
    totalListens: Number(row.total_ecoutes || 0),
    totalDonationsReceived: Number(row.total_dons_recus || 0),
    youtubeUrl: row.youtube_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    headerBannerUrl: row.banniere_url,
    bannerGenreTheme: row.theme_banniere,
    isPaidThisMonth: Boolean(Number(row.paye_ce_mois || 0)),
    paidDateThisMonth: row.date_paiement,
    paidAmountThisMonth: row.montant_paye ? Number(row.montant_paye) : undefined,
    paidReferenceThisMonth: row.reference_paiement,
  };
}

function mapModelArtistToDb(model: Partial<ArtistUser>): any {
  return {
    nom_scene: model.stageName || model.name,
    nom_complet: model.name || model.stageName,
    email: model.email,
    telephone: model.phone,
    ville: model.city,
    pin: model.pin,
    avatar_url: model.avatarUrl,
    bio: model.bio,
    racines_musicales: model.musicalRoots,
    influences: model.musicalInfluences,
    vision_artistique: model.artisticVision,
    citation: model.artistQuote,
    statut: model.status === 'active' ? 'actif' : model.status === 'rejected' ? 'rejete' : model.status === 'suspended' ? 'suspendu' : 'en_attente',
    preuve_inscription_url: model.registrationProofUrl,
    youtube_url: model.youtubeUrl,
    instagram_url: model.instagramUrl,
    tiktok_url: model.tiktokUrl,
    banniere_url: model.headerBannerUrl,
    theme_banniere: model.bannerGenreTheme,
  };
}

function mapDbMusicToModel(row: any): MusicItem {
  return {
    id: row.id,
    title: row.titre,
    artistId: row.artiste_id,
    artistName: row.nom_artiste,
    feat: row.featuring || '',
    category: (row.categorie || 'Rap') as MusicCategory,
    releaseFormat: (row.format || 'single') as ReleaseFormat,
    albumName: row.nom_album,
    trackNumber: Number(row.numero_piste || 1),
    coverUrl: row.cover_url,
    audioUrl: row.audio_url,
    duration: Number(row.duree || 180),
    listens: Number(row.ecoutes || 0),
    totalDonations: Number(row.total_dons || 0),
    position: row.position ? Number(row.position) : undefined,
    youtubeUrl: row.youtube_url,
    tiktokUrl: row.tiktok_url,
    instagramUrl: row.instagram_url,
    status: (row.statut === 'actif' ? 'active' : row.statut === 'rejete' ? 'rejected' : 'pending') as any,
    rejectionReason: row.raison_rejet,
    createdAt: row.date_creation || new Date().toISOString(),
  };
}

function mapModelMusicToDb(model: Partial<MusicItem>): any {
  return {
    titre: model.title,
    artiste_id: model.artistId,
    nom_artiste: model.artistName,
    featuring: model.feat,
    categorie: model.category,
    format: model.releaseFormat,
    nom_album: model.albumName,
    numero_piste: model.trackNumber,
    cover_url: model.coverUrl,
    audio_url: model.audioUrl,
    duree: model.duration,
    statut: model.status === 'active' ? 'actif' : model.status === 'rejected' ? 'rejete' : 'en_attente',
    youtube_url: model.youtubeUrl,
    tiktok_url: model.tiktokUrl,
    instagram_url: model.instagramUrl,
  };
}
