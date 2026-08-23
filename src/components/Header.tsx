import React, { useState } from 'react';
import {
  Music,
  User,
  ShieldCheck,
  Menu,
  X,
  Radio,
  Flame,
  PlusCircle,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  ListMusic,
  Download
} from 'lucide-react';
import { ArtistUser, AdminUser, ActiveView, MusicItem, MusicCategory, ThemeMode } from '../types';
import { LiveSearchBar } from './LiveSearchBar';

interface HeaderProps {
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
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
  currentArtist: ArtistUser | null;
  currentAdmin: AdminUser | null;
  onOpenArtistAuth: () => void;
  onOpenAdminAuth: () => void;
  onLogoutArtist: () => void;
  onLogoutAdmin: () => void;
  onOpenAddMusic?: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onOpenOfflineModal?: () => void;
  offlineTracksCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
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
  currentArtist,
  currentAdmin,
  onOpenArtistAuth,
  onOpenAdminAuth,
  onLogoutArtist,
  onLogoutAdmin,
  onOpenAddMusic,
  themeMode,
  onToggleTheme,
  onOpenOfflineModal,
  offlineTracksCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Calculate count of pending artists waiting for validation
  const pendingArtistsCount = (artists || []).filter((a) => a && a.status === 'pending').length;

  const handleSearchSubmit = () => {
    setCurrentView('public');
    setMobileMenuOpen(false);
    // Smooth scroll to music grid
    setTimeout(() => {
      const el = document.getElementById('music-feed-section') || document.querySelector('main');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#05070a]/80 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      {/* Haitian Flag Accent Top Stripe */}
      <div className="h-[2px] w-full flex">
        <div className="w-1/2 bg-blue-500 shadow-sm shadow-blue-500/50"></div>
        <div className="w-1/2 bg-red-500 shadow-sm shadow-red-500/50"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo */}
          <div 
            id="brand-logo-btn"
            onClick={() => { setCurrentView('public'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-700 via-blue-900 to-[#05070a] border border-blue-400/40 shadow-lg shadow-blue-950/60 ring-2 ring-blue-500/20 group-hover:scale-105 group-hover:ring-blue-400/40 transition-all duration-200">
              {/* Ti Wave (Animated Audio Waveform) */}
              <div className="flex items-end gap-1 h-5 pb-0.5" aria-hidden="true">
                <span className="w-[3px] bg-yellow-400 rounded-full animate-[pulse_1s_ease-in-out_infinite] h-2.5"></span>
                <span className="w-[3px] bg-red-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.2s] h-5"></span>
                <span className="w-[3px] bg-blue-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.4s] h-3.5"></span>
                <span className="w-[3px] bg-yellow-300 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.1s] h-2"></span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-sm shadow-red-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-['Cabinet_Grotesk',sans-serif]">
                  Up<span className="text-red-500">Mizik</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded shadow-sm">
                  Ayiti
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Pouse Jèn Atis yo pi Wo
              </p>
            </div>
          </div>

          {/* Dynamic Live Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
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
              onSearchSubmit={handleSearchSubmit}
              variant="compact"
              placeholder="Chèche yon mizik, atis, oubyen stil (Kompa, Drill, Afro...)"
            />
          </div>

          {/* Navigation Controls (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              id="nav-public-home-btn"
              onClick={() => setCurrentView('public')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                currentView === 'public'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-inner'
                  : 'text-slate-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
              }`}
            >
              <Radio className="w-4 h-4 text-yellow-400" />
              <span>Difizyon</span>
            </button>

            {/* UpMizik Social Link */}
            <button
              id="nav-social-feed-btn"
              onClick={() => setCurrentView('social')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                currentView === 'social'
                  ? 'bg-gradient-to-r from-blue-600/30 via-pink-600/30 to-purple-600/30 text-white border border-pink-500/40 shadow-inner'
                  : 'text-slate-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
              }`}
            >
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
              <span>UpMizik Social</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold">
                Nouvo
              </span>
            </button>

            {/* Offline Playlist & Queue Button (Desktop) */}
            {onOpenOfflineModal && (
              <button
                id="header-offline-playlists-btn"
                type="button"
                onClick={onOpenOfflineModal}
                title="Jesyonè Playlist Oflayn & Ke Telechajman"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#0d1424] hover:bg-[#131c33] text-amber-400 border border-amber-500/30 hover:border-amber-400/50 shadow-sm active:scale-95 transition-all"
              >
                <ListMusic className="w-4 h-4 text-amber-400" />
                <span className="hidden lg:inline text-slate-200">Playlist Oflayn</span>
                {offlineTracksCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                    {offlineTracksCount}
                  </span>
                )}
              </button>
            )}

            {/* Theme Toggle Button (Desktop) */}
            <button
              id="header-theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              aria-label={
                themeMode === 'night'
                  ? 'Chanje sou High Contrast Light (Klè & Aksesib)'
                  : 'Chanje sou Atmospheric Night (Nwit & Anbyans)'
              }
              title={
                themeMode === 'night'
                  ? 'Chanje sou mod klè (High Contrast Light)'
                  : 'Chanje sou mod nwit (Atmospheric Night)'
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                themeMode === 'night'
                  ? 'bg-[#0d1424] hover:bg-[#131c33] text-yellow-400 border-white/[0.1] hover:border-yellow-400/40 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-sm hover:border-slate-400'
              }`}
            >
              {themeMode === 'night' ? (
                <>
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span className="hidden xl:inline text-slate-200">Klè</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden xl:inline text-slate-900">Nwit</span>
                </>
              )}
            </button>

            {/* Espas Atis Button */}
            {currentArtist ? (
              <div className="flex items-center gap-2">
                <button
                  id="nav-artist-portal-btn"
                  onClick={() => setCurrentView('artist_dashboard')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentView === 'artist_dashboard'
                      ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                      : 'bg-[#0d1424] text-slate-200 hover:bg-[#131c33] border border-white/[0.1]'
                  }`}
                >
                  <img
                    src={currentArtist.avatarUrl}
                    alt={currentArtist.stageName}
                    className="w-5 h-5 rounded-full object-cover border border-yellow-400"
                  />
                  <span>{currentArtist.stageName}</span>
                </button>
                <button
                  id="nav-artist-logout-btn"
                  onClick={onLogoutArtist}
                  title="Dekonekte Atis"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/[0.06] rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="nav-artist-login-btn"
                onClick={onOpenArtistAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-950/50 border border-blue-400/20 transition-all active:scale-95"
              >
                <User className="w-4 h-4 text-yellow-300" />
                <span>Espas Atis</span>
              </button>
            )}

            {/* Admin Button */}
            {currentAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  id="nav-admin-portal-btn"
                  onClick={() => setCurrentView('admin_dashboard')}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentView === 'admin_dashboard'
                      ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 shadow-lg shadow-yellow-400/10'
                      : 'bg-[#0d1424] text-yellow-400 hover:bg-[#131c33] border border-yellow-400/30'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-yellow-400" />
                    {pendingArtistsCount > 0 && (
                      <span
                        className="absolute -top-2 -right-2 px-1 min-w-[15px] h-3.5 rounded-full bg-red-500 text-white text-[9px] font-mono font-black flex items-center justify-center shadow-md shadow-red-500/50 animate-pulse"
                        title={`${pendingArtistsCount} nouvo atis an atant`}
                      >
                        {pendingArtistsCount}
                      </span>
                    )}
                  </div>
                  <span>Admin: Mr Clauvens</span>
                  {pendingArtistsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                      {pendingArtistsCount} nouvo
                    </span>
                  )}
                </button>
                <button
                  id="nav-admin-logout-btn"
                  onClick={onLogoutAdmin}
                  title="Dekonekte Admin"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/[0.06] rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="nav-admin-login-btn"
                onClick={onOpenAdminAuth}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#0d1424] hover:bg-[#131c33] text-slate-300 hover:text-white border border-white/[0.08] transition-all"
              >
                <div className="relative flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  {pendingArtistsCount > 0 && (
                    <span
                      className="absolute -top-2 -right-2 px-1 min-w-[14px] h-3 rounded-full bg-red-500 text-white text-[8px] font-mono font-black flex items-center justify-center shadow-sm shadow-red-500/40 animate-pulse"
                      title={`${pendingArtistsCount} atis an atant`}
                    >
                      {pendingArtistsCount}
                    </span>
                  )}
                </div>
                <span>Admin</span>
              </button>
            )}
          </div>

          {/* Mobile Right Controls (Theme Toggle + Quick Atis / Avatar + Hamburger Toggle) */}
          <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
            <button
              id="mobile-header-theme-btn"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-[#0d1424] text-amber-300 hover:text-amber-200 border border-white/[0.08] transition-colors"
              title={themeMode === 'dark' ? 'Chanje pou Mòd Klè' : 'Chanje pou Mòd Nwit'}
              aria-label="Tèm Klè / Nwit"
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>

            {currentArtist ? (
              <button
                id="mobile-header-artist-avatar-btn"
                onClick={() => setCurrentView('artist_dashboard')}
                className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#0d1424] border border-yellow-400/40 text-yellow-300 text-xs font-bold"
              >
                <img
                  src={currentArtist.avatarUrl}
                  alt={currentArtist.stageName}
                  className="w-5 h-5 rounded-full object-cover border border-yellow-400"
                />
                <span className="truncate max-w-[60px]">{currentArtist.stageName}</span>
              </button>
            ) : (
              <button
                id="mobile-header-artist-btn"
                onClick={onOpenArtistAuth}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold shadow-sm"
              >
                Atis
              </button>
            )}

            <button
              id="mobile-nav-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative p-2 rounded-xl bg-[#0d1424] text-slate-300 hover:text-white border border-white/[0.08]"
              aria-label="Meni konplè"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {pendingArtistsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#05070a] animate-pulse" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070b14]/95 backdrop-blur-2xl border-b border-white/[0.08] px-4 pt-3 pb-5 space-y-3 animate-fadeIn">
          {/* Mobile Live Search Bar inside Drawer if open */}
          <div className="w-full">
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
              onSearchSubmit={handleSearchSubmit}
              variant="mobile"
              placeholder="Chèche mizik, atis, kompa, drill..."
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              id="mobile-drawer-home-btn"
              onClick={() => { setCurrentView('public'); setMobileMenuOpen(false); }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium ${
                currentView === 'public'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'bg-[#0d1424] text-slate-300 border border-white/[0.06]'
              }`}
            >
              <Radio className="w-4 h-4 text-yellow-400" />
              <span>Difizyon</span>
            </button>

            <button
              id="mobile-drawer-social-btn"
              onClick={() => { setCurrentView('social'); setMobileMenuOpen(false); }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium ${
                currentView === 'social'
                  ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40'
                  : 'bg-[#0d1424] text-slate-300 border border-white/[0.06]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Social</span>
            </button>

            {/* Mobile Offline Playlist & Queue Button */}
            {onOpenOfflineModal && (
              <button
                id="mobile-drawer-offline-playlists-btn"
                onClick={() => {
                  onOpenOfflineModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium bg-[#0d1424] text-amber-400 border border-amber-500/30"
              >
                <ListMusic className="w-4 h-4 text-amber-400" />
                <span>Playlist Oflayn</span>
                {offlineTracksCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                    {offlineTracksCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Theme Toggle Button */}
            <button
              id="mobile-drawer-theme-toggle-btn"
              onClick={onToggleTheme}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium border ${
                themeMode === 'night'
                  ? 'bg-[#0d1424] text-yellow-400 border-white/[0.1]'
                  : 'bg-white text-slate-900 border-slate-300'
              }`}
            >
              {themeMode === 'night' ? (
                <>
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span>Mod Klè</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Mod Nwit</span>
                </>
              )}
            </button>

            {currentArtist ? (
              <button
                id="mobile-drawer-artist-dash-btn"
                onClick={() => { setCurrentView('artist_dashboard'); setMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium bg-red-600/30 text-red-300 border border-red-500/40 truncate"
              >
                <img src={currentArtist.avatarUrl} className="w-4 h-4 rounded-full" alt="" />
                <span className="truncate">{currentArtist.stageName}</span>
              </button>
            ) : (
              <button
                id="mobile-drawer-artist-auth-btn"
                onClick={() => { onOpenArtistAuth(); setMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
              >
                <User className="w-4 h-4 text-yellow-300" />
                <span>Espas Atis</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            {currentAdmin ? (
              <div className="flex items-center justify-between w-full">
                <button
                  id="mobile-drawer-admin-dash-btn"
                  onClick={() => { setCurrentView('admin_dashboard'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/30"
                >
                  <div className="relative flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                    {pendingArtistsCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-mono font-black flex items-center justify-center shadow-sm shadow-red-500/50 animate-pulse">
                        {pendingArtistsCount}
                      </span>
                    )}
                  </div>
                  <span>Admin: Mr Clauvens</span>
                  {pendingArtistsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500 text-white">
                      {pendingArtistsCount} nouvo
                    </span>
                  )}
                </button>
                <button
                  id="mobile-drawer-admin-logout-btn"
                  onClick={() => { onLogoutAdmin(); setMobileMenuOpen(false); }}
                  className="text-xs text-red-400 hover:underline px-2 py-1"
                >
                  Dekonekte
                </button>
              </div>
            ) : (
              <button
                id="mobile-drawer-admin-login-btn"
                onClick={() => { onOpenAdminAuth(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <div className="relative flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {pendingArtistsCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-mono font-black flex items-center justify-center shadow-sm shadow-red-500/50 animate-pulse">
                      {pendingArtistsCount}
                    </span>
                  )}
                </div>
                <span>Koneksyon Administratè</span>
                {pendingArtistsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500 text-white">
                    {pendingArtistsCount} nouvo
                  </span>
                )}
              </button>
            )}

            {currentArtist && (
              <button
                id="mobile-drawer-artist-logout-alt-btn"
                onClick={() => { onLogoutArtist(); setMobileMenuOpen(false); }}
                className="text-xs text-red-400 hover:underline"
              >
                Sòti nan Espas Atis
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
