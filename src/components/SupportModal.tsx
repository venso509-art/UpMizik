import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  HeartHandshake,
  Upload,
  CheckCircle,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  Loader2,
  Heart,
  Copy,
  Check,
  CreditCard,
  Building,
  DollarSign,
  QrCode,
  Download,
  PhoneCall,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Share2
} from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { MusicItem, DonationItem, PaymentSettingsConfig } from '../types';
import { FloatingHearts, createHeartBurst, FloatingHeartParticle } from './FloatingHearts';
import { compressAndReadFile } from '../utils/imageUtils';
import { StorageService } from '../utils/storage';
import { HostingerService } from '../utils/hostingerService';

export interface SupportModalProps {
  music: MusicItem | null;
  onClose: () => void;
  onConfirmSupport?: (donation: DonationItem) => void;
  onSubmitDonation?: (donationData: {
    musicId: string;
    musicTitle: string;
    artistId: string;
    artistName: string;
    amount: number;
    currency: 'USD' | 'HTG';
    donorName: string;
    donorPhone: string;
    proofUrl: string;
  }) => void;
}

export const PRESET_AMOUNTS = [5, 10, 25, 50, 100];
export const HTG_RATE = 145; // 1 USD = 145 HTG fallback

export const SupportModal: React.FC<SupportModalProps> = ({
  music,
  onClose,
  onConfirmSupport,
  onSubmitDonation
}) => {
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettingsConfig>(() => StorageService.getPaymentSettings());
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'USD' | 'HTG'>('USD');
  const [donorName, setDonorName] = useState<string>(() => {
    try {
      return localStorage.getItem('upmizik_saved_donor_name') || '';
    } catch {
      return '';
    }
  });
  const [donorPhone, setDonorPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('upmizik_saved_donor_phone') || '';
    } catch {
      return '';
    }
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(20);
  const [submittedDonationSummary, setSubmittedDonationSummary] = useState<{
    amount: number;
    amountHtg: number;
    artistName: string;
    musicTitle: string;
    donorName: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [copiedMethodId, setCopiedMethodId] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeartParticle[]>([]);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [qrFormat, setQrFormat] = useState<'ussd' | 'phone' | 'text'>('ussd');
  const [copiedUssd, setCopiedUssd] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PaymentSettingsConfig>;
      if (customEvent.detail) {
        setPaymentConfig(customEvent.detail);
      }
    };
    window.addEventListener('upmizik_payment_settings_changed', handleUpdate);
    return () => window.removeEventListener('upmizik_payment_settings_changed', handleUpdate);
  }, []);

  const exchangeRate = paymentConfig.htgExchangeRate || HTG_RATE;
  const activeMethods = paymentConfig.methods.filter(m => m.isActive);

  // Keep selected method valid with active methods list
  useEffect(() => {
    if (activeMethods.length > 0) {
      if (!selectedMethodId || !activeMethods.some(m => m.id === selectedMethodId)) {
        setSelectedMethodId(activeMethods[0].id);
      }
    } else {
      setSelectedMethodId('');
    }
  }, [activeMethods, selectedMethodId]);

  const handleCopyNumber = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedMethodId(id);
    setSelectedMethodId(id);
    setTimeout(() => setCopiedMethodId(null), 2000);
  };

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsSuccess(false);
      setSubmittedDonationSummary(null);
      setProofFile(null);
      setProofPreviewUrl('');
      setErrorMsg('');
      onClose();
    }, 240);
  };

  const handleRemoveProof = () => {
    setProofFile(null);
    setProofPreviewUrl('');
  };

  // Reset proof, error, and success state whenever a new music/artist is opened for support
  useEffect(() => {
    if (music) {
      modalContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setErrorMsg('');
      setIsSuccess(false);
      setIsClosing(false);
      setIsLoading(false);
      setProofFile(null);
      setProofPreviewUrl('');
      // Load saved donor name and phone if present
      try {
        const savedName = localStorage.getItem('upmizik_saved_donor_name');
        const savedPhone = localStorage.getItem('upmizik_saved_donor_phone');
        if (savedName && !donorName) setDonorName(savedName);
        if (savedPhone && !donorPhone) setDonorPhone(savedPhone);
      } catch {}
    }
  }, [music]);

  // Auto-close modal after successful donation with a 20-second countdown
  useEffect(() => {
    if (!isSuccess) return;

    setCountdownSeconds(20);
    const intervalTimer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalTimer);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalTimer);
    };
  }, [isSuccess]);

  if (!music) return null;

  const currentAmountNumber = selectedAmount === 'custom' ? parseFloat(customAmount) || 0 : selectedAmount;
  const amountInHtg = Math.round(currentAmountNumber * exchangeRate);
  const artistCut = (currentAmountNumber * 0.85).toFixed(2);
  const artistCutHtg = Math.round(currentAmountNumber * 0.85 * exchangeRate);

  const handleSelectPreset = (amt: number | 'custom') => {
    setSelectedAmount(amt);
    const newHearts = createHeartBurst(4, 50, 60);
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 1400);
  };

  const selectedMethodObj = activeMethods.find(m => m.id === selectedMethodId) || activeMethods[0];
  const rawAccountNumber = selectedMethodObj?.accountNumberOrId || selectedMethodObj?.accountNumber || '';
  const cleanPhone = rawAccountNumber.replace(/[^0-9]/g, '');

  const getUssdCode = (): string => {
    if (!selectedMethodObj) return '';
    const type = selectedMethodObj.type || '';
    const nameLower = (selectedMethodObj.name || '').toLowerCase();
    if (type === 'moncash' || nameLower.includes('moncash')) {
      return cleanPhone ? `*202*46*${cleanPhone}*${amountInHtg}#` : '*202#';
    } else if (type === 'natcash' || nameLower.includes('natcash')) {
      return cleanPhone ? `*133*1*${cleanPhone}*${amountInHtg}#` : '*133#';
    }
    return cleanPhone || rawAccountNumber;
  };

  const getQrCodePayload = (): string => {
    if (!selectedMethodObj) return 'UPMIZIK';
    if (qrFormat === 'ussd') {
      return getUssdCode();
    } else if (qrFormat === 'phone') {
      return cleanPhone ? `tel:${cleanPhone}` : rawAccountNumber;
    } else {
      return `UPMIZIK DONASYON\nMwayen: ${selectedMethodObj.name}\nDestinatè: ${selectedMethodObj.accountHolderName || 'UpMizik'} (${rawAccountNumber})\nMontan: ${amountInHtg.toLocaleString('en-US')} HTG ($${currentAmountNumber} USD)\nAtis: ${music?.artistName || ''}\nMizik: ${music?.title || ''}`;
    }
  };

  const handleCopyUssd = () => {
    const ussd = getUssdCode();
    if (!ussd) return;
    navigator.clipboard.writeText(ussd);
    setCopiedUssd(true);
    setTimeout(() => setCopiedUssd(false), 2000);
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById('upmizik-support-qrcode') as unknown as SVGSVGElement | null;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 420;
      canvas.height = 500;
      if (ctx) {
        // Dark background
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header border & accent
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

        // Brand & Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`UPMIZIK • ${selectedMethodObj?.name || 'Sipò Atis'}`, canvas.width / 2, 46);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`Pou: ${music?.artistName || 'Atis'}`, canvas.width / 2, 70);

        // White QR container card
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(50, 90, 320, 320, 16);
        } else {
          ctx.rect(50, 90, 320, 320);
        }
        ctx.fill();

        // Draw QR inside
        ctx.drawImage(img, 65, 105, 290, 290);

        // Footer info
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${amountInHtg.toLocaleString('en-US')} HTG ($${currentAmountNumber} USD)`, canvas.width / 2, 436);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${rawAccountNumber} • ${selectedMethodObj?.accountHolderName || 'Ofisyèl UpMizik'}`, canvas.width / 2, 458);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText('Eskane ak kamera oswa MonCash/NatCash pou voye sipò w la', canvas.width / 2, 478);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `UpMizik_QR_${(selectedMethodObj?.name || 'Don').replace(/\s+/g, '_')}_${amountInHtg}HTG.png`;
        downloadLink.href = pngUrl;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      try {
        const compressed = await compressAndReadFile(file, 800, 1000, 0.72);
        setProofPreviewUrl(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (ev) => setProofPreviewUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (currentAmountNumber <= 0) {
      setErrorMsg('Tanpri chwazi oubyen antre yon montan valab.');
      return;
    }
    if (!donorName.trim()) {
      setErrorMsg('Tanpri antre non ou.');
      return;
    }
    if (!donorPhone.trim()) {
      setErrorMsg('Tanpri antre nimewo telefòn ou pou konfimasyon.');
      return;
    }
    if (!proofPreviewUrl) {
      setErrorMsg('Tanpri telechaje foto prèv transfè Moncash oubyen Natcash la.');
      return;
    }

    setIsLoading(true);

    // Save donor credentials for future repeat donations
    try {
      localStorage.setItem('upmizik_saved_donor_name', donorName.trim());
      localStorage.setItem('upmizik_saved_donor_phone', donorPhone.trim());
    } catch {}

    // Fast packaging & dispatch to admin board
    setTimeout(() => {
      setIsLoading(false);

      const selectedMethodObj = activeMethods.find(m => m.id === selectedMethodId) || activeMethods[0];
      const paymentMethodLabel = selectedMethodObj
        ? `${selectedMethodObj.name} (${selectedMethodObj.accountNumberOrId || selectedMethodObj.accountNumber || ''})`
        : 'Natcash/Moncash';

      const donationData = {
        musicId: music.id,
        musicTitle: music.title,
        artistId: music.artistId,
        artistName: music.artistName,
        amount: currentAmountNumber,
        currency,
        donorName: donorName.trim(),
        donorPhone: donorPhone.trim(),
        paymentMethod: paymentMethodLabel,
        proofUrl: proofPreviewUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80'
      };

      const newDonationItem: DonationItem = {
        id: `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        musicId: music.id,
        musicTitle: music.title,
        artistId: music.artistId,
        artistName: music.artistName,
        amount: currentAmountNumber,
        currency,
        donorName: donorName.trim(),
        donorPhone: donorPhone.trim(),
        paymentMethod: paymentMethodLabel,
        proofUrl: proofPreviewUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80',
        status: 'pending',
        createdAt: new Date().toISOString(),
        artistShare: parseFloat((currentAmountNumber * 0.85).toFixed(2)),
        platformShare: parseFloat((currentAmountNumber * 0.15).toFixed(2))
      };

      // Save immediately to local storage & Firestore
      StorageService.addDonation(newDonationItem);
      HostingerService.saveSingleDonation(newDonationItem);

      if (typeof onConfirmSupport === 'function') {
        onConfirmSupport(newDonationItem);
      } else if (typeof onSubmitDonation === 'function') {
        onSubmitDonation(donationData);
      }

      // Save summary and activate thank-you screen
      setSubmittedDonationSummary({
        amount: currentAmountNumber,
        amountHtg: amountInHtg,
        artistName: music.artistName,
        musicTitle: music.title,
        donorName: donorName.trim()
      });
      setIsSuccess(true);

      // Clean proof image so subsequent donations require fresh proof
      setProofFile(null);
      setProofPreviewUrl('');

      // Trigger celebratory floating hearts burst
      const celebratoryBurst = createHeartBurst(12, 50, 40);
      setFloatingHearts((prev) => [...prev, ...celebratoryBurst]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => !celebratoryBurst.some((nh) => nh.id === h.id)));
      }, 2500);
    }, 300);
  };

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-[80] overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-4">
        <div className={`relative w-full max-w-lg bg-[#0a0f1d]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-8 shadow-2xl my-auto backdrop-blur-2xl overflow-hidden max-h-[92dvh] overflow-y-auto ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}>
        {/* Floating Hearts Container */}
        <FloatingHearts hearts={floatingHearts} />
        
        {/* Close Button */}
        <button
          id="close-support-modal-btn"
          onClick={handleClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-6 sm:py-8 text-center space-y-5 animate-scaleUp">
            {/* Animated Celebration Icon */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 border border-emerald-400/40">
                <CheckCircle className="w-10 h-10 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-bold">
                <Heart className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> Sipò Anrejistre!
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-['Cabinet_Grotesk',sans-serif] tracking-tight">
                Mèsi Anpil, {submittedDonationSummary?.donorName || donorName || 'Zanmi'}!
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Prèv transfè ou a anrejistre avèk siksè pou atis <strong className="text-yellow-400 underline decoration-yellow-400/50">{submittedDonationSummary?.artistName || music.artistName}</strong> sou moso <span className="text-slate-100 italic">"{submittedDonationSummary?.musicTitle || music.title}"</span>.
              </p>
            </div>

            {/* Donation Summary Pill Card */}
            <div className="bg-[#05070a]/90 border border-emerald-500/30 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.08]">
                <span className="text-slate-400 font-medium">Montan Sipò a:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  ${submittedDonationSummary?.amount || currentAmountNumber} USD <span className="text-slate-400 font-normal text-xs">(~{(submittedDonationSummary?.amountHtg || amountInHtg).toLocaleString('en-US')} Goud)</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.08]">
                <span className="text-slate-400 font-medium">Atis Benefisyè:</span>
                <span className="font-bold text-white">
                  {submittedDonationSummary?.artistName || music.artistName} (85%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 text-center pt-1">
                Administrasyon UpMizik ap verifye prèv transfè a kounye a epi kredite lajan an dirèkteman sou balans atis la.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-sm mx-auto">
              <button
                id="btn-close-success-support"
                type="button"
                onClick={handleClose}
                className="w-full sm:flex-1 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                Dakò, Fèmen Fenèt la ({countdownSeconds}s)
              </button>

              <button
                id="btn-donate-again-support"
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setProofFile(null);
                  setProofPreviewUrl('');
                  setErrorMsg('');
                }}
                className="w-full sm:flex-1 py-3 rounded-xl font-bold text-xs bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.12] transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <HeartHandshake className="w-4 h-4 text-yellow-400" />
                <span>Fè Yon Lòt Don</span>
              </button>
            </div>

            {/* Countdown timer & visual indicator */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full max-w-xs mx-auto bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, (countdownSeconds / 20) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 select-none flex items-center justify-center gap-1">
                <span>Fenèt la ap fèmen otomatikman nan</span>
                <strong className="text-emerald-400 font-mono font-bold">{countdownSeconds} segond</strong>
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-xl shadow-red-600/30 shrink-0 border border-red-500/30">
                <HeartHandshake className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">
                  Fè yon Sipò pou Atis la
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pou: <strong className="text-yellow-400">{music.title || `Pwofil Ofisyèl ${music.artistName}`}</strong> — <span className="text-slate-200">{music.artistName}</span>
                </p>
              </div>
            </div>

            {/* Step 1: Amount Selector */}
            <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[11px] font-bold">1</span>
                  <span>Chwazi Montan Sipò W:</span>
                </label>
                <span className="text-[10px] text-yellow-300/90 font-mono bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                  1 USD = {exchangeRate} HTG
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => handleSelectPreset(amt)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                      selectedAmount === amt
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400/60 shadow-lg shadow-blue-600/30'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08]'
                    }`}
                  >
                    <span className="text-sm font-black">${amt}</span>
                    <span className="text-[10px] font-mono text-yellow-300/90 font-normal">~{(amt * exchangeRate).toLocaleString()} G</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('custom')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold col-span-3 sm:col-span-1 transition-all flex flex-col items-center justify-center ${
                    selectedAmount === 'custom'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/60 shadow-lg shadow-blue-600/30'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08]'
                  }`}
                >
                  <span className="text-xs font-bold">Lòt Montan</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tape Pa W</span>
                </button>
              </div>

              {selectedAmount === 'custom' && (
                <div className="pt-1">
                  <input
                    id="custom-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={customAmount ?? ''}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Antre montan an Dola USD (egz: 15, 75...)"
                    className="w-full bg-[#03060c] border border-white/[0.15] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              )}

              {/* Dynamic Exchange Rate Multiplier & Transfer Amount Display */}
              {currentAmountNumber > 0 && (
                <div className="bg-black/50 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between gap-3 animate-fadeIn">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Montan kalkile pou transfè a:
                    </span>
                    <span className="text-lg sm:text-xl font-black text-yellow-400 font-mono tracking-wide">
                      {amountInHtg.toLocaleString('en-US')} <span className="text-xs font-bold text-slate-300">Goud (HTG)</span>
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ekivalan Dola:</span>
                    <span className="text-sm font-bold text-white font-mono">${currentAmountNumber.toFixed(2)} USD</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Dynamic Admin-Configured Payment Instructions Banner with QR Code Generator */}
            <div className="bg-gradient-to-r from-blue-950/70 via-slate-900/80 to-blue-950/70 border border-blue-500/30 rounded-2xl p-4 shadow-inner backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-blue-300">
                  <span className="w-5 h-5 rounded-lg bg-blue-500/30 text-blue-300 border border-blue-400/30 flex items-center justify-center text-[11px] font-bold">2</span>
                  <Smartphone className="w-4 h-4 text-yellow-400" />
                  <span>KONT PEMAN OFISYÈL UPMIZIK:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20 px-2.5 py-1 rounded-lg border border-yellow-400/30 transition-all flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showQrCode ? 'Kache Kòd QR' : 'Afiche Kòd QR'}</span>
                    {showQrCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {activeMethods.length === 0 ? (
                <div className="bg-red-500/10 rounded-xl p-3.5 border border-red-500/30 text-xs font-mono text-red-300 font-bold text-center space-y-1">
                  <p>⚠️ Mwayen peman yo tanporèman inaktif.</p>
                  <p className="text-[10px] text-slate-400 font-sans">Tanpri kontakte sipò UpMizik pou jwenn nimewo aktif pou voye lajan an.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Payment Methods Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeMethods.map((method) => {
                      const isCopied = copiedMethodId === method.id;
                      const isSelected = selectedMethodId === method.id;
                      const accNum = method.accountNumberOrId || method.accountNumber || '';
                      const accHolder = method.accountHolderName || method.accountName || '';
                      const badge = method.badgeText || method.badge || '';

                      return (
                        <div
                          key={method.id}
                          onClick={() => handleCopyNumber(accNum, method.id)}
                          className={`border rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all group shadow-md active:scale-[0.98] ${
                            isSelected
                              ? 'bg-[#0a1428] border-yellow-400 ring-2 ring-yellow-400/30 shadow-yellow-500/10'
                              : 'bg-[#05070a] hover:bg-[#091122] border-white/[0.12] hover:border-yellow-400/60'
                          }`}
                          title="Klike pou chwazi epi kopye nimewo a"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              method.type === 'moncash' ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm shadow-red-500/20' :
                              method.type === 'natcash' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/20' :
                              method.type === 'zelle' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' :
                              'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            }`}>
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-black text-white tracking-tight">{method.name}</span>
                                {badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 shrink-0">
                                    {badge}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Chwazi
                                  </span>
                                )}
                              </div>
                              
                              {/* Account Number Display */}
                              <div className="flex items-baseline gap-1.5 font-mono">
                                <span className="text-[10px] uppercase font-bold text-slate-400 select-none">Nimewo:</span>
                                <span className="text-xs sm:text-sm font-black text-yellow-300 tracking-wide select-all">
                                  {accNum}
                                </span>
                              </div>

                              {/* Account Holder Name Display */}
                              {accHolder && (
                                <div className="flex items-baseline gap-1.5 text-[11px] mt-0.5">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 select-none">Non sou kont:</span>
                                  <span className="text-white font-bold tracking-tight truncate">
                                    {accHolder}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`p-2 rounded-lg transition-all shrink-0 flex items-center justify-center ${
                              isCopied
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isSelected
                                ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                                : 'bg-white/[0.06] group-hover:bg-yellow-400/20 text-slate-300 group-hover:text-yellow-300 border border-white/[0.1]'
                            }`}
                            title={isCopied ? "Kopye!" : "Kopye nimewo a"}
                          >
                            {isCopied ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Kopye!</span>
                              </span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive QR Code Generator Section */}
                  {showQrCode && selectedMethodObj && (
                    <div className="bg-[#05070a]/95 border border-yellow-400/40 rounded-2xl p-4 shadow-xl relative overflow-hidden animate-fadeIn">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* QR Code Container */}
                        <div className="relative shrink-0 flex flex-col items-center">
                          <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-yellow-400 flex items-center justify-center relative group">
                            <QRCodeDisplay
                              id="upmizik-support-qrcode"
                              value={getQrCodePayload()}
                              size={148}
                              className="rounded-lg"
                            />
                            {/* Centered App Brand Indicator */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-7 h-7 rounded-lg bg-[#0a0f1d] border border-yellow-400 flex items-center justify-center shadow-md">
                                <Heart className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 animate-pulse" />
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-yellow-300 font-bold mt-2 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                            Eskane ak Telefòn Ou
                          </span>
                        </div>

                        {/* QR Details & Actions */}
                        <div className="flex-1 min-w-0 space-y-2.5 text-center md:text-left w-full">
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                            <span className="text-xs font-black text-white flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                              Jeneratè QR {selectedMethodObj.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Otomatik
                            </span>
                          </div>

                          {/* Details line */}
                          <div className="text-xs space-y-1 bg-black/40 border border-white/[0.08] rounded-xl p-2.5">
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Montan kalkile:</span>
                              <strong className="text-yellow-400 font-mono text-sm">
                                {amountInHtg.toLocaleString('en-US')} HTG <span className="text-slate-400 text-xs font-normal">(${currentAmountNumber} USD)</span>
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-slate-400 text-[11px]">
                              <span>Destinatè:</span>
                              <span className="text-white font-bold truncate max-w-[180px]">
                                {selectedMethodObj.accountHolderName || 'Ofisyèl UpMizik'} ({rawAccountNumber})
                              </span>
                            </div>
                          </div>

                          {/* Format Switcher */}
                          <div className="flex items-center justify-center md:justify-start gap-1 text-[10px]">
                            <span className="text-slate-400 font-medium">Fòma:</span>
                            <button
                              type="button"
                              onClick={() => setQrFormat('ussd')}
                              className={`px-2 py-0.5 rounded-lg font-mono font-bold transition-colors ${
                                qrFormat === 'ussd'
                                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                              }`}
                            >
                              ⚡ Kòd USSD
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrFormat('phone')}
                              className={`px-2 py-0.5 rounded-lg font-mono font-bold transition-colors ${
                                qrFormat === 'phone'
                                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                              }`}
                            >
                              📱 Nimewo
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrFormat('text')}
                              className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                                qrFormat === 'text'
                                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                              }`}
                            >
                              📋 Detay
                            </button>
                          </div>

                          {/* Fast Action Buttons */}
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={handleDownloadQr}
                              className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-yellow-500/20 active:scale-95 transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Telechaje Kòd QR</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleCopyUssd}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                                copiedUssd
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border-white/[0.12]'
                              }`}
                            >
                              {copiedUssd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedUssd ? 'Kòd Kopye!' : 'Kopye USSD'}</span>
                            </button>

                            {/* Mobile Quick Dial Button for MonCash/NatCash */}
                            {cleanPhone && (
                              <a
                                href={`tel:${encodeURIComponent(getUssdCode())}`}
                                className="px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                <span>Tape USSD</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center">
                Eskane kòd QR la oswa voye kòb la sou kont sa yo, pran yon foto (screenshot) prèv la, epi telechaje l anba a.
              </p>
            </div>

            {/* Step 3: Supporter Information & Proof Upload */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Non ak Siyati Ou *
                  </label>
                  <input
                    id="donor-name-input"
                    type="text"
                    required
                    value={donorName ?? ''}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="egz: Jean Baptiste"
                    className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nimewo Telefòn Ou (Moncash/Natcash) *
                  </label>
                  <input
                    id="donor-phone-input"
                    type="tel"
                    required
                    value={donorPhone ?? ''}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="+509 3X XX XXXX"
                    className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Proof Image Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telechaje Foto Prèv Transfè a (Screenshot) *
                </label>
                <div className="relative border-2 border-dashed border-white/[0.15] hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#05070a]/60 overflow-hidden">
                  <input
                    id="donation-proof-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Chwazi foto prèv transfè a"
                  />
                  {isProcessingImage ? (
                    <div className="py-4 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-yellow-400 animate-spin" />
                      <span className="text-xs text-yellow-300 font-medium">N ap prepare foto a...</span>
                    </div>
                  ) : proofPreviewUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3.5 p-1 relative z-20">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border-2 border-emerald-500 bg-black/60 shadow-lg group">
                        <img
                          src={proofPreviewUrl}
                          alt="Prèv Chaje"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white font-bold">
                          Prèv
                        </div>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 shrink-0" /> Foto prèv chaje avèk siksè
                        </p>
                        <p className="text-slate-300 text-[11px] mt-1 line-clamp-1">
                          {proofFile ? proofFile.name : 'Screenshot transfè'}
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          Admin an ap ka verifye foto sa a pou valide sipò w la.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRemoveProof}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-semibold transition-colors"
                          >
                            Chanje Foto
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <Upload className="w-8 h-8 text-blue-400 mb-1.5 animate-bounce" />
                      <span className="text-xs text-slate-200 font-semibold">
                        Klike oubyen glise foto screenshot transfè a isit
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Moncash / Natcash screenshot (PNG, JPG, JPEG)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button with Loading Spinner Effect */}
              <button
                id="submit-donation-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>N ap Anrejistre Sipò a...</span>
                  </>
                ) : (
                  <>
                    <HeartHandshake className="w-5 h-5" />
                    <span>Voye Prèv Sipò ${currentAmountNumber || 0}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        </div>
      </div>
    </div>
  );
};
