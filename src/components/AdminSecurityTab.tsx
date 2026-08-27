import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Camera,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Smartphone,
  Mail,
  UserX,
  RefreshCw,
  ZoomIn,
  X,
  Sparkles,
  ShieldOff
} from 'lucide-react';
import { IntrusionLogItem } from '../types';
import { StorageService } from '../utils/storage';
import { HostingerService } from '../utils/hostingerService';

export const AdminSecurityTab: React.FC = () => {
  const [logs, setLogs] = useState<IntrusionLogItem[]>([]);
  const [masterKey, setMasterKey] = useState<string>('');
  const [newMasterKey, setNewMasterKey] = useState<string>('');
  const [showCurrentMasterKey, setShowCurrentMasterKey] = useState<boolean>(false);
  const [showNewMasterKey, setShowNewMasterKey] = useState<boolean>(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<string>('');

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<IntrusionLogItem | null>(null);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Platform Data Reset states
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string>('');

  const loadData = () => {
    const storedLogs = StorageService.getIntrusionLogs();
    setLogs(storedLogs);

    const currentKey = StorageService.getAdminMasterKey();
    setMasterKey(currentKey);

    const lockoutUntil = StorageService.getAdminLockoutUntil();
    if (lockoutUntil && lockoutUntil > Date.now()) {
      setIsLockedOut(true);
      setLockoutRemaining(Math.ceil((lockoutUntil - Date.now()) / 1000));
    } else {
      setIsLockedOut(false);
      setLockoutRemaining(0);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Timer for lockout status
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLockedOut && lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLockedOut, lockoutRemaining]);

  const handleUpdateMasterKey = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError('');
    setKeySaveSuccess(false);

    const trimmed = newMasterKey.trim();
    if (trimmed.length < 8) {
      setKeyError('Kòd Mèt la dwe gen omwen 8 karaktè (chif, lèt, senbòl).');
      return;
    }

    StorageService.setAdminMasterKey(trimmed);
    setMasterKey(trimmed);
    setNewMasterKey('');
    setKeySaveSuccess(true);
    setTimeout(() => setKeySaveSuccess(false), 3000);
  };

  const handleMarkAsReviewed = (id: string) => {
    StorageService.markIntrusionLogAsReviewed(id);
    loadData();
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Èske w vle efase rapò alèt sa a?')) {
      StorageService.deleteIntrusionLog(id);
      loadData();
    }
  };

  const handleClearLockout = () => {
    StorageService.clearAdminLockout();
    setIsLockedOut(false);
    setLockoutRemaining(0);
  };

  const handleExecuteFullDataReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') {
      alert('Tanpri tape "RESET" pou konfime aksyon sa a.');
      return;
    }

    if (!window.confirm('ÈSKE OU SÈTEN OU VLE RETIRE TOUT ATIS, MIZIK AK PÒS YO? Aksyon sa a ap netwaye tout done yo nèt sou aplikasyon an ak nan nwaj la pou pèmèt ou rekòmanse a zewo.')) {
      return;
    }

    setIsResetting(true);
    try {
      // 1. Reset localStorage content
      StorageService.resetContentData();
      
      // 2. Clear cloud Firestore collections
      await HostingerService.clearAllCollections();

      setResetSuccessMessage('Tout atis, tout moso mizik, ak tout pòs yo te retire avèk siksè! Kounye a ou ka kòmanse poste nouvo kontni san pwoblèm.');
      setResetConfirmInput('');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Gen yon ti erè ki pase pandan n ap netwaye done yo. Tanpri re-eseye.');
    } finally {
      setIsResetting(false);
    }
  };

  const unreviewedCount = logs.filter((l) => l.status === 'alert').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Zoomed Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-xl w-full bg-[#070b16] border border-red-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h4 className="text-sm font-bold text-white">Foto Entrizyon Kaptire</h4>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border-2 border-red-500 bg-black shadow-inner">
              <img
                src={selectedPhoto}
                alt="Foto Kaptire"
                className="w-full h-auto max-h-[60vh] object-contain mx-auto"
              />
            </div>

            {selectedLog && (
              <div className="bg-[#05070a] border border-white/[0.08] rounded-xl p-3 text-xs space-y-1 text-slate-300">
                <p><strong>Dat & Lè:</strong> {new Date(selectedLog.timestamp).toLocaleString('ht-HT')}</p>
                <p><strong>Imèl Tantativ:</strong> <span className="text-red-400 font-mono">{selectedLog.attemptedEmail}</span></p>
                <p><strong>Etap Bloke:</strong> {selectedLog.stage === 'primary_login' ? 'Etap 1 (Imèl/Modpas)' : 'Etap 2 (Kòd Mèt Sekrè)'}</p>
                <p className="text-[11px] text-slate-400 truncate"><strong>Aparèy:</strong> {selectedLog.userAgent}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-[#0a0f1d] to-amber-950/30 border border-red-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-black shadow-xl shadow-red-600/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Sant Sekirite Santral & Alèt Entrizyon
              </h2>
              {unreviewedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-black animate-pulse">
                  {unreviewedCount} nouvo alèt
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Gade tout tantativ entrizyon, foto moun ki te eseye fòse antre, epi jere Kòd Mèt Sekrè a.
            </p>
          </div>
        </div>

        {/* Lockout status button */}
        {isLockedOut ? (
          <div className="flex items-center gap-3 bg-red-950/80 border border-red-600/60 px-4 py-2.5 rounded-2xl">
            <div>
              <p className="text-[10px] uppercase font-bold text-red-300">Sistèm Bloke Kounye a</p>
              <p className="text-xs font-mono font-bold text-white">
                Rete: {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s
              </p>
            </div>
            <button
              onClick={handleClearLockout}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md"
            >
              Debloke Kounye a
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Pwoteksyon 100% Aktif</span>
          </div>
        )}
      </div>

      {/* Grid: Master Key Fortress Settings + Security Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Box 1: Master Secret Key Management */}
        <div className="lg:col-span-2 bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-yellow-400" />
              <h3 className="text-base font-black text-white">
                Kòd Mèt Sekrè Santral (Master Key)
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-300 border border-yellow-400/20">
              Etap 2 Sekirite
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Kòd sa a se baryè santral ki pèmèt sèlman Admin an Chèf debouche espas la. Li ka pran nenpòt karaktè espesyal.
          </p>

          {/* Current Master Key Display */}
          <div className="bg-[#05070a] border border-white/[0.1] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Kòd Mèt Aktif Kounye a:</p>
              <p className="text-base font-mono font-black text-yellow-400 mt-1 tracking-widest">
                {showCurrentMasterKey ? masterKey : '••••••••••••'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCurrentMasterKey(!showCurrentMasterKey)}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-colors"
              title="Montre/Kache Kòd Mèt"
            >
              {showCurrentMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Update Master Key Form */}
          <form onSubmit={handleUpdateMasterKey} className="space-y-3 pt-1">
            <label className="block text-xs font-bold text-slate-300">
              Chanje Kòd Mèt Sekrè a:
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type={showNewMasterKey ? 'text' : 'password'}
                  value={newMasterKey ?? ''}
                  onChange={(e) => setNewMasterKey(e.target.value)}
                  placeholder="Tape yon nouvo kòd mèt (min 8 karaktè)..."
                  className="w-full bg-[#05070a] border border-white/[0.14] rounded-xl pl-4 pr-10 py-2.5 text-xs text-white font-mono tracking-wider focus:border-yellow-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewMasterKey(!showNewMasterKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNewMasterKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!newMasterKey || newMasterKey.length < 8}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-yellow-400 hover:bg-yellow-300 text-slate-950 transition-all disabled:opacity-40 shadow-lg shadow-yellow-400/20"
              >
                Anrejistre Nouvo Kòd
              </button>
            </div>

            {keyError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {keyError}
              </p>
            )}

            {keySaveSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5" /> Nouvo Kòd Mèt la anrejistre avèk siksè!
              </p>
            )}
          </form>
        </div>

        {/* Box 2: Security Architecture Summary */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">
              Pwotokòl Sekirite Vizyèl
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start gap-2 bg-[#05070a] p-3 rounded-xl border border-white/[0.06]">
              <span className="font-bold text-yellow-400 shrink-0">1.</span>
              <p>Moun nan dwe aksepte idantifikasyon vizyèl anvan fòm nan parèt.</p>
            </div>
            <div className="flex items-start gap-2 bg-[#05070a] p-3 rounded-xl border border-white/[0.06]">
              <span className="font-bold text-yellow-400 shrink-0">2.</span>
              <p>Si yon moun echwe 3 fwa sou imèl oswa kòd, kamera a pran foto l an silans.</p>
            </div>
            <div className="flex items-start gap-2 bg-[#05070a] p-3 rounded-xl border border-white/[0.06]">
              <span className="font-bold text-yellow-400 shrink-0">3.</span>
              <p>Foto a anrejistre epi yon alèt voye sou imèl ofisyèl la: <code>ciblesecurity404@um.com</code>.</p>
            </div>
            <div className="flex items-start gap-2 bg-[#05070a] p-3 rounded-xl border border-white/[0.06]">
              <span className="font-bold text-yellow-400 shrink-0">4.</span>
              <p>Aksè tantativ yo bloke pandan 15 minit (men tout admin ki te deja konekte rete nòmal).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Captured Intrusion Alerts List */}
      <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                Istorik Alèt Entrizyon & Foto Kaptire ({logs.length})
              </h3>
              <p className="text-xs text-slate-400">
                Gade tout tantativ san otorizasyon ki te fèt sou platfòm nan
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Aktyalize</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 space-y-3 bg-[#05070a] rounded-2xl border border-white/[0.04]">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
            <h4 className="text-base font-bold text-white">Pa Gen Kenn Entrizyon Detekte</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tout sistèm sekirite yo ap fonksyone nòmalman. Lè yon moun tante mete move kòd 3 fwa, rapò a ap parèt la a.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`bg-[#05070a] border rounded-2xl p-4 space-y-3 transition-all ${
                  log.status === 'alert'
                    ? 'border-red-500/60 shadow-lg shadow-red-950/40 ring-1 ring-red-500/30'
                    : 'border-white/[0.08]'
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        log.status === 'alert'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.status === 'alert' ? '🚨 NOUVO ALÈT' : '✅ Verifye'}
                    </span>
                    <p className="text-xs font-mono font-bold text-white mt-1">
                      {new Date(log.timestamp).toLocaleString('ht-HT')}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                    title="Efase rapò sa a"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Photo Thumbnail */}
                {log.photoUrl && (
                  <div
                    className="relative group rounded-xl overflow-hidden border border-red-500/40 bg-black cursor-pointer aspect-video"
                    onClick={() => {
                      setSelectedPhoto(log.photoUrl);
                      setSelectedLog(log);
                    }}
                  >
                    <img
                      src={log.photoUrl}
                      alt="Foto Entrizyon"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] font-bold flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5 text-yellow-400" /> Agrandi Foto
                      </span>
                    </div>
                  </div>
                )}

                {/* Log details */}
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="truncate">
                    <strong>Imèl Eseye:</strong>{' '}
                    <span className="text-red-400 font-mono font-bold">{log.attemptedEmail}</span>
                  </p>
                  <p>
                    <strong>Tantativ:</strong> {log.attemptCount} / 3 |{' '}
                    <strong>Etap:</strong>{' '}
                    <span className="text-yellow-300">
                      {log.stage === 'primary_login' ? 'Imèl/Modpas' : 'Kòd Mèt'}
                    </span>
                  </p>
                  {log.unlockToken && (
                    <div className="bg-red-950/40 border border-red-500/30 rounded-lg px-2.5 py-1 text-[11px] font-mono flex items-center justify-between text-yellow-300">
                      <span>Kòd Deblokaj Alèt:</span>
                      <strong className="text-white font-black">{log.unlockToken}</strong>
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                      "{log.notes}"
                    </p>
                  )}
                </div>

                {/* Mark as reviewed button */}
                {log.status === 'alert' && (
                  <button
                    onClick={() => handleMarkAsReviewed(log.id)}
                    className="w-full py-2 rounded-xl bg-white/[0.08] hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-bold text-slate-300 border border-white/[0.1] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Make Kòm Verifye</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLATFORM COMPLETE DATA PURGE / RESET SECTION */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-red-950/20 to-[#070b16] border border-red-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Reyinisyalizasyon Done Platfòm nan (Reset Kontni)
              </h3>
              <p className="text-xs text-slate-400">
                Retire tout ansyen atis, tout moso mizik, ak tout pòs sosyal yo pou kòmanse ak yon baz done nèf.
              </p>
            </div>
          </div>
        </div>

        {resetSuccessMessage ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-medium flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{resetSuccessMessage}</span>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#05070f] border border-red-500/20 space-y-4">
            <div className="space-y-2 text-xs text-slate-300">
              <p className="text-amber-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Atansyon: Aksyon sa a se yon netwayaj konplè (Destriktif)
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Tout atis ki te anrejistre yo ap efase nèt.</li>
                <li>Tout moso mizik ki te monte yo ap retire sou sit la.</li>
                <li>Tout pòs ak kòmantè nan espas kominotè a ap efase.</li>
                <li>Paramèt sekirite w ak kòd admin ou ap rete entak.</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                placeholder='Tape "RESET" pou konfime'
                value={resetConfirmInput ?? ''}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-red-500/40 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-red-400"
              />
              <button
                type="button"
                onClick={handleExecuteFullDataReset}
                disabled={isResetting || resetConfirmInput.trim().toUpperCase() !== 'RESET'}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>N ap netwaye done yo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Netwaye Tout Done Yo Nèt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
