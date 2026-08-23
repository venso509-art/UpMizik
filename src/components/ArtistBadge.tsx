import React, { useState } from 'react';
import {
  Sparkles,
  Star,
  Crown,
  Gem,
  CheckCircle2,
  HelpCircle,
  X,
  TrendingUp,
  ShieldCheck,
  HeartHandshake
} from 'lucide-react';
import { ArtistBadgeInfo, getBadgeByDonations } from '../utils/badgeSystem';

interface ArtistBadgeProps {
  badge?: ArtistBadgeInfo;
  donations?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  interactive?: boolean;
  className?: string;
}

export const ArtistBadge: React.FC<ArtistBadgeProps> = ({
  badge: propBadge,
  donations,
  size = 'sm',
  showLabel = true,
  interactive = true,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showExplainerModal, setShowExplainerModal] = useState(false);

  const badge = propBadge || getBadgeByDonations(donations ?? 0);

  const renderIcon = (iconSize: string) => {
    switch (badge.iconType) {
      case 'gem':
        return <Gem className={`${iconSize} text-amber-300 fill-amber-300/30 animate-pulse`} />;
      case 'crown':
        return <Crown className={`${iconSize} text-cyan-300 fill-cyan-300/30`} />;
      case 'star':
        return <Star className={`${iconSize} text-yellow-300 fill-yellow-300/40`} />;
      case 'sparkle':
      default:
        return <Sparkles className={`${iconSize} text-slate-300`} />;
    }
  };

  // Size styling maps
  const sizeMap = {
    xs: {
      padding: 'px-1.5 py-0.5',
      text: 'text-[9px]',
      icon: 'w-2.5 h-2.5',
      gap: 'gap-1'
    },
    sm: {
      padding: 'px-2 py-0.5',
      text: 'text-[10px]',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    md: {
      padding: 'px-2.5 py-1',
      text: 'text-xs',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1.5'
    },
    lg: {
      padding: 'px-3.5 py-1.5',
      text: 'text-sm font-black',
      icon: 'w-4 h-4',
      gap: 'gap-2'
    }
  };

  const currentSize = sizeMap[size] || sizeMap.sm;

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    setShowExplainerModal(true);
  };

  return (
    <>
      <span
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center ${currentSize.gap} ${currentSize.padding} rounded-lg border font-bold uppercase tracking-wider transition-all duration-200 ${
          badge.bgClass
        } ${badge.borderClass} ${badge.colorClass} ${
          interactive ? 'cursor-pointer hover:scale-105 active:scale-95 hover:shadow-lg ' + badge.glowClass : ''
        } ${className}`}
        title={`${badge.label}: ${badge.description} (Klike pou detay)`}
      >
        {renderIcon(currentSize.icon)}
        {showLabel && <span className={currentSize.text}>{badge.shortLabel}</span>}
      </span>

      {/* Interactive Explainer Modal if clicked */}
      {showExplainerModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            setShowExplainerModal(false);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div
              className="relative w-full max-w-md bg-[#0a0f1d] border border-white/[0.15] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-2xl border ${badge.bgClass} ${badge.borderClass}`}>
                    {renderIcon('w-6 h-6')}
                  </div>
                  <div>
                    <h3 className={`text-base font-black ${badge.colorClass}`}>
                      Sistèm Badj Verifye: {badge.label}
                    </h3>
                    <p className="text-[11px] text-slate-400">Konfyans ak Rekonesans Kominote</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExplainerModal(false)}
                  className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Badge Trust Explanation */}
              <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Ki sa badj sa a vle di?</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-[11px] text-yellow-300/90 font-medium">
                  {badge.trustStatement}
                </div>
              </div>

              {/* Next Tier Progress Bar if applicable */}
              {badge.nextTierMinDonations && (
                <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Pwochen Nivo:</span>
                    <span className="font-bold text-white">{badge.nextTierLabel}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-cyan-400 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(10, (((donations || 0) - badge.minDonations) / (badge.nextTierMinDonations - badge.minDonations)) * 100)
                        )}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>${donations ? donations.toFixed(0) : badge.minDonations} donasyon</span>
                    <span>Objektif: ${badge.nextTierMinDonations}</span>
                  </div>
                </div>
              )}

              {/* Explaining how to support */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-yellow-950/20 border border-yellow-500/20 p-3 rounded-xl">
                <HeartHandshake className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>Chak sipò MonCash oswa Natcash ou fè ede atis sa a monte nan pi wo nivo badj!</span>
              </div>

              <button
                onClick={() => setShowExplainerModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Mwen Konprann
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
