import React, { useState } from 'react';
import {
  Play,
  Pause,
  HeartHandshake,
  Heart,
  Eye,
  MessageSquare,
  Share2,
  Volume2,
  CheckCircle2,
  ExternalLink,
  Zap,
  Download,
  Check,
  Loader2,
  ListPlus,
  Sparkles,
  User,
  BookOpen
} from 'lucide-react';
import { MusicItem } from '../types';
import { ArtistBadge } from './ArtistBadge';
import { getBadgeByDonations } from '../utils/badgeSystem';
import { offlineManager } from '../utils/offlineManager';
import { StorageService } from '../utils/storage';
import { FloatingHearts, createHeartBurst, FloatingHeartParticle } from './FloatingHearts';

interface MusicCardProps {
  music: MusicItem;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  playbackProgress: number; // 0 to 100
  playbackSeconds: number; // current seconds played
  hasListened5s: boolean;
  isCachedOffline?: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenComment: (music: MusicItem) => void;
  onOpenArtistProfile: (artistId: string) => void;
  onShare: (music: MusicItem) => void;
  onDownloadOffline?: (music: MusicItem) => void;
  onAddToOfflineQueue?: (music: MusicItem) => void;
  onOpenCredits?: (music: MusicItem) => void;
}

export const MusicCard: React.FC<MusicCardProps> = ({
  music,
  isPlaying,
  isCurrentTrack,
  playbackProgress,
  playbackSeconds,
  hasListened5s,
  isCachedOffline = false,
  onPlayToggle,
  onOpenSupport,
  onOpenComment,
  onOpenArtistProfile,
  onShare,
  onDownloadOffline,
  onAddToOfflineQueue,
  onOpenCredits
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);
  const [isLiked, setIsLiked] = useState(() => StorageService.isMusicLiked(music.id));
  const [likesCount, setLikesCount] = useState(() =>
    typeof music.likesCount === 'number'
      ? music.likesCount
      : Math.floor((music.listens || 50) / 12) + 5
  );
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeartParticle[]>([]);
  const [isHeartPopping, setIsHeartPopping] = useState(false);

  const badgeInfo = getBadgeByDonations(music.totalDonations);
  const isLocallyCached = isCachedOffline || justDownloaded || offlineManager.isTrackCached(music.id);

  const handleShareClick = () => {
    onShare(music);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = StorageService.toggleLikeMusic(music.id);
    setIsLiked(result.isLiked);
    setLikesCount(result.likesCount);

    // Trigger Heart Pop Animation
    setIsHeartPopping(true);
    setTimeout(() => setIsHeartPopping(false), 450);

    // Trigger floating hearts burst (more hearts if liking)
    const newHearts = createHeartBurst(result.isLiked ? 8 : 4, 45, 12);
    setFloatingHearts((prev) => [...prev, ...newHearts]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 1400);
  };

  const handleSupportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger floating hearts burst on Support button click
    const newHearts = createHeartBurst(9, 50, 28);
    setFloatingHearts((prev) => [...prev, ...newHearts]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 1400);

    onOpenSupport(music);
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      await offlineManager.cacheTrackForOffline(music);
      setJustDownloaded(true);
      if (onDownloadOffline) {
        onDownloadOffline(music);
      }
      setTimeout(() => {
        setIsDownloading(false);
      }, 500);
    } catch (err) {
      console.warn('Download to offline storage error:', err);
      setIsDownloading(false);
    }
  };

  const isThisPlaying = isCurrentTrack && isPlaying;

  return (
    <div
      id={`music-card-${music.id}`}
      className="group relative flex flex-col justify-between bg-[#0a0f1d]/80 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/[0.08] hover:border-white/[0.18] hover:bg-[#0e1628]/90 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-950/40 hover:-translate-y-1"
    >
      {/* Floating Hearts Particles Burst Container */}
      <FloatingHearts hearts={floatingHearts} />

      {/* Cover Image & Category Badge Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-black">
        <img
          src={music.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
          alt={music.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>

        {/* Category & Badge Top Left */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
          {typeof music.position === 'number' && music.position > 0 && (
            <span 
              className="px-2 py-1 rounded-lg text-[11px] font-black bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20 font-mono"
              title={`Nimewo Pozisyon: #${music.position}`}
            >
              #{music.position}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#070c17]/90 text-yellow-400 border border-white/[0.12] backdrop-blur-md shadow-sm">
            {music.category}
          </span>
          {isCachedOffline && (
            <span 
              className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-500/90 text-slate-950 border border-amber-300 backdrop-blur-md shadow-sm flex items-center gap-1"
              title="Mizik sa anrejistre nan aparèy ou - w ap ka jwe li menm san entènèt"
            >
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>Oflayn</span>
            </span>
          )}
          {badgeInfo.tier !== 'emerging' && (
            <ArtistBadge badge={badgeInfo} size="xs" />
          )}
        </div>

        {/* Listen Count Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-black/80 text-slate-200 border border-white/[0.1] backdrop-blur-md shadow-sm">
            <Eye className="w-3 h-3 text-blue-400" />
            <span>{music.listens.toLocaleString()}</span>
          </div>
        </div>

        {/* Center Play / Pause Big Action Button */}
        <button
          id={`music-card-play-btn-${music.id}`}
          onClick={() => onPlayToggle(music)}
          className={`absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 z-20 ${
            isThisPlaying
              ? 'bg-red-600 text-white scale-100 shadow-xl shadow-red-600/50'
              : 'bg-black/60 text-yellow-400 hover:bg-blue-600 hover:text-white backdrop-blur-md scale-90 group-hover:scale-100 shadow-lg border border-white/10'
          }`}
          aria-label={isThisPlaying ? 'Pòz' : 'Jwe'}
        >
          {isThisPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>

        {/* 5-Second Listen Counter Indicator Overlay (Active during playback) */}
        {isCurrentTrack && (
          <div className="absolute bottom-2.5 left-3 right-3 z-20">
            <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1 font-mono">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-yellow-400 animate-pulse" />
                <span>{Math.floor(playbackSeconds)}s / {music.duration}s</span>
              </span>
              {hasListened5s ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  <CheckCircle2 className="w-2.5 h-2.5" /> +1 Ekout
                </span>
              ) : (
                <span className="text-yellow-300 bg-yellow-950/90 px-1.5 py-0.5 rounded border border-yellow-500/30">
                  {Math.max(0, 5 - Math.floor(playbackSeconds))}s pou valide
                </span>
              )}
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 transition-all duration-200"
                style={{ width: `${Math.min(100, playbackProgress)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Card Body & Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="font-bold text-base text-white line-clamp-1 group-hover:text-yellow-300 transition-colors">
            {music.title}
          </h3>

          {/* Clickable Artist Name & Badge */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <button
              id={`music-card-artist-btn-${music.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenArtistProfile(music.artistId);
              }}
              className="text-xs text-slate-300 hover:text-cyan-300 font-medium truncate text-left transition-colors flex items-center gap-1 group/artist"
              title="Klike pou wè pwofil konplè ak biyografi atis la"
            >
              <User className="w-3 h-3 text-slate-400 group-hover/artist:text-cyan-400 shrink-0 transition-colors" />
              <span className="group-hover/artist:underline underline-offset-2">{music.artistName}</span>
              {music.feat ? <span className="text-slate-500 font-normal">ft. {music.feat}</span> : ''}
            </button>

            {music.collab && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenArtistProfile(music.collab!.artistId);
                }}
                className="text-[10px] font-bold text-purple-300 hover:text-white bg-purple-950/70 hover:bg-purple-900/90 px-1.5 py-0.5 rounded-lg border border-purple-500/30 transition-all flex items-center gap-1 shadow-sm"
                title={`Klike pou wè pwofil ak biyografi ${music.collab.artistName} (${music.collab.role || 'Featuring'})`}
              >
                <span>🤝</span>
                <span>ft. {music.collab.artistName}</span>
              </button>
            )}

            <ArtistBadge badge={badgeInfo} size="xs" />
          </div>

          {/* Album / EP / Mixtape / Demo Badge */}
          {music.releaseFormat && music.releaseFormat !== 'single' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-full">
                <span>{music.releaseFormat === 'album' ? '💿 Albòm:' : music.releaseFormat === 'ep' ? '💽 EP:' : music.releaseFormat === 'mixtape' ? '📼 Mixtape:' : '🎙️ Demo:'}</span>
                <span className="truncate">{music.albumName || music.releaseFormat.toUpperCase()}</span>
                {typeof music.trackNumber === 'number' && music.trackNumber > 0 && (
                  <span className="text-yellow-400 font-mono">#{music.trackNumber}</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Verified Community Support indicator without exposing raw money amounts publicly */}
        {music.totalDonations > 0 && (
          <div className="mt-2.5 flex items-center justify-between text-xs bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              Kominote Fanatik:
            </span>
            <span className="font-bold text-emerald-400 text-[11px]">Sipò Konfime</span>
          </div>
        )}

        {/* "Fè yon Sipò" (Donate) Button */}
        <div className="mt-3.5">
          <button
            id={`music-card-donate-btn-${music.id}`}
            onClick={handleSupportClick}
            className="w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-red-600 via-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg shadow-red-950/50 border border-red-500/30 flex items-center justify-center gap-2 transition-all duration-200 active:scale-98 relative overflow-hidden"
          >
            <HeartHandshake className="w-4 h-4 text-yellow-300 transition-transform group-hover:scale-110" />
            <span>Fè yon Sipò (Moncash/Natcash)</span>
          </button>
        </div>

        {/* 6+ Social & Action Icons Row (Like, YouTube, TikTok, Instagram, Download, Queue, Comment, Share) */}
        <div className="mt-3.5 pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar text-slate-400">
          
          {/* Heart / Like Button with Animation */}
          <button
            id={`music-card-like-btn-${music.id}`}
            onClick={handleLikeClick}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs transition-all duration-200 active:scale-90 relative ${
              isLiked
                ? 'text-red-500 bg-red-500/10 border border-red-500/25 shadow-sm shadow-red-500/10'
                : 'hover:text-red-400 hover:bg-white/[0.06] text-slate-400'
            }`}
            title={isLiked ? 'Ou renmen moso sa (Klike pou retire like)' : 'Renmen moso mizik sa'}
            aria-label={`Like ${music.title} (${likesCount} likes)`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-all duration-300 ${
                isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'
              } ${isHeartPopping ? 'animate-heart-pop' : ''}`}
            />
            <span className={`font-mono text-[11px] font-medium transition-colors ${isLiked ? 'text-red-400 font-bold' : ''}`}>
              {likesCount.toLocaleString()}
            </span>
          </button>

          {/* YouTube */}
          <a
            href={music.youtubeUrl || 'https://youtube.com'}
            target="_blank"
            rel="noopener noreferrer"
            title="Gade sou YouTube"
            className="p-1.5 hover:text-red-500 hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>

          {/* TikTok */}
          <a
            href={music.tiktokUrl || 'https://tiktok.com'}
            target="_blank"
            rel="noopener noreferrer"
            title="Swiv sou TikTok"
            className="p-1.5 hover:text-cyan-400 hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.18 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
          </a>

          {/* Instagram */}
          <a
            href={music.instagramUrl || 'https://instagram.com'}
            target="_blank"
            rel="noopener noreferrer"
            title="Gade sou Instagram"
            className="p-1.5 hover:text-pink-400 hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>

          {/* Download / Offline Cache Button */}
          <button
            id={`music-card-download-btn-${music.id}`}
            onClick={handleDownloadClick}
            disabled={isDownloading}
            className={`flex items-center gap-1 p-1.5 rounded-xl text-xs transition-all duration-200 ${
              isLocallyCached
                ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 hover:bg-emerald-900/40 shadow-sm'
                : 'hover:text-amber-400 hover:bg-white/[0.06] text-slate-400 active:scale-95'
            }`}
            title={
              isLocallyCached
                ? 'Mizik sa deja anrejistre pou koute oflayn san entènèt (Klike pou re-telechaje)'
                : 'Telechaje pou koute san entènèt (Oflayn)'
            }
            aria-label={
              isLocallyCached
                ? `Mizik ${music.title} telechaje pou koute oflayn`
                : `Telechaje ${music.title} pou oflayn`
            }
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : isLocallyCached ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Add to Offline Playlist / Batch Queue Button */}
          {onAddToOfflineQueue && (
            <button
              id={`music-card-queue-btn-${music.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onAddToOfflineQueue(music);
              }}
              className="p-1.5 hover:text-amber-400 hover:bg-white/[0.06] rounded-xl text-slate-400 transition-colors"
              title="Ajoute nan Playlist Oflayn / Ke Telechajman an Pakèt"
              aria-label="Ajoute nan Playlist Oflayn"
            >
              <ListPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Comment Button with Counter */}
          <button
            id={`music-card-comment-btn-${music.id}`}
            onClick={() => onOpenComment(music)}
            className="flex items-center gap-1 px-2 py-1.5 hover:text-yellow-400 hover:bg-white/[0.06] rounded-xl text-xs transition-colors"
            title="Kòmantè"
            aria-label={`${music.commentsCount || 0} kòmantè`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] font-medium">{music.commentsCount || 0}</span>
          </button>

          {/* Share Button with Real-Time Counter Metric */}
          <button
            id={`music-card-share-btn-${music.id}`}
            onClick={handleShareClick}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-all duration-200 ${
              copiedLink
                ? 'text-emerald-400 bg-emerald-950/90 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'hover:text-blue-400 hover:bg-white/[0.06] text-slate-400 active:scale-95'
            }`}
            title="Pataje moso sa sou rezo sosyal yo"
            aria-label={`Pataje ${music.title} (${music.sharesCount || 0} pataj)`}
          >
            <Share2 className={`w-3.5 h-3.5 transition-transform ${copiedLink ? 'scale-110 text-emerald-400' : ''}`} />
            {copiedLink ? (
              <span className="text-[10px] font-bold text-emerald-300">Kopye!</span>
            ) : (
              <span className="font-mono text-[11px] font-medium text-slate-300 group-hover/share:text-white">
                {(music.sharesCount || 0).toLocaleString()}
              </span>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};
