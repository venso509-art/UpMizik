import React, { useState, useMemo } from 'react';
import { ArtistUser, ArtistInboxMessage, MusicItem } from '../types';
import { StorageService } from '../utils/storage';
import {
  Mail,
  MailOpen,
  Star,
  Trash2,
  CheckCheck,
  Search,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Download,
  Play,
  ExternalLink,
  Info,
  BadgeCheck,
  Send,
  Wallet,
  Coins,
  Receipt,
  Trophy,
  Disc,
  Crown,
  Award,
  Ban,
  AlertTriangle,
  FileText,
  CheckCircle,
  Music
} from 'lucide-react';

interface ArtistInboxProps {
  currentArtist: ArtistUser;
  messages: ArtistInboxMessage[];
  musicList: MusicItem[];
  onMessagesUpdated: (updatedList: ArtistInboxMessage[]) => void;
  onPlaySong?: (music: MusicItem) => void;
  onShareSuccess?: (text: string) => void;
}

type FilterTab = 'all' | 'unread' | 'donations' | 'starred';

export const ArtistInbox: React.FC<ArtistInboxProps> = ({
  currentArtist,
  messages,
  musicList,
  onMessagesUpdated,
  onPlaySong,
  onShareSuccess
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState(false);

  // Filter and search messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Tab filter
      if (activeFilter === 'unread' && msg.isRead) return false;
      if (activeFilter === 'donations' && msg.type !== 'donation_received' && msg.type !== 'donation_pending') return false;
      if (activeFilter === 'starred' && !msg.isStarred) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        msg.subject.toLowerCase().includes(q) ||
        msg.senderName.toLowerCase().includes(q) ||
        msg.bodyText.toLowerCase().includes(q) ||
        (msg.donationDetails?.donorName && msg.donationDetails.donorName.toLowerCase().includes(q)) ||
        (msg.donationDetails?.musicTitle && msg.donationDetails.musicTitle.toLowerCase().includes(q))
      );
    });
  }, [messages, activeFilter, searchQuery]);

  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find((m) => m.id === selectedMessageId) || null;
  }, [messages, selectedMessageId]);

  const unreadCount = useMemo(() => {
    return messages.filter((m) => !m.isRead).length;
  }, [messages]);

  const handleSelectMessage = (msg: ArtistInboxMessage) => {
    setSelectedMessageId(msg.id);
    if (!msg.isRead) {
      StorageService.markArtistMessageAsRead(msg.id);
      const updated = messages.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m));
      onMessagesUpdated(updated);
    }
  };

  const handleToggleStar = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    const newStarred = StorageService.toggleStarArtistMessage(msgId);
    const updated = messages.map((m) => (m.id === msgId ? { ...m, isStarred: newStarred } : m));
    onMessagesUpdated(updated);
  };

  const handleDeleteMessage = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    StorageService.deleteArtistInboxMessage(msgId);
    const updated = messages.filter((m) => m.id !== msgId);
    onMessagesUpdated(updated);
    if (selectedMessageId === msgId) {
      setSelectedMessageId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleMarkAllRead = () => {
    StorageService.markAllArtistMessagesAsRead(currentArtist.id);
    const updated = messages.map((m) => ({ ...m, isRead: true }));
    onMessagesUpdated(updated);
  };

  const handleCopyReceipt = (msg: ArtistInboxMessage) => {
    if (!msg.donationDetails) return;
    const d = msg.donationDetails;
    const text = `🧾 RESI OFISYÈL UPMIZIK\n------------------------\nMoso: ${d.musicTitle}\nDonatè: ${d.donorName}\nTotal Donasyon: ${d.grossAmount.toFixed(2)} ${d.currency}\nPati Nèt Atis (85%): ${d.artistShare85.toFixed(2)} USD\nReferans: #${d.transactionRef}\nDat: ${d.validatedAt}\nValide pa: ${d.adminName || 'Clauvens Venso'}\nhttps://upmizik.com`;
    
    navigator.clipboard.writeText(text);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2500);
  };

  const getAssociatedSong = (musicId?: string) => {
    if (!musicId) return null;
    return musicList.find((m) => m.id === musicId) || null;
  };

  return (
    <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl animate-fadeIn">
      {/* Top Banner & Control Bar */}
      <div className="p-5 sm:p-6 border-b border-white/[0.08] bg-gradient-to-r from-[#0d162a] via-[#0a0f1d] to-[#140f26]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center shadow-lg shadow-yellow-500/10 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                  Bwat Lèt & Notifikasyon Imèl
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-md shadow-blue-600/30 animate-pulse">
                    {unreadCount} nouvo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Imèl Notifikasyon Ofisyèl: <strong className="text-yellow-400">{currentArtist.email || `${currentArtist.stageName.toLowerCase().replace(/\s+/g, '')}@upmizik.com`}</strong></span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <BadgeCheck className="w-3 h-3" /> Sèvè SMTP UpMizik Aktif
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors"
                title="Make tout mesaj yo kòm li"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Make Tout Kòm Li</span>
              </button>
            )}
            <div className="text-xs text-slate-400 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.06] font-mono">
              Total: <strong className="text-white">{messages.length}</strong> imèl
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'all'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              Tout Mesaj ({messages.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'unread'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              <span>Pa Li</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-blue-700 text-[10px] flex items-center justify-center font-black">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter('donations')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'donations'
                  ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-950/40'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Sipò & Donasyon</span>
            </button>
            <button
              onClick={() => setActiveFilter('starred')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'starred'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/40'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Favori</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery ?? ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chèche nan imèl yo..."
              className="w-full bg-[#05070a] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-400/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Mailbox Workspace: Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Column: Email Message List */}
        <div className={`lg:col-span-5 border-r border-white/[0.08] bg-[#070b16]/70 flex flex-col ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
          {filteredMessages.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center my-auto">
              <MailOpen className="w-12 h-12 text-slate-600 mb-3 opacity-50" />
              <p className="text-sm font-semibold text-slate-400">Pa gen okenn imèl nan seksyon sa a.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Chak fwa yon administratè valide yon sipò MonCash/Natcash, w ap resevwa yon alèt otomatik isit la.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04] overflow-y-auto max-h-[620px] scrollbar-thin">
              {filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isDonation = msg.type === 'donation_received' || msg.type === 'donation_pending';

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 cursor-pointer transition-all relative ${
                      isSelected
                        ? 'bg-blue-600/15 border-l-4 border-l-blue-500'
                        : msg.isRead
                        ? 'hover:bg-white/[0.03] opacity-80 hover:opacity-100'
                        : 'bg-white/[0.04] hover:bg-white/[0.07] border-l-4 border-l-yellow-400 font-semibold'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Unread indicator */}
                        {!msg.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-sm shadow-blue-400" />
                        )}
                        
                        {/* Type Icon Badge */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            msg.type === 'award_received'
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                              : msg.type === 'music_validated'
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : msg.type === 'music_rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : msg.type === 'payout_received'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : msg.type === 'donation_received'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : msg.type === 'donation_pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : msg.type === 'account_verified' || msg.type === 'account_reactivated'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : msg.type === 'account_suspended'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : msg.type === 'account_rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : msg.type === 'registration_received'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {msg.type === 'award_received' ? (
                            <Trophy className="w-3.5 h-3.5" />
                          ) : msg.type === 'music_validated' ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : msg.type === 'music_rejected' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : msg.type === 'payout_received' ? (
                            <Wallet className="w-3.5 h-3.5" />
                          ) : msg.type === 'donation_received' ? (
                            <DollarSign className="w-3.5 h-3.5" />
                          ) : msg.type === 'donation_pending' ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : msg.type === 'account_suspended' ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : msg.type === 'account_rejected' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : msg.type === 'registration_received' ? (
                            <FileText className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <span className={`text-xs truncate ${!msg.isRead ? 'text-white font-bold' : 'text-slate-300'}`}>
                          {msg.senderName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleToggleStar(e, msg.id)}
                          className={`p-1 rounded hover:bg-white/[0.1] transition-colors ${
                            msg.isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={msg.isStarred ? 'Retire nan favori' : 'Mete nan favori'}
                        >
                          <Star className={`w-3.5 h-3.5 ${msg.isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono">{msg.receivedAt}</span>
                      </div>
                    </div>

                    <h4 className={`text-xs truncate mb-1 ${!msg.isRead ? 'text-white font-bold' : 'text-slate-200'}`}>
                      {msg.subject}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {msg.previewText || msg.bodyText}
                    </p>

                    {/* Quick badge if award */}
                    {msg.type === 'award_received' && msg.awardDetails && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/30 text-amber-300 border border-amber-400/50 px-2 py-0.5 rounded-md shadow-sm shadow-amber-500/10">
                          <Trophy className="w-3 h-3 text-yellow-400 animate-pulse" />
                          <span>{msg.awardDetails.awardTitle} ({msg.awardDetails.milestoneLabel})</span>
                        </span>
                        <span className="text-[10px] text-yellow-400/90 font-mono font-bold">
                          Palmarès UpMizik
                        </span>
                      </div>
                    )}

                    {/* Quick badge if payout */}
                    {msg.type === 'payout_received' && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono">
                          <CheckCheck className="w-3 h-3 text-emerald-400" />
                          <span>Peman Valide & Peye (✅)</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">
                          UpMizik Finans
                        </span>
                      </div>
                    )}

                    {/* Quick badge if suspended */}
                    {msg.type === 'account_suspended' && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-md font-mono">
                          <Ban className="w-3 h-3 text-red-400" />
                          <span>Avi Sispansyon Tanporè</span>
                        </span>
                        <span className="text-[10px] text-red-400 font-mono font-bold">
                          Admin Sekirite
                        </span>
                      </div>
                    )}

                    {/* Quick badge if donation */}
                    {msg.donationDetails && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md font-mono ${
                          msg.type === 'donation_pending'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {msg.type === 'donation_pending' ? '🟡 An Atant' : `+$ ${msg.donationDetails.artistShare85.toFixed(2)} Nèt (85%)`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Ref: #{msg.donationDetails.transactionRef}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Email Reader Pane */}
        <div className={`lg:col-span-7 bg-[#05070a]/90 flex flex-col justify-between ${!selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
          {selectedMessage ? (
            <div className="p-6 sm:p-8 flex flex-col h-full overflow-y-auto max-h-[620px] scrollbar-thin">
              {/* Top Navigation Bar inside email reader */}
              <div className="mb-4 pb-3 border-b border-white/[0.08] flex items-center justify-between">
                <button
                  type="button"
                  id="btn-back-to-inbox-list"
                  onClick={() => setSelectedMessageId(null)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-yellow-400 hover:text-slate-950 text-xs text-yellow-400 font-bold transition-all border border-yellow-400/30 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Retounen nan Lis Imèl</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteMessage(e, selectedMessage.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors"
                    title="Efase imèl sa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Email Header Card */}
              <div className="bg-[#0a0f1d]/95 border border-white/[0.08] rounded-2xl p-5 mb-6 backdrop-blur-md relative">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-lg sm:text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif] leading-snug">
                    {selectedMessage.subject}
                  </h3>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handleToggleStar(e, selectedMessage.id)}
                      className={`p-2 rounded-xl border border-white/[0.08] transition-colors ${
                        selectedMessage.isStarred
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white'
                      }`}
                      title="Favori"
                    >
                      <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteMessage(e, selectedMessage.id)}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-600/20 text-slate-400 hover:text-red-400 border border-white/[0.08] transition-colors"
                      title="Efase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sender & Recipient Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-xs text-slate-300">
                  <div>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span>{selectedMessage.senderName}</span>
                      <span className="text-slate-400 font-mono font-normal">&lt;{selectedMessage.senderEmail}&gt;</span>
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Pou: <span className="text-slate-300">{selectedMessage.artistName}</span> &lt;{selectedMessage.recipientEmail}&gt;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-yellow-400" />
                      {selectedMessage.receivedAt}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> SPF/DKIM OK
                    </span>
                  </div>
                </div>
              </div>

              {/* RICH TRANSACTIONAL RECEIPT VOUCHER (If Donation Received Alert) */}
              {selectedMessage.donationDetails && (
                <div className="mb-6 relative bg-gradient-to-br from-[#121c33] via-[#0c1222] to-[#1c152e] border-2 border-yellow-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Voucher Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.1] mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-yellow-400/20">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-black text-yellow-400">
                          Resi Ofisyèl Sipò Finansyè
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          Platfòm UpMizik Ayiti • Sèvis Peman Valide
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] uppercase text-slate-400 block">Referans Inik</span>
                      <span className="text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded border border-white/[0.1]">
                        #{selectedMessage.donationDetails.transactionRef}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-slate-400">Moso Mizik:</span>
                        <span className="font-bold text-white text-right">{selectedMessage.donationDetails.musicTitle}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-slate-400">Donatè Fanatik:</span>
                        <span className="font-semibold text-yellow-300 text-right">{selectedMessage.donationDetails.donorName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-slate-400">Telefòn Donatè:</span>
                        <span className="font-mono text-slate-300 text-right">{selectedMessage.donationDetails.donorPhone || 'Prive'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-slate-400">Metòd / Validatè:</span>
                        <span className="text-slate-300 text-right">{selectedMessage.donationDetails.adminName || 'Clauvens Venso (Admin)'}</span>
                      </div>
                    </div>

                    {/* Amount & Payout Calculation Box */}
                    <div className="bg-[#050811]/90 border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Montan Total Sipò:</span>
                          <span className="font-mono font-bold text-white">
                            ${selectedMessage.donationDetails.grossAmount.toFixed(2)} {selectedMessage.donationDetails.currency}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Frè UpMizik (15%):</span>
                          <span className="font-mono text-slate-400">
                            -${selectedMessage.donationDetails.platformShare15.toFixed(2)} USD
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Pati Nèt Ou (85%)</span>
                          <span className="text-xs text-slate-400">Kredite nan bous ou</span>
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                          ${selectedMessage.donationDetails.artistShare85.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={() => handleCopyReceipt(selectedMessage)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center gap-1.5 transition-colors border border-white/[0.08]"
                    >
                      {copiedTx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-yellow-400" />}
                      <span>{copiedTx ? 'Resi Kopye!' : 'Kopye Resi'}</span>
                    </button>

                    {/* Play associated track if available */}
                    {(() => {
                      const song = getAssociatedSong(selectedMessage.donationDetails.musicId);
                      if (song && onPlaySong) {
                        return (
                          <button
                            onClick={() => onPlaySong(song)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Koute "{song.title}"</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* Award Details Certificate Banner (If Award Received) */}
              {selectedMessage.type === 'award_received' && selectedMessage.awardDetails && (
                <div className="mb-6 bg-gradient-to-br from-[#1a1408] via-[#0f1424] to-[#0a0f1d] border-2 border-yellow-400/50 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-yellow-400/20 pb-4 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-yellow-500/20 shrink-0 font-black">
                        {selectedMessage.awardDetails.category === 'streams' ? (
                          <Disc className="w-7 h-7" />
                        ) : (
                          <Trophy className="w-7 h-7" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">
                          Sètifika Palmarès & Distenksyon
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-white">
                          {selectedMessage.awardDetails.awardTitle}
                        </h4>
                        <p className="text-xs text-yellow-300/80 font-medium">
                          Nivo Rekò: <strong>{selectedMessage.awardDetails.milestoneLabel}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right font-mono">
                      <span className="text-[10px] uppercase text-slate-400 block">Kòd Sètifika</span>
                      <span className="text-xs font-black text-yellow-300 bg-black/60 px-3 py-1 rounded-xl border border-yellow-400/30 inline-block">
                        #{selectedMessage.awardDetails.certificateCode || 'UPM-AWARD-OFISYÈL'}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-black/40 border border-white/[0.08] rounded-2xl p-4 mb-3">
                    <div className="space-y-1.5">
                      <div className="text-slate-400">
                        🏆 <strong>Kategori:</strong> {selectedMessage.awardDetails.category === 'streams' ? 'Ekout / Streams (Plak)' : 'Donasyon & Sipò Finansye (Twofe)'}
                      </div>
                      <div className="text-slate-400">
                        👤 <strong>Titilè Distenksyon:</strong> <span className="text-white font-bold">{selectedMessage.artistName}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-slate-400">
                        📦 <strong>Estati Plak / Twofe Fizik:</strong>{' '}
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-400/30">
                          🛠️ An Preparasyon & Gravi
                        </span>
                      </div>
                      <div className="text-slate-400">
                        📍 <strong>Remiz:</strong> Ekip UpMizik la ap kontakte w sou telefòn ou pou remiz fizik la.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Music Validated Banner (If Music Validated by Admin) */}
              {selectedMessage.type === 'music_validated' && (
                <div className="mb-6 bg-gradient-to-br from-[#062016] via-[#091f24] to-[#0a0f1d] border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4 mb-4">
                    <div className="flex items-center gap-3.5">
                      {selectedMessage.musicDetails?.coverUrl ? (
                        <img
                          src={selectedMessage.musicDetails.coverUrl}
                          alt={selectedMessage.musicDetails.title}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400/40 shadow-lg shadow-emerald-500/20 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 font-black">
                          <CheckCircle className="w-7 h-7" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-400/30">
                            🟢 Validé & Pibliye sou UpMizik
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white">
                          {selectedMessage.musicDetails?.title || selectedMessage.subject}
                        </h4>
                        <p className="text-xs text-emerald-300/80 font-medium flex items-center gap-1">
                          <span>Kategori: <strong>{selectedMessage.musicDetails?.category || 'Mizik Ayisyen'}</strong></span>
                          {selectedMessage.musicDetails?.position && (
                            <span className="font-mono text-emerald-400 font-bold">• Pozisyon #{selectedMessage.musicDetails.position}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right font-mono">
                      <span className="text-[10px] uppercase text-slate-400 block">Validatè</span>
                      <span className="text-xs font-black text-emerald-300 bg-black/60 px-3 py-1 rounded-xl border border-emerald-400/30 inline-block">
                        {selectedMessage.musicDetails?.adminName || 'Mr Clauvens (Admin)'}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-black/40 border border-white/[0.08] rounded-2xl p-4 mb-4">
                    <div className="space-y-1.5">
                      <div className="text-slate-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mizik sa a disponib pou tout fanatik sou paj akèy la.</span>
                      </div>
                      <div className="text-slate-300 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Ou ap resevwa <strong>85%</strong> nan tout sipò finansyè fanatik yo voye.</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-slate-300 flex items-center gap-1.5">
                        <Disc className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Konte ekout (streams) ak donasyon ap mete ajou an tan reyèl.</span>
                      </div>
                      <div className="text-slate-400">
                        🗓️ <strong>Dat Validasyon:</strong> {selectedMessage.musicDetails?.validatedAt || selectedMessage.receivedAt}
                      </div>
                    </div>
                  </div>

                  {/* Actions for validated music */}
                  <div className="relative z-10 flex flex-wrap items-center gap-2">
                    {(() => {
                      const songId = selectedMessage.musicDetails?.musicId;
                      const song = songId ? getAssociatedSong(songId) : null;
                      if (song && onPlaySong) {
                        return (
                          <button
                            onClick={() => onPlaySong(song)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Koute Moso a Kounye a</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    <button
                      onClick={() => {
                        const songId = selectedMessage.musicDetails?.musicId;
                        const shareUrl = songId ? `${window.location.origin}/#track-${songId}` : window.location.href;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(shareUrl);
                          if (onShareSuccess) {
                            onShareSuccess(`Lyen moso mizik la kopye: ${shareUrl}`);
                          }
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center gap-1.5 transition-colors border border-white/[0.08]"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pataje Lyen Mizik la</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Email Body Content */}
              <div className="bg-[#080d1a]/80 border border-white/[0.06] rounded-2xl p-6 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans backdrop-blur-sm">
                {selectedMessage.bodyText}
              </div>

              {/* Email Security & Signature Footer */}
              <div className="mt-8 pt-6 border-t border-white/[0.06] text-slate-500 text-[11px] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p>
                    Mesaj sa a voye otomatikman pa <strong>UpMizik Mail Relay System</strong> pou atis verifye.
                  </p>
                  <span className="font-mono text-slate-600">ID: {selectedMessage.id}</span>
                </div>
                <p className="text-slate-600">
                  © 2026 UpMizik Ayiti. Tout dwa rezève. Peman ak règleman nèt 85% fèt chak 1ye nan mwa a.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center my-auto">
              <Mail className="w-12 h-12 text-slate-600 mb-3 opacity-40" />
              <p className="text-sm font-semibold text-slate-400">Chwazi yon imèl nan lis la pou li l.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
