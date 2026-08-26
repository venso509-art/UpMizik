import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  HeartHandshake,
  Headphones,
  Share2,
  MessageSquare,
  Flame,
  Radio,
  History,
  RotateCcw
} from 'lucide-react';
import { MusicItem } from '../types';
import { StorageService } from '../utils/storage';
import { ArtistBadge } from './ArtistBadge';
import { FloatingHearts, createHeartBurst, FloatingHeartParticle } from './FloatingHearts';

interface RecommendedSectionProps {
  musicList: MusicItem[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenComment: (music: MusicItem) => void;
  onOpenArtistProfile: (artistId: string) => void;
  onShare: (music: MusicItem) => void;
  onHistoryReset?: () => void;
}

export const RecommendedSection: React.FC<RecommendedSectionProps> = ({
  musicList,
  currentPlayingId,
  isPlaying,
  onPlayToggle,
  onOpenSupport,
  onOpenComment,
  onOpenArtistProfile,
  onShare,
  onHistoryReset
}) => {
  const [heartsMap, setHeartsMap] = useState<Record<string, FloatingHeartParticle[]>>({});

  const handleSupportWithHearts = (music: MusicItem) => {
    const burst = createHeartBurst(7, 75, 20);
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
  // Compute recommendations using heuristic matching
  const { recommendations, matchedCategories, lastListenedSongs, isPersonalized } = useMemo(() => {
    return StorageService.getRecommendations(musicList, 6);
  }, [musicList, currentPlayingId]);

  if (!recommendations || recommendations.length === 0) {
    return (
      <section
        id="recommended-section"
        className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#0b1329]/90 via-[#0a0f1d]/90 to-[#05070a] border border-cyan-500/20 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Atis Pou Ou • Algoritm Entelijan</span>
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Espas sa a pare pou klase mizik ak atis yo otomatikman selon sa w koute ak preferans ou!
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="recommended-section"
      className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#0b1329]/90 via-[#0a0f1d]/90 to-[#05070a] border border-cyan-500/20 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl overflow-hidden"
    >
      {/* Decorative background glow accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header & Heuristic Indicator */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>Algoritm Entelijan • Rekòmandasyon Pou Ou</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
            <span>Atis Pou Ou</span>
            <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400/20 animate-spin-slow" />
          </h2>

          {/* Contextual Subtitle describing heuristic matching */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-300">
            {isPersonalized ? (
              <>
                <span className="text-slate-400">Baze sou dènye</span>
                <span className="font-semibold text-cyan-300">
                  {lastListenedSongs.length} moso ou koute
                </span>
                <span className="text-slate-400">nan kategori:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {matchedCategories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-slate-400">
                Seleksyon espesyal pou ou. Koute mizik pou pèsonalize rekòmandasyon yo selon gou w!
              </span>
            )}
          </div>
        </div>

        {/* Right Action: Last 3 listen chips or history reset */}
        {isPersonalized && (
          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-400">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dènye koute:</span>
              <span className="font-medium text-slate-200 max-w-[140px] truncate">
                {lastListenedSongs.map(s => s.title).join(', ')}
              </span>
            </div>

            {onHistoryReset && (
              <button
                id="reset-recommendations-btn"
                onClick={() => {
                  StorageService.clearRecentListenedIds();
                  onHistoryReset();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] flex items-center gap-1.5 transition-colors"
                title="Efase istwa koute pou re-kalkile rekòmandasyon"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-inisyalize</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recommended Music Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {recommendations.map((music) => {
          const isThisPlaying = currentPlayingId === music.id && isPlaying;
          const isCategoryMatch = matchedCategories.includes(music.category);

          return (
            <div
              key={`rec-${music.id}`}
              id={`recommended-card-${music.id}`}
              className={`group relative rounded-2xl p-4 bg-[#05070a]/80 border transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between overflow-hidden ${
                isThisPlaying
                  ? 'border-cyan-400/60 shadow-xl shadow-cyan-950/50 bg-[#0a1122]/90 ring-1 ring-cyan-400/40'
                  : 'border-white/[0.08] hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-950/20'
              }`}
            >
              {/* Floating Hearts Particles */}
              <FloatingHearts hearts={heartsMap[music.id] || []} />

              {/* Top Content Row: Cover + Info */}
              <div className="flex gap-4 items-start">
                {/* Artwork with quick play hover */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/[0.08] group-hover:border-cyan-500/40 transition-colors">
                  <img
                    src={music.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                    alt={music.title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isThisPlaying ? 'scale-105' : 'group-hover:scale-105'
                    }`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Play Overlay Button */}
                  <button
                    id={`rec-play-btn-${music.id}`}
                    onClick={() => onPlayToggle(music)}
                    className={`absolute inset-0 m-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isThisPlaying
                        ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/40 scale-100'
                        : 'bg-black/60 text-white opacity-80 group-hover:opacity-100 hover:scale-110 hover:bg-cyan-500 hover:text-slate-950'
                    }`}
                    aria-label={isThisPlaying ? 'Poz' : 'Jwe'}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Track Details */}
                <div className="flex-1 min-w-0">
                  {/* Category / Reason Match Badge */}
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-semibold text-[10px]">
                      {music.category}
                    </span>
                    {isCategoryMatch && isPersonalized && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-300 font-medium bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        Gou ou
                      </span>
                    )}
                  </div>

                  {/* Track Title */}
                  <h3
                    onClick={() => onPlayToggle(music)}
                    className="font-bold text-sm sm:text-base text-white hover:text-cyan-400 transition-colors cursor-pointer truncate"
                    title={music.title}
                  >
                    {music.title}
                  </h3>

                  {/* Artist Name & Badge (Clickable) */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <button
                      id={`rec-artist-btn-${music.id}`}
                      onClick={() => onOpenArtistProfile(music.artistId)}
                      className="text-xs text-slate-400 hover:text-white font-medium transition-colors truncate text-left"
                    >
                      {music.artistName}
                      {music.feat && (
                        <span className="text-slate-500 font-normal"> ft. {music.feat}</span>
                      )}
                    </button>
                    <ArtistBadge donations={music.totalDonations} size="xs" />
                  </div>

                  {/* Metrics Row: Listens & Shares */}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Headphones className="w-3 h-3 text-cyan-400" />
                      <strong className="text-slate-200">{music.listens.toLocaleString()}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-blue-400" />
                      <strong className="text-slate-200">{(music.sharesCount || 0).toLocaleString()}</strong>
                    </span>
                    {music.totalDonations > 0 && (
                      <span className="text-yellow-400 font-bold text-[10px]">
                        ${music.totalDonations.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Actions */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                {/* Support Artist Button */}
                <button
                  id={`rec-support-btn-${music.id}`}
                  onClick={() => handleSupportWithHearts(music)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Sipòte</span>
                </button>

                {/* Comments Button */}
                <button
                  id={`rec-comment-btn-${music.id}`}
                  onClick={() => onOpenComment(music)}
                  className="p-1.5 px-2.5 rounded-xl text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center gap-1 transition-colors"
                  title="Kòmantè"
                  aria-label="Kòmantè"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">{music.commentsCount || 0}</span>
                </button>

                {/* Share Button */}
                <button
                  id={`rec-share-btn-${music.id}`}
                  onClick={() => onShare(music)}
                  className="p-1.5 px-2 rounded-xl text-xs text-slate-400 hover:text-cyan-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center gap-1 transition-colors active:scale-95"
                  title="Pataje moso sa"
                  aria-label="Pataje"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
