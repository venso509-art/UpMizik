import { ArtistUser, MusicItem } from '../types';

export type ArtistTier = 'emerging' | 'rising-star' | 'pro' | 'elite';

export interface ArtistBadgeInfo {
  tier: ArtistTier;
  label: string;
  shortLabel: string;
  description: string;
  trustStatement: string;
  minDonations: number;
  nextTierMinDonations: number | null;
  nextTierLabel: string | null;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  glowClass: string;
  iconType: 'sparkle' | 'star' | 'crown' | 'gem';
}

export const TIER_THRESHOLDS = {
  EMERGING: 0,
  RISING_STAR: 50,
  PRO: 250,
  ELITE: 750
};

/**
 * Returns badge info based on cumulative donations and listens
 */
export const getBadgeByDonations = (totalDonations: number): ArtistBadgeInfo => {
  const donations = Math.max(0, totalDonations || 0);

  if (donations >= TIER_THRESHOLDS.ELITE) {
    return {
      tier: 'elite',
      label: 'Atis Elit 💎',
      shortLabel: 'Elit',
      description: 'Atis ki nan pi wo nivo konfyans ak sipò kominote a ($750+ donasyon valide).',
      trustStatement: 'Nivo Siprèm: Atis sa a gen yon gwo kominote fidèl ki sipòte l regilyèman.',
      minDonations: TIER_THRESHOLDS.ELITE,
      nextTierMinDonations: null,
      nextTierLabel: null,
      colorClass: 'text-amber-300',
      borderClass: 'border-amber-400/60',
      bgClass: 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20',
      glowClass: 'shadow-amber-500/30',
      iconType: 'gem'
    };
  }

  if (donations >= TIER_THRESHOLDS.PRO) {
    return {
      tier: 'pro',
      label: 'Atis Pro 👑',
      shortLabel: 'Pro',
      description: 'Atis pwofesyonèl verifye ki depase $250 nan donasyon fanatik ak aktivite konstan.',
      trustStatement: 'Konfyans Valide: Atis sa a resevwa sipò dirèk nan men plizyè santèn fanatik.',
      minDonations: TIER_THRESHOLDS.PRO,
      nextTierMinDonations: TIER_THRESHOLDS.ELITE,
      nextTierLabel: 'Atis Elit ($750)',
      colorClass: 'text-cyan-300',
      borderClass: 'border-cyan-400/50',
      bgClass: 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20',
      glowClass: 'shadow-cyan-500/30',
      iconType: 'crown'
    };
  }

  if (donations >= TIER_THRESHOLDS.RISING_STAR) {
    return {
      tier: 'rising-star',
      label: 'Rising Star ⭐',
      shortLabel: 'Rising Star',
      description: 'Zetwal k ap monte! Atis ki resevwa plis pase $50 nan sipò dirèk MonCash/Natcash.',
      trustStatement: 'Atis K ap Monte: Fanatik yo kòmanse vide sipò sou li an mas.',
      minDonations: TIER_THRESHOLDS.RISING_STAR,
      nextTierMinDonations: TIER_THRESHOLDS.PRO,
      nextTierLabel: 'Atis Pro ($250)',
      colorClass: 'text-yellow-300',
      borderClass: 'border-yellow-400/40',
      bgClass: 'bg-gradient-to-r from-yellow-500/15 via-amber-500/15 to-yellow-600/15',
      glowClass: 'shadow-yellow-500/20',
      iconType: 'star'
    };
  }

  return {
    tier: 'emerging',
    label: 'Atis Nouvo ✨',
    shortLabel: 'Nouvo',
    description: 'Jèn talan anrejistre k ap konstwi odyans li sou platfòm UpMizik la.',
    trustStatement: 'Talan K ap Kòmanse: Fè premye donasyon pou ede l vin yon Rising Star!',
    minDonations: TIER_THRESHOLDS.EMERGING,
    nextTierMinDonations: TIER_THRESHOLDS.RISING_STAR,
    nextTierLabel: 'Rising Star ($50)',
    colorClass: 'text-slate-300',
    borderClass: 'border-slate-500/30',
    bgClass: 'bg-slate-800/40',
    glowClass: 'shadow-slate-500/10',
    iconType: 'sparkle'
  };
};

/**
 * Calculates cumulative donations for an artist combining their profile record and songs
 */
export const calculateArtistTotalDonations = (
  artist: ArtistUser | undefined,
  artistSongs?: MusicItem[]
): number => {
  if (!artist && (!artistSongs || artistSongs.length === 0)) return 0;
  
  const fromProfile = artist?.totalDonationsReceived || 0;
  const fromSongs = artistSongs ? artistSongs.reduce((sum, s) => sum + (s.totalDonations || 0), 0) : 0;
  
  return Math.max(fromProfile, fromSongs);
};

export const getArtistBadgeInfo = (
  artist?: ArtistUser,
  artistSongs?: MusicItem[]
): ArtistBadgeInfo => {
  const totalDonations = calculateArtistTotalDonations(artist, artistSongs);
  return getBadgeByDonations(totalDonations);
};
