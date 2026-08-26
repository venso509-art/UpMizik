export type MusicCategory = 'Tout' | 'Kompa' | 'Drill' | 'Afro' | 'Trap' | 'Rap' | 'Hip-hop' | 'Gouyad' | 'Rabòday' | 'Oflayn';

export type ReleaseFormat = 'single' | 'album' | 'ep' | 'mixtape' | 'demo';

export interface MusicCredit {
  id: string;
  name: string;
  artistId?: string; // If linked to an existing UpMizik registered artist
  role: string; // e.g. 'Featuring', 'Konpozitè / Pawòl', 'Pwodiktè / Beatmaker', 'Mix & Mastering', 'Aranjè', 'Mizisyen'
  percentage: number; // e.g. 20 (meaning 20% of artist royalties/donations)
  phone?: string; // Optional MonCash/Natcash for payouts
  notes?: string;
}

export interface CommentItem {
  id: string;
  musicId: string;
  authorName: string;
  text: string;
  createdAt: string;
  likes: number;
}

export interface CollabInfo {
  artistId: string;
  artistName: string;
  avatarUrl?: string;
  role?: string; // e.g. 'Featuring', 'Duet', 'Prodiksyon', 'Konpozitè'
}

export interface MusicItem {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  feat?: string;
  collab?: CollabInfo; // Cross-linked registered UpMizik artist on both profiles
  category: MusicCategory;
  releaseFormat?: ReleaseFormat; // 'single' | 'album' | 'ep' | 'mixtape' | 'demo'
  albumName?: string; // Non Albòm, EP, Mixtape, oswa Demo a
  trackNumber?: number; // Nimewo track nan pwojè a
  credits?: MusicCredit[]; // Split sheets & Kredi (Pousantaj kolaboratè, beatmaker, konpozitè)
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  listens: number;
  totalDonations: number; // in USD or HTG equivalent
  position?: number;
  youtubeUrl?: string;
  tiktokUrl?: string;
  instagramUrl?: string;
  createdAt: string;
  commentsCount?: number;
  sharesCount?: number;
  likesCount?: number;
  status?: 'active' | 'pending' | 'rejected'; // 'active' = Validé (Pibliye sou sit), 'pending' = Pann (An atant modération), 'rejected' = Refize
  rejectionReason?: string;
}

export interface ArtistUser {
  id: string;
  name: string;
  stageName: string;
  email: string;
  phone: string;
  city: string;
  pin: string; // 4 digits
  avatarUrl: string;
  bio: string; // Full biography & story
  musicalRoots?: string; // Rasin mizikal & estil debaz
  musicalInfluences?: string; // Enspirasyon & atis ki enfliyanse w
  artisticVision?: string; // Vizyon & sa w vle pote nan kilti a
  artistQuote?: string; // Yon fraz oswa deviz pèsonèl
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  registrationProofUrl?: string;
  registrationRejectionReason?: string;
  registrationDate: string;
  totalListens: number;
  totalDonationsReceived: number;
  suspendedAt?: string; // ISO date string when suspension started
  suspendedUntil?: string; // ISO date string when suspension ends
  suspensionDays?: number; // Duration of suspension in days (e.g. 15, 30, 45, etc.)
  suspensionReason?: string; // Specific reason for suspension entered by Admin
  youtubeUrl?: string;
  instagramUrl?: string;
  instagramHandle?: string;
  tiktokUrl?: string;
  tiktokHandle?: string;
  twitterUrl?: string;
  twitterHandle?: string;
  headerBannerUrl?: string; // Custom stylized header banner image URL or Data URI
  bannerGenreTheme?: string; // e.g. Kompa, Drill, Rap, Afro, Rabòday, Gouyad, Rasin
  isPaidThisMonth?: boolean; // True si admin fin voye kòb peman mwa a ba li
  paidDateThisMonth?: string; // Dat ISO egzekisyon peman an
  paidAmountThisMonth?: number; // Montan egzak peman an an USD
  paidReferenceThisMonth?: string; // Nimewo tranzaksyon / referans MonCash/Natcash
}

export interface SocialPostComment {
  id: string;
  postId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string; // ISO string format
  likes: number;
}

export interface SocialPost {
  id: string;
  artistId: string;
  artistName: string;
  stageName: string;
  artistAvatar: string;
  platform: 'twitter' | 'instagram';
  handle: string; // e.g. "@tilou_prince", "@queen_stela509"
  postUrl: string;
  content: string;
  imageUrl?: string;
  timestamp: string; // e.g. "2h de sa", "12h de sa"
  createdAt?: string; // ISO date string
  expiresAt?: string; // ISO date string (Auto-delete after 30 days)
  likes: number;
  commentsCount: number;
  retweetsCount?: number;
  sharesCount?: number;
  associatedSongId?: string;
  associatedSongTitle?: string;
  tags?: string[];
  isPinned?: boolean;
}

export interface DonationItem {
  id: string;
  musicId: string;
  musicTitle: string;
  artistId: string;
  artistName: string;
  amount: number; // in USD or HTG
  currency: 'USD' | 'HTG';
  donorName: string;
  donorPhone: string;
  proofUrl: string;
  paymentMethod?: string;
  status: 'pending' | 'validated' | 'rejected';
  createdAt: string;
  artistShare: number; // 85%
  platformShare: number; // 15% + 0.99
}

