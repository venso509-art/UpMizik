import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  AlertTriangle,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Camera,
  CheckCircle2,
  AlertOctagon,
  Fingerprint,
  UserCheck,
  Shield,
  HelpCircle
} from 'lucide-react';
import { AdminUser, IntrusionLogItem } from '../types';
import { StorageService } from '../utils/storage';

interface AdminAuthModalProps {
  onClose: () => void;
  onLoginSuccess: (admin: AdminUser) => void;
}

type AuthStage = 'consent' | 'login' | 'master_key' | 'lockout';

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  onClose,
  onLoginSuccess
}) => {
  const [stage, setStage] = useState<AuthStage>('consent');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [masterFailedAttempts, setMasterFailedAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Camera & Intrusion Capture states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [unlockCodeInput, setUnlockCodeInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [showUnlockInput, setShowUnlockInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Check if system is currently in lockout mode on mount
  useEffect(() => {
    const checkLockout = () => {
      const lockoutUntil = StorageService.getAdminLockoutUntil();
      if (lockoutUntil && lockoutUntil > Date.now()) {
        const remainingSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
        setLockoutRemaining(remainingSec);
        setStage('lockout');
      }
    };
    checkLockout();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (stage === 'lockout' && lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            StorageService.clearAdminLockout();
            setStage('consent');
            setFailedAttempts(0);
            setMasterFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage, lockoutRemaining]);

  // Clean up camera tracks on unmount or close
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Attach stream to videoRef when stream is updated
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream, stage]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  // Start Camera & Microphone Stream
  const initCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });
      setCameraStream(stream);
      setCameraReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      return true;
    } catch (err: any) {
      console.warn('Camera/Microphone access fallback:', err);
      // If audio+video fails due to mic permission, try video alone
      try {
        const streamOnlyVideo = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
        setCameraStream(streamOnlyVideo);
        setCameraReady(true);
        if (videoRef.current) {
          videoRef.current.srcObject = streamOnlyVideo;
          videoRef.current.play().catch(() => {});
        }
        return true;
      } catch (videoErr) {
        console.warn('Media access completely unavailable:', videoErr);
        setCameraError('Aksè pa t ka aktive.');
        setCameraReady(false);
        return false;
      }
    }
  };

  // Capture snapshot from video or canvas fallback
  const captureIntruderSnapshot = (): string => {
    try {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 400;
        canvas.height = videoRef.current.videoHeight || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          // Add security stamp
          ctx.fillStyle = 'rgba(220, 38, 38, 0.75)';
          ctx.fillRect(0, canvas.height - 35, canvas.width, 35);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`🚨 ALÈT ENTRIZYON UPMIZIK - ${new Date().toLocaleString('ht-HT')}`, 10, canvas.height - 12);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedPhoto(dataUrl);
          return dataUrl;
        }
      }
    } catch (e) {
      console.error('Error capturing snapshot:', e);
    }

    // Fallback simulated security capture if camera is blocked
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 400;
    fallbackCanvas.height = 300;
    const fctx = fallbackCanvas.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#0a0f1d';
      fctx.fillRect(0, 0, 400, 300);
      fctx.fillStyle = '#ef4444';
      fctx.font = 'bold 16px sans-serif';
      fctx.fillText('⚠️ FOTO ENTRIZYON SEKIRITE', 20, 50);
      fctx.fillStyle = '#94a3b8';
      fctx.font = '12px sans-serif';
      fctx.fillText(`Imèl: ${email || 'Enkoni'}`, 20, 90);
      fctx.fillText(`Dat: ${new Date().toLocaleString('ht-HT')}`, 20, 120);
      fctx.fillText(`Aparèy: ${navigator.userAgent.substring(0, 40)}...`, 20, 150);
      fctx.fillText('3 Tantativ Ewe Detekte sou Espas Admin', 20, 180);
      const fallbackUrl = fallbackCanvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(fallbackUrl);
      return fallbackUrl;
    }

    return '';
  };

  // Trigger Intrusion Alert when attempts reach 3
  const triggerIntrusionAlert = (stageName: 'primary_login' | 'master_key') => {
    const photoData = captureIntruderSnapshot();
    StorageService.addIntrusionLog({
      attemptedEmail: email.trim() || 'Enkoni / Tantativ Fòse',
      attemptCount: 3,
      stage: stageName,
      photoUrl: photoData,
      userAgent: navigator.userAgent,
      notes: `Tantativ san otorizasyon repete 3 fwa sou ${stageName === 'primary_login' ? 'Imèl/Modpas' : 'Kòd Mèt Sekrè'}. Foto kaptire epi voye bay Admin an Chèf.`
    });

    setLockoutRemaining(15 * 60); // 15 minutes
    setStage('lockout');
  };

  // User accepts consent and activates camera
  const handleConsentAccept = async () => {
    setIsLoading(true);
    await initCamera();
    setIsLoading(false);
    setStage('login');
  };

  // Stage 1: Submit Email & Password/PIN
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const storedAdminEmail = StorageService.getAdminEmail().trim().toLowerCase();
    const storedAdminPin = StorageService.getAdminPin().trim();

    const inputEmail = email.trim().toLowerCase();
    const inputPin = pin.trim();

    const isEmailValid =
      inputEmail === storedAdminEmail ||
      inputEmail === 'ciblesecurity404@um.com' ||
      inputEmail === 'admin.upmizik@gmail.com' ||
      inputEmail === 'venso509@gmail.com';

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (isEmailValid && inputPin === storedAdminPin) {
        // Stage 1 Passed! Move to Stage 2 (Master Key Fortress)
        setFailedAttempts(0);
        setErrorMsg('');
        setStage('master_key');
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          triggerIntrusionAlert('primary_login');
        } else {
          setErrorMsg(
            `Enfòmasyon enkòrèk! (${nextAttempts}/3)`
          );
        }
      }
    }, 600);
  };

  // Stage 2: Submit Master Secret Key (Default: 1$@96$@#&)
  const handleMasterKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const storedMasterKey = StorageService.getAdminMasterKey();
    const inputKey = masterKey.trim();

    if (inputKey.length < 8) {
      setErrorMsg('Kòd la dwe gen omwen 8 karaktè.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      // Verify master key (Exact match: 1$@96$@#&)
      if (inputKey === storedMasterKey || inputKey === '1$@96$@#&') {
        const admin: AdminUser = {
          email: email.trim().toLowerCase() || 'admin.upmizik@gmail.com',
          name: 'Mr Clauvens',
          role: 'super_admin'
        };

        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
        }

        onLoginSuccess(admin);
        onClose();
      } else {
        const nextAttempts = masterFailedAttempts + 1;
        setMasterFailedAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          triggerIntrusionAlert('master_key');
        } else {
          setErrorMsg(
            `Kòd enkòrèk! (${nextAttempts}/3)`
          );
        }
      }
    }, 700);
  };

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/90 backdrop-blur-md p-2 sm:p-4 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && stage !== 'lockout') handleClose();
      }}
    >
      {/* Hidden Canvas for Security Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="min-h-full flex items-center justify-center py-4">
        <div
          className={`relative w-full max-w-md bg-[#070b16]/95 border border-white/[0.14] rounded-3xl p-5 sm:p-8 shadow-2xl my-auto backdrop-blur-2xl max-h-[94dvh] overflow-y-auto ${
            isClosing ? 'animate-modal-out' : 'animate-modal-in'
          }`}
        >
          {/* Close Button (Hidden on lockout) */}
          {stage !== 'lockout' && (
            <button
              id="close-admin-auth-modal-btn"
              onClick={handleClose}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors z-10"
              title="Fèmen"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* ============================================================ */}
          {/* STAGE 0: SECURITY CONSENT GATE                               */}
          {/* ============================================================ */}
          {stage === 'consent' && (
            <div className="text-center space-y-5 animate-fadeIn">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-3xl bg-red-500/20 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600/30 to-amber-600/20 border border-red-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-red-500/20 text-red-400">
                  <ShieldAlert className="w-10 h-10 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono font-bold tracking-wider uppercase">
                  🚨 Espas Prive & Sekirize
                </span>
                <h3 className="text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif] tracking-tight">
                  Pwotokòl Sekirite Santral
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed pt-1">
                  Espas sa a rezève <strong>SÈLMAN</strong> pou Administrasyon UpMizik.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <p className="text-xs font-bold text-yellow-300">
                  Èske w dakò idantifye w pou ouvri pòt la?
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    id="refuse-admin-consent-btn"
                    type="button"
                    onClick={handleClose}
                    className="w-full sm:w-1/2 py-3 rounded-xl font-semibold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1] transition-all"
                  >
                    Non, Mwen Refize
                  </button>

                  <button
                    id="accept-admin-consent-btn"
                    type="button"
                    disabled={isLoading}
                    onClick={handleConsentAccept}
                    className="w-full sm:w-1/2 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-xl shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Wi, Mwen Dakò</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 1: PRIMARY CREDENTIALS (EMAIL & PASSWORD)              */}
          {/* ============================================================ */}
          {stage === 'login' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="relative inline-block mx-auto mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 flex items-center justify-center mx-auto shadow-xl">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                  Otantifikasyon
                </h3>
                <p className="text-xs text-slate-400">
                  Antre enfòmasyon administratè a pou kontinye
                </p>
              </div>

              {/* Video Monitor Hidden / Silent Canvas */}
              <div className="hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Imèl
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="admin-email-input"
                      type="email"
                      required
                      autoComplete="username"
                      value={email ?? ''}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-yellow-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Modpas
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="admin-pin-input"
                      type={showPin ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={pin ?? ''}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white font-mono tracking-wider focus:border-yellow-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 animate-shake">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  id="submit-admin-step1-btn"
                  type="submit"
                  disabled={isLoading || !email || !pin}
                  className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifikasyon...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Kontinye</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* STAGE 2: SECOND SECURITY STAGE                               */}
          {/* ============================================================ */}
          {stage === 'master_key' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2 shadow-2xl shadow-emerald-500/20">
                  <Fingerprint className="w-9 h-9 animate-pulse" />
                </div>

                <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                  Kòd Sekirite
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                  Antre kòd sekirite a pou valide aksè a.
                </p>
              </div>

              {/* Video Monitor Hidden */}
              <div className="hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <form onSubmit={handleMasterKeySubmit} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-yellow-300 mb-1">
                    Kòd Sekirite
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
                    <input
                      id="admin-master-key-input"
                      type={showMasterKey ? 'text' : 'password'}
                      required
                      autoFocus
                      value={masterKey ?? ''}
                      onChange={(e) => setMasterKey(e.target.value)}
                      className="w-full bg-[#05070a] border border-yellow-400/50 rounded-xl pl-10 pr-10 py-3 text-sm text-white font-mono tracking-widest focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterKey(!showMasterKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 animate-shake">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  id="submit-master-key-btn"
                  type="submit"
                  disabled={isLoading || masterKey.length < 8}
                  className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validasyon...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Debloke Aksè</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* LOCKOUT STATE: TRIGGERED ON 3 FAILED ATTEMPTS                */}
          {/* ============================================================ */}
          {stage === 'lockout' && (
            <div className="text-center space-y-4 py-2 animate-scaleUp">
              <div className="w-16 h-16 rounded-3xl bg-red-600/20 text-red-500 border border-red-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-red-600/30">
                <AlertOctagon className="w-9 h-9 animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-mono font-bold">
                  🚨 AKSÈ BLOKE
                </span>
                <h3 className="text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                  Aksè Bloke pou Sekirite
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Sistèm nan bloke aksè a pou rezon sekirite.
                </p>
              </div>

              {/* Countdown Lockout Box */}
              <div className="bg-[#05070a] border border-red-500/30 rounded-2xl p-4 max-w-xs mx-auto space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Tan ki rete anvan nouvo tantativ:</p>
                  <div className="text-2xl font-black font-mono text-red-400 tracking-wider">
                    {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s
                  </div>
                </div>

                {/* Admin Instant Unlock with Email Token / Master Override */}
                {!showUnlockInput ? (
                  <button
                    type="button"
                    onClick={() => setShowUnlockInput(true)}
                    className="text-[11px] text-yellow-400/90 hover:text-yellow-300 font-semibold underline underline-offset-4 pt-1 transition-colors"
                  >
                    Mwen se Admin an, mwen gen kòd deblokaj la
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setUnlockError('');
                      const success = StorageService.verifyAndUnlockWithToken(unlockCodeInput);
                      if (success) {
                        setUnlockSuccess(true);
                        setTimeout(() => {
                          StorageService.clearAdminLockout();
                          setStage('consent');
                          setFailedAttempts(0);
                          setMasterFailedAttempts(0);
                          setUnlockCodeInput('');
                          setShowUnlockInput(false);
                          setUnlockSuccess(false);
                        }, 800);
                      } else {
                        setUnlockError('Kòd deblokaj enkòrèk.');
                      }
                    }}
                    className="pt-2 border-t border-white/[0.08] space-y-2 text-left"
                  >
                    <label className="block text-[10px] uppercase font-bold text-slate-400">
                      Kòd konfimasyon deblokaj:
                    </label>
                    <input
                      type="text"
                      value={unlockCodeInput ?? ''}
                      onChange={(e) => setUnlockCodeInput(e.target.value)}
                      placeholder="Tape kòd la..."
                      className="w-full bg-black/60 border border-yellow-400/40 rounded-xl px-3 py-2 text-xs text-white font-mono text-center tracking-widest focus:border-yellow-400 outline-none"
                    />
                    {unlockError && (
                      <p className="text-[10px] text-red-400 text-center font-semibold">{unlockError}</p>
                    )}
                    {unlockSuccess && (
                      <p className="text-[10px] text-emerald-400 text-center font-bold">Aksè debloke avèk siksè!</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowUnlockInput(false)}
                        className="flex-1 py-1.5 rounded-lg bg-white/[0.06] text-[11px] text-slate-300 hover:bg-white/[0.1]"
                      >
                        Anile
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-[11px] font-black text-black"
                      >
                        Debloke
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
