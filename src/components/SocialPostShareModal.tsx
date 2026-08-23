import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { SocialPost } from '../types';
import { StorageService } from '../utils/storage';

interface SocialPostShareModalProps {
  post: SocialPost | null;
  isOpen: boolean;
  onClose: () => void;
  onPostShared?: (postId: string, newSharesCount: number) => void;
}

export const SocialPostShareModal: React.FC<SocialPostShareModalProps> = ({
  post,
  isOpen,
  onClose,
  onPostShared
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !post) return null;

  // Build deep link URL for this post
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const shareUrl = `${origin}${pathname}?post=${post.id}#post-${post.id}`;

  const shareText = `🇭🇹 Gade piblikasyon sa a pa ${post.stageName} sou UpMizik Social:\n"${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}"\n\nKlike sou lyen an pou koute, kòmante epi sipòte:\n${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      const newCount = StorageService.incrementSocialPostShares(post.id);
      if (onPostShared) onPostShared(post.id, newCount);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      const newCount = StorageService.incrementSocialPostShares(post.id);
      if (onPostShared) onPostShared(post.id, newCount);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTrackShare = () => {
    const newCount = StorageService.incrementSocialPostShares(post.id);
    if (onPostShared) onPostShared(post.id, newCount);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `UpMizik - ${post.stageName} sou UpMizik Social`,
          text: `Gade piblikasyon ${post.stageName} sou UpMizik!`,
          url: shareUrl
        });
        handleTrackShare();
      } catch (err) {
        console.warn('Native share dismissed or failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Social share URLs
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Gade piblikasyon ${post.stageName} sou @UpMizik:\n"${post.content.slice(0, 80)}..."`)}&url=${encodeURIComponent(shareUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Gade sa ${post.stageName} pibliye sou UpMizik Social!`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        id="social-post-share-modal-dialog"
        className="relative w-full max-w-lg bg-[#090d16] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-900/40">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Pataje Piblikasyon Sa</span>
              </h3>
              <p className="text-xs text-slate-400">
                Fè fanatik ak zanmi w dekouvri sa <span className="text-slate-200 font-semibold">{post.stageName}</span> pibliye
              </p>
            </div>
          </div>
          <button
            id="close-social-share-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Post Excerpt Preview */}
          <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/10 flex items-start gap-3">
            <img
              src={post.artistAvatar}
              alt={post.stageName}
              className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {post.stageName}
                </span>
                <span className="text-xs text-slate-400 truncate">{post.handle}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                {post.content}
              </p>
            </div>
          </div>

          {/* Quick One-Click Copy Link Box */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Lyen Dirèk Piblikasyon an
            </label>
            <div className="flex items-center gap-2 bg-[#0d1424] border border-white/15 rounded-xl p-1.5 pl-3">
              <input
                type="text"
                readOnly
                value={shareUrl ?? ''}
                className="bg-transparent text-xs text-slate-300 outline-none flex-1 truncate font-mono select-all"
              />
              <button
                id="copy-post-share-link-btn"
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Kopye!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopye Lyen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Network Share Buttons Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pataje Dirèkteman Sou:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* WhatsApp */}
              <a
                id="share-whatsapp-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackShare}
                className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                  💬
                </div>
                <span className="text-xs font-bold">WhatsApp</span>
              </a>

              {/* Facebook */}
              <a
                id="share-facebook-btn"
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackShare}
                className="p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                  f
                </div>
                <span className="text-xs font-bold">Facebook</span>
              </a>

              {/* X / Twitter */}
              <a
                id="share-twitter-btn"
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackShare}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-black text-white border border-white/20 flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                  𝕏
                </div>
                <span className="text-xs font-bold">X (Twitter)</span>
              </a>

              {/* Telegram */}
              <a
                id="share-telegram-btn"
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackShare}
                className="p-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group text-center"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                  ✈️
                </div>
                <span className="text-xs font-bold">Telegram</span>
              </a>
            </div>
          </div>

          {/* Native Device Share Option */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <div className="pt-2">
              <button
                id="native-device-share-btn"
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
              >
                <Smartphone className="w-4 h-4 text-pink-400" />
                <span>Pataje ak Aparèy Ou (Aplikasyon Telefòn)</span>
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#070b14] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Pataje sa ede atis la jwenn plis sipòtè!</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Fèmen
          </button>
        </div>
      </div>
    </div>
  );
};
