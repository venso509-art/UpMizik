import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  X,
  HeartHandshake,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  RotateCw,
  CheckCircle2,
  Zap,
  Radio,
  Download,
  Check,
  Loader2
} from 'lucide-react';
import { MusicItem } from '../types';

interface GlobalAudioPlayerProps {
  currentTrack: MusicItem | null;
  isPlaying: boolean;
  playbackProgress: number;
  playbackSeconds: number;
  hasListened5s: boolean;
  isCachedOffline?: boolean;
  volume?: number;
  isMuted?: boolean;
  onPlayToggle: () => void;
  onClosePlayer: () => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile: (artistId: string) => void;
  onSeek?: (seconds: number) => void;
  onSkip?: (delta: number) => void;
  onVolumeChange?: (vol: number) => void;
  onToggleMute?: () => void;
  onDownloadOffline?: (music: MusicItem) => void;
  onOpenCredits?: (music: MusicItem) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const GlobalAudioPlayer: React.FC<GlobalAudioPlayerProps> = ({
  currentTrack,
  isPlaying,
  playbackProgress,
  playbackSeconds,
  hasListened5s,
  isCachedOffline = false,
  volume = 0.9,
  isMuted = false,
  onPlayToggle,
  onClosePlayer,
  onOpenSupport,
  onOpenArtistProfile,
  onSeek,
  onSkip,
  onVolumeChange,
  onToggleMute,
  onDownloadOffline,
  onOpenCredits
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const handleDownload = async () => {
    if (isDownloading || !onDownloadOffline) return;
    setIsDownloading(true);
    try {
      await onDownloadOffline(currentTrack);
    } catch {
      // Handled gracefully in UI
    } finally {
      setIsDownloading(false);
    }
  };

  const totalDuration = currentTrack.duration && currentTrack.duration > 0 ? currentTrack.duration : 180;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !onSeek) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = Math.round(percent * totalDuration);
    onSeek(targetSeconds);
  };

  return (
    <div className="fixed bottom-[56px] md:bottom-0 left-0 right-0 z-40 bg-[#05070a]/95 border-t border-white/[0.12] backdrop-blur-2xl shadow-2xl transition-all animate-slideUp">
      {/* Interactive Progress Bar */}
      <div
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className="group relative w-full h-2 bg-white/[0.08] hover:h-3 cursor-pointer transition-all"
        title="Klike oswa glise pou chanje pozisyon nan mizik la"
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 relative"
          style={{ width: `${Math.min(100, Math.max(0, playbackProgress))}%` }}
        >
          {/* Scrubber thumb */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-black/50 border border-white/80 opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-110" />
        </div>
      </div>

      {/* Horizontally scrollable container on mobile to prevent clipping buttons */}
      <div 
        id="global-player-scroll-container"
        className="w-full overflow-x-auto overscroll-x-contain touch-pan-x player-scrollbar select-none"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between gap-3 sm:gap-6 min-w-max md:min-w-0">
          
          {/* 1. Track Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 max-w-[200px] sm:max-w-xs">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shrink-0 border border-white/[0.12] bg-black shadow-lg">
              <img
                src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                }}
              />
              {isCachedOffline && (
                <span className="absolute top-1 right-1 p-0.5 rounded-full bg-amber-500 text-slate-950 shadow" title="Disponib Oflayn">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                </span>
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-0.5">
                  <span className="w-0.5 h-3 bg-red-400 animate-pulse" style={{ animationDuration: '0.4s' }} />
                  <span className="w-0.5 h-4 bg-yellow-400 animate-pulse" style={{ animationDuration: '0.6s' }} />
                  <span className="w-0.5 h-2 bg-blue-400 animate-pulse" style={{ animationDuration: '0.3s' }} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-white truncate max-w-[125px] sm:max-w-[170px]" title={currentTrack.title}>
                  {currentTrack.title}
                </h4>
                <span className="hidden lg:inline-block text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-yellow-400 border border-white/[0.08] font-semibold shrink-0">
                  {currentTrack.category}
                </span>
                {isCachedOffline && (
                  <span className="hidden sm:inline-flex text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded shrink-0">
                    Oflayn
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => onOpenArtistProfile(currentTrack.artistId)}
                  className="text-[11px] text-slate-400 hover:text-blue-400 truncate text-left transition-colors font-medium max-w-[125px] sm:max-w-[170px]"
                >
                  {currentTrack.artistName}
                </button>
                {currentTrack.collab && (
                  <button
                    type="button"
                    onClick={() => onOpenArtistProfile(currentTrack.collab!.artistId)}
                    className="text-[10px] text-purple-300 hover:text-purple-200 bg-purple-950/60 hover:bg-purple-900/80 px-1.5 py-0.2 rounded border border-purple-500/30 truncate transition-all flex items-center gap-0.5 shrink-0"
                    title={`Kolaboratè: ${currentTrack.collab.artistName} (${currentTrack.collab.role || 'Featuring'})`}
                  >
                    <span>🤝</span>
                    <span>ft. {currentTrack.collab.artistName}</span>
                  </button>
                )}
                {currentTrack.feat && !currentTrack.collab && (
                  <span className="text-[10px] text-slate-400 truncate shrink-0">
                    ft. {currentTrack.feat}
                  </span>
                )}
                {currentTrack.releaseFormat && currentTrack.releaseFormat !== 'single' && (
                  <span
                    className="hidden xl:inline-flex text-[9px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.2 rounded truncate max-w-[120px] shrink-0"
                    title={`${currentTrack.releaseFormat.toUpperCase()}: ${currentTrack.albumName || ''}`}
                  >
                    {currentTrack.releaseFormat === 'album' ? '💿' : currentTrack.releaseFormat === 'ep' ? '💽' : currentTrack.releaseFormat === 'mixtape' ? '📼' : '🎙️'} {currentTrack.albumName || currentTrack.releaseFormat.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Center Controls & Accurate Duration / Listen Status */}
          <div className="flex flex-col items-center justify-center gap-1 shrink-0 px-1 sm:px-2 min-w-[140px] sm:min-w-[180px]">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Skip -10s */}
              <button
                onClick={() => onSkip ? onSkip(-10) : onSeek?.(Math.max(0, playbackSeconds - 10))}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/[0.08] active:scale-95 transition-all"
                title="Fè bak 10 segond"
                aria-label="Fè bak 10 segond"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Main Play / Pause */}
              <button
                id="global-player-play-btn"
                onClick={onPlayToggle}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/50 active:scale-95 transition-all border border-red-400/30 shrink-0"
                aria-label={isPlaying ? 'Pòz' : 'Jwe'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {/* Skip +10s */}
              <button
                onClick={() => onSkip ? onSkip(10) : onSeek?.(Math.min(totalDuration, playbackSeconds + 10))}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/[0.08] active:scale-95 transition-all"
                title="Avanse 10 segond"
                aria-label="Avanse 10 segond"
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Time & 5s Listen validation badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-mono whitespace-nowrap">
              <span className="text-slate-300 font-semibold">
                {formatTime(playbackSeconds)} / {formatTime(totalDuration)}
              </span>
              {hasListened5s ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/90 px-1.5 py-0.5 rounded-md border border-emerald-500/40">
                  <CheckCircle2 className="w-2.5 h-2.5" /> +1 Ekout
                </span>
              ) : (
                <span className="text-yellow-300 bg-yellow-950/90 px-1.5 py-0.5 rounded-md border border-yellow-500/30">
                  {Math.max(0, 5 - Math.floor(playbackSeconds))}s valide
                </span>
              )}
            </div>
          </div>

