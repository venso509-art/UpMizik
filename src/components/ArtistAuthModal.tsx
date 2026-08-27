import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  User,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  Phone,
  MapPin,
  Upload,
  CheckCircle,
  FileText,
  Smartphone,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Eye,
  EyeOff,
  Home,
  Copy,
  Check
} from 'lucide-react';
import { ArtistUser, PaymentSettingsConfig } from '../types';
import { HAITIAN_DEPARTMENTS_AND_CITIES, ALL_HAITIAN_CITIES } from '../data/haitianCities';
import { compressAndReadFile } from '../utils/imageUtils';
import { StorageService } from '../utils/storage';
import { HostingerService } from '../utils/hostingerService';
import { validateRestrictedDigits, hasRestrictedPhoneOrDigits, RESTRICTED_DIGITS_ERROR_MESSAGE } from '../utils/textValidation';

interface ArtistAuthModalProps {
  onClose: () => void;
  onLoginSuccess: (artist: ArtistUser) => void;
  onRegisterArtist: (newArtist: ArtistUser) => void;
  existingArtists: ArtistUser[];
}

export const ArtistAuthModal: React.FC<ArtistAuthModalProps> = ({
  onClose,
  onLoginSuccess,
  onRegisterArtist,
  existingArtists
}) => {
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettingsConfig>(() => StorageService.getPaymentSettings());
  const [copiedMethodId, setCopiedMethodId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [step, setStep] = useState<
    'form' | 'welcome_letter' | 'proof_upload' | 'registered_pending_notice' | 'login_pending_notice' | 'login_rejected_notice'
  >('form');

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

  const regFeeUsd = paymentConfig.artistRegistrationFeeUsd ?? 4.99;
  const exchangeRate = paymentConfig.htgExchangeRate ?? 145.0;
  const regFeeHtg = Math.round(regFeeUsd * exchangeRate * 100) / 100;
  const activeMethods = paymentConfig.methods.filter((m) => m.isActive);

  const handleCopyNumber = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedMethodId(id);
    setTimeout(() => setCopiedMethodId(null), 2000);
  };

  // Form State
  const [name, setName] = useState('');
  const [stageName, setStageName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Pòtoprens (Port-au-Prince)');
  const [customCityMode, setCustomCityMode] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [bio, setBio] = useState('');
  const [musicalRoots, setMusicalRoots] = useState('');
  const [musicalInfluences, setMusicalInfluences] = useState('');
  const [artisticVision, setArtisticVision] = useState('');
  const [artistQuote, setArtistQuote] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [proofPreview, setProofPreview] = useState('');
  const [isProcessingProof, setIsProcessingProof] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  // Automatically scroll modal to the very top whenever opened or step/mode toggles
  useEffect(() => {
    modalContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    setIsClosing(false);
  }, [authMode, step]);

  // Login specific state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);

  // Temporary registered user state before proof upload
  const [tempArtist, setTempArtist] = useState<ArtistUser | null>(null);

  // Filtered cities when typing in custom/search input
  const [citySearchQuery, setCitySearchQuery] = useState('');

  const filteredCitySuggestions = useMemo(() => {
    if (!citySearchQuery.trim()) return [];
    return ALL_HAITIAN_CITIES.filter(c =>
      c.toLowerCase().includes(citySearchQuery.toLowerCase().trim())
    ).slice(0, 8);
  }, [citySearchQuery]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressAndReadFile(file, 600, 600, 0.72);
        setAvatarPreview(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressAndReadFile(file, 800, 1000, 0.72);
        setProofPreview(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (ev) => setProofPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginEmail.trim() || !loginPin.trim()) {
      setErrorMsg('Tanpri antre imèl ou ak kòd PIN 4 chif ou.');
      return;
    }

    if (loginPin.length !== 4 || isNaN(Number(loginPin))) {
      setErrorMsg('Kòd PIN nan dwe gen egzakteman 4 chif.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const cleanEmail = loginEmail.trim().toLowerCase();
      const cleanPin = loginPin.trim();

      // 0. Tcheke si kont lan bloke pa mekanis Rate Limiting (Fòs Brit)
      const rateLimit = StorageService.getArtistRateLimitState(cleanEmail);
      if (rateLimit.isLocked) {
        setErrorMsg(`Kont sa a tanporèman bloke akòz twòp tantativ koneksyon ki echwe (Fòs brit detekte). Tanpri ret tann ${rateLimit.remainingMinutes} minit anvan ou re-eseye, oswa kontakte sipò a.`);
        return;
      }

      // Pran tout atis ki nan StorageService ak nan props pou asire tout dènye enskripsyon yo la
      const storedArtists = StorageService.getArtists();
      const allArtists = [...storedArtists, ...existingArtists.filter(ea => !storedArtists.some(sa => sa.id === ea.id))];

      // 1. Chèche si imèl la (oswa telefòn) deja egziste nan sistèm nan
      const artistByEmail = allArtists.find(
        a => (a.email.toLowerCase() === cleanEmail || a.phone.replace(/\s+/g, '') === cleanEmail.replace(/\s+/g, ''))
      );

      // Si imèl la jwenn
      if (artistByEmail) {
        // Ka 1: Kont la gen yon demann ki pako valide (en_attente / pending)
        if (artistByEmail.status === 'pending' || (artistByEmail as any).statut === 'en_attente') {
          StorageService.addActivityLog({
            eventType: 'echec_connexion_pending',
            email: cleanEmail,
            artistId: artistByEmail.id,
            artistName: artistByEmail.stageName || artistByEmail.name,
            reason: 'Atis la eseye konekte nan artist_dashboard men kont li an atant validasyon $4.99 toujou pa Administratè a.',
            status: 'warning'
          });
          setTempArtist(artistByEmail);
          setStep('login_pending_notice');
          return;
        }

        // Ka 2: Kont la te rejte (rejected / rejete)
        if (artistByEmail.status === 'rejected' || (artistByEmail as any).statut === 'rejete') {
          StorageService.addActivityLog({
            eventType: 'echec_connexion_rejete',
            email: cleanEmail,
            artistId: artistByEmail.id,
            artistName: artistByEmail.stageName || artistByEmail.name,
            reason: 'Atis la eseye konekte men demann enskripsyon li te rejte pa Administratè a.',
            status: 'error'
          });
          setTempArtist(artistByEmail);
          setProofPreview('');
          setStep('login_rejected_notice');
          return;
        }

        // Ka 3: Kont la sispann (suspended)
        if (artistByEmail.status === 'suspended' || (artistByEmail as any).statut === 'suspendu') {
          StorageService.addActivityLog({
            eventType: 'echec_connexion_suspendu',
            email: cleanEmail,
            artistId: artistByEmail.id,
            artistName: artistByEmail.stageName || artistByEmail.name,
            reason: 'Atis la eseye konekte men kont li tanporèman sispann pa Administratè a.',
            status: 'error'
          });
          setErrorMsg('Kont atis ou a tanporèman sispann pa Administratè a.');
          return;
        }

        // Ka 4: Kont la valide (active) -> verifye si PIN nan kòrèk
        if (artistByEmail.pin === cleanPin) {
          // Koneksyon reyisi: netwaye tantativ echwe yo
          StorageService.clearArtistRateLimit(cleanEmail);

          StorageService.addActivityLog({
            eventType: 'connexion_reussie',
            email: cleanEmail,
            artistId: artistByEmail.id,
            artistName: artistByEmail.stageName || artistByEmail.name,
            reason: 'Koneksyon reyisi avèk siksè nan artist_dashboard.',
            status: 'success'
          });
          onLoginSuccess(artistByEmail);
          onClose();
          return;
        } else {
          // PIN nan pa kòrèk -> anrejistre tantativ echwe pou Rate Limiting
          const attemptRes = StorageService.recordArtistFailedLoginAttempt(cleanEmail, artistByEmail);

          StorageService.addActivityLog({
            eventType: 'echec_connexion_identifiants',
            email: cleanEmail,
            artistId: artistByEmail.id,
            artistName: artistByEmail.stageName || artistByEmail.name,
            reason: `Kòd PIN oswa modpas sekrè a enkòrèk pou atis sa a (${artistByEmail.stageName || artistByEmail.name}). Tantativ ${attemptRes.failedAttempts}/3.`,
            status: 'error'
          });

          if (attemptRes.isLocked) {
            setErrorMsg(`Kont sa a bloke tanporèman pou ${attemptRes.remainingMinutes} minit akòz plis pase 3 tantativ koneksyon echwe (Rate Limiting). Yo voye yon notifikasyon imèl sekirite bay Administratè a.`);
          } else {
            const warnText = attemptRes.remainingAttempts === 1 ? ` (Atansyon: ou rete sèlman 1 dènye tantativ anvan kont lan bloke epi voye alèt bay Admin).` : '';
            setErrorMsg(`Imèl ou a oubyen kòd ou a pa kòrèk, tanpri verifye.${warnText}`);
          }
          return;
        }
      }

      // Ka 5: Imèl la pa jwenn oswa kontak enkoni
      const attemptRes = StorageService.recordArtistFailedLoginAttempt(cleanEmail);
      StorageService.addActivityLog({
        eventType: 'echec_connexion_identifiants',
        email: cleanEmail,
        reason: `Imèl oswa kontak '${cleanEmail}' pa jwenn nan baz done atis la. Tantativ ${attemptRes.failedAttempts}/3.`,
        status: 'error'
      });

      if (attemptRes.isLocked) {
        setErrorMsg(`Kont sa a bloke tanporèman pou ${attemptRes.remainingMinutes} minit akòz plis pase 3 tantativ koneksyon echwe (Rate Limiting). Yo voye yon notifikasyon imèl sekirite bay Administratè a.`);
      } else {
        const warnText = attemptRes.remainingAttempts === 1 ? ` (Atansyon: ou rete sèlman 1 dènye tantativ anvan kont lan bloke epi voye alèt bay Admin).` : '';
        setErrorMsg(`Imèl ou a oubyen kòd ou a pa kòrèk, tanpri verifye.${warnText}`);
      }
    }, 500);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !stageName.trim() || !email.trim() || !phone.trim() || !city.trim() || !pin.trim()) {
      setErrorMsg('Tanpri ranpli tout chan obligatwa yo.');
      return;
    }

    // Strict 4-digit numeric PIN validation
    const cleanPin = pin.trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setErrorMsg('Kòd PIN sekirite a dwe gen egzakteman 4 chif (chif sèlman, pa mwens pa plis).');
      return;
    }

    // Comprehensive validation to prevent phone numbers or more than 4 consecutive digits in any public text fields
    const fieldsToValidate = [
      { val: name, label: 'Non Konplè a' },
      { val: stageName, label: 'Non Atis (Sèn) nan' },
      { val: bio, label: 'Biyografi a' },
      { val: artistQuote, label: 'Deviz / Sitasyon an' },
      { val: musicalRoots, label: 'Rasin ak Estil yo' },
      { val: musicalInfluences, label: 'Enspirasyon ak Modèl yo' },
      { val: artisticVision, label: 'Vizyon Atistik la' },
      { val: twitterHandle, label: 'Twitter / X la' },
      { val: instagramHandle, label: 'Instagram nan' },
      { val: tiktokHandle, label: 'TikTok la' }
    ];

    for (const field of fieldsToValidate) {
      if (field.val && hasRestrictedPhoneOrDigits(field.val)) {
        setErrorMsg(`Nan ${field.label}: Ou pa gen dwa mete plis pase 4 chif swit an swit oswa nimewo telefòn (egz: ane tankou 2026 otorize, men 5 chif oswa nimewo telefòn entèdi).`);
        return;
      }
    }

    const newArtistObj: ArtistUser = {
      id: `artist-${Date.now()}`,
      name: name.trim(),
      stageName: stageName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      city: city.trim(),
      pin: cleanPin,
      avatarUrl: avatarPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      bio: bio.trim() || `Atis k ap kreye bèl mizik kreyòl nan vil ${city}`,
      musicalRoots: musicalRoots.trim() || undefined,
      musicalInfluences: musicalInfluences.trim() || undefined,
      artisticVision: artisticVision.trim() || undefined,
      artistQuote: artistQuote.trim() || undefined,
      instagramHandle: instagramHandle.trim() || undefined,
      twitterHandle: twitterHandle.trim() || undefined,
      tiktokHandle: tiktokHandle.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      status: 'pending',
      registrationDate: new Date().toISOString().split('T')[0],
      totalListens: 0,
      totalDonationsReceived: 0
    };

    // Save immediately to storage and firestore so admin sees the pending registration right away
    StorageService.saveArtist(newArtistObj);
    HostingerService.saveSingleArtist(newArtistObj);
    onRegisterArtist(newArtistObj);
    setTempArtist(newArtistObj);
    // Transition to Welcome Letter explaining 85% revenue rule
    setStep('welcome_letter');
  };

  const handleProofSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofPreview) {
      setErrorMsg('Tanpri telechaje foto prèv $4.99 la.');
      return;
    }

    if (tempArtist) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const finalArtist: ArtistUser = {
          ...tempArtist,
          registrationProofUrl: proofPreview,
          status: 'pending'
        };
        StorageService.saveArtist(finalArtist);
        HostingerService.saveSingleArtist(finalArtist);
        onRegisterArtist(finalArtist);
        setTempArtist(finalArtist);
        setStep('registered_pending_notice');
      }, 800);
    }
  };

  const handleResubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofPreview) {
      setErrorMsg('Tanpri telechaje yon nouvo foto prèv $4.99 ki klè.');
      return;
    }

    if (tempArtist) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const updatedArtist: ArtistUser = {
          ...tempArtist,
          registrationProofUrl: proofPreview,
          status: 'pending',
          registrationRejectionReason: undefined
        };
        StorageService.saveArtist(updatedArtist);
        HostingerService.saveSingleArtist(updatedArtist);
        onRegisterArtist(updatedArtist);
        setTempArtist(updatedArtist);
        setStep('registered_pending_notice');
      }, 800);
    }
  };

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
      onClick={(e) => {
        // Close modal if user clicks on the backdrop container directly
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="min-h-full flex items-center justify-center py-4">
        <div className={`relative w-full max-w-xl bg-[#0a0f1d]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-8 shadow-2xl my-auto backdrop-blur-2xl max-h-[92dvh] overflow-y-auto ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}>
        
        {/* Top Header Controls: Back to User Space / Close */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
          <button
            id="back-to-user-space-btn"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-all group"
            title="Retounen sou paj prensipal la"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Retounen sou sit la</span>
          </button>

          <button
            id="close-artist-auth-modal-btn"
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Fèmen fòmilè a"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: FORM (Signup or Login) */}
        {step === 'form' && (
          <div>
            {/* TWO PRIMARY CHOICES: 1- Kreye yon kont, 2- Konekte ak kont ou */}
            <div className="grid grid-cols-2 gap-2 bg-[#05070a] p-1.5 rounded-2xl border border-white/[0.08] mb-6">
              <button
                id="artist-auth-tab-signup"
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>1. Kreye yon Kont</span>
              </button>

              <button
                id="artist-auth-tab-login"
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>2. Konekte ak Kont Ou</span>
              </button>
            </div>

            {/* CHOICE 1: KREYE YON KONT (SIGNUP FORM) */}
            {authMode === 'signup' ? (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                    Kreye Kont Atis Ou sou UpMizik
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Pibliye mizik ou, konstwi kominote w epi resevwa <strong>85% sipò dirèk</strong> nan men fanatik yo.
                  </p>
                </div>

                {/* Profile Picture Upload */}
                <div className="flex items-center gap-4 bg-[#05070a]/70 p-3.5 rounded-2xl border border-white/[0.08]">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black border border-white/20 flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Foto Pwofil Atis Ou *
                    </label>
                    <input
                      id="artist-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Non Konplè *</label>
                    <input
                      type="text"
                      required
                      value={name ?? ''}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="egz: Jean-Marc Louissaint"
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Non Atis (Non Sèn) *</label>
                    <input
                      type="text"
                      required
                      value={stageName ?? ''}
                      onChange={(e) => setStageName(e.target.value)}
                      placeholder="egz: Ti-Lou Prince"
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Imèl *</label>
                    <input
                      type="email"
                      required
                      value={email ?? ''}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="atis@upmizik.com"
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Telefòn (Moncash/Natcash) *</label>
                    <input
                      type="tel"
                      required
                      value={phone ?? ''}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+509 3X XX XXXX"
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* City Selection (10+ cities per department + Custom input) & 4-digit PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-slate-300">
                        Vil kote w ap viv *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomCityMode(!customCityMode);
                          setCitySearchQuery('');
                        }}
                        className="text-[10px] text-blue-400 hover:underline font-semibold"
                      >
                        {customCityMode ? 'Chwazi nan Lis la' : 'Tape Vil Pa W'}
                      </button>
                    </div>

                    {customCityMode ? (
                      /* Custom Typing City Mode with dynamic suggestions */
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={city ?? ''}
                          onChange={(e) => {
                            setCity(e.target.value);
                            setCitySearchQuery(e.target.value);
                          }}
                          placeholder="Tape non vil ou a (egz: Kenskòf, Ansdeno...)"
                          className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                        />
                        {filteredCitySuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-[#0a0f1d] border border-white/[0.15] rounded-xl shadow-2xl z-20 max-h-36 overflow-y-auto p-1 text-xs">
                            {filteredCitySuggestions.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setCity(c);
                                  setCitySearchQuery('');
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-blue-600/30 text-slate-200 hover:text-white transition-colors"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Rich Categorized Select with 10+ cities per department in Haiti */
                      <div className="relative">
                        <select
                          id="artist-city-select"
                          value={city ?? 'Pòtoprens (Port-au-Prince)'}
                          onChange={(e) => {
                            if (e.target.value === 'custom_entry') {
                              setCustomCityMode(true);
                              setCity('');
                            } else {
                              setCity(e.target.value);
                            }
                          }}
                          className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none cursor-pointer"
                        >
                          {HAITIAN_DEPARTMENTS_AND_CITIES.map((dept) => (
                            <optgroup key={dept.department} label={`📍 ${dept.departmentLabel}`}>
                              {dept.cities.map((cityName) => (
                                <option key={cityName} value={cityName}>
                                  {cityName}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <option value="custom_entry">✍️ Lòt Vil (Tape non l manyèlman)...</option>
                        </select>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Plis pase 10 vil disponib nan chak nan 10 depatman Ayiti yo.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Kòd PIN Sekirite (4 chif) *
                      </label>
                      <span className={`text-[10px] font-mono ${pin.length === 4 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {pin.length}/4 chif
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        required
                        value={pin ?? ''}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPin(sanitized);
                        }}
                        placeholder="1234"
                        className={`w-full bg-[#05070a] border ${
                          pin.length > 0 && pin.length < 4
                            ? 'border-yellow-500/60'
                            : pin.length === 4
                            ? 'border-emerald-500/60'
                            : 'border-white/[0.12]'
                        } rounded-xl pl-10 pr-10 py-2.5 text-xs text-white font-mono tracking-widest text-center focus:border-blue-500 outline-none`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                      >
                        {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Kòd sa dwe gen <strong>egzakteman 4 chif</strong> pou koneksyon w.
                    </p>
                  </div>
                </div>

                {/* Storytelling & Biography Fields */}
                <div className="bg-[#05070a]/70 p-4 rounded-2xl border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-xs font-bold text-slate-200">Biyografi & Istwa Pèsonèl Ou</span>
                    </div>
                  </div>

                  {/* Policy Notice on Consecutive Digits / Phone Numbers */}
                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-2.5 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-200 leading-relaxed">
                      <strong>Règ Sekirite UpMizik:</strong> Pa mete nimewo telefòn oswa plis pase 4 chif swit an swit nan biyografi oswa non ou (ane tankou 2026 otorize, men 5 chif oswa nimewo telefòn entèdi).
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-slate-400">Biyografi & Vwayaj Atistik</label>
                      {bio && hasRestrictedPhoneOrDigits(bio) && (
                        <span className="text-[10px] text-red-400 font-bold animate-pulse">
                          ⚠️ Plis pase 4 chif swit an swit oswa nimewo telefòn entèdi
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={bio ?? ''}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Rakonte istwa ou, kòman ou te kòmanse nan mizik, mesaj prensipal ou ak sa ki motive kreyativite w..."
                      className={`w-full bg-[#070b16] border ${
                        bio && hasRestrictedPhoneOrDigits(bio)
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/[0.1] focus:border-blue-500'
                      } rounded-xl px-3 py-2 text-xs text-white outline-none leading-relaxed`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-slate-400">Deviz / Sitasyon Atis la (Opsyonèl)</label>
                      {artistQuote && hasRestrictedPhoneOrDigits(artistQuote) && (
                        <span className="text-[10px] text-red-400 font-bold">
                          ⚠️ Plis pase 4 chif entèdi
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={artistQuote ?? ''}
                      onChange={(e) => setArtistQuote(e.target.value)}
                      placeholder="egz: Mizik se nanm nou, rasin nou se fòs nou."
                      className={`w-full bg-[#070b16] border ${
                        artistQuote && hasRestrictedPhoneOrDigits(artistQuote)
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/[0.1] focus:border-blue-500'
                      } rounded-xl px-3 py-2 text-xs text-white outline-none`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Rasin & Estil</label>
                      <input
                        type="text"
                        value={musicalRoots ?? ''}
                        onChange={(e) => setMusicalRoots(e.target.value)}
                        placeholder="egz: Rabòday, Rasin, Trap"
                        className="w-full bg-[#070b16] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Enspirasyon / Modèl</label>
                      <input
                        type="text"
                        value={musicalInfluences ?? ''}
                        onChange={(e) => setMusicalInfluences(e.target.value)}
                        placeholder="egz: Boukman, TonyMix, RAM"
                        className="w-full bg-[#070b16] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Vizyon Atistik</label>
                      <input
                        type="text"
                        value={artisticVision ?? ''}
                        onChange={(e) => setArtisticVision(e.target.value)}
                        placeholder="egz: Mennen son kreyòl la lòtbò dlo"
                        className="w-full bg-[#070b16] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Social Handles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.06]">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">𝕏 (Twitter)</label>
                      <input
                        type="text"
                        value={twitterHandle ?? ''}
                        onChange={(e) => setTwitterHandle(e.target.value)}
                        placeholder="@non_ou"
                        className="w-full bg-[#070b16] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-blue-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">📸 Instagram</label>
                      <input
                        type="text"
                        value={instagramHandle ?? ''}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        placeholder="@non_ou"
                        className="w-full bg-[#070b16] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-blue-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">🎵 TikTok</label>
                      <input
                        type="text"
                        value={tiktokHandle ?? ''}
                        onChange={(e) => setTiktokHandle(e.target.value)}
                        placeholder="@non_ou"
                        className="w-full bg-[#070b16] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-blue-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">▶️ YouTube</label>
                      <input
                        type="url"
                        value={youtubeUrl ?? ''}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/..."
                        className="w-full bg-[#070b16] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>Kontinye nan Lèt Byenvini an</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* CHOICE 2: KONEKTE AK KONT OU (LOGIN FORM) */
              <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fadeIn">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-2">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                    Konekte nan Kont Atis Ou
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Antre <strong>imèl ou</strong> ak <strong>kòd PIN 4 chif</strong> ou pou jere mizik ak revni w.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Imèl Atis Ou *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="artist-login-email-input"
                      type="email"
                      required
                      autoComplete="username"
                      value={loginEmail ?? ''}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="egz: tilou@upmizik.com"
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Kòd PIN Sekirite (4 chif) *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="artist-login-pin-input"
                      type={showLoginPin ? 'text' : 'password'}
                      maxLength={4}
                      required
                      autoComplete="current-password"
                      value={loginPin ?? ''}
                      onChange={(e) => setLoginPin(e.target.value)}
                      placeholder="****"
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white font-mono tracking-widest text-center focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPin(!showLoginPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showLoginPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Egzamp atis demontrasyon: <strong>tilou@upmizik.com</strong> / PIN: <strong>1234</strong>
                  </p>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  id="submit-artist-login-btn"
                  type="submit"
                  disabled={isLoading || !loginEmail || !loginPin}
                  className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>Konekte nan Espas Atis</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: WELCOME LETTER MODAL */}
        {step === 'welcome_letter' && tempArtist && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-yellow-500/10">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Lèt Byenvini & Kontra Kominotè
              </h3>
              <p className="text-xs text-yellow-400 font-bold mt-1">
                Bonjou {tempArtist.stageName}, Byenvini nan Fanmi UpMizik la!
              </p>
            </div>

            <div className="bg-[#05070a] rounded-2xl p-4 sm:p-5 border border-white/[0.08] text-xs text-slate-300 space-y-3 max-h-60 overflow-y-auto leading-relaxed">
              <p>
                Nou kontan akeyi w sou premye platfòm ayisyen ki bati espesyalman pou bay jèn atis yo valè ak sipò dirèk san entèmedyè.
              </p>
              <div className="bg-blue-950/40 border border-blue-600/30 p-3.5 rounded-xl">
                <p className="font-bold text-blue-300 mb-1">💰 RÈG 85% REVENI A:</p>
                <p className="text-[11px] text-slate-300">
                  Chak fwa yon fanatik fè yon sipò pou yon mizik ou, <strong>ou resevwa 85%</strong> nan montan an (UpMizik kenbe sèlman 15%). Se nan <strong>total kòb n ap remèt ou chak 1ye nan mwa a</strong> ke n ap retire yon sèl ti frè tranzaksyon de <strong>$0.99</strong> pou antretyen sèvè ak jesyon transfè a. Tout rès montan w lan ap peye dirèkteman sou <strong>Moncash/Natcash ou nan dat 1ye chak mwa</strong>.
                </p>
              </div>
              <p>
                Pou nou ka valide pwofil ou kòm atis ofisyèl epi asire sekirite platfòm nan, gen yon frè enskripsyon inik <strong>${regFeeUsd.toFixed(2)} USD</strong> (kalkile a <strong>${regFeeUsd.toFixed(2)} × {exchangeRate} Goud = {regFeeHtg} HTG</strong>) ki mande pou finalizasyon kont ou.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-3.5 rounded-xl font-semibold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retounen nan Fòmilè</span>
              </button>

              <button
                id="accept-welcome-letter-btn"
                onClick={() => setStep('proof_upload')}
                className="flex-1 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 hover:from-yellow-400 flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/20 active:scale-98 transition-all"
              >
                <span>Mwen Aksepte, Ale nan Peman ${regFeeUsd.toFixed(2)} ({regFeeHtg} HTG)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REGISTRATION PROOF UPLOAD */}
        {step === 'proof_upload' && tempArtist && (
          <form onSubmit={handleProofSubmit} className="space-y-4 animate-fadeIn">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Validasyon Frè Enskripsyon (${regFeeUsd.toFixed(2)} USD)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tanpri voye <strong>${regFeeUsd.toFixed(2)} USD</strong> (ekivalan <strong>{regFeeHtg} Goud</strong>) sou youn nan kont ofisyèl yo epi telechaje prèv transfè a.
              </p>
            </div>

            {/* Live Calculation Display Card */}
            <div className="bg-gradient-to-br from-emerald-950/80 via-[#0a1424] to-[#05070a] border border-emerald-500/40 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-white/[0.08] pb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>💰</span> Frè Enskripsyon Ofisyèl:
                </span>
                <span className="font-bold text-white font-mono">${regFeeUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-white/[0.08] pb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>📈</span> Taux Dola an Ayiti:
                </span>
                <span className="font-semibold text-yellow-300 font-mono">1 USD = {exchangeRate} HTG (Goud)</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                    Kalkil Total an Goud:
                  </span>
                  <span className="text-xs text-slate-300 font-mono font-medium">
                    ${regFeeUsd.toFixed(2)} × {exchangeRate} Goud =
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400 font-mono tracking-tight block">
                    {regFeeHtg.toLocaleString()} HTG
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    (oubyen ~{Math.round(regFeeHtg)} Goud)
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Payment Accounts List */}
            <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-blue-950/70 border border-blue-500/30 rounded-2xl p-4 backdrop-blur-md space-y-2.5">
              <p className="text-xs font-bold text-blue-300 text-center">
                KONT OFISYÈL POU VOYE {regFeeHtg.toLocaleString()} GOUD (${regFeeUsd.toFixed(2)} USD) LA:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeMethods.map((m) => {
                  const isCopied = copiedMethodId === m.id;
                  const accNum = m.accountNumberOrId || m.accountNumber || '';
                  const accHolder = m.accountHolderName || m.accountName || '';
                  const badge = m.badgeText || m.badge;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleCopyNumber(accNum, m.id)}
                      className="bg-[#05070a] hover:bg-[#091122] border border-white/[0.12] hover:border-yellow-400/60 rounded-xl p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-all group shadow-md active:scale-[0.98]"
                      title="Klike pou kopye nimewo a"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          m.type === 'moncash' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          m.type === 'natcash' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-black text-white">{m.name}</span>
                            {badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 shrink-0">
                                {badge}
                              </span>
                            )}
                          </div>
                          
                          {/* Account Number */}
                          <div className="flex items-baseline gap-1.5 font-mono">
                            <span className="text-[10px] uppercase font-bold text-slate-400 select-none">Nimewo:</span>
                            <span className="text-xs sm:text-sm font-black text-yellow-300 tracking-wide select-all">
                              {accNum}
                            </span>
                          </div>

                          {/* Account Holder Name */}
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

              <p className="text-[11px] text-slate-400 text-center">
                Voye <strong>{regFeeHtg.toLocaleString()} Goud</strong> sou MonCash oswa NatCash, epi telechaje foto resi a pi ba a.
              </p>
            </div>

            {/* File Upload Box */}
            <div className="relative border-2 border-dashed border-white/[0.15] hover:border-emerald-500 rounded-2xl p-5 text-center cursor-pointer bg-[#05070a]/60 transition-colors overflow-hidden">
              <input
                id="artist-fee-proof-upload"
                type="file"
                accept="image/*"
                required
                onChange={handleProofChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Chwazi foto transfè $4.99 la"
              />
              {isProcessingProof ? (
                <div className="py-3 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-xs text-emerald-300">N ap prepare foto a...</span>
                </div>
              ) : proofPreview ? (
                <div className="flex items-center justify-center gap-3 relative z-20">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-emerald-500 bg-black/60 shadow-lg shrink-0">
                    <img src={proofPreview} alt="Prèv $4.99" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left text-xs">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 shrink-0" /> Foto prèv transfè $4.99 chaje
                    </p>
                    <p className="text-slate-300 text-[11px] mt-0.5">Admin an pral verifye l pou aktive kont ou.</p>
                    <p className="text-slate-500 text-[10px] mt-1">Klike pou chanje foto a si w vle</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-emerald-400 mb-1.5 animate-bounce" />
                  <span className="text-xs text-slate-200 font-bold">Telechaje foto screenshot transfè $4.99 la</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG (Moncash / Natcash)</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('welcome_letter')}
                className="px-4 py-3.5 rounded-xl font-semibold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dèyè</span>
              </button>

              <button
                id="submit-artist-registration-final-btn"
                type="submit"
                disabled={isLoading || !proofPreview}
                className="flex-1 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>N ap anrejistre pwofil ou...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Soumèt pou Validasyon Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: REGISTRATION SUCCESSFUL & PENDING ADMIN NOTICE */}
        {step === 'registered_pending_notice' && tempArtist && (
          <div className="space-y-5 text-center animate-fadeIn py-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/40">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Enskripsyon w lan Voye avèk Siksè!
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Mèsi <strong className="text-yellow-300">{tempArtist.stageName}</strong>! Nou byen resevwa pwofil ou ak prèv transfè <strong>$4.99 USD (723.55 HTG)</strong> la.
              </p>
            </div>

            {/* Pending Status Box */}
            <div className="bg-yellow-950/40 border border-yellow-500/40 rounded-2xl p-4 text-left space-y-2 backdrop-blur-md">
              <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs">
                <span className="animate-pulse text-base">⏳</span>
                <span>ESTATI: AN ATANT VALIDASYON PA ADMIN</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Pou asire sekirite platfòm nan ak tout atis yo, Administratè UpMizik la (<strong>Mr clauvens</strong>) ap verifye transfè MonCash / NatCash ou an.
              </p>
            </div>

            {/* Automated Email Notification Info Card */}
            <div className="bg-blue-950/50 border border-blue-500/40 rounded-2xl p-4 text-left space-y-2 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>W ap resevwa yon imèl notifikasyon sou:</span>
              </div>
              <p className="text-xs font-mono font-bold text-yellow-300 bg-[#05070a] p-2 rounded-xl border border-white/[0.08] text-center select-all">
                {tempArtist.email}
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Kou Admin fin valide kont ou, w ap resevwa yon imèl konfimasyon ak tout enfòmasyon yo. <strong>Se lè sa a w ap ka konekte nan Espas Atis ou</strong> ak Kòd PIN ou pou w pibliye mizik epi wè analiz revni w yo.
              </p>
            </div>

            <button
              id="close-pending-registered-notice-btn"
              type="button"
              onClick={() => {
                if (tempArtist) {
                  onRegisterArtist(tempArtist);
                }
                handleClose();
              }}
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 text-slate-950 shadow-xl shadow-yellow-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Mwen Konprann, Fèmen</span>
            </button>
          </div>
        )}

        {/* STEP 5: LOGIN PENDING NOTICE */}
        {step === 'login_pending_notice' && tempArtist && (
          <div className="space-y-5 text-center animate-fadeIn py-2">
            <div className="w-16 h-16 rounded-3xl bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 flex items-center justify-center mx-auto shadow-xl shadow-yellow-500/10">
              <span className="text-3xl animate-pulse">⏳</span>
            </div>

            <div>
              <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Kont Ou an ap Tann Validasyon pa Admin
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Bonjou <strong className="text-yellow-300">{tempArtist.stageName}</strong>, prèv peman $4.99 USD (723.55 HTG) ou an anba revizyon pa <strong>Mr clauvens (Admin)</strong>.
              </p>
            </div>

            <div className="bg-[#05070a]/90 border border-yellow-500/30 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <span>
                  Ou poko ka antre nan board atis la toutotan Admin an pa fin verifye transfè a.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300 border-t border-white/[0.06] pt-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Dèske Admin valide kont ou, yon imèl konfimasyon ap voye dirèkteman sou: <strong className="text-yellow-300">{tempArtist.email}</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setStep('form'); setErrorMsg(''); }}
                className="flex-1 py-3 rounded-xl font-semibold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-colors"
              >
                Tounen nan Koneksyon
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 text-slate-950 transition-all"
              >
                Fèmen
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: LOGIN REJECTED NOTICE (ALLOW RESUBMISSION) */}
        {step === 'login_rejected_notice' && tempArtist && (
          <form onSubmit={handleResubmitProof} className="space-y-4 animate-fadeIn py-1">
            <div className="text-center">
              <div className="w-14 h-14 rounded-3xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-red-950/40">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Prèv Enskripsyon w lan Mande Revizyon
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Bonjou <strong>{tempArtist.stageName}</strong>, Administratè a pa t ka valide foto prèv transfè $4.99 ou a.
              </p>
            </div>

            {/* Rejection Reason Box */}
            <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-3.5 text-left text-xs space-y-1">
              <span className="font-bold text-red-300 block">Rezon ki bay sa:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {tempArtist.registrationRejectionReason || 'Foto prèv transfè a pa t klè oswa nimewo referans lan pa t kowenside.'}
              </p>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-red-500/20">
                Yon imèl eksplikasyon te voye tou sou <strong>{tempArtist.email}</strong>.
              </p>
            </div>

            {/* Official Accounts Card */}
            <div className="bg-[#05070a] border border-white/[0.1] rounded-2xl p-3 text-center text-xs space-y-1">
              <p className="text-blue-300 font-bold text-[11px]">KONT OFISYÈL POU VOYE 723.55 GOUD ($4.99 USD) LA:</p>
              <p className="font-mono font-black text-yellow-300 text-xs">
                Natcash: 35-37-1184 | Moncash: 38-91-2317 (Clauvens EXAUS)
              </p>
            </div>

            {/* New File Upload */}
            <div className="relative border-2 border-dashed border-white/[0.15] hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-[#05070a]/60 transition-colors overflow-hidden">
              <input
                id="artist-resubmit-proof-upload"
                type="file"
                accept="image/*"
                required
                onChange={handleProofChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Chwazi nouvo foto transfè a"
              />
              {proofPreview ? (
                <div className="flex items-center justify-center gap-3 relative z-20">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 bg-black/60 shadow shrink-0">
                    <img src={proofPreview} alt="Nouvo Prèv" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left text-xs">
                    <p className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Nouvo foto chaje
                    </p>
                    <p className="text-slate-400 text-[10px]">Klike pou chanje foto a si w vle</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-6 h-6 text-emerald-400 mb-1 animate-bounce" />
                  <span className="text-xs text-slate-200 font-bold">Telechaje nouvo foto screenshot transfè a</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Asire w montan an ak referans lan vizib byen</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setStep('form'); setErrorMsg(''); }}
                className="px-4 py-3 rounded-xl font-semibold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-colors"
              >
                Anile
              </button>
              <button
                type="submit"
                disabled={isLoading || !proofPreview}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>N ap soumèt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Voye Nouvo Prèv la Bay Admin</span>
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
