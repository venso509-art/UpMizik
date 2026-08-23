import React, { useState } from 'react';
import {
  Trophy,
  Disc,
  Award,
  Crown,
  Sparkles,
  CheckCircle,
  Truck,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { ArtistUser, MusicItem, DonationItem } from '../types';
import { calculateArtistAwards, AWARD_TIERS, AwardTierDefinition } from '../utils/awardsUtils';
import { OfficialCertificateModal } from './OfficialCertificateModal';

interface ArtistAwardsShowcaseProps {
  currentArtist: ArtistUser;
  artistSongs: MusicItem[];
  donations: DonationItem[];
  exchangeRate?: number;
}

export const ArtistAwardsShowcase: React.FC<ArtistAwardsShowcaseProps> = ({
  currentArtist,
  artistSongs,
  donations,
  exchangeRate = 145.0
}) => {
  const [selectedAwardForCert, setSelectedAwardForCert] = useState<AwardTierDefinition | null>(null);

  const awardSummary = calculateArtistAwards(
    currentArtist,
    artistSongs,
    donations,
    exchangeRate
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a0f1d] via-[#11192e] to-[#0a0f1d] border border-yellow-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span>PALMARÈS OFISYÈL & DISTENKSYON FIZIK</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
              Plak Lò, Platin & Twofe Donasyon
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Lè w atenn objektif ekout ak donasyon yo sou <strong className="text-yellow-400">UpMizik</strong>, administrasyon an fabrike epi remèt ou plak ak twofe fizik pou rekonèt travay ou ak siksè w!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-black/60 border border-white/[0.12] rounded-2xl p-4 text-center min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Twofe & Plak</span>
              <span className="text-2xl font-black text-yellow-400 font-mono">
                {awardSummary.unlockedAwardsCount} / {AWARD_TIERS.length}
              </span>
            </div>

            <div className="bg-black/60 border border-white/[0.12] rounded-2xl p-4 text-center min-w-[130px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Ekout</span>
              <span className="text-xl font-black text-white font-mono">
                {awardSummary.totalListens.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Cards: Streams & Donations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Streams Progress */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-4 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Disc className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Objektif Ekout (Streams)</h3>
                <p className="text-xs text-slate-400">50k (Disque d'Or) • 200k (Disque Platine)</p>
              </div>
            </div>
            <span className="font-mono text-sm font-black text-amber-300">
              {awardSummary.totalListens.toLocaleString()} ekout
            </span>
          </div>

          {awardSummary.nextStreamTarget ? (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Pwochen Palier: <strong className="text-white">{awardSummary.nextStreamTarget.target.title}</strong>
                </span>
                <span className="font-mono font-bold text-yellow-400">
                  {awardSummary.nextStreamTarget.remaining.toLocaleString()} ekout rete ({awardSummary.nextStreamTarget.progressPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/[0.1] p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-lg shadow-yellow-500/50"
                  style={{ width: `${Math.min(100, awardSummary.nextStreamTarget.progressPct)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-200">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Felisitasyon! Ou atenn pi gwo nivo ekout la (Disque de Platine)!</span>
            </div>
          )}
        </div>

        {/* Donations Progress */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-4 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Objektif Twofe Donasyon</h3>
                <p className="text-xs text-slate-400">$500 (N1) • $1.5k (N2) • $5k (N3) • $10k (N4)</p>
              </div>
            </div>
            <span className="font-mono text-sm font-black text-emerald-400">
              ${awardSummary.totalDonationsUsd.toFixed(2)} USD
            </span>
          </div>

          {awardSummary.nextTrophyTarget ? (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Pwochen Palier: <strong className="text-white">{awardSummary.nextTrophyTarget.target.title}</strong>
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  ${awardSummary.nextTrophyTarget.remainingUsd.toFixed(2)} USD rete ({awardSummary.nextTrophyTarget.progressPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/[0.1] p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-yellow-400 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/50"
                  style={{ width: `${Math.min(100, awardSummary.nextTrophyTarget.progressPct)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-fuchsia-950/40 border border-fuchsia-500/30 flex items-center gap-2.5 text-xs text-fuchsia-200">
              <Crown className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <span>Felisitasyon! Ou se yon lejann, ou atenn Twofe Nivo 4 Dyamant!</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of All Award Tiers */}
      <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-6 backdrop-blur-xl shadow-xl">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <span>Katalòg Twofe & Plak Fizik UpMizik</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gade tout distenksyon ou debloke ak estati livrezon fizik yo pa administrasyon an.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AWARD_TIERS.map((tier) => {
            const isUnlocked = awardSummary.unlockedAwards.some((a) => a.type === tier.type);
            const delivery = awardSummary.deliveryRecords[tier.type];
            const deliveryStatus = delivery?.deliveryStatus || 'pending';

            return (
              <div
                key={tier.type}
                className={`relative rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                  isUnlocked
                    ? `${tier.badgeBg} ${tier.badgeBorder} shadow-xl ${tier.glowShadow}`
                    : 'bg-[#05070a]/60 border-white/[0.06] opacity-60'
                }`}
              >
                {/* Unlocked Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg ${
                      isUnlocked
                        ? 'bg-black/50 border border-white/[0.15]'
                        : 'bg-white/[0.04] border border-white/[0.06] text-slate-600'
                    }`}
                  >
                    {tier.iconName === 'disc' && <Disc className={`w-6 h-6 ${isUnlocked ? tier.badgeText : 'text-slate-600'}`} />}
                    {tier.iconName === 'trophy' && <Trophy className={`w-6 h-6 ${isUnlocked ? tier.badgeText : 'text-slate-600'}`} />}
                    {tier.iconName === 'crown' && <Crown className={`w-6 h-6 ${isUnlocked ? tier.badgeText : 'text-slate-600'}`} />}
                    {tier.iconName === 'award' && <Award className={`w-6 h-6 ${isUnlocked ? tier.badgeText : 'text-slate-600'}`} />}
                  </div>

                  {isUnlocked ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>DEBLOKE</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                      Objektif: {tier.thresholdFormatted}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <h4 className={`text-base font-black ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                    {tier.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                {/* Physical Delivery Tracker or Locked Info */}
                <div className="pt-3 border-t border-white/[0.08] space-y-2">
                  {isUnlocked ? (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-yellow-400" />
                          <span>Livrezon Fizik:</span>
                        </span>
                        {deliveryStatus === 'delivered' && (
                          <span className="font-bold text-emerald-400">✅ Remèt an Men</span>
                        )}
                        {deliveryStatus === 'ready' && (
                          <span className="font-bold text-cyan-300">📦 Pare pou Livrezon</span>
                        )}
                        {deliveryStatus === 'in_production' && (
                          <span className="font-bold text-yellow-400">🔨 Nan Pwodiksyon</span>
                        )}
                        {deliveryStatus === 'pending' && (
                          <span className="font-bold text-amber-300">⏳ Ap Trete pa Admin</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedAwardForCert(tier)}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white/[0.1] hover:bg-white/[0.2] text-white flex items-center justify-center gap-1.5 transition-all border border-white/[0.12] active:scale-95"
                      >
                        <Printer className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Gade Sètifika Ofisyèl</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">
                      Objektif pou rive: {tier.thresholdFormatted}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Certificate Viewer & PDF Download / Edit Modal */}
      {selectedAwardForCert && (
        <OfficialCertificateModal
          initialArtistStageName={currentArtist.stageName}
          initialArtistRealName={currentArtist.name || currentArtist.stageName}
          initialAward={selectedAwardForCert}
          defaultSignerName="Clauvens Venso"
          defaultSignerTitle="Prezidan & Fondatè UpMizik"
          onClose={() => setSelectedAwardForCert(null)}
        />
      )}
    </div>
  );
};
