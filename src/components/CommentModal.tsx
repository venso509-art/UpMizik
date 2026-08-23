import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send, Trash2, Heart, User, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { MusicItem, CommentItem, AdminUser } from '../types';
import { StorageService } from '../utils/storage';
import { validateRestrictedDigits, hasRestrictedPhoneOrDigits, RESTRICTED_DIGITS_ERROR_MESSAGE } from '../utils/textValidation';

interface CommentModalProps {
  music: MusicItem | null;
  comments?: CommentItem[];
  currentAdmin?: AdminUser | null;
  isAdmin?: boolean;
  onClose: () => void;
  onAddComment?: (musicId: string, authorName: string, text: string) => void;
  onDeleteComment?: (commentId: string, musicId: string) => void;
  onUpdateCommentCount?: (musicId: string, count: number) => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  music,
  comments: propComments,
  currentAdmin,
  isAdmin,
  onClose,
  onAddComment,
  onDeleteComment,
  onUpdateCommentCount
}) => {
  const [localComments, setLocalComments] = useState<CommentItem[]>(() => StorageService.getComments());
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const commentsListRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  useEffect(() => {
    if (music) {
      commentsListRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setLocalComments(StorageService.getComments());
      setCommentError(null);
      setIsClosing(false);
    }
  }, [music]);

  if (!music) return null;

  const allComments = propComments || localComments;
  const filteredComments = allComments.filter(c => c.musicId === music.id);
  const effectiveIsAdmin = Boolean(currentAdmin || isAdmin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    if (!commentText.trim()) return;

    // Strict validation against phone numbers and 5+ consecutive digits
    const textVal = validateRestrictedDigits(commentText, 'kòmantè a');
    if (!textVal.isValid) {
      setCommentError(textVal.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
      return;
    }

    if (authorName.trim()) {
      const authorVal = validateRestrictedDigits(authorName, 'non ou');
      if (!authorVal.isValid) {
        setCommentError(authorVal.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const added = StorageService.addComment(music.id, authorName.trim() || 'Fanatik UpMizik', commentText.trim());
      const updatedList = StorageService.getComments();
      setLocalComments(updatedList);

      if (onAddComment) {
        onAddComment(music.id, authorName.trim() || 'Fanatik UpMizik', commentText.trim());
      }
      if (onUpdateCommentCount) {
        const count = updatedList.filter(c => c.musicId === music.id).length;
        onUpdateCommentCount(music.id, count);
      }

      setCommentText('');
      setIsSubmitting(false);
    }, 400);
  };

  const handleDelete = (commentId: string) => {
    StorageService.deleteComment(commentId, music.id);
    const updatedList = StorageService.getComments();
    setLocalComments(updatedList);

    if (onDeleteComment) {
      onDeleteComment(commentId, music.id);
    }
    if (onUpdateCommentCount) {
      const count = updatedList.filter(c => c.musicId === music.id).length;
      onUpdateCommentCount(music.id, count);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/80 backdrop-blur-md p-2 sm:p-4 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-4">
        <div className={`relative w-full max-w-lg bg-[#0a0f1d]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-7 shadow-2xl my-auto flex flex-col max-h-[92dvh] backdrop-blur-2xl ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                Kòmantè & Feedback
              </h3>
              <p className="text-xs text-slate-400">
                {music.title} — {music.artistName}
              </p>
            </div>
          </div>

          <button
            id="close-comment-modal-btn"
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List Area */}
        <div ref={commentsListRef} className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 my-2 no-scrollbar">
          {filteredComments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Poko gen okenn kòmantè sou moso sa. Se pou premye moun ki bay opinyon w!
            </div>
          ) : (
            filteredComments.map((c) => (
              <div
                key={c.id}
                id={`comment-item-${c.id}`}
                className="bg-[#05070a]/80 border border-white/[0.08] rounded-2xl p-3.5 flex flex-col gap-1.5 transition-all hover:border-white/[0.16] backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center text-[10px] font-bold">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      {c.authorName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{c.createdAt}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  {c.text}
                </p>

                {/* Footer of Comment: Admin Delete Button Moderation */}
                <div className="flex items-center justify-between pt-1 pl-8 text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span>{c.likes || 1}</span>
                  </span>

                  {/* Admin Moderation Button */}
                  {effectiveIsAdmin && (
                    <button
                      id={`delete-comment-btn-${c.id}`}
                      onClick={() => handleDelete(c.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 text-red-400 hover:bg-red-900 hover:text-red-200 border border-red-800/60 text-[10px] font-bold transition-colors"
                      title="Efase kòmantè sa (Admin)"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Efase (Admin)</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Comment Input Form */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-white/[0.08] shrink-0 space-y-2.5">
          {/* Warning banner for phone number / 5+ consecutive digits */}
          {(commentError || hasRestrictedPhoneOrDigits(commentText) || hasRestrictedPhoneOrDigits(authorName)) && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="font-medium">
                {commentError || RESTRICTED_DIGITS_ERROR_MESSAGE}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              id="comment-author-input"
              type="text"
              value={authorName ?? ''}
              onChange={(e) => {
                setAuthorName(e.target.value);
                if (commentError) setCommentError(null);
              }}
              placeholder="Non ou (opsyonèl)"
              className={`bg-[#05070a] border rounded-xl px-3 py-2 text-xs text-white outline-none transition-all ${
                hasRestrictedPhoneOrDigits(authorName)
                  ? 'border-red-500 bg-red-950/20 text-red-200'
                  : 'border-white/[0.12] focus:border-blue-500'
              }`}
            />
            <input
              id="comment-text-input"
              type="text"
              required
              value={commentText ?? ''}
              onChange={(e) => {
                setCommentText(e.target.value);
                if (commentError) setCommentError(null);
              }}
              placeholder="Ekri yon bèl mesaj pou atis la..."
              className={`sm:col-span-2 bg-[#05070a] border rounded-xl px-3 py-2 text-xs text-white outline-none transition-all ${
                commentError || hasRestrictedPhoneOrDigits(commentText)
                  ? 'border-red-500 bg-red-950/20 text-red-200'
                  : 'border-white/[0.12] focus:border-blue-500'
              }`}
            />
          </div>

          <button
            id="submit-comment-btn"
            type="submit"
            disabled={isSubmitting || !commentText.trim() || hasRestrictedPhoneOrDigits(commentText) || hasRestrictedPhoneOrDigits(authorName)}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>N ap pibliye...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Pibliye Kòmantè</span>
              </>
            )}
          </button>
        </form>

        </div>
      </div>
    </div>
  );
};
