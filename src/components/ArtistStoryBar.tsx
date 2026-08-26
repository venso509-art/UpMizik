import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Headphones, Flame, Star, Radio } from 'lucide-react';
import { ArtistUser, MusicItem } from '../types';
import { StorageService } from '../utils/storage';

interface ArtistStoryBarProps {
  artists: ArtistUser[];
  musicList: MusicItem[];
  onOpenArtistProfile: (artistId: string) => void;
}

export const ArtistStoryBar: React.FC<ArtistStoryBarProps> = ({
  artists,
  musicList,
  onOpenArtistProfile
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Compute 5 personalized / favorite artists according to user listens and algorithmic heuristic
  const topArtists = useMemo(() => {
    return StorageService.getUserTopArtists(artists, musicList, 5);
  }, [artists, musicList]);

  // Set of artist IDs that have a newly published song (within last 30 days or latest releases)
  const artistsWithNewSongs = useMemo(() => {
    const set = new Set<string>();
    if (!musicList || musicList.length === 0) return set;
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    // 1. Check songs created in the last 30 days
    musicList.forEach((song) => {
      if (song.status === 'pending' || song.status === 'rejected') return;
      let isRecent = false;
      if (song.createdAt) {
        const createdTime = new Date(song.createdAt).getTime();
        if (!isNaN(createdTime) && (now - createdTime) <= THIRTY_DAYS_MS && createdTime <= (now + 86400000)) {
          isRecent = true;
        }
      }
      if (isRecent) {
        if (song.artistId) set.add(song.artistId);
        const matchingArtist = artists.find(
          (a) =>
            a.id === song.artistId ||
            (a.stageName && a.stageName.trim().toLowerCase() === song.artistName?.trim().toLowerCase()) ||
            (a.name && a.name.trim().toLowerCase() === song.artistName?.trim().toLowerCase())
        );
        if (matchingArtist) {
          set.add(matchingArtist.id);
        }
      }
    });

    // 2. Fallback: If no songs are within 30 days, mark the artists of the top 3 most recently created active songs
    if (set.size === 0 && musicList.length > 0) {
      const sortedByDate = [...musicList]
        .filter((s) => s.status !== 'pending' && s.status !== 'rejected')
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3);

      sortedByDate.forEach((s) => {
        if (s.artistId) set.add(s.artistId);
        const matchingArtist = artists.find(
          (a) =>
            a.id === s.artistId ||
            (a.stageName && a.stageName.trim().toLowerCase() === s.artistName?.trim().toLowerCase()) ||
            (a.name && a.name.trim().toLowerCase() === s.artistName?.trim().toLowerCase())
        );
        if (matchingArtist) set.add(matchingArtist.id);
      });
    }

    return set;
  }, [musicList, artists]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [topArtists]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -200,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 200,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  if (!topArtists || topArtists.length === 0) return null;

  // Has at least one artist from user history
  const hasHistory = topArtists.some(item => item.isFromHistory);

  // Gradient border rings array for WhatsApp/Instagram status vibe
  const ringGradients = [
    'from-emerald-400 via-teal-500 to-cyan-400',
    'from-yellow-400 via-amber-500 to-orange-500',
    'from-pink-500 via-purple-500 to-indigo-400',
    'from-cyan-400 via-blue-500 to-indigo-500',
    'from-rose-500 via-orange-400 to-amber-400'
  ];

  return (
    <section
      id="artist-story-bar"
      className="py-5 bg-[#05070a]/90 border-b border-white/[0.06] relative select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header with Title and Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{hasHistory ? 'Atis Ou Pi Koute' : 'Atis Pou Ou'}</span>
            </div>
            <span className="text-xs text-slate-400 hidden md:inline">
              • Klike sou nenpòt pwofil pou gade moso l yo ak detay li
            </span>
          </div>

          {/* Small 2-Arrow Scroll Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              Defile atis yo:
            </span>
            <div className="inline-flex items-center gap-1.5 p-0.5 bg-[#0a0f1d] border border-white/[0.12] rounded-full shadow-inner">
              <button
                id="artist-story-scroll-left-btn"
                type="button"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-emerald-400/20 text-emerald-400 hover:text-emerald-300 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Defile a goch"
                title="Defile a goch"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="artist-story-scroll-right-btn"
                type="button"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-emerald-400/20 text-emerald-400 hover:text-emerald-300 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Defile a dwat"
                title="Defile a dwat"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp-Style Circular Stories Carousel Row */}
        <div
          ref={scrollContainerRef}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {topArtists.map((item, index) => {
            const { artist, isFromHistory, category } = item;
            const ringGradient = ringGradients[index % ringGradients.length];
            const hasNewSong = artistsWithNewSongs.has(artist.id);

            return (
              <button
                key={artist.id || index}
                id={`artist-story-circle-${artist.id}`}
                type="button"
                onClick={() => onOpenArtistProfile(artist.id)}
                className="group flex flex-col items-center shrink-0 w-[74px] sm:w-[86px] cursor-pointer snap-start focus:outline-none transition-all active:scale-95 text-center"
                title={`Klike pou wè pwofil konplè ${artist.stageName || artist.name}${hasNewSong ? ' (Gen yon nouvo mizik ki fèk pibliye)' : ''}`}
              >
                {/* Avatar Story Ring */}
                <div className="relative">
                  {/* Gentle Breathing Pulse Glow / Aura for Artists with New Releases */}
                  {hasNewSong && (
                    <span className="absolute -inset-1 sm:-inset-1.5 rounded-full bg-gradient-to-tr from-yellow-400/40 via-amber-500/30 to-emerald-400/40 blur-[4px] animate-pulse pointer-events-none" />
                  )}

                  {/* Glowing WhatsApp / Story status border ring */}
                  <div
                    className={`p-[2.5px] sm:p-[3px] rounded-full bg-gradient-to-tr ${ringGradient} shadow-lg shadow-emerald-950/30 group-hover:scale-105 group-hover:shadow-emerald-500/30 transition-all duration-300 ${
                      hasNewSong
                        ? 'ring-2 ring-yellow-400/90 ring-offset-2 ring-offset-[#05070a] shadow-yellow-500/30 animate-pulse'
                        : ''
                    }`}
                  >
                    {/* Inner Dark Spacer for Clean Crisp Ring Separation */}
                    <div className="p-[2px] rounded-full bg-[#05070a]">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={artist.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'}
                          alt={artist.stageName || artist.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Top-Right "Nouvo" Mini Badge with Sparkles for New Releases */}
                  {hasNewSong && (
                    <span
                      className="absolute -top-1 -right-1 z-10 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-[8px] font-black text-slate-950 shadow-md shadow-yellow-500/40 uppercase tracking-tight animate-pulse flex items-center gap-0.5 border border-yellow-200/80"
                      title="Atis sa a gen yon nouvo moso mizik ki fèk pibliye!"
                    >
                      <Sparkles className="w-2 h-2 text-slate-950" />
                      <span>Nouvo</span>
                    </span>
                  )}

                  {/* Active / Online / Pulse Indicator Dot */}
                  <span className="absolute bottom-0 right-0 translate-x-[2px] translate-y-[2px] w-4 h-4 rounded-full bg-[#05070a] flex items-center justify-center">
                    {hasNewSong ? (
                      <>
                        <span className="absolute w-3 h-3 rounded-full bg-yellow-400/60 animate-ping" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/90" />
                      </>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse" />
                    )}
                  </span>
                </div>

                {/* Artist Name & Tag underneath */}
                <div className="mt-2 w-full flex flex-col items-center">
                  <p className="text-[11px] sm:text-xs font-bold text-slate-200 group-hover:text-yellow-300 truncate w-full transition-colors leading-tight">
                    {artist.stageName || artist.name}
                  </p>
                  
                  {/* Subtle Sub-label */}
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-400 group-hover:text-emerald-300 transition-colors">
                    {hasNewSong ? (
                      <span className="inline-flex items-center gap-0.5 text-yellow-400 font-bold animate-pulse">
                        <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
                        <span>Nouvo Moso</span>
                      </span>
                    ) : isFromHistory ? (
                      <>
                        <Headphones className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Pi koute</span>
                      </>
                    ) : category ? (
                      <>
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        <span className="truncate max-w-[58px]">{category}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
                        <span>Pou Ou</span>
                      </>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
