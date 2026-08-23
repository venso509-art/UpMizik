import { ArtistUser, MusicItem, DonationItem, PhysicalAwardDelivery, AwardPhysicalDeliveryStatus } from '../types';

export interface AwardTierDefinition {
  type: 'disque_or' | 'disque_platine' | 'trophy_1' | 'trophy_2' | 'trophy_3' | 'trophy_4';
  title: string;
  category: 'streams' | 'donations';
  threshold: number; // 50000, 200000, 500, 1500, 5000, 10000
  thresholdFormatted: string;
  badgeLabel: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glowShadow: string;
  iconName: 'disc' | 'trophy' | 'award' | 'crown';
  accentColor: string;
  description: string;
}

export const AWARD_TIERS: AwardTierDefinition[] = [
  // Ekout (Streams)
  {
    type: 'disque_or',
    title: "Disque d'Or (Plak Lò)",
    category: 'streams',
    threshold: 50000,
    thresholdFormatted: '50,000 Ekout',
    badgeLabel: "Disque d'Or",
    shortLabel: 'Or (50k)',
    badgeBg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/30',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-400/50',
    glowShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
    iconName: 'disc',
    accentColor: '#f59e0b',
    description: 'Akòde pou atis ki rive nan 50,000 ekout sou mizik li yo.'
  },
  {
    type: 'disque_platine',
    title: 'Disque de Platine (Plak Platin)',
    category: 'streams',
    threshold: 200000,
    thresholdFormatted: '200,000 Ekout',
    badgeLabel: 'Disque de Platine',
    shortLabel: 'Platine (200k)',
    badgeBg: 'bg-gradient-to-r from-slate-200/25 via-cyan-400/25 to-slate-100/30',
    badgeText: 'text-cyan-200',
    badgeBorder: 'border-cyan-300/60',
    glowShadow: 'shadow-[0_0_20px_rgba(34,211,238,0.4)]',
    iconName: 'disc',
    accentColor: '#22d3ee',
    description: 'Gwo distenksyon pou atis ki depase 200,000 ekout sou platfòm UpMizik la.'
  },

  // Donasyon (Donations / Sipò Finansye)
  {
    type: 'trophy_1',
    title: 'Twofe Nivo 1 (Bwonz)',
    category: 'donations',
    threshold: 500,
    thresholdFormatted: '$500 USD',
    badgeLabel: 'Twofe 1',
    shortLabel: 'Twofe 1 ($500)',
    badgeBg: 'bg-gradient-to-r from-amber-700/25 to-orange-600/30',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-500/50',
    glowShadow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]',
    iconName: 'trophy',
    accentColor: '#f97316',
    description: 'Akòde pou atis ki kolekte plis pase $500 USD nan donasyon dirèk.'
  },
  {
    type: 'trophy_2',
    title: 'Twofe Nivo 2 (Ajan)',
    category: 'donations',
    threshold: 1500,
    thresholdFormatted: '$1,500 USD',
    badgeLabel: 'Twofe 2',
    shortLabel: 'Twofe 2 ($1.5k)',
    badgeBg: 'bg-gradient-to-r from-slate-300/25 to-slate-100/30',
    badgeText: 'text-slate-200',
    badgeBorder: 'border-slate-300/60',
    glowShadow: 'shadow-[0_0_15px_rgba(226,232,240,0.35)]',
    iconName: 'trophy',
    accentColor: '#e2e8f0',
    description: 'Akòde pou atis ki atenn $1,500 USD nan sipò kominote a.'
  },
  {
    type: 'trophy_3',
    title: 'Twofe Nivo 3 (Lò)',
    category: 'donations',
    threshold: 5000,
    thresholdFormatted: '$5,000 USD',
    badgeLabel: 'Twofe 3',
    shortLabel: 'Twofe 3 ($5k)',
    badgeBg: 'bg-gradient-to-r from-yellow-400/25 to-amber-300/35',
    badgeText: 'text-yellow-300',
    badgeBorder: 'border-yellow-400/60',
    glowShadow: 'shadow-[0_0_18px_rgba(250,204,21,0.4)]',
    iconName: 'crown',
    accentColor: '#facc15',
    description: 'Gran twofe ekselans pou atis ki depase $5,000 USD nan redevans & don.'
  },
  {
    type: 'trophy_4',
    title: 'Twofe Nivo 4 (Dyamant)',
    category: 'donations',
    threshold: 10000,
    thresholdFormatted: '$10,000 USD',
    badgeLabel: 'Twofe 4',
    shortLabel: 'Twofe 4 ($10k)',
    badgeBg: 'bg-gradient-to-r from-fuchsia-500/25 via-sky-400/30 to-emerald-400/25',
    badgeText: 'text-fuchsia-200',
    badgeBorder: 'border-fuchsia-400/60',
    glowShadow: 'shadow-[0_0_22px_rgba(232,121,249,0.45)]',
    iconName: 'crown',
    accentColor: '#e879f9',
    description: 'Sòm distenksyon nasyonal pou atis lejandè ki depase $10,000 USD.'
  }
];