          {/* 3. Right Action Buttons & Volume Control */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 pl-1 pr-2 sm:pr-0">
            {/* Volume Control */}
            <div className="relative hidden md:flex items-center">
              <button
                type="button"
                onClick={() => onToggleMute?.()}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
                title={isMuted ? 'Debloke son' : 'Mete sou silans'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-slate-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-300" />
                )}
              </button>

              {showVolumeSlider && (
                <div
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  className="absolute right-0 bottom-full mb-2 bg-[#0a0f1d] border border-white/[0.12] p-2 rounded-xl shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-fadeIn z-50"
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : (volume ?? 0.9)}
                    onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                    className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-6">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Explicit Offline Download Button */}
            {onDownloadOffline && (
              <button
                type="button"
                id="global-player-download-btn"
                onClick={handleDownload}
                disabled={isDownloading}
                className={`p-2 sm:p-2.5 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                  isCachedOffline
                    ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white'
                }`}
                title={
                  isCachedOffline
                    ? 'Mizik sa deja anrejistre pou koute oflayn (Klike pou re-telechaje)'
                    : 'Telechaje moso sa pou koute san entènèt (Oflayn)'
                }
                aria-label={isCachedOffline ? 'Oflayn Pare' : 'Telechaje pou oflayn'}
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                ) : isCachedOffline ? (
                  <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                ) : (
                  <Download className="w-4 h-4 text-slate-300 hover:text-amber-400" />
                )}
              </button>
            )}

            {/* Support Artist Button (Donation) */}
            <button
              id="global-player-support-btn"
              type="button"
              onClick={() => onOpenSupport(currentTrack)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 shadow-lg shadow-yellow-500/20 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 whitespace-nowrap"
              title="Fè yon don / Sipòte atis la"
            >
              <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
              <span>Sipòte</span>
            </button>

            {/* Close Player */}
            <button
              id="global-player-close-btn"
              type="button"
              onClick={onClosePlayer}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-white rounded-xl bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 transition-colors shrink-0 border border-white/[0.08]"
              title="Fèmen lektè a"
              aria-label="Fèmen lektè"
            >
              <X className="w-4 h-4 shrink-0" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

