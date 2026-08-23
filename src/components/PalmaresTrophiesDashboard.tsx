import React, { useState, useMemo } from 'react';
import {
  ArtistUser,
  MusicItem,
  DonationItem,
  PhysicalAwardDelivery,
  AwardPhysicalDeliveryStatus
} from '../types';
import {
  AWARD_TIERS,
  AwardTierDefinition,
  calculateArtistAwards,
  ArtistAwardSummary
} from '../utils/awardsUtils';
import { StorageService } from '../utils/storage';
import { OfficialCertificateModal } from './OfficialCertificateModal';
import {
  Trophy,
  Disc,
  Crown,
  Award,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Package,
  Send,
  Printer,
  Download,
  Share2,
  Phone,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Info,
  Star,
  Flame,
  X,
  Copy,
  Check,
  Building,
  Calendar,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface PalmaresTrophiesDashboardProps {
  artists: ArtistUser[];
  musicList: MusicItem[];
  donations: DonationItem[];
  exchangeRate?: number;
  currentAdminName?: string;
  onRefreshData?: () => void;
}

export const PalmaresTrophiesDashboard: React.FC<PalmaresTrophiesDashboardProps> = ({
  artists,
  musicList,
  donations,
  exchangeRate = 132,
  currentAdminName = 'Clauvens Venso',
  onRefreshData
}) => {
  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'eligible' | 'discs_only' | 'trophies_only' | 'almost' | 'need_delivery'>('all');
  const [sortBy, setSortBy] = useState<'awards_desc' | 'streams_desc' | 'donations_desc' | 'name_asc'>('awards_desc');

  // Delivery status records state
  const [deliveries, setDeliveries] = useState<Record<string, PhysicalAwardDelivery>>(() => {
    return StorageService.getAwardDeliveries();
  });

  // Modals state
  const [certificateModalData, setCertificateModalData] = useState<{
    artist: ArtistUser;
    award: AwardTierDefinition;
    certificateCode: string;
    delivery?: PhysicalAwardDelivery;
  } | null>(null);

  const [notificationModalData, setNotificationModalData] = useState<{
    artist: ArtistUser;
    award: AwardTierDefinition;
  } | null>(null);
  const [customNotificationNote, setCustomNotificationNote] = useState<string>('');
  const [notificationSentSuccess, setNotificationSentSuccess] = useState<string | null>(null);

  // Copied toast state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Calculate all artist summaries directly based on Firestore songs & donations data
  const artistSummaries: ArtistAwardSummary[] = useMemo(() => {
    return artists.map((art) => {
      return calculateArtistAwards(art, musicList, donations, exchangeRate, deliveries);
    });
  }, [artists, musicList, donations, exchangeRate, deliveries]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalDisqueOr = 0;
    let totalDisquePlatine = 0;
    let totalTrophy1 = 0;
    let totalTrophy2 = 0;
    let totalTrophy3 = 0;
    let totalTrophy4 = 0;
    let totalEligibleArtists = 0;
    let totalAwardsCount = 0;

    artistSummaries.forEach((s) => {
      if (s.hasDisqueOr) totalDisqueOr++;
      if (s.hasDisquePlatine) totalDisquePlatine++;
      if (s.hasTrophy1) totalTrophy1++;
      if (s.hasTrophy2) totalTrophy2++;
      if (s.hasTrophy3) totalTrophy3++;
      if (s.hasTrophy4) totalTrophy4++;
      if (s.isEligibleForPhysicalAward) totalEligibleArtists++;
      totalAwardsCount += s.unlockedAwardsCount;
    });

    const deliveriesList = Object.values(deliveries) as PhysicalAwardDelivery[];
    const totalPhysicalDelivered = deliveriesList.filter((d) => d.deliveryStatus === 'delivered').length;
    const totalPhysicalInProduction = deliveriesList.filter((d) => d.deliveryStatus === 'in_production').length;
    const totalPhysicalReady = deliveriesList.filter((d) => d.deliveryStatus === 'ready').length;

    return {
      totalDisqueOr,
      totalDisquePlatine,
      totalTrophy1,
      totalTrophy2,
      totalTrophy3,
      totalTrophy4,
      totalDiscs: totalDisqueOr + totalDisquePlatine,
      totalTrophies: totalTrophy1 + totalTrophy2 + totalTrophy3 + totalTrophy4,
      totalEligibleArtists,
      totalAwardsCount,
      totalPhysicalDelivered,
      totalPhysicalInProduction,
      totalPhysicalReady
    };
  }, [artistSummaries, deliveries]);

  // Filter and sort artist summaries
  const filteredSummaries = useMemo(() => {
    return artistSummaries
      .filter((item) => {
        const art = item.artist;
        const matchesSearch =
          !searchQuery.trim() ||
          art.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.phone.includes(searchQuery);

        if (!matchesSearch) return false;

        if (activeFilter === 'eligible') {
          return item.isEligibleForPhysicalAward;
        }
        if (activeFilter === 'discs_only') {
          return item.hasDisqueOr || item.hasDisquePlatine;
        }
        if (activeFilter === 'trophies_only') {
          return item.hasTrophy1 || item.hasTrophy2 || item.hasTrophy3 || item.hasTrophy4;
        }
        if (activeFilter === 'almost') {
          const streamAlmost = item.nextStreamTarget && item.nextStreamTarget.progressPct >= 70;
          const trophyAlmost = item.nextTrophyTarget && item.nextTrophyTarget.progressPct >= 70;
          return streamAlmost || trophyAlmost;
        }
        if (activeFilter === 'need_delivery') {
          if (!item.isEligibleForPhysicalAward) return false;
          // Check if any unlocked award has not been marked as delivered
          return item.unlockedAwards.some((award) => {
            const rec = deliveries[`${item.artist.id}_${award.type}`];
            return !rec || rec.deliveryStatus !== 'delivered';
          });
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'awards_desc') {
          if (b.unlockedAwardsCount !== a.unlockedAwardsCount) {
            return b.unlockedAwardsCount - a.unlockedAwardsCount;
          }
          return b.totalListens - a.totalListens;
        }
        if (sortBy === 'streams_desc') {
          return b.totalListens - a.totalListens;
        }
        if (sortBy === 'donations_desc') {
          return b.totalDonationsUsd - a.totalDonationsUsd;
        }
        if (sortBy === 'name_asc') {
          return a.artist.stageName.localeCompare(b.artist.stageName);
        }
        return 0;
      });
  }, [artistSummaries, searchQuery, activeFilter, sortBy, deliveries]);

  // Update physical delivery status
  const handleUpdateDeliveryStatus = (
    artistId: string,
    artistName: string,
    award: AwardTierDefinition,
    newStatus: AwardPhysicalDeliveryStatus
  ) => {
    const updatedRecord = StorageService.updateAwardDeliveryStatus(
      artistId,
      artistName,
      award,
      newStatus
    );
    setDeliveries((prev) => ({
      ...prev,
      [updatedRecord.id]: updatedRecord
    }));
  };

  // Update delivery admin notes
  const handleUpdateDeliveryNotes = (
    artistId: string,
    artistName: string,
    award: AwardTierDefinition,
    notes: string
  ) => {
    const key = `${artistId}_${award.type}`;
    const currentStatus = deliveries[key]?.deliveryStatus || 'pending';
    const updatedRecord = StorageService.updateAwardDeliveryStatus(
      artistId,
      artistName,
      award,
      currentStatus,
      notes
    );
    setDeliveries((prev) => ({
      ...prev,
      [updatedRecord.id]: updatedRecord
    }));
  };

  // Send official congratulatory email to artist inbox
  const handleSendCongratulatoryEmail = (artist: ArtistUser, award: AwardTierDefinition) => {
    StorageService.sendArtistAwardCongratulationsEmail(
      artist,
      award,
      currentAdminName,
      customNotificationNote.trim() || undefined
    );
    setNotificationSentSuccess(`Notifikasyon felisitasyon pou ${award.title} voye bay ${artist.stageName} nan bwat mesaj li!`);
    setTimeout(() => {
      setNotificationSentSuccess(null);
      setNotificationModalData(null);
      setCustomNotificationNote('');
    }, 2000);
  };

  // Export Awards Data to CSV
  const handleExportCsv = () => {
    const rows = [
      ['ID Atis', 'Non Sèn', 'Vrè Non', 'Telefòn', 'Vil', 'Total Ekout', 'Disque Or (50k)', 'Disque Platine (200k)', 'Total Don ($)', 'Twofe 1 ($500)', 'Twofe 2 ($1500)', 'Twofe 3 ($5000)', 'Twofe 4 ($10000)', 'Total Distenksyon', 'Estati Remiz Fizik']
    ];

    artistSummaries.forEach((s) => {
      const art = s.artist;
      const deliveryStatuses = s.unlockedAwards.map((a) => {
        const d = deliveries[`${art.id}_${a.type}`];
        return `${a.shortLabel}: ${d ? d.deliveryStatus : 'poko kòmanse'}`;
      }).join(' | ');

      rows.push([
        `"${art.id}"`,
        `"${art.stageName.replace(/"/g, '""')}"`,
        `"${art.name.replace(/"/g, '""')}"`,
        `"${art.phone || ''}"`,
        `"${art.city || ''}"`,
        s.totalListens.toString(),
        s.hasDisqueOr ? 'WI' : 'NON',
        s.hasDisquePlatine ? 'WI' : 'NON',
        s.totalDonationsUsd.toFixed(2),
        s.hasTrophy1 ? 'WI' : 'NON',
        s.hasTrophy2 ? 'WI' : 'NON',
        s.hasTrophy3 ? 'WI' : 'NON',
        s.hasTrophy4 ? 'WI' : 'NON',
        s.unlockedAwardsCount.toString(),
        `"${deliveryStatuses}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UpMizik_Palmares_Twofe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. HERO HEADER & QUICK SUMMARY */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121829] via-[#0b101d] to-[#06080e] border border-yellow-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-sm shadow-yellow-400/10">
                <Trophy className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                <span>Palmarès & Twofe Fizik (Hall of Fame)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Lojik Dirèk Firestore
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tableau de Bord Distenksyon & Plak Fizik
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Sistèm kalkil otomatik pou rekonpanse atis yo fizikman: <strong className="text-amber-300">Disque d'Or (50k)</strong>, <strong className="text-cyan-300">Disque de Platine (200k)</strong>, ak <strong className="text-yellow-300">Twofe Donasyon ($500, $1.5k, $5k, $10k)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              title="Telechaje dosye CSV pou grave plak ak twofe"
            >
              <Download className="w-4 h-4 text-yellow-400" />
              <span>Ekspòte CSV Gravi</span>
            </button>

            {onRefreshData && (
              <button
                onClick={onRefreshData}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-yellow-400/20 font-black"
              >
                <Sparkles className="w-4 h-4" />
                <span>Aktyalize Done</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. STATS COUNTERS GRID */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 mt-6 border-t border-white/[0.08]">
          {/* Disque d'Or */}
          <div className="bg-[#070b14]/80 border border-amber-400/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Disque d'Or</span>
              <Disc className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-300 font-mono">{stats.totalDisqueOr}</span>
              <span className="text-[10px] text-slate-400 block">50,000+ Ekout</span>
            </div>
          </div>

          {/* Disque de Platine */}
          <div className="bg-[#070b14]/80 border border-cyan-400/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Disque Platine</span>
              <Disc className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-cyan-200 font-mono">{stats.totalDisquePlatine}</span>
              <span className="text-[10px] text-slate-400 block">200,000+ Ekout</span>
            </div>
          </div>

          {/* Twofe 1 & 2 */}
          <div className="bg-[#070b14]/80 border border-orange-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">Twofe 1 & 2</span>
              <Trophy className="w-4 h-4 text-orange-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-orange-300 font-mono">
                {stats.totalTrophy1 + stats.totalTrophy2}
              </span>
              <span className="text-[10px] text-slate-400 block">$500 & $1,500+</span>
            </div>
          </div>

          {/* Twofe 3 & 4 */}
          <div className="bg-[#070b14]/80 border border-yellow-400/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Twofe 3 & 4</span>
              <Crown className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-yellow-300 font-mono">
                {stats.totalTrophy3 + stats.totalTrophy4}
              </span>
              <span className="text-[10px] text-slate-400 block">$5,000 & $10k+</span>
            </div>
          </div>

          {/* Atis Kalifye */}
          <div className="bg-[#070b14]/80 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Atis Kalifye</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-300 font-mono">{stats.totalEligibleArtists}</span>
              <span className="text-[10px] text-slate-400 block">sou {artists.length} atis total</span>
            </div>
          </div>

          {/* Remiz Fizik */}
          <div className="bg-[#070b14]/80 border border-blue-500/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">Remèt Fizik</span>
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-300 font-mono">{stats.totalPhysicalDelivered}</span>
              <span className="text-[10px] text-slate-400 block">
                {stats.totalPhysicalInProduction} an preparasyon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. REFERENCE GUIDE CARD: REGLEMAN PALMARES & TWOFÈ */}
      <div className="bg-[#080d1a] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Gril Rekonpans & Objektif Ofisyèl UpMizik
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Valè yo kalkile an tan reyèl depi nan Firestore
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stream rules */}
          <div className="bg-[#050811] border border-amber-500/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Disc className="w-4 h-4 text-amber-400" />
              <span>Plak Ekout (Streams)</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                <span className="text-amber-200 font-semibold">🟡 Disque d'Or:</span>
                <span className="font-mono font-bold text-amber-300">50,000 Ekout</span>
              </div>
              <div className="flex items-center justify-between bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                <span className="text-cyan-200 font-semibold">⚪ Disque Platine:</span>
                <span className="font-mono font-bold text-cyan-300">200,000 Ekout</span>
              </div>
            </div>
          </div>

          {/* Trophy Tier 1 & 2 */}
          <div className="bg-[#050811] border border-orange-500/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-orange-300 font-bold text-xs">
              <Trophy className="w-4 h-4 text-orange-400" />
              <span>Twofe Donasyon (Nivo 1 & 2)</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                <span className="text-orange-200 font-semibold">🥉 Twofe 1 (Bwonz):</span>
                <span className="font-mono font-bold text-orange-300">$500 USD</span>
              </div>
              <div className="flex items-center justify-between bg-slate-300/10 px-2 py-1 rounded border border-slate-300/20">
                <span className="text-slate-200 font-semibold">🥈 Twofe 2 (Ajan):</span>
                <span className="font-mono font-bold text-slate-200">$1,500 USD</span>
              </div>
            </div>
          </div>

          {/* Trophy Tier 3 & 4 */}
          <div className="bg-[#050811] border border-yellow-500/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span>Twofe Donasyon (Nivo 3 & 4)</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                <span className="text-yellow-200 font-semibold">🥇 Twofe 3 (Lò):</span>
                <span className="font-mono font-bold text-yellow-300">$5,000 USD</span>
              </div>
              <div className="flex items-center justify-between bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/20">
                <span className="text-fuchsia-200 font-semibold">💎 Twofe 4 (Dyamant):</span>
                <span className="font-mono font-bold text-fuchsia-300">$10,000 USD</span>
              </div>
            </div>
          </div>

          {/* Physical Delivery Process */}
          <div className="bg-[#050811] border border-blue-500/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Prosesis Remiz Fizik</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1. Sistèm nan detekte otomatikman lè atis la atenn nivo a.<br />
              2. Admin lan chanje estati a an <span className="text-amber-300 font-semibold">"Nan Fabrikasyon"</span>.<br />
              3. Lè plak la pare, voye notifikasyon nan bwat mesaj atis la epi remèt li fizikman.
            </p>
          </div>
        </div>
      </div>

      {/* 4. CONTROLS: SEARCH, FILTERS & SORT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0f1d] border border-white/[0.08] rounded-2xl p-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery ?? ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Chèche pa non atis, non sèn, vil, oswa telefòn..."
            className="w-full bg-[#05070a] border border-white/[0.1] focus:border-yellow-400 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-yellow-400 text-slate-950 shadow-sm'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            Tout Atis ({artists.length})
          </button>

          <button
            onClick={() => setActiveFilter('eligible')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'eligible'
                ? 'bg-yellow-400 text-slate-950 shadow-sm'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Kalifye ({stats.totalEligibleArtists})</span>
          </button>

          <button
            onClick={() => setActiveFilter('discs_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'discs_only'
                ? 'bg-yellow-400 text-slate-950 shadow-sm'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            <Disc className="w-3 h-3 text-cyan-400" />
            <span>Plak Ekout Sèlman</span>
          </button>

          <button
            onClick={() => setActiveFilter('trophies_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'trophies_only'
                ? 'bg-yellow-400 text-slate-950 shadow-sm'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            <Crown className="w-3 h-3 text-yellow-400" />
            <span>Twofe Donasyon Sèlman</span>
          </button>

          <button
            onClick={() => setActiveFilter('almost')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'almost'
                ? 'bg-yellow-400 text-slate-950 shadow-sm'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            <Flame className="w-3 h-3 text-red-400" />
            <span>Prèske Rive (≥70%)</span>
          </button>

          <button
            onClick={() => setActiveFilter('need_delivery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'need_delivery'
                ? 'bg-yellow-400 text-slate-950 shadow-sm'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            <Package className="w-3 h-3 text-blue-400" />
            <span>Pou Remèt Fizik</span>
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 whitespace-nowrap">Triye pa:</span>
          <select
            value={sortBy ?? 'awards_desc'}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#05070a] border border-white/[0.1] text-xs text-white rounded-xl py-1.5 px-2.5 outline-none cursor-pointer"
          >
            <option value="awards_desc">Plis Distenksyon An Premye</option>
            <option value="streams_desc">Plis Ekout (Streams) An Premye</option>
            <option value="donations_desc">Plis Donasyon ($) An Premye</option>
            <option value="name_asc">Non Atis (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 5. ARTIST AWARDS CARDS LIST */}
      <div className="space-y-4">
        {filteredSummaries.length === 0 ? (
          <div className="bg-[#0a0f1d] border border-white/[0.08] rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-white">Pa gen atis ki koresponn ak filtè sa a</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Eseye retire kèk filtè oswa modifye rechèch ou a pou wè lòt atis ak nivo yo sou platfòm nan.
            </p>
          </div>
        ) : (
          filteredSummaries.map((summary) => {
            const art = summary.artist;
            const hasAnyAward = summary.unlockedAwards.length > 0;

            // Generate cleaned phone number for WhatsApp
            const rawPhone = (art.phone || '').replace(/\D/g, '');
            const formattedWaPhone = rawPhone.startsWith('509') ? rawPhone : (rawPhone ? `509${rawPhone}` : '');

            return (
              <div
                key={art.id}
                className={`bg-[#0a0f1d] border rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden ${
                  hasAnyAward
                    ? 'border-yellow-400/40 shadow-xl shadow-yellow-500/5 bg-gradient-to-r from-[#0d1326] to-[#0a0f1d]'
                    : 'border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {/* Visual Top Bar if has Platine or Trophy 4 */}
                {summary.hasDisquePlatine && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400" />
                )}
                {!summary.hasDisquePlatine && summary.hasDisqueOr && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                )}

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Artist Profile & Badges */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={art.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80'}
                        alt={art.stageName}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/[0.12] bg-[#05070a] shadow-lg"
                        referrerPolicy="no-referrer"
                      />
                      {hasAnyAward && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                          <Trophy className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2 flex-1">
                      {/* Name & Title */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-white truncate">{art.stageName}</h3>
                        <span className="text-xs text-slate-400 truncate">({art.name})</span>
                        
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            art.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {art.status === 'active' ? 'Atis Verifye' : art.status}
                        </span>
                      </div>

                      {/* City, Phone, Songs count */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-yellow-400" />
                          <strong className="text-white font-mono">{art.phone || 'N/A'}</strong>
                        </span>
                        <span>•</span>
                        <span>{art.city || 'Ayiti'}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-semibold">{summary.artistSongs.length} Mizik sou sit la</span>
                      </div>

                      {/* ALL EARNED BADGES (PLAK & TWOFÈ) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {summary.unlockedAwards.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">
                            Poko atenn premye nivo a (50k ekout oswa $500 don)
                          </span>
                        ) : (
                          summary.unlockedAwards.map((award) => (
                            <span
                              key={award.type}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${award.badgeBg} ${award.badgeText} ${award.badgeBorder} ${award.glowShadow}`}
                            >
                              {award.iconName === 'disc' ? (
                                <Disc className="w-3.5 h-3.5 animate-spin-slow" />
                              ) : award.iconName === 'crown' ? (
                                <Crown className="w-3.5 h-3.5" />
                              ) : (
                                <Trophy className="w-3.5 h-3.5" />
                              )}
                              <span>{award.title}</span>
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Streams & Donations Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-[480px] shrink-0 bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4">
                    {/* 1. Ekout (Streams) Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Disc className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Ekout (Streams)</span>
                        </span>
                        <span className="text-xs font-mono font-black text-cyan-300">
                          {summary.totalListens.toLocaleString()}
                        </span>
                      </div>

                      {/* Progress Bar towards next stream milestone */}
                      {summary.nextStreamTarget ? (
                        <div className="space-y-1">
                          <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                summary.nextStreamTarget.target.type === 'disque_platine'
                                  ? 'bg-gradient-to-r from-cyan-400 to-indigo-400'
                                  : 'bg-gradient-to-r from-amber-400 to-yellow-400'
                              }`}
                              style={{ width: `${summary.nextStreamTarget.progressPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{summary.nextStreamTarget.progressPct}% pou {summary.nextStreamTarget.target.shortLabel}</span>
                            <span className="text-yellow-400 font-mono font-semibold">
                              (Manke {summary.nextStreamTarget.remaining.toLocaleString()})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                          <CheckCircle className="w-3 h-3" />
                          <span>Maksimòm Plak Atenn (Platine 200k+)</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Donasyon Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Donasyon & Sipò</span>
                        </span>
                        <span className="text-xs font-mono font-black text-yellow-400">
                          ${summary.totalDonationsUsd.toFixed(2)} USD
                        </span>
                      </div>

                      {/* Progress Bar towards next trophy milestone */}
                      {summary.nextTrophyTarget ? (
                        <div className="space-y-1">
                          <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 rounded-full transition-all"
                              style={{ width: `${summary.nextTrophyTarget.progressPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{summary.nextTrophyTarget.progressPct}% pou {summary.nextTrophyTarget.target.shortLabel}</span>
                            <span className="text-amber-300 font-mono font-semibold">
                              (Manke ${summary.nextTrophyTarget.remainingUsd.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-fuchsia-300 bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/20">
                          <CheckCircle className="w-3 h-3" />
                          <span>Maksimòm Twofe Atenn (Twofe 4 - $10k+)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PHYSICAL DELIVERY & AWARD ACTIONS (If artist has any unlocked award) */}
                {hasAnyAward && (
                  <div className="mt-5 pt-5 border-t border-white/[0.08] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-yellow-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                          Jere Fabrikasyon & Remiz Fizik Plak / Twofe pou {art.stageName}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* WhatsApp invite */}
                        {formattedWaPhone && (
                          <a
                            href={`https://wa.me/${formattedWaPhone}?text=${encodeURIComponent(
                              `Bonjou ${art.stageName}, administrasyon UpMizik la (${currentAdminName}) felisite w pou gwo rekò mizikal ou yo! Nou gen yon plak/twofe ofisyèl k ap prepare pou remèt ou an men pwòp. Tanpri konfime adrès oswa disponiblite w.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Kontakte sou WhatsApp</span>
                          </a>
                        )}

                        {/* Copy SMS / WhatsApp Text */}
                        <button
                          onClick={() => {
                            const text = `Bonjou ${art.stageName}, administrasyon UpMizik la felisite w pou distenksyon w yo: ${summary.unlockedAwards.map((a) => a.title).join(', ')}. Plak ak twofe fizik ou yo ap prepare pou remiz ofisyèl!`;
                            navigator.clipboard.writeText(text);
                            setCopiedKey(`sms_${art.id}`);
                            setTimeout(() => setCopiedKey(null), 3000);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] flex items-center gap-1.5 transition-all"
                        >
                          {copiedKey === `sms_${art.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Kopye!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Kopye Tèks Envitasyon</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Delivery Status Rows for each unlocked award */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {summary.unlockedAwards.map((award) => {
                        const deliveryKey = `${art.id}_${award.type}`;
                        const deliveryRecord = deliveries[deliveryKey];
                        const currentStatus: AwardPhysicalDeliveryStatus = deliveryRecord?.deliveryStatus || 'pending';

                        return (
                          <div
                            key={award.type}
                            className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-3.5 space-y-3 flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${award.badgeBg} ${award.badgeText} border ${award.badgeBorder}`}>
                                  {award.iconName === 'disc' ? (
                                    <Disc className="w-4 h-4" />
                                  ) : (
                                    <Trophy className="w-4 h-4" />
                                  )}
                                </span>
                                <div>
                                  <h5 className="text-xs font-black text-white">{award.title}</h5>
                                  <span className="text-[10px] text-slate-400 font-mono font-semibold">
                                    Objektif: {award.thresholdFormatted}
                                  </span>
                                </div>
                              </div>

                              {/* Certificate Preview button */}
                              <button
                                onClick={() => {
                                  setCertificateModalData({
                                    artist: art,
                                    award,
                                    certificateCode: `UPM-${award.type.toUpperCase()}-${art.id.replace('artist-', '')}`,
                                    delivery: deliveryRecord
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 transition-all text-[11px] font-bold flex items-center gap-1"
                                title="Gade oswa Enprime Sètifika Palmarès la"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Sètifika</span>
                              </button>
                            </div>

                            {/* Status Selector */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Estati Remiz Fizik la:
                              </label>
                              <select
                                value={currentStatus ?? 'pending'}
                                onChange={(e) =>
                                  handleUpdateDeliveryStatus(
                                    art.id,
                                    art.stageName || art.name,
                                    award,
                                    e.target.value as AwardPhysicalDeliveryStatus
                                  )
                                }
                                className={`w-full text-xs font-bold rounded-xl py-2 px-2.5 border outline-none cursor-pointer ${
                                  currentStatus === 'delivered'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : currentStatus === 'ready'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : currentStatus === 'in_production'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-white/[0.06] text-slate-300 border-white/[0.1]'
                                }`}
                              >
                                <option value="pending">⏳ Poko Kòmanse (An Atant)</option>
                                <option value="in_production">🛠️ Nan Fabrikasyon / Gravi</option>
                                <option value="ready">📦 Pare pou Remèt (Disponib)</option>
                                <option value="delivered">✅ Remèt Fizikman bay Atis la</option>
                              </select>
                            </div>

                            {/* Quick Notification Action */}
                            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                              <button
                                onClick={() => {
                                  setNotificationModalData({
                                    artist: art,
                                    award
                                  });
                                  setCustomNotificationNote(`Felisitasyon ${art.stageName}! Plak/Twofe ${award.title} ou a ap prepare kounye a pou remèt ou.`);
                                }}
                                className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Send className="w-3 h-3" />
                                <span>Voye nan Inbox Atis</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. MODAL: OFFICIAL HIGH-RES PRINTABLE & EDITABLE AWARDS CERTIFICATE WITH PDF DOWNLOAD */}
      {certificateModalData && (
        <OfficialCertificateModal
          initialArtistStageName={certificateModalData.artist.stageName}
          initialArtistRealName={certificateModalData.artist.name || certificateModalData.artist.stageName}
          initialAward={certificateModalData.award}
          defaultSignerName={currentAdminName}
          defaultSignerTitle="Prezidan & Fondatè UpMizik"
          onClose={() => setCertificateModalData(null)}
        />
      )}

      {/* 7. MODAL: SEND CONGRATULATIONS NOTIFICATION TO ARTIST INBOX */}
      {notificationModalData && (() => {
        const { artist, award } = notificationModalData;

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setNotificationModalData(null);
            }}
          >
            <div
              className="relative max-w-lg w-full bg-[#0a0f1d] border border-yellow-400/40 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-base font-black text-white">Voye Notifikasyon Felisitasyon</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationModalData(null)}
                  className="p-1.5 rounded-xl bg-white/[0.06] text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {notificationSentSuccess ? (
                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-black text-white">Notifikasyon Voye avèk Siksè!</h4>
                  <p className="text-xs text-emerald-300">{notificationSentSuccess}</p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="bg-[#05070a] border border-white/[0.08] rounded-xl p-3 space-y-1">
                    <p className="text-slate-400">
                      👤 <strong>Atis Destinatè:</strong> <span className="text-white font-bold">{artist.stageName}</span> ({artist.email})
                    </p>
                    <p className="text-slate-400">
                      🏆 <strong>Distenksyon:</strong> <span className="text-yellow-300 font-bold">{award.title} ({award.thresholdFormatted})</span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Nòt oswa Mesaj Pèsonalize (Opsyonèl):
                    </label>
                    <textarea
                      rows={3}
                      value={customNotificationNote ?? ''}
                      onChange={(e) => setCustomNotificationNote(e.target.value)}
                      placeholder="Ekri yon ti nòt ankourajman oswa enstriksyon pou vini pran plak la..."
                      className="w-full bg-[#05070a] border border-white/[0.12] focus:border-yellow-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setNotificationModalData(null)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"
                    >
                      Anile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendCongratulatoryEmail(artist, award)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:from-yellow-300 hover:to-amber-400 flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/20 active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Voye nan Bwat Mesaj (Inbox)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
