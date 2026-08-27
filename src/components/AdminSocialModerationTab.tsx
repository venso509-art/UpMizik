import React, { useState, useMemo } from 'react';
import {
  Share2,
  Trash2,
  Search,
  ExternalLink,
  Clock,
  Heart,
  MessageCircle,
  Repeat2,
  Music,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { SocialPost, MusicItem, ArtistUser, AdminUser } from '../types';
import { StorageService } from '../utils/storage';
import { HostingerService } from '../utils/hostingerService';

interface AdminSocialModerationTabProps {
  currentAdmin: AdminUser;
  socialPosts?: SocialPost[];
  artists: ArtistUser[];
  musicList: MusicItem[];
  onPostDeleted?: (postId: string) => void;
}

export const AdminSocialModerationTab: React.FC<AdminSocialModerationTabProps> = ({
  currentAdmin,
  socialPosts,
  artists,
  musicList,
  onPostDeleted
}) => {
  const [platformFilter, setPlatformFilter] = useState<'all' | 'twitter' | 'instagram'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('all');
  const [localPosts, setLocalPosts] = useState<SocialPost[]>(() => StorageService.getSocialPosts());
  const [postToDelete, setPostToDelete] = useState<SocialPost | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sync or use effective list
  const effectivePosts = useMemo(() => {
    return socialPosts && socialPosts.length > 0 ? socialPosts : localPosts;
  }, [socialPosts, localPosts]);

  // Filtered posts for admin review
  const filteredPosts = useMemo(() => {
    return effectivePosts.filter((post) => {
      if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
      if (selectedArtistId !== 'all') {
        const matchesArtistId = post.artistId === selectedArtistId;
        const matchesName = artists.some(
          (a) => a.id === selectedArtistId && (a.stageName.toLowerCase() === post.stageName.toLowerCase() || a.name.toLowerCase() === post.artistName?.toLowerCase())
        );
        if (!matchesArtistId && !matchesName) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = (post.stageName || '').toLowerCase().includes(q) || (post.artistName || '').toLowerCase().includes(q);
        const inHandle = (post.handle || '').toLowerCase().includes(q);
        const inContent = (post.content || '').toLowerCase().includes(q);
        if (!inName && !inHandle && !inContent) return false;
      }
      return true;
    });
  }, [effectivePosts, platformFilter, selectedArtistId, searchQuery, artists]);

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      const adminName = currentAdmin?.name || 'Mr Clauvens (Admin)';
      StorageService.deleteSocialPost(postToDelete.id, adminName);
      await HostingerService.deleteSinglePost(postToDelete.id).catch(() => {});
      setLocalPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      if (onPostDeleted) {
        onPostDeleted(postToDelete.id);
      }
      setPostToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPostRemainingLifespan = (post: SocialPost) => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const expireTime = post.expiresAt
      ? new Date(post.expiresAt).getTime()
      : post.createdAt
      ? new Date(post.createdAt).getTime() + THIRTY_DAYS_MS
      : now + THIRTY_DAYS_MS;
    const diffHours = Math.max(0, Math.floor((expireTime - now) / (1000 * 60 * 60)));
    const diffDays = Math.floor(diffHours / 24);
    return {
      diffHours,
      diffDays,
      label: diffDays > 0 ? `${diffDays}j rete` : `${diffHours}h rete`
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-4 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-400" />
              <span>Moderasyon & Sipresyon Pòs Atis yo (UpMizik Social)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Kòm Administratè, ou gen kontwòl total sou tout piblikasyon atis yo. Ou ka siprime nenpòt pòs atis nenpòt kilè, menm anvan 30 jou yo rive.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold font-mono">
              {effectivePosts.length} Pòs Disponib
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Platform Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              id="admin-social-filter-all"
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                platformFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Tout ({effectivePosts.length})
            </button>
            <button
              id="admin-social-filter-twitter"
              type="button"
              onClick={() => setPlatformFilter('twitter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                platformFilter === 'twitter'
                  ? 'bg-black text-white border border-white/30 shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="font-mono">𝕏</span> Twitter ({effectivePosts.filter((p) => p.platform === 'twitter').length})
            </button>
            <button
              id="admin-social-filter-instagram"
              type="button"
              onClick={() => setPlatformFilter('instagram')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                platformFilter === 'instagram'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>📸</span> Instagram ({effectivePosts.filter((p) => p.platform === 'instagram').length})
            </button>
          </div>

          {/* Search Box & Artist Select */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              id="admin-social-artist-select"
              value={selectedArtistId ?? 'all'}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              className="bg-[#05070a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Tout Atis yo</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.stageName || a.name}
                </option>
              ))}
            </select>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-social-search-input"
                type="text"
                value={searchQuery ?? ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chèche #hashtag, tèks, atis..."
                className="w-full bg-[#05070a] border border-white/10 rounded-xl pl-9 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Posts for Moderation */}
      {filteredPosts.length === 0 ? (
        <div className="bg-[#0a0f1d]/60 border border-white/[0.08] rounded-3xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Filter className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Pa gen okenn piblikasyon ki koresponn</p>
          <p className="text-xs text-slate-400">
            {searchQuery || selectedArtistId !== 'all' || platformFilter !== 'all'
              ? 'Eseye retire kèk filtè oswa modifye rechèch ou a.'
              : 'Pa gen okenn pòs atis ki pibliye sou platfòm nan pou kounye a.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const lifespan = getPostRemainingLifespan(post);
            const associatedSong = post.associatedSongId
              ? musicList.find((m) => m.id === post.associatedSongId)
              : post.associatedSongTitle
              ? musicList.find((m) => m.title.toLowerCase() === post.associatedSongTitle?.toLowerCase())
              : null;

            return (
              <div
                key={post.id}
                id={`admin-post-card-${post.id}`}
                className="bg-[#0a0f1d]/90 border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all group backdrop-blur-xl shadow-lg relative overflow-hidden"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={post.artistAvatar}
                        alt={post.stageName}
                        className="w-10 h-10 rounded-2xl object-cover border border-white/10 bg-black shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{post.stageName}</h4>
                          <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{post.handle}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 ${
                        post.platform === 'twitter'
                          ? 'bg-black text-white border-white/20'
                          : 'bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-pink-200 border-pink-500/30'
                      }`}
                    >
                      {post.platform === 'twitter' ? '𝕏 Twitter' : '📸 Instagram'}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="text-xs text-slate-200 line-clamp-3 leading-relaxed whitespace-pre-line bg-black/40 p-3 rounded-2xl border border-white/[0.05]">
                    {post.content}
                  </div>

                  {/* Post Image Preview if any */}
                  {post.imageUrl && (
                    <div className="mt-3 rounded-2xl overflow-hidden max-h-40 bg-black border border-white/10 relative">
                      <img
                        src={post.imageUrl}
                        alt="Post media"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Attached Song Snippet if any */}
                  {associatedSong && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-yellow-500/20 flex items-center gap-2.5">
                      <img
                        src={associatedSong.coverUrl}
                        alt={associatedSong.title}
                        className="w-8 h-8 rounded-lg object-cover border border-white/10 bg-black shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-yellow-400 truncate">{associatedSong.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{associatedSong.artistName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Metrics & Actions */}
                <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1" title="Likes">
                        <Heart className="w-3 h-3 text-pink-400" />
                        <span>{post.likes || 0}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Kòmantè">
                        <MessageCircle className="w-3 h-3 text-blue-400" />
                        <span>{post.commentsCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Pataj">
                        <Repeat2 className="w-3 h-3 text-emerald-400" />
                        <span>{post.sharesCount || 0}</span>
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-amber-300 font-semibold">
                      <Clock className="w-2.5 h-2.5 text-yellow-400" />
                      <span>{lifespan.label}</span>
                    </span>
                  </div>

                  {/* Admin Action Buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-2 rounded-xl text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                      <span>Gade sou {post.platform === 'twitter' ? '𝕏' : 'IG'}</span>
                    </a>

                    <button
                      id={`admin-btn-delete-post-${post.id}`}
                      type="button"
                      onClick={() => setPostToDelete(post)}
                      className="py-2 px-3.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer"
                      title="Siprime pòs sa a kòm Administratè anvan oswa pandan limit 30 jou a"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Siprime Pòs</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1120] border border-red-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Siprime Pòs Atis Sa a?</h3>
              <p className="text-xs text-slate-400">
                Kòm Administratè, ou gen otorite pou siprime piblikasyon sa a imedyatman sou UpMizik Social menm si limit 30 jou a poko rive.
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
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-colors border border-white/10 cursor-pointer"
              >
                Anile
              </button>
              <button
                id="admin-confirm-delete-post-btn"
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
    </div>
  );
};
