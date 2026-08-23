import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  MapPin,
  Music,
  Eye,
  HeartHandshake,
  Calendar,
  CheckCircle2,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Quote,
  Flame,
  Compass,
  Radio,
  Users,
  Link2,
  Share2,
  Check
} from 'lucide-react';
import { ArtistUser, MusicItem } from '../types';
import { ArtistBadge } from './ArtistBadge';
import { SongCreditsModal } from './SongCreditsModal';
import { getArtistBadgeInfo, calculateArtistTotalDonations } from '../utils/badgeSystem';
import { generateStylizedBanner, getThemeConfigForGenre } from '../utils/bannerGenerator';
import { updateArtistDocumentMetaTags, generateArtistProfileDeepLink } from '../utils/deepLink';

interface ArtistProfileModalProps {
  artist: ArtistUser | null;
  artistSongs: MusicItem[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  onClose: () => void;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile?: (artistId: string) => void;
}

export const ArtistProfileModal: React.FC<ArtistProfileModalProps> = ({
  artist,
  artistSongs,
  currentPlayingId,
  isPlaying,
  onClose,
  onPlayToggle,
  onOpenSupport,
  onOpenArtistProfile
}) => {
  const [activeProfileTab, setActiveProfileTab] = useState<'bio' | 'songs'>('bio');
  const [songCatalogFilter, setSongCatalogFilter] = useState<'all' | 'primary' | 'collabs'>('all');
  const [viewingCreditsSong, setViewingCreditsSong] = useState<MusicItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  // Dynamically update document meta tags (OpenGraph, Twitter card) when viewing artist profile
  useEffect(() => {
    if (artist) {
      updateArtistDocumentMetaTags(artist, artistSongs.length);
      bodyRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setIsClosing(false);
    }
  }, [artist, artistSongs.length, activeProfileTab]);

  const handleShareProfile = async () => {
    if (!artist) return;
    updateArtistDocumentMetaTags(artist, artistSongs.length);
    const deepLink = generateArtistProfileDeepLink(artist.id || artist.stageName);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${artist.stageName} - Pwofil Atis UpMizik`,
          text: `Gade pwofil ofisyèl ${artist.stageName} sou UpMizik Ayiti. Koute mizik li yo epi voye sipò dirèk ak MonCash & Natcash!`,
          url: deepLink
        });
        setCopiedProfileLink(true);
        setTimeout(() => setCopiedProfileLink(false), 2500);
        return;
      } catch (err) {
        // User cancelled or fallback to clipboard
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(deepLink);
        setCopiedProfileLink(true);
        setTimeout(() => setCopiedProfileLink(false), 2500);
      }
    } catch (err) {
      console.warn('Failed to copy artist link:', err);
    }
  };

  if (!artist) return null;

  const totalDonations = calculateArtistTotalDonations(artist, artistSongs);
  const badgeInfo = getArtistBadgeInfo(artist, artistSongs);

  const primarySongs = artistSongs.filter((m) => m.artistId === artist.id);
  const collabSongs = artistSongs.filter((m) => m.collab?.artistId === artist.id);

  const displayedSongs = artistSongs.filter((m) => {
    if (songCatalogFilter === 'primary') return m.artistId === artist.id;
    if (songCatalogFilter === 'collabs') return m.collab?.artistId === artist.id;
    return true;
  });

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
        <div
          ref={bodyRef}
          className={`relative w-full max-w-2xl bg-[#0a0f1d]/95 border border-white/[0.12] rounded-3xl overflow-y-auto overflow-x-hidden shadow-2xl my-auto max-h-[92dvh] backdrop-blur-2xl modal-backdrop-scroll flex flex-col ${
            isClosing ? 'animate-modal-out' : 'animate-modal-in'
          }`}
        >
          {/* Cover Header Graphic with Custom Stylized Banner */}
          <div className="relative h-40 sm:h-52 bg-[#060a14] overflow-hidden shrink-0">
            {artist.headerBannerUrl ? (
              <img
                src={artist.headerBannerUrl}
                alt={`Bannè ${artist.stageName}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80';
                }}
              />
            ) : (
              <div className="w-full h-full relative bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 flex items-end">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
              </div>
            )}

            {/* Vignette Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-black/20 to-black/40 pointer-events-none" />

            {/* Top Action Buttons on Banner */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-30">
              <button
                id="btn-share-artist-profile"
                type="button"
                onClick={handleShareProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-yellow-400 hover:text-slate-950 text-xs font-bold text-yellow-400 border border-yellow-400/40 shadow-xl backdrop-blur-md transition-all active:scale-95"
                title="Pataje pwofil atis la sou rezo sosyal yo (WhatsApp, Facebook, Twitter)"
              >
                {copiedProfileLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Lyen Kopye!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Pataje Pwofil</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                id="close-artist-profile-btn"
                onClick={handleClose}
                className="p-2 rounded-full bg-black/70 text-slate-200 hover:text-white hover:bg-black/90 transition-all backdrop-blur-md border border-white/20 shadow-xl"
                title="Fèmen pwofil la"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Artist Profile Body Content */}
          <div className="relative px-4 sm:px-6 pb-6 pt-0 flex-1">
            {/* Avatar & Key Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-16 mb-6 gap-4">
              <div className="flex items-end gap-3.5 sm:gap-4">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-[#0a0f1d] shadow-2xl bg-black shrink-0 z-10">
                  <img
                    src={artist.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'}
                    alt={artist.stageName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
                <div className="mb-1 sm:mb-2 z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif] leading-tight">
                      {artist.stageName}
                    </h2>
                    <span className="p-1 rounded-full bg-blue-500 text-white shadow-md shadow-blue-500/30" title="Atis Verifye">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                    <ArtistBadge badge={badgeInfo} donations={totalDonations} size="sm" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{artist.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-yellow-400 mt-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{artist.city}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats Pills & Direct Support CTA */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 self-start sm:self-end">
                <button
                  id="btn-direct-support-artist"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // If artist has songs, support top/first song, or create artist-level support target
                    const targetSong: MusicItem = artistSongs[0] || {
                      id: `artist_direct_${artist.id}`,
                      title: `Sipò Dirèk Atis (${artist.stageName})`,
                      artistId: artist.id,
                      artistName: artist.stageName,
                      coverUrl: artist.avatarUrl || artist.headerBannerUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
                      audioUrl: '',
                      category: 'Vokal',
                      listens: artist.totalListens || 0,
                      likes: 0,
                      isExclusive: false,
                      lyrics: ''
                    };
                    onOpenSupport(targetSong);
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-slate-950 flex items-center gap-2 shadow-lg shadow-yellow-500/25 border border-yellow-300 transition-all active:scale-95"
                  title="Voye yon sipò lajan dirèkteman bay atis sa a (MonCash, Natcash, Zelle)"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Sipòte Atis Sa</span>
                </button>

                <div className="flex items-center bg-[#05070a]/90 border border-white/[0.08] p-2.5 sm:p-3 rounded-2xl backdrop-blur-md">
                  <div className="text-center px-2.5 sm:px-3 border-r border-white/[0.08]">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Koute</p>
                    <p className="text-sm font-black text-white">{artist.totalListens.toLocaleString()}</p>
                  </div>
                  <div className="text-center px-2.5 sm:px-3 border-r border-white/[0.08]">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Mizik</p>
                    <p className="text-sm font-black text-white">{artistSongs.length}</p>
                  </div>
                  <div className="text-center px-2.5 sm:px-3">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Nivo</p>
                    <p className="text-sm font-black text-yellow-400">{badgeInfo.label}</p>
                  </div>
                </div>
              </div>
            </div>

          {/* Verified Community Trust & Badge Status Card */}
          <div className="mb-6 p-4 rounded-2xl bg-[#070d1a] border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${badgeInfo.bgClass} ${badgeInfo.borderClass}`}>
                  <ShieldCheck className={`w-4 h-4 ${badgeInfo.colorClass}`} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Sitiyasyon Konfyans Kominote:</span>
                    <span className={`font-black ${badgeInfo.colorClass}`}>{badgeInfo.label}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">{badgeInfo.description}</p>
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sipò Kominotè</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block">
                  Konfime & Verifye
                </span>
              </div>
            </div>

            {/* Next Tier Progress if not Elite */}
            {badgeInfo.nextTierMinDonations && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Objektif Pwochen Nivo: <strong className="text-slate-200">{badgeInfo.nextTierLabel}</strong></span>
                  <span className="text-yellow-400 font-mono font-bold">${totalDonations.toFixed(0)} / ${badgeInfo.nextTierMinDonations}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-cyan-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(5, ((totalDonations - badgeInfo.minDonations) / (badgeInfo.nextTierMinDonations - badgeInfo.minDonations)) * 100)
                      )}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tab Selection: Biography & Story vs Songs Catalog */}
          <div className="flex items-center gap-2 mb-6 border-b border-white/[0.08] pb-3">
            <button
              onClick={() => setActiveProfileTab('bio')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeProfileTab === 'bio'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-950/40'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Biyografi & Istwa Mwen</span>
            </button>

            <button
              onClick={() => setActiveProfileTab('songs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeProfileTab === 'songs'
                  ? 'bg-red-600/30 text-red-300 border border-red-500/40 shadow-lg shadow-red-950/40'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Katalòg Mizik ({artistSongs.length})</span>
            </button>
          </div>

          {/* TAB 1: RICH BIOGRAPHY & STORY */}
          {activeProfileTab === 'bio' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Artist Personal Quote/Motto Banner */}
              {artist.artistQuote && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 relative overflow-hidden backdrop-blur-sm">
                  <Quote className="w-8 h-8 text-yellow-400/20 absolute -top-1 -left-1 transform -scale-x-100" />
                  <p className="text-xs sm:text-sm font-semibold italic text-amber-200 pl-4 border-l-2 border-yellow-400 leading-relaxed">
                    “{artist.artistQuote}”
                  </p>
                </div>
              )}

              {/* Full Biography Story Content */}
              <div className="bg-[#05070a]/70 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Biyografi & Vwayaj Atistik
                  </h4>
                </div>

                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-line font-normal">
                  {artist.bio || (
                    <p className="italic text-slate-500">
                      Atis sa ap kreye bèl mizik pou anrichi kilti kreyòl la sou platfòm UpMizik Ayiti.
                    </p>
                  )}
                </div>

                {/* Cultural & Story Highlights Grid */}
                {(artist.musicalRoots || artist.musicalInfluences || artist.artisticVision) && (
                  <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {artist.musicalRoots && (
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mb-1">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Rasin & Estil</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">{artist.musicalRoots}</p>
                      </div>
                    )}

                    {artist.musicalInfluences && (
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 mb-1">
                          <Radio className="w-3.5 h-3.5" />
                          <span>Enspirasyon</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">{artist.musicalInfluences}</p>
                      </div>
                    )}

                    {artist.artisticVision && (
                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
                          <Compass className="w-3.5 h-3.5" />
                          <span>Vizyon Kiltirèl</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">{artist.artisticVision}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Social Media Handles Row */}
                <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400">Rezo Sosyal:</span>

                  {/* Twitter / X */}
                  {(artist.twitterHandle || artist.twitterUrl) && (
                    <a
                      href={artist.twitterUrl || `https://x.com/${(artist.twitterHandle || '').replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-black border border-white/20 hover:border-white/40 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <span className="text-sm leading-none">𝕏</span>
                      <span>{artist.twitterHandle?.startsWith('@') ? artist.twitterHandle : `@${artist.twitterHandle || artist.stageName.toLowerCase().replace(/\s+/g, '_')}`}</span>
                    </a>
                  )}

                  {/* Instagram */}
                  {(artist.instagramHandle || artist.instagramUrl) && (
                    <a
                      href={artist.instagramUrl || `https://instagram.com/${(artist.instagramHandle || '').replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-pink-500/30 hover:border-pink-400 text-xs font-mono font-bold text-pink-200 flex items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <span>📸</span>
                      <span>{artist.instagramHandle?.startsWith('@') ? artist.instagramHandle : `@${artist.instagramHandle || artist.stageName.toLowerCase().replace(/\s+/g, '_')}`}</span>
                    </a>
                  )}

                  {/* TikTok */}
                  {(artist.tiktokHandle || artist.tiktokUrl) && (
                    <a
                      href={artist.tiktokUrl || `https://tiktok.com/@${(artist.tiktokHandle || '').replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-[#000] border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono font-bold text-cyan-200 flex items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <span>🎵</span>
                      <span>TikTok</span>
                    </a>
                  )}

                  {/* YouTube */}
                  {artist.youtubeUrl && (
                    <a
                      href={artist.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-red-950/60 border border-red-500/30 hover:border-red-400 text-xs font-mono font-bold text-red-200 flex items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <span>▶️</span>
                      <span>YouTube</span>
                    </a>
                  )}
                </div>

                {/* Support Artist Callout in Bio */}
                <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent p-3.5 rounded-xl border border-yellow-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-300 flex items-center justify-center shrink-0 border border-yellow-400/30">
                      <HeartHandshake className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Vle bay {artist.stageName} yon kout men?</p>
                      <p className="text-[11px] text-slate-300">Sipòte atis la dirèkteman ak MonCash, Natcash oswa Zelle.</p>
                    </div>
                  </div>
                  <button
                    id="btn-bio-support-artist"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetSong: MusicItem = artistSongs[0] || {
                        id: `artist_direct_${artist.id}`,
                        title: `Sipò Dirèk Atis (${artist.stageName})`,
                        artistId: artist.id,
                        artistName: artist.stageName,
                        coverUrl: artist.avatarUrl || artist.headerBannerUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
                        audioUrl: '',
                        category: 'Vokal',
                        listens: artist.totalListens || 0,
                        likes: 0,
                        isExclusive: false,
                        lyrics: ''
                      };
                      onOpenSupport(targetSong);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-yellow-950/40 transition-all active:scale-95 shrink-0"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Sipòte {artist.stageName}</span>
                  </button>
                </div>
              </div>

              {/* Quick sample tracks section preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Dènye Moso Mizik Yo
                  </h4>
                  <button
                    onClick={() => setActiveProfileTab('songs')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Wè tout ({artistSongs.length}) →
                  </button>
                </div>

                <div className="space-y-2">
                  {artistSongs.slice(0, 3).map((song) => {
                    const isThisPlaying = currentPlayingId === song.id && isPlaying;
                    const isCollab = song.collab?.artistId === artist.id;
                    const hasCollab = Boolean(song.collab && song.artistId === artist.id);

                    return (
                      <div
                        key={song.id}
                        className="bg-[#05070a]/80 border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-2.5 flex items-center justify-between gap-3 transition-all backdrop-blur-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/[0.1] bg-black">
                            <img
                              src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                              }}
                            />
                            <button
                              onClick={() => onPlayToggle(song)}
                              className={`absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                                isThisPlaying ? 'bg-red-600 text-white' : 'bg-black/70 text-yellow-400'
                              }`}
                            >
                              {isThisPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                            </button>
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="font-bold text-xs text-white truncate">{song.title}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                              <span className="text-yellow-400">{song.category}</span>
                              {song.releaseFormat && song.releaseFormat !== 'single' && (
                                <span className="text-amber-300 bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-500/30 font-semibold flex items-center gap-1">
                                  <span>{song.releaseFormat === 'album' ? '💿' : song.releaseFormat === 'ep' ? '💽' : song.releaseFormat === 'mixtape' ? '📼' : '🎙️'}</span>
                                  <span className="truncate max-w-[120px]">{song.albumName || song.releaseFormat.toUpperCase()}</span>
                                  {typeof song.trackNumber === 'number' && song.trackNumber > 0 && <span>#{song.trackNumber}</span>}
                                </span>
                              )}
                              <span>•</span>
                              <span>{song.listens.toLocaleString()} koute</span>

                              {/* Cross-Link Pill */}
                              {hasCollab && song.collab && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenArtistProfile) onOpenArtistProfile(song.collab!.artistId);
                                  }}
                                  className="text-purple-300 hover:text-purple-200 bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-500/30 flex items-center gap-1 font-semibold hover:underline"
                                >
                                  <Users className="w-2.5 h-2.5" />
                                  <span>ft. {song.collab.artistName}</span>
                                </button>
                              )}

                              {isCollab && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenArtistProfile) onOpenArtistProfile(song.artistId);
                                  }}
                                  className="text-amber-300 hover:text-amber-200 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-1 font-semibold hover:underline"
                                >
                                  <Users className="w-2.5 h-2.5" />
                                  <span>Kolab ak {song.artistName}</span>
                                </button>
                              )}

                              {/* Credits Button (No Percentages Shown to Public) */}
                              {song.credits && song.credits.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingCreditsSong(song);
                                  }}
                                  className="text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/30 flex items-center gap-1 font-semibold hover:underline"
                                  title="Wè lis moun ki patisipe ak wòl yo (san pousantaj)"
                                >
                                  <span>📜</span>
                                  <span>Kredi ({song.credits.length})</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSupport(song);
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-yellow-500 text-slate-950 hover:bg-yellow-400 shrink-0 flex items-center gap-1 transition-all active:scale-95"
                          title={`Sipòte moso "${song.title}"`}
                        >
                          <HeartHandshake className="w-3 h-3" />
                          <span>Sipòte</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL SONGS LIST */}
          {activeProfileTab === 'songs' && (
            <div className="animate-fadeIn space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-red-500" />
                  <span>Katalòg Mizik ({artistSongs.length})</span>
                </h3>

                {/* Sub-filter tabs */}
                <div className="flex items-center bg-black/40 border border-white/[0.08] p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setSongCatalogFilter('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      songCatalogFilter === 'all'
                        ? 'bg-white/[0.15] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tout ({artistSongs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSongCatalogFilter('primary')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      songCatalogFilter === 'primary'
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Moso Prensipal ({primarySongs.length})
                  </button>
                  {collabSongs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSongCatalogFilter('collabs')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        songCatalogFilter === 'collabs'
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🤝 Kolaborasyon ({collabSongs.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {displayedSongs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                    Pa gen moso mizik nan kategori sa.
                  </div>
                ) : (
                  displayedSongs.map((song) => {
                    const isThisPlaying = currentPlayingId === song.id && isPlaying;
                    const isCollab = song.collab?.artistId === artist.id;
                    const hasCollab = Boolean(song.collab && song.artistId === artist.id);

                    return (
                      <div
                        key={song.id}
                        className="bg-[#05070a]/80 border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-3 flex items-center justify-between gap-3 transition-all backdrop-blur-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/[0.1] bg-black">
                            <img
                              src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                              }}
                            />
                            <button
                              onClick={() => onPlayToggle(song)}
                              className={`absolute inset-0 m-auto w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                                isThisPlaying ? 'bg-red-600 text-white shadow-red-600/40' : 'bg-black/70 text-yellow-400'
                              }`}
                            >
                              {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                            </button>
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h4 className="font-bold text-sm text-white truncate">{song.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                              <span className="text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                {song.category}
                              </span>
                              {song.releaseFormat && song.releaseFormat !== 'single' && (
                                <span className="text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <span>{song.releaseFormat === 'album' ? '💿' : song.releaseFormat === 'ep' ? '💽' : song.releaseFormat === 'mixtape' ? '📼' : '🎙️'}</span>
                                  <span className="truncate max-w-[150px]">{song.albumName || song.releaseFormat.toUpperCase()}</span>
                                  {typeof song.trackNumber === 'number' && song.trackNumber > 0 && <span>#{song.trackNumber}</span>}
                                </span>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3 text-blue-400" /> {song.listens.toLocaleString()}
                              </span>

                              {/* Cross-Link Badges */}
                              {hasCollab && song.collab && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenArtistProfile) onOpenArtistProfile(song.collab!.artistId);
                                  }}
                                  className="text-purple-300 hover:text-purple-200 bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-500/30 flex items-center gap-1 text-[11px] font-semibold hover:underline"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>ft. {song.collab.artistName} ({song.collab.role || 'Featuring'})</span>
                                </button>
                              )}

                              {isCollab && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenArtistProfile) onOpenArtistProfile(song.artistId);
                                  }}
                                  className="text-amber-300 hover:text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 text-[11px] font-semibold hover:underline"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>Kolaborasyon ak {song.artistName}</span>
                                </button>
                              )}

                              {/* Credits Button (No Percentages Shown to Public) */}
                              {song.credits && song.credits.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingCreditsSong(song);
                                  }}
                                  className="text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-500/30 flex items-center gap-1 text-[11px] font-semibold hover:underline"
                                  title="Wè lis moun ki patisipe ak wòl yo (san pousantaj)"
                                >
                                  <span>📜</span>
                                  <span>Kredi ({song.credits.length})</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSupport(song);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 hover:from-yellow-400 shrink-0 flex items-center gap-1.5 shadow-lg shadow-yellow-950/30 transition-all active:scale-95"
                          title={`Sipòte moso "${song.title}"`}
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Sipòte</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Safe Public Song Credits Modal (No Percentages) */}
      {viewingCreditsSong && (
        <SongCreditsModal
          song={viewingCreditsSong}
          showPercentages={false}
          onClose={() => setViewingCreditsSong(null)}
          onSelectArtist={(targetArtistId) => {
            setViewingCreditsSong(null);
            if (onOpenArtistProfile) onOpenArtistProfile(targetArtistId);
          }}
        />
      )}
    </div>
  );
};

