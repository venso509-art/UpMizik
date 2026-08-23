import React, { useState } from 'react';
import {
  Trophy,
  Disc,
  Crown,
  Award,
  Printer,
  Download,
  Edit3,
  Check,
  RotateCcw,
  X,
  Sparkles,
  ShieldCheck,
  Calendar,
  User,
  FileText,
  Sliders,
  CheckCircle
} from 'lucide-react';
import { AwardTierDefinition } from '../utils/awardsUtils';
import { generateCertificatePdf, CertificateData } from '../utils/certificatePdfGenerator';

export interface OfficialCertificateModalProps {
  initialArtistStageName: string;
  initialArtistRealName?: string;
  initialAward: AwardTierDefinition;
  defaultSignerName?: string;
  defaultSignerTitle?: string;
  onClose: () => void;
}

export const OfficialCertificateModal: React.FC<OfficialCertificateModalProps> = ({
  initialArtistStageName,
  initialArtistRealName = '',
  initialAward,
  defaultSignerName = 'Mr clauvens',
  defaultSignerTitle = 'Prezidan & Fondatè UpMizik',
  onClose
}) => {
  // Generate random default code once
  const initialCode = `UPM-CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const initialDateStr = new Date().toLocaleDateString('ht-HT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // State for all editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [artistStageName, setArtistStageName] = useState(initialArtistStageName);
  const [artistRealName, setArtistRealName] = useState(initialArtistRealName);
  const [awardTitle, setAwardTitle] = useState(initialAward.title);
  const [thresholdFormatted, setThresholdFormatted] = useState(initialAward.thresholdFormatted);
  const [certificateCode, setCertificateCode] = useState(initialCode);
  const [issueDate, setIssueDate] = useState(initialDateStr);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerTitle, setSignerTitle] = useState(defaultSignerTitle);
  const [customMessage, setCustomMessage] = useState('Atenn avèk siksè nivo rekò ofisyèl ak distenksyon nasyonal pou pèfòmans sa a');
  const [specialMention, setSpecialMention] = useState('Rekonèt ofisyèlman pou enpak kiltirèl eksepsyonèl li, fidelite piblik la ak kontribisyon remakab li nan pwomosyon mizik ayisyen an.');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Reset to initial values
  const handleReset = () => {
    setArtistStageName(initialArtistStageName);
    setArtistRealName(initialArtistRealName);
    setAwardTitle(initialAward.title);
    setThresholdFormatted(initialAward.thresholdFormatted);
    setCertificateCode(initialCode);
    setIssueDate(initialDateStr);
    setSignerName(defaultSignerName);
    setSignerTitle(defaultSignerTitle);
    setCustomMessage('Atenn avèk siksè nivo rekò ofisyèl ak distenksyon nasyonal pou pèfòmans sa a');
    setSpecialMention('Rekonèt ofisyèlman pou enpak kiltirèl eksepsyonèl li, fidelite piblik la ak kontribisyon remakab li nan pwomosyon mizik ayisyen an.');
  };

  // Generate & Download PDF
  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    try {
      const certData: CertificateData = {
        artistStageName,
        artistRealName,
        awardTitle,
        thresholdFormatted,
        category: initialAward.category,
        certificateCode,
        issueDate,
        signerName,
        signerTitle,
        customMessage,
        specialMention
      };

      const filename = generateCertificatePdf(certData);
      setDownloadSuccessToast(`Sètifika telechaje an PDF avèk siksè (${filename})!`);
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error generating certificate PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative max-w-5xl w-full bg-[#070b16] border-2 border-yellow-500/50 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl space-y-6 my-auto max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.1] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Sètifika Ofisyèl & Palmarès UpMizik</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
                  PDF & Enpresyon
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ou ka modifye tout enfòmasyon yo anvan w telechaje l an PDF oswa enprime l.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Toggle Edit Mode */}
            <button
              type="button"
              id="toggle-edit-certificate-btn"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                isEditing
                  ? 'bg-amber-400 text-slate-950 font-black shadow-amber-400/30'
                  : 'bg-white/[0.08] text-white hover:bg-white/[0.15] border border-white/[0.12]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Kache Panèl Modifikasyon' : '✏️ Pèsonalize / Modifye Detay'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              id="download-certificate-pdf-btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'Ap Jenere PDF...' : '📥 Telechaje PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/[0.12] flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-yellow-400" />
              <span>🖨️ Enprime</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.12] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {downloadSuccessToast && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-3.5 text-xs text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccessToast}</span>
          </div>
        )}

        {/* EDITING FORM PANEL (Shown when isEditing is true) */}
        {isEditing && (
          <div className="bg-[#0b1224] border border-amber-400/40 rounded-2xl p-4 sm:p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white">
                  Panèl Modifikasyon & Pèsonalizasyon Sètifika
                </h4>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retabli Done Orijinal yo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              {/* Artist Stage Name */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Non Atis la (Nom d'artiste):</label>
                <input
                  type="text"
                  value={artistStageName ?? ''}
                  onChange={(e) => setArtistStageName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-white outline-none font-bold"
                  placeholder="Eg: Wendy, Rutshelle Guillaume..."
                />
              </div>

              {/* Artist Real Name */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Non Reyèl (Nom complet):</label>
                <input
                  type="text"
                  value={artistRealName ?? ''}
                  onChange={(e) => setArtistRealName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-white outline-none"
                  placeholder="Eg: Wendy Traka..."
                />
              </div>

              {/* Award Title */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Tit Rekonpans / Twofe:</label>
                <input
                  type="text"
                  value={awardTitle ?? ''}
                  onChange={(e) => setAwardTitle(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-yellow-300 outline-none font-bold"
                  placeholder="Eg: Disque d'Or, Twofe Donasyon..."
                />
              </div>

              {/* Threshold Formatted */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Nivo / Palier Homologe:</label>
                <input
                  type="text"
                  value={thresholdFormatted ?? ''}
                  onChange={(e) => setThresholdFormatted(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  placeholder="Eg: 50,000 Ekout, $5,000 USD..."
                />
              </div>

              {/* Certificate Code */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Kòd Sètifika (ID):</label>
                <input
                  type="text"
                  value={certificateCode ?? ''}
                  onChange={(e) => setCertificateCode(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-yellow-400 outline-none font-mono font-bold"
                  placeholder="Eg: #UPM-CERT-2026-..."
                />
              </div>

              {/* Issue Date */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Dat Emisyon:</label>
                <input
                  type="text"
                  value={issueDate ?? ''}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-white outline-none"
                  placeholder="Eg: 21 Out 2026..."
                />
              </div>

              {/* Signer Name */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Non Siyatè / Prezidan:</label>
                <input
                  type="text"
                  value={signerName ?? ''}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-white outline-none"
                  placeholder="Eg: Mr clauvens"
                />
              </div>

              {/* Signer Title */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Tit / Wòl Siyatè a:</label>
                <input
                  type="text"
                  value={signerTitle ?? ''}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-white outline-none"
                  placeholder="Eg: Prezidan & Fondatè UpMizik"
                />
              </div>

              {/* Special Mention */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Menksyon Espesyal / Sitasyon:</label>
                <input
                  type="text"
                  value={specialMention ?? ''}
                  onChange={(e) => setSpecialMention(e.target.value)}
                  className="w-full bg-[#050811] border border-white/[0.15] focus:border-yellow-400 rounded-xl px-3 py-2 text-white outline-none"
                  placeholder="Eg: Pou kontribisyon eksepsyonèl..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplike & Fèmen Panèl Modifikasyon</span>
              </button>
            </div>
          </div>
        )}

        {/* LUXURY VISUAL CERTIFICATE PREVIEW (Interactive Live Landscape Certificate) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#060913] via-[#0c1328] to-[#04060c] border-4 border-double border-yellow-500/70 p-6 sm:p-10 lg:p-12 shadow-2xl text-center text-white space-y-6">
          {/* Subtle Ambient Gold Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Haitian Flag Accent Top Ribbon */}
          <div className="relative z-10 flex items-center justify-center gap-2">
            <div className="w-16 h-1 bg-blue-600 rounded-l-full" />
            <div className="w-16 h-1 bg-red-600 rounded-r-full" />
          </div>

          {/* Header Brand Badge */}
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-xl shadow-yellow-400/25 mx-auto">
              {initialAward.iconName === 'disc' && <Disc className="w-8 h-8 animate-spin" style={{ animationDuration: '10s' }} />}
              {initialAward.iconName === 'trophy' && <Trophy className="w-8 h-8" />}
              {initialAward.iconName === 'crown' && <Crown className="w-8 h-8" />}
              {initialAward.iconName === 'award' && <Award className="w-8 h-8" />}
            </div>

            <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] font-black text-yellow-400">
              UPMIZIK AYITI  •  KOMISYON NASYONAL SÈTIFIKASYON & HOMOLOGASYON MIZIKAL
            </p>
            <h2 className="text-xl sm:text-3xl font-serif font-black text-white tracking-wide">
              SÈTIFIKA HOMOLOGASYON & REKÒ OFISYÈL
            </h2>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-slate-400">
              OFFICIAL RECORDING INDUSTRY CERTIFICATE OF ACHIEVEMENT
            </p>
          </div>

          {/* Recipient Information */}
          <div className="relative z-10 py-3.5 border-y border-yellow-400/30 space-y-2">
            <p className="text-xs sm:text-sm text-slate-300 font-sans italic">
              Komite Evalyasyon ak Konsèy Administrasyon UpMizik Ayiti a deklare e sètifye solanèlman ke atis :
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-yellow-400 tracking-tight font-serif drop-shadow-md">
              {artistStageName}
            </h1>
            {artistRealName && artistRealName.trim() !== '' && (
              <p className="text-xs sm:text-sm text-slate-400 font-mono">
                ({artistRealName})
              </p>
            )}
          </div>

          {/* Award Card & Threshold */}
          <div className="relative z-10 space-y-3">
            <p className="text-xs sm:text-sm text-slate-300">
              {customMessage} :
            </p>

            <div className="inline-block bg-gradient-to-r from-yellow-400/15 via-amber-400/25 to-yellow-400/15 border-2 border-yellow-400/60 rounded-2xl px-6 sm:px-10 py-3.5 shadow-xl">
              <span className="text-lg sm:text-2xl font-black text-white block uppercase tracking-wider">
                {awardTitle}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-yellow-300">
                PALYE HOMOLOGE : {thresholdFormatted}
              </span>
            </div>

            {specialMention && specialMention.trim() !== '' && (
              <p className="text-xs sm:text-sm text-slate-300 italic max-w-xl mx-auto leading-relaxed">
                « {specialMention} »
              </p>
            )}
          </div>

          {/* Footer Signatures, Code and Official Stamp */}
          <div className="relative z-10 pt-6 border-t border-white/[0.1] grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-left text-xs">
            {/* Left: Certificate ID & Date */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Kòd Matrikil / ID:</span>
              <span className="font-mono font-bold text-yellow-400 text-sm">#{certificateCode}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mt-2">Dat Homologasyon:</span>
              <span className="text-white font-medium">{issueDate}</span>
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Otantifye & Verifye sou upmizik.com</span>
              </span>
            </div>

            {/* Center: Gold Official Seal (Clean, Balanced & Centered) */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-yellow-400 flex flex-col items-center justify-center bg-[#070b16] shadow-xl shadow-yellow-500/20 p-2 border-double border-4 border-yellow-400/80 mx-auto">
                <Sparkles className="w-4 h-4 text-yellow-400 mb-0.5" />
                <span className="text-[10px] sm:text-[11px] font-black text-yellow-400 uppercase tracking-widest leading-none">UPMIZIK</span>
                <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none mt-1">OFISYÈL</span>
              </div>
            </div>

            {/* Right: Signature Box */}
            <div className="sm:text-right space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Komisyon Homologasyon & Direksyon:
              </span>
              <span className="font-serif font-black text-white text-base block font-bold">
                {signerName}
              </span>
              <div className="w-36 h-0.5 bg-yellow-400/40 sm:ml-auto my-1" />
              <span className="text-xs text-slate-300 font-medium block">{signerTitle}</span>
              <span className="text-[10px] text-yellow-400 font-bold block">
                Kolèj Sètifikasyon UpMizik Ayiti
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Quick Action Helper */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Fòma PDF A4 Paysage (Landscape) pare pou enprime oswa ankadre nan kad fizik.</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl text-xs font-black bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Telechaje PDF Kounye a</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