export interface ArtistAwardSummary {
  artist: ArtistUser;
  artistSongs: MusicItem[];
  totalListens: number;
  totalDonationsUsd: number;
  totalDonationsHtg: number;
  // Stream milestones
  hasDisqueOr: boolean;
  hasDisquePlatine: boolean;
  highestDisc: AwardTierDefinition | null;
  nextStreamTarget: {
    target: AwardTierDefinition;
    remaining: number;
    progressPct: number;
  } | null;
  // Donation milestones
  hasTrophy1: boolean;
  hasTrophy2: boolean;
  hasTrophy3: boolean;
  hasTrophy4: boolean;
  highestTrophy: AwardTierDefinition | null;
  nextTrophyTarget: {
    target: AwardTierDefinition;
    remainingUsd: number;
    progressPct: number;
  } | null;
  // All earned awards list
  unlockedAwards: AwardTierDefinition[];
  unlockedAwardsCount: number;
  isEligibleForPhysicalAward: boolean;
  deliveryRecords: Record<string, PhysicalAwardDelivery>;
}

/**
 * Computes exact awards and milestone alerts for a single artist or all artists
 * directly using the songs (musics) and validated donations stored in Firestore/State.
 */
export function calculateArtistAwards(
  artist: ArtistUser,
  allMusics: MusicItem[],
  allDonations: DonationItem[],
  exchangeRate: number = 132,
  deliveryMap: Record<string, PhysicalAwardDelivery> = {}
): ArtistAwardSummary {
  // 1. Calculate tracks & total streams directly from music items in Firestore
  const artistSongs = allMusics.filter(
    (m) => m.artistId === artist.id || m.collab?.artistId === artist.id
  );

  const totalSongStreams = artistSongs.reduce((sum, m) => sum + (m.listens || 0), 0);
  const totalListens = Math.max(totalSongStreams, artist.totalListens || 0);

  // 2. Calculate donations directly from validated donation items in Firestore
  const matchedDonations = allDonations.filter(
    (d) =>
      (d.artistId === artist.id ||
        (artist.stageName && d.artistName && d.artistName.toLowerCase() === artist.stageName.toLowerCase())) &&
      d.status === 'validated'
  );

  const grossFromDonations = matchedDonations.reduce(
    (sum, d) => sum + (d.currency === 'HTG' ? d.amount / exchangeRate : d.amount),
    0
  );

  const grossFromSongs = artistSongs.reduce((sum, m) => sum + (m.totalDonations || 0), 0);
  const totalDonationsUsd = Math.max(grossFromDonations, grossFromSongs, artist.totalDonationsReceived || 0);
  const totalDonationsHtg = Math.round(totalDonationsUsd * exchangeRate);

  // 3. Evaluate Stream Tiers: 50,000 (Or) and 200,000 (Platine)
  const hasDisqueOr = totalListens >= 50000;
  const hasDisquePlatine = totalListens >= 200000;

  let highestDisc: AwardTierDefinition | null = null;
  if (hasDisquePlatine) {
    highestDisc = AWARD_TIERS.find((t) => t.type === 'disque_platine') || null;
  } else if (hasDisqueOr) {
    highestDisc = AWARD_TIERS.find((t) => t.type === 'disque_or') || null;
  }

  let nextStreamTarget = null;
  if (!hasDisqueOr) {
    const target = AWARD_TIERS.find((t) => t.type === 'disque_or')!;
    const remaining = Math.max(0, 50000 - totalListens);
    const progressPct = Math.min(100, Math.round((totalListens / 50000) * 100));
    nextStreamTarget = { target, remaining, progressPct };
  } else if (!hasDisquePlatine) {
    const target = AWARD_TIERS.find((t) => t.type === 'disque_platine')!;
    const remaining = Math.max(0, 200000 - totalListens);
    const progressPct = Math.min(100, Math.round((totalListens / 200000) * 100));
    nextStreamTarget = { target, remaining, progressPct };
  }

  // 4. Evaluate Donation Tiers: $500 (T1), $1500 (T2), $5000 (T3), $10000 (T4)
  const hasTrophy1 = totalDonationsUsd >= 500;
  const hasTrophy2 = totalDonationsUsd >= 1500;
  const hasTrophy3 = totalDonationsUsd >= 5000;
  const hasTrophy4 = totalDonationsUsd >= 10000;

  let highestTrophy: AwardTierDefinition | null = null;
  if (hasTrophy4) {
    highestTrophy = AWARD_TIERS.find((t) => t.type === 'trophy_4') || null;
  } else if (hasTrophy3) {
    highestTrophy = AWARD_TIERS.find((t) => t.type === 'trophy_3') || null;
  } else if (hasTrophy2) {
    highestTrophy = AWARD_TIERS.find((t) => t.type === 'trophy_2') || null;
  } else if (hasTrophy1) {
    highestTrophy = AWARD_TIERS.find((t) => t.type === 'trophy_1') || null;
  }

  let nextTrophyTarget = null;
  if (!hasTrophy1) {
    const target = AWARD_TIERS.find((t) => t.type === 'trophy_1')!;
    const remainingUsd = Math.max(0, 500 - totalDonationsUsd);
    const progressPct = Math.min(100, Math.round((totalDonationsUsd / 500) * 100));
    nextTrophyTarget = { target, remainingUsd, progressPct };
  } else if (!hasTrophy2) {
    const target = AWARD_TIERS.find((t) => t.type === 'trophy_2')!;
    const remainingUsd = Math.max(0, 1500 - totalDonationsUsd);
    const progressPct = Math.min(100, Math.round((totalDonationsUsd / 1500) * 100));
    nextTrophyTarget = { target, remainingUsd, progressPct };
  } else if (!hasTrophy3) {
    const target = AWARD_TIERS.find((t) => t.type === 'trophy_3')!;
    const remainingUsd = Math.max(0, 5000 - totalDonationsUsd);
    const progressPct = Math.min(100, Math.round((totalDonationsUsd / 5000) * 100));
    nextTrophyTarget = { target, remainingUsd, progressPct };
  } else if (!hasTrophy4) {
    const target = AWARD_TIERS.find((t) => t.type === 'trophy_4')!;
    const remainingUsd = Math.max(0, 10000 - totalDonationsUsd);
    const progressPct = Math.min(100, Math.round((totalDonationsUsd / 10000) * 100));
    nextTrophyTarget = { target, remainingUsd, progressPct };
  }

  // 5. Gather all unlocked awards
  const unlockedAwards: AwardTierDefinition[] = [];
  if (hasDisqueOr) unlockedAwards.push(AWARD_TIERS.find((t) => t.type === 'disque_or')!);
  if (hasDisquePlatine) unlockedAwards.push(AWARD_TIERS.find((t) => t.type === 'disque_platine')!);
  if (hasTrophy1) unlockedAwards.push(AWARD_TIERS.find((t) => t.type === 'trophy_1')!);
  if (hasTrophy2) unlockedAwards.push(AWARD_TIERS.find((t) => t.type === 'trophy_2')!);
  if (hasTrophy3) unlockedAwards.push(AWARD_TIERS.find((t) => t.type === 'trophy_3')!);
  if (hasTrophy4) unlockedAwards.push(AWARD_TIERS.find((t) => t.type === 'trophy_4')!);

  const isEligibleForPhysicalAward = unlockedAwards.length > 0;

  // Filter delivery records matching this artist
  const artistDeliveryRecords: Record<string, PhysicalAwardDelivery> = {};
  Object.keys(deliveryMap).forEach((key) => {
    if (deliveryMap[key]?.artistId === artist.id) {
      artistDeliveryRecords[key] = deliveryMap[key];
    }
  });

  return {
    artist,
    artistSongs,
    totalListens,
    totalDonationsUsd,
    totalDonationsHtg,
    hasDisqueOr,
    hasDisquePlatine,
    highestDisc,
    nextStreamTarget,
    hasTrophy1,
    hasTrophy2,
    hasTrophy3,
    hasTrophy4,
    highestTrophy,
    nextTrophyTarget,
    unlockedAwards,
    unlockedAwardsCount: unlockedAwards.length,
    isEligibleForPhysicalAward,
    deliveryRecords: artistDeliveryRecords
  };
}

