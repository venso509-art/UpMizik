import React, { useState, useMemo } from 'react';
import {
  AdminUser,
  MusicItem,
  ArtistUser,
  DonationItem,
  PubItem,
  RpaItem,
  ArchiveRecord,
  MusicCategory,
  ReleaseFormat,
  MusicCredit
} from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Trophy,
  Sparkles,
  Megaphone,
  PlusCircle,
  RotateCcw,
  Archive,
  Check,
  X,
  Eye,
  Trash2,
  Edit,
  DollarSign,
  Music,
  UserCheck,
  LogOut,
  AlertTriangle,
  Upload,
  CheckCircle2,
  ExternalLink,
  Loader2,
  HeartHandshake,
  Youtube,
  Video,
  Film,
  VolumeX,
  ArrowUpRight,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  FileText,
  Coins,
  Calculator,
  RefreshCw,
  Clock,
  Search,
  Filter,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Users,
  UserX,
  Ban,
  Calendar,
  AlertCircle,
  XCircle,
  Wallet,
  CreditCard,
  TrendingUp,
  Copy,
  CheckCheck,
  Send,
  Smartphone,
  Receipt,
  ListMusic,
  Award,
  Crown,
  ChevronRight,
  BarChart3,
  Mail,
  Bell,
  MessageSquare,
  Share2,
  Disc,
  Sliders,
  ArrowUpDown,
  ArrowDownWideNarrow,
  Lock,
  Unlock,
  KeyRound,
  Key,
  EyeOff,
  Infinity,
  Globe,
  Headphones,
  Volume2,
  Radio,
  BellRing
} from 'lucide-react';
import { compressAndReadFile } from '../utils/imageUtils';
import { IdbStorage } from '../utils/idbStorage';
import { getAudioDuration } from '../utils/audioEngine';
import { StorageService } from '../utils/storage';
import { FirebaseService } from '../utils/firebase';
import { SongCreditsEditor } from './SongCreditsEditor';
import { SongCreditsModal } from './SongCreditsModal';
import { MonthlyRevenueBarChart } from './MonthlyRevenueBarChart';
import { PalmaresTrophiesDashboard } from './PalmaresTrophiesDashboard';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { AdminSecurityTab } from './AdminSecurityTab';
import { calculateArtistAwards } from '../utils/awardsUtils';

export const DEFAULT_HTG_EXCHANGE_RATE = 145.0; // 1 USD = 145 HTG (Taux de Référence Marché Haïti)

// Visual & Audio Alert for Live Incoming Donations
export interface LiveDonationAlertItem {
  id: string;
  donation: DonationItem;
  timestamp: number;
}

// Gentle pleasant chime synthesizer (Web Audio API)
const playLiveDonationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // First Tone: G5 (783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second Tone: C6 (1046.50 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.65);
  } catch {}
};

interface AdminDashboardProps {
  currentAdmin: AdminUser;
  musicList: MusicItem[];
  artists: ArtistUser[];
  donations: DonationItem[];
  pubs: PubItem[];
  rpaList: RpaItem[];
  archives: ArchiveRecord[];
  top3Override: { enabled: boolean; topIds: string[] };
  onSaveTop3Override: (override: { enabled: boolean; topIds: string[] }) => void;
  onValidateDonation: (donationId: string, accept: boolean) => void;
  onValidateArtist: (artistId: string, accept: boolean, reason?: string) => void;
  onSuspendArtist?: (artistId: string, days: number, reason?: string) => void;
  onReactivateArtist?: (artistId: string) => void;
  onDeleteArtist?: (artistId: string, deleteSongs?: boolean) => void;
  onToggleArtistPaymentStatus?: (
    artistId: string,
    isPaid: boolean,
    details?: {
      paidAmount?: number;
      reference?: string;
      paymentMethod?: string;
      notes?: string;
      sendNotification?: boolean;
    }
  ) => void;
  onSaveMusicItem: (song: MusicItem) => void;
  onDeleteMusicItem: (musicId: string) => void;
  onSavePubs: (pubs: PubItem[]) => void;
  onSaveRpa: (rpa: RpaItem[]) => void;
  onResetMonthlyDonations: (periodName?: string) => void;
  onLogoutAdmin: () => void;
}

