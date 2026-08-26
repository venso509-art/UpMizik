import React, { useState, useEffect } from 'react';
import {
  ArtistUser,
  MusicItem,
  RpaItem,
  DonationItem,
  MusicCategory,
  ReleaseFormat,
  MusicCredit,
  ArtistInboxMessage
} from '../types';
import { compressAndReadFile } from '../utils/imageUtils';
import { IdbStorage } from '../utils/idbStorage';
import { validateRestrictedDigits, hasRestrictedPhoneOrDigits, RESTRICTED_DIGITS_ERROR_MESSAGE } from '../utils/textValidation';
import {
  Music,
  PlusCircle,
  TrendingUp,
  HeartHandshake,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Upload,
  Play,
  Pause,
  X,
  Loader2,
  ShieldCheck,
  Award,
  Crown,
  Star,
  Gem,
  ArrowRight,
  Mail,
  BarChart3,
  Target,
  FileText,
  Download,
  Check,
  BookOpen,
  Quote,
  Flame,
  Radio,
  Compass,
  Save,
  User,
  Palette,
  Image as ImageIcon,
  Users,
  Link2,
  UserCheck,
  Youtube,
  VolumeX,
  Film,
  ArrowUpRight,
  Lock,
  ShieldAlert,
  Ban,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { ArtistAnalytics } from './ArtistAnalytics';
import { ArtistBadge } from './ArtistBadge';
import { ArtistInbox } from './ArtistInbox';
import { MonthlyGoalProgress } from './MonthlyGoalProgress';
import { ArtistBannerStudio } from './ArtistBannerStudio';
import { SongCreditsEditor } from './SongCreditsEditor';
import { ArtistRevenueEstimates } from './ArtistRevenueEstimates';
import { StorageService } from '../utils/storage';
import { getArtistBadgeInfo, calculateArtistTotalDonations, TIER_THRESHOLDS } from '../utils/badgeSystem';
import { generateArtistPortfolioPdf } from '../utils/portfolioPdfGenerator';
import { getAudioDuration } from '../utils/audioEngine';
import { Pencil, Trash2, Trophy } from 'lucide-react';
import { ArtistAwardsShowcase } from './ArtistAwardsShowcase';
import { calculateArtistAwards } from '../utils/awardsUtils';

interface ArtistDashboardProps {
  currentArtist: ArtistUser;
  artistSongs: MusicItem[];
  rpaList: RpaItem[];
  donations?: DonationItem[];
  exchangeRate?: number;
  currentPlayingId: string | null;
  isPlaying: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onAddNewSong: (song: Omit<MusicItem, 'id' | 'listens' | 'totalDonations' | 'createdAt'>) => void;
  onEditSong?: (song: MusicItem) => void;
  onDeleteSong?: (musicId: string) => void;
  onLogout: () => void;
  onOpenSocial?: () => void;
  onArtistUpdated?: (updatedArtist: ArtistUser) => void;
}

export const ArtistDashboard: React.FC<ArtistDashboardProps> = ({
  currentArtist,
  artistSongs,
  rpaList,
  donations = [],
  exchangeRate = 145.0,
  currentPlayingId,
  isPlaying,
  onPlayToggle,
  onAddNewSong,
  onEditSong,
  onDeleteSong,
  onLogout,
  onOpenSocial,
  onArtistUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'awards' | 'inbox' | 'analytics' | 'profile' | 'banner'>('overview');

  // Automatically scroll to top when artist switches tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  const isSuspended = currentArtist.status === 'suspended';
  const isPending = currentArtist.status === 'pending';
  const isRejected = currentArtist.status === 'rejected';
  const isArtistActive = currentArtist.status === 'active' && !isSuspended;

  // Calculate remaining days for suspended artist
  let suspensionDaysRemaining = 0;
  let suspensionFormattedEndDate = '';
  if (isSuspended && currentArtist.suspendedUntil) {
    const diffMs = new Date(currentArtist.suspendedUntil).getTime() - Date.now();
    suspensionDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    try {
      suspensionFormattedEndDate = new Date(currentArtist.suspendedUntil).toLocaleDateString('ht-HT', {
        dateStyle: 'full'
      });
    } catch {
      suspensionFormattedEndDate = currentArtist.suspendedUntil;
    }
  }

  const [showAddModal, setShowAddModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string>(currentArtist.headerBannerUrl || '');
  const [inboxMessages, setInboxMessages] = useState<ArtistInboxMessage[]>(() =>
    StorageService.getArtistInboxMessages(currentArtist.id)
  );

  // Validation / Suspension Blocking Dialog State
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [blockedActionTitle, setBlockedActionTitle] = useState('');
  const [blockedActionDescription, setBlockedActionDescription] = useState('');
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  const triggerBlockedAction = (actionName: string) => {
    if (isSuspended) {
      const message = `Kont atis ou an an SISPANSYON AKTIVITE pou ${currentArtist.suspensionDays || 'X'} Jou (Rete ${suspensionDaysRemaining} Jou, jiska ${suspensionFormattedEndDate || 'delè a ekspire'}). Rezon ofisyèl Administratè UpMizik la: "${currentArtist.suspensionReason || 'Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la'}". Pandan tout peryòd sa a, tout aksyon pou (${actionName}) rete bloke.`;
      setBlockedActionTitle(`Kont an Sispansyon: ${actionName} Bloke`);
      setBlockedActionDescription(message);
    } else {
      const message = `Ou pap ka opere sou board la (${actionName}) san validasyon Administratè UpMizik la (Mr clauvens). Toutotan administratè a pa fin valide prèv transfè $4.99 ou an, tout aksyon pou ajoute mizik, chanje pwofil oswa modifye enfòmasyon rete bloke.`;
      setBlockedActionTitle(`Aksyon Bloke: ${actionName}`);
      setBlockedActionDescription(message);
    }
    setShowBlockedDialog(true);
  };

  const handleOpenAddSong = () => {
    if (!isArtistActive) {
      triggerBlockedAction('Ajoute Nouvo Moso Mizik');
      return;
    }
    setShowAddModal(true);
  };

  // Profile Edit State
  const [editBio, setEditBio] = useState(currentArtist.bio || '');
  const [editQuote, setEditQuote] = useState(currentArtist.artistQuote || '');
  const [editRoots, setEditRoots] = useState(currentArtist.musicalRoots || '');
  const [editInfluences, setEditInfluences] = useState(currentArtist.musicalInfluences || '');
  const [editVision, setEditVision] = useState(currentArtist.artisticVision || '');
  const [editTwitter, setEditTwitter] = useState(currentArtist.twitterHandle || '');
  const [editInstagram, setEditInstagram] = useState(currentArtist.instagramHandle || '');
  const [editTiktok, setEditTiktok] = useState(currentArtist.tiktokHandle || '');
  const [editYoutube, setEditYoutube] = useState(currentArtist.youtubeUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);

  // Sync state when currentArtist prop updates
  useEffect(() => {
    setEditBio(currentArtist.bio || '');
    setEditQuote(currentArtist.artistQuote || '');
    setEditRoots(currentArtist.musicalRoots || '');
    setEditInfluences(currentArtist.musicalInfluences || '');
    setEditVision(currentArtist.artisticVision || '');
    setEditTwitter(currentArtist.twitterHandle || '');
    setEditInstagram(currentArtist.instagramHandle || '');
    setEditTiktok(currentArtist.tiktokHandle || '');
    setEditYoutube(currentArtist.youtubeUrl || '');
  }, [currentArtist]);

  // Sync inbox messages periodically or when storage updates
  useEffect(() => {
    setInboxMessages(StorageService.getArtistInboxMessages(currentArtist.id));
  }, [currentArtist.id]);

  const unreadInboxCount = inboxMessages.filter(m => !m.isRead).length;
  
  // Badge & Tier Info
  const totalCumulativeDonations = calculateArtistTotalDonations(currentArtist, artistSongs);
  const badgeInfo = getArtistBadgeInfo(currentArtist, artistSongs);

  const handleDownloadPortfolio = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      try {
        const filename = generateArtistPortfolioPdf({
          artist: currentArtist,
          songs: artistSongs,
          badgeInfo
        });
        setPdfSuccessMessage(`Pòtfolyo PDF telechaje avèk siksè! (${filename})`);
        setTimeout(() => setPdfSuccessMessage(null), 5000);
      } catch (err) {
        console.error('Error generating PDF portfolio:', err);
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 400);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isArtistActive) {
      setProfileSaveError('Ou pap ka modifye biyografi w ni enfòmasyon pwofil ou toutotan Administratè UpMizik la pa fin valide prèv transfè w la.');
      triggerBlockedAction('Modifye Biyografi & Pwofil');
      return;
    }
    setProfileSaveError(null);

    // Validation against phone numbers or 5+ consecutive digits across all text fields
    const fieldsToValidate = [
      { val: editBio, label: 'biyografi w' },
      { val: editQuote, label: 'deviz ou' },
      { val: editRoots, label: 'rasin ak estil' },
      { val: editInfluences, label: 'enfliyans ak modèl' },
      { val: editVision, label: 'vizyon atistik ou' }
    ];

    for (const field of fieldsToValidate) {
      if (field.val) {
        const valRes = validateRestrictedDigits(field.val, field.label);
        if (!valRes.isValid) {
          setProfileSaveError(valRes.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
          return;
        }
      }
    }

    setIsSavingProfile(true);

    const updatedArtist: ArtistUser = {
      ...currentArtist,
      bio: editBio.trim() || currentArtist.bio,
      artistQuote: editQuote.trim() || undefined,
      musicalRoots: editRoots.trim() || undefined,
      musicalInfluences: editInfluences.trim() || undefined,
      artisticVision: editVision.trim() || undefined,
      twitterHandle: editTwitter.trim() || undefined,
      instagramHandle: editInstagram.trim() || undefined,
      tiktokHandle: editTiktok.trim() || undefined,
      youtubeUrl: editYoutube.trim() || undefined
    };

    StorageService.saveArtist(updatedArtist);
    if (onArtistUpdated) {
      onArtistUpdated(updatedArtist);
    }
    setIsSavingProfile(false);
    setProfileSaveSuccess('Biyografi ak enfòmasyon pwofil ou anrejistre avèk siksè!');
    setTimeout(() => setProfileSaveSuccess(null), 4000);
  };

  
  // Add Song Form State
  const [title, setTitle] = useState('');
  const [releaseFormat, setReleaseFormat] = useState<ReleaseFormat>('single');
  const [albumName, setAlbumName] = useState('');
  const [trackNumber, setTrackNumber] = useState<number | ''>('');
  const [credits, setCredits] = useState<MusicCredit[]>([]);
  const [feat, setFeat] = useState('');
  const [collabArtistId, setCollabArtistId] = useState('');
  const [collabRole, setCollabRole] = useState('Featuring / Vokal');
  const [category, setCategory] = useState<MusicCategory>('Kompa');
  const [coverPreview, setCoverPreview] = useState('');
  const [audioPreview, setAudioPreview] = useState('');
  const [duration, setDuration] = useState<number>(180);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [addSongError, setAddSongError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [songTableFilter, setSongTableFilter] = useState<'all' | 'primary' | 'collabs'>('all');

  // Edit Song Form State
  const [editingSong, setEditingSong] = useState<MusicItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editReleaseFormat, setEditReleaseFormat] = useState<ReleaseFormat>('single');
  const [editAlbumName, setEditAlbumName] = useState('');
  const [editTrackNumber, setEditTrackNumber] = useState<number | ''>('');
  const [editCredits, setEditCredits] = useState<MusicCredit[]>([]);
  const [editFeat, setEditFeat] = useState('');
  const [editCollabArtistId, setEditCollabArtistId] = useState('');
  const [editCollabRole, setEditCollabRole] = useState('Featuring / Vokal');
  const [editCategory, setEditCategory] = useState<MusicCategory>('Kompa');
  const [editCoverPreview, setEditCoverPreview] = useState('');
  const [editAudioPreview, setEditAudioPreview] = useState('');
  const [editDuration, setEditDuration] = useState<number>(180);
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editTiktokUrl, setEditTiktokUrl] = useState('');
  const [editInstagramUrl, setEditInstagramUrl] = useState('');
  const [editSongError, setEditSongError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Available registered artists for collaboration linking (excluding current artist)
  const registeredArtists = StorageService.getArtists().filter(
    (a) => a.id !== currentArtist.id && (a.status === 'active' || !a.status)
  );

  // Financial & analytics aggregates
  const totalArtistListens = artistSongs.reduce((acc, s) => acc + (s.listens || 0), 0);
  const totalArtistUniqueListeners = StorageService.getArtistUniqueListenersCount(artistSongs);
  const totalArtistGross = artistSongs.reduce((acc, s) => acc + (s.totalDonations || 0), 0);
  const totalArtistNet85 = (totalArtistGross * 0.85).toFixed(2);
  const totalAdminCut15 = (totalArtistGross * 0.15).toFixed(2);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isArtistActive) {
      triggerBlockedAction('Chaje Foto Kouvèti');
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressAndReadFile(file, 600, 600, 0.75);
        if (compressed) {
          setCoverPreview(compressed);
        }
      } catch (err) {
        console.warn('Cover upload compression error', err);
      }
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isArtistActive) {
      triggerBlockedAction('Chaje Fichye Odyo');
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isMp3 = file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.name.toLowerCase().endsWith('.mp3');
      const isWav = file.type === 'audio/wav' || file.type === 'audio/x-wav' || file.name.toLowerCase().endsWith('.wav');
      if (!isMp3 && !isWav) {
        setAddSongError('Tanpri chwazi yon fichye odyo MP3 oswa WAV sèlman.');
        return;
      }
      setAddSongError(null);
      const audioKey = `audio_artist_${currentArtist.id}_${Date.now()}`;
      await IdbStorage.saveMedia(audioKey, file);
      setAudioPreview(`idb:${audioKey}`);
      try {
        const detectedDuration = await getAudioDuration(file);
        if (detectedDuration > 0) {
          setDuration(detectedDuration);
        }
      } catch (err) {
        console.warn('Could not extract duration automatically', err);
      }
    }
  };

  // Credits Management Helpers
  const handleAddCredit = (isEdit: boolean = false) => {
    const newCredit: MusicCredit = {
      id: 'cred-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: '',
      role: 'Featuring',
      percentage: 10,
      phone: '',
      notes: ''
    };
    if (isEdit) {
      setEditCredits((prev) => [...prev, newCredit]);
    } else {
      setCredits((prev) => [...prev, newCredit]);
    }
  };

  const handleRemoveCredit = (id: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditCredits((prev) => prev.filter((c) => c.id !== id));
    } else {
      setCredits((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleUpdateCredit = (id: string, field: keyof MusicCredit, value: any, isEdit: boolean = false) => {
    const updater = (prev: MusicCredit[]) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (field === 'artistId') {
          const selected = registeredArtists.find((a) => a.id === value);
          return {
            ...c,
            artistId: value || undefined,
            name: selected ? selected.stageName : c.name,
            phone: selected ? selected.phone : c.phone
          };
        }
        return { ...c, [field]: value };
      });
    if (isEdit) {
      setEditCredits(updater);
    } else {
      setCredits(updater);
    }
  };

  const handleAddSongSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddSongError(null);
    if (!isArtistActive) {
      triggerBlockedAction('Ajoute Nouvo Moso Mizik');
      setShowAddModal(false);
      return;
    }
    if (!title.trim()) return;

    // Validate title, feat, albumName against phone numbers and excessive digits
    const songFields = [
      { val: title, label: 'tit mizik la' },
      { val: feat, label: 'featuring a' },
      { val: albumName, label: 'non albòm lan' }
    ];

    for (const f of songFields) {
      if (f.val) {
        const valRes = validateRestrictedDigits(f.val, f.label);
        if (!valRes.isValid) {
          setAddSongError(valRes.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const selectedCollab = registeredArtists.find((a) => a.id === collabArtistId);
      const collabData = selectedCollab
        ? {
            artistId: selectedCollab.id,
            artistName: selectedCollab.stageName,
            avatarUrl: selectedCollab.avatarUrl,
            role: collabRole.trim() || 'Featuring'
          }
        : undefined;

      // Filter valid credits
      const cleanedCredits = credits
        .filter((c) => c.name && c.name.trim().length > 0)
        .map((c) => ({
          ...c,
          name: c.name.trim(),
          percentage: Number(c.percentage) || 0
        }));

      onAddNewSong({
        title: title.trim(),
        artistId: currentArtist.id,
        artistName: currentArtist.stageName,
        feat: feat.trim() || (selectedCollab ? selectedCollab.stageName : undefined),
        collab: collabData,
        category,
        releaseFormat,
        albumName: releaseFormat !== 'single' && albumName.trim() ? albumName.trim() : undefined,
        trackNumber: typeof trackNumber === 'number' && trackNumber > 0 ? trackNumber : undefined,
        credits: cleanedCredits.length > 0 ? cleanedCredits : undefined,
        position: StorageService.getNextAvailablePosition(),
        coverUrl: coverPreview || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        audioUrl: audioPreview || '',
        duration: duration > 0 ? duration : 180,
        youtubeUrl: youtubeUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined
      });
      setIsSubmitting(false);
      setShowAddModal(false);
      setAddSongError(null);
      // Reset form
      setTitle('');
      setReleaseFormat('single');
      setAlbumName('');
      setTrackNumber('');
      setCredits([]);
      setFeat('');
      setCollabArtistId('');
      setCollabRole('Featuring / Vokal');
      setCoverPreview('');
      setAudioPreview('');
      setDuration(180);
      setYoutubeUrl('');
      setTiktokUrl('');
      setInstagramUrl('');
    }, 400);
  };

  // Open Edit Song Modal
  const handleOpenEditSong = (song: MusicItem) => {
    if (!isArtistActive) {
      triggerBlockedAction('Modifye Moso Mizik');
      return;
    }
    setEditingSong(song);
    setEditSongError(null);
    setEditTitle(song.title || '');
    setEditReleaseFormat(song.releaseFormat || 'single');
    setEditAlbumName(song.albumName || '');
    setEditTrackNumber(typeof song.trackNumber === 'number' ? song.trackNumber : '');
    setEditCredits(song.credits ? JSON.parse(JSON.stringify(song.credits)) : []);
    setEditFeat(song.feat || '');
    setEditCollabArtistId(song.collab?.artistId || '');
    setEditCollabRole(song.collab?.role || 'Featuring / Vokal');
    setEditCategory(song.category || 'Kompa');
    setEditCoverPreview(song.coverUrl || '');
    setEditAudioPreview(song.audioUrl || '');
    setEditDuration(song.duration || 180);
    setEditYoutubeUrl(song.youtubeUrl || '');
    setEditTiktokUrl(song.tiktokUrl || '');
    setEditInstagramUrl(song.instagramUrl || '');
  };

  const handleEditCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isArtistActive) {
      triggerBlockedAction('Chaje Foto Kouvèti');
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressAndReadFile(file, 600, 600, 0.75);
        if (compressed) {
          setEditCoverPreview(compressed);
        }
      } catch (err) {
        console.warn('Edit cover compression error', err);
      }
    }
  };

  const handleEditAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isArtistActive) {
      triggerBlockedAction('Chaje Fichye Odyo');
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isMp3 = file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.name.toLowerCase().endsWith('.mp3');
      const isWav = file.type === 'audio/wav' || file.type === 'audio/x-wav' || file.name.toLowerCase().endsWith('.wav');
      if (!isMp3 && !isWav) {
        setEditSongError('Tanpri chwazi yon fichye odyo MP3 oswa WAV sèlman.');
        return;
      }
      setEditSongError(null);
      const audioKey = `audio_artist_${currentArtist.id}_${Date.now()}`;
      await IdbStorage.saveMedia(audioKey, file);
      setEditAudioPreview(`idb:${audioKey}`);
      try {
        const detectedDuration = await getAudioDuration(file);
        if (detectedDuration > 0) {
          setEditDuration(detectedDuration);
        }
      } catch (err) {
        console.warn('Could not extract duration automatically', err);
      }
    }
  };

  const handleEditSongSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditSongError(null);
    if (!editingSong) return;
    if (!isArtistActive) {
      triggerBlockedAction('Modifye Moso Mizik');
      setEditingSong(null);
      return;
    }
    if (!editTitle.trim()) return;

    // Validate edit title, edit feat, edit albumName against phone numbers and excessive digits
    const songFields = [
      { val: editTitle, label: 'tit mizik la' },
      { val: editFeat, label: 'featuring a' },
      { val: editAlbumName, label: 'non albòm lan' }
    ];

    for (const f of songFields) {
      if (f.val) {
        const valRes = validateRestrictedDigits(f.val, f.label);
        if (!valRes.isValid) {
          setEditSongError(valRes.error || RESTRICTED_DIGITS_ERROR_MESSAGE);
          return;
        }
      }
    }

    setIsSubmittingEdit(true);
    setTimeout(() => {
      const selectedCollab = registeredArtists.find((a) => a.id === editCollabArtistId);
      const collabData = selectedCollab
        ? {
            artistId: selectedCollab.id,
            artistName: selectedCollab.stageName,
            avatarUrl: selectedCollab.avatarUrl,
            role: editCollabRole.trim() || 'Featuring'
          }
        : undefined;

      // Filter valid edit credits
      const cleanedEditCredits = editCredits
        .filter((c) => c.name && c.name.trim().length > 0)
        .map((c) => ({
          ...c,
          name: c.name.trim(),
          percentage: Number(c.percentage) || 0
        }));

      const updatedSong: MusicItem = {
        ...editingSong,
        title: editTitle.trim(),
        feat: editFeat.trim() || (selectedCollab ? selectedCollab.stageName : undefined),
        collab: collabData,
        category: editCategory,
        releaseFormat: editReleaseFormat,
        albumName: editReleaseFormat !== 'single' && editAlbumName.trim() ? editAlbumName.trim() : undefined,
        trackNumber: typeof editTrackNumber === 'number' && editTrackNumber > 0 ? editTrackNumber : undefined,
        credits: cleanedEditCredits.length > 0 ? cleanedEditCredits : undefined,
        position: editingSong.position,
        coverUrl: editCoverPreview || editingSong.coverUrl,
        audioUrl: editAudioPreview || editingSong.audioUrl,
        duration: editDuration > 0 ? editDuration : editingSong.duration,
        youtubeUrl: editYoutubeUrl.trim() || undefined,
        tiktokUrl: editTiktokUrl.trim() || undefined,
        instagramUrl: editInstagramUrl.trim() || undefined
      };

      if (onEditSong) {
        onEditSong(updatedSong);
      } else {
        StorageService.saveMusic(updatedSong);
      }

      setIsSubmittingEdit(false);
      setEditingSong(null);
    }, 400);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    if (onDeleteSong) {
      onDeleteSong(deleteConfirmId);
    } else {
      StorageService.deleteMusic(deleteConfirmId);
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-fadeIn">
      
      {/* Artist Profile Header Banner with Stylized Cover Backdrop */}
      <div className="relative bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-2xl">
        {/* Background Banner Image if generated */}
        {currentBannerUrl && (
          <div className="absolute inset-0 z-0">
            <img
              src={currentBannerUrl}
              alt=""
              className="w-full h-full object-cover opacity-25 filter blur-[1px]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1d] via-[#0a0f1d]/80 to-[#0a0f1d]/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-transparent to-black/40" />
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-yellow-400 shadow-xl bg-black shrink-0">
              <img
                src={currentArtist.avatarUrl}
                alt={currentArtist.stageName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                  {currentArtist.stageName}
                </h1>
                <ArtistBadge badge={badgeInfo} donations={totalCumulativeDonations} size="md" />
                {isArtistActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Kont Verifye
                  </span>
                )}
                {isSuspended && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse">
                    <Ban className="w-3.5 h-3.5" /> KONT AN SISPANSYON ({suspensionDaysRemaining} Jou Rete)
                  </span>
                )}
                {isPending && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <Clock className="w-3.5 h-3.5" /> An Atant Validasyon Admin
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                    <XCircle className="w-3.5 h-3.5" /> Enskripsyon Refize
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {currentArtist.name} • {currentArtist.city} • <span className="text-yellow-400">{currentArtist.phone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              id="artist-banner-studio-top-btn"
              onClick={() => setActiveTab('banner')}
              className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border ${
                activeTab === 'banner'
                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-lg shadow-yellow-500/20'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-yellow-300 border-yellow-400/30'
              }`}
              title="Kreye oswa chanje bannè stilize pwofil ou"
            >
              <Palette className="w-4 h-4" />
              <span>Bannè Pwofil (AI Studio)</span>
            </button>

            <button
              id="artist-download-portfolio-top-btn"
              onClick={handleDownloadPortfolio}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/30 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              title="Telechaje yon rapò ofisyèl PDF sou pèfòmans, ekout, ak donasyon ou yo"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <FileText className="w-4 h-4 text-amber-300" />
              )}
              <span>{isGeneratingPdf ? 'Ap Jenere...' : 'Telechaje Pòtfolyo PDF'}</span>
            </button>

            <button
              id="artist-add-song-top-btn"
              onClick={handleOpenAddSong}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 active:scale-95 transition-all ${
                !isArtistActive
                  ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 shadow-lg shadow-red-950/40'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white shadow-lg shadow-red-950/50'
              }`}
              title={!isArtistActive ? 'Aksyon bloke: kont an sispansyon oswa ap tann validasyon' : 'Ajoute yon nouvo moso mizik'}
            >
              {!isArtistActive ? <Lock className="w-4 h-4 text-red-400" /> : <PlusCircle className="w-4 h-4" />}
              <span>{!isArtistActive ? 'Ajoute Mizik (Bloke)' : 'Ajoute Mizik'}</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
            >
              Dekonekte
            </button>
          </div>
        </div>

        {/* PDF Success Download Banner Notification */}
        {pdfSuccessMessage && (
          <div className="mt-4 p-3.5 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200 animate-fadeIn backdrop-blur-md">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="font-semibold">{pdfSuccessMessage}</p>
          </div>
        )}

        {/* ARTIST SUSPENSION WARNING BANNER */}
        {isSuspended && (
          <div className="mt-5 p-5 bg-gradient-to-r from-red-950/95 via-red-900/80 to-amber-950/90 border-2 border-red-500 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5 text-white shadow-2xl shadow-red-950/50 backdrop-blur-xl animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                <Ban className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <span>🚨 KONT OU AN AN SISPANSYON AKTIVITE PA ADMIN</span>
                  </h4>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-red-500 text-white shadow-md shadow-red-500/30">
                    Rete {suspensionDaysRemaining} Jou
                  </span>
                </div>
                <p className="text-xs text-red-100 leading-relaxed max-w-3xl">
                  Administratè UpMizik mete kont ou an an sispansyon pou yon dire de <strong>{currentArtist.suspensionDays || 'X'} Jou</strong> (jiska <strong className="text-yellow-300">{suspensionFormattedEndDate || 'delè a fini'}</strong>).
                </p>
                <div className="bg-black/40 border border-red-500/30 rounded-xl px-3.5 py-2 text-xs text-red-200">
                  <strong>Rezon Ofisyèl Sispansyon an:</strong> {currentArtist.suspensionReason || 'Vyolasyon règ ak kondisyon itilizasyon platfòm UpMizik la.'}
                </div>
                <p className="text-[11px] text-red-300/90 pt-0.5">
                  🔒 <em>Konsekans:</em> Ou pa ka ajoute nouvo moso mizik, ni modifye pwofil ou, ni fè chanjman sou board la pandan tout delè sispansyon an.
                </p>
              </div>
            </div>
            <div className="shrink-0 self-end md:self-center">
              <div className="text-[11px] text-yellow-300 bg-black/60 px-3.5 py-2 rounded-xl border border-white/[0.1] text-right font-mono">
                <p className="text-slate-400 text-[10px] uppercase font-sans font-bold">Sipò & Asistans</p>
                <p>WhatsApp: +509 3891-2317</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending / Unvalidated Warning Banner with Action Lock Details */}
        {!isSuspended && !isArtistActive && (
          <div className="mt-5 p-4 sm:p-5 bg-gradient-to-r from-red-950/90 via-amber-950/80 to-red-950/90 border-2 border-red-500/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-white shadow-xl backdrop-blur-md animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>KONT OU AN AP TANN VALIDASYON PA ADMIN</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white uppercase tracking-wider">
                    Aksyon Bloke
                  </span>
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Toutotan administratè yo pa valide prèv transfè <strong>$4.99 USD (723.55 HTG)</strong> ou an, <strong>ou pap ka ajoute mizik, chanje pwofil, ni modifye okenn enfòmasyon</strong> sou board sa a.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <div className="text-[11px] text-yellow-300 font-mono bg-black/50 px-3 py-2 rounded-xl border border-white/[0.1]">
                Moncash: 38-91-2317 | Natcash: 35-37-1184
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar for Artist Space */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Apèsi & Mizik</span>
          </button>

          <button
            id="artist-tab-revenue-btn"
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'revenue'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Estimasyon Revni</span>
          </button>

          <button
            id="artist-tab-awards-btn"
            onClick={() => setActiveTab('awards')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'awards'
                ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-lg shadow-yellow-400/30 font-black'
                : 'bg-white/[0.04] text-yellow-400 hover:bg-white/[0.08] hover:text-yellow-300 border border-yellow-400/30'
            }`}
          >
            <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span>Palmarès & Twofe</span>
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all relative ${
              activeTab === 'inbox'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/50'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Bwat Lèt & Imèl</span>
            {unreadInboxCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30 animate-pulse">
                {unreadInboxCount} nouvo
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-lg shadow-amber-950/50'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analitik Kwasans</span>
          </button>

          <button
            id="artist-tab-banner-btn"
            onClick={() => setActiveTab('banner')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'banner'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 shadow-lg shadow-yellow-950/50'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Bannè Pwofil (AI)</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Biyografi & Pwofil</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/[0.03] px-3.5 py-1.5 rounded-xl border border-white/[0.06]">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>Istwa ou parèt dirèkteman bay fanatik yo</span>
        </div>
      </div>

      {/* VIEW: STYLIZED HEADER BANNER STUDIO */}
      {activeTab === 'banner' && (
        <div className="space-y-6 animate-fadeIn">
          {!isArtistActive && (
            <div className="p-4 bg-red-950/80 border-2 border-red-500/80 rounded-2xl flex items-center gap-3 text-xs text-red-200 backdrop-blur-md shadow-xl">
              <Lock className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-white">Chanjman Bannè Bloke:</p>
                <p className="mt-0.5">Ou pap ka aplike okenn nouvo bannè sou pwofil ou toutotan Administratè UpMizik la (Mr clauvens) pa fin valide prèv transfè w la.</p>
              </div>
            </div>
          )}
          <ArtistBannerStudio
            currentArtist={currentArtist}
            isArtistActive={isArtistActive}
            onBlockedAction={triggerBlockedAction}
            onBannerUpdated={(newUrl) => {
              setCurrentBannerUrl(newUrl);
              if (onArtistUpdated) {
                onArtistUpdated({
                  ...currentArtist,
                  headerBannerUrl: newUrl
                });
              }
            }}
          />
        </div>
      )}

      {/* VIEW: BIOGRAPHY & PROFILE STORY EDITOR */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-fadeIn">
          {!isArtistActive && (
            <div className="p-4 bg-red-950/80 border-2 border-red-500/80 rounded-2xl flex items-center gap-3 text-xs text-red-200 backdrop-blur-md shadow-xl">
              <Lock className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-white">Modifikasyon Pwofil Bloke:</p>
                <p className="mt-0.5">Ou pap ka modifye biyografi w, sitasyon w, ni rezo sosyal ou yo toutotan Administratè UpMizik la pa fin valide prèv transfè $4.99 ou an.</p>
              </div>
            </div>
          )}

          {profileSaveError && (
            <div className="p-4 bg-red-950/90 border border-red-500 rounded-2xl flex items-center gap-3 text-xs text-red-200 backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="font-semibold">{profileSaveError}</p>
            </div>
          )}

          {profileSaveSuccess && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center gap-3 text-xs text-emerald-200 backdrop-blur-md">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="font-semibold">{profileSaveSuccess}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Profile Story Preview Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Apèsi Kijan Fanatik yo Wè Istwa w</span>
                  </h3>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                    Live Preview
                  </span>
                </div>

                {/* Simulated Modal Card Preview */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={currentArtist.avatarUrl}
                      alt={currentArtist.stageName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
                    />
                    <div>
                      <h4 className="text-base font-black text-white">{currentArtist.stageName}</h4>
                      <p className="text-xs text-slate-400">{currentArtist.name} • {currentArtist.city}</p>
                      <div className="mt-1">
                        <ArtistBadge badge={badgeInfo} donations={totalCumulativeDonations} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Motto / Quote */}
                  {editQuote && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl relative">
                      <Quote className="w-4 h-4 text-yellow-400/40 absolute top-2 right-2" />
                      <p className="text-xs italic text-yellow-200 pr-4">“{editQuote}”</p>
                    </div>
                  )}

                  {/* Bio Preview */}
                  <div className="bg-[#05070a] p-3.5 rounded-xl border border-white/[0.06]">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Biyografi
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {editBio || 'Atis k ap kreye bèl mizik pou kilti kreyòl la.'}
                    </p>
                  </div>

                  {/* Cultural highlights */}
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {editRoots && (
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] text-red-400 font-bold block mb-0.5">🥁 Rasin & Estil:</span>
                        <span className="text-slate-300 text-xs">{editRoots}</span>
                      </div>
                    )}
                    {editInfluences && (
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] text-yellow-400 font-bold block mb-0.5">🌟 Enspirasyon:</span>
                        <span className="text-slate-300 text-xs">{editInfluences}</span>
                      </div>
                    )}
                    {editVision && (
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] text-cyan-400 font-bold block mb-0.5">🎯 Vizyon Kiltirèl:</span>
                        <span className="text-slate-300 text-xs">{editVision}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Story Editor Form */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSaveProfile} className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl space-y-4">
                <div>
                  <h3 className="text-lg font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    <span>Modifye Biyografi & Istwa Pèsonèl Ou</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enfòmasyon sa yo parèt sou tout kat pwofil ou pou konekte pi pwofon ak fanatik ak sipòtè yo.
                  </p>
                </div>

                {/* Real-time Warning Banner if any profile field contains phone or 5+ consecutive digits */}
                {(hasRestrictedPhoneOrDigits(editBio) ||
                  hasRestrictedPhoneOrDigits(editQuote) ||
                  hasRestrictedPhoneOrDigits(editRoots) ||
                  hasRestrictedPhoneOrDigits(editInfluences) ||
                  hasRestrictedPhoneOrDigits(editVision)) && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Atansyon: Nimewo telefòn oswa twòp chif entèdi!</p>
                      <p className="text-[11px] text-red-300/90 mt-0.5">
                        {RESTRICTED_DIGITS_ERROR_MESSAGE}
                      </p>
                    </div>
                  </div>
                )}

                {/* Biography textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Biyografi Konplè & Istwa Atistik *
                    </label>
                    {hasRestrictedPhoneOrDigits(editBio) && (
                      <span className="text-[10px] text-red-400 font-bold">Nimewo telefòn detekte!</span>
                    )}
                  </div>
                  <textarea
                    rows={5}
                    value={editBio ?? ''}
                    onChange={(e) => {
                      setEditBio(e.target.value);
                      if (profileSaveError) setProfileSaveError(null);
                    }}
                    placeholder="Rakonte ki kote w soti, kijan w te dekouvri pasyon mizik ou, vwayaj ou ak mesaj ou pote..."
                    className={`w-full bg-[#05070a] border rounded-2xl p-3.5 text-xs text-white outline-none leading-relaxed transition-all ${
                      hasRestrictedPhoneOrDigits(editBio)
                        ? 'border-red-500 bg-red-950/20 text-red-200'
                        : 'border-white/[0.12] focus:border-cyan-500'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Konsèy: Eksplike vil ou grandi, sa ki enspire w, ak sa mizik ou vle pote pou kilti kreyòl la. (Max 4 chif kòtakòt pou ane tankou 2024).
                  </p>
                </div>

                {/* Personal Motto / Quote */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Deviz / Sitasyon Pèsonèl Ou (Motto)</span>
                    </label>
                    {hasRestrictedPhoneOrDigits(editQuote) && (
                      <span className="text-[10px] text-red-400 font-bold">Nimewo telefòn detekte!</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editQuote ?? ''}
                    onChange={(e) => {
                      setEditQuote(e.target.value);
                      if (profileSaveError) setProfileSaveError(null);
                    }}
                    placeholder="egz: Rasin nou fon, branch nou wo."
                    className={`w-full bg-[#05070a] border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all ${
                      hasRestrictedPhoneOrDigits(editQuote)
                        ? 'border-red-500 bg-red-950/20 text-red-200'
                        : 'border-white/[0.12] focus:border-cyan-500'
                    }`}
                  />
                </div>

                {/* Cultural Attributes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-red-400" />
                      <span>Rasin & Estil</span>
                    </label>
                    <input
                      type="text"
                      value={editRoots ?? ''}
                      onChange={(e) => {
                        setEditRoots(e.target.value);
                        if (profileSaveError) setProfileSaveError(null);
                      }}
                      placeholder="egz: Rasin, Trap, Rabòday"
                      className={`w-full bg-[#05070a] border rounded-xl px-3 py-2 text-xs text-white outline-none transition-all ${
                        hasRestrictedPhoneOrDigits(editRoots)
                          ? 'border-red-500 bg-red-950/20 text-red-200'
                          : 'border-white/[0.12] focus:border-cyan-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Enfliyans / Modèl</span>
                    </label>
                    <input
                      type="text"
                      value={editInfluences ?? ''}
                      onChange={(e) => {
                        setEditInfluences(e.target.value);
                        if (profileSaveError) setProfileSaveError(null);
                      }}
                      placeholder="egz: Boukman, Bélo, RAM"
                      className={`w-full bg-[#05070a] border rounded-xl px-3 py-2 text-xs text-white outline-none transition-all ${
                        hasRestrictedPhoneOrDigits(editInfluences)
                          ? 'border-red-500 bg-red-950/20 text-red-200'
                          : 'border-white/[0.12] focus:border-cyan-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Vizyon Atistik</span>
                    </label>
                    <input
                      type="text"
                      value={editVision ?? ''}
                      onChange={(e) => {
                        setEditVision(e.target.value);
                        if (profileSaveError) setProfileSaveError(null);
                      }}
                      placeholder="egz: Mennen son kreyòl la lòtbò dlo"
                      className={`w-full bg-[#05070a] border rounded-xl px-3 py-2 text-xs text-white outline-none transition-all ${
                        hasRestrictedPhoneOrDigits(editVision)
                          ? 'border-red-500 bg-red-950/20 text-red-200'
                          : 'border-white/[0.12] focus:border-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Social Media Handles */}
                <div className="pt-3 border-t border-white/[0.08] space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Rezo Sosyal & Lyen Ofisyèl
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">𝕏 (Twitter Handle)</label>
                      <input
                        type="text"
                        value={editTwitter ?? ''}
                        onChange={(e) => setEditTwitter(e.target.value)}
                        placeholder="@non_ou"
                        className="w-full bg-[#05070a] border border-white/[0.12] focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">📸 Instagram Handle</label>
                      <input
                        type="text"
                        value={editInstagram ?? ''}
                        onChange={(e) => setEditInstagram(e.target.value)}
                        placeholder="@non_ou"
                        className="w-full bg-[#05070a] border border-white/[0.12] focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">🎵 TikTok Handle</label>
                      <input
                        type="text"
                        value={editTiktok ?? ''}
                        onChange={(e) => setEditTiktok(e.target.value)}
                        placeholder="@non_ou"
                        className="w-full bg-[#05070a] border border-white/[0.12] focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">▶️ YouTube Channel / Video Link</label>
                      <input
                        type="url"
                        value={editYoutube ?? ''}
                        onChange={(e) => setEditYoutube(e.target.value)}
                        placeholder="https://youtube.com/..."
                        className="w-full bg-[#05070a] border border-white/[0.12] focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 ${
                      !isArtistActive
                        ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 shadow-lg shadow-red-950/40'
                        : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-xl shadow-cyan-950/40'
                    }`}
                  >
                    {isSavingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : !isArtistActive ? (
                      <>
                        <Lock className="w-4 h-4 text-red-400" />
                        <span>Bloke - Ap Tann Validasyon Admin</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Anrejistre Modifikasyon Biyografi & Pwofil</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: INBOX */}
      {activeTab === 'inbox' && (
        <ArtistInbox
          currentArtist={currentArtist}
          messages={inboxMessages}
          musicList={artistSongs}
          onMessagesUpdated={(updated) => setInboxMessages(updated)}
          onPlaySong={onPlayToggle}
        />
      )}

      {/* VIEW: ESTIMASYON REVNI */}
      {activeTab === 'revenue' && (
        <div className="space-y-8 animate-fadeIn">
          <ArtistRevenueEstimates
            currentArtist={currentArtist}
            artistSongs={artistSongs}
          />
        </div>
      )}

      {/* VIEW: PALMARÈS & TWOFÈ FIZIK (AWARDS & MILESTONES) */}
      {activeTab === 'awards' && (
        <div className="space-y-8 animate-fadeIn">
          <ArtistAwardsShowcase
            currentArtist={currentArtist}
            artistSongs={artistSongs}
            donations={donations}
            exchangeRate={exchangeRate}
          />
        </div>
      )}

      {/* VIEW: ANALYTICS ONLY */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fadeIn">
          <ArtistAnalytics
            currentArtist={currentArtist}
            artistSongs={artistSongs}
            onDownloadPortfolio={handleDownloadPortfolio}
            isGeneratingPdf={isGeneratingPdf}
          />
        </div>
      )}

      {/* VIEW: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* Revenue & Statistics Overview (85% Net Calculation) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Net 85% Cut */}
            <div
              onClick={() => setActiveTab('revenue')}
              className="bg-[#0a0f1d]/90 border border-white/[0.08] hover:border-emerald-500/40 p-5 rounded-2xl relative overflow-hidden backdrop-blur-xl cursor-pointer group transition-all"
              title="Klike pou wè tablo Estimasyon Revni an"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                  Peman Nèt Ou (85%)
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                ${totalArtistNet85}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-yellow-400" /> Règleman: 1ye nan mwa a</span>
                <span className="text-emerald-400 text-[10px] font-bold group-hover:underline">Revni →</span>
              </p>
            </div>

            {/* Total Gross Support */}
            <div
              onClick={() => setActiveTab('revenue')}
              className="bg-[#0a0f1d]/90 border border-white/[0.08] hover:border-yellow-400/40 p-5 rounded-2xl backdrop-blur-xl cursor-pointer group transition-all"
              title="Klike pou wè tablo Estimasyon Revni an"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider group-hover:text-yellow-400 transition-colors">
                  Total Sipò Resevwa
                </span>
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
                ${totalArtistGross.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Platfòm (15%): ${totalAdminCut15}</span>
                <span className="text-yellow-400 text-[10px] font-bold group-hover:underline">Kalkil →</span>
              </p>
            </div>

            {/* Total Listens */}
            <div 
              onClick={() => setActiveTab('analytics')}
              className="bg-[#0a0f1d]/90 border border-white/[0.08] hover:border-blue-400/40 p-5 rounded-2xl backdrop-blur-xl cursor-pointer group transition-all"
              title="Klike pou wè analiz ekout yo"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-400 transition-colors">Total Ekout</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {totalArtistListens.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Chak 5s = 1 ekout</span>
                <span className="text-blue-400 text-[10px] font-bold group-hover:underline">Grafik →</span>
              </p>
            </div>

            {/* Unique Listeners / Oditè Inik (Real Reach) */}
            <div
              onClick={() => setActiveTab('analytics')}
              className="bg-[#0a0f1d]/90 border border-white/[0.08] hover:border-indigo-400/40 p-5 rounded-2xl backdrop-blur-xl cursor-pointer group transition-all"
              title="Klike pou wè analiz detaye sou rive reyèl (reach) odyans ou"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-400 transition-colors">
                  Oditè Inik
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
                {totalArtistUniqueListeners.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>
                  {totalArtistListens > 0
                    ? `${Math.min(100, Math.round((totalArtistUniqueListeners / totalArtistListens) * 100))}% rive reyèl`
                    : 'Moun reyèl ki koute'}
                </span>
                <span className="text-indigo-400 text-[10px] font-bold group-hover:underline">Reach →</span>
              </p>
            </div>

            {/* Total Tracks & Inbox quick link */}
            <div
              onClick={() => setActiveTab('inbox')}
              className="bg-[#0a0f1d]/90 border border-white/[0.08] hover:border-yellow-400/40 p-5 rounded-2xl backdrop-blur-xl cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider group-hover:text-yellow-400 transition-colors">
                  Bwat Lèt / Imèl
                </span>
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono flex items-center gap-2">
                <span>{inboxMessages.length}</span>
                {unreadInboxCount > 0 && (
                  <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full font-sans">
                    {unreadInboxCount} nouvo
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Alèt donasyon & notifikasyon</span>
                <span className="text-yellow-400 text-[10px] font-bold group-hover:underline">Ouvri →</span>
              </p>
            </div>
          </div>

      {/* MONTHLY GOAL & VERIFIED STATUS PROGRESS BAR */}
      <MonthlyGoalProgress
        currentArtist={currentArtist}
        artistSongs={artistSongs}
        badgeInfo={badgeInfo}
        onOpenSocial={onOpenSocial}
        onDownloadPortfolio={handleDownloadPortfolio}
        isGeneratingPdf={isGeneratingPdf}
      />

      {/* ESTIMASYON REVNI - MONTHLY DIRECT SUPPORT ESTIMATION & BREAKDOWN TABLE */}
      <ArtistRevenueEstimates
        currentArtist={currentArtist}
        artistSongs={artistSongs}
      />

      {/* ARTIST ANALYTICS 30-DAY GROWTH LINE CHART */}
      <ArtistAnalytics
        currentArtist={currentArtist}
        artistSongs={artistSongs}
        onDownloadPortfolio={handleDownloadPortfolio}
        isGeneratingPdf={isGeneratingPdf}
      />

      {/* RPA SECTION (Ribrik Pouse Atis) FOR ARTIST DASHBOARD */}
      <div className="bg-[#0a0f1d]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">Ribrik Pouse Atis (RPA) - Rekòmandasyon Admin</h3>
          </div>
          <span className="text-xs text-slate-400">3 Pouse Semèn Sa</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rpaList.slice(0, 3).map((item) => {
            const mediaSource = item.mediaUrl || item.imageUrl || '';
            const isVideo = item.mediaType === 'video' || mediaSource.endsWith('.mp4') || mediaSource.startsWith('data:video');
            const isGif = item.mediaType === 'gif' || mediaSource.toLowerCase().includes('.gif');
            const targetUrl = item.youtubeUrl || item.socialLink || '#';

            return (
              <div key={item.id} className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
                <div>
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative h-32 rounded-xl overflow-hidden mb-3 bg-black border border-white/[0.1] group cursor-pointer"
                    title={`Gade videyo ${item.artistName} sou YouTube`}
                  >
                    {isVideo ? (
                      <div className="relative w-full h-full">
                        <video
                          src={mediaSource}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[8px] text-white flex items-center gap-1 font-semibold border border-white/10">
                          <VolumeX className="w-2.5 h-2.5 text-yellow-400" />
                          <span>San Son</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <img
                          src={mediaSource || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                          alt={item.artistName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {isGif && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-purple-600/80 backdrop-blur-sm text-[8px] text-white font-bold flex items-center gap-1">
                            <Film className="w-2.5 h-2.5" />
                            <span>GIF</span>
                          </div>
                        )}
                      </div>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[9px] uppercase font-black bg-red-600 text-white px-2 py-0.5 rounded shadow">
                      {item.badgeText}
                    </span>
                  </a>

                  <h4 className="font-bold text-sm text-white mt-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-md shadow-red-600/20"
                >
                  <div className="flex items-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5 text-white" />
                    <span>Gade sou YouTube</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* MY MUSIC TABLE */}
      <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="p-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-red-500" />
                <span>Tablo Mizik Mwen Yo</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/[0.08] text-slate-300 border border-white/[0.1]">
                {artistSongs.length} moso
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Moso pèsonèl ou yo ak moso lòt atis te lye kòm kolaborasyon avè w
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center bg-black/40 border border-white/[0.08] p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSongTableFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  songTableFilter === 'all'
                    ? 'bg-white/[0.15] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tout ({artistSongs.length})
              </button>
              <button
                type="button"
                onClick={() => setSongTableFilter('primary')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  songTableFilter === 'primary'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Moso Pèsonèl ({artistSongs.filter(s => s.artistId === currentArtist.id).length})
              </button>
              <button
                type="button"
                onClick={() => setSongTableFilter('collabs')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  songTableFilter === 'collabs'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🤝 Kolaborasyon ({artistSongs.filter(s => s.collab?.artistId === currentArtist.id).length})
              </button>
            </div>

            <button
              onClick={handleOpenAddSong}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
                !isArtistActive
                  ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 shadow-red-950/40'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              {!isArtistActive ? <Lock className="w-4 h-4 text-red-400" /> : <PlusCircle className="w-4 h-4" />}
              <span>{!isArtistActive ? 'Ajoute Nouvo Moso (Bloke)' : 'Ajoute Nouvo Moso'}</span>
            </button>
          </div>
        </div>

        {artistSongs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Ou poko pibliye okenn moso mizik. Klike sou "Ajoute Nouvo Moso" pou kòmanse!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#05070a]/90 text-slate-400 uppercase text-[10px] font-bold border-b border-white/[0.08]">
                <tr>
                  <th className="px-4 py-3.5 text-yellow-400 font-black">Nimewo</th>
                  <th className="px-5 py-3.5">Moso / Tit & Estati</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5">Ekout</th>
                  <th className="px-4 py-3.5 text-indigo-400 font-bold">Oditè Inik</th>
                  <th className="px-4 py-3.5 text-cyan-400">Pataj</th>
                  <th className="px-4 py-3.5">Total Sipò</th>
                  <th className="px-4 py-3.5 text-emerald-400 font-bold">Pati Atis (85%)</th>
                  <th className="px-4 py-3.5 text-slate-400">Pati UpMizik (15%)</th>
                  <th className="px-4 py-3.5 text-right">Aksyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {artistSongs
                  .filter((song) => {
                    if (songTableFilter === 'primary') return song.artistId === currentArtist.id;
                    if (songTableFilter === 'collabs') return song.collab?.artistId === currentArtist.id;
                    return true;
                  })
                  .map((song) => {
                    const isThisPlaying = currentPlayingId === song.id && isPlaying;
                    const cut85 = (song.totalDonations * 0.85).toFixed(2);
                    const cut15 = (song.totalDonations * 0.15).toFixed(2);
                    const isPrimary = song.artistId === currentArtist.id;
                    const isCollab = song.collab?.artistId === currentArtist.id;

                    return (
                      <tr key={song.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-mono">
                            #{song.position || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                              alt={song.title}
                              className="w-10 h-10 rounded-lg object-cover border border-white/[0.08]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="space-y-1">
                              <p className="font-bold text-white text-sm">{song.title}</p>
                              
                              {/* Cross-Link & Collab Tags & Status */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(!song.status || song.status === 'active') ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>Validé (Pibliye)</span>
                                  </span>
                                ) : song.status === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                    <span>Pann (An Atant)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                                    <span>Refize</span>
                                  </span>
                                )}

                                {song.releaseFormat && song.releaseFormat !== 'single' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <span>{song.releaseFormat === 'album' ? '💿 Albòm:' : song.releaseFormat === 'ep' ? '💽 EP:' : song.releaseFormat === 'mixtape' ? '📼 Mixtape:' : '🎙️ Demo:'}</span>
                                    <span>{song.albumName || (song.releaseFormat.toUpperCase())}</span>
                                    {typeof song.trackNumber === 'number' && song.trackNumber > 0 && (
                                      <span className="text-yellow-400 font-mono">#{song.trackNumber}</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                                    🎵 Single
                                  </span>
                                )}

                                {isPrimary ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                    Moso Pa W
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    Kolab sou moso {song.artistName}
                                  </span>
                                )}

                                {song.collab && isPrimary && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                    <Link2 className="w-3 h-3 text-purple-400" />
                                    ft. {song.collab.artistName} ({song.collab.role || 'Kolaborasyon'})
                                  </span>
                                )}

                                {song.feat && !song.collab && (
                                  <span className="text-[11px] text-slate-400">ft. {song.feat}</span>
                                )}

                                {song.credits && song.credits.length > 0 && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                    <span>📜 Kredi ({song.credits.length}):</span>
                                    <span className="truncate max-w-[200px]">
                                      {song.credits.map((c) => `${c.name} (${c.percentage}%)`).join(', ')}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-white/[0.06] text-yellow-400 font-semibold border border-white/[0.08]">
                            {song.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-white">
                          {song.listens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono font-bold text-xs"
                            title="Kantite itilizatè inik ki koute moso sa a (reach reyèl)"
                          >
                            <Users className="w-3 h-3 text-indigo-400" />
                            {StorageService.getSongUniqueListenersCount(song.id, song.listens).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-cyan-400 font-semibold">
                          {(song.sharesCount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-yellow-400">
                          ${song.totalDonations.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-black text-emerald-400 text-sm">
                          ${cut85}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">
                          ${cut15}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onPlayToggle(song)}
                              className={`p-2 rounded-lg transition-all ${
                                isThisPlaying
                                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                  : 'bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12]'
                              }`}
                              title={isThisPlaying ? 'Pòz' : 'Koute'}
                            >
                              {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>

                            {isPrimary && (
                              <>
                                <button
                                  onClick={() => handleOpenEditSong(song)}
                                  className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all"
                                  title="Modifye moso mizik sa"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(song.id)}
                                  className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 transition-all"
                                  title="Efase moso sa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* ADD NEW SONG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#0a0f1d]/95 border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-2xl my-8 backdrop-blur-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Pibliye yon Nouvo Moso Mizik</h3>
                <p className="text-xs text-slate-400">Pou atis: <strong className="text-yellow-400">{currentArtist.stageName}</strong></p>
              </div>
            </div>

            {!isArtistActive && (
              <div className="mb-4 p-4 bg-red-950/80 border-2 border-red-500/80 rounded-2xl flex items-center gap-3 text-xs text-red-200 backdrop-blur-md shadow-xl">
                <Lock className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="font-bold text-white">Ajoute Mizik Bloke:</p>
                  <p className="mt-0.5">Ou pap ka pibliye moso sa toutotan Administratè UpMizik la (Mr clauvens) pa fin valide prèv transfè $4.99 ou an.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAddSongSubmit} className="space-y-4">
              {/* Warning banner for phone number / 5+ consecutive digits */}
              {(addSongError || hasRestrictedPhoneOrDigits(title) || hasRestrictedPhoneOrDigits(feat) || hasRestrictedPhoneOrDigits(albumName)) && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Nimewo telefòn oswa twòp chif entèdi:</p>
                    <p className="text-[11px] text-red-300/90 mt-0.5">
                      {addSongError || RESTRICTED_DIGITS_ERROR_MESSAGE}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tit Moso Mizik la *</label>
                <input
                  type="text"
                  required
                  value={title ?? ''}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (addSongError) setAddSongError(null);
                  }}
                  placeholder="egz: Gouyad Papiyon"
                  className={`w-full bg-[#05070a] border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all ${
                    hasRestrictedPhoneOrDigits(title)
                      ? 'border-red-500 bg-red-950/20 text-red-200'
                      : 'border-white/[0.12] focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Release Format Selector (Single, Album, EP, Mixtape, Demo) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#05070a]/90 border border-white/[0.1] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-yellow-400">
                    Fòma / Tip Pwojè Mizikal la *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Chwazi si se yon moso senp oubyen yon moso nan yon pwojè
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
                      onClick={() => setReleaseFormat(fmt.id as ReleaseFormat)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        releaseFormat === fmt.id
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
                {releaseFormat !== 'single' && (
                  <div className="pt-2 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-yellow-300 mb-1">
                        Non {releaseFormat === 'album' ? 'Albòm nan' : releaseFormat === 'ep' ? 'EP a' : releaseFormat === 'mixtape' ? 'Mixtape la' : 'Demo a'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={albumName ?? ''}
                        onChange={(e) => {
                          setAlbumName(e.target.value);
                          if (addSongError) setAddSongError(null);
                        }}
                        placeholder={
                          releaseFormat === 'album'
                            ? 'egz: "Haiti Cheri", "Lanmou San Fen"'
                            : releaseFormat === 'ep'
                            ? 'egz: "Evolisyon EP", "Premye Vwayaj"'
                            : releaseFormat === 'mixtape'
                            ? 'egz: "Lari a Pale Vol. 1"'
                            : 'egz: "Sesyon Akoustik Studio Demo"'
                        }
                        className={`w-full bg-[#0a0f1d] border rounded-xl px-3 py-2 text-xs text-white outline-none transition-all ${
                          hasRestrictedPhoneOrDigits(albumName)
                            ? 'border-red-500 bg-red-950/20 text-red-200'
                            : 'border-yellow-500/40 focus:border-yellow-400'
                        }`}
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
                        value={trackNumber ?? ''}
                        onChange={(e) => setTrackNumber(e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="egz: 1, 2, 3..."
                        className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-yellow-400 outline-none font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Featuring Tèks (opsyonèl)</label>
                  <input
                    type="text"
                    value={feat ?? ''}
                    onChange={(e) => {
                      setFeat(e.target.value);
                      if (addSongError) setAddSongError(null);
                    }}
                    placeholder="egz: Queen Stèla"
                    className={`w-full bg-[#05070a] border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all ${
                      hasRestrictedPhoneOrDigits(feat)
                        ? 'border-red-500 bg-red-950/20 text-red-200'
                        : 'border-white/[0.12] focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Kategori / Stil *</label>
                  <select
                    value={category ?? 'Kompa'}
                    onChange={(e) => setCategory(e.target.value as MusicCategory)}
                    className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
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
              </div>

              {/* Automatic Position Number Allocation Display */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-bold">Nimewo Mizik la:</span>
                  <span className="px-2 py-0.5 rounded bg-yellow-400 text-slate-950 font-black font-mono">
                    #{StorageService.getNextAvailablePosition()}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  (Lap ale nan espas dènye nimewo ki vid la otomatikman)
                </span>
              </div>

              {/* COLLAB CROSS-LINK FIELD */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Lye yon Atis Kolaboratè (Cross-Link)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-black bg-purple-500/30 text-purple-300">
                          Nouvo
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Chwazi yon atis ki sou UpMizik pou moso sa parèt otomatikman sou pwofil li tou
                      </p>
                    </div>
                  </div>
                  {collabArtistId && (
                    <button
                      type="button"
                      onClick={() => {
                        setCollabArtistId('');
                        setCollabRole('Featuring / Vokal');
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
                    >
                      Retire
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Chwazi Atis Enskri sou UpMizik
                    </label>
                    <select
                      value={collabArtistId ?? ''}
                      onChange={(e) => setCollabArtistId(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                    >
                      <option value="">-- Pa gen kolaboratè lye --</option>
                      {registeredArtists.map((artist) => (
                        <option key={artist.id} value={artist.id}>
                          {artist.stageName} ({artist.city || 'Ayiti'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Wòl / Kredi Kolaborasyon
                    </label>
                    <select
                      value={collabRole ?? 'Featuring / Vokal'}
                      onChange={(e) => setCollabRole(e.target.value)}
                      disabled={!collabArtistId}
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none disabled:opacity-40"
                    >
                      <option value="Featuring / Vokal">Featuring / Vokal</option>
                      <option value="Duet / Ko-Chantè">Duet / Ko-Chantè</option>
                      <option value="Prodiksyon & Beat">Prodiksyon & Beat</option>
                      <option value="Konpozitè / Ekriven">Konpozitè / Ekriven</option>
                      <option value="Gita & Melodi">Gita & Melodi</option>
                      <option value="Mizisyen Envite">Mizisyen Envite</option>
                    </select>
                  </div>
                </div>

                {/* Selected Collab Preview Box */}
                {collabArtistId && (() => {
                  const selectedArtist = registeredArtists.find((a) => a.id === collabArtistId);
                  if (!selectedArtist) return null;
                  return (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <img
                        src={selectedArtist.avatarUrl}
                        alt={selectedArtist.stageName}
                        className="w-10 h-10 rounded-full object-cover border border-purple-400"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-white truncate">{selectedArtist.stageName}</p>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        </div>
                        <p className="text-[11px] text-purple-300">
                          Wòl: <span className="font-semibold text-white">{collabRole}</span>
                        </p>
                        <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
                          ✓ Moso sa pral parèt otomatikman sou pwofil {selectedArtist.stageName} tou!
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* CREDITS & SPLIT SHEETS (POUSANTAJ KOLABORASYON) */}
              <SongCreditsEditor
                credits={credits}
                mainArtistName={currentArtist.stageName}
                registeredArtists={registeredArtists}
                onAddCredit={() => handleAddCredit(false)}
                onRemoveCredit={(id) => handleRemoveCredit(id, false)}
                onUpdateCredit={(id, field, val) => handleUpdateCredit(id, field, val, false)}
              />

              {/* Cover Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Foto Kouvèti (Cover Art)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:bg-white/[0.08] file:text-white file:border-0 hover:file:bg-white/[0.12] cursor-pointer"
                  />
                  {coverPreview && (
                    <img src={coverPreview} alt="Cover" className="w-10 h-10 rounded-lg object-cover border border-blue-500" />
                  )}
                </div>
              </div>

              {/* Audio Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Fichye Odyo (MP3 / WAV)</label>
                  {duration > 0 && (
                    <span className="text-[10px] text-yellow-400 font-mono">Dire: {duration}s</span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/mp3,audio/wav,audio/x-wav"
                  onChange={handleAudioUpload}
                  className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:bg-white/[0.08] file:text-white file:border-0 hover:file:bg-white/[0.12] cursor-pointer"
                />
                {audioPreview && (
                  <p className="text-[10px] text-emerald-400 mt-1">✓ Fichye odyo pare pou piblikasyon.</p>
                )}
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="url"
                  value={youtubeUrl ?? ''}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Lyen YouTube (opsyonèl)"
                  className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                />
                <input
                  type="url"
                  value={tiktokUrl ?? ''}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="Lyen TikTok (opsyonèl)"
                  className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 transition-all shadow-xl ${
                  !isArtistActive
                    ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 shadow-red-950/40'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : !isArtistActive ? (
                  <>
                    <Lock className="w-4 h-4 text-red-400" />
                    <span>Bloke - Ap Tann Validasyon Admin</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Pibliye Moso Sa Sou UpMizik</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SONG MODAL */}
      {editingSong && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingSong(null);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="relative w-full max-w-xl bg-[#0a0f1d]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-7 shadow-2xl my-auto backdrop-blur-2xl max-h-[92dvh] overflow-y-auto">
            <button
              onClick={() => setEditingSong(null)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Modifye Moso Mizik</h3>
                <p className="text-xs text-slate-400">Atis: <strong className="text-yellow-400">{currentArtist.stageName}</strong></p>
              </div>
            </div>

            <form onSubmit={handleEditSongSubmit} className="space-y-4">
              {/* Warning banner for phone number / 5+ consecutive digits */}
              {(editSongError || hasRestrictedPhoneOrDigits(editTitle) || hasRestrictedPhoneOrDigits(editFeat) || hasRestrictedPhoneOrDigits(editAlbumName)) && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Nimewo telefòn oswa twòp chif entèdi:</p>
                    <p className="text-[11px] text-red-300/90 mt-0.5">
                      {editSongError || RESTRICTED_DIGITS_ERROR_MESSAGE}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tit Moso Mizik la *</label>
                <input
                  type="text"
                  required
                  value={editTitle ?? ''}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    if (editSongError) setEditSongError(null);
                  }}
                  placeholder="egz: Gouyad Papiyon"
                  className={`w-full bg-[#05070a] border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all ${
                    hasRestrictedPhoneOrDigits(editTitle)
                      ? 'border-red-500 bg-red-950/20 text-red-200'
                      : 'border-white/[0.12] focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Release Format Selector in Edit Modal */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#05070a]/90 border border-white/[0.1] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-yellow-400">
                    Fòma / Tip Pwojè Mizikal la *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Chanje si se yon moso senp oubyen yon moso nan yon pwojè
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
                      onClick={() => setEditReleaseFormat(fmt.id as ReleaseFormat)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        editReleaseFormat === fmt.id
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
                {editReleaseFormat !== 'single' && (
                  <div className="pt-2 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-yellow-300 mb-1">
                        Non {editReleaseFormat === 'album' ? 'Albòm nan' : editReleaseFormat === 'ep' ? 'EP a' : editReleaseFormat === 'mixtape' ? 'Mixtape la' : 'Demo a'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={editAlbumName ?? ''}
                        onChange={(e) => {
                          setEditAlbumName(e.target.value);
                          if (editSongError) setEditSongError(null);
                        }}
                        placeholder={
                          editReleaseFormat === 'album'
                            ? 'egz: "Haiti Cheri", "Lanmou San Fen"'
                            : editReleaseFormat === 'ep'
                            ? 'egz: "Evolisyon EP", "Premye Vwayaj"'
                            : editReleaseFormat === 'mixtape'
                            ? 'egz: "Lari a Pale Vol. 1"'
                            : 'egz: "Sesyon Akoustik Studio Demo"'
                        }
                        className={`w-full bg-[#0a0f1d] border rounded-xl px-3 py-2 text-xs text-white outline-none transition-all ${
                          hasRestrictedPhoneOrDigits(editAlbumName)
                            ? 'border-red-500 bg-red-950/20 text-red-200'
                            : 'border-yellow-500/40 focus:border-yellow-400'
                        }`}
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
                        value={editTrackNumber ?? ''}
                        onChange={(e) => setEditTrackNumber(e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="egz: 1, 2, 3..."
                        className="w-full bg-[#0a0f1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-yellow-400 outline-none font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Featuring Tèks (opsyonèl)</label>
                  <input
                    type="text"
                    value={editFeat ?? ''}
                    onChange={(e) => {
                      setEditFeat(e.target.value);
                      if (editSongError) setEditSongError(null);
                    }}
                    placeholder="egz: Queen Stèla"
                    className={`w-full bg-[#05070a] border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all ${
                      hasRestrictedPhoneOrDigits(editFeat)
                        ? 'border-red-500 bg-red-950/20 text-red-200'
                        : 'border-white/[0.12] focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Kategori / Stil *</label>
                  <select
                    value={editCategory ?? 'Kompa'}
                    onChange={(e) => setEditCategory(e.target.value as MusicCategory)}
                    className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
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
              </div>

              {/* Locked Current Position Number Display for Artists */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold">Nimewo / Pozisyon:</span>
                  <span className="px-2.5 py-0.5 rounded bg-yellow-400 text-slate-950 font-black font-mono">
                    #{editingSong.position || '-'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  🔒 Se sèlman Administrasyon ki ka chanje nimewo yon mizik
                </span>
              </div>

              {/* COLLAB CROSS-LINK FIELD */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Lye yon Atis Kolaboratè (Cross-Link)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Chwazi yon atis ki sou UpMizik pou moso sa parèt otomatikman sou pwofil li tou
                      </p>
                    </div>
                  </div>
                  {editCollabArtistId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditCollabArtistId('');
                        setEditCollabRole('Featuring / Vokal');
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 font-semibold"
                    >
                      Retire
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Chwazi Atis Enskri sou UpMizik
                    </label>
                    <select
                      value={editCollabArtistId ?? ''}
                      onChange={(e) => setEditCollabArtistId(e.target.value)}
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                    >
                      <option value="">-- Pa gen kolaboratè lye --</option>
                      {registeredArtists.map((artist) => (
                        <option key={artist.id} value={artist.id}>
                          {artist.stageName} ({artist.city || 'Ayiti'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Wòl / Kredi Kolaborasyon
                    </label>
                    <select
                      value={editCollabRole ?? 'Featuring / Vokal'}
                      onChange={(e) => setEditCollabRole(e.target.value)}
                      disabled={!editCollabArtistId}
                      className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none disabled:opacity-40"
                    >
                      <option value="Featuring / Vokal">Featuring / Vokal</option>
                      <option value="Duet / Ko-Chantè">Duet / Ko-Chantè</option>
                      <option value="Prodiksyon & Beat">Prodiksyon & Beat</option>
                      <option value="Konpozitè / Ekriven">Konpozitè / Ekriven</option>
                      <option value="Gita & Melodi">Gita & Melodi</option>
                      <option value="Mizisyen Envite">Mizisyen Envite</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CREDITS & SPLIT SHEETS (POUSANTAJ KOLABORASYON) */}
              <SongCreditsEditor
                credits={editCredits}
                mainArtistName={currentArtist.stageName}
                registeredArtists={registeredArtists}
                onAddCredit={() => handleAddCredit(true)}
                onRemoveCredit={(id) => handleRemoveCredit(id, true)}
                onUpdateCredit={(id, field, val) => handleUpdateCredit(id, field, val, true)}
              />

              {/* Cover Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Foto Kouvèti (Cover Art)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditCoverUpload}
                    className="text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:bg-white/[0.08] file:text-white file:border-0 hover:file:bg-white/[0.12] cursor-pointer"
                  />
                  {editCoverPreview && (
                    <img src={editCoverPreview} alt="Cover" className="w-10 h-10 rounded-lg object-cover border border-blue-500" />
                  )}
                </div>
              </div>

              {/* Audio Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Chanje Fichye Odyo (MP3/WAV)</label>
                  {editDuration > 0 && (
                    <span className="text-[10px] text-yellow-400 font-mono">Dire: {editDuration}s</span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/mp3,audio/wav,audio/x-wav"
                  onChange={handleEditAudioUpload}
                  className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:bg-white/[0.08] file:text-white file:border-0 hover:file:bg-white/[0.12] cursor-pointer"
                />
                {editAudioPreview && (
                  <p className="text-[10px] text-emerald-400 mt-1">✓ Fichye odyo pare pou jwe.</p>
                )}
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="url"
                  value={editYoutubeUrl ?? ''}
                  onChange={(e) => setEditYoutubeUrl(e.target.value)}
                  placeholder="Lyen YouTube (opsyonèl)"
                  className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                />
                <input
                  type="url"
                  value={editTiktokUrl ?? ''}
                  onChange={(e) => setEditTiktokUrl(e.target.value)}
                  placeholder="Lyen TikTok (opsyonèl)"
                  className="bg-[#05070a] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSong(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-all"
                >
                  Anile
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isSubmittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Anrejistre Modifikasyon</span>
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirmId(null);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="relative w-full max-w-sm bg-[#0a0f1d] border border-red-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-center my-auto max-h-[92dvh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Konfime Efase Mizik la?</h3>
              <p className="text-xs text-slate-400 mt-1">Aksyon sa ap retire moso mizik sa nèt sou UpMizik.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300"
              >
                Anile
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50"
              >
                Wi, Efase Li
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Action Alert Dialog Modal */}
      {showBlockedDialog && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBlockedDialog(false);
          }}
        >
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="relative w-full max-w-lg bg-[#0a0f1d] border-2 border-red-500/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-center my-auto max-h-[92dvh] overflow-y-auto">
            <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto shadow-xl shadow-red-950/50">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                {blockedActionTitle || 'Aksyon Sa a Bloke!'}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {blockedActionDescription}
              </p>
            </div>

            <div className="bg-[#05070a] border border-red-500/30 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-yellow-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Kisa pou w fè?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Administratè UpMizik la (<strong>Mr clauvens</strong>) ap verifye transfè <strong>$4.99 USD (723.55 HTG)</strong> ou an sou MonCash/NatCash. Dèske li fin valide l, w ap resevwa yon notifikasyon sou <strong className="text-yellow-300">{currentArtist.email}</strong> epi tout opsyon sou board ou a ap debloke otomatikman.
              </p>
            </div>

            <button
              onClick={() => setShowBlockedDialog(false)}
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white shadow-lg shadow-red-950/50 active:scale-95 transition-all"
            >
              Mwen Konprann
            </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