export interface ArtistInboxMessage {
  id: string;
  artistId: string;
  artistName: string;
  artistEmail?: string;
  type:
    | 'donation_received'
    | 'donation_pending'
    | 'registration_received'
    | 'account_verified'
    | 'account_rejected'
    | 'account_suspended'
    | 'account_reactivated'
    | 'music_validated'
    | 'music_rejected'
    | 'rpa_featured'
    | 'system_alert'
    | 'payout_received'
    | 'monthly_payout'
    | 'award_received';
  subject: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  previewText: string;
  bodyText: string;
  receivedAt: string;
  isRead: boolean;
  isStarred?: boolean;
  musicDetails?: {
    musicId: string;
    title: string;
    coverUrl?: string;
    category?: string;
    position?: number;
    validatedAt: string;
    adminName?: string;
    rejectionReason?: string;
  };
  awardDetails?: {
    awardType: 'disque_or' | 'disque_platine' | 'trophy_1' | 'trophy_2' | 'trophy_3' | 'trophy_4';
    awardTitle: string;
    milestoneLabel: string;
    category: 'streams' | 'donations';
    deliveredStatus?: 'pending' | 'in_production' | 'ready' | 'delivered';
    certificateCode?: string;
  };
  donationDetails?: {
    donationId: string;
    musicTitle: string;
    musicId: string;
    donorName: string;
    donorPhone: string;
    grossAmount: number;
    currency: 'USD' | 'HTG';
    artistShare85: number;
    platformShare15: number;
    validatedAt: string;
    transactionRef: string;
    paymentMethod?: string;
    adminName?: string;
  };
}

export interface PushNotificationItem {
  id: string;
  targetArtistId: string; // artist ID or 'all'
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  imageUrl?: string;
  data?: {
    type: 'music_validated' | 'music_rejected' | 'donation' | 'account' | 'system';
    musicId?: string;
    artistId?: string;
    url?: string;
    action?: string;
  };
  timestamp: number;
  isRead: boolean;
  actionUrl?: string;
  createdAtStr?: string;
}

export interface ArchiveRecord {
  id: string;
  resetDate: string;
  artistName: string;
  musicTitle: string;
  totalDonations: number;
  artistShare: number;
  platformShare: number;
  period: string;
}

export interface PubItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'gif' | 'video';
  linkUrl: string;
  active: boolean;
  sponsorName: string;
}

export interface RpaItem {
  id: string;
  title: string;
  description: string;
  artistName: string;
  imageUrl: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'gif' | 'video';
  socialLink: string;
  youtubeUrl?: string;
  badgeText: string;
}

export interface AdminUser {
  email: string;
  name: string;
  role: 'super_admin';
}

export interface IntrusionLogItem {
  id: string;
  timestamp: string;
  attemptedEmail: string;
  attemptCount: number;
  stage: 'primary_login' | 'master_key';
  photoUrl: string; // Base64 snapshot or fallback image
  userAgent: string;
  ipPlaceholder?: string;
  status: 'alert' | 'reviewed';
  notes?: string;
  unlockToken?: string; // Secret unlock token sent to admin email to instantly lift lockout
}

export type ActivityEventType =
  | 'echec_connexion_pending'
  | 'echec_connexion_identifiants'
  | 'echec_connexion_rate_limit'
  | 'alerte_force_brute'
  | 'echec_connexion_rejete'
  | 'echec_connexion_suspendu'
  | 'connexion_reussie'
  | 'echec_serveur'
  | 'action_securite'
  | 'suppression_post'
  | 'autre';

export interface ActivityLogItem {
  id: string;
  eventType: ActivityEventType;
  email: string;
  artistId?: string;
  artistName?: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'warning' | 'error' | 'info' | 'success';
  timestamp: string; // ISO date string
}

export type ActiveView = 'public' | 'social' | 'artist_dashboard' | 'admin_dashboard';

export type ThemeMode = 'night' | 'light';

export interface OfflineQueueItem {
  trackId: string;
  trackTitle: string;
  artistName: string;
  coverUrl: string;
  audioUrl: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  errorMsg?: string;
  addedAt: string;
}

export interface OfflinePlaylist {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  trackIds: string[];
  isDefault?: boolean;
}

export type AwardPhysicalDeliveryStatus = 'pending' | 'in_production' | 'ready' | 'delivered';

export interface PhysicalAwardDelivery {
  id: string;
  artistId: string;
  artistName: string;
  awardType: string;
  title?: string;
  awardTitle?: string;
  category?: 'streams' | 'donations';
  threshold?: number;
  status?: AwardPhysicalDeliveryStatus;
  deliveryStatus: AwardPhysicalDeliveryStatus;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  notes?: string;
  adminNotes?: string;
  deliveredAt?: string;
  updatedAt?: string;
  certificateCode?: string;
}

export type PaymentMethodType = 'moncash' | 'natcash' | 'zelle' | 'cashapp' | 'paypal' | 'bank_transfer' | 'custom';

export interface PaymentMethodItem {
  id: string;
  name: string;
  type: PaymentMethodType;
  accountNumberOrId: string;
  accountHolderName: string;
  accountNumber?: string;
  accountName?: string;
  instructions?: string;
  currencySupported?: ('HTG' | 'USD')[];
  badge?: string;
  badgeText?: string;
  isActive: boolean;
  order: number;
  updatedAt?: string;
}

export interface PaymentSettingsConfig {
  htgExchangeRate: number;
  artistRegistrationFeeUsd: number;
  artistRegistrationFeeHtg?: number;
  methods: PaymentMethodItem[];
  globalNotice?: string;
  updatedAt?: string;
}

