import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  Share2,
  Heart,
  MessageCircle,
  Repeat2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Play,
  Pause,
  Music,
  Send,
  Image as ImageIcon,
  UploadCloud,
  Upload,
  Trash2,
  Loader2,
  RefreshCw,
  Layers,
  HeartHandshake,
  TrendingUp,
  Clock,
  Hourglass
} from 'lucide-react';
import { SocialPost, ArtistUser, MusicItem, SocialPostComment } from '../types';
import { StorageService } from '../utils/storage';
import { compressAndReadFile } from '../utils/imageUtils';
import { validateRestrictedDigits, hasRestrictedPhoneOrDigits, RESTRICTED_DIGITS_ERROR_MESSAGE } from '../utils/textValidation';
import { ArtistBadge } from './ArtistBadge';
import { getArtistBadgeInfo, calculateArtistTotalDonations } from '../utils/badgeSystem';
import { SocialCommentModal } from './SocialCommentModal';
import { SocialPostShareModal } from './SocialPostShareModal';
import { HostingerService } from '../utils/hostingerService';

interface UpMizikSocialProps {
  posts: SocialPost[];
  artists: ArtistUser[];
  musicList: MusicItem[];
  currentArtist: ArtistUser | null;
  currentPlayingId: string | null;
  isPlaying: boolean;
  isAdmin?: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile: (artistId: string) => void;
  onShare: (music: MusicItem) => void;
  onNewPostAdded?: (newPost: SocialPost) => void;
  onDeletePost?: (postId: string) => void;
}

