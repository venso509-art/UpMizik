import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Heart,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  Smile,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { SocialPost, SocialPostComment, ArtistUser } from '../types';
import { StorageService } from '../utils/storage';
import { validateRestrictedDigits, hasRestrictedPhoneOrDigits, RESTRICTED_DIGITS_ERROR_MESSAGE } from '../utils/textValidation';

interface SocialCommentModalProps {
  post: SocialPost | null;
  artist?: ArtistUser;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: (comment: SocialPostComment, updatedPostId: string) => void;
}

export const SocialCommentModal: React.FC<SocialCommentModalProps> = ({
  post,
  artist,
  isOpen,
  onClose,
  onCommentAdded
}) => {
  const [comments, setComments] = useState<SocialPostComment[]>([]);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [authorName, setAuthorName] = useState<string>(() => {
    return localStorage.getItem('upmizik_commenter_name') || '';
  });
  const [content, setContent] = useState<string>('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  // Load comments when modal opens or post changes
  useEffect(() => {
    if (isOpen && post) {
      const loaded = StorageService.getSocialPostComments(post.id);
      setComments(loaded);
      setLikedCommentIds(StorageService.getLikedSocialCommentIds());
      setContent('');
      setCommentError(null);
      setSuccessToast(false);
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const handleLikeComment = (commentId: string) => {
    const res = StorageService.likeSocialPostComment(commentId);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: res.likes } : c))
    );
    if (res.isLiked) {
      setLikedCommentIds((prev) => [...prev, commentId]);
    } else {
      setLikedCommentIds((prev) => prev.filter((id) => id !== commentId));
    }
  };

  const handleAddQuickReaction = (reaction: string) => {
    setContent((prev) => (prev ? `${prev} ${reaction}` : reaction));
    setCommentError(null);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    if (!content.trim() || isSubmitting) return;

    // Strict validation against phone numbers and 5+ consecutive digits
    const contentValidation = validateRestrictedDigits(content, 'kòmantè a');
    if (!contentValidation.isValid) {
      setCommentError(contentValidation.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
      return;
    }

    if (authorName.trim()) {
      const authorValidation = validateRestrictedDigits(authorName, 'non ou');
      if (!authorValidation.isValid) {
        setCommentError(authorValidation.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
        return;
      }
    }

    setIsSubmitting(true);
    const finalAuthor = authorName.trim() || 'Fanatik UpMizik';
    
    // Save author name preference
    localStorage.setItem('upmizik_commenter_name', finalAuthor);

    const newComment = StorageService.addSocialPostComment(post.id, {
      authorName: finalAuthor,
      content: content.trim()
    });

    setComments((prev) => [newComment, ...prev]);
    setContent('');
    setIsSubmitting(false);
    setSuccessToast(true);

    if (onCommentAdded) {
      onCommentAdded(newComment, post.id);
    }

    setTimeout(() => {
      setSuccessToast(false);
    }, 3000);
  };

  const formatCommentDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / (60 * 1000));
      if (diffMinutes < 1) return 'Fenk kounye a';
      if (diffMinutes < 60) return `${diffMinutes} min de sa`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} èdtan de sa`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} jou de sa`;
    } catch {
      return 'Dènyèman';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        id="social-comment-modal-dialog"
        className="relative w-full max-w-2xl bg-[#090d16] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Kòmantè sou Piblikasyon</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {comments.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Piblikasyon pa <span className="text-slate-200 font-semibold">{post.stageName}</span>
              </p>
            </div>
          </div>
          <button
            id="close-social-comment-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Post Preview + Comments Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          
          {/* Post Snippet Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#05070a] border border-white/10 flex items-start gap-3">
            <img
              src={post.artistAvatar}
              alt={post.stageName}
              className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {post.stageName}
                </span>
                <span className="text-xs text-slate-400 truncate">{post.handle}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                {post.content}
              </p>
              {post.imageUrl && (
                <div className="mt-2 w-20 h-14 rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={post.imageUrl}
                    alt="Snippet"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Kòmantè ou an pibliye avèk siksè sou sit la!</span>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Tout Kòmantè Fanatik Yo</span>
              <span>{comments.length} kòmantè</span>
            </h4>

            {comments.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-6">
                <MessageCircle className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-300">
                  Poko gen kòmantè sou piblikasyon sa a.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Se ou menm ki premye moun ki pral kite yon bèl mesaj pou atis la!
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const isLiked = likedCommentIds.includes(comment.id);
                return (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-2xl bg-[#0e1422] border border-white/[0.08] hover:border-white/15 transition-all flex items-start gap-3"
                  >
                    <img
                      src={
                        comment.authorAvatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                          comment.authorName
                        )}`
                      }
                      alt={comment.authorName}
                      className="w-9 h-9 rounded-xl object-cover border border-white/10 bg-slate-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                          {comment.authorName}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{formatCommentDate(comment.createdAt)}</span>
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                      <div className="flex items-center justify-end gap-3 mt-2 pt-1 border-t border-white/[0.04]">
                        <button
                          type="button"
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all ${
                            isLiked
                              ? 'text-red-400 bg-red-500/10'
                              : 'text-slate-400 hover:text-red-400 hover:bg-white/[0.04]'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isLiked ? 'fill-red-500 text-red-500' : ''
                            }`}
                          />
                          <span>{comment.likes || 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer: Comment Form */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#070b14]">
          <form onSubmit={handleSubmitComment} className="space-y-3">
            
            {/* Quick Haitian Creole reactions */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Reyaksyon Rapid:</span>
              </span>
              {[
                '🔥 Lou anpil!',
                '🇭🇹 Fyète nasyonal!',
                '👏 Respekte travay la!',
                '❤️ M renmen vibe la!',
                '👑 Nimewo 1!',
                '🎵 Son sa bon!'
              ].map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddQuickReaction(emoji)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10 hover:border-yellow-400/40 shrink-0 transition-all active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Warning banner for phone number / excessive consecutive digits */}
            {(commentError || hasRestrictedPhoneOrDigits(content) || hasRestrictedPhoneOrDigits(authorName)) && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="font-medium">
                  {commentError || RESTRICTED_DIGITS_ERROR_MESSAGE}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="sm:col-span-1">
                <input
                  id="social-comment-author-input"
                  type="text"
                  value={authorName ?? ''}
                  onChange={(e) => {
                    setAuthorName(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  placeholder="Non ou (opsyonèl)..."
                  className={`w-full bg-[#0d1424] border text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none transition-all ${
                    hasRestrictedPhoneOrDigits(authorName)
                      ? 'border-red-500 bg-red-950/20 text-red-200'
                      : 'border-white/15 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  id="social-comment-content-input"
                  type="text"
                  value={content ?? ''}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  placeholder="Kite yon kòmantè pou atis la..."
                  className={`flex-1 bg-[#0d1424] border text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none transition-all ${
                    commentError || hasRestrictedPhoneOrDigits(content)
                      ? 'border-red-500 bg-red-950/20 text-red-200'
                      : 'border-white/15 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                <button
                  id="submit-social-comment-btn"
                  type="submit"
                  disabled={!content.trim() || isSubmitting || hasRestrictedPhoneOrDigits(content) || hasRestrictedPhoneOrDigits(authorName)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pibliye</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
