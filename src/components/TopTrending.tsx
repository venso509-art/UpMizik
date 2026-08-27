import React, { useState } from 'react';
import { Trophy, Play, Pause, HeartHandshake, Eye, Flame, Crown, Music, Sparkles, Share2, PlusCircle, ArrowUpRight } from 'lucide-react';
import { MusicItem } from '../types';
import { ArtistBadge } from './ArtistBadge';
import { getBadgeByDonations } from '../utils/badgeSystem';
import { FloatingHearts, createHeartBurst, FloatingHeartParticle } from './FloatingHearts';

interface TopTrendingProps {
  topMusic: MusicItem[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile: (artistId: string) => void;
  onShare?: (music: MusicItem) => void;
  onOpenArtistAuth?: () => void;
}

export const TopTrending: React.FC<TopTrendingProps> = ({
  topMusic = [],
  currentPlayingId,
  isPlaying,
  onPlayToggle,
  onOpenSupport,
  onOpenArtistProfile,
  onShare,
  onOpenArtistAuth
}) => {
  const [heartsMap, setHeartsMap] = useState<Record<string, FloatingHeartParticle[]>>({});

  const handleSupportWithHearts = (music: MusicItem) => {
    const burst = createHeartBurst(8, 80, 20);
    setHeartsMap((prev) => ({
      ...prev,
      [music.id]: [...(prev[music.id] || []), ...burst]
    }));

    setTimeout(() => {
      setHeartsMap((prev) => ({
        ...prev,
        [music.id]: (prev[music.id] || []).filter((h) => !burst.some((b) => b.id === h.id))
      }));
    }, 1400);

    onOpenSupport(music);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return {
        rankNum: 1,
        label: '1ye Plas • Gold',
        badgeClass: 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-slate-950 font-black shadow-lg shadow-yellow-500/40',
        borderClass: 'border-yellow-400/50 shadow-yellow-500/15 shadow-2xl',
        glowBg: 'from-amber-950/30 via-[#0d1424]/90 to-[#05070a]',
        emptyBorderClass: 'border-yellow-400/30 bg-gradient-to-b from-amber-950/20 via-[#0d1424]/70 to-[#05070a]',
        accentColor: 'text-yellow-400',
        icon: <Crown className="w-4 h-4 text-yellow-950 fill-yellow-950" />,
        emptyIcon: <Crown className="w-7 h-7 text-yellow-400 animate-pulse" />
      };
    }
    if (index === 1) {
      return {
        rankNum: 2,
        label: '2èm Plas • Silver',
        badgeClass: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 font-black shadow-lg shadow-slate-300/40',
        borderClass: 'border-slate-300/40 shadow-slate-400/10 shadow-xl',
        glowBg: 'from-slate-800/30 via-[#0d1424]/90 to-[#05070a]',
        emptyBorderClass: 'border-slate-400/30 bg-gradient-to-b from-slate-800/20 via-[#0d1424]/70 to-[#05070a]',
        accentColor: 'text-slate-300',
        icon: <Trophy className="w-4 h-4 text-slate-950 fill-slate-950" />,
        emptyIcon: <Trophy className="w-7 h-7 text-slate-300 animate-pulse" />
      };
    }
    return {
      rankNum: 3,
      label: '3èm Plas • Bronze',
      badgeClass: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-white font-black shadow-lg shadow-amber-700/40',
      borderClass: 'border-amber-600/40 shadow-amber-700/10 shadow-xl',
      glowBg: 'from-amber-900/30 via-[#0d1424]/90 to-[#05070a]',
      emptyBorderClass: 'border-amber-600/30 bg-gradient-to-b from-amber-900/20 via-[#0d1424]/70 to-[#05070a]',
      accentColor: 'text-amber-400',
      icon: <Trophy className="w-4 h-4 text-amber-100 fill-amber-100" />,
      emptyIcon: <Trophy className="w-7 h-7 text-amber-400 animate-pulse" />
    };
  };

  // We guarantee all 3 slots (0, 1, 2) are always rendered!
  const slots = [0, 1, 2];