export const UpMizikSocial: React.FC<UpMizikSocialProps> = ({
  posts,
  artists,
  musicList,
  currentArtist,
  currentPlayingId,
  isPlaying,
  isAdmin = false,
  onPlayToggle,
  onOpenSupport,
  onOpenArtistProfile,
  onShare,
  onNewPostAdded,
  onDeletePost
}) => {
  // Filters State
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'twitter' | 'instagram'>('all');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [likedPosts, setLikedPosts] = useState<string[]>(() => StorageService.getLikedPostIds());
  const [activeTab, setActiveTab] = useState<'feed' | 'compose'>('feed');

  // Modals for post comments and sharing
  const [commentingPost, setCommentingPost] = useState<SocialPost | null>(null);
  const [sharingPost, setSharingPost] = useState<SocialPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<SocialPost | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Helper for 30-day post lifespan
  const getPostRemainingLifespan = (post: SocialPost) => {
    try {
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const expireTime = post.expiresAt
        ? new Date(post.expiresAt).getTime()
        : post.createdAt
        ? new Date(post.createdAt).getTime() + THIRTY_DAYS_MS
        : Date.now() + THIRTY_DAYS_MS;

      const diffMs = expireTime - Date.now();
      if (diffMs <= 0) return { label: 'Ap ekspire jodi a', isUrgent: true, days: 0 };

      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

      if (days > 0) {
        return {
          label: `Rete ${days}j`,
          fullLabel: `Piblikasyon sa ap disponib pou ${days} jou ankò (sik 30 jou)`,
          isUrgent: days <= 3,
          days
        };
      } else {
        return {
          label: `Rete ${hours}è`,
          fullLabel: `Piblikasyon sa ap fini nan ${hours} èdtan (sik 30 jou)`,
          isUrgent: true,
          days: 0
        };
      }
    } catch {
      return { label: '30j', fullLabel: 'Valab pou 30 jou', isUrgent: false, days: 30 };
    }
  };

  // Automatically scroll to top when switching between feed and compose
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // New Post Compose Form State (for logged-in artists)
  const [composePlatform, setComposePlatform] = useState<'twitter' | 'instagram'>('twitter');
  const [composeContent, setComposeContent] = useState<string>('');
  const [composeImageUrl, setComposeImageUrl] = useState<string>('');
  const [composeSelectedSongId, setComposeSelectedSongId] = useState<string>('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct image file processing
  const handleImageFileSelect = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Tanpri chwazi yon fichye foto ki valid (JPG, PNG, WebP).');
      return;
    }
    setIsUploadingImage(true);
    try {
      const base64Data = await compressAndReadFile(file, 900, 900, 0.82);
      setComposeImageUrl(base64Data);
    } catch (err) {
      console.error('Erè pandan tretman foto a:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Filter posts logic with strict ID deduplication
  const filteredPosts = useMemo(() => {
    const seenIds = new Set<string>();
    const uniquePosts = posts.filter(p => {
      if (!p || !p.id || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    return uniquePosts.filter(post => {
      // Platform filter
      if (selectedPlatform !== 'all' && post.platform !== selectedPlatform) {
        return false;
      }
      // Artist filter
      if (selectedArtistId !== 'all' && post.artistId !== selectedArtistId) {
        return false;
      }
      // Text or hashtag search
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase().trim();
        const inContent = post.content.toLowerCase().includes(query);
        const inName = post.stageName.toLowerCase().includes(query);
        const inHandle = post.handle.toLowerCase().includes(query);
        const inTags = post.tags?.some(t => t.toLowerCase().includes(query));
        const inSong = post.associatedSongTitle?.toLowerCase().includes(query);
        if (!inContent && !inName && !inHandle && !inTags && !inSong) {
          return false;
        }
      }
      return true;
    });
  }, [posts, selectedPlatform, selectedArtistId, searchFilter]);

  // Handle Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  // Handle Like
  const handleToggleLike = (postId: string) => {
    const res = StorageService.likeSocialPost(postId);
    if (res.isLiked) {
      setLikedPosts(prev => [...prev, postId]);
    } else {
      setLikedPosts(prev => prev.filter(id => id !== postId));
    }
  };

  // Handle Compose Submit
  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError(null);
    if (!currentArtist || !composeContent.trim()) return;

    // Strict validation: No phone numbers or 5+ consecutive digits
    const validation = validateRestrictedDigits(composeContent, 'tèks piblikasyon an');
    if (!validation.isValid) {
      setComposeError(validation.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    const handle = composePlatform === 'twitter'
      ? (currentArtist.twitterHandle ? (currentArtist.twitterHandle.startsWith('@') ? currentArtist.twitterHandle : `@${currentArtist.twitterHandle}`) : `@${currentArtist.stageName.toLowerCase().replace(/\s+/g, '_')}`)
      : (currentArtist.instagramHandle ? (currentArtist.instagramHandle.startsWith('@') ? currentArtist.instagramHandle : `@${currentArtist.instagramHandle}`) : `@${currentArtist.stageName.toLowerCase().replace(/\s+/g, '_')}`);

    const postUrl = composePlatform === 'twitter'
      ? (currentArtist.twitterUrl || `https://x.com/${handle.replace('@', '')}`)
      : (currentArtist.instagramUrl || `https://instagram.com/${handle.replace('@', '')}`);

    const associatedSong = musicList.find(m => m.id === composeSelectedSongId);

    // Extract hashtags from content
    const hashtagMatches = composeContent.match(/#[a-zA-Z0-9_]+/g) || ['#UpMizik', '#AyitiMizik'];

    const newPost = StorageService.addSocialPost({
      artistId: currentArtist.id,
      artistName: currentArtist.name,
      stageName: currentArtist.stageName,
      artistAvatar: currentArtist.avatarUrl,
      platform: composePlatform,
      handle,
      postUrl,
      content: composeContent.trim(),
      imageUrl: composeImageUrl.trim() || (associatedSong ? associatedSong.coverUrl : undefined),
      associatedSongId: associatedSong?.id,
      associatedSongTitle: associatedSong?.title,
      tags: hashtagMatches
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setComposeContent('');
      setComposeImageUrl('');
      setComposeSelectedSongId('');
      setActiveTab('feed');
      if (onNewPostAdded) onNewPostAdded(newPost);
    }, 400);
  };

  // Songs by logged-in artist for composer attachment
  const currentArtistSongs = useMemo(() => {
    if (!currentArtist) return [];
    return musicList.filter(m => m.artistId === currentArtist.id || m.artistName === currentArtist.stageName);
  }, [currentArtist, musicList]);

  return (
    <section id="upmizik-social-section" className="w-full">
      {/* Section Header */}
      <div className="bg-gradient-to-b from-[#0e172a]/95 to-[#070b14]/95 border border-white/[0.1] rounded-3xl p-5 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-blue-500 via-pink-500 to-yellow-400 opacity-80" />

        <div className="relative z-10">
          
          {/* Top Banner Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-950/60 shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight font-['Cabinet_Grotesk',sans-serif]">
                    UpMizik <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-pink-400 to-yellow-400">Social</span>
                  </h2>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    Fil Aktyalite Atis yo
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  Swiv dènye piblikasyon X (Twitter) ak Instagram atis ayisyen yo an dirèk gras ak kontak rezo ki nan pwofil yo.
                </p>
              </div>
            </div>

            {/* Quick Actions / Refresh / Compose Tab */}
            <div className="flex items-center gap-2.5 self-start md:self-auto">
              {currentArtist && (
                <button
                  id="social-compose-toggle-btn"
                  onClick={() => setActiveTab(activeTab === 'feed' ? 'compose' : 'feed')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-md ${
                    activeTab === 'compose'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/40 shadow-blue-900/40'
                      : 'bg-[#121c33] text-slate-200 hover:text-white hover:bg-[#1a2849] border-white/10'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{activeTab === 'compose' ? 'Gade Fil la' : 'Pibliye yon Pòs'}</span>
                </button>
              )}

              <button
                id="social-refresh-btn"
                onClick={handleRefresh}
                title="Mete fil la a jou"
                className="p-2.5 rounded-xl bg-[#121c33] hover:bg-[#1a2849] text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Mete a Jou</span>
              </button>
            </div>
          </div>

          {/* ARTIST POST COMPOSER (When toggled by logged-in artist) */}
          {activeTab === 'compose' && currentArtist && (
            <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-[#080d1a] border border-blue-500/30 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <img
                    src={currentArtist.avatarUrl}
                    alt={currentArtist.stageName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-yellow-400"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Pibliye kòm {currentArtist.stageName}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {composePlatform === 'twitter'
                        ? (currentArtist.twitterHandle ? `@${currentArtist.twitterHandle.replace('@', '')}` : `@${currentArtist.stageName.toLowerCase().replace(/\s+/g, '_')}`)
                        : (currentArtist.instagramHandle ? `@${currentArtist.instagramHandle.replace('@', '')}` : `@${currentArtist.stageName.toLowerCase().replace(/\s+/g, '_')}`)}
                    </p>
                  </div>
                </div>

                {/* Platform Selector Switch */}
                <div className="flex items-center bg-[#05070a] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setComposePlatform('twitter')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      composePlatform === 'twitter'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>𝕏</span>
                    <span>Twitter / X</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposePlatform('instagram')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      composePlatform === 'instagram'
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>📸</span>
                    <span>Instagram</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handlePublishPost} className="space-y-4">
                <div>
                  <textarea
                    id="social-compose-textarea"
                    rows={3}
                    value={composeContent ?? ''}
                    onChange={(e) => {
                      setComposeContent(e.target.value);
                      if (composeError) setComposeError(null);
                    }}
                    placeholder={`Kisa ki genyen nouvo pou fanatik ou yo jodi a? Pataje mizajou sou sesyon studio, konsè, oubyen remèsye donatè yo...`}
                    className={`w-full bg-[#05070a] border text-white text-sm rounded-xl p-3.5 outline-none resize-none placeholder:text-slate-500 transition-all ${
                      composeError || hasRestrictedPhoneOrDigits(composeContent)
                        ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/30 bg-red-950/20'
                        : 'border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    maxLength={380}
                  />

                  {/* Warning / Error Alert for Phone or 5+ consecutive digits */}
                  {(composeError || hasRestrictedPhoneOrDigits(composeContent)) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                      <span className="shrink-0 text-base leading-none">⚠️</span>
                      <p className="flex-1 font-medium">
                        {composeError || RESTRICTED_DIGITS_ERROR_MESSAGE}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400">Ajoute rapid:</span>
                      {['#UpMizik', '#KompaNouvo', '#AyitiMizik', '#NouvoTrack', '#HaitiVibes'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setComposeContent(prev => prev ? `${prev} ${tag}` : tag)}
                          className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-blue-500/20 hover:text-blue-300 text-slate-400 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <span>{composeContent.length} / 380</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Attach Song from Catalog */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Kole yon Moso Mizik (Opsyonèl)</span>
                    </label>
                    <select
                      id="social-compose-song-select"
                      value={composeSelectedSongId ?? ''}
                      onChange={(e) => setComposeSelectedSongId(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                    >
                      <option value="">-- Pa gen moso mizik atache --</option>
                      {currentArtistSongs.map((song) => (
                        <option key={song.id} value={song.id}>
                          🎵 {song.title} ({song.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direct Image Upload Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                        <span>Foto Piblikasyon (Opsyonèl)</span>
                      </span>
                      {composeImageUrl && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Foto pare
                        </span>
                      )}
                    </label>

                    {/* Hidden Native File Input */}
                    <input
                      ref={fileInputRef}
                      id="social-compose-image-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileSelect(file);
                      }}
                    />

                    {composeImageUrl ? (
                      /* Preview of Uploaded Image with Change & Delete Actions */
                      <div className="relative bg-[#05070a] border border-pink-500/30 rounded-2xl p-2 flex items-center gap-3">
                        <img
                          src={composeImageUrl}
                          alt="Foto Piblikasyon"
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-white/10 shadow-md shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>📸 Foto chwazi</span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Foto sa pral parèt nan piblikasyon an sou fil aktyalite a.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Chanje Foto</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setComposeImageUrl('');
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-all flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Retire</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop or Click to Upload Area */
                      <div
                        id="social-image-dropzone"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingImage(true);
                        }}
                        onDragLeave={() => setIsDraggingImage(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingImage(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleImageFileSelect(file);
                        }}
                        className={`w-full py-3.5 px-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-center gap-3 text-center ${
                          isDraggingImage
                            ? 'bg-pink-500/10 border-pink-400 scale-[1.01]'
                            : 'bg-[#05070a] border-white/15 hover:border-pink-400/60 hover:bg-pink-950/10'
                        }`}
                      >
                        {isUploadingImage ? (
                          <div className="flex items-center gap-2 text-xs text-pink-300 font-semibold py-1">
                            <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                            <span>Foto a ap prepare...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 text-left">
                            <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/25 text-pink-400 flex items-center justify-center shrink-0">
                              <UploadCloud className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">
                                Klike oswa glise yon foto isit la
                              </p>
                              <p className="text-[10px] text-slate-400">
                                PNG, JPG, WebP (Studio, konsè, afich...)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('feed')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Anile
                  </button>
                  <button
                    id="social-submit-publish-btn"
                    type="submit"
                    disabled={!composeContent.trim() || isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 text-white hover:brightness-110 shadow-lg shadow-indigo-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Piblikasyon ap fèt...' : 'Pibliye sou UpMizik Social'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Interactive Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pt-2 pb-1 border-t border-white/[0.08]">
            
            {/* Platform Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              <button
                id="social-filter-all"
                onClick={() => setSelectedPlatform('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedPlatform === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-400/30'
                    : 'bg-[#0d1424] text-slate-300 hover:text-white hover:bg-[#131d33] border border-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tout Rezo ({posts.length})</span>
              </button>

              <button
                id="social-filter-twitter"
                onClick={() => setSelectedPlatform('twitter')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedPlatform === 'twitter'
                    ? 'bg-black text-white shadow-md border border-white/30'
                    : 'bg-[#0d1424] text-slate-300 hover:text-white hover:bg-[#131d33] border border-white/10'
                }`}
              >
                <span className="font-mono text-sm leading-none">𝕏</span>
                <span>Twitter / X ({posts.filter(p => p.platform === 'twitter').length})</span>
              </button>

              <button
                id="social-filter-instagram"
                onClick={() => setSelectedPlatform('instagram')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedPlatform === 'instagram'
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-md border border-pink-400/40'
                    : 'bg-[#0d1424] text-slate-300 hover:text-white hover:bg-[#131d33] border border-white/10'
                }`}
              >
                <span>📸</span>
                <span>Instagram ({posts.filter(p => p.platform === 'instagram').length})</span>
              </button>
            </div>

            {/* Right Side: Artist Dropdown & Keyword Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Filter by Artist */}
              <div className="relative min-w-[170px]">
                <select
                  id="social-artist-filter-select"
                  value={selectedArtistId ?? 'all'}
                  onChange={(e) => setSelectedArtistId(e.target.value)}
                  className="w-full bg-[#0d1424] border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 hover:border-white/20 transition-colors"
                >
                  <option value="all">Tout Atis yo</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.stageName} ({artist.city.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hashtag / Text Search input */}
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  id="social-search-input"
                  type="text"
                  value={searchFilter ?? ''}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Chèche #hashtag oswa tèks..."
                  className="w-full bg-[#0d1424] border border-white/10 focus:border-blue-500 text-slate-200 text-xs rounded-xl pl-9 pr-7 py-2 outline-none placeholder:text-slate-500"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Social Posts Stream Grid */}
      <div className="mt-6">
        {filteredPosts.length === 0 ? (
          <div className="bg-[#0a0f1d]/60 border border-white/[0.08] rounded-3xl p-12 text-center backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Filter className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Pa gen okenn piblikasyon ki koresponn</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Eseye chanje filtè rezo a, chwazi yon lòt atis, oubyen efase rechèch ou a.
            </p>
            <button
              onClick={() => {
                setSelectedPlatform('all');
                setSelectedArtistId('all');
                setSearchFilter('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-md"
            >
              Re-inisyalize tout filtè yo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {filteredPosts.map((post) => {
              const matchedArtist = artists.find(a => a.id === post.artistId || a.stageName.toLowerCase() === post.stageName.toLowerCase());
              const totalDonations = matchedArtist ? calculateArtistTotalDonations(matchedArtist, musicList) : 0;
              const badgeInfo = matchedArtist ? getArtistBadgeInfo(matchedArtist, musicList) : null;
              const isLiked = likedPosts.includes(post.id);
              
              // Find associated song if any
              const associatedSong = post.associatedSongId
                ? musicList.find(m => m.id === post.associatedSongId)
                : (post.associatedSongTitle ? musicList.find(m => m.title.toLowerCase() === post.associatedSongTitle?.toLowerCase()) : null);

              const isThisSongPlaying = associatedSong && currentPlayingId === associatedSong.id && isPlaying;

              return (
                <article
                  key={post.id}
                  id={`post-${post.id}`}
                  className="bg-[#090e1a]/85 border border-white/[0.09] hover:border-white/[0.18] rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl transition-all duration-200 flex flex-col justify-between group hover:shadow-2xl relative overflow-hidden"
                >
                  {/* Subtle Platform Tint Glow on Card Corner */}
                  {post.platform === 'instagram' ? (
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-pink-500/20 transition-all" />
                  ) : (
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />
                  )}

                  <div>
                    {/* Post Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      
                      {/* Artist Identity & Avatar */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={() => onOpenArtistProfile(post.artistId)}
                          className="relative w-12 h-12 rounded-2xl overflow-hidden cursor-pointer border-2 border-white/10 hover:border-yellow-400 transition-colors shrink-0 bg-black group/avatar"
                          title={`Gade pwofil ${post.stageName}`}
                        >
                          <img
                            src={post.artistAvatar}
                            alt={post.stageName}
                            className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-200"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => onOpenArtistProfile(post.artistId)}
                              className="font-bold text-sm sm:text-base text-white hover:text-yellow-400 transition-colors truncate text-left"
                            >
                              {post.stageName}
                            </button>
                            <span className="p-0.5 rounded-full bg-blue-500 text-white shadow-sm" title="Atis Verifye">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                            {badgeInfo && (
                              <ArtistBadge badge={badgeInfo} donations={totalDonations} size="sm" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                            <span className="font-mono text-slate-300">{post.handle}</span>
                            <span>•</span>
                            <span className="text-slate-400 text-[11px]">{post.timestamp}</span>
                            <span>•</span>
                            {(() => {
                              const lifespan = getPostRemainingLifespan(post);
                              return (
                                <span
                                  title={lifespan.fullLabel}
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                    lifespan.isUrgent
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                                      : 'bg-white/5 text-slate-300 border-white/10'
                                  }`}
                                >
                                  <Clock className="w-2.5 h-2.5 text-yellow-400" />
                                  <span>{lifespan.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Platform Icon Badge, Direct Link & Admin Delete Action */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {/* Admin or Author Delete Button */}
                        {(isAdmin || (currentArtist && currentArtist.id === post.artistId)) && (
                          <button
                            type="button"
                            onClick={() => setPostToDelete(post)}
                            title={isAdmin ? "Siprime pòs sa a (Aksyon Administratè)" : "Siprime pòs sa a"}
                            className="p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border-red-500/25 shrink-0 group/del shadow-sm active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px] font-semibold">Siprime</span>
                          </button>
                        )}

                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Gade sou ${post.platform === 'twitter' ? 'X (Twitter)' : 'Instagram'}`}
                          className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                            post.platform === 'twitter'
                              ? 'bg-black text-white hover:bg-slate-900 border-white/20'
                              : 'bg-gradient-to-r from-purple-900/60 to-pink-900/60 hover:from-purple-800/80 hover:to-pink-800/80 text-pink-200 border-pink-500/30'
                          }`}
                        >
                          {post.platform === 'twitter' ? (
                            <span className="font-mono text-xs font-bold">𝕏</span>
                          ) : (
                            <span className="text-xs">📸</span>
                          )}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>

                    </div>

                    {/* Post Content Text */}
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4 whitespace-pre-line font-normal">
                      {/* Highlight hashtags as interactive search triggers */}
                      {post.content.split(/(\s+)/).map((word, wIdx) => {
                        if (word.startsWith('#')) {
                          return (
                            <span
                              key={wIdx}
                              onClick={() => setSearchFilter(word)}
                              className="text-blue-400 hover:text-blue-300 cursor-pointer font-semibold underline-offset-2 hover:underline transition-colors"
                            >
                              {word}
                            </span>
                          );
                        } else if (word.startsWith('@')) {
                          return (
                            <span
                              key={wIdx}
                              className="text-pink-400 font-semibold cursor-pointer hover:underline"
                            >
                              {word}
                            </span>
                          );
                        }
                        return word;
                      })}
                    </div>

                    {/* Optional Media Image Preview */}
                    {post.imageUrl && (
                      <div className="relative rounded-2xl overflow-hidden mb-4 border border-white/[0.08] bg-black max-h-72 group/img">
                        <img
                          src={post.imageUrl}
                          alt="Post media"
                          className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Attached Interactive Music Player Snippet (if post links a track) */}
                    {associatedSong && (
                      <div className="mb-4 p-3 rounded-2xl bg-[#050912]/90 border border-yellow-500/20 flex items-center justify-between gap-3 shadow-inner">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black">
                            <img
                              src={associatedSong.coverUrl}
                              alt={associatedSong.title}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => onPlayToggle(associatedSong)}
                              className={`absolute inset-0 m-auto w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ${
                                isThisSongPlaying
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : 'bg-black/80 text-yellow-400 hover:bg-black'
                              }`}
                            >
                              {isThisSongPlaying ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              )}
                            </button>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                                {associatedSong.category}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate">Moso Atache</span>
                            </div>
                            <h5 className="font-bold text-xs sm:text-sm text-white truncate mt-0.5">
                              {associatedSong.title}
                            </h5>
                          </div>
                        </div>

                        {/* Direct Support CTA for Attached Track */}
                        <button
                          onClick={() => onOpenSupport(associatedSong)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 hover:from-yellow-400 shrink-0 flex items-center gap-1 shadow-md shadow-yellow-950/40 transition-all active:scale-95"
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Sipòte</span>
                        </button>
                      </div>
                    )}

                  </div>

                  {/* Post Footer Actions */}
                  <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2 flex-wrap">
                    
                    {/* Left Actions: Like, Interactive Comment Button, Interactive Share Button */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      
                      {/* Like Heart Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                          isLiked
                            ? 'text-red-400 bg-red-500/10'
                            : 'text-slate-400 hover:text-red-400 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : ''} transition-transform`} />
                        <span>{post.likes + (isLiked ? 1 : 0)}</span>
                      </button>

                      {/* Interactive Comments Modal Trigger */}
                      <button
                        type="button"
                        id={`open-comment-post-btn-${post.id}`}
                        onClick={() => setCommentingPost(post)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer group/comment"
                        title="Kite yon kòmantè sou piblikasyon sa a"
                      >
                        <MessageCircle className="w-4 h-4 text-slate-400 group-hover/comment:text-blue-400 transition-colors" />
                        <span>{post.commentsCount || 0}</span>
                        <span className="hidden sm:inline text-[11px] font-normal text-slate-500 group-hover/comment:text-blue-300">kòmantè</span>
                      </button>

                      {/* Interactive Share Modal Trigger */}
                      <button
                        type="button"
                        id={`open-share-post-btn-${post.id}`}
                        onClick={() => setSharingPost(post)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 transition-all cursor-pointer group/share"
                        title="Pataje lyen piblikasyon sa a sou WhatsApp, Facebook, X..."
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover/share:text-pink-400 transition-colors" />
                        <span>{post.sharesCount || 0}</span>
                        <span className="hidden sm:inline text-[11px] font-normal text-slate-500 group-hover/share:text-pink-300">pataj</span>
                      </button>

                      {/* Retweets info if twitter */}
                      {post.platform === 'twitter' && (
                        <button
                          type="button"
                          onClick={() => setSharingPost(post)}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-green-400 hover:bg-green-500/10 px-2 py-1 rounded-lg transition-colors"
                          title="Reposte piblikasyon an"
                        >
                          <Repeat2 className="w-3.5 h-3.5 text-green-400" />
                          <span>{post.retweetsCount || 12}</span>
                        </button>
                      )}

                    </div>

                    {/* Right Action: Visit Official Profile or Direct Support */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-slate-400 hover:text-yellow-400 transition-colors flex items-center gap-1 px-2 py-1"
                      >
                        <span>Louvri sou {post.platform === 'twitter' ? '𝕏' : 'IG'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                  </div>

                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Social Post Comment Modal */}
      <SocialCommentModal
        isOpen={!!commentingPost}
        post={commentingPost}
        onClose={() => setCommentingPost(null)}
        onCommentAdded={(newComment, updatedPostId) => {
          if (onNewPostAdded && commentingPost) {
            // Trigger refresh via parent or update
            const updatedPosts = StorageService.getSocialPosts();
            const found = updatedPosts.find(p => p.id === updatedPostId);
            if (found && onNewPostAdded) onNewPostAdded(found);
          }
        }}
      />

      {/* Social Post Share Modal */}
      <SocialPostShareModal
        isOpen={!!sharingPost}
        post={sharingPost}
        onClose={() => setSharingPost(null)}
        onPostShared={(pId, newShares) => {
          if (onNewPostAdded && sharingPost) {
            const updatedPosts = StorageService.getSocialPosts();
            const found = updatedPosts.find(p => p.id === pId);
            if (found && onNewPostAdded) onNewPostAdded(found);
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1120] border border-red-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Siprime Pòs Sa a?</h3>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? 'Kòm Administratè, ou gen otorite pou siprime piblikasyon sa a imedyatman sou UpMizik Social menm si limit 30 jou a poko rive.'
                  : 'Èske w sèten ou vle siprime piblikasyon sa a sou kont ou?'}
              </p>
            </div>

            {/* Post Summary Preview */}
            <div className="p-3.5 bg-black/40 border border-white/[0.08] rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>{postToDelete.stageName}</span>
                <span className="text-[10px] text-slate-500 font-mono font-normal">{postToDelete.handle}</span>
              </div>
              <p className="text-slate-400 text-xs line-clamp-2 italic">
                "{postToDelete.content}"
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-colors border border-white/10"
              >
                Anile
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!postToDelete) return;
                  setIsDeleting(true);
                  try {
                    const actor = isAdmin ? 'Administratè' : (currentArtist?.stageName || 'Atis');
                    StorageService.deleteSocialPost(postToDelete.id, actor);
                    await HostingerService.deleteSinglePost(postToDelete.id).catch(() => {});
                    if (onDeletePost) {
                      onDeletePost(postToDelete.id);
                    }
                    setPostToDelete(null);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Ap siprime...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Wi, Siprime Pòs la</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
