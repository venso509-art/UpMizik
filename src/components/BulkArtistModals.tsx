import React, { useState } from 'react';
import { ArtistUser } from '../types';
import {
  Ban,
  X,
  AlertTriangle,
  Calendar,
  Layers,
  CheckCircle,
  XCircle,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';

interface BulkArtistActionBarProps {
  selectedArtistIds: string[];
  totalVisibleCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkValidate: () => void;
  onOpenBulkSuspend: () => void;
  onBulkReactivate?: () => void;
  onOpenBulkReject?: () => void;
  showReject?: boolean;
  showReactivate?: boolean;
}

export const BulkArtistActionBar: React.FC<BulkArtistActionBarProps> = ({
  selectedArtistIds,
  totalVisibleCount,
  isAllSelected,
  onToggleSelectAll,
  onClearSelection,
  onBulkValidate,
  onOpenBulkSuspend,
  onBulkReactivate,
  onOpenBulkReject,
  showReject = false,
  showReactivate = false,
}) => {
  if (totalVisibleCount === 0) return null;

  const count = selectedArtistIds.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1d] border border-white/[0.08] p-3.5 rounded-2xl transition-all">
      {/* Left side: Select all & counter */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isAllSelected
              ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
              : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08]'
          }`}
          title={isAllSelected ? 'Deseleksyone tout atis yo' : 'Chwazi tout atis ki nan lis la'}
        >
          {isAllSelected ? (
            <>
              <CheckSquare className="w-4 h-4 text-yellow-400" />
              <span>Deseleksyone Tout ({totalVisibleCount})</span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4 text-slate-400" />
              <span>Chwazi Tout ({totalVisibleCount})</span>
            </>
          )}
        </button>

        {count > 0 && (
          <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-xl flex items-center gap-1.5 animate-fadeIn">
            <Layers className="w-3.5 h-3.5" />
            <span>{count} atis chwazi</span>
          </span>
        )}
      </div>

      {/* Right side: Action buttons */}
      {count > 0 && (
        <div className="flex items-center flex-wrap gap-2 animate-fadeIn">
          {/* Bulk Validate */}
          <button
            type="button"
            onClick={onBulkValidate}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title={`Valide kont ${count} atis chwazi yo`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Valide Tout ({count})</span>
          </button>

          {/* Bulk Suspend */}
          <button
            type="button"
            onClick={onOpenBulkSuspend}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title={`Sispann ${count} atis chwazi yo`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Sispann Tout ({count})</span>
          </button>

          {/* Bulk Reactivate (Optional) */}
          {showReactivate && onBulkReactivate && (
            <button
              type="button"
              onClick={onBulkReactivate}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              title={`Retire sispansyon pou ${count} atis chwazi yo`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Leve Sispansyon ({count})</span>
            </button>
          )}

          {/* Bulk Reject (Optional for pending tab) */}
          {showReject && onOpenBulkReject && (
            <button
              type="button"
              onClick={onOpenBulkReject}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              title={`Refize ${count} demand enskripsyon chwazi yo`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Refize Tout ({count})</span>
            </button>
          )}

          {/* Clear Selection */}
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 rounded-xl text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Anile seleksyon an"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

interface BulkArtistSuspendModalProps {
  isOpen: boolean;
  selectedArtists: ArtistUser[];
  onClose: () => void;
  onConfirm: (days: number, reason?: string) => void;
}

export const BulkArtistSuspendModal: React.FC<BulkArtistSuspendModalProps> = ({
  isOpen,
  selectedArtists,
  onClose,
  onConfirm,
}) => {
  const [suspensionDaysOption, setSuspensionDaysOption] = useState<number>(15);
  const [customSuspensionDays, setCustomSuspensionDays] = useState<string>('');
  const [suspensionReason, setSuspensionReason] = useState<string>(
    'Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la'
  );

  if (!isOpen || selectedArtists.length === 0) return null;

  const effectiveDays = customSuspensionDays.trim() !== ''
    ? Math.max(1, parseInt(customSuspensionDays) || 15)
    : suspensionDaysOption;

  const endDate = new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000);
  const formattedEndDate = endDate.toLocaleDateString('ht-HT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const reasonPresets = [
    'Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la',
    'Piblikasyon kontni san otorizasyon oswa fo prèv transfè',
    'Konpòtman ki pa konfòm ak etik kominote atis la',
    'Envestigasyon administratif an kour sou kont la'
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-4">
        <div
          className="relative max-w-lg w-full bg-[#0a0f1d]/95 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Sispansyon an Mas ({selectedArtists.length} Atis)</h3>
                <p className="text-xs text-slate-400">Bloke aksè tanporèman pou plizyè atis ansanm</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Artists Thumbnails Preview */}
          <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-3 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Atis ki pral sispann yo ({selectedArtists.length}):
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-h-24">
              {selectedArtists.map((art) => (
                <div
                  key={art.id}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-1.5 shrink-0"
                >
                  <img
                    src={art.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={art.stageName}
                    className="w-6 h-6 rounded-lg object-cover border border-white/10"
                  />
                  <span className="text-xs font-bold text-white whitespace-nowrap">{art.stageName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Chwazi Dire Sispansyon an:</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[15, 30, 45, 60, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setSuspensionDaysOption(days);
                    setCustomSuspensionDays('');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    suspensionDaysOption === days && !customSuspensionDays
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                  }`}
                >
                  {days} Jou
                </button>
              ))}
            </div>
            <div className="pt-1">
              <input
                type="number"
                min="1"
                max="365"
                placeholder="Oswa antre lòt kantite jou (egz: 120)..."
                value={customSuspensionDays ?? ''}
                onChange={(e) => setCustomSuspensionDays(e.target.value)}
                className="w-full bg-[#05070a] border border-white/[0.1] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none"
              />
            </div>
          </div>

          {/* End Date Preview */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-300">Dat Sispansyon an ap fini:</span>
            <span className="text-amber-300 font-bold font-mono">{formattedEndDate}</span>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Rezon Sispansyon an (ap afiche pou atis yo):</span>
            </label>
            <textarea
              rows={2}
              value={suspensionReason ?? ''}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="Eksplike rezon sispansyon an..."
              className="w-full bg-[#05070a] border border-white/[0.1] focus:border-amber-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {reasonPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSuspensionReason(preset)}
                  className="text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg border border-white/[0.06] transition-colors text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
            >
              Anile
            </button>
            <button
              type="button"
              onClick={() => onConfirm(effectiveDays, suspensionReason.trim() || undefined)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all"
            >
              <Ban className="w-4 h-4" />
              <span>Sispann {selectedArtists.length} Atis ({effectiveDays} Jou)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface BulkArtistRejectModalProps {
  isOpen: boolean;
  selectedArtists: ArtistUser[];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const BulkArtistRejectModal: React.FC<BulkArtistRejectModalProps> = ({
  isOpen,
  selectedArtists,
  onClose,
  onConfirm,
}) => {
  const [rejectReason, setRejectReason] = useState<string>(
    'Foto prèv transfè a pa klè oswa nimewo referans lan pa kowenside.'
  );

  if (!isOpen || selectedArtists.length === 0) return null;

  const presets = [
    'Foto prèv transfè a pa klè oswa nimewo referans lan pa kowenside.',
    'Kantite kòb ki transfere a pa kowenside ak frè enskripsyon $4.99 USD (~723.55 HTG).',
    'Nimewo telefòn MonCash/Natcash la pa valab oswa pa koresponn ak transfè a.',
    'Pwofil la manke enfòmasyon debaz ki obligatwa pou konfimasyon an.'
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-4">
        <div
          className="relative max-w-lg w-full bg-[#0a0f1d]/95 border border-red-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Refize Demand an Mas ({selectedArtists.length} Demand)</h3>
                <p className="text-xs text-slate-400">Voye yon rezon refi pou plizyè demand ansanm</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Artists Preview */}
          <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-3 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Demand ki pral refize yo ({selectedArtists.length}):
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-h-24">
              {selectedArtists.map((art) => (
                <div
                  key={art.id}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-1.5 shrink-0"
                >
                  <img
                    src={art.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80'}
                    alt={art.stageName}
                    className="w-6 h-6 rounded-lg object-cover border border-white/10"
                  />
                  <span className="text-xs font-bold text-white whitespace-nowrap">{art.stageName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200">
              Rezon Refi a (ap parèt sou kont atis la pou l ka voye yon lòt prèv):
            </label>
            <textarea
              rows={3}
              value={rejectReason ?? ''}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Antre rezon an..."
              className="w-full bg-[#05070a] border border-white/[0.1] focus:border-red-500 rounded-xl p-3 text-xs text-white outline-none resize-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectReason(preset)}
                  className="text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg border border-white/[0.06] transition-colors text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
            >
              Anile
            </button>
            <button
              type="button"
              onClick={() => onConfirm(rejectReason.trim())}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>Konfime Refize ({selectedArtists.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
