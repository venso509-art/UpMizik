import React, { useRef, useState, useEffect } from 'react';
import { PubItem } from '../types';
import { Megaphone, ExternalLink, Sparkles, VolumeX, Film, ChevronLeft, ChevronRight } from 'lucide-react';

interface PubsBannerProps {
  pubs: PubItem[];
}

export const PubsBanner: React.FC<PubsBannerProps> = ({ pubs }) => {
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const activePubs = pubs.filter(p => p.active);
  const displayedPubs = activePubs.slice(0, 3);

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
  }, [displayedPubs]);

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

  if (!activePubs || activePubs.length === 0) return null;

  const renderPubMedia = (pub: PubItem) => {
    const mediaSource = pub.mediaUrl || pub.imageUrl || '';
    const isVideo = pub.mediaType === 'video' || mediaSource.endsWith('.mp4') || mediaSource.startsWith('data:video');
    const isGif = pub.mediaType === 'gif' || mediaSource.toLowerCase().includes('.gif');

    return (
      <div className="h-36 sm:h-40 w-full relative overflow-hidden bg-black group/media">
        {isVideo ? (
          <div className="relative w-full h-full">
            <video
              src={mediaSource}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] text-white flex items-center gap-1 font-semibold border border-white/10 z-10">
              <VolumeX className="w-2.5 h-2.5 text-yellow-400" />
              <span>MP4 San Son</span>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={mediaSource || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80'}
              alt={pub.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {isGif && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-purple-600/90 backdrop-blur-sm text-[9px] text-white font-bold flex items-center gap-1 z-10">
                <Film className="w-2.5 h-2.5" />
                <span>GIF</span>
              </div>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-black/30 to-transparent pointer-events-none"></div>
        <span className="absolute top-2.5 right-2.5 text-[10px] uppercase font-bold px-2.5 py-1 bg-black/85 text-slate-200 rounded-lg backdrop-blur-md border border-white/10 z-10 shadow">
          Pub • {pub.sponsorName}
        </span>
      </div>
    );
  };

  return (
    <section className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Megaphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Espas Piblisite & Patnè</span>
        </div>

        {/* Small 2-Arrow Scroll Controls under header on mobile */}
        <div className="sm:hidden flex items-center gap-2.5 mt-1.5 mb-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            Defile piblisite yo:
          </span>
          <div className="inline-flex items-center gap-1.5 p-0.5 bg-[#0a0f1d] border border-white/[0.12] rounded-full shadow-inner">
            <button
              id="pub-scroll-left-btn"
              type="button"
              onClick={handleScrollLeft}
              disabled={!canScrollLeft}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-blue-400/20 text-blue-400 hover:text-blue-300 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Defile a goch"
              title="Defile a goch"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="pub-scroll-right-btn"
              type="button"
              onClick={handleScrollRight}
              disabled={!canScrollRight}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-blue-400/20 text-blue-400 hover:text-blue-300 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Defile a dwat"
              title="Defile a dwat"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Snap Horizontal */}
      <div
        ref={mobileCarouselRef}
        className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 no-scrollbar scroll-smooth"
      >
        {displayedPubs.map((pub) => (
          <div
            key={pub.id}
            className="snap-center shrink-0 w-[85vw] max-w-[340px] relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0a0f1d]/85 backdrop-blur-xl flex flex-col justify-between"
          >
            {renderPubMedia(pub)}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{pub.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pub.description}</p>
              </div>
              <a
                href={pub.linkUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 inline-flex items-center justify-between px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold text-blue-300 hover:text-blue-200 transition-colors"
              >
                <span>Vizite Patnè a</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop 3-col Grid */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-6">
        {displayedPubs.map((pub) => (
          <div
            key={pub.id}
            className="group relative rounded-3xl overflow-hidden border border-white/[0.08] hover:border-white/[0.18] bg-[#0a0f1d]/80 hover:bg-[#0e1628]/90 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            {renderPubMedia(pub)}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-yellow-300 transition-colors">
                  {pub.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {pub.description}
                </p>
              </div>
              <a
                href={pub.linkUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold text-blue-300 hover:text-blue-200 transition-colors"
              >
                <span>Vizite Patnè a</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
};
