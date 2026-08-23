import React, { useState } from 'react';
import { X, Play, Pause, HeartHandshake, Volume2, Maximize2, Minimize2, Sparkles, Disc, Radio, Sliders } from 'lucide-react';
import { MusicItem } from '../types';
import { D3AudioVisualizer, VisualizerMode, VisualizerPalette } from './D3AudioVisualizer';

interface D3VisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MusicItem | null;
  isPlaying: boolean;
  playbackProgress: number;
  playbackSeconds: number;
  onPlayToggle: () => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile: (artistId: string) => void;
}

export const D3VisualizerModal: React.FC<D3VisualizerModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  playbackProgress,
  playbackSeconds,
  onPlayToggle,
  onOpenSupport,
  onOpenArtistProfile
}) => {
  const [activeMode, setActiveMode] = useState<VisualizerMode>('wave');
  const [activePalette, setActivePalette] = useState<VisualizerPalette>('ayiti');

  if (!isOpen || !currentTrack) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-2xl animate-fadeIn select-none p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      
      {/* Ambient background glow matching Haitian / palette colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="min-h-full flex items-center justify-center py-4">
        <div className="relative w-full max-w-4xl bg-[#070b14]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden my-auto max-h-[92dvh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  Estidyo Vizyalizè D3
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-600/30 text-blue-300 border border-blue-500/30">
                  D3 Dynamic Reactivity
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Spectre ak anplitid an tan reyèl pou moso k ap jwe a
              </p>
            </div>
          </div>

          <button
            id="d3-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
            title="Fèmen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Track Showcase & Big D3 Stage */}
        <div className="mt-6 flex flex-col md:flex-row items-center gap-6">
          
          {/* Track Vinyl & Art */}
          <div className="flex flex-col items-center text-center shrink-0 w-full md:w-64">
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl overflow-hidden border-2 border-white/[0.15] shadow-2xl bg-black group">
              <img
                src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                  {currentTrack.category}
                </span>
              </div>
            </div>

            <h4 className="mt-3.5 font-black text-base sm:text-lg text-white truncate max-w-full">
              {currentTrack.title}
            </h4>
            <button
              onClick={() => {
                onClose();
                onOpenArtistProfile(currentTrack.artistId);
              }}
              className="text-xs text-slate-400 hover:text-blue-400 transition-colors font-medium"
            >
              {currentTrack.artistName}
            </button>
          </div>

          {/* D3 Audio Visualizer Main Canvas */}
          <div className="flex-1 w-full flex flex-col">
            <div className="bg-[#030712]/80 border border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-inner">
              <D3AudioVisualizer
                isPlaying={isPlaying}
                category={currentTrack.category}
                height={160}
                showControls={true}
                initialMode={activeMode}
                initialPalette={activePalette}
              />
            </div>
          </div>

        </div>

        {/* Bottom Playback Bar & Action Controls */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Progress Slider */}
          <div className="w-full sm:flex-1 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>{Math.floor(playbackSeconds)}s</span>
              <span>{currentTrack.duration}s</span>
            </div>
            <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500 rounded-full transition-all duration-150"
                style={{ width: `${Math.min(100, playbackProgress)}%` }}
              ></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="d3-modal-play-btn"
              onClick={onPlayToggle}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              id="d3-modal-support-btn"
              onClick={() => {
                onClose();
                onOpenSupport(currentTrack);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Sipòte Atis la</span>
            </button>
          </div>

        </div>

        </div>
      </div>
    </div>
  );
};
