import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle, Disc, RefreshCw, CheckCircle2, ChevronRight, X, ListMusic } from 'lucide-react';
import { offlineManager } from '../utils/offlineManager';

interface OfflineBannerProps {
  cachedSongsCount: number;
  onFilterOfflineTracks: () => void;
  onOpenOfflineModal?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  cachedSongsCount,
  onFilterOfflineTracks,
  onOpenOfflineModal
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isIntermittent, setIsIntermittent] = useState<boolean>(false);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    let wasOffline = false;

    const unsubscribe = offlineManager.onNetworkChange((online, intermittent) => {
      setIsOnline(online);
      setIsIntermittent(intermittent);

      if (online && !intermittent) {
        if (wasOffline) {
          setShowReconnected(true);
          const timer = setTimeout(() => setShowReconnected(false), 4500);
          wasOffline = false;
          return () => clearTimeout(timer);
        }
      } else {
        wasOffline = true;
        setDismissed(false); // Re-show if connection drops
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRetryPing = async () => {
    setIsChecking(true);
    await offlineManager.checkRealConnectivity();
    setTimeout(() => setIsChecking(false), 800);
  };

  // Reconnection success banner
  if (showReconnected) {
    return (
      <div className="w-full bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 px-4 py-2.5 backdrop-blur-md transition-all animate-slideDown z-40 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Koneksyon Retabli!</strong> Ou tounen an liy sou UpMizik. Tout mizik ak fonksyon disponib nòmalman.
            </span>
          </div>
          <button
            onClick={() => setShowReconnected(false)}
            className="text-emerald-400 hover:text-emerald-200 p-1 rounded-lg hover:bg-emerald-900/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // If online and not intermittent, or manually dismissed, render nothing
  if ((isOnline && !isIntermittent) || dismissed) {
    return null;
  }

  return (
    <div className={`w-full border-b backdrop-blur-md px-4 py-2.5 transition-all animate-slideDown z-40 relative ${
      !isOnline 
        ? 'bg-amber-950/90 border-amber-500/40 text-amber-200' 
        : 'bg-yellow-950/90 border-yellow-500/40 text-yellow-200'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
        
        {/* Status Message */}
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}

          <div>
            <p className="font-bold leading-tight">
              {!isOnline
                ? 'Mòd San Entènèt Aktif (Oflayn)'
                : 'Koneksyon Entènèt la Enstab / Pral koupe'}
            </p>
            <p className="text-[11px] opacity-90 leading-tight">
              {!isOnline
                ? `Pa gen pwoblèm! Grasa Service Worker UpMizik la, ${cachedSongsCount > 0 ? `${cachedSongsCount} mizik ou te koute yo pare pou jwe san entènèt` : 'kontni debaz la ap toujou fonksyone'}.`
                : 'UpMizik ap itilize kach lokal la pou asire mizik ou yo kontinye jwe san enteripsyon.'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {onOpenOfflineModal && (
            <button
              id="offline-banner-open-playlists-btn"
              onClick={onOpenOfflineModal}
              className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <ListMusic className="w-3.5 h-3.5 text-blue-300" />
              <span>Playlist Oflayn</span>
            </button>
          )}

          {cachedSongsCount > 0 && (
            <button
              id="offline-banner-view-cached-btn"
              onClick={onFilterOfflineTracks}
              className="px-3 py-1.5 rounded-xl bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Disc className="w-3.5 h-3.5 text-yellow-300 animate-spin-slow" />
              <span>Mizik Oflayn Yo ({cachedSongsCount})</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={handleRetryPing}
            disabled={isChecking}
            className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors"
            title="Teste koneksyon an ankò"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-xl hover:bg-white/[0.1] text-amber-300/80 hover:text-amber-200 transition-colors"
            title="Fèmen notifikasyon an"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
