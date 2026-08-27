import React from 'react';
import { Flame, Sparkles, HeartHandshake, Shield, Music2, ArrowRight } from 'lucide-react';
import { MusicItem, ArtistUser, MusicCategory } from '../types';
import { LiveSearchBar } from './LiveSearchBar';

interface HeroBannerProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  musicList: MusicItem[];
  artists: ArtistUser[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile: (artist: ArtistUser) => void;
  onSelectCategory?: (category: MusicCategory | string) => void;
  onOpenArtistAuth: () => void;
  totalArtists?: number;
  totalSongs?: number;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  searchQuery,
  setSearchQuery,
  musicList,
  artists,
  currentPlayingId,
  isPlaying,
  onPlayToggle,
  onOpenSupport,
  onOpenArtistProfile,
  onSelectCategory,
  onOpenArtistAuth,
  totalArtists,
  totalSongs
}) => {
  const handleHeroSearchSubmit = () => {
    const el = document.getElementById('music-feed-section') || document.querySelector('main');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#090e1c] via-[#060a14] to-[#05070a] border-b border-white/[0.06] pt-8 pb-12 sm:pt-14 sm:pb-18">
      {/* Background Atmospheric Glows */}
      <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-600/12 rounded-full blur-3xl pointer-events-none animate-ambientGlow"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-red-600/12 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          
          {/* Haitian Cultural Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1424]/80 border border-white/[0.12] text-xs font-semibold text-slate-200 mb-6 shadow-xl backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500 animate-pulse"></span>
            <span className="text-yellow-400 font-bold">100% Mizik Ayisyen</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">Sipò Dirèk pou Jèn Talan</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-['Cabinet_Grotesk',sans-serif] leading-[1.1]">
            Chak Ekout Pouse <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-yellow-300 to-red-500 bg-clip-text text-transparent drop-shadow-sm">
              Yon Atis Ayisyen
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Platfòm difizyon kote fanatik sipòte atis dirèk pa <strong className="text-white">Moncash</strong> ak <strong className="text-white">Natcash</strong>. 
            Atis la resevwa <span className="text-yellow-400 font-bold">tout sipò</span> yo san reta.
          </p>

          {/* Live Search Bar (Prominent on Mobile & Tablet, and also available in Hero) */}
          <div className="w-full max-w-xl mt-7">
            <LiveSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              musicList={musicList}
              artists={artists}
              currentPlayingId={currentPlayingId}
              isPlaying={isPlaying}
              onPlayToggle={onPlayToggle}
              onOpenSupport={onOpenSupport}
              onOpenArtistProfile={onOpenArtistProfile}
              onSelectCategory={onSelectCategory}
              onSearchSubmit={handleHeroSearchSubmit}
              variant="hero"
              placeholder="Chèche yon mizik, atis, oubyen stil (Kompa, Drill, Rabòday...)"
            />
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mt-7 sm:mt-9">
            <a
              href="#trending-section"
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 via-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-xl shadow-red-950/60 border border-red-500/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span>Koute Top 3 a Kounya</span>
            </a>
            <button
              id="hero-join-artist-btn"
              onClick={onOpenArtistAuth}
              style={{ display: 'none' }}
              className="hidden px-6 py-3.5 rounded-xl font-bold text-sm bg-[#0d1424]/90 hover:bg-[#141e36] text-slate-200 hover:text-white border border-white/[0.12] items-center gap-2 transition-all active:scale-95 shadow-lg backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Ou se yon Atis? Enskri Isit</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Key Value Props Bar */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-6 mt-9 sm:mt-12 w-full max-w-2xl pt-7 border-t border-white/[0.08] text-left">
            <div className="flex items-center gap-2.5 bg-[#0d1424]/60 p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">85% Pou Atis</p>
                <p className="text-[10px] text-slate-400">Peman 1ye chak mwa</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-[#0d1424]/60 p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Music2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">5s Ekout</p>
                <p className="text-[10px] text-slate-400">Konte reyèl san spam</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-[#0d1424]/60 p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Moncash & Natcash</p>
                <p className="text-[10px] text-slate-400">Verifikasyon pa admin</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