/**
 * Builds the celebratory notification message for an artist award
 */
export function buildAwardCelebrationMessage(
  artist: ArtistUser,
  award: AwardTierDefinition,
  adminName: string = 'Clauvens Venso',
  customMessage?: string
): { subject: string; preview: string; body: string; certificateCode: string } {
  const certificateCode = `UPM-AWARD-${Math.floor(100000 + Math.random() * 900000)}`;
  const nowStr = new Date().toLocaleDateString('ht-HT', {
    dateStyle: 'long'
  });

  const isDisc = award.category === 'streams';
  const awardTypeStr = isDisc ? "PLAK MIZIKAL (DISQUE D'OR / PLATINE)" : 'TWOFÈ ONÈ & SIPÒ';

  const subject = `🏆 Felisitasyon! Ou genyen ${award.title} sou UpMizik! (Kòd: #${certificateCode})`;
  const preview = `Administrasyon UpMizik la felisite w pou gwo rekò ${award.thresholdFormatted} sa a. Yon plak/twofe fizik ap prepare pou ou!`;

  const body = `Chè ${artist.stageName} (${artist.name}),

Nan non tout ekip administrasyon UpMizik la ak sipè administratè nou ${adminName}, nou voye gwo kout chapo ak felisitasyon ba ou pou gwo pèfòmans sa a!

Ou atenn yon gwo nivo nan karyè w sou platfòm nan:
==================================================
🏆 DISTENKSYON: ${award.title.toUpperCase()}
🎯 KATEGORI: ${awardTypeStr}
📊 OBJEKTIF ATENN: ${award.thresholdFormatted}
📜 KÒD OFISYÈL: #${certificateCode}
📅 DAT HOMOLOGASYON: ${nowStr}
👑 SIPÈ ADMINISTRATÈ: ${adminName}
==================================================

📦 PREPARASYON PLAK / TWOFÈ FIZIK:
UpMizik ap prepare distenksyon fizik ou a (gravi ak non sèn ou "${artist.stageName}").
Ekip nou an ap kontakte w sou nimewo telefòn ou (${artist.phone || 'nan dosye w la'}) pou kowòdone remiz ofisyèl la.

${customMessage ? `💬 NÒT ADMINISTRASYON: ${customMessage}\n\n` : ''}Kontinye kreye bèl mizik pou kilti ayisyen an!

Mèsi pou talan w ak angajman w ak UpMizik!
upmizik@gmail.com | https://upmizik.com`;

  return {
    subject,
    preview,
    body,
    certificateCode
  };
}
