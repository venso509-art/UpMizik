import React, { useRef, useState, useEffect } from 'react';
import { RpaItem } from '../types';
import { Sparkles, ArrowUpRight, Youtube, VolumeX, Play, Film, ChevronLeft, ChevronRight } from 'lucide-react';

interface RpaSectionProps {
  rpaList: RpaItem[];
}

export const RpaSection: React.FC<RpaSectionProps> = ({ rpaList }) => {
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const displayedList = rpaList?.slice(0, 3) || [];

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

  if (!rpaList || rpaList.length === 0) return null;

  const renderMedia = (item: RpaItem) => {
    const mediaSource = item.mediaUrl || item.imageUrl || '';
    const isVideo = item.mediaType === 'video' || mediaSource.endsWith('.mp4') || mediaSource.startsWith('data:video');
    const isGif = item.mediaType === 'gif' || mediaSource.toLowerCase().includes('.gif');
    const targetUrl = item.youtubeUrl || item.socialLink || '#';

    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-video rounded-2xl overflow-hidden mb-4 border border-white/[0.1] bg-black/80 group/media cursor-pointer"
        title={`Gade videyo ${item.artistName} sou YouTube`}
      >
        {isVideo ? (
          <div className="relative w-full h-full">
            <video
              src={mediaSource}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
            />
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] text-white/90 flex items-center gap-1 font-semibold border border-white/10">
              <VolumeX className="w-3 h-3 text-yellow-400" />
              <span>San Son</span>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={mediaSource || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
              alt={item.artistName}
              className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
            />
            {isGif && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-purple-600/90 backdrop-blur-sm text-[9px] text-white font-bold flex items-center gap-1">
                <Film className="w-3 h-3" />
                <span>GIF</span>
              </div>
            )}
          </div>
        )}

        {/* Badge */}
        <span className="absolute top-2.5 left-2.5 px-3 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
          {item.badgeText}
        </span>

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transform scale-90 group-hover/media:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </a>
    );
  };

  return (
    <section className="py-8 sm:py-12 bg-[#060a14]/60 border-y border-white/[0.06] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ribrik Pouse Atis (RPA)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
              Talan Kreyòl k ap Briye
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
              Mete an valè pa Ekip UpMizik la
            </p>

            {/* Small 2-Arrow Scroll Controls under the title on mobile */}
            <div className="sm:hidden flex items-center gap-2.5 mt-2.5">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                Defile talan yo:
              </span>
              <div className="inline-flex items-center gap-1.5 p-0.5 bg-[#0a0f1d] border border-white/[0.12] rounded-full shadow-inner">
                <button
                  id="rpa-scroll-left-btn"
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
                  id="rpa-scroll-right-btn"
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
          <p className="text-xs text-slate-400 hidden sm:block">
            Mete an valè pa Ekip UpMizik la
          </p>
        </div>

        {/* Mobile Horizontal Snap-Scroll */}
        <div
          ref={mobileCarouselRef}
          className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 no-scrollbar scroll-smooth"
        >
          {rpaList.slice(0, 3).map((item) => {
            const targetUrl = item.youtubeUrl || item.socialLink || '#';

            return (
              <div
                key={item.id}
                className="snap-center shrink-0 w-[85vw] max-w-[340px] bg-[#0a0f1d]/85 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/[0.08] p-4 flex flex-col justify-between"
              >
                <div>
                  {renderMedia(item)}
                  <h3 className="font-bold text-sm text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{item.description}</p>
                </div>

                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20 active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-white shrink-0" />
                    <span>Gade sou YouTube</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 shrink-0" />
                </a>
              </div>
            );
          })}
        </div>

        {/* Desktop 3-Card Grid */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-6">
          {rpaList.slice(0, 3).map((item) => {
            const targetUrl = item.youtubeUrl || item.socialLink || '#';

            return (
              <div
                key={item.id}
                className="group bg-[#0a0f1d]/80 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/[0.08] hover:border-white/[0.18] hover:bg-[#0e1628]/90 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/5 hover:-translate-y-1"
              >
                <div>
                  {renderMedia(item)}
                  <h3 className="font-bold text-base text-white mb-1.5 group-hover:text-yellow-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all duration-200 shadow-md shadow-red-600/20 hover:shadow-red-600/40 group/btn"
                  >
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-white shrink-0" />
                      <span>Gade sou YouTube</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