  return (
    <section id="trending-section" className="py-8 sm:py-12 bg-[#05070a] border-b border-white/[0.06] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-2">
          <div>
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Flame className="w-4 h-4 fill-red-500 text-red-500" />
              <span>Klasman Ofisyèl</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
              Top 3 Mizik ki Pi Cho
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Kalkile pa ekout reyèl ak seleksyon espesyal UpMizik
          </p>
        </div>

        {/* Top 3 Horizontal 3-Column Grid */}
        {topMusic.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topMusic.slice(0, 3).map((music, idx) => {
              const rank = getRankBadge(idx);
              const isThisPlaying = currentPlayingId === music.id && isPlaying;
              return (
                <div
                  key={music.id}
                  id={`top-trending-card-${idx + 1}`}
                  className={`relative group rounded-3xl overflow-hidden border bg-gradient-to-b ${rank.glowBg} ${rank.borderClass} p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl backdrop-blur-xl`}
                >
                  {/* Floating Hearts Particles Burst Container */}
                  <FloatingHearts hearts={heartsMap[music.id] || []} />

                  {/* Rank Badge Header */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs uppercase tracking-wider ${rank.badgeClass}`}>
                      {rank.icon}
                      <span>{rank.label}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {onShare && (
                        <button
                          onClick={() => onShare(music)}
                          className="p-1.5 rounded-lg bg-[#0d1424]/90 hover:bg-[#131c33] text-slate-400 hover:text-cyan-400 border border-white/[0.08] transition-colors"
                          title="Pataje & Jenere Story"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[11px] font-semibold text-slate-300 bg-[#0d1424]/90 px-3 py-1 rounded-lg border border-white/[0.08] backdrop-blur-sm">
                        {music.category}
                      </span>
                    </div>
                  </div>

                  {/* Music Info & Cover Row */}
                  <div className="flex items-center gap-4 my-2">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-white/[0.1] shadow-xl bg-black">
                      <img
                        src={music.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                        alt={music.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <button
                        id={`top-play-btn-${music.id}`}
                        onClick={() => onPlayToggle(music)}
                        className={`absolute inset-0 m-auto w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                          isThisPlaying
                            ? 'bg-red-600 text-white scale-100 shadow-xl shadow-red-600/50'
                            : 'bg-black/60 text-yellow-400 group-hover:bg-blue-600 group-hover:text-white backdrop-blur-md'
                        }`}
                      >
                        {isThisPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-white truncate leading-tight group-hover:text-yellow-300 transition-colors">
                        {music.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <button
                          id={`top-artist-link-${music.id}`}
                          onClick={() => onOpenArtistProfile(music.artistId)}
                          className="text-xs sm:text-sm text-slate-300 hover:text-blue-400 font-medium truncate text-left transition-colors"
                        >
                          {music.artistName} {music.feat ? <span className="text-slate-500 font-normal">ft. {music.feat}</span> : ''}
                        </button>
                        <ArtistBadge donations={music.totalDonations} size="xs" />
                      </div>

                      <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1" title={`${music.listens.toLocaleString()} ekout`}>
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <strong className="text-slate-200">{music.listens.toLocaleString()}</strong>
                        </span>
                        <span className="flex items-center gap-1" title={`${music.sharesCount || 0} pataj`}>
                          <Share2 className="w-3 h-3 text-cyan-400" />
                          <strong className="text-slate-200">{(music.sharesCount || 0).toLocaleString()}</strong>
                        </span>
                        {music.totalDonations > 0 && (
                          <span className="text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20 text-[10px]">
                            ${music.totalDonations.toFixed(0)} Sipò
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2.5">
                    <button
                      id={`top-play-bar-btn-${music.id}`}
                      onClick={() => onPlayToggle(music)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                        isThisPlaying
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                          : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.06]'
                      }`}
                    >
                      {isThisPlaying ? (
                        <>
                          <span className="flex h-2 w-2 rounded-full bg-white animate-ping"></span>
                          <span>Ap Koute Kounya</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Koute Moso Sa</span>
                        </>
                      )}
                    </button>

                    <button
                      id={`top-support-btn-${music.id}`}
                      onClick={() => handleSupportWithHearts(music)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 shadow-lg shadow-yellow-950/40 transition-all active:scale-95 shrink-0"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>Fè yon Sipò</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-[#0a0f1d]/60 border border-white/[0.06] text-center text-slate-400 text-sm">
            Klasman Top 3 a ap kalkile sou ekout ak sipò fanatik yo...
          </div>
        )}

      </div>
    </section>
  );
};