type AdminTab = 'top3' | 'rpa' | 'pubs' | 'add_music' | 'validations' | 'artists_pending' | 'all_artists' | 'artist_payouts' | 'awards' | 'reports' | 'archive' | 'payment_settings' | 'security_logs';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentAdmin,
  musicList,
  artists,
  donations,
  pubs,
  rpaList,
  archives,
  top3Override,
  onSaveTop3Override,
  onValidateDonation,
  onValidateArtist,
  onSuspendArtist,
  onReactivateArtist,
  onDeleteArtist,
  onToggleArtistPaymentStatus,
  onSaveMusicItem,
  onDeleteMusicItem,
  onSavePubs,
  onSaveRpa,
  onResetMonthlyDonations,
  onLogoutAdmin
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [currencyMode, setCurrencyMode] = useState<'both' | 'USD' | 'HTG'>('both');
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_HTG_EXCHANGE_RATE);

  // Artist Management States
  const [artistSearchQuery, setArtistSearchQuery] = useState<string>('');
  const [artistStatusFilter, setArtistStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending' | 'rejected' | 'paid' | 'unpaid'>('all');
  const [artistPaymentFilter, setArtistPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'unpaid_with_balance'>('all');
  const [artistSortBy, setArtistSortBy] = useState<'earnings_desc' | 'earnings_asc' | 'listens_desc' | 'songs_desc' | 'name_asc' | 'newest'>('earnings_desc');
  const [suspendingArtistTarget, setSuspendingArtistTarget] = useState<ArtistUser | null>(null);
  const [suspensionDaysOption, setSuspensionDaysOption] = useState<number>(15);
  const [customSuspensionDays, setCustomSuspensionDays] = useState<string>('');
  const [suspensionReasonInput, setSuspensionReasonInput] = useState<string>('Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la');
  const [deletingArtistTarget, setDeletingArtistTarget] = useState<ArtistUser | null>(null);
  const [deleteArtistSongsOption, setDeleteArtistSongsOption] = useState<boolean>(true);

  // Artist Payout / Payment Status Management States
  const [payingArtistTarget, setPayingArtistTarget] = useState<ArtistUser | null>(null);
  const [payingAmountUsd, setPayingAmountUsd] = useState<number>(0);
  const [payingReferenceInput, setPayingReferenceInput] = useState<string>('');
  const [payingMethodInput, setPayingMethodInput] = useState<string>('MonCash');
  const [payingNotesInput, setPayingNotesInput] = useState<string>('');
  const [payingSendNotification, setPayingSendNotification] = useState<boolean>(true);
  const [payingNotificationCopied, setPayingNotificationCopied] = useState<boolean>(false);

  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [proofZoom, setProofZoom] = useState<number>(1);
  const [proofRotate, setProofRotate] = useState<number>(0);
  const [proofModalDetails, setProofModalDetails] = useState<{
    title?: string;
    donor?: string;
    amount?: string;
    date?: string;
    phone?: string;
    type?: string;
  } | null>(null);

  const [proofModalInfo, setProofModalInfo] = useState<{
    url: string;
    title: string;
    donorOrArtistName?: string;
    phone?: string;
    amount?: string;
    musicTitle?: string;
    date?: string;
    type?: 'support' | 'artist_fee';
  } | null>(null);
  const [editingSong, setEditingSong] = useState<MusicItem | null>(null);
  const [previewingCreditsSong, setPreviewingCreditsSong] = useState<MusicItem | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPeriodInput, setResetPeriodInput] = useState('');
  const [artistRejectTarget, setArtistRejectTarget] = useState<ArtistUser | null>(null);
  const [artistRejectReason, setArtistRejectReason] = useState<string>('Foto prèv transfè a pa klè oswa nimewo referans lan pa kowenside.');

  // Security Tab Unlock Protection State (Requires passcode: error404$)
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState<boolean>(false);
  const [showSecurityAuthModal, setShowSecurityAuthModal] = useState<boolean>(false);
  const [securityAuthCodeInput, setSecurityAuthCodeInput] = useState<string>('');
  const [securityAuthError, setSecurityAuthError] = useState<string>('');
  const [showSecurityAuthPassword, setShowSecurityAuthPassword] = useState<boolean>(false);

  // Top 3 State
  const [top3ManualEnabled, setTop3ManualEnabled] = useState(top3Override.enabled);
  const [top1Id, setTop1Id] = useState(top3Override.topIds[0] || (musicList[0]?.id || ''));
  const [top2Id, setTop2Id] = useState(top3Override.topIds[1] || (musicList[1]?.id || ''));
  const [top3Id, setTop3Id] = useState(top3Override.topIds[2] || (musicList[2]?.id || ''));

  // Form State for Add / Edit Music
  const [musicTitle, setMusicTitle] = useState('');
  const [musicReleaseFormat, setMusicReleaseFormat] = useState<ReleaseFormat>('single');
  const [musicAlbumName, setMusicAlbumName] = useState('');
  const [musicTrackNumber, setMusicTrackNumber] = useState<number | ''>('');
  const [musicCredits, setMusicCredits] = useState<MusicCredit[]>([]);
  const [musicArtistId, setMusicArtistId] = useState(artists[0]?.id || '');
  const [musicFeat, setMusicFeat] = useState('');
  const [musicCollabArtistId, setMusicCollabArtistId] = useState<string>('');
  const [musicCollabRole, setMusicCollabRole] = useState<string>('Featuring');
  const [musicCategory, setMusicCategory] = useState<MusicCategory>('Kompa');
  const [musicPosition, setMusicPosition] = useState<number | ''>('');
  const [musicStatus, setMusicStatus] = useState<'active' | 'pending' | 'rejected'>('active');
  const [musicCoverUrl, setMusicCoverUrl] = useState('');
  const [musicAudioUrl, setMusicAudioUrl] = useState('');
  const [musicDuration, setMusicDuration] = useState<number>(180);
  const [musicYt, setMusicYt] = useState('');
  const [musicTiktok, setMusicTiktok] = useState('');
  const [musicIg, setMusicIg] = useState('');

  // Status Filter & Search State for Rapò Mizik
  const [musicStatusFilter, setMusicStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');
  const [musicSearchQuery, setMusicSearchQuery] = useState<string>('');
  const [showMonthlyRevenueChartInReports, setShowMonthlyRevenueChartInReports] = useState<boolean>(false);

  // Artist Payouts & Earnings Management State
  const [payoutsFilter, setPayoutsFilter] = useState<'all_with_money' | 'all' | 'unpaid' | 'paid' | 'high_earners' | 'suspended_earners'>('all_with_money');
  const [payoutsSearchQuery, setPayoutsSearchQuery] = useState<string>('');
  const [payoutsSortBy, setPayoutsSortBy] = useState<'gross_desc' | 'gross_asc' | 'songs_count' | 'listens'>('gross_desc');
  const [selectedArtistForSongBreakdown, setSelectedArtistForSongBreakdown] = useState<ArtistUser | null>(null);
  const [copiedArtistId, setCopiedArtistId] = useState<string | null>(null);

  // Threshold for Pending Artist Payouts Warning Alert (Papòt Alèt Fon k ap Tann pou Peye Atis Yo)
  const [payoutAlertThreshold, setPayoutAlertThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('upmizik_payout_alert_threshold');
      return saved ? Math.max(1, Number(saved)) : 50; // Default $50 USD
    } catch {
      return 50;
    }
  });
  const [showThresholdConfigModal, setShowThresholdConfigModal] = useState<boolean>(false);
  const [customThresholdInput, setCustomThresholdInput] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('upmizik_payout_alert_threshold');
      return saved ? String(Math.max(1, Number(saved))) : '50';
    } catch {
      return '50';
    }
  });
  const [isPayoutAlertDismissed, setIsPayoutAlertDismissed] = useState<boolean>(false);

  const handleUpdatePayoutThreshold = (newThreshold: number) => {
    const valid = Math.max(1, newThreshold);
    setPayoutAlertThreshold(valid);
    setCustomThresholdInput(String(valid));
    try {
      localStorage.setItem('upmizik_payout_alert_threshold', String(valid));
    } catch {}
  };

  // Artist Validation & Integration Demands State
  const [optimisticArtistStatus, setOptimisticArtistStatus] = useState<Record<string, 'pending' | 'active' | 'rejected' | 'suspended'>>({});
  const [optimisticDonationStatus, setOptimisticDonationStatus] = useState<Record<string, 'pending' | 'validated' | 'rejected'>>({});
  const [validationCategoryFilter, setValidationCategoryFilter] = useState<'all' | 'artists' | 'donations'>('all');
  const [validationStatusFilter, setValidationStatusFilter] = useState<'pending' | 'validated' | 'rejected' | 'all'>('pending');
  const [validationSearchQuery, setValidationSearchQuery] = useState<string>('');
  const [artistValidationFilter, setArtistValidationFilter] = useState<'pending' | 'all' | 'active' | 'rejected'>('pending');
  const [artistValidationSearch, setArtistValidationSearch] = useState<string>('');
  const [selectedArtistDossier, setSelectedArtistDossier] = useState<ArtistUser | null>(null);
  const [showAddManualArtistModal, setShowAddManualArtistModal] = useState<boolean>(false);
  const [copiedValidationFieldId, setCopiedValidationFieldId] = useState<string | null>(null);

  // Instant optimistic handlers
  const handleOptimisticValidateArtist = (artistId: string, accept: boolean, reason?: string) => {
    const targetStatus = accept ? 'active' : 'rejected';
    setOptimisticArtistStatus(prev => ({ ...prev, [artistId]: targetStatus }));
    onValidateArtist(artistId, accept, reason);
    setInternalRefreshKey(k => k + 1);
  };

  const handleOptimisticValidateDonation = (donationId: string, accept: boolean) => {
    const targetStatus = accept ? 'validated' : 'rejected';
    setOptimisticDonationStatus(prev => ({ ...prev, [donationId]: targetStatus }));
    onValidateDonation(donationId, accept);
    setInternalRefreshKey(k => k + 1);
  };

  // Manual Artist Form State
  const [manualArtistStageName, setManualArtistStageName] = useState('');
  const [manualArtistName, setManualArtistName] = useState('');
  const [manualArtistPhone, setManualArtistPhone] = useState('');
  const [manualArtistEmail, setManualArtistEmail] = useState('');
  const [manualArtistCity, setManualArtistCity] = useState('Pòtoprens (Port-au-Prince)');
  const [manualArtistPin, setManualArtistPin] = useState('1234');
  const [manualArtistBio, setManualArtistBio] = useState('');
  const [manualArtistRoots, setManualArtistRoots] = useState('');
  const [manualArtistInfluences, setManualArtistInfluences] = useState('');
  const [manualArtistVision, setManualArtistVision] = useState('');
  const [manualArtistQuote, setManualArtistQuote] = useState('');
  const [manualArtistAvatar, setManualArtistAvatar] = useState('');
  const [manualArtistProof, setManualArtistProof] = useState('');
  const [manualArtistStatus, setManualArtistStatus] = useState<'pending' | 'active'>('pending');
  const [manualArtistInstagram, setManualArtistInstagram] = useState('');
  const [manualArtistTiktok, setManualArtistTiktok] = useState('');
  const [manualArtistTwitter, setManualArtistTwitter] = useState('');

  // Editable RPA & Pubs State
  const [tempRpa, setTempRpa] = useState<RpaItem[]>(rpaList);
  const [tempPubs, setTempPubs] = useState<PubItem[]>(pubs);

  // Reactive Storage & Custom Event Synchronization
  const [internalRefreshKey, setInternalRefreshKey] = useState<number>(0);

  // Live Real-Time Donation Notifications State
  const [liveDonationToasts, setLiveDonationToasts] = useState<LiveDonationAlertItem[]>([]);
  const [recentLiveDonations, setRecentLiveDonations] = useState<DonationItem[]>([]);
  const [isLiveAudioEnabled, setIsLiveAudioEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('upmizik_admin_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [isLiveBannerDismissed, setIsLiveBannerDismissed] = useState<boolean>(false);

  const toggleLiveAudio = () => {
    setIsLiveAudioEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('upmizik_admin_sound_enabled', String(next));
      } catch {}
      return next;
    });
  };

  const knownDonationIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialMountRef = React.useRef<boolean>(true);

  const dismissLiveToast = (toastId: string) => {
    setLiveDonationToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const triggerLiveDonationAlert = React.useCallback((don: DonationItem) => {
    const alertId = `alert_${don.id}_${Date.now()}`;
    const newToastItem: LiveDonationAlertItem = {
      id: alertId,
      donation: don,
      timestamp: Date.now()
    };

    setLiveDonationToasts(prev => {
      const filtered = prev.filter(t => t.donation.id !== don.id);
      return [newToastItem, ...filtered].slice(0, 4);
    });

    setRecentLiveDonations(prev => {
      const filtered = prev.filter(d => d.id !== don.id);
      return [don, ...filtered].slice(0, 6);
    });

    setIsLiveBannerDismissed(false);

    if (isLiveAudioEnabled) {
      playLiveDonationChime();
    }

    // Auto-dismiss this toast after 12 seconds
    setTimeout(() => {
      setLiveDonationToasts(prev => prev.filter(t => t.id !== alertId));
    }, 12000);
  }, [isLiveAudioEnabled]);

  // Real-time Firestore Live Subscriptions using onSnapshot
  const [realtimeFirestoreArtists, setRealtimeFirestoreArtists] = useState<ArtistUser[] | null>(null);
  const [realtimeFirestoreDonations, setRealtimeFirestoreDonations] = useState<DonationItem[] | null>(null);

  // Initial population of existing donation IDs
  React.useEffect(() => {
    try {
      const initial = StorageService.getDonations(currentAdmin);
      initial.forEach(d => knownDonationIdsRef.current.add(d.id));
    } catch {}
    isInitialMountRef.current = false;
  }, [currentAdmin]);

  // Real-time Firestore onSnapshot Subscriptions for Artists and Donations
  React.useEffect(() => {
    // 1. Subscribe to 'artists' collection onSnapshot
    const unsubscribeArtists = FirebaseService.subscribeToArtists((cloudArtists) => {
      if (cloudArtists && cloudArtists.length > 0) {
        setRealtimeFirestoreArtists(cloudArtists);
        // Safely update local storage without overwriting validated/rejected status
        try {
          const currentLocal = StorageService.getArtists();
          const localMap = new Map(currentLocal.map(a => [a.id, a]));
          const cloudMap = new Map(cloudArtists.map(a => [a.id, a]));
          
          const merged = cloudArtists.map(ca => {
            const la = localMap.get(ca.id);
            if (la) {
              // If local action marked as active/rejected/suspended while cloud is still pending, keep the local updated status
              if (la.status && la.status !== 'pending' && ca.status === 'pending') {
                return { ...ca, ...la, status: la.status };
              }
              return { ...ca, ...la };
            }
            return ca;
          });

          for (const la of currentLocal) {
            if (!cloudMap.has(la.id)) {
              merged.push(la);
              cloudMap.set(la.id, la);
            }
          }
          // Update cache silently without re-dispatching loop
          localStorage.setItem('upmizik_artists', JSON.stringify(merged));
        } catch {}
        setInternalRefreshKey(k => k + 1);
      }
    });

    // 2. Subscribe to 'donations' collection onSnapshot
    const unsubscribeDonations = FirebaseService.subscribeToDonations((cloudDonations) => {
      if (cloudDonations && cloudDonations.length > 0) {
        setRealtimeFirestoreDonations(cloudDonations);
        // Detect new pending donations to trigger live alert sound/toast in real-time
        cloudDonations.forEach(don => {
          if (!knownDonationIdsRef.current.has(don.id)) {
            knownDonationIdsRef.current.add(don.id);
            if (!isInitialMountRef.current && don.status === 'pending') {
              triggerLiveDonationAlert(don);
            }
          }
        });
        // Safely update local storage without overwriting validated/rejected status
        try {
          const currentLocal = StorageService.getDonations(currentAdmin);
          const localMap = new Map(currentLocal.map(d => [d.id, d]));
          const cloudMap = new Map(cloudDonations.map(d => [d.id, d]));
          
          const merged = cloudDonations.map(cd => {
            const ld = localMap.get(cd.id);
            if (ld) {
              if (ld.status && ld.status !== 'pending' && cd.status === 'pending') {
                return { ...cd, ...ld, status: ld.status };
              }
              return { ...cd, ...ld };
            }
            return cd;
          });

          for (const ld of currentLocal) {
            if (!cloudMap.has(ld.id)) {
              merged.push(ld);
              cloudMap.set(ld.id, ld);
            }
          }
          localStorage.setItem('upmizik_donations', JSON.stringify(merged));
        } catch {}
        setInternalRefreshKey(k => k + 1);
      }
    });

    const handleDonationCustomSync = (event: Event) => {
      setInternalRefreshKey(k => k + 1);
      const customEv = event as CustomEvent<{ action?: string; donation?: DonationItem }>;
      
      if (customEv.detail?.action === 'add' && customEv.detail?.donation) {
        const incoming = customEv.detail.donation;
        if (!knownDonationIdsRef.current.has(incoming.id)) {
          knownDonationIdsRef.current.add(incoming.id);
          triggerLiveDonationAlert(incoming);
        }
      }
    };

    const handleStorageOrCustomSync = () => {
      setInternalRefreshKey(k => k + 1);

      // Check for any newly added pending donations in storage that we haven't seen yet
      try {
        const freshList = StorageService.getDonations(currentAdmin);
        freshList.forEach(don => {
          if (!knownDonationIdsRef.current.has(don.id)) {
            knownDonationIdsRef.current.add(don.id);
            if (!isInitialMountRef.current && don.status === 'pending') {
              triggerLiveDonationAlert(don);
            }
          }
        });
      } catch {}
    };

    window.addEventListener('upmizik_artist_updated', handleStorageOrCustomSync);
    window.addEventListener('upmizik_donation_updated', handleDonationCustomSync);
    window.addEventListener('upmizik_music_updated', handleStorageOrCustomSync);
    window.addEventListener('storage', handleStorageOrCustomSync);

    return () => {
      unsubscribeArtists();
      unsubscribeDonations();
      window.removeEventListener('upmizik_artist_updated', handleStorageOrCustomSync);
      window.removeEventListener('upmizik_donation_updated', handleDonationCustomSync);
      window.removeEventListener('upmizik_music_updated', handleStorageOrCustomSync);
      window.removeEventListener('storage', handleStorageOrCustomSync);
    };
  }, [currentAdmin, triggerLiveDonationAlert]);

  // Effective donations: prefer real-time Firestore onSnapshot list, merged with stored list
  const effectiveDonations = useMemo(() => {
    const stored = StorageService.getDonations(currentAdmin);
    let baseList: DonationItem[] = [];
    if (realtimeFirestoreDonations && realtimeFirestoreDonations.length > 0) {
      const localMap = new Map(stored.map(d => [d.id, d]));
      const cloudMap = new Map(realtimeFirestoreDonations.map(d => [d.id, d]));
      
      const merged = realtimeFirestoreDonations.map(cd => {
        const ld = localMap.get(cd.id);
        if (ld) {
          // If local has active/validated or rejected status while cloud is still pending, trust local admin action
          if (ld.status && ld.status !== 'pending' && cd.status === 'pending') {
            return { ...cd, ...ld, status: ld.status };
          }
          return { ...cd, ...ld };
        }
        return cd;
      });

      for (const ld of stored) {
        if (!cloudMap.has(ld.id)) {
          merged.push(ld);
          cloudMap.set(ld.id, ld);
        }
      }
      baseList = merged;
    } else if (stored && stored.length > 0) {
      baseList = stored;
    } else {
      baseList = donations || [];
    }

    // Apply optimistic updates
    return baseList.map(d => {
      if (optimisticDonationStatus[d.id]) {
        return { ...d, status: optimisticDonationStatus[d.id] };
      }
      return d;
    });
  }, [realtimeFirestoreDonations, donations, currentAdmin, internalRefreshKey, optimisticDonationStatus]);

  // Effective artists: prefer real-time Firestore onSnapshot list, merged with stored list
  const effectiveArtists = useMemo(() => {
    const stored = StorageService.getArtists();
    let baseList: ArtistUser[] = [];
    if (realtimeFirestoreArtists && realtimeFirestoreArtists.length > 0) {
      const localMap = new Map(stored.map(a => [a.id, a]));
      const cloudMap = new Map(realtimeFirestoreArtists.map(a => [a.id, a]));
      
      const merged = realtimeFirestoreArtists.map(ca => {
        const la = localMap.get(ca.id);
        if (la) {
          // If local has active or rejected status while cloud is still pending, trust local admin action
          if (la.status && la.status !== 'pending' && ca.status === 'pending') {
            return { ...ca, ...la, status: la.status };
          }
          return { ...ca, ...la };
        }
        return ca;
      });

      for (const la of stored) {
        if (!cloudMap.has(la.id)) {
          merged.push(la);
          cloudMap.set(la.id, la);
        }
      }
      baseList = merged;
    } else if (stored && stored.length > 0) {
      baseList = stored;
    } else {
      baseList = artists || [];
    }

    // Merge with incoming artists prop from App.tsx
    const propMap = new Map<string, ArtistUser>((artists || []).map(a => [a.id, a]));

    return baseList.map(a => {
      let finalArt = { ...a };
      const propArt = propMap.get(a.id);
      if (propArt && propArt.status && propArt.status !== 'pending') {
        finalArt.status = propArt.status;
        if (propArt.registrationRejectionReason) {
          finalArt.registrationRejectionReason = propArt.registrationRejectionReason;
        }
      }
      if (optimisticArtistStatus[a.id]) {
        finalArt.status = optimisticArtistStatus[a.id];
      }
      return finalArt;
    });
  }, [realtimeFirestoreArtists, artists, internalRefreshKey, optimisticArtistStatus]);

  // Comprehensive calculation of each artist's monthly revenue & payouts (-15% + $0.99 fee)
  const artistsEarningStats = useMemo(() => {
    return effectiveArtists.map((art) => {
      // Find all tracks uploaded by this artist or featuring this artist
      const artistSongs = musicList.filter(
        (m) => m.artistId === art.id || m.collab?.artistId === art.id
      );

      // Gross earned from tracks
      const grossFromSongs = artistSongs.reduce(
        (sum, s) => sum + (s.totalDonations || 0),
        0
      );

      // Validated direct support transactions for this artist
      const matchedDonations = effectiveDonations.filter(
        (d) =>
          (d.artistId === art.id ||
            (art.stageName && d.artistName && d.artistName.toLowerCase() === art.stageName.toLowerCase())) &&
          d.status === 'validated'
      );

      const grossFromDonations = matchedDonations.reduce(
        (sum, d) =>
          sum + (d.currency === 'HTG' ? d.amount / exchangeRate : d.amount),
        0
      );

      // Actual total gross revenue (USD)
      const totalGross = Math.max(
        grossFromSongs,
        grossFromDonations,
        art.totalDonationsReceived || 0
      );

      const totalListens = artistSongs.reduce(
        (sum, s) => sum + (s.listens || 0),
        0
      );

      // Platform Fee Formula: -15% Commission + $0.99 Fixed Fee
      // If totalGross > 0: Platform takes (Gross * 0.15) + $0.99
      // Artist Net Share = Gross - Platform Fee = (Gross * 0.85) - $0.99
      const platformShare15Pct = Number((totalGross * 0.15).toFixed(2));
      const platformFixedFee = totalGross > 0 ? 0.99 : 0;
      const platformFeeUsd = totalGross > 0 ? Number((platformShare15Pct + platformFixedFee).toFixed(2)) : 0;
      const artistNetUsd = totalGross > 0 ? Math.max(0, Number((totalGross - platformFeeUsd).toFixed(2))) : 0;

      const totalGrossHtg = Math.round(totalGross * exchangeRate);
      const platformFeeHtg = Math.round(platformFeeUsd * exchangeRate);
      const artistNetHtg = Math.round(artistNetUsd * exchangeRate);
      const effectivePercentage = totalGross > 0 ? ((artistNetUsd / totalGross) * 100).toFixed(1) : '85.0';

      return {
        artist: art,
        artistSongs,
        totalGross,
        totalGrossHtg,
        platformShare15Pct,
        platformFixedFee,
        platformFeeUsd,
        platformFeeHtg,
        artistNetUsd,
        artistNetHtg,
        effectivePercentage,
        totalListens,
        songsCount: artistSongs.length,
        donationsCount: matchedDonations.length
      };
    });
  }, [artists, musicList, donations, exchangeRate]);

  // Sorted Artists by Earnings (Depi nan pi fò rive nan pi piti)
  const sortedArtistsByEarnings = useMemo(() => {
    return [...artistsEarningStats].sort((a, b) => {
      if (payoutsSortBy === 'gross_desc') {
        if (b.totalGross !== a.totalGross) return b.totalGross - a.totalGross;
        return b.totalListens - a.totalListens;
      }
      if (payoutsSortBy === 'gross_asc') {
        if (a.totalGross !== b.totalGross) return a.totalGross - b.totalGross;
        return a.totalListens - b.totalListens;
      }
      if (payoutsSortBy === 'songs_count') {
        return b.songsCount - a.songsCount;
      }
      if (payoutsSortBy === 'listens') {
        return b.totalListens - a.totalListens;
      }
      return b.totalGross - a.totalGross;
    });
  }, [artistsEarningStats, payoutsSortBy]);

  const artistsWithEarningsCount = useMemo(() => {
    return artistsEarningStats.filter((a) => a.totalGross > 0).length;
  }, [artistsEarningStats]);

  // Aggregate totals across all artists who earned money & pending payouts status
  const payoutAggregateTotals = useMemo(() => {
    const totalGross = artistsEarningStats.reduce((sum, a) => sum + a.totalGross, 0);
    const totalPlatformFee = artistsEarningStats.reduce((sum, a) => sum + a.platformFeeUsd, 0);
    const totalArtistNet = artistsEarningStats.reduce((sum, a) => sum + a.artistNetUsd, 0);
    const totalGrossHtg = Math.round(totalGross * exchangeRate);
    const totalPlatformFeeHtg = Math.round(totalPlatformFee * exchangeRate);
    const totalArtistNetHtg = Math.round(totalArtistNet * exchangeRate);

    // Unpaid specific computations
    const unpaidArtists = artistsEarningStats.filter((a) => !a.artist.isPaidThisMonth && a.totalGross > 0);
    const totalUnpaidNetUsd = Number(unpaidArtists.reduce((sum, a) => sum + a.artistNetUsd, 0).toFixed(2));
    const totalUnpaidGrossUsd = Number(unpaidArtists.reduce((sum, a) => sum + a.totalGross, 0).toFixed(2));
    const totalUnpaidNetHtg = Math.round(totalUnpaidNetUsd * exchangeRate);
    const unpaidCount = unpaidArtists.length;

    // Paid specific computations
    const paidArtists = artistsEarningStats.filter((a) => a.artist.isPaidThisMonth && a.totalGross > 0);
    const totalPaidNetUsd = Number(paidArtists.reduce((sum, a) => sum + (a.artist.paidAmountThisMonth ?? a.artistNetUsd), 0).toFixed(2));
    const totalPaidNetHtg = Math.round(totalPaidNetUsd * exchangeRate);
    const paidCount = paidArtists.length;

    // Top unpaid artist (highest pending balance)
    const topUnpaidArtist = unpaidArtists.length > 0 ? unpaidArtists[0] : null;

    // Is threshold exceeded?
    const isThresholdExceeded = totalUnpaidNetUsd >= payoutAlertThreshold && totalUnpaidNetUsd > 0;

    return {
      totalGross,
      totalGrossHtg,
      totalPlatformFee,
      totalPlatformFeeHtg,
      totalArtistNet,
      totalArtistNetHtg,
      unpaidArtists,
      totalUnpaidNetUsd,
      totalUnpaidGrossUsd,
      totalUnpaidNetHtg,
      unpaidCount,
      paidArtists,
      totalPaidNetUsd,
      totalPaidNetHtg,
      paidCount,
      topUnpaidArtist,
      isThresholdExceeded
    };
  }, [artistsEarningStats, exchangeRate, payoutAlertThreshold]);

  // Open Payment Confirmation Modal
  const handleOpenPayArtistModal = (art: ArtistUser, suggestedAmount?: number) => {
    setPayingArtistTarget(art);
    const artistStat = artistsEarningStats.find((s) => s.artist.id === art.id);
    const defaultAmount = suggestedAmount !== undefined 
      ? suggestedAmount 
      : (artistStat ? artistStat.artistNetUsd : (art.paidAmountThisMonth || 0));
    setPayingAmountUsd(defaultAmount);
    setPayingReferenceInput(art.paidReferenceThisMonth || `UPM-PAY-${Math.floor(100000 + Math.random() * 900000)}`);
    setPayingMethodInput('MonCash');
    setPayingNotesInput('');
    setPayingSendNotification(true);
    setPayingNotificationCopied(false);
  };

  const handleConfirmPayArtist = () => {
    if (!payingArtistTarget) return;
    const finalAmount = Number(payingAmountUsd) || 0;
    const finalRef = payingReferenceInput.trim() || `UPM-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    const details = {
      paidAmount: finalAmount,
      reference: finalRef,
      paymentMethod: payingMethodInput,
      notes: payingNotesInput.trim() || undefined,
      sendNotification: payingSendNotification
    };

    if (onToggleArtistPaymentStatus) {
      onToggleArtistPaymentStatus(payingArtistTarget.id, true, details);
    } else {
      StorageService.markArtistPaidStatus(payingArtistTarget.id, true, {
        ...details,
        adminName: currentAdmin?.name || 'Mr Clauvens'
      });
    }
    setPayingArtistTarget(null);
  };

  const handleRevertPayArtist = (art: ArtistUser) => {
    if (window.confirm(`Èske w vle anile estati "Peye" pou atis "${art.stageName}"?`)) {
      if (onToggleArtistPaymentStatus) {
        onToggleArtistPaymentStatus(art.id, false);
      } else {
        StorageService.markArtistPaidStatus(art.id, false, {
          adminName: currentAdmin?.name || 'Mr Clauvens'
        });
      }
    }
  };

  // Automatically scroll to top when admin switches tabs
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Strict Authorization & Role Check
  const isAuthorizedSuperAdmin = Boolean(
    currentAdmin &&
    currentAdmin.role === 'super_admin'
  );

  if (!isAuthorizedSuperAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="bg-[#0b1120] border border-red-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400">
            <ShieldCheck className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Aksè Refize: Espas Administratè Pwoteje</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
            Tout rapò finansyè, tranzaksyon MonCash/Natcash, ak done revni platfòm nan kache e pwoteje. Ou dwe konekte kòm Administratè Verifye (Mr Clauvens) pou gen aksè.
          </p>
          <button
            onClick={onLogoutAdmin}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-900/30"
          >
            Retounen sou Akèy la
          </button>
        </div>
      </div>
    );
  }

  const handleOpenProof = (url: string, details?: { title?: string; donor?: string; amount?: string; date?: string; phone?: string; type?: string }) => {
    setProofModalUrl(url);
    setProofZoom(1);
    setProofRotate(0);
    setProofModalDetails(details || null);
  };

  const pendingDonations = effectiveDonations.filter(d => d.status === 'pending');
  const validatedDonations = effectiveDonations.filter(d => d.status === 'validated');
  const rejectedDonations = effectiveDonations.filter(d => d.status === 'rejected');
  const pendingArtists = effectiveArtists.filter(a => a.status === 'pending');
  const activeArtists = effectiveArtists.filter(a => a.status === 'active' || !a.status);
  const rejectedArtists = effectiveArtists.filter(a => a.status === 'rejected');

  // Financial calculations in USD
  const totalGrossDonations = musicList.reduce((acc, m) => acc + (m.totalDonations || 0), 0);
  const totalArtistPayoutsNum = totalGrossDonations * 0.85;
  const totalAdminPlatformRevenueNum = totalGrossDonations * 0.15 + (effectiveDonations.length * 0.99);

  const validatedGross = validatedDonations.reduce((acc, d) => acc + (d.amount || 0), 0);
  const validatedArtistPayouts = validatedDonations.reduce((acc, d) => acc + (d.artistShare || d.amount * 0.85), 0);
  const validatedPlatformRevenue = validatedDonations.reduce((acc, d) => acc + (d.platformShare || d.amount * 0.15), 0);

  // Platform traffic & unlimited capacity metrics
  const platformVisitsCount = useMemo(() => StorageService.getSiteVisits(), []);
  const totalGlobalListensCount = useMemo(() => musicList.reduce((acc, m) => acc + (m.listens || 0), 0), [musicList]);

  // Artist registration fee calculations ($4.99 USD)
  const totalArtistRegistrationFeesCollected = activeArtists.length * 4.99;
  const pendingArtistRegistrationFees = pendingArtists.length * 4.99;

  // Helper formatting functions for dual USD + HTG
  const toHtg = (usd: number) => usd * exchangeRate;
  
  const formatUsdStr = (usd: number) => `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  const formatHtgStr = (usd: number) => `${Math.round(toHtg(usd)).toLocaleString('en-US')} HTG`;

  const renderDualAmount = (
    usdVal: number,
    options?: {
      colorUsd?: string;
      colorHtg?: string;
      boldHtg?: boolean;
      compact?: boolean;
    }
  ) => {
    const usdStr = `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const htgStr = `${Math.round(toHtg(usdVal)).toLocaleString('en-US')} HTG`;

    if (currencyMode === 'USD') {
      return (
        <span className={options?.colorUsd || 'font-mono font-bold text-white'}>
          {usdStr}
        </span>
      );
    }
    if (currencyMode === 'HTG') {
      return (
        <span className={options?.colorHtg || 'font-mono font-bold text-yellow-400'}>
          {htgStr}
        </span>
      );
    }
    // Mode 'both'
    if (options?.compact) {
      return (
        <div className="leading-tight">
          <span className={`${options?.colorUsd || 'font-mono font-bold text-white'}`}>{usdStr}</span>
          <span className={`block text-[10px] font-mono ${options?.colorHtg || 'text-slate-400'}`}>~{htgStr}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <span className={`${options?.colorUsd || 'font-mono font-bold text-white'}`}>{usdStr}</span>
        <span className={`text-[10px] font-mono ${options?.boldHtg ? 'font-bold' : 'font-medium'} ${options?.colorHtg || 'text-slate-400'}`}>
          ~{htgStr}
        </span>
      </div>
    );
  };

  // Admin Credits Management Helpers
  const handleAddMusicCredit = () => {
    const newCredit: MusicCredit = {
      id: 'cred-adm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: '',
      role: 'Featuring / Vokal',
      percentage: 10,
      phone: '',
      notes: ''
    };
    setMusicCredits((prev) => [...prev, newCredit]);
  };

  const handleRemoveMusicCredit = (id: string) => {
    setMusicCredits((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateMusicCredit = (id: string, field: keyof MusicCredit, value: any) => {
    setMusicCredits((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (field === 'artistId') {
          const selected = artists.find((a) => a.id === value);
          return {
            ...c,
            artistId: value || undefined,
            name: selected ? selected.stageName : c.name,
            phone: selected ? selected.phone : c.phone
          };
        }
        return { ...c, [field]: value };
      })
    );
  };

  const handleOpenEditMusic = (song: MusicItem) => {
    setEditingSong(song);
    setMusicTitle(song.title || '');
    setMusicReleaseFormat(song.releaseFormat || 'single');
    setMusicAlbumName(song.albumName || '');
    setMusicTrackNumber(typeof song.trackNumber === 'number' ? song.trackNumber : '');
    setMusicCredits(song.credits ? JSON.parse(JSON.stringify(song.credits)) : []);
    setMusicArtistId(song.artistId || '');
    setMusicFeat(song.feat || '');
    setMusicCollabArtistId(song.collab?.artistId || '');
    setMusicCollabRole(song.collab?.role || 'Featuring');
    setMusicCategory(song.category || 'Kompa');
    setMusicPosition(typeof song.position === 'number' ? song.position : '');
    setMusicStatus(song.status || 'active');
    setMusicCoverUrl(song.coverUrl || '');
    setMusicAudioUrl(song.audioUrl || '');
    setMusicDuration(song.duration || 180);
    setMusicYt(song.youtubeUrl || '');
    setMusicTiktok(song.tiktokUrl || '');
    setMusicIg(song.instagramUrl || '');
    setActiveTab('add_music');
  };

  const handleQuickPositionChange = (song: MusicItem, newPosVal: number) => {
    if (isNaN(newPosVal) || newPosVal < 1 || newPosVal === song.position) return;
    const updated = { ...song, position: Math.floor(newPosVal) };
    onSaveMusicItem(updated);
  };

  const handleToggleMusicStatus = (song: MusicItem, forcedStatus?: 'active' | 'pending' | 'rejected') => {
    const currentStatus = song.status || 'active';
    let nextStatus: 'active' | 'pending' | 'rejected' = forcedStatus || (currentStatus === 'active' ? 'pending' : 'active');
    const updated: MusicItem = {
      ...song,
      status: nextStatus
    };
    onSaveMusicItem(updated);
  };

  const handleExportRevenueCsv = () => {
    const headers = [
      'Pozisyon',
      'Tit Moso',
      'Atis Prensipal',
      'Kolaborasyon (Featuring)',
      'Kategori',
      'Kantite Ekout',
      'Kantite Pataj',
      'Total Sipo Resevwa (USD)',
      'Total Sipo Resevwa (HTG)',
      'Pati Atis 85% (USD)',
      'Pati Atis 85% (HTG)',
      'Pati UpMizik 15% (USD)',
      'Pati UpMizik 15% (HTG)'
    ];

    const rows = musicList.map((m, idx) => {
      const gross = m.totalDonations || 0;
      const artistShareUsd = gross * 0.85;
      const platformShareUsd = gross * 0.15;
      const grossHtg = gross * exchangeRate;
      const artistShareHtg = artistShareUsd * exchangeRate;
      const platformShareHtg = platformShareUsd * exchangeRate;

      const escapeField = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

      return [
        m.position || idx + 1,
        escapeField(m.title),
        escapeField(m.artistName),
        m.collab ? escapeField(`${m.collab.artistName} (${m.collab.role || 'Featuring'})`) : '""',
        escapeField(m.category),
        m.listens || 0,
        m.sharesCount || 0,
        gross.toFixed(2),
        Math.round(grossHtg),
        artistShareUsd.toFixed(2),
        Math.round(artistShareHtg),
        platformShareUsd.toFixed(2),
        Math.round(platformShareHtg)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `UpMizik_Rapo_Estimasyon_Revni_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveMusicForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicTitle.trim()) return;

    const artistObj = artists.find(a => a.id === musicArtistId);
    const artistName = artistObj ? artistObj.stageName : 'Atis UpMizik';

    const collabArtistObj = musicCollabArtistId
      ? artists.find(a => a.id === musicCollabArtistId)
      : null;

    const collabData = collabArtistObj
      ? {
          artistId: collabArtistObj.id,
          artistName: collabArtistObj.stageName,
          avatarUrl: collabArtistObj.avatarUrl,
          role: musicCollabRole || 'Featuring'
        }
      : undefined;

    // Clean credits
    const cleanedCredits = musicCredits
      .filter((c) => c.name && c.name.trim().length > 0)
      .map((c) => ({
        ...c,
        name: c.name.trim(),
        percentage: Number(c.percentage) || 0
      }));

    const songToSave: MusicItem = {
      id: editingSong ? editingSong.id : `music-${Date.now()}`,
      title: musicTitle.trim(),
      artistId: musicArtistId,
      artistName: artistName,
      feat: musicFeat.trim() || undefined,
      collab: collabData,
      category: musicCategory,
      releaseFormat: musicReleaseFormat,
      albumName: musicReleaseFormat !== 'single' && musicAlbumName.trim() ? musicAlbumName.trim() : undefined,
      trackNumber: typeof musicTrackNumber === 'number' && musicTrackNumber > 0 ? musicTrackNumber : undefined,
      credits: cleanedCredits.length > 0 ? cleanedCredits : undefined,
      coverUrl: musicCoverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      audioUrl: musicAudioUrl || '',
      duration: musicDuration || (editingSong ? editingSong.duration : 190),
      listens: editingSong ? editingSong.listens : 0,
      totalDonations: editingSong ? editingSong.totalDonations : 0,
      position: musicPosition ? Number(musicPosition) : undefined,
      status: musicStatus || (editingSong ? editingSong.status : 'active') || 'active',
      youtubeUrl: musicYt.trim() || undefined,
      tiktokUrl: musicTiktok.trim() || undefined,
      instagramUrl: musicIg.trim() || undefined,
      createdAt: editingSong ? editingSong.createdAt : new Date().toISOString().split('T')[0],
      commentsCount: editingSong ? editingSong.commentsCount : 0
    };

    onSaveMusicItem(songToSave);
    setEditingSong(null);
    // Reset
    setMusicTitle('');
    setMusicReleaseFormat('single');
    setMusicAlbumName('');
    setMusicTrackNumber('');
    setMusicCredits([]);
    setMusicFeat('');
    setMusicCollabArtistId('');
    setMusicCollabRole('Featuring');
    setMusicPosition('');
    setMusicStatus('active');
    setMusicCoverUrl('');
    setMusicAudioUrl('');
    setMusicDuration(180);
    setActiveTab('reports');
  };

  const handleSaveTop3 = () => {
    onSaveTop3Override({
      enabled: top3ManualEnabled,
      topIds: [top1Id, top2Id, top3Id].filter(Boolean)
    });
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-fadeIn">
      
      {/* Admin Header & Banner */}
      <div className="bg-[#0a0f1d]/90 border border-yellow-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-xl shadow-yellow-400/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Espas Administratè
              </h1>
              <span className="bg-yellow-400 text-slate-950 text-xs font-black uppercase px-2 py-0.5 rounded">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-yellow-300/90 font-medium mt-0.5">
              Administratè an Chèf: <strong>Mr Clauvens</strong> (upmizik@gmail.com)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="admin-logout-btn"
            onClick={onLogoutAdmin}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#05070a] hover:bg-white/[0.08] text-red-400 border border-red-900/50 flex items-center gap-2 transition-colors shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sòti nan Admin</span>
          </button>
        </div>
      </div>

      {/* Global Financial Quick Overview Bar with Dual USD & HTG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Gross Support */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-slate-400">Total Sipò Brut Resevwa</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              100% Brut
            </span>
          </div>
          <div className="pt-1">
            <p className="text-2xl font-black text-yellow-400 font-mono">
              ${totalGrossDonations.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-yellow-300 font-sans font-medium">USD</span>
            </p>
            <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
              ~{Math.round(toHtg(totalGrossDonations)).toLocaleString('en-US')} <span className="text-[11px] text-slate-400 font-sans font-normal">Goud (HTG)</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">Tout donasyon anrejistre sou platfòm nan</p>
        </div>

        {/* 2. Total Artist Payouts 85% */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-slate-400">Pati Atis yo Pou Regle</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              85% Nèt
            </span>
          </div>
          <div className="pt-1">
            <p className="text-2xl font-black text-emerald-400 font-mono">
              ${totalArtistPayoutsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-emerald-300 font-sans font-medium">USD</span>
            </p>
            <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
              ~{Math.round(toHtg(totalArtistPayoutsNum)).toLocaleString('en-US')} <span className="text-[11px] text-slate-400 font-sans font-normal">Goud (HTG)</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">Peman pwograme pou 1ye nan mwa a</p>
        </div>

        {/* 3. Platform Revenue 15% + $0.99 */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-slate-400">Reveni Platfòm UpMizik</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              15% + $0.99
            </span>
          </div>
          <div className="pt-1">
            <p className="text-2xl font-black text-blue-400 font-mono">
              ${totalAdminPlatformRevenueNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-blue-300 font-sans font-medium">USD</span>
            </p>
            <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
              ~{Math.round(toHtg(totalAdminPlatformRevenueNum)).toLocaleString('en-US')} <span className="text-[11px] text-slate-400 font-sans font-normal">Goud (HTG)</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">Frè antretyen, sèvè ak sèvis</p>
        </div>

        {/* 4. Total Artist Registration Fees ($4.99 / 723.55 HTG) */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-slate-400">Frè Enskripsyon Atis</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              $4.99 / Atis
            </span>
          </div>
          <div className="pt-1">
            <p className="text-2xl font-black text-purple-400 font-mono">
              ${totalArtistRegistrationFeesCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-purple-300 font-sans font-medium">USD</span>
            </p>
            <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
              ~{Math.round(toHtg(totalArtistRegistrationFeesCollected)).toLocaleString('en-US')} <span className="text-[11px] text-slate-400 font-sans font-normal">Goud ({activeArtists.length} atis)</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">
            {pendingArtists.length > 0 ? (
              <span className="text-yellow-400 font-semibold">{pendingArtists.length} atis an atant (~${(pendingArtistRegistrationFees).toFixed(2)} USD • {Math.round(toHtg(pendingArtistRegistrationFees)).toLocaleString()} HTG)</span>
            ) : (
              'Tout kont atis yo valide'
            )}
          </p>
        </div>
      </div>

      {/* Global Unlimited Capacity & Volume Status Banner */}
      <div className="bg-gradient-to-r from-[#0a1128] via-[#0d1633] to-[#0a1128] border border-blue-500/25 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Infinity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Kapasite Platfòm UpMizik (100% Ilimite)</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ilimite & San Limitasyon
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Platfòm nan prepare pou resevwa yon kantite <strong>atis</strong>, <strong>mizik</strong>, ak <strong>vizitè</strong> ki konplètman ilimite san okenn baryè.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[11px] text-slate-200 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistèm Otonòm & Fleksib
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#05070a]/70 border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-yellow-400" />
                Total Atis Enskri
              </span>
              <Infinity className="w-3 h-3 text-yellow-400/80" />
            </div>
            <p className="text-xl font-black text-white font-mono mt-1">
              {artists.length} <span className="text-xs font-sans text-yellow-400 font-bold">atis</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {activeArtists.length} aktif • {pendingArtists.length} an atant
            </p>
          </div>

          <div className="bg-[#05070a]/70 border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-blue-400" />
                Total Moso Mizik
              </span>
              <Infinity className="w-3 h-3 text-blue-400/80" />
            </div>
            <p className="text-xl font-black text-white font-mono mt-1">
              {musicList.length} <span className="text-xs font-sans text-blue-400 font-bold">moso</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {musicList.filter(m => m.status === 'active').length} pibliye an liy
            </p>
          </div>

          <div className="bg-[#05070a]/70 border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Total Vizit & Trafik
              </span>
              <Infinity className="w-3 h-3 text-emerald-400/80" />
            </div>
            <p className="text-xl font-black text-emerald-400 font-mono mt-1">
              {platformVisitsCount.toLocaleString()} <span className="text-xs font-sans text-emerald-300 font-bold">vizit</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Ogmante an tan reyèl
            </p>
          </div>

          <div className="bg-[#05070a]/70 border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-purple-400" />
                Total Ekout Mizikal
              </span>
              <Infinity className="w-3 h-3 text-purple-400/80" />
            </div>
            <p className="text-xl font-black text-purple-400 font-mono mt-1">
              {totalGlobalListensCount.toLocaleString()} <span className="text-xs font-sans text-purple-300 font-bold">ekout</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Difizyon tout tracks yo
            </p>
          </div>
        </div>
      </div>

      {/* Currency Filter & Exchange Rate Control Toolbar */}
      <div className="bg-[#05070a]/90 border border-yellow-500/20 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white">
                Kontwòl Lajan & Taux Dola Ayiti (USD ↔ HTG)
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                1 USD = {exchangeRate.toFixed(2)} HTG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tout kalkil nan espas admin nan ap fèt an <strong>Dola ($ USD)</strong> ak an <strong>Goud (HTG)</strong> an menm tan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Display Filter Selector */}
          <div className="flex items-center bg-[#0a0f1d] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setCurrencyMode('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currencyMode === 'both'
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toulede (USD + HTG)
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode('USD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currencyMode === 'USD'
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sèlman Dola ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode('HTG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currencyMode === 'HTG'
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sèlman Goud (HTG)
            </button>
          </div>

          {/* Exchange Rate Input & Reset */}
          <div className="flex items-center gap-1.5 bg-[#0a0f1d] px-2.5 py-1.5 rounded-xl border border-white/[0.08]">
            <span className="text-[11px] text-slate-400 font-semibold">Taux:</span>
            <input
              type="number"
              min="50"
              max="500"
              step="0.5"
              value={exchangeRate ?? DEFAULT_HTG_EXCHANGE_RATE}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || DEFAULT_HTG_EXCHANGE_RATE)}
              className="w-16 bg-[#05070a] border border-white/[0.12] rounded-lg px-2 py-0.5 text-xs text-yellow-300 font-mono font-bold text-center focus:border-yellow-400 outline-none"
            />
            <span className="text-[10px] text-slate-400 font-mono">HTG</span>
            {exchangeRate !== DEFAULT_HTG_EXCHANGE_RATE && (
              <button
                type="button"
                onClick={() => setExchangeRate(DEFAULT_HTG_EXCHANGE_RATE)}
                className="p-1 rounded-md text-slate-400 hover:text-yellow-400 hover:bg-white/[0.06]"
                title={`Remèt a ${DEFAULT_HTG_EXCHANGE_RATE} HTG`}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING REAL-TIME DONATION NOTIFICATIONS TOAST STACK */}
      <div
        id="admin-live-donation-toasts-container"
        className="fixed top-4 sm:top-6 right-4 sm:right-6 z-[9999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none"
        aria-live="polite"
      >
        {liveDonationToasts.map((toastItem) => {
          const { id: toastId, donation: don } = toastItem;
          const donHtg = Math.round(toHtg(don.amount));
          const methodLabel = don.donorPhone?.startsWith('+1') || don.donorPhone?.includes('card')
            ? 'Kat labank'
            : don.donorPhone?.startsWith('4') || don.donorPhone?.startsWith('+5094')
            ? 'Natcash'
            : 'MonCash';

          return (
            <div
              key={toastId}
              id={`live-toast-${don.id}`}
              className="pointer-events-auto relative overflow-hidden bg-gradient-to-br from-[#1c1404]/98 via-[#0f172a]/98 to-[#06241a]/98 border-2 border-amber-400 rounded-2xl p-4 shadow-[0_12px_45px_rgba(245,158,11,0.35)] backdrop-blur-2xl animate-bounce-short transition-all"
            >
              {/* Top Accent Pulsing Glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 animate-pulse" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/40 shrink-0">
                    <BellRing className="w-5 h-5 text-slate-950 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white shadow-sm font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        NOUVO SIPÒ AN TAN REYÈL
                      </span>
                      <span className="text-[10px] text-amber-300 font-bold font-mono">
                        Fèk Resevwa!
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white mt-1">
                      {don.donorName || 'Yon Fanatik'} te voye yon sipò!
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => dismissLiveToast(toastId)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.1] transition-colors"
                  title="Fèmen notifikasyon an"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Donation Details Card */}
              <div className="mt-3 bg-black/60 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 truncate font-semibold">
                    Moso: <span className="text-amber-300">"{don.musicTitle}"</span>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Atis: <span className="text-white font-medium">{don.artistName}</span>
                  </p>
                  {don.donorPhone && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Tel: {don.donorPhone} ({methodLabel})
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-lg">
                  <span className="text-sm font-black text-amber-400 font-mono block">
                    ${don.amount.toFixed(2)} USD
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono block">
                    ~{donHtg.toLocaleString()} HTG
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {don.proofUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setProofModalInfo({
                          url: don.proofUrl!,
                          title: `Prèv Sipò - ${don.donorName || 'Fanatik'}`,
                          donorOrArtistName: `${don.donorName || 'Fanatik'} pou ${don.artistName}`,
                          phone: don.donorPhone || 'N/A',
                          amount: `$${don.amount.toFixed(2)} USD (~${donHtg.toLocaleString()} HTG)`,
                          musicTitle: don.musicTitle,
                          date: new Date(don.createdAt).toLocaleString('fr-FR'),
                          type: 'support'
                        });
                        setProofZoom(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 border border-white/[0.12] flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-300" />
                      <span>Gade Prèv</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('validations');
                      setValidationCategoryFilter('donations');
                      dismissLiveToast(toastId);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    Ale nan Tab
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onValidateDonation(don.id, true);
                      dismissLiveToast(toastId);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 flex items-center gap-1 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Valide</span>
                  </button>
                </div>
              </div>

              {/* Auto-Dismiss Timer Bar */}
              <div className="mt-2.5 w-full bg-white/[0.08] h-1 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ animation: 'shrinkWidth 12s linear forwards' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* REAL-TIME LIVE DONATION STREAM BANNER */}
      {recentLiveDonations.length > 0 && !isLiveBannerDismissed && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#1c1203]/95 via-[#101b2e]/95 to-[#06291e]/95 border-2 border-yellow-400/80 rounded-3xl p-4 sm:p-5 shadow-[0_0_35px_rgba(250,204,21,0.25)] backdrop-blur-xl animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-yellow-500/30 shrink-0">
                <Radio className="w-5 h-5 text-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white font-sans shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    AN TAN REYÈL
                  </span>
                  <span className="text-[11px] text-yellow-300 font-bold font-mono">
                    {recentLiveDonations.length} nouvo donasyon rive nan sesyon an
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Dènye donasyon:</span>
                  <span className="text-yellow-400 font-bold">{recentLiveDonations[0].donorName}</span>
                  <span className="text-slate-300 font-mono text-xs">(${recentLiveDonations[0].amount.toFixed(2)} USD / ~{Math.round(toHtg(recentLiveDonations[0].amount)).toLocaleString()} HTG)</span>
                  <span>pou</span>
                  <span className="text-emerald-300 font-medium">"{recentLiveDonations[0].musicTitle}"</span>
                  <span className="text-slate-400">({recentLiveDonations[0].artistName})</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Notifikasyon vizyèl & son an aktive an tan reyèl pou w pa janm rate yon nouvo sipò.
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleLiveAudio}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isLiveAudioEnabled
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30'
                    : 'bg-white/[0.06] text-slate-400 border-white/[0.1] hover:text-white'
                }`}
                title={isLiveAudioEnabled ? 'Koupe son notifikasyon' : 'Aktive son notifikasyon'}
              >
                {isLiveAudioEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-yellow-400" />
                    <span>Son Aktif</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>Son Koupe</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="admin-live-banner-validate-btn"
                onClick={() => {
                  setActiveTab('validations');
                  setValidationCategoryFilter('donations');
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-yellow-500/25 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ale nan Validasyon Sipò</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLiveBannerDismissed(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Fèmen banyè a"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PENDING ARTIST PAYOUTS THRESHOLD WARNING BANNER */}
      {payoutAggregateTotals.isThresholdExceeded && !isPayoutAlertDismissed && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#260f06]/95 via-[#1e0a08]/95 to-[#0f172a]/95 border-2 border-amber-500/70 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(245,158,11,0.22)] backdrop-blur-xl animate-fadeIn">
          {/* Background decorative glow */}
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-amber-500/30 pb-4 mb-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-red-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6 text-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Alèt Peman Atis Ki Dwe Regle
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Papòt Alèt: ${payoutAlertThreshold} USD Depase
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center flex-wrap gap-1.5">
                  <span>Atansyon Admin: Gen</span>
                  <span className="text-amber-400 font-mono">${payoutAggregateTotals.totalUnpaidNetUsd.toFixed(2)} USD</span>
                  <span className="text-slate-300 font-mono text-xs sm:text-sm">(~{payoutAggregateTotals.totalUnpaidNetHtg.toLocaleString()} HTG)</span>
                  <span>k ap tann pou peye {payoutAggregateTotals.unpaidCount} atis!</span>
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Total fon ki poko regle depase papòt sekirite w fikse a (<strong>${payoutAlertThreshold} USD</strong>). Pa bliye voye peman MonCash / Natcash yo pou atis yo ka resevwa kòb yo san delè.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('artist_payouts');
                  setPayoutsFilter('unpaid');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Coins className="w-4 h-4" />
                <span>Regle Peman Atis Yo ({payoutAggregateTotals.unpaidCount})</span>
              </button>

              {payoutAggregateTotals.topUnpaidArtist && (
                <button
                  type="button"
                  onClick={() => handleOpenPayArtistModal(payoutAggregateTotals.topUnpaidArtist!.artist, payoutAggregateTotals.topUnpaidArtist!.artistNetUsd)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center gap-1.5 border border-white/[0.1] transition-all"
                  title="Peye atis ki gen pi gwo montan an atant lan"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Peye {payoutAggregateTotals.topUnpaidArtist.artist.stageName} (${payoutAggregateTotals.topUnpaidArtist.artistNetUsd.toFixed(2)})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowThresholdConfigModal(true)}
                className="p-2.5 rounded-xl text-xs font-bold bg-black/50 hover:bg-black/80 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1"
                title="Chanje papòt alèt la"
              >
                <Sliders className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Papòt (${payoutAlertThreshold})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPayoutAlertDismissed(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Fèmen avètisman an pou kounye a"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metric Cards Row within the warning banner */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-3">
              <span className="text-[10px] text-amber-300/80 font-semibold block uppercase tracking-wider">Total K ap Tann</span>
              <span className="text-base font-black text-amber-400 font-mono">
                ${payoutAggregateTotals.totalUnpaidNetUsd.toFixed(2)} <span className="text-[10px] font-sans font-normal text-amber-200">USD</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-mono">
                ~{payoutAggregateTotals.totalUnpaidNetHtg.toLocaleString()} HTG
              </span>
            </div>

            <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-3">
              <span className="text-[10px] text-amber-300/80 font-semibold block uppercase tracking-wider">Atis ki Poko Peye</span>
              <span className="text-base font-black text-white font-mono">
                {payoutAggregateTotals.unpaidCount} <span className="text-[10px] font-sans font-normal text-slate-300">atis</span>
              </span>
              <span className="block text-[10px] text-slate-400">
                sou {artistsWithEarningsCount} ki fè kòb
              </span>
            </div>

            <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-3">
              <span className="text-[10px] text-amber-300/80 font-semibold block uppercase tracking-wider">Papòt Alèt Fikse</span>
              <span className="text-base font-black text-yellow-300 font-mono">
                ${payoutAlertThreshold} <span className="text-[10px] font-sans font-normal text-slate-300">USD</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-mono">
                ~{Math.round(payoutAlertThreshold * exchangeRate).toLocaleString()} HTG
              </span>
            </div>

            <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-3">
              <span className="text-[10px] text-amber-300/80 font-semibold block uppercase tracking-wider">Pi Gwo Solde</span>
              <span className="text-base font-black text-emerald-400 font-mono truncate block">
                {payoutAggregateTotals.topUnpaidArtist ? `$${payoutAggregateTotals.topUnpaidArtist.artistNetUsd.toFixed(2)}` : '$0.00'}
              </span>
              <span className="block text-[10px] text-slate-300 truncate">
                {payoutAggregateTotals.topUnpaidArtist?.artist.stageName || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PENDING VALIDATIONS ALERT BANNER (Nouvo Demand Atis & Donasyon an Atant) */}
      {(pendingArtists.length > 0 || pendingDonations.length > 0) && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#201505]/95 via-[#121929]/95 to-[#06241a]/95 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-[0_0_35px_rgba(245,158,11,0.18)] backdrop-blur-xl animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
                <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-sans shadow-sm">
                    Aksyon Administratè Disponib
                  </span>
                  <span className="text-[11px] text-amber-300 font-bold font-mono">
                    {pendingArtists.length + pendingDonations.length} eleman an atant
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  {pendingArtists.length > 0 && pendingDonations.length > 0 ? (
                    <span>Gen <strong>{pendingArtists.length} nouvo demand atis</strong> ak <strong>{pendingDonations.length} nouvo donasyon sipò</strong> k ap tann pou w valide yo!</span>
                  ) : pendingArtists.length > 0 ? (
                    <span>Gen <strong>{pendingArtists.length} nouvo dosye atis</strong> k ap tann revizyon prèv $4.99 USD ak validasyon!</span>
                  ) : (
                    <span>Gen <strong>{pendingDonations.length} nouvo donasyon sipò</strong> k ap tann revizyon prèv MonCash/Natcash!</span>
                  )}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Klike sou bouton ki sou kote a pou w al revize prèv yo epi valide yo kounye a.
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 shrink-0">
              {pendingArtists.length > 0 && (
                <button
                  type="button"
                  id="admin-quick-validate-artists-btn"
                  onClick={() => {
                    setActiveTab('artists_pending');
                    setArtistValidationFilter('pending');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Valide {pendingArtists.length} Atis ({pendingArtists.length})</span>
                </button>
              )}

              {pendingDonations.length > 0 && (
                <button
                  type="button"
                  id="admin-quick-validate-donations-btn"
                  onClick={() => setActiveTab('validations')}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Valide {pendingDonations.length} Sipò ({pendingDonations.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/[0.08]">
        <button
          id="admin-tab-reports"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'reports' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Rapò Mizik ({musicList.length})</span>
        </button>

        <button
          id="admin-tab-awards"
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'awards' ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-lg shadow-yellow-400/25 font-black' : 'bg-[#0a0f1d] text-yellow-400 hover:bg-white/[0.08] border border-yellow-400/30'
          }`}
        >
          <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span>Palmarès & Twofe Fizik</span>
        </button>

        <button
          id="admin-tab-payouts"
          onClick={() => {
            setActiveTab('artist_payouts');
            if (payoutAggregateTotals.isThresholdExceeded) {
              setPayoutsFilter('unpaid');
            }
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'artist_payouts'
              ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
              : payoutAggregateTotals.isThresholdExceeded
              ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/60 border border-amber-500/40 animate-pulse'
              : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Coins className="w-4 h-4 text-emerald-400" />
          <span>Lis Peman & Revni Atis ({artistsWithEarningsCount})</span>
          {payoutAggregateTotals.isThresholdExceeded ? (
            <span className="bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-md shadow-red-500/20">
              <AlertTriangle className="w-2.5 h-2.5" />
              ${payoutAggregateTotals.totalUnpaidNetUsd.toFixed(0)} DWE PEYE
            </span>
          ) : payoutAggregateTotals.totalArtistNet > 0 ? (
            <span className="bg-emerald-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              ${payoutAggregateTotals.totalArtistNet.toFixed(0)}
            </span>
          ) : null}
        </button>

        <button
          id="admin-tab-validations"
          onClick={() => setActiveTab('validations')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'validations' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Validasyon Sipò</span>
          {(pendingDonations.length + pendingArtists.length) > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {pendingDonations.length + pendingArtists.length}
            </span>
          )}
        </button>

        <button
          id="admin-tab-artists"
          onClick={() => setActiveTab('artists_pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'artists_pending' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Validasyon Atis</span>
          {pendingArtists.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {pendingArtists.length}
            </span>
          )}
        </button>

        <button
          id="admin-tab-all-artists"
          onClick={() => setActiveTab('all_artists')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'all_artists' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Jere Tout Atis & Sispansyon ({effectiveArtists.length})</span>
          {effectiveArtists.filter(a => a.status === 'suspended').length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {effectiveArtists.filter(a => a.status === 'suspended').length} sispann
            </span>
          )}
        </button>

        <button
          id="admin-tab-top3"
          onClick={() => setActiveTab('top3')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'top3' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Jere Top 3</span>
        </button>

        <button
          id="admin-tab-add-music"
          onClick={() => {
            setEditingSong(null);
            setMusicTitle('');
            setMusicFeat('');
            setMusicCollabArtistId('');
            setMusicPosition(StorageService.getNextAvailablePosition());
            setMusicCoverUrl('');
            setMusicAudioUrl('');
            setActiveTab('add_music');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'add_music' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ajoute / Modifye Mizik</span>
        </button>

        <button
          id="admin-tab-rpa"
          onClick={() => setActiveTab('rpa')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'rpa' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Jere RPA (Pouse Atis)</span>
        </button>

        <button
          id="admin-tab-pubs"
          onClick={() => setActiveTab('pubs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'pubs' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Jere Pubs (3 Ads)</span>
        </button>

        <button
          id="admin-tab-payment-settings"
          onClick={() => setActiveTab('payment_settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'payment_settings'
              ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-lg shadow-yellow-400/25 font-black'
              : 'bg-[#0a0f1d] text-yellow-400 hover:bg-white/[0.08] border border-yellow-400/30'
          }`}
        >
          <Sliders className="w-4 h-4 text-yellow-400" />
          <span>Mwayen Peman & Nimewo</span>
        </button>

        <button
          id="admin-tab-security-logs"
          onClick={() => {
            if (isSecurityUnlocked) {
              setActiveTab('security_logs');
            } else {
              setSecurityAuthCodeInput('');
              setSecurityAuthError('');
              setShowSecurityAuthModal(true);
            }
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'security_logs'
              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 font-black'
              : 'bg-[#0a0f1d] text-red-400 hover:bg-white/[0.08] border border-red-500/30'
          }`}
          title={isSecurityUnlocked ? 'Alèt Sekirite (Deboke)' : 'Aksè Pwoteje - Klike pou antre kòd sekirite a'}
        >
          {isSecurityUnlocked ? (
            <Unlock className="w-4 h-4 text-emerald-400" />
          ) : (
            <KeyRound className="w-4 h-4 text-amber-400 animate-bounce" />
          )}
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Alèt Sekirite & Entrizyon</span>
          {!isSecurityUnlocked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Kòd
            </span>
          )}
          {StorageService.getIntrusionLogs().filter(l => l.status === 'alert').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
              {StorageService.getIntrusionLogs().filter(l => l.status === 'alert').length}
            </span>
          )}
        </button>

        <button
          id="admin-tab-archive"
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'archive' ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20' : 'bg-[#0a0f1d] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Achiv & Reset</span>
        </button>
      </div>

      {/* VIEW 1: ALL MUSIC REPORT */}
      {activeTab === 'reports' && (() => {
        const activeMusicCount = musicList.filter(m => m.status === 'active' || !m.status).length;
        const pendingMusicCount = musicList.filter(m => m.status === 'pending').length;
        const rejectedMusicCount = musicList.filter(m => m.status === 'rejected').length;

        const filteredMusicList = musicList.filter(m => {
          const status = m.status || 'active';
          if (musicStatusFilter !== 'all' && status !== musicStatusFilter) return false;
          if (musicSearchQuery.trim()) {
            const q = musicSearchQuery.toLowerCase().trim();
            const matchesTitle = m.title.toLowerCase().includes(q);
            const matchesArtist = m.artistName.toLowerCase().includes(q);
            const matchesCategory = m.category.toLowerCase().includes(q);
            return matchesTitle || matchesArtist || matchesCategory;
          }
          return true;
        });

        return (
          <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl space-y-5 p-6 backdrop-blur-xl animate-fadeIn">
            
            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
                  <Music className="w-5 h-5 text-yellow-400" />
                  <span>Rapò Jeneral Tout Mizik & Modération</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jere estati piblikasyon (Validé / Pann), pozisyon, ekout, ak kalkil 85% / 15%
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowMonthlyRevenueChartInReports(!showMonthlyRevenueChartInReports)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    showMonthlyRevenueChartInReports
                      ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
                      : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]'
                  }`}
                  title="Afiche oswa kache tablo bar konparezon revni chak mwa"
                >
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span>{showMonthlyRevenueChartInReports ? 'Kache Tablo Kwasans' : 'Tablo Kwasans Mansyèl'}</span>
                </button>
                <button
                  id="btn-download-revenue-csv"
                  type="button"
                  onClick={handleExportRevenueCsv}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 border border-emerald-500/30 transition-all active:scale-95"
                  title="Telechaje tout done revni ak estimasyon yo an fòma CSV"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Rapò (CSV)</span>
                </button>
                <button
                  onClick={() => {
                    setEditingSong(null);
                    setMusicTitle('');
                    setMusicFeat('');
                    setMusicCollabArtistId('');
                    setMusicPosition(StorageService.getNextAvailablePosition());
                    setMusicStatus('active');
                    setMusicCoverUrl('');
                    setMusicAudioUrl('');
                    setActiveTab('add_music');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Ajoute Mizik</span>
                </button>
              </div>
            </div>

            {/* Quick Status Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setMusicStatusFilter('all')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  musicStatusFilter === 'all'
                    ? 'bg-white/[0.08] border-yellow-400/60 shadow-lg shadow-yellow-500/10'
                    : 'bg-[#05070a]/80 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Total Mizik</span>
                  <Music className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <p className="text-xl font-black text-white font-mono mt-1">{musicList.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Tout moso sou sistèm nan</p>
              </div>

              <div
                onClick={() => setMusicStatusFilter('active')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  musicStatusFilter === 'active'
                    ? 'bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/40'
                    : 'bg-[#05070a]/80 border-white/[0.06] hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Validé
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-black text-emerald-400 font-mono mt-1">{activeMusicCount}</p>
                <p className="text-[10px] text-emerald-300/70 mt-0.5">Pibliye sou sit la</p>
              </div>

              <div
                onClick={() => setMusicStatusFilter('pending')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  musicStatusFilter === 'pending'
                    ? 'bg-amber-950/50 border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/40'
                    : 'bg-[#05070a]/80 border-white/[0.06] hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-amber-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Pann
                  </span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xl font-black text-amber-300 font-mono mt-1">{pendingMusicCount}</p>
                <p className="text-[10px] text-amber-200/70 mt-0.5">An atant modération</p>
              </div>

              <div
                onClick={() => setMusicStatusFilter('rejected')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  musicStatusFilter === 'rejected'
                    ? 'bg-red-950/40 border-red-400 shadow-lg shadow-red-950/40'
                    : 'bg-[#05070a]/80 border-white/[0.06] hover:border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-red-400">Refize</span>
                  <X className="w-3.5 h-3.5 text-red-400" />
                </div>
                <p className="text-xl font-black text-red-400 font-mono mt-1">{rejectedMusicCount}</p>
                <p className="text-[10px] text-red-300/70 mt-0.5">Moso ki pa apwouve</p>
              </div>
            </div>

            {/* TABLO BAR KONPAREZON REVNI CHAK MWA SI AKTIVE */}
            {showMonthlyRevenueChartInReports && (
              <div className="pt-2 animate-fadeIn">
                <MonthlyRevenueBarChart
                  donations={donations}
                  archives={archives}
                  artists={artists}
                  musicList={musicList}
                  exchangeRate={exchangeRate}
                  toHtg={toHtg}
                  currentMonthGross={payoutAggregateTotals.totalGross}
                  currentMonthArtistNet={payoutAggregateTotals.totalArtistNet}
                  currentMonthPlatformFee={payoutAggregateTotals.totalPlatformFee}
                />
              </div>
            )}

            {/* Filter Pills and Live Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setMusicStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    musicStatusFilter === 'all'
                      ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/20'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                  }`}
                >
                  Tout ({musicList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMusicStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    musicStatusFilter === 'active'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>🟢 Validé ({activeMusicCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMusicStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    musicStatusFilter === 'pending'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>🟡 Pann ({pendingMusicCount})</span>
                </button>
                {rejectedMusicCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setMusicStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      musicStatusFilter === 'rejected'
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                        : 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20'
                    }`}
                  >
                    <span>🔴 Refize ({rejectedMusicCount})</span>
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={musicSearchQuery ?? ''}
                  onChange={(e) => setMusicSearchQuery(e.target.value)}
                  placeholder="Chèche pa tit, atis oswa stil..."
                  className="w-full bg-[#05070a] border border-white/[0.1] focus:border-yellow-400 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
                />
                {musicSearchQuery && (
                  <button
                    onClick={() => setMusicSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#05070a]/95 text-slate-400 uppercase text-[10px] font-bold border-b border-white/[0.08]">
                  <tr>
                    <th className="px-3.5 py-3.5 min-w-[90px]">
                      <span className="text-yellow-400 font-black"># Pozisyon</span>
                    </th>
                    <th className="px-4 py-3.5">Moso / Tit</th>
                    <th className="px-4 py-3.5">Atis</th>
                    <th className="px-3.5 py-3.5">Kategori</th>
                    <th className="px-4 py-3.5 min-w-[130px]">
                      <span className="text-yellow-300 font-bold">Estati Modération</span>
                    </th>
                    <th className="px-3.5 py-3.5">Ekout</th>
                    <th className="px-3.5 py-3.5 text-cyan-400">Pataj</th>
                    <th className="px-3.5 py-3.5 text-yellow-400">
                      {currencyMode === 'both' ? 'Total Sipò' : currencyMode === 'HTG' ? 'Sipò (HTG)' : 'Sipò ($)'}
                    </th>
                    <th className="px-3.5 py-3.5 text-emerald-400">
                      {currencyMode === 'both' ? '85% Atis' : currencyMode === 'HTG' ? '85% (HTG)' : '85% ($)'}
                    </th>
                    <th className="px-3.5 py-3.5 text-blue-400">
                      {currencyMode === 'both' ? '15% UpMizik' : currencyMode === 'HTG' ? '15% (HTG)' : '15% ($)'}
                    </th>
                    <th className="px-4 py-3.5 text-right">Aksyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] bg-[#070b14]/60">
                  {filteredMusicList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400 text-xs">
                        {musicSearchQuery
                          ? `Pa gen okenn moso mizik ki koresponn ak rechèch "${musicSearchQuery}"`
                          : `Pa gen okenn moso mizik nan kategori estati sa a (${musicStatusFilter})`}
                      </td>
                    </tr>
                  ) : (
                    filteredMusicList.map((m, idx) => {
                      const cut85Val = m.totalDonations * 0.85;
                      const cut15Val = m.totalDonations * 0.15;
                      const isPending = m.status === 'pending';
                      const isRejected = m.status === 'rejected';
                      const isActive = m.status === 'active' || !m.status;

                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-white/[0.04] transition-colors ${
                            isPending ? 'bg-amber-500/[0.04]' : isRejected ? 'bg-red-500/[0.04]' : ''
                          }`}
                        >
                          {/* Position (#) */}
                          <td className="px-3.5 py-3 font-bold text-yellow-400">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400 text-xs font-mono font-bold">#</span>
                              <input
                                type="number"
                                min="1"
                                value={m.position || idx + 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 1) {
                                    handleQuickPositionChange(m, val);
                                  }
                                }}
                                className="w-12 bg-[#05070a] border border-yellow-500/40 hover:border-yellow-400 focus:border-yellow-400 rounded-lg px-1.5 py-1 text-xs text-yellow-300 font-mono font-black text-center outline-none shadow-inner"
                                title="Sèl Admin ki ka chanje nimewo moso mizik sa a. Tape nouvo nimewo a pou chanje pozisyon l."
                              />
                            </div>
                          </td>

                          {/* Song Title & Cover */}
                          <td className="px-4 py-3 font-bold text-white">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={m.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                                className="w-9 h-9 rounded-lg object-cover border border-white/[0.1] shrink-0"
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                                }}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="truncate text-xs sm:text-sm">{m.title}</p>
                                  {m.releaseFormat && m.releaseFormat !== 'single' ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30 truncate">
                                      <span>{m.releaseFormat === 'album' ? '💿' : m.releaseFormat === 'ep' ? '💽' : m.releaseFormat === 'mixtape' ? '📼' : '🎙️'}</span>
                                      <span>{m.albumName || m.releaseFormat.toUpperCase()}</span>
                                      {typeof m.trackNumber === 'number' && m.trackNumber > 0 && (
                                        <span className="text-yellow-400 font-mono">#{m.trackNumber}</span>
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                                {m.collab && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-purple-300 bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-500/30 truncate mt-0.5 mr-1">
                                    🤝 ft. {m.collab.artistName}
                                  </span>
                                )}
                                {m.credits && m.credits.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewingCreditsSong(m)}
                                    title="Klike pou wè tout Split Sheet ak Pousantaj kolaboratè yo"
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 px-1.5 py-0.2 rounded border border-cyan-500/30 truncate mt-0.5 transition-all text-left cursor-pointer"
                                  >
                                    📜 Split Sheet ({m.credits.length}): {m.credits.map((c) => `${c.name} ${c.percentage}%`).join(', ')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Artist Name */}
                          <td className="px-4 py-3 text-slate-300 font-medium">{m.artistName}</td>

                          {/* Category */}
                          <td className="px-3.5 py-3">
                            <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 text-[10px] border border-white/[0.06]">
                              {m.category}
                            </span>
                          </td>

                          {/* Status Indicator (Validé / Pann / Refize) */}
                          <td className="px-4 py-3">
                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleToggleMusicStatus(m, 'pending')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 transition-all shadow-sm group"
                                title="Moso sa a VALIDÉ (Pibliye sou sit la). Klike pou mete l an PANN (Modération)."
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse group-hover:bg-amber-400"></span>
                                <span>Validé</span>
                                <span className="text-[9px] text-emerald-400/80 font-normal hidden lg:inline group-hover:text-amber-300">
                                  (Pibliye)
                                </span>
                              </button>
                            )}

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleToggleMusicStatus(m, 'active')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-emerald-500/25 hover:text-emerald-300 hover:border-emerald-500/50 transition-all shadow-md shadow-amber-950/40 group"
                                title="Moso sa a PANN (An atant modération). Klike pou VALIDÉ l kounye a!"
                              >
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping group-hover:bg-emerald-400"></span>
                                <span>Pann</span>
                                <span className="text-[9px] text-amber-200/80 font-normal hidden lg:inline group-hover:text-emerald-300">
                                  (An Atant)
                                </span>
                              </button>
                            )}

                            {isRejected && (
                              <button
                                type="button"
                                onClick={() => handleToggleMusicStatus(m, 'active')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 transition-all shadow-sm group"
                                title="Moso sa a REFIZE. Klike pou re-valide l."
                              >
                                <span className="w-2 h-2 rounded-full bg-red-400 group-hover:bg-emerald-400"></span>
                                <span>Refize</span>
                              </button>
                            )}
                          </td>

                          {/* Listens */}
                          <td className="px-3.5 py-3 font-mono">{m.listens.toLocaleString()}</td>

                          {/* Shares */}
                          <td className="px-3.5 py-3 font-mono text-cyan-400 font-semibold">
                            {(m.sharesCount || 0).toLocaleString()}
                          </td>

                          {/* Total Donations */}
                          <td className="px-3.5 py-3">
                            {renderDualAmount(m.totalDonations, {
                              colorUsd: 'font-mono font-bold text-yellow-400 text-xs',
                              colorHtg: 'text-yellow-400/80'
                            })}
                          </td>

                          {/* 85% Artist Share */}
                          <td className="px-3.5 py-3">
                            {renderDualAmount(cut85Val, {
                              colorUsd: 'font-mono font-bold text-emerald-400 text-xs',
                              colorHtg: 'text-emerald-400/80',
                              boldHtg: true
                            })}
                          </td>

                          {/* 15% Platform Share */}
                          <td className="px-3.5 py-3">
                            {renderDualAmount(cut15Val, {
                              colorUsd: 'font-mono font-bold text-blue-400 text-xs',
                              colorHtg: 'text-blue-400/80'
                            })}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Toggle Button */}
                              {isPending ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleMusicStatus(m, 'active')}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 transition-all shadow-sm"
                                  title="Valide moso sa a kounye a (Pibliye)"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleMusicStatus(m, 'pending')}
                                  className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 transition-all"
                                  title="Mete moso sa a an Pann (An atant modération)"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditMusic(m)}
                                className="p-1.5 rounded-lg bg-blue-900/40 text-blue-400 hover:bg-blue-800 hover:text-white border border-blue-800/40 transition-colors"
                                title="Modifye tout enfòmasyon moso a"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteMusicItem(m.id)}
                                className="p-1.5 rounded-lg bg-red-900/40 text-red-400 hover:bg-red-800 hover:text-white border border-red-800/40 transition-colors"
                                title="Efase moso a"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* VIEW 2: VALIDATION DONATIONS & ARTIST SIGNUPS */}
      {activeTab === 'validations' && (() => {
        const totalPendingAll = pendingDonations.length + pendingArtists.length;
        const totalValidatedAll = validatedDonations.length + activeArtists.length;
        const totalRejectedAll = rejectedDonations.length + rejectedArtists.length;
        const totalAllRecords = effectiveDonations.length + effectiveArtists.length;

        // Filter pending lists
        const filteredPendingArtists = pendingArtists.filter(art => {
          if (!validationSearchQuery.trim()) return true;
          const q = validationSearchQuery.toLowerCase().trim();
          return (art.stageName || '').toLowerCase().includes(q) ||
                 (art.name || '').toLowerCase().includes(q) ||
                 (art.phone || '').toLowerCase().includes(q) ||
                 (art.email || '').toLowerCase().includes(q);
        });

        const filteredPendingDonations = pendingDonations.filter(don => {
          if (!validationSearchQuery.trim()) return true;
          const q = validationSearchQuery.toLowerCase().trim();
          return (don.donorName || '').toLowerCase().includes(q) ||
                 (don.musicTitle || '').toLowerCase().includes(q) ||
                 (don.artistName || '').toLowerCase().includes(q) ||
                 (don.donorPhone || '').toLowerCase().includes(q) ||
                 (don.id || '').toLowerCase().includes(q);
        });

        // Filter validated lists
        const filteredValidatedDonations = validatedDonations.filter(don => {
          if (!validationSearchQuery.trim()) return true;
          const q = validationSearchQuery.toLowerCase().trim();
          return (don.donorName || '').toLowerCase().includes(q) ||
                 (don.musicTitle || '').toLowerCase().includes(q) ||
                 (don.artistName || '').toLowerCase().includes(q) ||
                 (don.donorPhone || '').toLowerCase().includes(q) ||
                 (don.id || '').toLowerCase().includes(q);
        });

        const filteredValidatedArtists = activeArtists.filter(art => {
          if (!validationSearchQuery.trim()) return true;
          const q = validationSearchQuery.toLowerCase().trim();
          return (art.stageName || '').toLowerCase().includes(q) ||
                 (art.name || '').toLowerCase().includes(q) ||
                 (art.phone || '').toLowerCase().includes(q) ||
                 (art.email || '').toLowerCase().includes(q);
        });

        // Filter rejected lists
        const filteredRejectedDonations = rejectedDonations.filter(don => {
          if (!validationSearchQuery.trim()) return true;
          const q = validationSearchQuery.toLowerCase().trim();
          return (don.donorName || '').toLowerCase().includes(q) ||
                 (don.musicTitle || '').toLowerCase().includes(q) ||
                 (don.artistName || '').toLowerCase().includes(q) ||
                 (don.donorPhone || '').toLowerCase().includes(q) ||
                 (don.id || '').toLowerCase().includes(q);
        });

        const filteredRejectedArtists = rejectedArtists.filter(art => {
          if (!validationSearchQuery.trim()) return true;
          const q = validationSearchQuery.toLowerCase().trim();
          return (art.stageName || '').toLowerCase().includes(q) ||
                 (art.name || '').toLowerCase().includes(q) ||
                 (art.phone || '').toLowerCase().includes(q) ||
                 (art.email || '').toLowerCase().includes(q);
        });

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Overview & Filter Tabs */}
            <div className="bg-gradient-to-r from-yellow-950/30 via-[#0a0f1d] to-[#05070a] border border-yellow-500/20 rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                    <DollarSign className="w-6 h-6 text-yellow-400" />
                    <span>Sant Validasyon Sipò & Peman Atis</span>
                    {totalPendingAll > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-black animate-pulse">
                        {totalPendingAll} an atant
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gere ak verifye prèv transfè Moncash / Natcash pou <strong>sipò fanatik</strong> ak <strong>frè enskripsyon atis ($4.99 USD)</strong>. Tout eleman valide oswa refize deplase otomatikman nan espas respektif yo.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <div className="inline-flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-xl border border-yellow-500/20 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Sinkronizasyon Firestore an tan reyèl ak notifikasyon otomatik</span>
                  </div>
                </div>
              </div>

              {/* Status Spaces Navigation Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setValidationStatusFilter('pending')}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    validationStatusFilter === 'pending'
                      ? 'bg-amber-950/60 border-amber-400 shadow-lg shadow-amber-950/50 ring-1 ring-amber-400/50'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      An Atant
                    </span>
                    <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                      {totalPendingAll}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-black text-white">
                    {pendingArtists.length} atis • {pendingDonations.length} don
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setValidationStatusFilter('validated')}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    validationStatusFilter === 'validated'
                      ? 'bg-emerald-950/60 border-emerald-400 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/50'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Valide / Aksepte
                    </span>
                    <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                      {totalValidatedAll}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-black text-white">
                    {activeArtists.length} atis • {validatedDonations.length} don
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setValidationStatusFilter('rejected')}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    validationStatusFilter === 'rejected'
                      ? 'bg-red-950/60 border-red-400 shadow-lg shadow-red-950/50 ring-1 ring-red-400/50'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      Refize
                    </span>
                    <span className="text-xs font-mono font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                      {totalRejectedAll}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-black text-white">
                    {rejectedArtists.length} atis • {rejectedDonations.length} don
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setValidationStatusFilter('all')}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    validationStatusFilter === 'all'
                      ? 'bg-blue-950/60 border-blue-400 shadow-lg shadow-blue-950/50 ring-1 ring-blue-400/50'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      Tout Istorik
                    </span>
                    <span className="text-xs font-mono font-bold bg-white/10 text-slate-200 px-2 py-0.5 rounded-full">
                      {totalAllRecords}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-black text-white">
                    {effectiveArtists.length} atis • {effectiveDonations.length} don
                  </div>
                </button>
              </div>

              {/* Sub-Filters: Category & Live Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setValidationCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      validationCategoryFilter === 'all'
                        ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.06]'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Tout Kategori</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationCategoryFilter('artists')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      validationCategoryFilter === 'artists'
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.06]'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Enskripsyon Atis ($4.99)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationCategoryFilter('donations')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      validationCategoryFilter === 'donations'
                        ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/20'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.06]'
                    }`}
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Sipò Fanatik</span>
                  </button>
                </div>

                {/* Live Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={validationSearchQuery}
                    onChange={(e) => setValidationSearchQuery(e.target.value)}
                    placeholder="Chèche non, tel, atis, mizik..."
                    className="w-full bg-[#05070a] border border-white/[0.1] rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                  {validationSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setValidationSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ================= SPACE 1: AN ATANT (PENDING) ================= */}
            {(validationStatusFilter === 'pending' || validationStatusFilter === 'all') && (
              <div className="space-y-6">
                {validationStatusFilter === 'all' && (
                  <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Espas 1: Dosye ki An Atant Validasyon ({totalPendingAll})</span>
                  </div>
                )}

                {/* SECTION 1.A: PENDING ARTIST REGISTRATIONS ($4.99 USD) */}
                {(validationCategoryFilter === 'all' || validationCategoryFilter === 'artists') && (
                  <div className="bg-[#0a0f1d]/90 border border-amber-500/20 rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>Prèv Peman Enskripsyon Atis ($4.99 USD)</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                              {filteredPendingArtists.length} an atant
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Atis ki fin fè tout etap enskripsyon yo epi ki voye foto resi transfè Moncash/Natcash yo.
                          </p>
                        </div>
                      </div>

                      {filteredPendingArtists.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('artists_pending')}
                          className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1"
                        >
                          <span>Ouvri Sant Dosye Atis Konplè</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {filteredPendingArtists.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-[#05070a]/60 rounded-2xl border border-white/[0.04]">
                        {validationSearchQuery ? 'Pa gen okenn prèv atis an atant ki koresponn ak rechèch ou a.' : 'Pa gen okenn prèv enskripsyon atis ki an atant kounye a. Tout kont atis yo ajou!'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredPendingArtists.map((art) => (
                          <div
                            key={art.id}
                            className="bg-[#05070a]/90 border border-amber-500/30 hover:border-amber-400 transition-all rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md shadow-lg shadow-amber-950/10"
                          >
                            <div className="flex items-start sm:items-center gap-3.5">
                              {/* Proof Image Thumbnail */}
                              {art.registrationProofUrl ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProofModalInfo({
                                      url: art.registrationProofUrl!,
                                      title: `Prèv Enskripsyon Nouvo Atis ($4.99 USD) - ${art.stageName}`,
                                      donorOrArtistName: `${art.stageName} (${art.name})`,
                                      phone: art.phone || 'N/A',
                                      amount: `$4.99 USD (~${Math.round(4.99 * exchangeRate).toLocaleString()} HTG)`,
                                      musicTitle: `Enskripsyon Kont Atis • Vil: ${art.city || 'Ayiti'}`,
                                      date: art.registrationDate,
                                      type: 'artist_fee'
                                    });
                                    setProofZoom(1);
                                  }}
                                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-amber-400/60 bg-black/60 shrink-0 group cursor-pointer shadow-lg hover:border-amber-400 transition-all"
                                  title="Klike pou wè foto prèv $4.99 la an gwo"
                                >
                                  <img
                                    src={art.registrationProofUrl}
                                    alt={`Prèv ${art.stageName}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-amber-300" />
                                  </div>
                                  <span className="absolute bottom-1 right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                                    $4.99
                                  </span>
                                </button>
                              ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-[9px] text-slate-500 shrink-0 text-center p-1">
                                  <ImageIcon className="w-5 h-5 text-slate-600 mb-0.5" />
                                  <span>San Prèv</span>
                                </div>
                              )}

                              {/* Artist Details */}
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-white text-base tracking-tight">{art.stageName}</span>
                                  <span className="text-xs text-slate-400 font-medium">({art.name})</span>
                                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                                    Frè Enskripsyon: $4.99 USD (~{Math.round(4.99 * exchangeRate).toLocaleString()} HTG)
                                  </span>
                                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-mono">
                                    ⏳ An Atant Validasyon
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-300">
                                  <span>📍 Vil: <strong className="text-slate-200">{art.city || 'Ayiti'}</strong></span>
                                  <span>📞 Tel: <strong className="text-amber-300 font-mono">{art.phone || 'N/A'}</strong></span>
                                  <span>✉️ Imèl: <strong className="text-blue-300 font-mono">{art.email}</strong></span>
                                  {art.registrationDate && (
                                    <span>🕒 Dat: <strong className="text-slate-400">{art.registrationDate}</strong></span>
                                  )}
                                </div>

                                {art.musicalRoots && (
                                  <p className="text-[11px] text-slate-400 line-clamp-1">
                                    Estil / Rasin: <span className="text-slate-300 font-medium">{art.musicalRoots}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                              {art.registrationProofUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProofModalInfo({
                                      url: art.registrationProofUrl!,
                                      title: `Prèv Enskripsyon Nouvo Atis ($4.99 USD) - ${art.stageName}`,
                                      donorOrArtistName: `${art.stageName} (${art.name})`,
                                      phone: art.phone || 'N/A',
                                      amount: `$4.99 USD (~${Math.round(4.99 * exchangeRate).toLocaleString()} HTG)`,
                                      musicTitle: `Enskripsyon Kont Atis • Vil: ${art.city || 'Ayiti'}`,
                                      date: art.registrationDate,
                                      type: 'artist_fee'
                                    });
                                    setProofZoom(1);
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] text-blue-400 hover:bg-white/[0.12] flex items-center gap-1.5 border border-white/[0.08] transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Gade Prèv</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedArtistDossier(art)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] text-amber-300 hover:bg-white/[0.12] flex items-center gap-1.5 border border-white/[0.08] transition-colors"
                                title="Gade tout detay biyografi, foto ak rezo sosyal atis la"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Gade Dosye</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOptimisticValidateArtist(art.id, true)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                                title="Valide kont atis sa a epi deplase l nan Espas Valide"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Valide Atis ($4.99)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const reason = window.prompt(
                                    `Rezon refi pou ${art.stageName} (Foto pa klè, referans kòrèk, elatriye):`,
                                    'Foto prèv transfè a pa klè oswa referans lan pa koresponn. Tanpri telechaje yon nouvo prèv.'
                                  );
                                  if (reason !== null) {
                                    handleOptimisticValidateArtist(art.id, false, reason);
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 shadow-lg shadow-red-950/40 transition-all active:scale-95"
                                title="Refize demand enskripsyon sa a epi deplase l nan Espas Refize"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Refize</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 1.B: PENDING FAN DONATIONS */}
                {(validationCategoryFilter === 'all' || validationCategoryFilter === 'donations') && (
                  <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>Sipò Fanatik pou Moso Mizik</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-mono font-bold">
                              {filteredPendingDonations.length} an atant
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Donasyon fanatik voye pou ankouraje atis yo sou moso mizik yo.
                          </p>
                        </div>
                      </div>
                    </div>

                    {filteredPendingDonations.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-[#05070a]/60 rounded-2xl border border-white/[0.04]">
                        {validationSearchQuery ? 'Pa gen okenn sipò an atant ki koresponn ak rechèch ou a.' : 'Pa gen okenn sipò mizik ki an atant pou kounya. Tout donasyon yo ajou!'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredPendingDonations.map((don) => (
                          <div
                            key={don.id}
                            className="bg-[#05070a]/90 border border-white/[0.08] hover:border-yellow-400/30 transition-all rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md"
                          >
                            <div className="flex items-start sm:items-center gap-3.5">
                              {/* Interactive Proof Image Thumbnail */}
                              <button
                                type="button"
                                onClick={() => {
                                  setProofModalInfo({
                                    url: don.proofUrl,
                                    title: `Prèv Sipò MonCash / Natcash - $${don.amount} ${don.currency || 'USD'}`,
                                    donorOrArtistName: don.donorName,
                                    phone: don.donorPhone || 'Pa gen nimewo',
                                    amount: `$${don.amount} ${don.currency || 'USD'}`,
                                    musicTitle: `${don.musicTitle} (${don.artistName})`,
                                    date: don.createdAt,
                                    type: 'support'
                                  });
                                  setProofZoom(1);
                                }}
                                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-yellow-400/40 bg-black/60 shrink-0 group cursor-pointer shadow-lg hover:border-yellow-400 transition-all"
                                title="Klike pou wè foto prèv la an gwo"
                              >
                                <img
                                  src={don.proofUrl}
                                  alt={`Prèv ${don.donorName}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-5 h-5 text-yellow-400" />
                                </div>
                                <span className="absolute bottom-1 right-1 bg-black/80 text-yellow-400 text-[9px] font-bold px-1 rounded">
                                  Prèv
                                </span>
                              </button>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-white text-sm">{don.donorName}</span>
                                  <span className="text-yellow-400 font-mono font-bold text-xs bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                                    ${don.amount.toFixed(2)} USD (~{Math.round(toHtg(don.amount)).toLocaleString()} HTG)
                                  </span>
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    85% Atis: ${(don.amount * 0.85).toFixed(2)} (~{Math.round(toHtg(don.amount * 0.85)).toLocaleString()} HTG)
                                  </span>
                                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                    15% Sit: ${(don.amount * 0.15).toFixed(2)} (~{Math.round(toHtg(don.amount * 0.15)).toLocaleString()} HTG)
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300">
                                  Pou: <strong className="text-white">{don.musicTitle}</strong> ({don.artistName})
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                                  {don.paymentMethod && (
                                    <span className="text-yellow-300 font-bold bg-yellow-400/15 px-2 py-0.5 rounded border border-yellow-400/30">
                                      💳 Mwayen: {don.paymentMethod}
                                    </span>
                                  )}
                                  <span>📞 Tel: <strong className="text-slate-200">{don.donorPhone || 'N/A'}</strong></span>
                                  <span>🕒 Dat: {don.createdAt}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                              <button
                                onClick={() => {
                                  setProofModalInfo({
                                    url: don.proofUrl,
                                    title: `Prèv Sipò MonCash / Natcash - $${don.amount} ${don.currency || 'USD'} (~${Math.round(toHtg(don.amount)).toLocaleString()} HTG)`,
                                    donorOrArtistName: don.donorName,
                                    phone: don.donorPhone || 'Pa gen nimewo',
                                    amount: `$${don.amount} ${don.currency || 'USD'} (~${Math.round(toHtg(don.amount)).toLocaleString()} HTG)`,
                                    musicTitle: `${don.musicTitle} (${don.artistName})`,
                                    date: don.createdAt,
                                    type: 'support'
                                  });
                                  setProofZoom(1);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] text-blue-400 hover:bg-white/[0.12] flex items-center gap-1.5 border border-white/[0.08] transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Gade Prèv</span>
                              </button>
                              <button
                                onClick={() => handleOptimisticValidateDonation(don.id, true)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                                title="Valide don sa a epi deplase l nan Espas Valide"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Valide</span>
                              </button>
                              <button
                                onClick={() => handleOptimisticValidateDonation(don.id, false)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 shadow-lg shadow-red-950/40 transition-all active:scale-95"
                                title="Refize don sa a epi deplase l nan Espas Refize"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Refize</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= SPACE 2: ESPAS VALIDE (ACCEPTED) ================= */}
            {(validationStatusFilter === 'validated' || validationStatusFilter === 'all') && (
              <div className="space-y-6">
                {validationStatusFilter === 'all' && (
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase tracking-wider pt-4 border-t border-white/[0.08]">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Espas 2: Dosye ki Valide & Aksepte ({totalValidatedAll})</span>
                  </div>
                )}

                {/* Validated Artists List */}
                {(validationCategoryFilter === 'all' || validationCategoryFilter === 'artists') && (
                  <div className="bg-[#0a0f1d]/90 border border-emerald-500/20 rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>Atis Valide & Aktif sou Platfòm lan</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                              {filteredValidatedArtists.length} atis
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Atis ki gen frè enskripsyon $4.99 yo konfime epi kont yo aktif.
                          </p>
                        </div>
                      </div>
                    </div>

                    {filteredValidatedArtists.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-[#05070a]/60 rounded-2xl border border-white/[0.04]">
                        {validationSearchQuery ? 'Pa gen okenn atis valide ki koresponn ak rechèch la.' : 'Pa gen okenn atis valide kounye a.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredValidatedArtists.map((art) => (
                          <div
                            key={art.id}
                            className="bg-[#05070a]/90 border border-emerald-500/30 hover:border-emerald-400/60 transition-all rounded-2xl p-4 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <img
                                src={art.avatarUrl || art.registrationProofUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60'}
                                alt={art.stageName}
                                className="w-11 h-11 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                              />
                              <div className="min-w-0">
                                <h5 className="font-bold text-white text-sm truncate">{art.stageName}</h5>
                                <p className="text-[11px] text-slate-400 truncate">{art.phone || art.email || 'N/A'}</p>
                                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Check className="w-3 h-3 text-emerald-400" /> Kont Aktif
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedArtistDossier(art)}
                              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors shrink-0"
                              title="Gade dosye konplè atis la"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Validated Donations History & Split Breakdown */}
                {(validationCategoryFilter === 'all' || validationCategoryFilter === 'donations') && (
                  <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <HeartHandshake className="w-5 h-5 text-emerald-400" />
                          <span>Istorik Sipò Valide ({filteredValidatedDonations.length})</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Detay distribisyon lajan: <strong>85% pou Atis</strong> ak <strong>15% pou Platfòm UpMizik</strong>
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-300 font-semibold">Pousantaj Otomatik: 85% Atis / 15% Sit</span>
                      </div>
                    </div>

                    {/* Micro Summary Stats for Validated Donations */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#05070a]/90 rounded-2xl border border-white/[0.06]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Sipò Valide (100%)</span>
                        <p className="text-lg font-black text-yellow-400 font-mono">
                          ${validatedGross.toFixed(2)} <span className="text-xs font-sans text-yellow-300">USD</span>
                        </p>
                        <p className="text-xs font-bold text-slate-300 font-mono">
                          ~{Math.round(toHtg(validatedGross)).toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">HTG</span>
                        </p>
                        <p className="text-[10px] text-slate-500">{validatedDonations.length} tranzaksyon konfime</p>
                      </div>

                      <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-white/[0.08] pt-2 sm:pt-0 sm:pl-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-emerald-400">Total Pati Atis Yo (85%)</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">85%</span>
                        </div>
                        <p className="text-lg font-black text-emerald-400 font-mono">
                          ${validatedArtistPayouts.toFixed(2)} <span className="text-xs font-sans text-emerald-300">USD</span>
                        </p>
                        <p className="text-xs font-bold text-slate-300 font-mono">
                          ~{Math.round(toHtg(validatedArtistPayouts)).toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">HTG</span>
                        </p>
                        <p className="text-[10px] text-slate-500">Kòb k ap monte pou atis yo</p>
                      </div>

                      <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-white/[0.08] pt-2 sm:pt-0 sm:pl-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-blue-400">Total Pati Sit UpMizik (15%)</span>
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-bold">15%</span>
                        </div>
                        <p className="text-lg font-black text-blue-400 font-mono">
                          ${validatedPlatformRevenue.toFixed(2)} <span className="text-xs font-sans text-blue-300">USD</span>
                        </p>
                        <p className="text-xs font-bold text-slate-300 font-mono">
                          ~{Math.round(toHtg(validatedPlatformRevenue)).toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">HTG</span>
                        </p>
                        <p className="text-[10px] text-slate-500">Reveni jesyon sèvè & devlopman</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-[#05070a]/90 text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
                          <tr>
                            <th className="px-4 py-3">Donatè & Kontak</th>
                            <th className="px-4 py-3">Mizik / Atis</th>
                            <th className="px-4 py-3">Prèv Foto</th>
                            <th className="px-4 py-3 text-yellow-400">Montan Total ($ / HTG)</th>
                            <th className="px-4 py-3 text-emerald-400">Pati Atis (85%)</th>
                            <th className="px-4 py-3 text-blue-400">Pati Sit la (15%)</th>
                            <th className="px-4 py-3">Dat & ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {filteredValidatedDonations.map((d) => {
                            const artistPart = d.artistShare || Number((d.amount * 0.85).toFixed(2));
                            const platformPart = d.platformShare || Number((d.amount * 0.15).toFixed(2));
                            return (
                              <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-white">{d.donorName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{d.donorPhone || 'Pa gen nimewo'}</div>
                                  {d.paymentMethod && (
                                    <div className="text-[9px] text-yellow-300 font-mono mt-0.5">{d.paymentMethod}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-white">{d.musicTitle}</div>
                                  <div className="text-[10px] text-yellow-400">{d.artistName}</div>
                                </td>
                                <td className="px-4 py-3">
                                  {d.proofUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProofModalInfo({
                                          url: d.proofUrl,
                                          title: `Prèv Sipò Valide - $${d.amount} ${d.currency || 'USD'} (~${Math.round(toHtg(d.amount)).toLocaleString()} HTG)`,
                                          donorOrArtistName: d.donorName,
                                          phone: d.donorPhone || 'Pa gen nimewo',
                                          amount: `$${d.amount} ${d.currency || 'USD'} (~${Math.round(toHtg(d.amount)).toLocaleString()} HTG)`,
                                          musicTitle: `${d.musicTitle} (${d.artistName})`,
                                          date: d.createdAt,
                                          type: 'support'
                                        });
                                        setProofZoom(1);
                                      }}
                                      className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-colors group"
                                      title="Klike pou wè foto prèv tranzaksyon sa a"
                                    >
                                      <img
                                        src={d.proofUrl}
                                        alt="Prèv"
                                        className="w-8 h-8 rounded-md object-cover border border-yellow-400/30"
                                      />
                                      <span className="text-[11px] font-semibold text-yellow-400 group-hover:underline pr-1">
                                        Wè Prèv
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">Pa gen foto</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {renderDualAmount(d.amount, { colorUsd: 'font-mono font-bold text-yellow-400 text-xs', colorHtg: 'text-yellow-400/80' })}
                                </td>
                                <td className="px-4 py-3">
                                  {renderDualAmount(artistPart, { colorUsd: 'font-mono font-bold text-emerald-400 text-xs', colorHtg: 'text-emerald-400/80', boldHtg: true })}
                                </td>
                                <td className="px-4 py-3">
                                  {renderDualAmount(platformPart, { colorUsd: 'font-mono font-bold text-blue-400 text-xs', colorHtg: 'text-blue-400/80' })}
                                </td>
                                <td className="px-4 py-3 text-slate-400 text-[10px] font-mono">
                                  <div>{d.createdAt}</div>
                                  <div className="text-slate-500">#{d.id.slice(-6)}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= SPACE 3: ESPAS REFIZE (REJECTED) ================= */}
            {(validationStatusFilter === 'rejected' || validationStatusFilter === 'all') && (
              <div className="space-y-6">
                {validationStatusFilter === 'all' && (
                  <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider pt-4 border-t border-white/[0.08]">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Espas 3: Dosye ki Refize ({totalRejectedAll})</span>
                  </div>
                )}

                {/* Rejected Artists */}
                {(validationCategoryFilter === 'all' || validationCategoryFilter === 'artists') && (
                  <div className="bg-[#0a0f1d]/90 border border-red-500/20 rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                          <UserX className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>Enskripsyon Atis ki Refize</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-mono font-bold">
                              {filteredRejectedArtists.length} refize
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Atis ki pa t satisfè kondisyon yo oswa ki te voye yon move prèv peman.
                          </p>
                        </div>
                      </div>
                    </div>

                    {filteredRejectedArtists.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-[#05070a]/60 rounded-2xl border border-white/[0.04]">
                        {validationSearchQuery ? 'Pa gen okenn atis refize ki koresponn ak rechèch la.' : 'Pa gen okenn enskripsyon atis ki refize kounye a.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredRejectedArtists.map((art) => (
                          <div
                            key={art.id}
                            className="bg-[#05070a]/90 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md"
                          >
                            <div className="flex items-start sm:items-center gap-3.5">
                              {art.registrationProofUrl ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProofModalInfo({
                                      url: art.registrationProofUrl!,
                                      title: `Prèv Enskripsyon Refize - ${art.stageName}`,
                                      donorOrArtistName: `${art.stageName} (${art.name})`,
                                      phone: art.phone || 'N/A',
                                      amount: `$4.99 USD`,
                                      musicTitle: `Enskripsyon Atis (Refize)`,
                                      date: art.registrationDate,
                                      type: 'artist_fee'
                                    });
                                    setProofZoom(1);
                                  }}
                                  className="w-16 h-16 rounded-xl overflow-hidden border border-red-500/40 bg-black/60 shrink-0"
                                >
                                  <img
                                    src={art.registrationProofUrl}
                                    alt={art.stageName}
                                    className="w-full h-full object-cover opacity-70"
                                  />
                                </button>
                              ) : (
                                <div className="w-16 h-16 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-[9px] text-slate-500 shrink-0">
                                  San Prèv
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-white text-sm line-through text-slate-400">{art.stageName}</span>
                                  <span className="text-xs text-slate-500">({art.name})</span>
                                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-bold">
                                    Refize
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                  <span>📞 Tel: {art.phone || 'N/A'}</span> • <span>✉️ {art.email}</span>
                                </div>
                                {art.rejectionReason && (
                                  <p className="text-xs text-red-300/90 bg-red-950/30 border border-red-500/20 px-2.5 py-1 rounded-lg">
                                    <strong>Rezon:</strong> {art.rejectionReason}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                              <button
                                type="button"
                                onClick={() => handleOptimisticValidateArtist(art.id, true)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white flex items-center gap-1 transition-all"
                                title="Rekonsidere epi valide atis sa a kounye a"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Re-Valide Atis</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected Donations */}
                {(validationCategoryFilter === 'all' || validationCategoryFilter === 'donations') && (
                  <div className="bg-[#0a0f1d]/90 border border-red-500/20 rounded-3xl p-5 sm:p-6 backdrop-blur-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                          <XCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span>Sipò Mizik ki Refize</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-mono font-bold">
                              {filteredRejectedDonations.length} refize
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Donasyon ki pa t valide akòz prèv pa kòrèk oswa tranzaksyon anile.
                          </p>
                        </div>
                      </div>
                    </div>

                    {filteredRejectedDonations.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-[#05070a]/60 rounded-2xl border border-white/[0.04]">
                        {validationSearchQuery ? 'Pa gen okenn sipò refize ki koresponn ak rechèch la.' : 'Pa gen okenn sipò mizik ki refize kounye a.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredRejectedDonations.map((don) => (
                          <div
                            key={don.id}
                            className="bg-[#05070a]/90 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md"
                          >
                            <div className="flex items-start sm:items-center gap-3.5">
                              {don.proofUrl ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProofModalInfo({
                                      url: don.proofUrl,
                                      title: `Prèv Sipò Refize - $${don.amount}`,
                                      donorOrArtistName: don.donorName,
                                      phone: don.donorPhone || 'Pa gen nimewo',
                                      amount: `$${don.amount} ${don.currency || 'USD'}`,
                                      musicTitle: `${don.musicTitle} (${don.artistName})`,
                                      date: don.createdAt,
                                      type: 'support'
                                    });
                                    setProofZoom(1);
                                  }}
                                  className="w-16 h-16 rounded-xl overflow-hidden border border-red-500/40 bg-black/60 shrink-0"
                                >
                                  <img
                                    src={don.proofUrl}
                                    alt={don.donorName}
                                    className="w-full h-full object-cover opacity-70"
                                  />
                                </button>
                              ) : (
                                <div className="w-16 h-16 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-[9px] text-slate-500 shrink-0">
                                  San Prèv
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-white text-sm line-through text-slate-400">{don.donorName}</span>
                                  <span className="text-xs text-red-300 font-mono font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                    ${don.amount.toFixed(2)} USD
                                  </span>
                                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-bold">
                                    Refize
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                  Pou: {don.musicTitle} ({don.artistName}) • 📞 {don.donorPhone || 'N/A'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                              <button
                                type="button"
                                onClick={() => handleOptimisticValidateDonation(don.id, true)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white flex items-center gap-1 transition-all"
                                title="Rekonsidere epi valide don sa a kounye a"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Re-Valide Don</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* VIEW 3: VALIDATION & INTEGRATION DEMANDS FOR ARTISTS */}
      {activeTab === 'artists_pending' && (() => {
        const pendingList = effectiveArtists.filter(a => a.status === 'pending');
        const activeList = effectiveArtists.filter(a => a.status === 'active' || !a.status);
        const rejectedList = effectiveArtists.filter(a => a.status === 'rejected');
        const suspendedList = effectiveArtists.filter(a => a.status === 'suspended');

        let displayedList = effectiveArtists;
        if (artistValidationFilter === 'pending') {
          displayedList = pendingList;
        } else if (artistValidationFilter === 'active') {
          displayedList = activeList;
        } else if (artistValidationFilter === 'rejected') {
          displayedList = rejectedList;
        }

        // Apply search query
        const q = artistValidationSearch.trim().toLowerCase();
        if (q) {
          displayedList = displayedList.filter(a =>
            (a.stageName && a.stageName.toLowerCase().includes(q)) ||
            (a.name && a.name.toLowerCase().includes(q)) ||
            (a.email && a.email.toLowerCase().includes(q)) ||
            (a.phone && a.phone.toLowerCase().includes(q)) ||
            (a.city && a.city.toLowerCase().includes(q)) ||
            (a.musicalRoots && a.musicalRoots.toLowerCase().includes(q)) ||
            (a.musicalInfluences && a.musicalInfluences.toLowerCase().includes(q)) ||
            (a.bio && a.bio.toLowerCase().includes(q))
          );
        }

        const pendingFeesUsd = pendingList.length * 4.99;
        const pendingFeesHtg = Math.round(pendingFeesUsd * exchangeRate);

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Metrics Overview */}
            <div className="bg-gradient-to-r from-amber-950/40 via-[#0a0f1d] to-[#05070a] border border-amber-500/30 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <span>Sant Validasyon & Nouvo Demand Integrasyon Atis</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                          Frè $4.99 USD
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Kontwole tout nouvo demand enskripsyon yo, verifye prèv peman $4.99 (~{Math.round(4.99 * exchangeRate).toLocaleString()} HTG), epi valide oswa refize dosye atis yo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const restored = StorageService.restoreSamplePendingArtists();
                      window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'restore_pending' } }));
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow flex items-center gap-2 transition-all active:scale-95"
                    title="Chaje oswa retabli demand egzanp yo (King Rabo, Mimi Vwa Dous, Ti-Kreyòl)"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Chaje / Retabli Demand</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualArtistStageName('');
                      setManualArtistName('');
                      setManualArtistPhone('');
                      setManualArtistEmail('');
                      setManualArtistCity('Pòtoprens (Port-au-Prince)');
                      setManualArtistBio('');
                      setManualArtistRoots('');
                      setManualArtistInfluences('');
                      setManualArtistVision('');
                      setManualArtistQuote('');
                      setManualArtistAvatar('');
                      setManualArtistProof('');
                      setManualArtistStatus('pending');
                      setShowAddManualArtistModal(true);
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-yellow-500/20 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Ajoute Demand Manyèlman</span>
                  </button>

                  {pendingList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Èske w vle valide tout ${pendingList.length} kont atis ki an atant yo kounye a?`)) {
                          pendingList.forEach(p => handleOptimisticValidateArtist(p.id, true));
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Valide Tout ({pendingList.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Stat Ribbon Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div
                  onClick={() => setArtistValidationFilter('pending')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    artistValidationFilter === 'pending'
                      ? 'bg-amber-950/50 border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      An Atant
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">{pendingList.length}</span>
                  </div>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    {pendingList.length} <span className="text-xs font-sans text-slate-400 font-normal">demand</span>
                  </div>
                  <p className="text-[10px] text-amber-200/80 font-mono mt-0.5">
                    ~${pendingFeesUsd.toFixed(2)} USD • ~{pendingFeesHtg.toLocaleString()} HTG
                  </p>
                </div>

                <div
                  onClick={() => setArtistValidationFilter('all')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    artistValidationFilter === 'all'
                      ? 'bg-blue-950/50 border-blue-500 shadow-lg shadow-blue-950/40 ring-1 ring-blue-400'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Tout Demand
                    </span>
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    {artists.length} <span className="text-xs font-sans text-slate-400 font-normal">atis</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Total dosye soumèt nan sistèm lan
                  </p>
                </div>

                <div
                  onClick={() => setArtistValidationFilter('active')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    artistValidationFilter === 'active'
                      ? 'bg-emerald-950/50 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Valide & Aktif
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    {activeList.length} <span className="text-xs font-sans text-emerald-400/80 font-normal">apwouve</span>
                  </div>
                  <p className="text-[10px] text-emerald-200/80 font-mono mt-0.5">
                    Frè kolekte: ${(activeList.length * 4.99).toFixed(2)} USD
                  </p>
                </div>

                <div
                  onClick={() => setArtistValidationFilter('rejected')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    artistValidationFilter === 'rejected'
                      ? 'bg-red-950/50 border-red-500 shadow-lg shadow-red-950/40 ring-1 ring-red-400'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-red-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                      Demand Refize
                    </span>
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    {rejectedList.length} <span className="text-xs font-sans text-red-400/80 font-normal">refize</span>
                  </div>
                  <p className="text-[10px] text-red-300/80 font-mono mt-0.5">
                    Mande nouvo prèv transfè
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Pills & Live Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0a0f1d] border border-white/[0.08] p-3 rounded-2xl">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setArtistValidationFilter('pending')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                    artistValidationFilter === 'pending'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>An Atant</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                    artistValidationFilter === 'pending' ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {pendingList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setArtistValidationFilter('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                    artistValidationFilter === 'all'
                      ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>Tout Demand</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                    artistValidationFilter === 'all' ? 'bg-black text-yellow-300' : 'bg-white/10 text-slate-300'
                  }`}>
                    {artists.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setArtistValidationFilter('active')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                    artistValidationFilter === 'active'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>Valide</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                    artistValidationFilter === 'active' ? 'bg-black text-emerald-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {activeList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setArtistValidationFilter('rejected')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                    artistValidationFilter === 'rejected'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>Refize</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                    artistValidationFilter === 'rejected' ? 'bg-black text-red-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {rejectedList.length}
                  </span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={artistValidationSearch}
                  onChange={(e) => setArtistValidationSearch(e.target.value)}
                  placeholder="Chèche non, vil, telefòn, estil..."
                  className="w-full bg-[#05070a] border border-white/[0.1] focus:border-yellow-400 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
                {artistValidationSearch && (
                  <button
                    type="button"
                    onClick={() => setArtistValidationSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Applications */}
            {displayedList.length === 0 ? (
              <div className="bg-[#0a0f1d] border border-white/[0.08] rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <UserCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-base font-bold text-white">
                    {artistValidationFilter === 'pending'
                      ? 'Pa gen okenn nouvo demand an atant pou kounye a'
                      : artistValidationSearch
                      ? `Pa gen okenn atis ki koresponn ak "${artistValidationSearch}"`
                      : 'Pa gen okenn dosye nan kategori sa a'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {artistValidationFilter === 'pending'
                      ? 'Tout demand enskripsyon yo fin trete oswa ou ka chaje demand egzanp pou teste panèl la.'
                      : 'Eseye chanje filtè a oswa retire rechèch la.'}
                  </p>
                </div>

                {artistValidationFilter === 'pending' && (
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        StorageService.restoreSamplePendingArtists();
                        window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'restore_pending' } }));
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20 flex items-center gap-2 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Chaje Egzanp Nouvo Demand</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddManualArtistModal(true)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] flex items-center gap-2 transition-all"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Ajoute Demand Manyèlman</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedList.map((art) => {
                  const isPending = art.status === 'pending';
                  const isRejected = art.status === 'rejected';
                  const isSuspended = art.status === 'suspended';
                  const isActive = art.status === 'active' || !art.status;

                  return (
                    <div
                      key={art.id}
                      className={`bg-[#0a0f1d] border rounded-3xl p-5 md:p-6 transition-all backdrop-blur-xl shadow-lg space-y-4 ${
                        isPending
                          ? 'border-amber-500/40 hover:border-amber-400 shadow-amber-950/20'
                          : isRejected
                          ? 'border-red-500/30 hover:border-red-400 shadow-red-950/20'
                          : 'border-white/[0.08] hover:border-yellow-400/30'
                      }`}
                    >
                      {/* Top Row: Info + Proof + Actions */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        {/* Artist Identity & Avatar */}
                        <div className="flex items-start sm:items-center gap-4">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <img
                              src={art.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80'}
                              alt={art.stageName}
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/[0.12] shadow-md"
                            />
                            {/* Status Indicator */}
                            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#0a0f1d] ${
                              isPending
                                ? 'bg-amber-400 text-slate-950'
                                : isRejected
                                ? 'bg-red-500 text-white'
                                : isSuspended
                                ? 'bg-orange-500 text-white'
                                : 'bg-emerald-500 text-slate-950'
                            }`}>
                              {isPending ? '⏳' : isRejected ? '✕' : isSuspended ? '⏸' : '✓'}
                            </span>
                          </div>

                          {/* Payment Proof Thumbnail */}
                          {art.registrationProofUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                setProofModalInfo({
                                  url: art.registrationProofUrl!,
                                  title: `Prèv Peman Frè Enskripsyon Atis ($4.99 USD • 723.55 HTG)`,
                                  donorOrArtistName: `${art.stageName} (${art.name})`,
                                  phone: art.phone,
                                  amount: '$4.99 USD (~723.55 HTG)',
                                  musicTitle: `Enskripsyon Kont Atis • Vil: ${art.city}`,
                                  date: art.registrationDate,
                                  type: 'artist_fee'
                                });
                                setProofZoom(1);
                              }}
                              className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-black/60 shrink-0 group cursor-pointer shadow-lg hover:border-amber-400 transition-all"
                              title="Klike pou wè foto prèv $4.99 la an gwo"
                            >
                              <img
                                src={art.registrationProofUrl}
                                alt={`Prèv $4.99 ${art.stageName}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-5 h-5 text-amber-300" />
                              </div>
                              <span className="absolute bottom-1 right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                                $4.99
                              </span>
                            </button>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-[9px] text-slate-500 shrink-0 text-center p-1">
                              <ImageIcon className="w-4 h-4 text-slate-600 mb-0.5" />
                              <span>San Prèv</span>
                            </div>
                          )}

                          {/* Identity Details */}
                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className="font-black text-white text-base tracking-tight">{art.stageName}</h4>
                              <span className="text-xs text-slate-400 font-medium">({art.name})</span>
                              
                              {/* Status Tag */}
                              {isPending && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                  An Atant Validasyon
                                </span>
                              )}
                              {isActive && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Valide & Aktif
                                </span>
                              )}
                              {isRejected && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-mono font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Demand Refize
                                </span>
                              )}
                              {isSuspended && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono font-bold">
                                  Sispann
                                </span>
                              )}

                              <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20 font-mono font-bold">
                                Frè: $4.99 (~{Math.round(4.99 * exchangeRate).toLocaleString()} HTG)
                              </span>
                            </div>

                            {/* Contact Badges with 1-click copy */}
                            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-300">
                              <span className="flex items-center gap-1 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
                                <span>📍 {art.city || 'Ayiti'}</span>
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  if (art.phone) {
                                    navigator.clipboard.writeText(art.phone);
                                    setCopiedValidationFieldId(`phone-${art.id}`);
                                    setTimeout(() => setCopiedValidationFieldId(null), 2000);
                                  }
                                }}
                                className="flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded-lg border border-white/[0.06] text-amber-300 font-mono transition-colors"
                                title="Klike pou kopye nimewo MonCash/Natcash la"
                              >
                                <Smartphone className="w-3 h-3 text-amber-400" />
                                <span>{art.phone}</span>
                                {copiedValidationFieldId === `phone-${art.id}` ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400 ml-1" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500 ml-1" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (art.email) {
                                    navigator.clipboard.writeText(art.email);
                                    setCopiedValidationFieldId(`email-${art.id}`);
                                    setTimeout(() => setCopiedValidationFieldId(null), 2000);
                                  }
                                }}
                                className="flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded-lg border border-white/[0.06] text-blue-300 font-mono transition-colors"
                                title="Klike pou kopye adrès imèl la"
                              >
                                <Mail className="w-3 h-3 text-blue-400" />
                                <span>{art.email}</span>
                                {copiedValidationFieldId === `email-${art.id}` ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400 ml-1" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500 ml-1" />
                                )}
                              </button>

                              <span className="text-[10px] text-slate-500 font-mono">
                                📅 {art.registrationDate}
                              </span>
                            </div>

                            {/* Rejection reason banner if rejected */}
                            {isRejected && (art.registrationRejectionReason || art.rejectionReason) && (
                              <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-2.5 text-xs text-red-200 flex items-start gap-2 mt-1">
                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-red-300">Rezon Refi: </strong>
                                  <span>{art.registrationRejectionReason || art.rejectionReason}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center flex-wrap gap-2 shrink-0 self-end lg:self-center">
                          {/* Dossier inspection button */}
                          <button
                            type="button"
                            onClick={() => setSelectedArtistDossier(art)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.06] text-white hover:bg-white/[0.12] border border-white/[0.1] flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Dosye Konplè</span>
                          </button>

                          {/* Proof Zoom button */}
                          {art.registrationProofUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setProofModalInfo({
                                  url: art.registrationProofUrl!,
                                  title: `Prèv Peman Frè Enskripsyon Atis ($4.99 USD • 723.55 HTG)`,
                                  donorOrArtistName: `${art.stageName} (${art.name})`,
                                  phone: art.phone,
                                  amount: '$4.99 USD (~723.55 HTG)',
                                  musicTitle: `Enskripsyon Kont Atis • Vil: ${art.city}`,
                                  date: art.registrationDate,
                                  type: 'artist_fee'
                                });
                                setProofZoom(1);
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Gade Prèv $4.99</span>
                            </button>
                          )}

                          {/* Validate Button */}
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => handleOptimisticValidateArtist(art.id, true)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Valide Atis</span>
                            </button>
                          )}

                          {/* Reject Button */}
                          {!isRejected && (
                            <button
                              type="button"
                              onClick={() => {
                                setArtistRejectTarget(art);
                                setArtistRejectReason('Foto prèv transfè a pa klè oswa nimewo referans lan pa kowenside.');
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-lg shadow-red-950/40 transition-all active:scale-95"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Refize</span>
                            </button>
                          )}

                          {/* Reset to Pending if active or rejected */}
                          {(isActive || isRejected) && (
                            <button
                              type="button"
                              onClick={() => {
                                StorageService.setArtistPendingStatus(art.id, 'pending');
                                window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'status_change', artist: { ...art, status: 'pending' } } }));
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] text-slate-400 hover:text-amber-300 hover:bg-white/[0.08] border border-white/[0.06] flex items-center gap-1 transition-colors"
                              title="Retounen demand sa a nan lis atant lan pou re-evalyasyon"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retounen an Atant</span>
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Èske w sèten ou vle efase demand atis "${art.stageName}" la nèt?`)) {
                                if (onDeleteArtist) onDeleteArtist(art.id);
                              }
                            }}
                            className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Efase demand sa a"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Cultural Roots & Vision preview snippet */}
                      {(art.musicalRoots || art.musicalInfluences || art.artisticVision || art.bio) && (
                        <div className="pt-3 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          {art.musicalRoots && (
                            <div className="bg-[#05070a] p-2.5 rounded-xl border border-white/[0.04]">
                              <span className="text-[10px] text-amber-400 font-bold uppercase block tracking-wider">Rasin & Estil:</span>
                              <p className="text-slate-300 line-clamp-1 mt-0.5">{art.musicalRoots}</p>
                            </div>
                          )}

                          {art.musicalInfluences && (
                            <div className="bg-[#05070a] p-2.5 rounded-xl border border-white/[0.04]">
                              <span className="text-[10px] text-yellow-400 font-bold uppercase block tracking-wider">Enfliyans & Modèl:</span>
                              <p className="text-slate-300 line-clamp-1 mt-0.5">{art.musicalInfluences}</p>
                            </div>
                          )}

                          {art.artisticVision && (
                            <div className="bg-[#05070a] p-2.5 rounded-xl border border-white/[0.04]">
                              <span className="text-[10px] text-blue-400 font-bold uppercase block tracking-wider">Vizyon Atistik:</span>
                              <p className="text-slate-300 line-clamp-1 mt-0.5">{art.artisticVision}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason notice if rejected */}
                      {isRejected && art.registrationRejectionReason && (
                        <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-red-300">Rezon Refi a:</strong> {art.registrationRejectionReason}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* VIEW 3.5: JERE TOUT ATIS AK SISPANSYON */}
      {activeTab === 'all_artists' && (() => {
        const totalArtistsCount = effectiveArtists.length;
        const activeArtistsCount = effectiveArtists.filter(a => a.status === 'active' || !a.status).length;
        const suspendedArtistsCount = effectiveArtists.filter(a => a.status === 'suspended').length;
        const paidArtistsCount = effectiveArtists.filter(a => a.isPaidThisMonth).length;
        const unpaidArtistsCount = effectiveArtists.filter(a => !a.isPaidThisMonth).length;
        const pendingCount = effectiveArtists.filter(a => a.status === 'pending').length;
        const rejectedCount = effectiveArtists.filter(a => a.status === 'rejected').length;

        // Map artists with their precise stats from artistsEarningStats
        const artistsWithStats = effectiveArtists.map((art) => {
          const stat = artistsEarningStats.find((s) => s.artist.id === art.id);
          const artistSongs = musicList.filter(
            (m) => m.artistId === art.id || (m.artistName && art.stageName && m.artistName.toLowerCase() === art.stageName.toLowerCase())
          );
          const totalListens = stat ? stat.totalListens : artistSongs.reduce((sum, s) => sum + (s.listens || 0), 0);
          const totalGross = stat ? stat.totalGross : artistSongs.reduce((sum, s) => sum + (s.totalDonations || 0), 0);
          const artistNetUsd = stat ? stat.artistNetUsd : Number((totalGross * 0.85).toFixed(2));
          const totalGrossHtg = stat ? stat.totalGrossHtg : Math.round(totalGross * exchangeRate);
          const artistNetHtg = stat ? stat.artistNetHtg : Math.round(artistNetUsd * exchangeRate);
          const isPaid = Boolean(art.isPaidThisMonth);

          return {
            artist: art,
            artistSongs,
            totalListens,
            totalGross,
            artistNetUsd,
            totalGrossHtg,
            artistNetHtg,
            isPaid,
            songsCount: artistSongs.length
          };
        });

        const unpaidWithBalanceCount = artistsWithStats.filter((item) => !item.isPaid && item.totalGross > 0).length;

        // Apply filters
        const filteredArtistsList = artistsWithStats.filter((item) => {
          const art = item.artist;
          const status = art.status || 'active';

          // Status quick filter
          if (artistStatusFilter !== 'all') {
            if (artistStatusFilter === 'active' && status !== 'active') return false;
            if (artistStatusFilter === 'suspended' && status !== 'suspended') return false;
            if (artistStatusFilter === 'pending' && status !== 'pending') return false;
            if (artistStatusFilter === 'rejected' && status !== 'rejected') return false;
            if (artistStatusFilter === 'paid' && !art.isPaidThisMonth) return false;
            if (artistStatusFilter === 'unpaid' && art.isPaidThisMonth) return false;
          }

          // Dedicated Payment Status filter
          if (artistPaymentFilter !== 'all') {
            if (artistPaymentFilter === 'paid' && !art.isPaidThisMonth) return false;
            if (artistPaymentFilter === 'unpaid' && art.isPaidThisMonth) return false;
            if (artistPaymentFilter === 'unpaid_with_balance' && (art.isPaidThisMonth || item.totalGross <= 0)) return false;
          }

          // Search query
          if (artistSearchQuery.trim()) {
            const q = artistSearchQuery.toLowerCase().trim();
            const inStage = (art.stageName || '').toLowerCase().includes(q);
            const inName = (art.name || '').toLowerCase().includes(q);
            const inEmail = (art.email || '').toLowerCase().includes(q);
            const inPhone = (art.phone || '').toLowerCase().includes(q);
            const inCity = (art.city || '').toLowerCase().includes(q);
            if (!inStage && !inName && !inEmail && !inPhone && !inCity) return false;
          }

          return true;
        });

        // Apply sorting
        const sortedAndFilteredArtists = [...filteredArtistsList].sort((a, b) => {
          if (artistSortBy === 'earnings_desc') {
            // Sòm Peman: soti nan pi gwo rive nan pi piti
            if (b.totalGross !== a.totalGross) return b.totalGross - a.totalGross;
            return b.totalListens - a.totalListens;
          }
          if (artistSortBy === 'earnings_asc') {
            // Sòm Peman: soti nan pi piti rive nan pi gwo
            if (a.totalGross !== b.totalGross) return a.totalGross - b.totalGross;
            return a.totalListens - b.totalListens;
          }
          if (artistSortBy === 'listens_desc') {
            return b.totalListens - a.totalListens;
          }
          if (artistSortBy === 'songs_desc') {
            return b.songsCount - a.songsCount;
          }
          if (artistSortBy === 'name_asc') {
            return (a.artist.stageName || '').localeCompare(b.artist.stageName || '');
          }
          if (artistSortBy === 'newest') {
            return new Date(b.artist.registrationDate || 0).getTime() - new Date(a.artist.registrationDate || 0).getTime();
          }
          return b.totalGross - a.totalGross;
        });

        // Financial totals for currently filtered artists
        const filteredTotalGross = sortedAndFilteredArtists.reduce((sum, item) => sum + item.totalGross, 0);
        const filteredTotalNetToPay = sortedAndFilteredArtists
          .filter((item) => !item.isPaid)
          .reduce((sum, item) => sum + item.artistNetUsd, 0);

        const hasActiveFilters =
          artistStatusFilter !== 'all' ||
          artistPaymentFilter !== 'all' ||
          artistSearchQuery.trim().length > 0 ||
          artistSortBy !== 'earnings_desc';

        return (
          <div className="space-y-6">
            {/* Main Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total Registered Artists */}
              <div
                onClick={() => {
                  setArtistStatusFilter('all');
                  setArtistPaymentFilter('all');
                }}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl group ${
                  artistStatusFilter === 'all' && artistPaymentFilter === 'all'
                    ? 'bg-gradient-to-br from-indigo-950/40 via-[#0a0f1d] to-[#05070a] border-indigo-500/50 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                    : 'bg-[#0a0f1d]/90 border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                    Total Enskri
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-400">Total Atis Anrejistre</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-white font-mono tracking-tight">
                      {totalArtistsCount}
                    </span>
                    <span className="text-xs text-slate-400">sou platfòm nan</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Pending Unvalidated Artists */}
              <div
                onClick={() => {
                  setArtistStatusFilter('pending');
                  setArtistPaymentFilter('all');
                }}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl group ${
                  artistStatusFilter === 'pending'
                    ? 'bg-gradient-to-br from-amber-950/40 via-[#0a0f1d] to-[#05070a] border-amber-500/50 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/40'
                    : 'bg-[#0a0f1d]/90 border-white/[0.08] hover:border-amber-500/30 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  {pendingCount > 0 ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono animate-pulse">
                      {pendingCount} an atant
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Tout Valide
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-400">Atis ki Poko Valide</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                      {pendingCount}
                    </span>
                    <span className="text-xs text-amber-300/80">prèv $4.99 an atant</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Suspended Artists */}
              <div
                onClick={() => {
                  setArtistStatusFilter('suspended');
                  setArtistPaymentFilter('all');
                }}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl group ${
                  artistStatusFilter === 'suspended'
                    ? 'bg-gradient-to-br from-red-950/40 via-[#0a0f1d] to-[#05070a] border-red-500/50 shadow-xl shadow-red-500/10 ring-1 ring-red-500/40'
                    : 'bg-[#0a0f1d]/90 border-white/[0.08] hover:border-red-500/30 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    <Ban className="w-5 h-5" />
                  </div>
                  {suspendedArtistsCount > 0 ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-mono">
                      {suspendedArtistsCount} bloke
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/[0.08] font-mono">
                      0 Sispann
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-400">Atis ki an Sispansyon</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-black font-mono tracking-tight ${suspendedArtistsCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {suspendedArtistsCount}
                    </span>
                    <span className="text-xs text-slate-400">kont tanporèman inaktif</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Header and Counters */}
            <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                    <Users className="w-6 h-6 text-yellow-400" />
                    <span>Jere Tout Atis sou Platfòm UpMizik la</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Lis konplè tout atis ki anrejistre yo. Ou ka verifye done yo, <strong>triye pa sòm peman (pi gwo rive pi piti)</strong>, <strong>filtre pa estati peman (Peye vs Poko Peye)</strong>, jere sispansyon aktivite, oubyen modifye detay peman yo.
                  </p>
                </div>
              </div>

              {/* Status Quick Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('all');
                    setArtistPaymentFilter('all');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    artistStatusFilter === 'all' && artistPaymentFilter === 'all'
                      ? 'bg-yellow-400/10 border-yellow-400/50 shadow-lg shadow-yellow-400/10'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-slate-400">Tout Atis</p>
                  <p className="text-xl font-black text-white font-mono mt-0.5">{totalArtistsCount}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('active');
                    setArtistPaymentFilter('all');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    artistStatusFilter === 'active'
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Aktif
                  </p>
                  <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">{activeArtistsCount}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('all');
                    setArtistPaymentFilter('paid');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    artistPaymentFilter === 'paid' || artistStatusFilter === 'paid'
                      ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-emerald-300 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Peye ({paidArtistsCount})
                  </p>
                  <p className="text-xl font-black text-emerald-300 font-mono mt-0.5">{paidArtistsCount}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('all');
                    setArtistPaymentFilter('unpaid');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    artistPaymentFilter === 'unpaid' || artistStatusFilter === 'unpaid'
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Poko Peye ({unpaidArtistsCount})
                  </p>
                  <p className="text-xl font-black text-amber-300 font-mono mt-0.5">{unpaidArtistsCount}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('suspended');
                    setArtistPaymentFilter('all');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    artistStatusFilter === 'suspended'
                      ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Sispann
                  </p>
                  <p className="text-xl font-black text-red-400 font-mono mt-0.5">{suspendedArtistsCount}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('pending');
                    setArtistPaymentFilter('all');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    artistStatusFilter === 'pending'
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> An Atant
                  </p>
                  <p className="text-xl font-black text-amber-400 font-mono mt-0.5">{pendingCount}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('rejected');
                    setArtistPaymentFilter('all');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    artistStatusFilter === 'rejected'
                      ? 'bg-slate-500/10 border-slate-500/50 shadow-lg shadow-slate-500/10'
                      : 'bg-[#05070a] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Refize
                  </p>
                  <p className="text-xl font-black text-slate-400 font-mono mt-0.5">{rejectedCount}</p>
                </button>
              </div>

              {/* Comprehensive Filter & Sort Control Bar */}
              <div className="pt-2 border-t border-white/[0.08] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Search Input */}
                  <div className="relative md:col-span-4">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={artistSearchQuery ?? ''}
                      onChange={(e) => setArtistSearchQuery(e.target.value)}
                      placeholder="Chèche pa non sèn, non reyèl, imèl, vil..."
                      className="w-full bg-[#05070a] border border-white/[0.1] focus:border-yellow-400 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none placeholder:text-slate-500 transition-colors"
                    />
                    {artistSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setArtistSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Payment Status Filter */}
                  <div className="md:col-span-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 shrink-0">
                      <Wallet className="w-4 h-4 text-yellow-400" />
                      <span className="hidden lg:inline">Estati:</span>
                    </div>
                    <select
                      id="select-artist-payment-filter"
                      value={artistPaymentFilter ?? 'all'}
                      onChange={(e) => setArtistPaymentFilter(e.target.value as any)}
                      className="w-full bg-[#05070a] border border-white/[0.1] focus:border-yellow-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer transition-colors"
                    >
                      <option value="all">Tout Estati Peman</option>
                      <option value="paid">✅ Peye Sèlman ({paidArtistsCount})</option>
                      <option value="unpaid">⏳ Poko Peye Sèlman ({unpaidArtistsCount})</option>
                      <option value="unpaid_with_balance">💰 Poko Peye ki Gen Kòb ({unpaidWithBalanceCount})</option>
                    </select>
                  </div>

                  {/* Sort By Filter (Default: Sòm Peman Pi Gwo rive nan Pi Piti) */}
                  <div className="md:col-span-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 shrink-0">
                      <ArrowDownWideNarrow className="w-4 h-4 text-emerald-400" />
                      <span className="hidden lg:inline">Triye:</span>
                    </div>
                    <select
                      id="select-artist-sort-by"
                      value={artistSortBy ?? 'earnings_desc'}
                      onChange={(e) => setArtistSortBy(e.target.value as any)}
                      className="w-full bg-[#05070a] border border-emerald-500/30 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer font-medium transition-colors"
                    >
                      <option value="earnings_desc">💰 Sòm Peman: Pi Gwo ➔ Pi Piti (Klasman Revni)</option>
                      <option value="earnings_asc">💵 Sòm Peman: Pi Piti ➔ Pi Gwo</option>
                      <option value="listens_desc">🎧 Kantite Ekout: Pi Plis ➔ Pi Piti</option>
                      <option value="songs_desc">🎵 Kantite Mizik: Pi Plis ➔ Pi Piti</option>
                      <option value="name_asc">🔤 Non Sèn: A ➔ Z</option>
                      <option value="newest">🕒 Dat Enskripsyon: Pi Nouvo an Premye</option>
                    </select>
                  </div>
                </div>

                {/* Filter Summary & Action Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#05070a]/70 p-3 rounded-2xl border border-white/[0.06] text-xs">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-slate-400">
                      Afiche <strong className="text-white">{sortedAndFilteredArtists.length}</strong> sou <strong className="text-white">{artists.length}</strong> atis
                    </span>
                    <span className="hidden sm:inline text-slate-600">•</span>
                    <span className="text-slate-300">
                      Total Revni Filte: <strong className="text-emerald-400 font-mono">${filteredTotalGross.toFixed(2)} USD</strong>
                    </span>
                    {filteredTotalNetToPay > 0 && (
                      <>
                        <span className="hidden sm:inline text-slate-600">•</span>
                        <span className="text-amber-300">
                          Rete pou Peye: <strong className="text-yellow-400 font-mono">${filteredTotalNetToPay.toFixed(2)} USD</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setArtistStatusFilter('all');
                        setArtistPaymentFilter('all');
                        setArtistSearchQuery('');
                        setArtistSortBy('earnings_desc');
                      }}
                      className="px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-yellow-400 text-[11px] font-bold flex items-center gap-1.5 transition-colors border border-yellow-400/20"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reyinisyalize Tout Filtè yo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Artists */}
            {sortedAndFilteredArtists.length === 0 ? (
              <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-12 text-center text-slate-400 text-xs">
                <Users className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="font-semibold text-slate-300">Pa gen okenn atis ki koresponn ak filtè sa a.</p>
                <button
                  type="button"
                  onClick={() => {
                    setArtistStatusFilter('all');
                    setArtistPaymentFilter('all');
                    setArtistSearchQuery('');
                    setArtistSortBy('earnings_desc');
                  }}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-white/[0.06] text-yellow-400 text-xs font-bold hover:bg-white/[0.1]"
                >
                  Reyinisyalize filtè yo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sortedAndFilteredArtists.map((item, idx) => {
                  const art = item.artist;
                  const artistSongs = item.artistSongs;
                  const totalListens = item.totalListens;
                  const totalEarnedUsd = item.artistNetUsd;
                  const totalGrossUsd = item.totalGross;
                  const isSuspended = art.status === 'suspended';
                  const isPending = art.status === 'pending';
                  const isActive = art.status === 'active' || !art.status;
                  const isRejected = art.status === 'rejected';
                  const isPaid = item.isPaid;

                  // Calculate remaining days for suspended artist
                  let suspensionDaysRemaining = 0;
                  let suspensionFormattedEnd = '';
                  if (isSuspended && art.suspendedUntil) {
                    const diffMs = new Date(art.suspendedUntil).getTime() - Date.now();
                    suspensionDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
                    try {
                      suspensionFormattedEnd = new Date(art.suspendedUntil).toLocaleDateString('ht-HT', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                    } catch {
                      suspensionFormattedEnd = art.suspendedUntil;
                    }
                  }

                  return (
                    <div
                      key={art.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        isSuspended
                          ? 'bg-red-950/20 border-red-500/40 shadow-lg shadow-red-950/20'
                          : isPending
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : isRejected
                          ? 'bg-slate-900/40 border-slate-700/40 opacity-80'
                          : isPaid
                          ? 'bg-[#0a0f1d]/90 border-emerald-500/30 hover:border-emerald-500/50'
                          : 'bg-[#0a0f1d]/90 border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                        {/* Artist Info & Ranking Badge */}
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={art.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                              alt={art.stageName}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white/[0.12] shadow-md"
                            />
                            {artistSortBy === 'earnings_desc' && (
                              <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md border ${
                                idx === 0
                                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-yellow-500/40'
                                  : idx === 1
                                  ? 'bg-slate-200 text-slate-950 border-white shadow-slate-400/40'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white border-amber-500'
                                  : 'bg-[#05070a] text-slate-300 border-white/20'
                              }`}>
                                #{idx + 1}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base sm:text-lg font-black text-white">{art.stageName}</h4>
                              <span className="text-xs text-slate-400 font-medium">({art.name})</span>
                              {/* Palmarès & Award Alert Badges */}
                              {(() => {
                                const awardSum = calculateArtistAwards(art, musicList, donations, exchangeRate);
                                return (
                                  <>
                                    {awardSum.hasDisquePlatine && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm flex items-center gap-1" title="Disque de Platine (200k+ Ekout)">
                                        <Disc className="w-3 h-3 text-cyan-300" />
                                        <span>Platine (200k)</span>
                                      </span>
                                    )}
                                    {!awardSum.hasDisquePlatine && awardSum.hasDisqueOr && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm flex items-center gap-1" title="Disque d'Or (50k+ Ekout)">
                                        <Disc className="w-3 h-3 text-amber-400" />
                                        <span>Disque d'Or (50k)</span>
                                      </span>
                                    )}
                                    {awardSum.highestTrophy && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-sm flex items-center gap-1" title={`Twofe Donasyon: ${awardSum.highestTrophy.title}`}>
                                        <Trophy className="w-3 h-3 text-yellow-400" />
                                        <span>{awardSum.highestTrophy.shortLabel}</span>
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                              {/* Status Badge */}
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Aktif
                                </span>
                              )}
                              {isSuspended && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-500 text-white shadow-md shadow-red-500/30 flex items-center gap-1">
                                  <Ban className="w-3.5 h-3.5" /> SISPANN ({suspensionDaysRemaining} Jou Rete)
                                </span>
                              )}
                              {isPending && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> An Atant Validasyon
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Refize
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span>📧 <strong className="text-slate-200">{art.email}</strong></span>
                              <span>📞 <strong className="text-slate-200">{art.phone || 'Pa gen nimewo'}</strong></span>
                              <span>📍 <strong className="text-slate-200">{art.city || 'Ayiti'}</strong></span>
                            </div>

                            {/* Suspension Banner Details if Suspended */}
                            {isSuspended && (
                              <div className="mt-2 bg-red-950/50 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 space-y-1">
                                <div className="flex items-center gap-2 font-bold text-red-300">
                                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                  <span>Kont an sispansyon pou {art.suspensionDays || 'X'} jou (jiska {suspensionFormattedEnd || 'delè a fini'})</span>
                                </div>
                                <p className="text-[11px] text-red-200/90 pl-6">
                                  <strong>Rezon:</strong> {art.suspensionReason || 'Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la'}
                                </p>
                              </div>
                            )}

                            {/* Extra stats pills */}
                            <div className="flex flex-wrap items-center gap-2 pt-1.5">
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.05] text-slate-300 border border-white/[0.06]">
                                🎵 <strong>{artistSongs.length}</strong> moso mizik
                              </span>
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.05] text-slate-300 border border-white/[0.06]">
                                🎧 <strong>{totalListens.toLocaleString()}</strong> ekout
                              </span>
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                                💰 Sòm Peman (Nèt): <strong>${totalEarnedUsd.toFixed(2)} USD</strong> (~{Math.round(toHtg(totalEarnedUsd)).toLocaleString()} HTG)
                              </span>
                              {totalGrossUsd > totalEarnedUsd && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  (Brut: ${totalGrossUsd.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Middle/Right: Estati Peman (Payment Status) Section */}
                        <div className="bg-[#05070a]/80 border border-white/[0.08] rounded-2xl p-3.5 space-y-2 shrink-0 min-w-[260px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Estati Peman Mwa a</span>
                            {isPaid ? (
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>PEYE</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>POKO PEYE</span>
                              </span>
                            )}
                          </div>

                          {isPaid ? (
                            <div className="space-y-1 text-[11px] text-slate-400">
                              <div className="flex items-center justify-between text-slate-300 font-mono">
                                <span>Montan Peye:</span>
                                <strong className="text-emerald-400 font-bold">
                                  ${(art.paidAmountThisMonth ?? totalEarnedUsd).toFixed(2)} USD
                                </strong>
                              </div>
                              {art.paidDateThisMonth && (
                                <div className="flex items-center justify-between text-[10px]">
                                  <span>Dat Peman:</span>
                                  <span className="text-slate-300">
                                    {new Date(art.paidDateThisMonth).toLocaleDateString('ht-HT', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              {art.paidReferenceThisMonth && (
                                <div className="flex items-center justify-between text-[10px]">
                                  <span>Ref:</span>
                                  <span className="text-yellow-400 font-mono font-bold">#{art.paidReferenceThisMonth}</span>
                                </div>
                              )}
                              <div className="pt-1.5 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayArtistModal(art, art.paidAmountThisMonth ?? totalEarnedUsd)}
                                  className="text-[10px] text-yellow-400 hover:text-yellow-300 underline font-semibold"
                                >
                                  Modifye Detay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevertPayArtist(art)}
                                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                                >
                                  Anile Peman
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                                <span>Montan pou Peye:</span>
                                <strong className="text-yellow-400 font-bold">
                                  ${totalEarnedUsd.toFixed(2)} USD
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenPayArtistModal(art, totalEarnedUsd)}
                                className="w-full px-3 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Make kòm "Peye"</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end xl:self-center">
                          {/* Pending Artist Quick Validate / Reject Buttons */}
                          {isPending && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOptimisticValidateArtist(art.id, true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
                                title="Valide kont atis sa a ($4.99)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Valide Atis</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setArtistRejectTarget(art);
                                  setArtistRejectReason('Foto prèv transfè a pa klè oswa nimewo referans lan pa kowenside.');
                                }}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-all active:scale-95"
                                title="Refize demand atis sa a"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Refize</span>
                              </button>
                            </div>
                          )}

                          {/* Rejected Artist Quick Re-Validate Button */}
                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => handleOptimisticValidateArtist(art.id, true)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
                              title="Re-valide demand atis sa a"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Re-Valide</span>
                            </button>
                          )}

                          {/* If Suspended -> Reactivate Button */}
                          {isSuspended ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onReactivateArtist) {
                                  onReactivateArtist(art.id);
                                } else {
                                  StorageService.reactivateArtist(art.id, currentAdmin?.name || 'Mr Clauvens');
                                }
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Leve Sispansyon (Re-aktive)</span>
                            </button>
                          ) : !isPending && !isRejected ? (
                            /* If Active -> Suspend Button */
                            <button
                              type="button"
                              onClick={() => {
                                setSuspendingArtistTarget(art);
                                setSuspensionDaysOption(15);
                                setCustomSuspensionDays('');
                                setSuspensionReasonInput('Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la');
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-all"
                            >
                              <Ban className="w-3.5 h-3.5 text-amber-400" />
                              <span>Mete an Sispansyon</span>
                            </button>
                          ) : null}

                          {/* Delete Artist Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingArtistTarget(art);
                              setDeleteArtistSongsOption(true);
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/20 flex items-center gap-1.5 transition-all"
                            title="Siprime atis sa a sou sit la"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Siprime Atis</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* VIEW: LIS PEMAN & REVNI ATIS YO (KLASMAN DEPI NAN PI FO RIVE NAN PI PITI) */}
      {activeTab === 'artist_payouts' && (() => {
        const unpaidPayoutsCount = sortedArtistsByEarnings.filter(a => !a.artist.isPaidThisMonth && a.totalGross > 0).length;
        const paidPayoutsCount = sortedArtistsByEarnings.filter(a => a.artist.isPaidThisMonth).length;

        // Filter artists according to selected filter & search query
        const filteredList = sortedArtistsByEarnings.filter((item) => {
          const art = item.artist;
          const q = payoutsSearchQuery.trim().toLowerCase();

          if (q) {
            const matchesQuery =
              art.stageName?.toLowerCase().includes(q) ||
              art.name?.toLowerCase().includes(q) ||
              art.phone?.toLowerCase().includes(q) ||
              art.email?.toLowerCase().includes(q) ||
              art.city?.toLowerCase().includes(q);
            if (!matchesQuery) return false;
          }

          if (payoutsFilter === 'all_with_money') {
            return item.totalGross > 0;
          }
          if (payoutsFilter === 'unpaid') {
            return !art.isPaidThisMonth && item.totalGross > 0;
          }
          if (payoutsFilter === 'paid') {
            return Boolean(art.isPaidThisMonth);
          }
          if (payoutsFilter === 'high_earners') {
            return item.totalGross >= 50;
          }
          if (payoutsFilter === 'suspended_earners') {
            return art.status === 'suspended' && item.totalGross > 0;
          }
          return true; // 'all'
        });

        // CSV Export function for accounting & payouts
        const handleExportPayoutsCsv = () => {
          const headers = [
            'Klasman (#)',
            'Non Atis (Stage Name)',
            'Vre Non',
            'Telefòn MonCash/Natcash',
            'Email',
            'Vil',
            'Kantite Mizik ki Rapòte',
            'Total Ekout',
            'Total Brut ($ USD)',
            'Total Brut (~HTG)',
            'Frè Platfòm 15% + $0.99 ($ USD)',
            'Frè Platfòm 15% + $0.99 (~HTG)',
            'Peman Nèt pou Atis ($ USD)',
            'Peman Nèt pou Atis (~HTG)',
            'Pousantaj Nèt (%)',
            'Estati Peman Mwa a',
            'Dat Peman',
            'Referans Tranzaksyon',
            'Estati Kont'
          ];

          const escapeField = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

          const rows = filteredList.map((item, idx) => {
            const art = item.artist;
            const statusText = art.status === 'suspended' ? 'Sispann (Mizik rete aktif)' : (art.status === 'pending' ? 'Pann' : 'Aktif');
            const payoutStatus = art.isPaidThisMonth ? 'DEJA PEYE' : 'POKO PEYE';

            return [
              idx + 1,
              escapeField(art.stageName),
              escapeField(art.name),
              escapeField(art.phone || 'Pa endike'),
              escapeField(art.email || 'N/A'),
              escapeField(art.city || 'Ayiti'),
              item.songsCount,
              item.totalListens,
              item.totalGross.toFixed(2),
              item.totalGrossHtg,
              item.platformFeeUsd.toFixed(2),
              item.platformFeeHtg,
              item.artistNetUsd.toFixed(2),
              item.artistNetHtg,
              escapeField(`${item.effectivePercentage}%`),
              escapeField(payoutStatus),
              escapeField(art.paidDateThisMonth ? new Date(art.paidDateThisMonth).toLocaleDateString('ht-HT') : 'N/A'),
              escapeField(art.paidReferenceThisMonth || 'N/A'),
              escapeField(statusText)
            ].join(',');
          });

          const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const today = new Date().toISOString().slice(0, 10);
          link.setAttribute('href', url);
          link.setAttribute('download', `UpMizik_Peman_Atis_${today}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        };

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Description */}
            <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <span>Lis Peman & Revni Atis yo</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                          Depi nan pi fò rive nan pi piti
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Klasman tout atis ki fè kòb pou mwa a pou pèmèt administrasyon UpMizik la voye peman MonCash/Natcash yo rapid e san delè.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Export & Actions */}
                <div className="flex items-center gap-2.5 self-start md:self-center">
                  <button
                    type="button"
                    onClick={handleExportPayoutsCsv}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Ekspòte CSV Peman</span>
                  </button>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
                {/* 1: Total Earners */}
                <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Atis ki Fè Kòb</span>
                    <Award className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {artistsWithEarningsCount}{' '}
                    <span className="text-xs font-normal text-slate-400 font-sans">
                      / {artists.length} atis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {((artistsWithEarningsCount / (artists.length || 1)) * 100).toFixed(0)}% atis anrejistre yo antre revni
                  </p>
                </div>

                {/* 2: Gross Donations */}
                <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Kòb Brut Resevwa</span>
                    <DollarSign className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {renderDualAmount(payoutAggregateTotals.totalGross, { colorUsd: 'text-blue-400 font-bold', colorHtg: 'text-blue-300 font-bold' })}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    100% total donasyon ak sipò fanatik yo
                  </p>
                </div>

                {/* 3: Platform Fee (-15% + $0.99) */}
                <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Frè Platfòm (-15% + $0.99)</span>
                    <Receipt className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-purple-300 font-mono">
                    {renderDualAmount(payoutAggregateTotals.totalPlatformFee, { colorUsd: 'text-purple-400 font-bold', colorHtg: 'text-purple-300 font-bold' })}
                  </div>
                  <p className="text-[11px] text-purple-300/80">
                    15% komisyon + $0.99 frè sèvis pa atis
                  </p>
                </div>

                {/* 4: Net Artist Payouts */}
                <div className="bg-[#05070a]/90 border border-emerald-500/30 rounded-2xl p-4 space-y-1 bg-gradient-to-br from-emerald-950/20 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Nèt Pou Peye Atis</span>
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {renderDualAmount(payoutAggregateTotals.totalArtistNet, { colorUsd: 'text-emerald-400 font-bold', colorHtg: 'text-emerald-300 font-bold' })}
                  </div>
                  <p className="text-[11px] text-emerald-400/90 font-medium">
                    Kòb reyèl pou transfere bay atis yo (85% - $0.99)
                  </p>
                </div>
              </div>

              {/* Informative Formula Banner & Threshold Indicator */}
              <div className="space-y-3">
                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>
                      <strong>Fòmil Peman Atis UpMizik:</strong> Chak atis resevwa <strong>85%</strong> kòb brut la mwens frè tranzaksyon fiks <strong>$0.99 USD</strong> (<span className="font-mono">Peman Nèt = (Brut × 0.85) - $0.99</span>).
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400/80 shrink-0 font-mono">
                    Taux konvèsyon: 1 USD = {exchangeRate} HTG
                  </span>
                </div>

                {/* Pending Payout Status & Threshold Control Strip */}
                <div className={`rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all ${
                  payoutAggregateTotals.isThresholdExceeded
                    ? 'bg-gradient-to-r from-red-950/70 via-amber-950/50 to-[#0a0f1d] border-amber-500/50 shadow-lg shadow-amber-950/30'
                    : 'bg-[#05070a]/80 border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      payoutAggregateTotals.isThresholdExceeded
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 animate-pulse'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      {payoutAggregateTotals.isThresholdExceeded ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <CheckCheck className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {payoutAggregateTotals.isThresholdExceeded
                            ? 'Avètisman: Fon k ap tann depase papòt alèt la!'
                            : 'Estati Peman k ap Tann pou Atis yo'}
                        </h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                          payoutAggregateTotals.isThresholdExceeded
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {payoutAggregateTotals.unpaidCount} atis poko peye (${payoutAggregateTotals.totalUnpaidNetUsd.toFixed(2)} USD / ~{payoutAggregateTotals.totalUnpaidNetHtg.toLocaleString()} HTG)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Papòt alèt aktyèl: <strong>${payoutAlertThreshold} USD</strong> (~{Math.round(payoutAlertThreshold * exchangeRate).toLocaleString()} HTG). Lè montan total ki poko peye a depase papòt sa a, sistèm nan afiche yon avètisman otomatik.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {payoutAggregateTotals.unpaidCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayoutsFilter('unpaid')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Filter Poko Peye ({payoutAggregateTotals.unpaidCount})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowThresholdConfigModal(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Ajiste Papòt (${payoutAlertThreshold})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLO BAR KONPAREZON REVNI TOTAL CHAK MWA (RECHARTS) */}
            <MonthlyRevenueBarChart
              donations={donations}
              archives={archives}
              artists={artists}
              musicList={musicList}
              exchangeRate={exchangeRate}
              toHtg={toHtg}
              currentMonthGross={payoutAggregateTotals.totalGross}
              currentMonthArtistNet={payoutAggregateTotals.totalArtistNet}
              currentMonthPlatformFee={payoutAggregateTotals.totalPlatformFee}
            />

            {/* Filter & Search Bar */}
            <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-5 space-y-4 backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Chèche pa non atis, vre non, telefòn MonCash, vil, email..."
                    value={payoutsSearchQuery ?? ''}
                    onChange={(e) => setPayoutsSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#05070a] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-yellow-400"
                  />
                  {payoutsSearchQuery && (
                    <button
                      onClick={() => setPayoutsSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutsFilter('all_with_money')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      payoutsFilter === 'all_with_money'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-[#05070a] text-slate-400 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    Atis ki Fè Kòb ({artistsWithEarningsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutsFilter('unpaid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      payoutsFilter === 'unpaid'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-[#05070a] text-amber-300 hover:text-white border border-amber-500/30'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Poko Peye ({unpaidPayoutsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutsFilter('paid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      payoutsFilter === 'paid'
                        ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/20'
                        : 'bg-[#05070a] text-emerald-300 hover:text-white border border-emerald-500/30'
                    }`}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Deja Peye ({paidPayoutsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutsFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      payoutsFilter === 'all'
                        ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                        : 'bg-[#05070a] text-slate-400 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    Tout Atis ({artists.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutsFilter('high_earners')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      payoutsFilter === 'high_earners'
                        ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                        : 'bg-[#05070a] text-slate-400 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    Gwo Revni ($50+)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutsFilter('suspended_earners')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      payoutsFilter === 'suspended_earners'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-[#05070a] text-slate-400 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    Sispann ki Fè Kòb
                  </button>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-semibold">Triye pa:</span>
                  <select
                    value={payoutsSortBy ?? 'gross_desc'}
                    onChange={(e) => setPayoutsSortBy(e.target.value as any)}
                    className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-yellow-400"
                  >
                    <option value="gross_desc">💰 Kòb Brut (Pi Fò rive Pi Piti)</option>
                    <option value="gross_asc">📈 Kòb Brut (Pi Piti rive Pi Fò)</option>
                    <option value="songs_count">🎵 Kantite Moso Mizik</option>
                    <option value="listens">🎧 Kantite Ekout</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ARTISTS LEADERBOARD LIST */}
            {filteredList.length === 0 ? (
              <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-12 text-center backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <Coins className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">Pa gen okenn atis ki koresponn ak rechèch sa a</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  Chanje filtè a oswa verifye si gen atis ki resevwa donasyon pou peryòd sa a.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPayoutsSearchQuery('');
                    setPayoutsFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                >
                  Afiche Tout Atis yo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map((item, index) => {
                  const art = item.artist;
                  const rank = index + 1;
                  const isSuspended = art.status === 'suspended';
                  const isCopied = copiedArtistId === art.id;

                  // Rank Badge
                  let rankBadge = (
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center font-mono font-black text-slate-300 text-sm">
                      #{rank}
                    </div>
                  );
                  let rankCardBorder = 'border-white/[0.08]';

                  if (rank === 1 && item.totalGross > 0) {
                    rankBadge = (
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-yellow-500/20 text-base">
                        🥇 1
                      </div>
                    );
                    rankCardBorder = 'border-yellow-500/40 bg-gradient-to-r from-yellow-950/20 via-[#0a0f1d] to-[#0a0f1d]';
                  } else if (rank === 2 && item.totalGross > 0) {
                    rankBadge = (
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-300 to-slate-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-slate-400/20 text-sm">
                        🥈 2
                      </div>
                    );
                    rankCardBorder = 'border-slate-400/30';
                  } else if (rank === 3 && item.totalGross > 0) {
                    rankBadge = (
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-700 text-white flex items-center justify-center font-black shadow-lg shadow-amber-700/20 text-sm">
                        🥉 3
                      </div>
                    );
                    rankCardBorder = 'border-amber-700/30';
                  }

                  return (
                    <div
                      key={art.id}
                      className={`bg-[#0a0f1d]/90 border ${rankCardBorder} rounded-3xl p-4 sm:p-5 backdrop-blur-xl transition-all hover:border-white/[0.18] shadow-lg`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left Side: Rank, Avatar, Identity, MonCash info */}
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          {/* Rank badge */}
                          <div className="shrink-0 pt-0.5 sm:pt-0">
                            {rankBadge}
                          </div>

                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <img
                              src={art.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80'}
                              alt={art.stageName}
                              className="w-13 h-13 rounded-2xl object-cover border border-white/[0.1] bg-[#05070a]"
                              referrerPolicy="no-referrer"
                            />
                            {/* Verified / Status dot */}
                            <div className="absolute -bottom-1 -right-1">
                              {isSuspended ? (
                                <span className="w-4 h-4 rounded-full bg-amber-500 border-2 border-[#0a0f1d] flex items-center justify-center text-[9px] text-slate-950 font-bold" title="Kont an sispansyon">
                                  !
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0a0f1d] flex items-center justify-center text-[9px] text-white font-bold" title="Atis Verifye">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-black text-white truncate">
                                {art.stageName}
                              </h4>
                              {/* Palmarès & Award Alert Badges */}
                              {(() => {
                                const awardSum = calculateArtistAwards(art, musicList, donations, exchangeRate);
                                return (
                                  <>
                                    {awardSum.hasDisquePlatine && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm flex items-center gap-1" title="Disque de Platine (200k+ Ekout)">
                                        <Disc className="w-3 h-3 text-cyan-300" />
                                        <span>Platine (200k)</span>
                                      </span>
                                    )}
                                    {!awardSum.hasDisquePlatine && awardSum.hasDisqueOr && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm flex items-center gap-1" title="Disque d'Or (50k+ Ekout)">
                                        <Disc className="w-3 h-3 text-amber-400" />
                                        <span>Disque d'Or (50k)</span>
                                      </span>
                                    )}
                                    {awardSum.highestTrophy && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-sm flex items-center gap-1" title={`Twofe Donasyon: ${awardSum.highestTrophy.title}`}>
                                        <Trophy className="w-3 h-3 text-yellow-400" />
                                        <span>{awardSum.highestTrophy.shortLabel}</span>
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                              {art.isVerified && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Verifye
                                </span>
                              )}
                              {isSuspended && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  An Sispansyon
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                              <span>Vre Non: <strong className="text-slate-300">{art.name}</strong></span>
                              <span>•</span>
                              <span>📍 <strong className="text-slate-300">{art.city || 'Ayiti'}</strong></span>
                              {art.email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px] sm:max-w-[220px]">{art.email}</span>
                                </>
                              )}
                            </div>

                            {/* MonCash / Phone Pill with 1-Click Copy */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <div className="inline-flex items-center gap-1.5 bg-[#05070a] border border-white/[0.1] rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono">
                                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>MonCash / Natcash:</span>
                                <strong className="text-yellow-300">{art.phone || 'Pa gen nimewo'}</strong>
                              </div>

                              {art.phone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(art.phone);
                                    setCopiedArtistId(art.id);
                                    setTimeout(() => setCopiedArtistId(null), 2500);
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                                    isCopied
                                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                                      : 'bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
                                  }`}
                                >
                                  {isCopied ? (
                                    <>
                                      <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                                      <span>Kopye!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Kopye Nimewo</span>
                                    </>
                                  )}
                                </button>
                              )}

                              <span className="text-[11px] text-slate-400 font-semibold px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                🎵 {item.songsCount} moso mizik ({item.totalListens.toLocaleString()} ekout)
                              </span>
                            </div>

                            {/* Warning if Suspended */}
                            {isSuspended && (
                              <p className="text-[11px] text-amber-300/90 pt-0.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>Mizik atis sa a rete intak e disponib sou sit la; li dwe resevwa peman l nòmalman.</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Financial Breakdown & Payment Status Column */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 shrink-0 border-t lg:border-t-0 border-white/[0.08] pt-3 lg:pt-0">
                          {/* Financial Column */}
                          <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 text-left sm:text-right bg-[#05070a]/70 p-3 rounded-2xl border border-white/[0.06]">
                            {/* Gross */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Brut</span>
                              <div className="font-mono text-xs sm:text-sm font-bold text-white">
                                {renderDualAmount(item.totalGross, { compact: true })}
                              </div>
                              <span className="text-[10px] text-slate-500 block">100% donasyon</span>
                            </div>

                            <div className="hidden sm:block w-px h-8 bg-white/[0.08]" />

                            {/* Platform Fee */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-purple-400 block">Frè (-15% + $0.99)</span>
                              <div className="font-mono text-xs sm:text-sm font-bold text-purple-300">
                                -{renderDualAmount(item.platformFeeUsd, { compact: true })}
                              </div>
                              <span className="text-[10px] text-purple-400/80 block">UpMizik sèvis</span>
                            </div>

                            <div className="hidden sm:block w-px h-8 bg-white/[0.08]" />

                            {/* Artist Net */}
                            <div className="space-y-0.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-2.5 py-1">
                              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Peman Nèt Atis</span>
                              <div className="font-mono text-sm sm:text-base font-black text-emerald-400">
                                {renderDualAmount(item.artistNetUsd, { colorUsd: 'text-emerald-400 font-bold', colorHtg: 'text-emerald-300 font-bold' })}
                              </div>
                              <span className="text-[10px] text-emerald-300/80 font-bold block">
                                Pousantaj: {item.effectivePercentage}%
                              </span>
                            </div>
                          </div>

                          {/* Estati Peman & Action Box */}
                          <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3 space-y-2 min-w-[210px] flex flex-col justify-between">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Estati Peman</span>
                              {Boolean(art.isPaidThisMonth) ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  <CheckCheck className="w-3 h-3" /> PEYE
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> POKO PEYE
                                </span>
                              )}
                            </div>

                            {Boolean(art.isPaidThisMonth) ? (
                              <div className="space-y-1 text-[10px] text-slate-400">
                                <div className="flex items-center justify-between text-slate-300 font-mono">
                                  <span>Peye:</span>
                                  <strong className="text-emerald-400">${(art.paidAmountThisMonth ?? item.artistNetUsd).toFixed(2)} USD</strong>
                                </div>
                                {art.paidReferenceThisMonth && (
                                  <div className="truncate text-yellow-400 font-mono text-[10px]">
                                    Ref: #{art.paidReferenceThisMonth}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPayArtistModal(art, art.paidAmountThisMonth ?? item.artistNetUsd)}
                                    className="text-[10px] text-yellow-400 hover:text-yellow-300 underline font-semibold"
                                  >
                                    Modifye
                                  </button>
                                  <span>•</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRevertPayArtist(art)}
                                    className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                                  >
                                    Anile Peman
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenPayArtistModal(art, item.artistNetUsd)}
                                className="w-full py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all whitespace-nowrap"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Make kòm "Peye"</span>
                              </button>
                            )}

                            {/* View Song Breakdown & Copy Report Buttons */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => setSelectedArtistForSongBreakdown(art)}
                                className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 flex items-center justify-center gap-1 transition-all"
                                title="Wè lis tout mizik ki bay total kòb sa a"
                              >
                                <ListMusic className="w-3.5 h-3.5 text-yellow-400" />
                                <span>Mizik ({item.songsCount})</span>
                              </button>

                              {art.phone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const text = `Bonjou ${art.stageName}, administrasyon UpMizik la voye peman w pou mwa sa a:\nTotal Brut: $${item.totalGross.toFixed(2)} USD (~${item.totalGrossHtg.toLocaleString()} HTG)\nFrè Platfòm (-15% + $0.99): -$${item.platformFeeUsd.toFixed(2)} USD\nMontan Nèt Peye: $${item.artistNetUsd.toFixed(2)} USD (~${item.artistNetHtg.toLocaleString()} HTG)\nTelefòn MonCash: ${art.phone}\nEstati: ${art.isPaidThisMonth ? 'DEJA PEYE' : 'AN KOU'}\nMèsi pou konfyans ou nan UpMizik!`;
                                    navigator.clipboard.writeText(text);
                                    alert(`Enfòmasyon peman pou ${art.stageName} kopye nan papye-kolye w avèk siksè! Ou ka kole l nan WhatsApp oswa SMS.`);
                                  }}
                                  className="py-1.5 px-2 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-all"
                                  title="Kopye mesaj rapò peman pou voye bay atis la"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* VIEW 4: JERE TOP 3 */}
      {activeTab === 'top3' && (
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-6 backdrop-blur-xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Jere Klasman Top 3 sou Paj Dakèy la</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ou ka kite sistèm nan kalkile Top 3 la otomatikman pa ekout, oubyen ou ka chwazi mizik yo manyèlman.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#05070a]/90 p-4 rounded-2xl border border-white/[0.08]">
            <input
              id="toggle-top3-manual"
              type="checkbox"
              checked={top3ManualEnabled}
              onChange={(e) => setTop3ManualEnabled(e.target.checked)}
              className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
            />
            <label htmlFor="toggle-top3-manual" className="text-xs sm:text-sm font-bold text-white cursor-pointer">
              Aktive seleksyon manyèl Admin pou Top 3 (Manual Override)
            </label>
          </div>

          {top3ManualEnabled && (
            <div className="space-y-4 bg-[#05070a]/60 p-5 rounded-2xl border border-white/[0.08] backdrop-blur-md">
              <div>
                <label className="block text-xs font-bold text-yellow-400 mb-1.5">🥇 1ye Plas (Gold Badge):</label>
                <select
                  value={top1Id ?? ''}
                  onChange={(e) => setTop1Id(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl p-2.5 text-xs text-white outline-none focus:border-yellow-400"
                >
                  {musicList.map((m) => (
                    <option key={m.id} value={m.id}>{m.title} — {m.artistName} ({m.listens} ekout)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">🥈 2èm Plas (Silver Badge):</label>
                <select
                  value={top2Id ?? ''}
                  onChange={(e) => setTop2Id(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl p-2.5 text-xs text-white outline-none focus:border-yellow-400"
                >
                  {musicList.map((m) => (
                    <option key={m.id} value={m.id}>{m.title} — {m.artistName} ({m.listens} ekout)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-500 mb-1.5">🥉 3èm Plas (Bronze Badge):</label>
                <select
                  value={top3Id ?? ''}
                  onChange={(e) => setTop3Id(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl p-2.5 text-xs text-white outline-none focus:border-yellow-400"
                >
                  {musicList.map((m) => (
                    <option key={m.id} value={m.id}>{m.title} — {m.artistName} ({m.listens} ekout)</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveTop3}
            className="px-6 py-3 rounded-xl font-bold text-xs bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-2 shadow-xl shadow-yellow-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Anrejistre Konfigirasyon Top 3</span>
          </button>
        </div>
      )}

      {/* VIEW 5: AJOUTE / MODIFYE MIZIK */}
      {activeTab === 'add_music' && (
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-red-500" />
              <span>{editingSong ? `Modifye Moso: ${editingSong.title}` : 'Ajoute yon Nouvo Moso Mizik'}</span>
            </h3>
            {editingSong && (
              <button
                onClick={() => { setEditingSong(null); setMusicTitle(''); }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Anile Modifikasyon
              </button>
            )}
          </div>

          <form onSubmit={handleSaveMusicForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tit Mizik la *</label>
                <input
                  type="text"
                  required
                  value={musicTitle ?? ''}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  placeholder="egz: Gouyad Papiyon"
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-yellow-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Chwazi Atis Prensipal *</label>
                <select
                  value={musicArtistId ?? ''}
                  onChange={(e) => setMusicArtistId(e.target.value)}
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-yellow-400 outline-none"
                >
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.stageName} ({a.name})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Release Format Selector (Admin) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#05070a]/90 border border-white/[0.1] space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-yellow-400">
                  Fòma / Tip Pwojè Mizikal la *
                </label>
                <span className="text-[10px] text-slate-400">
                  Defini si mizik sa se yon Single oubyen si li fè pati yon Albòm, EP, Mixtape oswa Demo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'single', label: 'Single', icon: '🎵', desc: 'Mizik Endividyèl' },
                  { id: 'album', label: 'Albòm', icon: '💿', desc: 'Album Konplè' },
                  { id: 'ep', label: 'EP', icon: '💽', desc: 'Mini-Pwojè (3-6)' },
                  { id: 'mixtape', label: 'Mixtape', icon: '📼', desc: 'Konpilasyon' },
                  { id: 'demo', label: 'Demo', icon: '🎙️', desc: 'Vèsyon Tès' }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setMusicReleaseFormat(fmt.id as ReleaseFormat)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      musicReleaseFormat === fmt.id
                        ? 'bg-yellow-400/20 border-yellow-400 text-white shadow-md shadow-yellow-400/10'
                        : 'bg-[#0a0f1d] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.2]'
                    }`}
                  >
                    <div className="text-base">{fmt.icon}</div>
                    <div>
                      <div className="text-xs font-bold text-white mt-1">{fmt.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{fmt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* If Albòm, EP, Mixtape, or Demo is selected */}
              {musicReleaseFormat !== 'single' && (
                <div className="pt-2 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-yellow-300 mb-1">
                      Non {musicReleaseFormat === 'album' ? 'Albòm nan' : musicReleaseFormat === 'ep' ? 'EP a' : musicReleaseFormat === 'mixtape' ? 'Mixtape la' : 'Demo a'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={musicAlbumName ?? ''}
                      onChange={(e) => setMusicAlbumName(e.target.value)}
                      placeholder={
                        musicReleaseFormat === 'album'
                          ? 'egz: "Haiti Cheri", "Lanmou San Fen"'
                          : musicReleaseFormat === 'ep'
                          ? 'egz: "Evolisyon EP", "Premye Vwayaj"'
                          : musicReleaseFormat === 'mixtape'
                          ? 'egz: "Lari a Pale Vol. 1"'
                          : 'egz: "Sesyon Akoustik Studio Demo"'
                      }
                      className="w-full bg-[#0a0f1d] border border-yellow-500/40 rounded-xl px-3 py-2 text-xs text-white focus:border-yellow-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Nimewo Track (opsyonèl)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={musicTrackNumber ?? ''}
                      onChange={(e) => setMusicTrackNumber(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="egz: 1, 2, 3..."
                      className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-yellow-400 outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Featuring Tèks (opsyonèl)</label>
                <input
                  type="text"
                  value={musicFeat ?? ''}
                  onChange={(e) => setMusicFeat(e.target.value)}
                  placeholder="egz: Queen Stèla"
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-yellow-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-purple-300 mb-1">🤝 Lye yon Lòt Atis UpMizik (Kolab)</label>
                <select
                  value={musicCollabArtistId ?? ''}
                  onChange={(e) => setMusicCollabArtistId(e.target.value)}
                  className="w-full bg-[#05070a] border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-purple-200 focus:border-purple-400 outline-none"
                >
                  <option value="">-- Pa gen Kolaborasyon Lye --</option>
                  {artists
                    .filter((a) => a.id !== musicArtistId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.stageName} ({a.city || 'Atis UpMizik'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Wòl Kolaboratè a</label>
                <select
                  value={musicCollabRole ?? 'Featuring'}
                  onChange={(e) => setMusicCollabRole(e.target.value)}
                  disabled={!musicCollabArtistId}
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-yellow-400 outline-none disabled:opacity-40"
                >
                  <option value="Featuring">Featuring (Ft.)</option>
                  <option value="Co-Artist">Ko-Atis (Co-Artist)</option>
                  <option value="Producer">Pwodiktè (Beatmaker/Producer)</option>
                  <option value="Composer">Konpozitè (Composer)</option>
                  <option value="Special Guest">Envite Espesyal</option>
                </select>
              </div>
            </div>

            {/* CREDITS & SPLIT SHEETS (POUSANTAJ KOLABORASYON / KREDI) */}
            <SongCreditsEditor
              credits={musicCredits}
              mainArtistName={artists.find((a) => a.id === musicArtistId)?.stageName || 'Atis Prensipal'}
              registeredArtists={artists}
              onAddCredit={handleAddMusicCredit}
              onRemoveCredit={handleRemoveMusicCredit}
              onUpdateCredit={handleUpdateMusicCredit}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kategori / Stil *</label>
                <select
                  value={musicCategory ?? 'Kompa'}
                  onChange={(e) => setMusicCategory(e.target.value as MusicCategory)}
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-yellow-400 outline-none"
                >
                  <option value="Kompa">Kompa</option>
                  <option value="Drill">Drill</option>
                  <option value="Afro">Afro</option>
                  <option value="Trap">Trap</option>
                  <option value="Rap">Rap</option>
                  <option value="Hip-hop">Hip-hop</option>
                  <option value="Gouyad">Gouyad</option>
                  <option value="Rabòday">Rabòday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Nimewo / Pozisyon *</span>
                  <span className="text-[10px] text-yellow-400 font-bold">Chak mizik gen pwòp pa l</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={musicPosition ?? ''}
                  onChange={(e) => setMusicPosition(e.target.value ? Math.max(1, parseInt(e.target.value)) : '')}
                  placeholder="egz: 1, 2, 3..."
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-yellow-400 outline-none font-mono font-bold"
                />
              </div>
            </div>

            {/* Estati Modération Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Estati Modération (Piblikasyon) *</span>
                <span className="text-[10px] text-yellow-400 font-bold">
                  {musicStatus === 'active'
                    ? '🟢 Moso a ap pibliye dirèkteman sou sit la'
                    : musicStatus === 'pending'
                    ? '🟡 Moso a ap rete an atant modération (Pann)'
                    : '🔴 Moso a ap make kòm refize'}
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMusicStatus('active')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    musicStatus === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-[#05070a] text-slate-400 border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Validé (Pibliye)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMusicStatus('pending')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    musicStatus === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-950/40'
                      : 'bg-[#05070a] text-slate-400 border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Pann (An Atant)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMusicStatus('rejected')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    musicStatus === 'rejected'
                      ? 'bg-red-500/20 text-red-300 border-red-500 shadow-md shadow-red-950/40'
                      : 'bg-[#05070a] text-slate-400 border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                  <span>Refize</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              💡 <strong>Lojik Pozisyon:</strong> Si w ap modifye yon moso epi w chanje nimewo l pou yon nimewo ki gen yon lòt moso deja, 2 mizik yo ap chanje plas (swap) otomatikman. Si se yon nouvo moso w ap ajoute, moso ki te nan nimewo a ap deplase nan yon nimewo vid.
            </p>

            {/* Upload Cover & Audio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Foto Kouvèti (Cover Upload)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        try {
                          const compressed = await compressAndReadFile(file, 600, 600, 0.75);
                          if (compressed) {
                            setMusicCoverUrl(compressed);
                          }
                        } catch (err) {
                          console.warn('Cover upload error:', err);
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:bg-white/[0.08] file:text-white file:border-0 hover:file:bg-white/[0.12] cursor-pointer"
                  />
                  {musicCoverUrl && (
                    <img
                      src={musicCoverUrl}
                      alt="Cover Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-yellow-400 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Fichye Odyo (Audio Upload)</label>
                  {musicDuration > 0 && (
                    <span className="text-[10px] text-yellow-400 font-mono">Dire: {musicDuration}s</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const audioKey = `audio_admin_${Date.now()}`;
                      await IdbStorage.saveMedia(audioKey, file);
                      setMusicAudioUrl(`idb:${audioKey}`);
                      try {
                        const dur = await getAudioDuration(file);
                        if (dur && dur > 0) {
                          setMusicDuration(dur);
                        }
                      } catch (err) {
                        console.warn('Audio duration detection error:', err);
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:bg-white/[0.08] file:text-white file:border-0 hover:file:bg-white/[0.12] cursor-pointer"
                />
                {musicAudioUrl && (
                  <p className="text-[10px] text-emerald-400 mt-1">✓ Fichye odyo pare pou lekti.</p>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="url"
                value={musicYt ?? ''}
                onChange={(e) => setMusicYt(e.target.value)}
                placeholder="Lyen YouTube"
                className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-yellow-400 outline-none"
              />
              <input
                type="url"
                value={musicTiktok ?? ''}
                onChange={(e) => setMusicTiktok(e.target.value)}
                placeholder="Lyen TikTok"
                className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-yellow-400 outline-none"
              />
              <input
                type="url"
                value={musicIg ?? ''}
                onChange={(e) => setMusicIg(e.target.value)}
                placeholder="Lyen Instagram"
                className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-yellow-400 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/20 active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>{editingSong ? 'Mete Moso Mizik la Ajou' : 'Anrejistre Moso Mizik la'}</span>
            </button>
          </form>
        </div>
      )}

      {/* VIEW 6: JERE RPA (3 POUSED TALENTS) */}
      {activeTab === 'rpa' && (
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>Jere Kontni Ribrik Pouse Atis (RPA)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mete Imaj, GIF, oswa Videyo MP4 (san son) ak lyen YouTube pou atis an vedèt yo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newId = `rpa-${Date.now()}`;
                  setTempRpa([
                    ...tempRpa,
                    {
                      id: newId,
                      title: 'Nouvo Atis RPA',
                      artistName: 'Non Atis',
                      description: 'Deskripsyon talan an...',
                      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
                      mediaUrl: '',
                      mediaType: 'image',
                      socialLink: 'https://youtube.com',
                      youtubeUrl: 'https://youtube.com',
                      badgeText: 'Pouse Semèn Sa'
                    }
                  ]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.1] flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span>Ajoute yon RPA</span>
              </button>
              <button
                onClick={() => onSaveRpa(tempRpa)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Anrejistre Tout RPA</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {tempRpa.map((rpa, idx) => {
              const currentMedia = rpa.mediaUrl || rpa.imageUrl || '';
              const isVideo = rpa.mediaType === 'video' || currentMedia.endsWith('.mp4') || currentMedia.startsWith('data:video');
              const isGif = rpa.mediaType === 'gif' || currentMedia.toLowerCase().includes('.gif');

              return (
                <div key={rpa.id} className="bg-[#05070a]/90 border border-white/[0.1] rounded-2xl p-4 sm:p-5 space-y-4 backdrop-blur-md relative flex flex-col justify-between shadow-xl">
                  {/* Top Bar with Number and Delete */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-400 text-[10px] font-black uppercase tracking-wider border border-yellow-400/30">
                        RPA #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[140px]">
                        {rpa.artistName || 'San Non'}
                      </span>
                    </div>
                    {tempRpa.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = tempRpa.filter((_, i) => i !== idx);
                          setTempRpa(filtered);
                        }}
                        className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Efase RPA sa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Media Live Preview */}
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/[0.12] flex items-center justify-center group">
                      {isVideo ? (
                        <div className="relative w-full h-full">
                          <video
                            src={currentMedia}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] text-white flex items-center gap-1 font-semibold border border-white/10">
                            <VolumeX className="w-3 h-3 text-yellow-400" />
                            <span>MP4 San Son (Oto-Jwe)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <img
                            src={currentMedia || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                            alt={rpa.artistName}
                            className="w-full h-full object-cover"
                          />
                          {isGif && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-purple-600/80 backdrop-blur-sm text-[10px] text-white font-bold">
                              GIF Anime
                            </div>
                          )}
                        </div>
                      )}

                      {/* Badge preview overlay */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                        {rpa.badgeText || 'Badj'}
                      </span>
                    </div>

                    {/* Media Type Selector */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0a0f1d] rounded-xl border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...tempRpa];
                          copy[idx].mediaType = 'image';
                          setTempRpa(copy);
                        }}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          rpa.mediaType !== 'gif' && rpa.mediaType !== 'video'
                            ? 'bg-yellow-400 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Imaj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...tempRpa];
                          copy[idx].mediaType = 'gif';
                          setTempRpa(copy);
                        }}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          rpa.mediaType === 'gif'
                            ? 'bg-purple-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Film className="w-3 h-3" />
                        <span>GIF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...tempRpa];
                          copy[idx].mediaType = 'video';
                          setTempRpa(copy);
                        }}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          rpa.mediaType === 'video'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Video className="w-3 h-3" />
                        <span>MP4 Video</span>
                      </button>
                    </div>

                    {/* Media Upload & URL Inputs */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rpa.mediaUrl || rpa.imageUrl || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const copy = [...tempRpa];
                            const isV = val.endsWith('.mp4');
                            const isG = val.toLowerCase().includes('.gif');
                            copy[idx].mediaUrl = val;
                            copy[idx].imageUrl = val;
                            if (isV) copy[idx].mediaType = 'video';
                            else if (isG) copy[idx].mediaType = 'gif';
                            setTempRpa(copy);
                          }}
                          placeholder={
                            rpa.mediaType === 'video'
                              ? 'URL Videyo MP4 (egz: https://.../video.mp4)'
                              : rpa.mediaType === 'gif'
                              ? 'URL GIF Anime (egz: https://.../anim.gif)'
                              : 'URL Imaj (JPG / PNG / WebP)'
                          }
                          className="flex-1 bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-yellow-400 placeholder:text-slate-500 font-mono"
                        />

                        {/* File Upload Button */}
                        <label
                          htmlFor={`rpa-file-input-${idx}`}
                          className="px-2.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/[0.1] rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
                          title="Telechaje yon fichye Imaj, GIF oswa MP4 depi aparèy ou"
                        >
                          <Upload className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="hidden sm:inline">Chwazi Fichye</span>
                        </label>
                        <input
                          id={`rpa-file-input-${idx}`}
                          type="file"
                          accept="image/*,video/mp4,image/gif"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const isV = file.type.startsWith('video/') || file.name.endsWith('.mp4');
                              const isG = file.type === 'image/gif' || file.name.endsWith('.gif');
                              let dataUrl = '';
                              if (isV || isG) {
                                const reader = new FileReader();
                                dataUrl = await new Promise((res) => {
                                  reader.onload = (ev) => res(ev.target?.result as string);
                                  reader.readAsDataURL(file);
                                });
                              } else {
                                dataUrl = await compressAndReadFile(file, 800, 800, 0.72);
                              }
                              const copy = [...tempRpa];
                              copy[idx].mediaUrl = dataUrl;
                              copy[idx].imageUrl = isV ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80' : dataUrl;
                              copy[idx].mediaType = isV ? 'video' : isG ? 'gif' : 'image';
                              setTempRpa(copy);
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        💡 Videyo MP4 ap jwe san son (muted loop) an background pou pa deranje mizik k ap jwe a.
                      </p>
                    </div>
                  </div>

                  {/* Metadata Fields */}
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Non Atis la</label>
                      <input
                        type="text"
                        value={rpa.artistName || ''}
                        onChange={(e) => {
                          const copy = [...tempRpa];
                          copy[idx].artistName = e.target.value;
                          setTempRpa(copy);
                        }}
                        placeholder="egz: Drill-509 Boy"
                        className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:border-yellow-400 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Badj / Label</label>
                        <input
                          type="text"
                          value={rpa.badgeText || ''}
                          onChange={(e) => {
                            const copy = [...tempRpa];
                            copy[idx].badgeText = e.target.value;
                            setTempRpa(copy);
                          }}
                          placeholder="egz: Pouse Semèn Sa"
                          className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-yellow-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tit / Slogan</label>
                        <input
                          type="text"
                          value={rpa.title || ''}
                          onChange={(e) => {
                            const copy = [...tempRpa];
                            copy[idx].title = e.target.value;
                            setTempRpa(copy);
                          }}
                          placeholder="egz: Prochèn Revelasyon"
                          className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-yellow-400 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Deskripsyon / Prezante Atis la</label>
                      <textarea
                        rows={2}
                        value={rpa.description || ''}
                        onChange={(e) => {
                          const copy = [...tempRpa];
                          copy[idx].description = e.target.value;
                          setTempRpa(copy);
                        }}
                        placeholder="Ekri kèk liy pou prezante talan an..."
                        className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl p-2 text-xs text-white focus:border-yellow-400 outline-none resize-none"
                      />
                    </div>

                    {/* YouTube Video Link Field */}
                    <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-red-400 flex items-center gap-1.5">
                          <Youtube className="w-3.5 h-3.5 text-red-500" />
                          <span>Lyen YouTube Videyo Atis la *</span>
                        </label>
                        {(rpa.youtubeUrl || rpa.socialLink) && (
                          <a
                            href={rpa.youtubeUrl || rpa.socialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-red-300 hover:text-white flex items-center gap-0.5 underline font-medium"
                          >
                            <span>Teste lyen</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        value={rpa.youtubeUrl || rpa.socialLink || ''}
                        onChange={(e) => {
                          const copy = [...tempRpa];
                          copy[idx].youtubeUrl = e.target.value;
                          copy[idx].socialLink = e.target.value;
                          setTempRpa(copy);
                        }}
                        placeholder="https://www.youtube.com/watch?v=... oswa https://youtu.be/..."
                        className="w-full bg-[#05070a] border border-red-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-red-400 outline-none font-mono placeholder:text-slate-600"
                      />
                      <p className="text-[9px] text-red-300/80">
                        ▶ Lè vizitè a klike sou RPA a oswa bouton YouTube la, li ap ouvri videyo sa dirèkteman sou YouTube.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 7: JERE PUBS (ADS) */}
      {activeTab === 'pubs' && (
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-400" />
                <span>Jere Espas Piblisite & Patnè (Pubs)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mete Imaj, GIF Anime, oswa Videyo MP4 (san son) pou piblisite ak patnè sou sit la.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newId = `pub-${Date.now()}`;
                  setTempPubs([
                    ...tempPubs,
                    {
                      id: newId,
                      title: 'Nouvo Piblisite',
                      description: 'Deskripsyon patnè a...',
                      imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
                      mediaUrl: '',
                      mediaType: 'image',
                      linkUrl: 'https://',
                      active: true,
                      sponsorName: 'Nouvo Patnè'
                    }
                  ]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.1] flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Ajoute yon Pub</span>
              </button>
              <button
                onClick={() => onSavePubs(tempPubs)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Anrejistre Tout Pubs</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {tempPubs.map((pub, idx) => {
              const currentMedia = pub.mediaUrl || pub.imageUrl || '';
              const isVideo = pub.mediaType === 'video' || currentMedia.endsWith('.mp4') || currentMedia.startsWith('data:video');
              const isGif = pub.mediaType === 'gif' || currentMedia.toLowerCase().includes('.gif');

              return (
                <div key={pub.id} className="bg-[#05070a]/90 border border-white/[0.1] rounded-2xl p-4 sm:p-5 space-y-4 backdrop-blur-md relative flex flex-col justify-between shadow-xl">
                  {/* Top Bar with Number, Active Toggle and Delete */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
                        Pub #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[130px]">
                        {pub.sponsorName || 'San Patnè'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={pub.active}
                          onChange={(e) => {
                            const copy = [...tempPubs];
                            copy[idx].active = e.target.checked;
                            setTempPubs(copy);
                          }}
                          className="accent-blue-500 w-3.5 h-3.5 rounded"
                        />
                        <span>{pub.active ? 'Aktif' : 'Dezaktive'}</span>
                      </label>

                      {tempPubs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = tempPubs.filter((_, i) => i !== idx);
                            setTempPubs(filtered);
                          }}
                          className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Efase Pub sa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Media Live Preview */}
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/[0.12] flex items-center justify-center group">
                      {isVideo ? (
                        <div className="relative w-full h-full">
                          <video
                            src={currentMedia}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] text-white flex items-center gap-1 font-semibold border border-white/10 z-10">
                            <VolumeX className="w-3 h-3 text-yellow-400" />
                            <span>MP4 San Son (Muted)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <img
                            src={currentMedia || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80'}
                            alt={pub.title}
                            className="w-full h-full object-cover"
                          />
                          {isGif && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-purple-600/80 backdrop-blur-sm text-[10px] text-white font-bold z-10">
                              GIF Anime
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sponsor tag overlay */}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-slate-200 text-[9px] font-bold uppercase tracking-wider border border-white/10 shadow z-10">
                        {pub.sponsorName || 'Patnè'}
                      </span>
                    </div>

                    {/* Media Type Selector */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0a0f1d] rounded-xl border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...tempPubs];
                          copy[idx].mediaType = 'image';
                          setTempPubs(copy);
                        }}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          pub.mediaType !== 'gif' && pub.mediaType !== 'video'
                            ? 'bg-blue-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Imaj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...tempPubs];
                          copy[idx].mediaType = 'gif';
                          setTempPubs(copy);
                        }}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          pub.mediaType === 'gif'
                            ? 'bg-purple-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Film className="w-3 h-3" />
                        <span>GIF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...tempPubs];
                          copy[idx].mediaType = 'video';
                          setTempPubs(copy);
                        }}
                        className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          pub.mediaType === 'video'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Video className="w-3 h-3" />
                        <span>MP4 Video</span>
                      </button>
                    </div>

                    {/* Media Upload & URL Inputs */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pub.mediaUrl || pub.imageUrl || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const copy = [...tempPubs];
                            const isV = val.endsWith('.mp4');
                            const isG = val.toLowerCase().includes('.gif');
                            copy[idx].mediaUrl = val;
                            copy[idx].imageUrl = val;
                            if (isV) copy[idx].mediaType = 'video';
                            else if (isG) copy[idx].mediaType = 'gif';
                            setTempPubs(copy);
                          }}
                          placeholder={
                            pub.mediaType === 'video'
                              ? 'URL Videyo MP4 (egz: https://.../pub.mp4)'
                              : pub.mediaType === 'gif'
                              ? 'URL GIF Anime (egz: https://.../pub.gif)'
                              : 'URL Imaj (JPG / PNG / WebP)'
                          }
                          className="flex-1 bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-400 placeholder:text-slate-500 font-mono"
                        />

                        {/* File Upload Button */}
                        <label
                          htmlFor={`pub-file-input-${idx}`}
                          className="px-2.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/[0.1] rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
                          title="Telechaje yon fichye Imaj, GIF oswa MP4 depi aparèy ou"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden sm:inline">Chwazi Fichye</span>
                        </label>
                        <input
                          id={`pub-file-input-${idx}`}
                          type="file"
                          accept="image/*,video/mp4,image/gif"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const isV = file.type.startsWith('video/') || file.name.endsWith('.mp4');
                              const isG = file.type === 'image/gif' || file.name.endsWith('.gif');
                              let dataUrl = '';
                              if (isV || isG) {
                                const reader = new FileReader();
                                dataUrl = await new Promise((res) => {
                                  reader.onload = (ev) => res(ev.target?.result as string);
                                  reader.readAsDataURL(file);
                                });
                              } else {
                                dataUrl = await compressAndReadFile(file, 800, 800, 0.72);
                              }
                              const copy = [...tempPubs];
                              copy[idx].mediaUrl = dataUrl;
                              copy[idx].imageUrl = isV ? 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80' : dataUrl;
                              copy[idx].mediaType = isV ? 'video' : isG ? 'gif' : 'image';
                              setTempPubs(copy);
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        💡 Videyo MP4 ap jwe san son (muted loop) pou li pa deranje lekti mizik la.
                      </p>
                    </div>
                  </div>

                  {/* Metadata Fields */}
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Non Patnè (Sponsor)</label>
                        <input
                          type="text"
                          value={pub.sponsorName || ''}
                          onChange={(e) => {
                            const copy = [...tempPubs];
                            copy[idx].sponsorName = e.target.value;
                            setTempPubs(copy);
                          }}
                          placeholder="egz: Moncash Haiti"
                          className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-blue-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tit Piblisite</label>
                        <input
                          type="text"
                          value={pub.title || ''}
                          onChange={(e) => {
                            const copy = [...tempPubs];
                            copy[idx].title = e.target.value;
                            setTempPubs(copy);
                          }}
                          placeholder="egz: Promo Ete 2026"
                          className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-blue-400 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Deskripsyon Piblisite</label>
                      <textarea
                        rows={2}
                        value={pub.description || ''}
                        onChange={(e) => {
                          const copy = [...tempPubs];
                          copy[idx].description = e.target.value;
                          setTempPubs(copy);
                        }}
                        placeholder="Deskripsyon òf oswa sèvis la..."
                        className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl p-2 text-xs text-white focus:border-blue-400 outline-none resize-none"
                      />
                    </div>

                    {/* Destination Link Field */}
                    <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          <span>Lyen Paj / Sit Patnè a *</span>
                        </label>
                        {pub.linkUrl && (
                          <a
                            href={pub.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-300 hover:text-white flex items-center gap-0.5 underline font-medium"
                          >
                            <span>Teste lyen</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        value={pub.linkUrl || ''}
                        onChange={(e) => {
                          const copy = [...tempPubs];
                          copy[idx].linkUrl = e.target.value;
                          setTempPubs(copy);
                        }}
                        placeholder="https://moncash.com oswa https://..."
                        className="w-full bg-[#05070a] border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-400 outline-none font-mono placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 8: ACHIV & RESET */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-4 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-red-400" />
                  <span>Reset Sipò & Achivaj Finansye</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Bouton sa pèmèt ou reset tout montan sipò yo a 0 chak 1ye nan mwa a apre peman. Tout done anvan reset la ap otomatikman sove nan Achiv.
                </p>
              </div>

              <button
                id="open-reset-confirm-btn"
                onClick={() => setShowResetConfirm(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-xl shadow-red-950/50 self-start sm:self-auto shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Sipò Mwa Sa a ($0)</span>
              </button>
            </div>
          </div>

          {/* Archive Records Table */}
          <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 space-y-4 backdrop-blur-xl">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-yellow-400" />
              <span>Istorik Achiv Peman Pase Yo ({archives.length})</span>
            </h4>

            {archives.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Poko gen okenn peryòd achive.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#05070a]/90 text-slate-400 uppercase text-[10px] font-bold border-b border-white/[0.08]">
                    <tr>
                      <th className="px-4 py-3">Peryòd Achiv</th>
                      <th className="px-4 py-3">Atis</th>
                      <th className="px-4 py-3">Mizik</th>
                      <th className="px-4 py-3 text-yellow-400">Total Donasyon ($ / HTG)</th>
                      <th className="px-4 py-3 text-emerald-400">Pati Atis (85%)</th>
                      <th className="px-4 py-3 text-blue-400">Pati Platfòm (15%)</th>
                      <th className="px-4 py-3">Dat Reset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {archives.map((arch) => (
                      <tr key={arch.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-yellow-400">{arch.period}</td>
                        <td className="px-4 py-3 font-semibold text-white">{arch.artistName}</td>
                        <td className="px-4 py-3">{arch.musicTitle}</td>
                        <td className="px-4 py-3">
                          {renderDualAmount(arch.totalDonations, { colorUsd: 'font-mono font-bold text-yellow-400 text-xs', colorHtg: 'text-yellow-400/80' })}
                        </td>
                        <td className="px-4 py-3">
                          {renderDualAmount(arch.artistShare, { colorUsd: 'font-mono font-bold text-emerald-400 text-xs', colorHtg: 'text-emerald-400/80', boldHtg: true })}
                        </td>
                        <td className="px-4 py-3">
                          {renderDualAmount(arch.platformShare, { colorUsd: 'font-mono font-bold text-blue-400 text-xs', colorHtg: 'text-blue-400/80' })}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[10px] font-mono">{arch.resetDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: PALMARÈS & TWOFÈ FIZIK (HALL OF FAME) */}
      {activeTab === 'awards' && (
        <PalmaresTrophiesDashboard
          artists={artists}
          musicList={musicList}
          donations={donations}
          exchangeRate={exchangeRate}
          currentAdminName={currentAdmin?.name || 'Clauvens Venso'}
        />
      )}

      {/* VIEW: KONFIGIRASYON MWAYEN PEMAN & NIMEWO */}
      {activeTab === 'payment_settings' && (
        <PaymentSettingsTab
          onExchangeRateUpdated={(newRate) => setExchangeRate(newRate)}
        />
      )}

      {/* VIEW: SANT SEKIRITE SANTAL & ALÈT ENTRIZYON */}
      {activeTab === 'security_logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-red-950/60 via-[#0a0f1d] to-amber-950/40 border border-red-500/30 rounded-2xl p-4 shadow-lg shadow-red-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Espas Sekirite & Alèt Entrizyon</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    Deboke ak Kòd
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Ou gen aksè konplè nan jounal sekirite, deteksyon entrizyon ak kle mèt sistèm nan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSecurityUnlocked(false);
                setActiveTab('reports');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/[0.1] hover:border-red-500/40 flex items-center justify-center gap-2 transition-all shrink-0"
              title="Fèmen epi re-bloke aksè sekirite a"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Re-bloke Espas la</span>
            </button>
          </div>

          <AdminSecurityTab />
        </div>
      )}

      {/* PROOF IMAGE MODAL VIEWER */}
      {(proofModalInfo || proofModalUrl) && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-2xl animate-fadeIn p-2 sm:p-4"
          onClick={() => {
            setProofModalInfo(null);
            setProofModalUrl(null);
            setProofZoom(1);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div
              className="relative max-w-3xl w-full bg-[#0a0f1d]/95 border border-white/[0.15] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-4 max-h-[92dvh] overflow-y-auto flex flex-col justify-between my-auto"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {proofModalInfo?.title || 'Foto Prèv Transfè'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Konfime tout enfòmasyon sou resi a anvan validasyon.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Button */}
                <a
                  href={proofModalInfo?.url || proofModalUrl || '#'}
                  download="upmizik-prev.png"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 hover:text-white transition-colors border border-white/[0.08] flex items-center gap-1.5 text-xs font-semibold"
                  title="Telechaje foto sa a"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Telechaje</span>
                </a>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setProofModalInfo(null);
                    setProofModalUrl(null);
                    setProofZoom(1);
                  }}
                  className="p-2 rounded-xl bg-white/[0.08] text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-white/[0.08] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Metadata Summary Banner if available */}
            {proofModalInfo && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-[#05070a] border border-white/[0.08] text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Non:</span>
                  <span className="font-bold text-white truncate block">
                    {proofModalInfo.donorOrArtistName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Montan:</span>
                  <span className="font-bold text-yellow-400 font-mono block">
                    {proofModalInfo.amount || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Telefòn:</span>
                  <span className="font-medium text-slate-200 block">
                    {proofModalInfo.phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dat:</span>
                  <span className="font-medium text-slate-400 block text-[11px]">
                    {proofModalInfo.date || 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {/* Image Canvas with Zoom Control */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] bg-black/80 flex-1 min-h-[260px] max-h-[50vh] sm:max-h-[58vh] flex items-center justify-center p-2">
              <div
                className="transition-transform duration-200 max-w-full max-h-full flex items-center justify-center overflow-auto"
                style={{ transform: `scale(${proofZoom})` }}
              >
                <img
                  src={proofModalInfo?.url || proofModalUrl || ''}
                  alt="Prèv konfime"
                  className="max-w-full max-h-[46vh] sm:max-h-[54vh] object-contain rounded-lg shadow-2xl select-none"
                />
              </div>

              {/* Floating Zoom Controls */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/[0.12] shadow-xl">
                <button
                  type="button"
                  onClick={() => setProofZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-white/[0.12] text-slate-200 transition-colors"
                  title="Diminye Gwosè (Zoom Out)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono font-bold text-yellow-400 px-1.5 select-none">
                  {Math.round(proofZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setProofZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-white/[0.12] text-slate-200 transition-colors"
                  title="Ogmante Gwosè (Zoom In)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {proofZoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setProofZoom(1)}
                    className="text-[10px] font-bold text-slate-300 hover:text-white px-2 py-1 bg-white/[0.08] rounded-lg ml-0.5"
                  >
                    100%
                  </button>
                )}
              </div>
            </div>

            {/* Footer Notice */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Foto sa a rete anrejistre nan baz done dashboard admin an pou tout tan.</span>
              </span>
              <button
                onClick={() => {
                  setProofModalInfo(null);
                  setProofModalUrl(null);
                  setProofZoom(1);
                }}
                className="px-4 py-1.5 rounded-xl font-bold bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs transition-colors"
              >
                Fèmen
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowResetConfirm(false);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div
              className="relative max-w-md w-full bg-[#0a0f1d]/95 border border-red-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Èske w sèten w vle reset tout sipò yo?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Tout done sipò aktyèl yo (<strong className="text-yellow-400 font-mono">${totalGrossDonations.toFixed(2)} USD • ~{Math.round(toHtg(totalGrossDonations)).toLocaleString()} HTG</strong>) pral sove nan <strong>Achiv</strong> epi tout kontè mizik yo pral retounen a <strong>$0.00 (0 HTG)</strong> pou nouvo mwa a.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Non Peryòd Achiv la:</label>
              <input
                type="text"
                value={resetPeriodInput ?? ''}
                onChange={(e) => setResetPeriodInput(e.target.value)}
                placeholder="egz: Out 2026"
                className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]"
              >
                Anile
              </button>
              <button
                onClick={() => {
                  onResetMonthlyDonations(resetPeriodInput.trim() || undefined);
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50"
              >
                Konfime Reset la
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ARTIST REJECTION REASON MODAL */}
      {artistRejectTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setArtistRejectTarget(null);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div
              className="relative max-w-md w-full bg-[#0a0f1d]/95 border border-red-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <X className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Refize Enskripsyon Atis la</h3>
              <p className="text-xs text-slate-300 mt-1">
                Atis: <strong className="text-yellow-300">{artistRejectTarget.stageName}</strong> ({artistRejectTarget.email})
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Yon imèl notifikasyon ap voye otomatikman sou imèl atis la ak rezon an pou mande l re-telechaje yon prèv valab.
              </p>
            </div>

            {/* Quick reason presets */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300">Chwazi oswa modifye rezon an:</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setArtistRejectReason('Foto prèv transfè a pa klè oswa nimewo referans lan pa kowenside.')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                >
                  Foto pa klè
                </button>
                <button
                  type="button"
                  onClick={() => setArtistRejectReason('Montan 723.55 Goud ($4.99 USD) la pa koresponn ak transfè ki fèt la.')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                >
                  Montan pa kòrèk
                </button>
                <button
                  type="button"
                  onClick={() => setArtistRejectReason('Nimewo tranzaksyon MonCash/NatCash la pa egziste nan sistèm nou.')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                >
                  Referans pa valid
                </button>
              </div>

              <textarea
                rows={3}
                value={artistRejectReason || ''}
                onChange={(e) => setArtistRejectReason(e.target.value)}
                className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 leading-relaxed resize-none"
                placeholder="Mete rezon rejè a pou atis la..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setArtistRejectTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]"
              >
                Anile
              </button>
              <button
                type="button"
                onClick={() => {
                  if (artistRejectTarget) {
                    handleOptimisticValidateArtist(artistRejectTarget.id, false, artistRejectReason.trim() || undefined);
                    setArtistRejectTarget(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50"
              >
                Konfime & Voye Imèl
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Split Sheet / Credits Inspector Modal (With Percentages) */}
      {previewingCreditsSong && (
        <SongCreditsModal
          song={previewingCreditsSong}
          showPercentages={true}
          onClose={() => setPreviewingCreditsSong(null)}
        />
      )}

      {/* ARTIST SUSPENSION MODAL */}
      {suspendingArtistTarget && (() => {
        const effectiveDays = customSuspensionDays.trim() !== ''
          ? Math.max(1, parseInt(customSuspensionDays) || 15)
          : suspensionDaysOption;
        
        const previewEndDate = new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000);
        let formattedPreviewEndDate = '';
        try {
          formattedPreviewEndDate = previewEndDate.toLocaleDateString('ht-HT', {
            dateStyle: 'full'
          });
        } catch {
          formattedPreviewEndDate = previewEndDate.toDateString();
        }

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSuspendingArtistTarget(null);
            }}
          >
            <div className="min-h-full flex items-center justify-center py-4">
              <div
                className="relative max-w-lg w-full bg-[#0a0f1d]/95 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                    <Ban className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Mete Atis la an Sispansyon Aktivite</h3>
                    <p className="text-xs text-slate-300">
                      Atis: <strong className="text-yellow-400">{suspendingArtistTarget.stageName}</strong> ({suspendingArtistTarget.name})
                    </p>
                  </div>
                </div>

                {/* Duration Picker */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-200">
                    Chwazi kantite jou sispansyon an:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[15, 30, 45, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setSuspensionDaysOption(d);
                          setCustomSuspensionDays('');
                        }}
                        className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all ${
                          suspensionDaysOption === d && customSuspensionDays === ''
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 scale-105'
                            : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] border border-white/[0.08]'
                        }`}
                      >
                        {d} Jou
                      </button>
                    ))}
                  </div>

                  {/* Custom Days Input */}
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Oubyen pèsonalize:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="Ex: 20"
                        value={customSuspensionDays ?? ''}
                        onChange={(e) => setCustomSuspensionDays(e.target.value)}
                        className="w-20 bg-[#05070a] border border-white/[0.12] focus:border-amber-400 rounded-xl px-3 py-1 text-xs text-amber-300 font-mono font-bold outline-none"
                      />
                      <span className="text-xs text-slate-400">jou</span>
                    </div>
                  </div>
                </div>

                {/* Live End Date Preview */}
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Dire Sispansyon: {effectiveDays} Jou</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 pl-6">
                    Sispansyon an ap fini otomatikman nan dat: <strong className="text-white">{formattedPreviewEndDate}</strong>.
                  </p>
                </div>

                {/* Reason Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-200">
                    Rezon ofisyèl pou sispansyon an (ap voye bay atis la):
                  </label>

                  {/* Quick Reason Suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSuspensionReasonInput('Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                    >
                      Vyolasyon règ
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuspensionReasonInput('Plent sou dwadotè oswa kontni mizikal san otorizasyon')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                    >
                      Dwadotè
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuspensionReasonInput('Enfòmasyon ki pa kòrèk sou pwofil la oswa konpòtman ki pa konfòm')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                    >
                      Enfòmasyon enkòrèk
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuspensionReasonInput('Aktivite sispèk oswa fwod sou tranzaksyon donasyon')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                    >
                      Aktivite sispèk
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={suspensionReasonInput ?? ''}
                    onChange={(e) => setSuspensionReasonInput(e.target.value)}
                    className="w-full bg-[#05070a] border border-white/[0.12] focus:border-amber-400 rounded-xl p-3 text-xs text-white outline-none resize-none leading-relaxed"
                    placeholder="Tape rezon sispansyon an..."
                  />
                </div>

                {/* Important Notice */}
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ⚠️ <em>Nòt:</em> Yon imèl notifikasyon ap voye otomatikman sou kont atis la, epi espas atis li a ap montre yon banyè avètisman ki endike kantite jou ki rete nan sispansyon an. Tout aksyon ajoute mizik ak modifikasyon ap rete bloke pandan peryòd la.
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSuspendingArtistTarget(null)}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]"
                  >
                    Anile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (suspendingArtistTarget) {
                        if (onSuspendArtist) {
                          onSuspendArtist(
                            suspendingArtistTarget.id,
                            effectiveDays,
                            suspensionReasonInput.trim() || undefined
                          );
                        } else {
                          StorageService.suspendArtist(
                            suspendingArtistTarget.id,
                            effectiveDays,
                            suspensionReasonInput.trim() || undefined,
                            currentAdmin?.name || 'Mr Clauvens'
                          );
                        }
                        setSuspendingArtistTarget(null);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Konfime Sispansyon ({effectiveDays} Jou)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ARTIST DELETION CONFIRMATION MODAL */}
      {deletingArtistTarget && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingArtistTarget(null);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div
              className="relative max-w-md w-full bg-[#0a0f1d]/95 border border-red-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-black text-white">Siprime Kont Atis la sou Sit la</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Èske w sèten ou vle efase kont atis <strong className="text-yellow-400">{deletingArtistTarget.stageName}</strong> ({deletingArtistTarget.name}) nèt sou UpMizik?
                </p>
              </div>

              {/* Option to delete music or keep */}
              <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-3.5 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteArtistSongsOption}
                    onChange={(e) => setDeleteArtistSongsOption(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 text-red-500 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-200">
                    Siprime tou tout moso mizik atis sa a te pibliye sou platfòm nan.
                  </span>
                </label>
              </div>

              <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/30 rounded-xl p-3">
                ⚠️ <strong>Atansyon:</strong> Aksyon sa a se yon sipresyon definitif ki retire kont lan ak tout enfòmasyon li yo sou sistèm UpMizik la.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingArtistTarget(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]"
                >
                  Anile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deletingArtistTarget) {
                      if (onDeleteArtist) {
                        onDeleteArtist(deletingArtistTarget.id, deleteArtistSongsOption);
                      } else {
                        StorageService.deleteArtist(deletingArtistTarget.id, deleteArtistSongsOption);
                      }
                      setDeletingArtistTarget(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Konfime Sipresyon</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARTIST PAYOUT CONFIRMATION & AUTOMATED NOTIFICATION MODAL */}
      {payingArtistTarget && (() => {
        const art = payingArtistTarget;
        const artistStat = artistsEarningStats.find((s) => s.artist.id === art.id);
        const calculatedNet = artistStat ? artistStat.artistNetUsd : (art.paidAmountThisMonth || 0);
        const calculatedGross = artistStat ? artistStat.totalGross : 0;
        const finalAmt = Number(payingAmountUsd) || 0;
        const finalAmtHtg = Math.round(finalAmt * exchangeRate);
        const effectiveRef = payingReferenceInput.trim() || `UPM-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
        const adminName = currentAdmin?.name || 'Mr Clauvens';
        const artistEmail = art.email || `${art.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`;

        const notificationSubject = `💰 Konfimasyon Peman: $${finalAmt.toFixed(2)} USD voye sou kont ou! (Ref: #${effectiveRef})`;
        const notificationSmsText = `Bonjou ${art.stageName}, administrasyon UpMizik la (${adminName}) konfime peman redevans mizik ou yo:\n• Montan Nèt: $${finalAmt.toFixed(2)} USD (~${finalAmtHtg.toLocaleString()} HTG)\n• Mwayen: ${payingMethodInput}\n• Nimewo Resevwa: ${art.phone || 'N/A'}\n• Referans: #${effectiveRef}\n• Estati: PEYE (✅)\n${payingNotesInput.trim() ? `• Nòt: ${payingNotesInput.trim()}\n` : ''}Notifikasyon ofisyèl la disponib tou nan Bwat Mesaj kont atis ou sou upmizik.com!`;

        // Clean phone for WhatsApp
        const rawPhone = (art.phone || '').replace(/\D/g, '');
        const formattedWaPhone = rawPhone.startsWith('509') ? rawPhone : (rawPhone ? `509${rawPhone}` : '');

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPayingArtistTarget(null);
            }}
          >
            <div className="min-h-full flex items-center justify-center py-4">
              <div
                className="relative max-w-2xl w-full bg-[#0a0f1d]/95 border border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>Egzekite Peman & Notifikasyon</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Mwa An Kou
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Valide transfè lajan redevans atis la epi voye notifikasyon otomatik nan bwat mesaj li.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPayingArtistTarget(null)}
                    className="p-2 rounded-xl bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.1] transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Artist Profile Card */}
                <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={art.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80'}
                      alt={art.stageName}
                      className="w-13 h-13 rounded-2xl object-cover border border-white/[0.12] bg-[#0a0f1d] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white truncate">{art.stageName}</h4>
                        <span className="text-xs text-slate-400 truncate">({art.name})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-yellow-400" />
                          <strong className="text-yellow-400 font-mono">{art.phone || 'N/A'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-slate-300 font-mono text-[11px] truncate max-w-[180px]">{artistEmail}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 border-white/[0.08] pt-2 sm:pt-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kalkil Nèt Mwa sa a</span>
                    <span className="font-mono text-base sm:text-lg font-black text-emerald-400">
                      ${calculatedNet.toFixed(2)} USD
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      (Brut: ${calculatedGross.toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Montan pou Peye (USD)</span>
                      </span>
                      {calculatedNet > 0 && finalAmt !== calculatedNet && (
                        <button
                          type="button"
                          onClick={() => setPayingAmountUsd(calculatedNet)}
                          className="text-[10px] text-yellow-400 hover:underline font-semibold"
                        >
                          Mete Nèt la (${calculatedNet.toFixed(2)})
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payingAmountUsd ?? 0}
                        onChange={(e) => setPayingAmountUsd(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#05070a] border border-white/[0.12] focus:border-emerald-400 rounded-xl py-2.5 pl-8 pr-3 text-sm font-mono font-bold text-white outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-[11px] text-emerald-400/90 font-mono">
                      ≈ <strong>{finalAmtHtg.toLocaleString()} HTG</strong> <span className="text-slate-500 text-[10px]">(Taux: 1 USD = {exchangeRate} HTG)</span>
                    </p>
                  </div>

                  {/* Payment Method Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                      <span>Mwayen Peman</span>
                    </label>
                    <select
                      value={payingMethodInput ?? 'MonCash'}
                      onChange={(e) => setPayingMethodInput(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/[0.12] focus:border-purple-400 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="MonCash">MonCash (Digicel)</option>
                      <option value="Natcash">Natcash (Natcom)</option>
                      <option value="Transfè Labank (SOGEBANK)">Transfè Labank (SOGEBANK)</option>
                      <option value="Transfè Labank (UNIBANK)">Transfè Labank (UNIBANK)</option>
                      <option value="Transfè Labank (BUH / BNC)">Transfè Labank (BUH / BNC)</option>
                      <option value="Western Union / Remitly / Zelle">Western Union / Remitly / Zelle</option>
                      <option value="Lòt Mwayen">Lòt Mwayen</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Chwazi kanal ou itilize pou fè transfè a bay atis la.
                    </p>
                  </div>

                  {/* Reference Number Field */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Nimewo Referans Tranzaksyon</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setPayingReferenceInput(`UPM-PAY-${Math.floor(100000 + Math.random() * 900000)}`)}
                        className="text-[10px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-semibold"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Rejenere Kòd</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={payingReferenceInput ?? ''}
                      onChange={(e) => setPayingReferenceInput(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/[0.12] focus:border-yellow-400 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-yellow-400 outline-none"
                      placeholder="Egzanp: UPM-PAY-982103 oswa nimewo tranzaksyon MonCash"
                    />
                  </div>

                  {/* Notes Field */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Nòt oswa Mesaj Pèsonalize (Opsyonèl)</span>
                    </label>
                    <input
                      type="text"
                      value={payingNotesInput ?? ''}
                      onChange={(e) => setPayingNotesInput(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/[0.12] focus:border-slate-400 rounded-xl py-2.5 px-3 text-xs text-white outline-none"
                      placeholder="Egzanp: Felisitasyon pou bèl pèfòmans mizik ou yo mwa sa a!"
                    />
                  </div>
                </div>

                {/* AUTOMATED NOTIFICATION BOX & LIVE PREVIEW */}
                <div className="bg-gradient-to-br from-[#0c1322] to-[#080d18] border border-emerald-500/30 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payingSendNotification}
                        onChange={(e) => setPayingSendNotification(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Voye notifikasyon otomatik nan Bwat Mesaj Atis la (Inbox)</span>
                      </span>
                    </label>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      Otomatik
                    </span>
                  </div>

                  {payingSendNotification && (
                    <div className="space-y-2.5 bg-[#05070a] border border-white/[0.08] rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 block">Sijè Notifikasyon an:</span>
                          <p className="text-xs font-bold text-emerald-400 truncate">{notificationSubject}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">Soti nan: {adminName}</span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 font-sans leading-relaxed">
                        <p>
                          👤 <strong>Destinatè:</strong> {art.stageName} ({artistEmail})
                        </p>
                        <p>
                          💵 <strong>Montan Peye:</strong> ${finalAmt.toFixed(2)} USD (~{finalAmtHtg.toLocaleString()} HTG) atravè {payingMethodInput}
                        </p>
                        <p>
                          🏷️ <strong>Referans Tranzaksyon:</strong> #{effectiveRef}
                        </p>
                        {payingNotesInput.trim() && (
                          <p className="italic text-yellow-300/90">
                            📝 <strong>Nòt Administrasyon:</strong> "{payingNotesInput.trim()}"
                          </p>
                        )}
                      </div>

                      {/* Share / Copy quick buttons */}
                      <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(notificationSmsText);
                            setPayingNotificationCopied(true);
                            setTimeout(() => setPayingNotificationCopied(false), 3000);
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08] flex items-center gap-1.5 transition-all"
                        >
                          {payingNotificationCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Kopye nan Papye-Kòlye!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Kopye Mesaj WhatsApp / SMS</span>
                            </>
                          )}
                        </button>

                        {formattedWaPhone && (
                          <a
                            href={`https://wa.me/${formattedWaPhone}?text=${encodeURIComponent(notificationSmsText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Voye sou WhatsApp ({art.phone})</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayingArtistTarget(null)}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]"
                  >
                    Anile
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayArtist}
                    className="flex-1 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Konfime Peman & Voye Notifikasyon (✅)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: DETAY LIS MIZIK KI BAY ATIS LA KOB LA */}
      {selectedArtistForSongBreakdown && (() => {
        const art = selectedArtistForSongBreakdown;
        const artistStat = artistsEarningStats.find((s) => s.artist.id === art.id);
        const artistSongs = artistStat ? artistStat.artistSongs : musicList.filter((m) => m.artistId === art.id || m.collab?.artistId === art.id);
        const totalGross = artistStat ? artistStat.totalGross : 0;
        const totalPlatformFee = artistStat ? artistStat.platformFeeUsd : 0;
        const totalNet = artistStat ? artistStat.artistNetUsd : 0;

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedArtistForSongBreakdown(null);
            }}
          >
            <div className="min-h-full flex items-center justify-center py-4">
              <div
                className="relative max-w-3xl w-full bg-[#0a0f1d]/95 border border-yellow-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 backdrop-blur-2xl my-auto max-h-[92dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={art.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80'}
                      alt={art.stageName}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/[0.12] bg-[#05070a] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-white">
                          {art.stageName}
                        </h3>
                        {art.status === 'suspended' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Sispann
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Vre Non: <strong className="text-slate-300">{art.name}</strong> • Telefòn: <strong className="text-yellow-400 font-mono">{art.phone || 'N/A'}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedArtistForSongBreakdown(null)}
                    className="p-2 rounded-xl bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.1] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Financial Summary Strip */}
                <div className="grid grid-cols-3 gap-2.5 bg-[#05070a] border border-white/[0.08] rounded-2xl p-3.5 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Brut</span>
                    <div className="font-mono text-sm sm:text-base font-bold text-white">
                      ${totalGross.toFixed(2)} USD
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">~{Math.round(toHtg(totalGross)).toLocaleString()} HTG</span>
                  </div>

                  <div className="space-y-0.5 border-x border-white/[0.08]">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Frè UpMizik (-15% + $0.99)</span>
                    <div className="font-mono text-sm sm:text-base font-bold text-purple-300">
                      -${totalPlatformFee.toFixed(2)} USD
                    </div>
                    <span className="text-[10px] text-purple-400/80 font-mono">~{Math.round(toHtg(totalPlatformFee)).toLocaleString()} HTG</span>
                  </div>

                  <div className="space-y-0.5 bg-emerald-950/40 rounded-xl py-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Peman Nèt Atis</span>
                    <div className="font-mono text-sm sm:text-base font-black text-emerald-400">
                      ${totalNet.toFixed(2)} USD
                    </div>
                    <span className="text-[10px] text-emerald-300 font-mono">~{Math.round(toHtg(totalNet)).toLocaleString()} HTG</span>
                  </div>
                </div>

                {/* Song Breakdown List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Music className="w-4 h-4 text-yellow-400" />
                      <span>Lis Moso Mizik ki Bay Total Kòb la ({artistSongs.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Klase pa donasyon
                    </span>
                  </div>

                  {artistSongs.length === 0 ? (
                    <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-8 text-center text-xs text-slate-400">
                      Pa gen okenn mizik anrejistre pou atis sa a nan moman an.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                      {artistSongs
                        .sort((a, b) => (b.totalDonations || 0) - (a.totalDonations || 0))
                        .map((song, sIdx) => {
                          const songGross = song.totalDonations || 0;
                          const pctOfTotal = totalGross > 0 ? ((songGross / totalGross) * 100).toFixed(1) : '0';
                          const songPlatformFee = songGross > 0 ? (songGross * 0.15) + (totalGross > 0 ? 0.99 * (songGross / totalGross) : 0) : 0;
                          const songArtistNet = Math.max(0, songGross - songPlatformFee);
                          const isCollabTrack = song.collab && song.collab.artistId === art.id;

                          return (
                            <div
                              key={song.id}
                              className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-3 sm:p-4 hover:border-white/[0.16] transition-all space-y-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
                                    #{sIdx + 1}
                                  </span>

                                  <img
                                    src={song.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=80'}
                                    alt={song.title}
                                    className="w-11 h-11 rounded-xl object-cover border border-white/[0.1] shrink-0"
                                    referrerPolicy="no-referrer"
                                  />

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                                        {song.title}
                                      </h5>
                                      {song.feat && (
                                        <span className="text-[10px] text-yellow-400">
                                          (feat. {song.feat})
                                        </span>
                                      )}
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-white/[0.06] text-slate-300">
                                        {song.category || 'Mizik'}
                                      </span>
                                      {isCollabTrack && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                          {song.collab?.role || 'Featuring'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                      <span>🎧 {song.listens?.toLocaleString() || 0} ekout</span>
                                      <span>•</span>
                                      <span>Pozisyon: #{song.position || 'N/A'}</span>
                                      {song.albumName && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate">Albòm: {song.albumName}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Numbers */}
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-xs sm:text-sm font-black text-emerald-400">
                                    ${songArtistNet.toFixed(2)} USD
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Brut: ${songGross.toFixed(2)} ({pctOfTotal}%)
                                  </div>
                                </div>
                              </div>

                              {/* Progress bar of revenue contribution */}
                              {totalGross > 0 && (
                                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-yellow-400 to-emerald-400 h-full rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(2, parseFloat(pctOfTotal)))}%` }}
                                  />
                                </div>
                              )}

                              {/* Song credits / collaborators note if present */}
                              {song.credits && song.credits.length > 0 && (
                                <div className="text-[10px] text-slate-400 bg-white/[0.02] border border-white/[0.04] rounded-lg p-1.5 flex flex-wrap gap-x-3">
                                  {song.credits.map((c, cIdx) => (
                                    <span key={cIdx}>
                                      <strong>{c.role}:</strong> {c.name} {c.splitPercentage ? `(${c.splitPercentage}%)` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      const songLines = artistSongs.map((s, i) => `#${i + 1} ${s.title}: Brut $${(s.totalDonations || 0).toFixed(2)} USD | ${s.listens || 0} ekout`).join('\n');
                      const fullReport = `Rapò Mizik pou Atis ${art.stageName} (${art.name}):\nTelefòn MonCash: ${art.phone || 'N/A'}\nTotal Brut: $${totalGross.toFixed(2)} USD\nFrè UpMizik (-15% + $0.99): -$${totalPlatformFee.toFixed(2)} USD\nPeman Nèt Atis: $${totalNet.toFixed(2)} USD (~${Math.round(toHtg(totalNet)).toLocaleString()} HTG)\n\nDetay Mizik yo:\n${songLines}`;
                      navigator.clipboard.writeText(fullReport);
                      alert('Tout detay mizik atis sa a kopye nan papye-kolye w avèk siksè!');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-200 hover:text-white hover:bg-white/[0.1] border border-white/[0.08] flex items-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopye Rapò Mizik yo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedArtistForSongBreakdown(null)}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-lg shadow-yellow-400/20 transition-all"
                  >
                    Fèmen
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECURITY AUTHENTICATION CODE PROMPT MODAL */}
      {showSecurityAuthModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-xl animate-fadeIn p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSecurityAuthModal(false);
              setSecurityAuthError('');
            }
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div
              className="relative max-w-md w-full bg-[#0a0f1d]/95 border border-red-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 backdrop-blur-2xl my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/30 via-amber-500/20 to-red-600/30 border border-red-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-red-500/20">
                    <KeyRound className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-red-600 rounded-full border-2 border-[#0a0f1d] text-white shadow-md">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Title & Explanations */}
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-black text-white tracking-wide">
                  Aksè Sekirite & Alèt Entrizyon
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Espas sa a pwoteje. Antre kòd sekirite admin an pou debloke aksè nan sant alèt sekirite ak jounal entrizyon yo:
                </p>
              </div>

              {/* Form Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (securityAuthCodeInput.trim() === 'error404$') {
                    setIsSecurityUnlocked(true);
                    setActiveTab('security_logs');
                    setShowSecurityAuthModal(false);
                    setSecurityAuthError('');
                  } else {
                    setSecurityAuthError('Kòd sekirite a enkòrèk! Ou pa gen otorizasyon pou louvri espas sa a.');
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kòd Otorizasyon Admin:</span>
                  </label>

                  <div className="relative">
                    <input
                      type={showSecurityAuthPassword ? 'text' : 'password'}
                      autoFocus
                      value={securityAuthCodeInput ?? ''}
                      onChange={(e) => {
                        setSecurityAuthCodeInput(e.target.value);
                        if (securityAuthError) setSecurityAuthError('');
                      }}
                      placeholder="Tape kòd la..."
                      className={`w-full bg-[#05070a] border rounded-xl py-3 pl-4 pr-11 text-sm font-mono text-white outline-none transition-all ${
                        securityAuthError
                          ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500'
                          : 'border-white/[0.15] focus:border-amber-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecurityAuthPassword(!showSecurityAuthPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showSecurityAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {securityAuthError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs animate-shake">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{securityAuthError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecurityAuthModal(false);
                      setSecurityAuthError('');
                    }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] transition-all"
                  >
                    Anile
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Deboke Aksè</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* THRESHOLD CONFIGURATION MODAL (Konfigirasyon Papòt Alèt Peman Atis) */}
      {showThresholdConfigModal && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0a0f1d] border border-amber-500/40 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl shadow-amber-950/40 animate-scaleUp">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-950/70 via-red-950/40 to-[#0a0f1d] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Papòt Alèt Peman Atis</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                      Sekirite Fon
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defini montan minimòm ki dwe deklanche avètisman vizyèl la.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThresholdConfigModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Kijan alèt la fonksyone?</span>
                </div>
                <p>
                  Depi total kòb nèt tout atis ki poko peye yo (MonCash/Natcash) depase montan papòt sa a, panèl admin an ap afiche yon banyè avètisman klè ak yon anpoul wouj sou onglet la pou w pa janm bliye voye peman yo.
                </p>
              </div>

              {/* Current Status Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Kòb k ap Tann Kounye a</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    ${payoutAggregateTotals.totalUnpaidNetUsd.toFixed(2)} <span className="text-xs font-sans text-amber-200">USD</span>
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono">
                    ~{payoutAggregateTotals.totalUnpaidNetHtg.toLocaleString()} HTG ({payoutAggregateTotals.unpaidCount} atis)
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Papòt Aktyèl</span>
                  <span className="text-lg font-black text-white font-mono">
                    ${payoutAlertThreshold} <span className="text-xs font-sans text-slate-300">USD</span>
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono">
                    ~{Math.round(payoutAlertThreshold * exchangeRate).toLocaleString()} HTG
                  </span>
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Chwazi yon papòt rapid:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[20, 50, 100, 200, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCustomThresholdInput(String(preset));
                        handleUpdatePayoutThreshold(preset);
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all text-center ${
                        payoutAlertThreshold === preset
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-400'
                          : 'bg-[#05070a] text-slate-300 hover:bg-white/[0.08] border border-white/[0.08]'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Number Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Oubyen mete yon montan pèsonalize ($ USD):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-yellow-400 font-mono">$</span>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={customThresholdInput}
                    onChange={(e) => setCustomThresholdInput(e.target.value)}
                    placeholder="Mete montan..."
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl py-3 pl-8 pr-16 text-sm font-mono text-white outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    USD
                  </span>
                </div>
                {Number(customThresholdInput) > 0 && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    Egal ak apeprè <strong>{Math.round(Number(customThresholdInput) * exchangeRate).toLocaleString()} HTG</strong> (Taux: 1 USD = {exchangeRate} HTG)
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/40 border-t border-white/[0.08] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowThresholdConfigModal(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] transition-all"
              >
                Fèmen
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = Number(customThresholdInput);
                  if (val > 0) {
                    handleUpdatePayoutThreshold(val);
                    setIsPayoutAlertDismissed(false); // Reset dismissal so alert triggers if needed
                    setShowThresholdConfigModal(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Anrejistre Papòt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED ARTIST DOSSIER & VERIFICATION MODAL */}
      {selectedArtistDossier && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0a0f1d] border border-white/[0.15] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl my-8 animate-scaleUp">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-950/60 via-[#0a0f1d] to-[#05070a] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/[0.15] shrink-0">
                  <img
                    src={selectedArtistDossier.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80'}
                    alt={selectedArtistDossier.stageName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{selectedArtistDossier.stageName}</span>
                    <span className="text-xs text-slate-400 font-normal">({selectedArtistDossier.name})</span>
                  </h3>
                  <p className="text-xs text-amber-300 font-mono">
                    Dosye Enskripsyon & Validasyon Frè $4.99 USD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArtistDossier(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Payment Proof Banner */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedArtistDossier.registrationProofUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setProofModalInfo({
                          url: selectedArtistDossier.registrationProofUrl!,
                          title: `Prèv Peman Frè Enskripsyon Atis ($4.99 USD • 723.55 HTG)`,
                          donorOrArtistName: `${selectedArtistDossier.stageName} (${selectedArtistDossier.name})`,
                          phone: selectedArtistDossier.phone,
                          amount: '$4.99 USD (~723.55 HTG)',
                          musicTitle: `Enskripsyon Kont Atis • Vil: ${selectedArtistDossier.city}`,
                          date: selectedArtistDossier.registrationDate,
                          type: 'artist_fee'
                        });
                        setProofZoom(1);
                      }}
                      className="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-400 bg-black shrink-0 relative group"
                      title="Klike pou wè foto a an gwo"
                    >
                      <img
                        src={selectedArtistDossier.registrationProofUrl}
                        alt="Prèv $4.99"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-500 text-[10px]">
                      San Prèv
                    </div>
                  )}
                  <div>
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Frè Enskripsyon $4.99 USD</span>
                      <span className="text-xs font-mono text-amber-300">~{Math.round(4.99 * exchangeRate).toLocaleString()} HTG</span>
                    </h5>
                    <p className="text-xs text-slate-400">
                      Peman transfè sou MonCash / Natcash pou louvri kont atis la.
                    </p>
                  </div>
                </div>

                {selectedArtistDossier.registrationProofUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setProofModalInfo({
                        url: selectedArtistDossier.registrationProofUrl!,
                        title: `Prèv Peman Frè Enskripsyon Atis ($4.99 USD • 723.55 HTG)`,
                        donorOrArtistName: `${selectedArtistDossier.stageName} (${selectedArtistDossier.name})`,
                        phone: selectedArtistDossier.phone,
                        amount: '$4.99 USD (~723.55 HTG)',
                        musicTitle: `Enskripsyon Kont Atis • Vil: ${selectedArtistDossier.city}`,
                        date: selectedArtistDossier.registrationDate,
                        type: 'artist_fee'
                      });
                      setProofZoom(1);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ouvri Prèv HD</span>
                  </button>
                )}
              </div>

              {/* Identity & Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Telefòn MonCash / Natcash</span>
                  <div className="flex items-center justify-between text-sm font-mono text-amber-300 font-bold">
                    <span>{selectedArtistDossier.phone || 'Non espesifye'}</span>
                    {selectedArtistDossier.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedArtistDossier.phone);
                          setCopiedValidationFieldId('modal-phone');
                          setTimeout(() => setCopiedValidationFieldId(null), 2000);
                        }}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {copiedValidationFieldId === 'modal-phone' ? 'Kopye!' : 'Kopye'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Adrès Imèl</span>
                  <div className="flex items-center justify-between text-sm font-mono text-blue-300 font-bold">
                    <span className="truncate">{selectedArtistDossier.email || 'Non espesifye'}</span>
                    {selectedArtistDossier.email && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedArtistDossier.email);
                          setCopiedValidationFieldId('modal-email');
                          setTimeout(() => setCopiedValidationFieldId(null), 2000);
                        }}
                        className="text-xs text-slate-400 hover:text-white shrink-0 ml-2"
                      >
                        {copiedValidationFieldId === 'modal-email' ? 'Kopye!' : 'Kopye'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vil Rezidans</span>
                  <p className="text-sm font-semibold text-white">📍 {selectedArtistDossier.city || 'Ayiti'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kòd Sekirite PIN</span>
                  <p className="text-sm font-mono text-yellow-400 font-bold">{selectedArtistDossier.pin || '****'}</p>
                </div>
              </div>

              {/* Musical Heritage & Cultural Profile */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Idantite Mizikal & Kiltirèl</span>
                </h4>

                {selectedArtistDossier.musicalRoots && (
                  <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Rasin Mizikal & Estil Debaz</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedArtistDossier.musicalRoots}</p>
                  </div>
                )}

                {selectedArtistDossier.musicalInfluences && (
                  <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Enfliyans & Modèl</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedArtistDossier.musicalInfluences}</p>
                  </div>
                )}

                {selectedArtistDossier.artisticVision && (
                  <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Vizyon Atistik</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedArtistDossier.artisticVision}</p>
                  </div>
                )}

                {selectedArtistDossier.artistQuote && (
                  <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Deviz Pèsonèl</span>
                    <p className="text-xs text-slate-300 italic font-serif leading-relaxed">"{selectedArtistDossier.artistQuote}"</p>
                  </div>
                )}

                {selectedArtistDossier.bio && (
                  <div className="p-3.5 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Biyografi Konplè</span>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedArtistDossier.bio}</p>
                  </div>
                )}
              </div>

              {/* Social Presence */}
              {(selectedArtistDossier.instagramHandle || selectedArtistDossier.tiktokHandle || selectedArtistDossier.twitterHandle) && (
                <div className="p-4 rounded-2xl bg-[#05070a] border border-white/[0.08] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rezo Sosyal</span>
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    {selectedArtistDossier.instagramHandle && (
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20 font-mono">
                        IG: {selectedArtistDossier.instagramHandle}
                      </span>
                    )}
                    {selectedArtistDossier.tiktokHandle && (
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                        TikTok: {selectedArtistDossier.tiktokHandle}
                      </span>
                    )}
                    {selectedArtistDossier.twitterHandle && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                        X: {selectedArtistDossier.twitterHandle}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 bg-black/40 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedArtistDossier(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-all"
              >
                Fèmen
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `DOSYE ATIS UPMIZIK\nNon Atis: ${selectedArtistDossier.stageName} (${selectedArtistDossier.name})\nVil: ${selectedArtistDossier.city}\nTelefòn: ${selectedArtistDossier.phone}\nImèl: ${selectedArtistDossier.email}\nRasin: ${selectedArtistDossier.musicalRoots || 'N/A'}\nEnfliyans: ${selectedArtistDossier.musicalInfluences || 'N/A'}\nVizyon: ${selectedArtistDossier.artisticVision || 'N/A'}`;
                    navigator.clipboard.writeText(text);
                    alert('Dosye a kopye nan presse-papiers ou!');
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.08] text-white hover:bg-white/[0.12] transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopye Dosye</span>
                </button>

                {selectedArtistDossier.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedArtistDossier;
                      setSelectedArtistDossier(null);
                      setArtistRejectTarget(target);
                      setArtistRejectReason('Foto prèv transfè a pa klè oswa nimewo referans lan pa kowenside.');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-950/40"
                  >
                    Refize Demand
                  </button>
                )}

                {selectedArtistDossier.status !== 'active' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOptimisticValidateArtist(selectedArtistDossier.id, true);
                      setSelectedArtistDossier(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Valide Kont Kounye a</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANUAL ARTIST INTEGRATION DEMAND MODAL */}
      {showAddManualArtistModal && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0a0f1d] border border-amber-500/40 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl my-8 animate-scaleUp">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-950/60 via-[#0a0f1d] to-[#05070a] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ajoute Yon Nouvo Demand Enskripsyon Atis</h3>
                  <p className="text-xs text-slate-400">
                    Mete tout enfòmasyon ak foto prèv $4.99 pou kreye dosye integrasyon an.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddManualArtistModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualArtistStageName.trim() || !manualArtistName.trim() || !manualArtistPhone.trim() || !manualArtistEmail.trim()) {
                  alert('Tanpri ranpli tout chan obligatwa yo (Non Atis, Non Reyèl, Telefòn, Imèl).');
                  return;
                }

                const newArtistObj: ArtistUser = {
                  id: `art-${Date.now()}`,
                  stageName: manualArtistStageName.trim(),
                  name: manualArtistName.trim(),
                  phone: manualArtistPhone.trim(),
                  email: manualArtistEmail.trim(),
                  city: manualArtistCity.trim() || 'Pòtoprens',
                  pin: manualArtistPin.trim() || '1234',
                  bio: manualArtistBio.trim() || `Atis ayisyen ${manualArtistStageName.trim()}`,
                  musicalRoots: manualArtistRoots.trim() || 'Mizik Ayisyen',
                  musicalInfluences: manualArtistInfluences.trim() || 'Kilti Ayisyen',
                  artisticVision: manualArtistVision.trim() || 'Pote mizik ayisyen pi lwen',
                  artistQuote: manualArtistQuote.trim() || undefined,
                  avatarUrl: manualArtistAvatar.trim() || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
                  registrationProofUrl: manualArtistProof.trim() || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
                  status: manualArtistStatus,
                  registrationDate: new Date().toISOString().split('T')[0],
                  totalListens: 0,
                  totalDonationsReceived: 0,
                  instagramHandle: manualArtistInstagram.trim() || undefined,
                  tiktokHandle: manualArtistTiktok.trim() || undefined,
                  twitterHandle: manualArtistTwitter.trim() || undefined,
                  isPaidThisMonth: false,
                };

                StorageService.saveArtist(newArtistObj);
                window.dispatchEvent(new CustomEvent('upmizik_artist_updated', { detail: { action: 'create', artist: newArtistObj } }));
                setShowAddManualArtistModal(false);
                setArtistValidationFilter(manualArtistStatus);
              }}
              className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Non Atis (Gwo Tit) *</label>
                  <input
                    type="text"
                    required
                    value={manualArtistStageName}
                    onChange={(e) => setManualArtistStageName(e.target.value)}
                    placeholder="Eg: King Rabo 509"
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Non Konplè Reyèl (Legal) *</label>
                  <input
                    type="text"
                    required
                    value={manualArtistName}
                    onChange={(e) => setManualArtistName(e.target.value)}
                    placeholder="Eg: Jean-Robert Dorval"
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Telefòn MonCash / Natcash *</label>
                  <input
                    type="tel"
                    required
                    value={manualArtistPhone}
                    onChange={(e) => setManualArtistPhone(e.target.value)}
                    placeholder="Eg: +509 37 28 9011"
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Adrès Imèl *</label>
                  <input
                    type="email"
                    required
                    value={manualArtistEmail}
                    onChange={(e) => setManualArtistEmail(e.target.value)}
                    placeholder="Eg: kingrabo509@gmail.com"
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Vil Rezidans</label>
                  <input
                    type="text"
                    value={manualArtistCity}
                    onChange={(e) => setManualArtistCity(e.target.value)}
                    placeholder="Eg: Kap-Ayisyen, Pòtoprens, Jakmèl..."
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Kòd PIN Sekirite (4 Chif)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={manualArtistPin}
                    onChange={(e) => setManualArtistPin(e.target.value)}
                    placeholder="Eg: 1234"
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Estati Demand lan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualArtistStatus('pending')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      manualArtistStatus === 'pending'
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow'
                        : 'bg-[#05070a] text-slate-300 border-white/[0.1]'
                    }`}
                  >
                    🟡 An Atant (Pou tès validasyon)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualArtistStatus('active')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      manualArtistStatus === 'active'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow'
                        : 'bg-[#05070a] text-slate-300 border-white/[0.1]'
                    }`}
                  >
                    🟢 Valide Dirèkteman
                  </button>
                </div>
              </div>

              {/* Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Foto Pwofil (URL oswa Telechaje)</label>
                  <input
                    type="url"
                    value={manualArtistAvatar}
                    onChange={(e) => setManualArtistAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none mb-1.5"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await compressAndReadFile(file, 800, 800, 0.85);
                        setManualArtistAvatar(b64);
                      }
                    }}
                    className="text-[10px] text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Prèv Peman $4.99 (URL oswa Telechaje)</label>
                  <input
                    type="url"
                    value={manualArtistProof}
                    onChange={(e) => setManualArtistProof(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none mb-1.5"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await compressAndReadFile(file, 800, 800, 0.85);
                        setManualArtistProof(b64);
                      }
                    }}
                    className="text-[10px] text-slate-400"
                  />
                </div>
              </div>

              {/* Cultural & Bio details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Rasin Mizikal & Estil</label>
                  <input
                    type="text"
                    value={manualArtistRoots}
                    onChange={(e) => setManualArtistRoots(e.target.value)}
                    placeholder="Eg: Rasin, Vodou Jazz, Rap Kreyòl"
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Enfliyans & Modèl</label>
                  <input
                    type="text"
                    value={manualArtistInfluences}
                    onChange={(e) => setManualArtistInfluences(e.target.value)}
                    placeholder="Eg: Boukman Eksperyans, RAM"
                    className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Vizyon Atistik</label>
                <input
                  type="text"
                  value={manualArtistVision}
                  onChange={(e) => setManualArtistVision(e.target.value)}
                  placeholder="Eg: Valorize ritm zansèt nou yo sou sèn entènasyonal"
                  className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Biyografi Atis</label>
                <textarea
                  rows={2}
                  value={manualArtistBio}
                  onChange={(e) => setManualArtistBio(e.target.value)}
                  placeholder="Kout deskripsyon sou karyè ak pakou atis la..."
                  className="w-full bg-[#05070a] border border-white/[0.15] focus:border-amber-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddManualArtistModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-all"
                >
                  Anile
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Kreye Demand Enskripsyon</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
