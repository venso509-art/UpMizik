import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Mail,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Send,
  Eye,
  MessageSquare
} from 'lucide-react';
import { ArtistUser } from '../types';

interface ArtistRejectionModalProps {
  artist: ArtistUser | null;
  onClose: () => void;
  onConfirmReject: (artistId: string, reason: string) => void;
  defaultReason?: string;
}

const PRESET_REASONS = [
  {
    id: 'proof_unclear',
    label: 'Foto pa klè',
    text: 'Foto prèv transfè a pa klè oswa koupe. Tanpri voye yon foto kote tout enfòmasyon yo parèt nèt.'
  },
  {
    id: 'wrong_amount',
    label: 'Montan pa koresponn',
    text: 'Montan 723.55 Goud ($4.99 USD) la pa kowenside ak sa ki parèt sou prèv transfè MonCash/Natcash la.'
  },
  {
    id: 'invalid_ref',
    label: 'Referans pa valid',
    text: 'Nimewo referans tranzaksyon an pa valid oswa pa egziste nan sistèm verifikasyon nou an.'
  },
  {
    id: 'duplicate_proof',
    label: 'Prèv deja itilize',
    text: 'Prèv peman sa a te deja itilize pou valide yon lòt kont atis sou UpMizik.'
  },
  {
    id: 'profile_info',
    label: 'Enfòmasyon enkofòm',
    text: 'Non atis la oswa enfòmasyon pwofil ou pa konfòm ak règleman platfòm UpMizik.'
  }
];

export const formatWhatsAppPhone = (rawPhone: string): string => {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('509')) return digits;
  if (digits.length === 8) return `509${digits}`;
  return digits;
};

export const generateRejectionMessage = (artist: ArtistUser, reason: string): string => {
  return `Bonjou ${artist.stageName || artist.name}, se Administrasyon UpMizik.\n\nKonsènan demand enskripsyon atis ou a ($4.99 USD / ~723 HTG):\nNou pa t kapab valide li pou rezon sa a:\n👉 "${reason}"\n\nTanpri konekte sou https://upmizik.com pou w ka telechaje yon nouvo foto prèv transfè ki kòrèk pou nou valide kont ou imedyatman.\n\nMèsi pou konpreyansyon w,\nEkip UpMizik.`;
};

export const ArtistRejectionModal: React.FC<ArtistRejectionModalProps> = ({
  artist,
  onClose,
  onConfirmReject,
  defaultReason
}) => {
  if (!artist) return null;

  const [reason, setReason] = useState<string>(
    defaultReason || PRESET_REASONS[0].text
  );
  const [copied, setCopied] = useState(false);
  const [showProofPreview, setShowProofPreview] = useState(false);

  const cleanPhone = formatWhatsAppPhone(artist.phone || '');
  const fullMessage = generateRejectionMessage(artist, reason.trim() || PRESET_REASONS[0].text);
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`
    : null;
  const mailtoUrl = artist.email
    ? `mailto:${encodeURIComponent(artist.email)}?subject=${encodeURIComponent('UpMizik - Enfòmasyon sou Demand Enskripsyon Atis')}&body=${encodeURIComponent(fullMessage)}`
    : null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenEmail = () => {
    if (mailtoUrl) {
      window.open(mailtoUrl, '_blank');
    }
  };

  const handleConfirmAndSendWhatsApp = () => {
    onConfirmReject(artist.id, reason.trim() || PRESET_REASONS[0].text);
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const handleConfirmOnly = () => {
    onConfirmReject(artist.id, reason.trim() || PRESET_REASONS[0].text);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-4">
        <div
          className="relative max-w-xl w-full bg-[#0a0f1d]/95 border border-red-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Refize Demand Atis</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                    $4.99 USD
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Voye rezon rejè a bay atis la dirèkteman sou <strong className="text-emerald-400">WhatsApp</strong> oswa <strong className="text-sky-400">Imèl</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Artist Card Info */}
          <div className="bg-[#05070f] border border-white/[0.08] rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <img
                  src={artist.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${artist.id}`}
                  alt={artist.stageName}
                  className="w-10 h-10 rounded-xl object-cover border border-white/10"
                />
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{artist.stageName}</span>
                    <span className="text-[11px] text-slate-400 font-normal">({artist.name})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">{artist.city || 'Vil enkoni'}</p>
                </div>
              </div>

              {artist.registrationProofUrl && (
                <button
                  type="button"
                  onClick={() => setShowProofPreview(!showProofPreview)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showProofPreview ? 'Kache Prèv' : 'Gade Prèv Transfè'}</span>
                </button>
              )}
            </div>

            {/* Proof image accordion */}
            {showProofPreview && artist.registrationProofUrl && (
              <div className="pt-2 border-t border-white/[0.06] animate-fadeIn">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black max-h-48 flex items-center justify-center">
                  <img
                    src={artist.registrationProofUrl}
                    alt="Prèv peman"
                    className="max-h-48 w-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2 text-xs bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-400">Tel/WhatsApp:</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {artist.phone || 'Pa gen nimewo'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-slate-400">Imèl:</span>
                <span className="font-semibold text-slate-200 truncate" title={artist.email}>
                  {artist.email || 'Pa gen imèl'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick reason presets */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              1. Chwazi oswa modifye rezon rejè a:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {PRESET_REASONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setReason(p.text)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                    reason === p.text
                      ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={reason ?? ''}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#05070f] border border-white/[0.12] rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 leading-relaxed resize-none transition-all placeholder:text-slate-500"
              placeholder="Ekri rezon rejè a pou atis la..."
            />
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Aperçu mesaj ki pral voye a:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08] flex items-center gap-1 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Kopye!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Kopye Tèks</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-[#05070f] border border-white/[0.08] rounded-xl p-3 text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
              {fullMessage}
            </div>
          </div>

          {/* Actions grid */}
          <div className="space-y-2 pt-1 border-t border-white/[0.08]">
            <p className="text-[11px] font-bold text-slate-300">3. Chwazi fason ou vle voye l:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* WhatsApp direct */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!cleanPhone}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  cleanPhone
                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 shadow-lg shadow-emerald-950/30'
                    : 'bg-white/[0.03] text-slate-500 border-white/[0.05] cursor-not-allowed'
                }`}
                title={cleanPhone ? `Louvri WhatsApp pou ${artist.phone}` : 'Pa gen nimewo telefòn'}
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Voye sou WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>

              {/* Email direct */}
              <button
                type="button"
                onClick={handleOpenEmail}
                disabled={!artist.email}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  artist.email
                    ? 'bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border-sky-500/40 hover:border-sky-400 shadow-lg shadow-sky-950/30'
                    : 'bg-white/[0.03] text-slate-500 border-white/[0.05] cursor-not-allowed'
                }`}
                title={artist.email ? `Voye imèl bay ${artist.email}` : 'Pa gen imèl'}
              >
                <Mail className="w-4 h-4 text-sky-400" />
                <span>Voye pa Imèl</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            </div>

            {/* Bottom Final Confirmations */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] transition-all"
              >
                Anile
              </button>

              {cleanPhone && (
                <button
                  type="button"
                  onClick={handleConfirmAndSendWhatsApp}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Konfime & Voye WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmOnly}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 flex items-center justify-center gap-1.5 transition-all"
              >
                <X className="w-4 h-4" />
                <span>Konfime Rejè Sistèm</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
