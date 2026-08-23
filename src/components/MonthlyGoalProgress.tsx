import React, { useState, useMemo } from 'react';
import { ArtistUser, MusicItem } from '../types';
import {
  ArtistBadgeInfo,
  TIER_THRESHOLDS,
  getBadgeByDonations,
  calculateArtistTotalDonations
} from '../utils/badgeSystem';
import {
  Target,
  Trophy,
  Sparkles,
  Star,
  Crown,
  Gem,
  CheckCircle2,
  Calendar,
  TrendingUp,
  ArrowRight,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Clock,
  HeartHandshake,
  FileText,
  Download,
  Loader2
} from 'lucide-react';

interface MonthlyGoalProgressProps {
  currentArtist: ArtistUser;
  artistSongs: MusicItem[];
  badgeInfo: ArtistBadgeInfo;
  onOpenSocial?: () => void;
  onShareLink?: (text: string) => void;
  onDownloadPortfolio?: () => void;
  isGeneratingPdf?: boolean;
}

export const MonthlyGoalProgress: React.FC<MonthlyGoalProgressProps> = ({
  currentArtist,
  artistSongs,
  badgeInfo,
  onOpenSocial,
  onShareLink,
  onDownloadPortfolio,
  isGeneratingPdf
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  // Total cumulative donations
  const totalDonations = useMemo(() => {
    return calculateArtistTotalDonations(currentArtist, artistSongs);
  }, [currentArtist, artistSongs]);

  // Next tier calculations
  const nextTierMin = badgeInfo.nextTierMinDonations;
  const currentTierMin = badgeInfo.minDonations;
  const isMaxTier = nextTierMin === null;

  // Percentage to next threshold
  const progressPercent = useMemo(() => {
    if (isMaxTier) return 100;
    const range = nextTierMin - currentTierMin;
    const currentProgress = totalDonations - currentTierMin;
    const pct = Math.min(100, Math.max(5, (currentProgress / range) * 100));
    return Number(pct.toFixed(1));
  }, [totalDonations, currentTierMin, nextTierMin, isMaxTier]);

  const amountRemaining = useMemo(() => {
    if (isMaxTier || !nextTierMin) return 0;
    return Math.max(0, nextTierMin - totalDonations);
  }, [totalDonations, nextTierMin, isMaxTier]);

  // Days left in current month calculation
  const daysLeftInMonth = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(1, lastDayOfMonth.getDate() - now.getDate());
  }, []);

  const currentMonthName = useMemo(() => {
    const monthsHaitian = [
      'Janvye', 'Fevriye', 'Mas', 'Avril', 'Me', 'Jen',
      'Jiyè', 'Out', 'Septanm', 'Oktòb', 'Novanm', 'Desanm'
    ];
    return monthsHaitian[new Date().getMonth()];
  }, []);

  // Milestones definition
  const milestones = [
    {
      tier: 'emerging',
      title: 'Nouvo',
      threshold: TIER_THRESHOLDS.EMERGING,
      icon: Sparkles,
      color: 'text-slate-300',
      activeBorder: 'border-slate-400',
      bg: 'bg-slate-800/80',
      perk: 'Enskripsyon & Badj debaz'
    },
    {
      tier: 'rising-star',
      title: 'Rising Star',
      threshold: TIER_THRESHOLDS.RISING_STAR,
      icon: Star,
      color: 'text-yellow-400',
      activeBorder: 'border-yellow-400',
      bg: 'bg-yellow-500/20',
      perk: 'Badj zetwal + Dekouvèt RPA'
    },
    {
      tier: 'pro',
      title: 'Atis Pro',
      threshold: TIER_THRESHOLDS.PRO,
      icon: Crown,
      color: 'text-cyan-400',
      activeBorder: 'border-cyan-400',
      bg: 'bg-cyan-500/20',
      perk: 'Kowòn Pro + Top 3 Spotlight'
    },
    {
      tier: 'elite',
      title: 'Atis Elit',
      threshold: TIER_THRESHOLDS.ELITE,
      icon: Gem,
      color: 'text-amber-300',
      activeBorder: 'border-amber-400',
      bg: 'bg-amber-500/20',
      perk: 'Badj dyaman + Rekòmandasyon VIP'
    }
  ];

  const handleCopyArtistLink = () => {
    const link = `https://upmizik.com/atis/${currentArtist.id}`;
    navigator.clipboard.writeText(
      `Sipòte mizik mwen sou UpMizik pou ede m atenn objektif mwa sa a! Klike la: ${link}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Estimated fans needed simulator
  const estimatedAvgDonations = 5; // $5 USD average
  const fansNeeded = Math.ceil(amountRemaining / estimatedAvgDonations);

  return (
    <div className="relative bg-gradient-to-br from-[#0c162e] via-[#091021] to-[#150f29] border-2 border-yellow-500/30 hover:border-yellow-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-2xl transition-all animate-fadeIn">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title & Monthly Badge */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-yellow-500/20 shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Objektif Mwa {currentMonthName} & Pwochen Nivo Verifye
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> {daysLeftInMonth} jou ki rete nan mwa a
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Suiv pwogresyon donasyon kominote a pou debloke nouvo badj verifye ak avantaj kwasans.
            </p>
          </div>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-black/40 px-3.5 py-2 rounded-2xl border border-white/[0.08] backdrop-blur-md">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Nivo Aktyèl</span>
            <span className={`text-xs font-black ${badgeInfo.colorClass}`}>{badgeInfo.label}</span>
          </div>
          <div className={`p-2 rounded-xl border ${badgeInfo.bgClass} ${badgeInfo.borderClass}`}>
            <ShieldCheck className={`w-4 h-4 ${badgeInfo.colorClass}`} />
          </div>
        </div>
      </div>

      {/* Main Dynamic Progress Bar Section */}
      <div className="relative z-10 my-6 space-y-3">
        {/* Progress Bar Metrics header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Total Donasyon Kimile Resevwa:
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                ${totalDonations.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-400 font-mono">
                / {isMaxTier ? '$750+ (Elit)' : `$${nextTierMin} USD`}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-400 block">
              {isMaxTier ? 'Akisiyon Maksimòm' : `Manke pou ${badgeInfo.nextTierLabel}:`}
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {isMaxTier ? '🎉 Nivo Konplè' : `$${amountRemaining.toFixed(2)} USD`}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar Track with Glow & Percent Badge */}
        <div className="relative w-full h-5 bg-[#050811] rounded-full p-1 border border-white/[0.1] overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-700 shadow-lg shadow-yellow-500/30 relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Animated shine line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>

        {/* Progress percent label and subtext */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-yellow-400 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-yellow-400" />
            <span>{progressPercent}% Konplete</span>
          </span>

          {!isMaxTier && (
            <span className="text-slate-400">
              Objektif: <strong>{badgeInfo.nextTierLabel}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 4-Step Milestone Nodes Timeline */}
      <div className="relative z-10 pt-2 pb-6 border-b border-white/[0.08]">
        <span className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4 block">
          Echèl Nivo Verifye & Avantaj UpMizik:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {milestones.map((m, idx) => {
            const Icon = m.icon;
            const isAchieved = totalDonations >= m.threshold;
            const isCurrent =
              totalDonations >= m.threshold &&
              (idx === milestones.length - 1 || totalDonations < milestones[idx + 1].threshold);

            return (
              <div
                key={m.tier}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-gradient-to-b from-yellow-500/15 to-[#0b1020] border-yellow-400/60 shadow-lg shadow-yellow-500/10 ring-1 ring-yellow-400/40'
                    : isAchieved
                    ? 'bg-white/[0.04] border-emerald-500/40 text-slate-200'
                    : 'bg-[#05070a]/70 border-white/[0.06] opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl ${m.bg} border border-white/[0.08]`}>
                      <Icon className={`w-4 h-4 ${m.color}`} />
                    </div>
                    {isAchieved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Atenn
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 bg-black/40 px-2 py-0.5 rounded-full">
                        ${m.threshold} USD
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{m.title}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-black bg-yellow-400 text-slate-950 px-1.5 py-0.2 rounded font-sans">
                        Aktyèl
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{m.perk}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Minimòm:</span>
                  <span className="font-bold text-slate-300">${m.threshold}.00</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fan Engagement & Accelerator Action Box */}
      <div className="relative z-10 mt-6 bg-[#050811]/90 border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {isMaxTier
                ? '🏆 Ou nan Nivo Siprèm Elit la!'
                : `Konsèy: Pataje Lyen w pou jwenn ${fansNeeded} sipò $5 ki manke yo`}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
              Fanatik yo sipòte plis atis ki pataje mizik yo regilyèman sou rezo sosyal yo ak sou UpMizik Social.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          {onDownloadPortfolio && (
            <button
              onClick={onDownloadPortfolio}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPdf ? 'Ap Jenere PDF...' : 'Telechaje Pòtfolyo PDF'}</span>
            </button>
          )}

          <button
            onClick={handleCopyArtistLink}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.1] flex items-center gap-1.5 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-yellow-400" />}
            <span>{copiedLink ? 'Lyen Kopye!' : 'Kopye Lyen Sipò'}</span>
          </button>

          {onOpenSocial && (
            <button
              onClick={onOpenSocial}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-950/40 flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Pataje sou UpMizik Social</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
