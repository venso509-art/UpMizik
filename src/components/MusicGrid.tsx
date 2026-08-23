import React, { useEffect, useRef, useState } from 'react';
import { MusicItem } from '../types';
import { MusicCard } from './MusicCard';
import { Music2, Search, ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface MusicGridProps {
  musicList: MusicItem[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  playbackProgress: number;
  playbackSeconds: number;
  hasListened5s: boolean;
  cachedTrackIds?: string[];
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenComment: (music: MusicItem) => void;
  onOpenArtistProfile: (artistId: string) => void;
  onShare: (music: MusicItem) => void;
  onDownloadOffline?: (music: MusicItem) => void;
  onAddToOfflineQueue?: (music: MusicItem) => void;
  onOpenCredits?: (music: MusicItem) => void;
  searchQuery: string;
  selectedCategory?: string;
}

export const MusicGrid: React.FC<MusicGridProps> = ({
  musicList,
  currentPlayingId,
  isPlaying,
  playbackProgress,
  playbackSeconds,
  hasListened5s,
  cachedTrackIds = [],
  onPlayToggle,
  onOpenSupport,
  onOpenComment,
  onOpenArtistProfile,
  onShare,
  onDownloadOffline,
  onAddToOfflineQueue,
  onOpenCredits,
  searchQuery,
  selectedCategory
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const [highlightFirst, setHighlightFirst] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const isFirstMount = useRef(true);

  // Display full music list so all posted songs are immediately visible
  const displayedList = musicList;

  const checkScroll = () => {
    if (mobileCarouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = mobileCarouselRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = mobileCarouselRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [displayedList]);

  const handleScrollLeft = () => {
    if (mobileCarouselRef.current) {
      const cardWidth = mobileCarouselRef.current.clientWidth * 0.85 || 280;
      mobileCarouselRef.current.scrollBy({
        left: -cardWidth,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  const handleScrollRight = () => {
    if (mobileCarouselRef.current) {
      const cardWidth = mobileCarouselRef.current.clientWidth * 0.85 || 280;
      mobileCarouselRef.current.scrollBy({
        left: cardWidth,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  // Smooth scroll and gentle pulse animation to the first item on category change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // 1. Smoothly scroll mobile horizontal carousel to the beginning (left: 0)
    if (mobileCarouselRef.current) {
      mobileCarouselRef.current.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }

    // 2. Smoothly scroll window if needed to bring the first item / grid cleanly into view
    if (firstCardRef.current) {
      const rect = firstCardRef.current.getBoundingClientRect();
      const isVisible = rect.top >= 80 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
      
      if (!isVisible) {
        firstCardRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start'
        });
      }
    }

    // 3. Highlight the first element with a subtle glow animation
    setHighlightFirst(true);
    const timer = setTimeout(() => {
      setHighlightFirst(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [selectedCategory]);

  if (displayedList.length === 0) {
    return (
      <section ref={sectionRef} id="music-grid-section" className="py-16 text-center max-w-md mx-auto px-4 scroll-mt-28">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
          <Search className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Pa jwenn okenn mizik</h3>
        <p className="text-sm text-slate-400">
          Nou pa jwenn okenn rezilta pou kategori oswa rechèch sa a. Eseye chwazi yon lòt stil mizik oubyen efase rechèch la.
        </p>
      </section>
    );
  }

  return (
    <section ref={sectionRef} id="music-grid-section" className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-28">
      
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
            <Music2 className="w-5 h-5 text-red-500" />
            <span>
              {selectedCategory && selectedCategory !== 'Tout'
                ? `Mizik ${selectedCategory}`
                : 'Tout Mizik Disponib'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Mizik kreyòl pare pou koute ak sipòte
          </p>

          {/* Small 2-Arrow Scroll Controls under the subtext */}
          <div className="sm:hidden flex items-center gap-2.5 mt-2.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              Defile moso yo:
            </span>
            <div className="inline-flex items-center gap-1.5 p-0.5 bg-[#0a0f1d] border border-white/[0.12] rounded-full shadow-inner">
              <button
                id="music-scroll-left-btn"
                type="button"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-yellow-400/20 text-yellow-400 hover:text-yellow-300 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Defile a goch"
                title="Defile a goch"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="music-scroll-right-btn"
                type="button"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-yellow-400/20 text-yellow-400 hover:text-yellow-300 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Defile a dwat"
                title="Defile a dwat"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {selectedCategory && selectedCategory !== 'Tout' && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-400 font-medium animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Filtre pa {selectedCategory}</span>
          </div>
        )}
      </div>

      {/* Mobile Horizontal Snap-Scroll Carousel (85% screen width) */}
      <div
        ref={mobileCarouselRef}
        className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 pt-1 -mx-4 px-4 no-scrollbar scroll-smooth"
      >
        {displayedList.map((music, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={music.id}
              ref={isFirst ? firstCardRef : undefined}
              id={isFirst ? 'music-grid-first-item-mobile' : `music-card-item-${music.id}`}
              className={`snap-center shrink-0 w-[85vw] max-w-[340px] transition-all duration-500 ${
                isFirst && highlightFirst
                  ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950 scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.35)] rounded-3xl'
                  : ''
              }`}
            >
              <MusicCard
                music={music}
                isPlaying={isPlaying}
                isCurrentTrack={currentPlayingId === music.id}
                playbackProgress={playbackProgress}
                playbackSeconds={playbackSeconds}
                hasListened5s={hasListened5s}
                isCachedOffline={cachedTrackIds.includes(music.id)}
                onPlayToggle={onPlayToggle}
                onOpenSupport={onOpenSupport}
                onOpenComment={onOpenComment}
                onOpenArtistProfile={onOpenArtistProfile}
                onShare={onShare}
                onDownloadOffline={onDownloadOffline}
                onAddToOfflineQueue={onAddToOfflineQueue}
                onOpenCredits={onOpenCredits}
              />
            </div>
          );
        })}
      </div>

      {/* Desktop & Tablet CSS Grid */}
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {displayedList.map((music, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={music.id}
              id={isFirst ? 'music-grid-first-item-desktop' : `music-card-desktop-${music.id}`}
              className={`transition-all duration-500 rounded-3xl ${
                isFirst && highlightFirst
                  ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-slate-950 scale-[1.02] shadow-[0_0_25px_rgba(59,130,246,0.35)]'
                  : ''
              }`}
            >
              <MusicCard
                music={music}
                isPlaying={isPlaying}
                isCurrentTrack={currentPlayingId === music.id}
                playbackProgress={playbackProgress}
                playbackSeconds={playbackSeconds}
                hasListened5s={hasListened5s}
                isCachedOffline={cachedTrackIds.includes(music.id)}
                onPlayToggle={onPlayToggle}
                onOpenSupport={onOpenSupport}
                onOpenComment={onOpenComment}
                onOpenArtistProfile={onOpenArtistProfile}
                onShare={onShare}
                onDownloadOffline={onDownloadOffline}
                onAddToOfflineQueue={onAddToOfflineQueue}
                onOpenCredits={onOpenCredits}
              />
            </div>
          );
        })}
      </div>

    </section>
  );
};
