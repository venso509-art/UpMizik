import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Flame,
  Sparkles,
  HeartHandshake,
  Play,
  Pause,
  MapPin,
  Music,
  CheckCircle2,
  TrendingUp,
  Headphones,
  DollarSign,
  ArrowUpRight,
  Filter,
  Search,
  ExternalLink,
  Users,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ArtistUser, MusicItem, MusicCategory } from '../types';
import { ArtistBadge } from './ArtistBadge';
import { getArtistBadgeInfo } from '../utils/badgeSystem';

interface ArtistLeaderboardProps {
  artists: ArtistUser[];
  musicList: MusicItem[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile: (artist: ArtistUser) => void;
  onOpenArtistAuth?: () => void;
}

export interface RankedArtist {
  rank: number;
  artist: ArtistUser;
  cumulativeDonations: number;
  totalListens: number;
  songCount: number;
  topSong: MusicItem | null;
  primaryGenre: MusicCategory | string;
  donationSharePercentage: number;
}

export const ArtistLeaderboard: React.FC<ArtistLeaderboardProps> = ({
  artists,
  musicList,
  currentPlayingId,
  isPlaying,
  onPlayToggle,
  onOpenSupport,
  onOpenArtistProfile,
  onOpenArtistAuth
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('Tout');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Calculate cumulative stats and rank top 10 artists based on cumulative donations
  const rankedArtists: RankedArtist[] = useMemo(() => {
    // Only active artists with valid object
    const activeArtists = (artists || []).filter(a => a && a.id && (a.status === 'active' || !a.status));

    const calculatedList = activeArtists.map(artist => {
      const artistSongs = (musicList || []).filter(
        m => m && (m.artistId === artist.id || (m.artistName && artist.stageName && m.artistName.toLowerCase() === artist.stageName.toLowerCase()))
      );

      const songDonationsSum = artistSongs.reduce((sum, s) => sum + (s.totalDonations || 0), 0);
      const cumulativeDonations = Math.max(artist.totalDonationsReceived || 0, songDonationsSum);

      const songListensSum = artistSongs.reduce((sum, s) => sum + (s.listens || 0), 0);
      const totalListens = Math.max(artist.totalListens || 0, songListensSum);

      // Identify breakout / highest donated track
      let topSong: MusicItem | null = null;
      if (artistSongs.length > 0) {
        topSong = [...artistSongs].sort((a, b) => (b.totalDonations || 0) - (a.totalDonations || 0) || (b.listens || 0) - (a.listens || 0))[0];
      }

      // Identify most common genre
      const genreCounts: Record<string, number> = {};
      artistSongs.forEach(s => {
        if (s?.category) {
          genreCounts[s.category] = (genreCounts[s.category] || 0) + 1;
        }
      });
      let primaryGenre = 'Kreyòl';
      let maxCount = 0;
      Object.entries(genreCounts).forEach(([g, count]) => {
        if (count > maxCount) {
          maxCount = count;
          primaryGenre = g;
        }
      });

      return {
        artist,
        cumulativeDonations,
        totalListens,
        songCount: artistSongs.length,
        topSong,
        primaryGenre
      };
    });

    // Sort descending by cumulativeDonations, then totalListens
    calculatedList.sort((a, b) => b.cumulativeDonations - a.cumulativeDonations || b.totalListens - a.totalListens);

    const totalDonationsAll = calculatedList.reduce((sum, item) => sum + item.cumulativeDonations, 0) || 1;

    return calculatedList.map((item, index) => ({
      ...item,
      rank: index + 1,
      donationSharePercentage: Math.round((item.cumulativeDonations / totalDonationsAll) * 100)
    }));
  }, [artists, musicList]);

  // Filter for search & genre
  const filteredLeaderboard = useMemo(() => {
    return rankedArtists.filter(item => {
      if (!item || !item.artist) return false;
      const matchGenre = selectedGenre === 'Tout' || (item.primaryGenre || '').toLowerCase() === selectedGenre.toLowerCase();
      const matchSearch =
        searchTerm.trim() === '' ||
        (item.artist.stageName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.artist.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.artist.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.primaryGenre || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchGenre && matchSearch;
    }).slice(0, 10); // TOP 10
  }, [rankedArtists, selectedGenre, searchTerm]);

  // Total funds raised across top 10
  const totalTop10Funds = useMemo(() => {
    return rankedArtists.slice(0, 10).reduce((sum, a) => sum + (a?.cumulativeDonations || 0), 0);
  }, [rankedArtists]);

  // Top 3 Podium
  const top1 = rankedArtists[0];
  const top2 = rankedArtists[1];
  const top3 = rankedArtists[2];

  const genresList = ['Tout', 'Kompa', 'Drill', 'Rap', 'Afro', 'Gouyad', 'Rabòday', 'Trap'];

  return (
    <section id="artist-leaderboard-section" className="relative space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>Klasman Ofisyèl Sipò Fanatik</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-3">
            <span>Top 10 Klasman Atis</span>
            <span className="text-xs font-bold text-slate-900 bg-gradient-to-r from-yellow-400 to-amber-400 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md shadow-yellow-500/20">
              Leaderboard
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Dekouvri e sipòte 10 jèn atis ki resevwa plis sipò dirèk nan men kominote a. Fanatik yo vote ak kòb yo (MonCash/Natcash)!
          </p>
        </div>

        {/* Global Impact Summary Pill */}
        <div className="flex items-center gap-3 bg-[#0a0f1d]/90 border border-yellow-500/30 p-3.5 rounded-2xl backdrop-blur-xl shadow-xl shadow-yellow-950/20 self-start md:self-auto shrink-0">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Klasman Sipò</div>
            <div className="text-lg sm:text-xl font-black text-yellow-400">
              Top 10 Atis <span className="text-xs text-slate-400 font-normal">Ofisyèl</span>
            </div>
          </div>
        </div>
      </div>

      {/* Podium Top 3 Visual Cards (Responsive 3-Column Layout, Always Visible) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
        {/* #2 Rank - Silver */}
        {top2?.artist ? (
          <div className="order-2 md:order-1 relative bg-gradient-to-b from-slate-900/90 via-[#0a0f1d]/95 to-[#05070a] border border-slate-400/30 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl backdrop-blur-2xl group hover:border-slate-300/50 transition-all duration-300">
            <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg border border-white">
              <Medal className="w-3.5 h-3.5 text-slate-800" />
              <span>#2 Top Atis</span>
            </div>

            <div>
              <div className="flex items-center gap-4 mt-2 mb-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md shrink-0 bg-black">
                  <img src={top2.artist.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'} alt={top2.artist.stageName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate flex items-center gap-1.5 flex-wrap">
                    <span>{top2.artist.stageName}</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <ArtistBadge donations={top2.cumulativeDonations} size="xs" />
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-300" />
                    <span className="truncate">{top2.artist.city || 'Ayiti'}</span>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md mt-1.5 border border-slate-700">
                    {top2.primaryGenre}
                  </span>
                </div>
              </div>

              <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3.5 mb-4 grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nivo Kominotè</span>
                  <span className="text-xs sm:text-sm font-black text-yellow-400">
                    {getArtistBadgeInfo(top2.artist, musicList).label}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ekout</span>
                  <span className="text-lg font-black text-white font-mono">{(top2.totalListens || 0).toLocaleString()}</span>
                </div>
              </div>

              {top2.topSong && (
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-2.5 mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400">Pi Gwo Moso:</div>
                      <div className="text-xs font-bold text-white truncate">{top2.topSong.title}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => top2.topSong && onPlayToggle(top2.topSong)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shrink-0"
                    title="Koute"
                  >
                    {currentPlayingId === top2.topSong.id && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => onOpenArtistProfile(top2.artist)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#0d1424] hover:bg-[#131c33] text-slate-200 border border-white/[0.1] transition-all text-center"
              >
                Gade Pwofil
              </button>
              {top2.topSong && (
                <button
                  onClick={() => onOpenSupport(top2.topSong!)}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 shadow-lg shadow-yellow-950/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Sipòte ($)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="order-2 md:order-1 relative bg-gradient-to-b from-slate-900/30 via-[#0a0f1d]/70 to-[#05070a] border border-slate-700/30 rounded-3xl p-5 sm:p-6 flex flex-col justify-between backdrop-blur-xl">
            <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-lg border border-slate-700">
              <Medal className="w-3.5 h-3.5 text-slate-400" />
              <span>#2 Top Atis</span>
            </div>
            <div>
              <div className="flex items-center gap-4 mt-3 mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-800 flex items-center justify-center bg-black/40 text-slate-500 shrink-0">
                  <Medal className="w-8 h-8 opacity-40" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-300">Pozisyon #2</h3>
                  <p className="text-xs text-slate-500 mt-1">Klasman ap kalkile selon ekout fanatik yo</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* #1 Rank - Champion Gold */}
        {top1?.artist ? (
          <div className="order-1 md:order-2 relative bg-gradient-to-b from-amber-950/60 via-[#0a0f1d] to-[#05070a] border-2 border-yellow-400/60 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl shadow-yellow-500/10 backdrop-blur-2xl group hover:border-yellow-400 transition-all duration-300 transform md:-translate-y-2">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-xl border-2 border-white uppercase tracking-wider">
              <Crown className="w-4 h-4 fill-slate-950" />
              <span>#1 Chanpyon Leaderboard</span>
            </div>

            <div>
              <div className="flex flex-col items-center text-center mt-3 mb-4">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-yellow-400 shadow-2xl shadow-yellow-400/20 mb-3 bg-black">
                  <img src={top1.artist.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'} alt={top1.artist.stageName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-0 inset-x-0 bg-yellow-400 text-slate-950 text-[10px] font-black uppercase py-0.5">
                    Top 1
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-1.5 flex-wrap">
                  <span>{top1.artist.stageName}</span>
                  <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                  <ArtistBadge donations={top1.cumulativeDonations} size="xs" />
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">{top1.artist.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-yellow-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{top1.artist.city || 'Ayiti'}</span>
                </div>
              </div>

              <div className="bg-[#05070a]/95 border border-yellow-500/20 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-yellow-400/80 block">Nivo Kominotè</span>
                  <span className="text-sm sm:text-base font-black text-yellow-400">
                    {getArtistBadgeInfo(top1.artist, musicList).label}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Ekout</span>
                  <span className="text-2xl font-black text-white font-mono">{(top1.totalListens || 0).toLocaleString()}</span>
                </div>
              </div>

              {top1.topSong && (
                <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Hit K ap Pote L Pi Wo:</div>
                      <div className="text-xs font-black text-white truncate">{top1.topSong.title}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => top1.topSong && onPlayToggle(top1.topSong)}
                    className="p-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 shrink-0 font-bold shadow-md shadow-yellow-500/30"
                    title="Koute Koulye a"
                  >
                    {currentPlayingId === top1.topSong.id && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={() => onOpenArtistProfile(top1.artist)}
                className="flex-1 py-3 px-3.5 rounded-2xl text-xs font-bold bg-[#0d1424] hover:bg-[#131c33] text-slate-200 border border-white/[0.12] transition-all text-center"
              >
                Pwofil Atis
              </button>
              {top1.topSong && (
                <button
                  onClick={() => onOpenSupport(top1.topSong!)}
                  className="flex-1 py-3 px-3.5 rounded-2xl text-xs font-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Sipòte Chanpyon an</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="order-1 md:order-2 relative bg-gradient-to-b from-amber-950/20 via-[#0a0f1d] to-[#05070a] border border-yellow-500/20 rounded-3xl p-6 sm:p-7 flex flex-col justify-between backdrop-blur-2xl transform md:-translate-y-2">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 font-black text-xs flex items-center gap-2 shadow-xl border border-yellow-500/30 uppercase tracking-wider">
              <Crown className="w-4 h-4" />
              <span>#1 Chanpyon Leaderboard</span>
            </div>
            <div>
              <div className="flex flex-col items-center text-center mt-3 mb-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border border-yellow-500/20 flex items-center justify-center bg-black/50 text-yellow-500/40 mb-3">
                  <Crown className="w-12 h-12 opacity-40" />
                </div>
                <h3 className="text-xl font-black text-slate-200">Pozisyon #1</h3>
                <p className="text-xs text-slate-400 mt-1">Klasman ap kalkile selon ekout fanatik yo</p>
              </div>
            </div>
          </div>
        )}

        {/* #3 Rank - Bronze */}
        {top3?.artist ? (
          <div className="order-3 md:order-3 relative bg-gradient-to-b from-amber-950/40 via-[#0a0f1d]/95 to-[#05070a] border border-amber-600/30 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl backdrop-blur-2xl group hover:border-amber-500/50 transition-all duration-300">
            <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-lg border border-amber-400/50">
              <Medal className="w-3.5 h-3.5 text-amber-300" />
              <span>#3 Top Atis</span>
            </div>

            <div>
              <div className="flex items-center gap-4 mt-2 mb-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-600 shadow-md shrink-0 bg-black">
                  <img src={top3.artist.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80'} alt={top3.artist.stageName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate flex items-center gap-1.5 flex-wrap">
                    <span>{top3.artist.stageName}</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <ArtistBadge donations={top3.cumulativeDonations} size="xs" />
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{top3.artist.city || 'Ayiti'}</span>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md mt-1.5 border border-amber-700">
                    {top3.primaryGenre}
                  </span>
                </div>
              </div>

              <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3.5 mb-4 grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nivo Kominotè</span>
                  <span className="text-xs sm:text-sm font-black text-yellow-400">
                    {getArtistBadgeInfo(top3.artist, musicList).label}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ekout</span>
                  <span className="text-lg font-black text-white font-mono">{(top3.totalListens || 0).toLocaleString()}</span>
                </div>
              </div>

              {top3.topSong && (
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-2.5 mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400">Pi Gwo Moso:</div>
                      <div className="text-xs font-bold text-white truncate">{top3.topSong.title}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => top3.topSong && onPlayToggle(top3.topSong)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shrink-0"
                    title="Koute"
                  >
                    {currentPlayingId === top3.topSong.id && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => onOpenArtistProfile(top3.artist)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#0d1424] hover:bg-[#131c33] text-slate-200 border border-white/[0.1] transition-all text-center"
              >
                Gade Pwofil
              </button>
              {top3.topSong && (
                <button
                  onClick={() => onOpenSupport(top3.topSong!)}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 shadow-lg shadow-yellow-950/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Sipòte ($)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="order-3 md:order-3 relative bg-gradient-to-b from-amber-950/10 via-[#0a0f1d]/70 to-[#05070a] border border-amber-800/30 rounded-3xl p-5 sm:p-6 flex flex-col justify-between backdrop-blur-xl">
            <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full bg-amber-900/60 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-lg border border-amber-800">
              <Medal className="w-3.5 h-3.5 text-amber-400" />
              <span>#3 Top Atis</span>
            </div>
            <div>
              <div className="flex items-center gap-4 mt-3 mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-amber-900/40 flex items-center justify-center bg-black/40 text-amber-600/40 shrink-0">
                  <Medal className="w-8 h-8 opacity-40" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-300">Pozisyon #3</h3>
                  <p className="text-xs text-slate-500 mt-1">Klasman ap kalkile selon ekout fanatik yo</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Top 10 Interactive Table & List */}
      <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
        
        {/* Controls: Search & Genre Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {genresList.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGenre === genre
                    ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                    : 'bg-[#05070a] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm ?? ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Chèche atis nan klasman an..."
              className="w-full bg-[#05070a] border border-white/[0.08] text-xs text-white rounded-xl pl-9 pr-3 py-2 outline-none focus:border-yellow-400/50"
            />
          </div>
        </div>

        {/* Leaderboard Table / Cards */}
        <div className="space-y-3">
          {filteredLeaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs sm:text-sm">
              Pa gen okenn atis ki koresponn ak rechèch sa a.
            </div>
          ) : (
            filteredLeaderboard.map((item) => {
              if (!item || !item.artist) return null;
              const isTop3 = item.rank <= 3;
              const isPlayingThisTrack = item.topSong && currentPlayingId === item.topSong.id && isPlaying;

              return (
                <div
                  key={item.artist.id || `artist-rank-${item.rank}`}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.rank === 1
                      ? 'bg-amber-950/20 border-yellow-400/40 shadow-lg shadow-yellow-500/5'
                      : item.rank === 2
                      ? 'bg-slate-900/40 border-slate-400/30'
                      : item.rank === 3
                      ? 'bg-amber-950/15 border-amber-600/30'
                      : 'bg-[#05070a]/80 border-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  {/* Left: Rank, Avatar & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-md ${
                        item.rank === 1
                          ? 'bg-yellow-400 text-slate-950'
                          : item.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : item.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-[#0a0f1d] text-slate-400 border border-white/[0.08]'
                      }`}
                    >
                      {item.rank === 1 ? <Crown className="w-4 h-4 fill-slate-950" /> : `#${item.rank}`}
                    </div>

                    {/* Avatar */}
                    <div
                      onClick={() => onOpenArtistProfile(item.artist)}
                      className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-white/[0.1] bg-black shrink-0 cursor-pointer group"
                    >
                      <img
                        src={item.artist.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                        alt={item.artist.stageName || 'Atis'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>

                    {/* Artist Text Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4
                          onClick={() => onOpenArtistProfile(item.artist)}
                          className="font-black text-sm sm:text-base text-white hover:text-yellow-400 cursor-pointer truncate transition-colors font-['Cabinet_Grotesk',sans-serif]"
                        >
                          {item.artist.stageName || 'Atis UpMizik'}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <ArtistBadge donations={item.cumulativeDonations} size="xs" />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-slate-300">
                          <MapPin className="w-3 h-3 text-yellow-400" />
                          <span className="truncate">{item.artist.city || 'Ayiti'}</span>
                        </span>
                        <span>•</span>
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                          {item.primaryGenre || 'Kreyòl'}
                        </span>
                        {item.topSong && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline text-[11px] text-slate-400 truncate">
                              Hit: <strong className="text-slate-200">{item.topSong.title}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t sm:border-t-0 border-white/[0.06] pt-2.5 sm:pt-0">
                    {/* Listens Metric */}
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center sm:justify-end gap-1">
                        <Headphones className="w-3 h-3 text-cyan-400" />
                        Koute
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white font-mono">
                        {(item.totalListens || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Community Tier Status */}
                    <div className="text-left sm:text-right min-w-[90px]">
                      <span className="text-[10px] uppercase font-bold text-yellow-400 flex items-center sm:justify-end gap-1">
                        <Trophy className="w-3 h-3" />
                        Nivo Sipò
                      </span>
                      <span className="text-xs sm:text-sm font-black text-yellow-400">
                        {getArtistBadgeInfo(item.artist, musicList).label}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.topSong && (
                        <button
                          onClick={() => onPlayToggle(item.topSong!)}
                          className={`p-2 sm:p-2.5 rounded-xl transition-all ${
                            isPlayingThisTrack
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/40 animate-pulse'
                              : 'bg-[#0d1424] hover:bg-[#131c33] text-slate-300 hover:text-white border border-white/[0.08]'
                          }`}
                          title={isPlayingThisTrack ? 'Poze Mizik' : 'Koute Hit la'}
                        >
                          {isPlayingThisTrack ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                      )}

                      {item.topSong ? (
                        <button
                          onClick={() => onOpenSupport(item.topSong!)}
                          className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 shadow-md shadow-yellow-950/30 flex items-center gap-1.5 transition-all active:scale-95"
                          title="Sipòte Atis Sa a"
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Sipòte</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenArtistProfile(item.artist)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0d1424] hover:bg-[#131c33] text-slate-200 border border-white/[0.08]"
                        >
                          Pwofil
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Community Empowering Footer Note */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Chak donasyon valide bay atis la 85% kòb la dirèkteman epi ogmante plas li nan klasman an.</span>
          </div>
          <div className="font-semibold text-yellow-400">
            Platfòm UpMizik Ayiti
          </div>
        </div>

      </div>
    </section>
  );
};
