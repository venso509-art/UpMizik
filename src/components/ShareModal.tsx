import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Smartphone,
  Image as ImageIcon,
  MessageCircle,
  Eye,
  HeartHandshake,
  Music,
  Code,
  QrCode,
  Layers
} from 'lucide-react';
import { MusicItem } from '../types';
import {
  generateTrackDeepLink,
  updateDocumentMetaTags,
  drawStoryPreviewCanvas,
  StoryCardOptions
} from '../utils/deepLink';

interface ShareModalProps {
  music: MusicItem | null;
  onClose: () => void;
  onShareCompleted?: (musicId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  music,
  onClose,
  onShareCompleted
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'story' | 'whatsapp' | 'social' | 'meta'>('story');
  const [storyFormat, setStoryFormat] = useState<'story' | 'feed'>('story');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  // Automatically scroll modal to the very top whenever opened or tab changes
  useEffect(() => {
    if (music) {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setIsClosing(false);
    }
  }, [music, activeTab]);

  useEffect(() => {
    if (!music) return;

    // Update document meta-tags immediately for scrapers & current DOM
    updateDocumentMetaTags(music);

    // Generate story preview card
    setIsGenerating(true);
    const hiddenCanvas = canvasRef.current || document.createElement('canvas');

    drawStoryPreviewCanvas(hiddenCanvas, music, { format: storyFormat })
      .then((dataUrl) => {
        setPreviewImageUrl(dataUrl);
      })
      .catch(() => {
        setPreviewImageUrl(music.coverUrl);
      })
      .finally(() => {
        setIsGenerating(false);
      });
  }, [music, storyFormat]);

  if (!music) return null;

  const deepLink = generateTrackDeepLink(music.id);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(deepLink);
      }
      setCopied(true);
      if (onShareCompleted) onShareCompleted(music.id);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleDownloadStoryImage = () => {
    if (!previewImageUrl) return;
    const link = document.createElement('a');
    link.download = `UpMizik-${music.artistName}-${music.title}-${storyFormat}.png`
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');
    link.href = previewImageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShareCompleted) onShareCompleted(music.id);
  };

  const shareText = `🇭🇹 Koute "${music.title}" pa ${music.artistName} sou UpMizik! Voye sipò dirèk bay atis la ak MonCash & Natcash:\n\n${deepLink}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${music.title} - ${music.artistName}`,
          text: `Koute "${music.title}" pa ${music.artistName} sou UpMizik!`,
          url: deepLink
        });
        if (onShareCompleted) onShareCompleted(music.id);
      } catch (err) {
        // user cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  // Direct Social Share URLs
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLink)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🇭🇹 Koute "${music.title}" pa ${music.artistName} sou UpMizik Ayiti:`)}&url=${encodeURIComponent(deepLink)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(`Koute "${music.title}" pa ${music.artistName} sou UpMizik!`)}`;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl p-2 sm:p-4 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Hidden Canvas for High-Resolution Card Export */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
        <div
          className={`relative w-full max-w-2xl bg-[#0a0f1d] border border-white/[0.12] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] my-auto ${
            isClosing ? 'animate-modal-out' : 'animate-modal-in'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#05070a]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
                <span>Pataje & Lyen Dirèk (Deep Link)</span>
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Jenere lyen dirèk ak kat vizyèl pou Instagram Story & WhatsApp Status.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deep Link Quick Copy Pill */}
        <div className="px-6 pt-4 pb-2 bg-[#080d19]/90 border-b border-white/[0.06]">
          <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5">
            Lyen Dirèk Moso a (Deep Link URL)
          </label>
          <div className="flex items-center gap-2 bg-[#05070a] border border-cyan-500/30 rounded-2xl p-1.5 pl-3">
            <input
              type="text"
              readOnly
              value={deepLink ?? ''}
              className="bg-transparent text-xs text-slate-200 font-mono flex-1 outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black active:scale-95'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopye!' : 'Kopye Lyen'}</span>
            </button>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="flex border-b border-white/[0.08] bg-[#05070a] px-6 gap-2">
          <button
            onClick={() => setActiveTab('story')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'story'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Story & Status (Vizyèl)</span>
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp & Rezo</span>
          </button>
          <button
            onClick={() => setActiveTab('meta')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'meta'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Preview Meta-Tags</span>
          </button>
        </div>

        {/* Modal Body */}
        <div ref={modalBodyRef} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: STORY / STATUS CARD GENERATOR */}
          {activeTab === 'story' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-300 font-medium">
                  Kat vizyèl otomatik pou mete nan Story Instagram ou WhatsApp Status:
                </span>

                {/* Aspect ratio toggle */}
                <div className="flex items-center p-1 bg-[#05070a] border border-white/[0.08] rounded-xl text-xs font-bold self-start sm:self-auto">
                  <button
                    onClick={() => setStoryFormat('story')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      storyFormat === 'story'
                        ? 'bg-yellow-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    9:16 Story
                  </button>
                  <button
                    onClick={() => setStoryFormat('feed')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      storyFormat === 'feed'
                        ? 'bg-yellow-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1:1 Kare (Feed)
                  </button>
                </div>
              </div>

              {/* Story Visual Preview Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#05070a] border border-white/[0.08] rounded-2xl relative overflow-hidden">
                {isGenerating ? (
                  <div className="h-72 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono">N ap jenere kat vizyèl la...</span>
                  </div>
                ) : (
                  <div className="relative group max-w-[280px] sm:max-w-[320px] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.15]">
                    <img
                      src={previewImageUrl || music.coverUrl}
                      alt={music.title}
                      className={`w-full object-cover ${storyFormat === 'story' ? 'aspect-[9/16]' : 'aspect-square'}`}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={handleDownloadStoryImage}
                        className="px-4 py-2 rounded-xl bg-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xl"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Telechaje
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Story Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDownloadStoryImage}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-yellow-950/40 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Telechaje Imaj Story a (HD)</span>
                </button>

                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareCompleted && onShareCompleted(music.id)}
                  className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Pataje dirèk sou WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP & SOCIAL SHARING */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/[0.06] pb-2">
                  <span className="font-semibold text-slate-300">Mesaj Pataj Pre-Fòmate:</span>
                  <button
                    onClick={handleCopyLink}
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Copy className="w-3 h-3" />
                    Kopye Mesaj la
                  </button>
                </div>
                <p className="text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed bg-[#0a0f1d] p-3 rounded-xl border border-white/[0.04]">
                  {shareText}
                </p>
              </div>

              {/* 1-Click Social Direct Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* WhatsApp */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareCompleted && onShareCompleted(music.id)}
                  className="p-3 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <span>WhatsApp</span>
                </a>

                {/* Facebook */}
                <a
                  href={facebookShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareCompleted && onShareCompleted(music.id)}
                  className="p-3 rounded-2xl bg-blue-950/60 hover:bg-blue-900/80 border border-blue-500/30 text-blue-300 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                >
                  <svg className="w-5 h-5 fill-current text-blue-400" viewBox="0 0 24 24">
                    <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.688 5H18V0h-3.808C10.592 0 9 1.582 9 4.615V8z"/>
                  </svg>
                  <span>Facebook</span>
                </a>

                {/* X / Twitter */}
                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareCompleted && onShareCompleted(music.id)}
                  className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                >
                  <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>X (Twitter)</span>
                </a>

                {/* Telegram */}
                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onShareCompleted && onShareCompleted(music.id)}
                  className="p-3 rounded-2xl bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/30 text-sky-300 text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                >
                  <svg className="w-5 h-5 fill-current text-sky-400" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.535-.194 1.006.128.832.946z"/>
                  </svg>
                  <span>Telegram</span>
                </a>
              </div>

              {/* Native Share button (Mobile Device OS Sheet) */}
              <button
                onClick={handleNativeShare}
                className="w-full py-3 px-4 rounded-2xl bg-[#0d1424] hover:bg-[#131c33] border border-white/[0.1] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Ouvè Fichye Pataj Sistèm Aparèy la</span>
              </button>
            </div>
          )}

          {/* TAB 3: OPEN GRAPH / META-TAG INSPECTOR */}
          {activeTab === 'meta' && (
            <div className="space-y-4 text-xs">
              <div className="text-slate-400">
                Gade ki jan WhatsApp, Facebook ak rezo sosyal yo ap wè kat previ lè moun pataje lyen sa a:
              </div>

              {/* Simulated Social Link Preview Card */}
              <div className="bg-[#05070a] border border-white/[0.12] rounded-2xl overflow-hidden shadow-xl">
                <div className="relative aspect-[1.91/1] w-full bg-black overflow-hidden">
                  <img
                    src={music.coverUrl}
                    alt={music.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-yellow-400 font-mono font-bold">
                    og:image
                  </div>
                </div>

                <div className="p-4 space-y-1.5 bg-[#0a0f1d]">
                  <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider block">
                    UPMIZIK.HT • OPEN GRAPH CARD
                  </span>
                  <h4 className="font-bold text-white text-sm truncate">
                    {music.title} - {music.artistName}
                  </h4>
                  <p className="text-slate-400 text-xs line-clamp-2">
                    Koute &ldquo;{music.title}&rdquo; pa {music.artistName} sou UpMizik. Sipòte atis la dirèkteman ak MonCash &amp; Natcash!
                  </p>
                </div>
              </div>

              {/* Raw Meta Tag Code Viewer */}
              <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tag HTML Jenere yo:
                </span>
                <pre className="text-[11px] text-cyan-300 font-mono overflow-x-auto p-2 bg-[#020408] rounded-xl border border-white/[0.04] leading-relaxed">
{`<meta property="og:title" content="${music.title} - ${music.artistName}" />
<meta property="og:description" content="Koute ${music.title} sou UpMizik Ayiti" />
<meta property="og:image" content="${music.coverUrl}" />
<meta property="og:url" content="${deepLink}" />
<meta name="twitter:card" content="summary_large_image" />`}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#05070a]/90 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-yellow-400" />
            Chak pataj ogmante vizibilite atis la sou paj prensipal la!
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-semibold transition-colors"
          >
            Fèmen
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
