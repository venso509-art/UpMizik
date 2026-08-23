import React from 'react';
import {
  Radio,
  Sparkles,
  User,
  ListMusic,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { ActiveView, ArtistUser, AdminUser, ThemeMode } from '../types';

interface MobileBottomNavProps {
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  currentArtist: ArtistUser | null;
  currentAdmin: AdminUser | null;
  onOpenArtistAuth: () => void;
  onOpenAdminAuth: () => void;
  onOpenOfflineModal: () => void;
  offlineTracksCount: number;
  hasActivePlayer: boolean;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  pendingArtistsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  setCurrentView,
  currentArtist,
  currentAdmin,
  onOpenArtistAuth,
  onOpenAdminAuth,
  onOpenOfflineModal,
  offlineTracksCount,
  hasActivePlayer,
  themeMode,
  onToggleTheme,
  pendingArtistsCount = 0
}) => {
  return (
    <nav
      id="mobile-bottom-navigation-bar"
      aria-label="Navigasyon Prensipal sou Telefòn"
      className="md:hidden fixed bottom-0 left-0 right-0 z-45 bg-[#05070a]/95 backdrop-blur-2xl border-t border-white/[0.12] px-2 py-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] transition-all"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* 1. Difizyon (Home / Music Feed) */}
        <button
          id="mobile-tab-home-btn"
          onClick={() => setCurrentView('public')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all select-none min-w-[56px] ${
            currentView === 'public'
              ? 'text-blue-400 bg-blue-500/15 font-bold shadow-inner'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className={`w-5 h-5 ${currentView === 'public' ? 'text-yellow-400' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Difizyon</span>
        </button>

        {/* 2. UpMizik Social */}
        <button
          id="mobile-tab-social-btn"
          onClick={() => setCurrentView('social')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all select-none min-w-[56px] relative ${
            currentView === 'social'
              ? 'text-pink-400 bg-pink-500/15 font-bold shadow-inner'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className={`w-5 h-5 ${currentView === 'social' ? 'text-pink-400 animate-pulse' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Social</span>
          <span className="absolute 0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-pink-500"></span>
        </button>

        {/* 3. Espas Atis */}
        <button
          id="mobile-tab-artist-btn"
          onClick={() => {
            if (currentArtist) {
              setCurrentView('artist_dashboard');
            } else {
              onOpenArtistAuth();
            }
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all select-none min-w-[56px] ${
            currentView === 'artist_dashboard'
              ? 'text-red-400 bg-red-500/15 font-bold shadow-inner'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentArtist ? (
            <div className="relative">
              <img
                src={currentArtist.avatarUrl}
                alt={currentArtist.stageName}
                className="w-5 h-5 rounded-full object-cover border border-yellow-400"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-black"></span>
            </div>
          ) : (
            <User className="w-5 h-5 text-yellow-400" />
          )}
          <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate max-w-[64px]">
            {currentArtist ? currentArtist.stageName : 'Espas Atis'}
          </span>
        </button>

        {/* 4. Playlist Oflayn */}
        <button
          id="mobile-tab-offline-btn"
          onClick={onOpenOfflineModal}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all select-none min-w-[56px] text-amber-400 hover:text-amber-300 relative"
          title="Playlist Oflayn & Ke Telechajman"
        >
          <ListMusic className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Oflayn</span>
          {offlineTracksCount > 0 && (
            <span className="absolute top-0 right-1 px-1 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-black">
              {offlineTracksCount}
            </span>
          )}
        </button>

        {/* 5. Admin / Tèm Toggle */}
        <button
          id="mobile-tab-admin-btn"
          onClick={() => {
            if (currentAdmin) {
              setCurrentView('admin_dashboard');
            } else {
              onOpenAdminAuth();
            }
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all select-none min-w-[56px] ${
            currentView === 'admin_dashboard'
              ? 'text-yellow-400 bg-yellow-400/15 font-bold shadow-inner'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={pendingArtistsCount > 0 ? `${pendingArtistsCount} nouvo atis an atant validasyon` : 'Espas Administratè'}
        >
          <div className="relative flex items-center justify-center">
            <ShieldCheck className={`w-5 h-5 ${currentAdmin ? 'text-yellow-400' : 'text-slate-400'}`} />
            {pendingArtistsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 min-w-[15px] h-3.5 rounded-full bg-red-500 text-white text-[9px] font-mono font-black flex items-center justify-center shadow-md shadow-red-500/50 animate-pulse">
                {pendingArtistsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">
            {currentAdmin ? 'Admin' : 'Admin'}
          </span>
        </button>

      </div>
    </nav>
  );
};
