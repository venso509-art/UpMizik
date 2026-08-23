import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Download,
  ListMusic,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  FolderPlus,
  Music,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
  Disc3
} from 'lucide-react';
import { MusicItem, OfflinePlaylist, OfflineQueueItem } from '../types';
import { offlineManager } from '../utils/offlineManager';

interface OfflinePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  musicList: MusicItem[];
  currentTrack: MusicItem | null;
  isPlaying: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onPlayPlaylist?: (tracks: MusicItem[]) => void;
  onToast?: (type: 'success' | 'info' | 'error', text: string) => void;
  initialTab?: 'playlists' | 'queue' | 'add';
}

export const OfflinePlaylistModal: React.FC<OfflinePlaylistModalProps> = ({
  isOpen,
  onClose,
  musicList,
  currentTrack,
  isPlaying,
  onPlayToggle,
  onPlayPlaylist,
  onToast,
  initialTab = 'playlists'
}) => {
  const [activeTab, setActiveTab] = useState<'playlists' | 'queue' | 'add'>(initialTab);
  const [playlists, setPlaylists] = useState<OfflinePlaylist[]>(() => offlineManager.getPlaylists());
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('default-offline-playlist');
  const [queue, setQueue] = useState<OfflineQueueItem[]>(() => offlineManager.getQueue());
  const [isDownloading, setIsDownloading] = useState<boolean>(() => offlineManager.getIsBatchDownloading());
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [cachedTrackIds, setCachedTrackIds] = useState<string[]>(() => offlineManager.getCachedTrackIds());
  const [isOnline, setIsOnline] = useState<boolean>(() => offlineManager.getIsOnline());

  // Form states for creating new playlist
  const [showNewPlaylistForm, setShowNewPlaylistForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Add tracks tab search & selection
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrackIdsToAdd, setSelectedTrackIdsToAdd] = useState<string[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  // Automatically scroll content to top whenever tab or playlist changes or modal opens
  useEffect(() => {
    if (isOpen) {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setIsClosing(false);
    }
  }, [isOpen, activeTab, selectedPlaylistId]);

  // Subscriptions to offlineManager
  useEffect(() => {
    const unsubPlaylist = offlineManager.onPlaylistChange((updatedPlaylists) => {
      setPlaylists(updatedPlaylists);
      if (!updatedPlaylists.some((p) => p.id === selectedPlaylistId) && updatedPlaylists.length > 0) {
        setSelectedPlaylistId(updatedPlaylists[0].id);
      }
    });

    const unsubQueue = offlineManager.onQueueChange((updatedQueue, downloading, progress) => {
      setQueue(updatedQueue);
      setIsDownloading(downloading);
      setOverallProgress(progress);
    });

    const unsubCache = offlineManager.onCacheChange((cachedIds) => {
      setCachedTrackIds(cachedIds);
    });

    const unsubNet = offlineManager.onNetworkChange((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubPlaylist();
      unsubQueue();
      unsubCache();
      unsubNet();
    };
  }, [selectedPlaylistId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Selected playlist object
  const currentPlaylist = useMemo(() => {
    return playlists.find((p) => p.id === selectedPlaylistId) || playlists[0] || null;
  }, [playlists, selectedPlaylistId]);

  // Map playlist track IDs to MusicItems
  const playlistTracks = useMemo(() => {
    if (!currentPlaylist) return [];
    return currentPlaylist.trackIds
      .map((id) => musicList.find((m) => m.id === id))
      .filter((m): m is MusicItem => Boolean(m));
  }, [currentPlaylist, musicList]);

  // Filtered tracks for "Add Tracks" tab
  const filteredAvailableTracks = useMemo(() => {
    const query = trackSearch.toLowerCase().trim();
    return musicList.filter((m) => {
      const matchesQuery =
        !query ||
        m.title.toLowerCase().includes(query) ||
        m.artistName.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query);
      return matchesQuery;
    });
  }, [musicList, trackSearch]);

  // Queue stats
  const pendingCount = useMemo(() => queue.filter((q) => q.status === 'pending').length, [queue]);
  const completedCount = useMemo(() => queue.filter((q) => q.status === 'completed').length, [queue]);
  const errorCount = useMemo(() => queue.filter((q) => q.status === 'error').length, [queue]);

  // Total estimated MB calculation (~3.8MB avg per song)
  const estimatedStorageMb = (cachedTrackIds.length * 3.8).toFixed(1);

  if (!isOpen) return null;

  // Handlers
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = offlineManager.createPlaylist(newTitle, newDescription);
    setSelectedPlaylistId(created.id);
    setNewTitle('');
    setNewDescription('');
    setShowNewPlaylistForm(false);
    onToast?.('success', `Playlist Oflayn "${created.title}" kreye avèk siksè!`);
  };

  const handleDeletePlaylist = (id: string, title: string) => {
    if (window.confirm(`Èske ou vle retire playlist "${title}" la?`)) {
      offlineManager.deletePlaylist(id);
      onToast?.('info', `Playlist "${title}" retire.`);
    }
  };

  const handleRemoveTrack = (trackId: string, trackTitle: string) => {
    if (currentPlaylist) {
      offlineManager.removeTrackFromPlaylist(currentPlaylist.id, trackId);
      onToast?.('info', `"${trackTitle}" retire nan playlist la.`);
    }
  };

  const handleStartBatchDownload = async () => {
    if (!isOnline) {
      onToast?.('error', 'Ou pa gen koneksyon entènèt kounye a pou telechaje nouvo mizik.');
      return;
    }

    onToast?.('info', 'Telechajman an pakèt kòmanse! Tanpri rete sou paj la...');
    const result = await offlineManager.startBatchDownload();
    if (result.downloaded > 0) {
      onToast?.('success', `🎉 ${result.downloaded} mizik telechaje avèk siksè pou koute san entènèt!`);
    } else if (result.failed > 0) {
      onToast?.('error', `Gen ${result.failed} mizik ki pa ka telechaje. Verifye koneksyon an.`);
    }
  };

  const handleAddSelectedTracksToPlaylistAndQueue = (downloadNow: boolean = false) => {
    if (selectedTrackIdsToAdd.length === 0) return;

    const tracksToAdd = musicList.filter((m) => selectedTrackIdsToAdd.includes(m.id));
    if (currentPlaylist) {
      tracksToAdd.forEach((t) => {
        offlineManager.addTrackToPlaylist(currentPlaylist.id, t.id);
      });
    }

    // Add to download queue
    const addedToQ = offlineManager.addToQueue(tracksToAdd, currentPlaylist?.id);
    setSelectedTrackIdsToAdd([]);
    setActiveTab('queue');

    onToast?.(
      'success',
      `Ajoute ${tracksToAdd.length} mizik nan "${currentPlaylist?.title || 'Playlist Oflayn'}" ak nan ke telechajman an!`
    );

    if (downloadNow && isOnline) {
      setTimeout(() => {
        offlineManager.startBatchDownload();
      }, 300);
    }
  };

  const handleToggleTrackSelection = (id: string) => {
    setSelectedTrackIdsToAdd((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePlayAllTracks = () => {
    if (playlistTracks.length === 0) return;
    if (onPlayPlaylist) {
      onPlayPlaylist(playlistTracks);
    } else {
      onPlayToggle(playlistTracks[0]);
    }
    onToast?.('info', `Ap jwe "${currentPlaylist?.title}" (${playlistTracks.length} mizik)`);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/85 backdrop-blur-md p-2 sm:p-4 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
        <div
          id="offline-playlist-modal-container"
          className={`relative w-full max-w-4xl max-h-[92dvh] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white my-auto ${
            isClosing ? 'animate-modal-out' : 'animate-modal-in'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Top Header Banner */}
        <div className="p-4 sm:p-6 border-b border-white/[0.08] bg-gradient-to-r from-blue-950/80 via-slate-900 to-red-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-red-500 to-blue-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Disc3 className="w-6 h-6 text-amber-400 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Jesyonè Playlist Oflayn & Ke Telechajman
                </h2>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isOnline ? 'An Liy' : 'Mòd Oflayn'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kreye playlist pèsonalize, ajoute moso nan yon ke, epi telechaje tout an pakèt pou koute san entènèt.
              </p>
            </div>
          </div>

          {/* Quick Storage Badge & Close */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>
                <strong className="text-white">{cachedTrackIds.length}</strong> mizik kache (~{estimatedStorageMb} MB)
              </span>
            </div>
            <button
              id="offline-modal-close-btn"
              onClick={handleClose}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] text-slate-400 hover:text-white transition-all active:scale-95"
              aria-label="Fèmen fenèt la"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 border-b border-white/[0.08] bg-slate-950/60 overflow-x-auto gap-2">
          <div className="flex items-center gap-2">
            <button
              id="tab-offline-playlists"
              onClick={() => setActiveTab('playlists')}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'playlists'
                  ? 'border-red-500 text-white bg-slate-900/90 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <ListMusic className="w-4 h-4 text-red-400" />
              <span>Playlist Oflayn Yo</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-300 font-mono">
                {playlists.length}
              </span>
            </button>

            <button
              id="tab-download-queue"
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 relative ${
                activeTab === 'queue'
                  ? 'border-amber-500 text-white bg-slate-900/90 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Ke Telechajman</span>
              {pendingCount > 0 && (
                <span className="animate-pulse text-[11px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-mono font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              id="tab-add-tracks"
              onClick={() => setActiveTab('add')}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'add'
                  ? 'border-blue-500 text-white bg-slate-900/90 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Ajoute Mizik</span>
              {selectedTrackIdsToAdd.length > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-500/30 text-blue-300 font-mono font-bold">
                  {selectedTrackIdsToAdd.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setShowNewPlaylistForm(!showNewPlaylistForm)}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 mb-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md active:scale-95 transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Kreye Nouvo Playlist</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-900/95">
          {/* ======================= TAB 1: PLAYLISTS ======================= */}
          {activeTab === 'playlists' && (
            <div className="space-y-6">
              {/* Form to create new playlist */}
              {showNewPlaylistForm && (
                <form
                  onSubmit={handleCreatePlaylist}
                  className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950/40 border border-blue-500/30 animate-slideDown shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-blue-400" />
                      Kreye Yon Nouvo Playlist Oflayn
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowNewPlaylistForm(false)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Non Playlist la *</label>
                      <input
                        type="text"
                        required
                        value={newTitle ?? ''}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Eg: Kompa Vwayaj, Party Rabòday..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Deskripsyon (Opsyonèl)</label>
                      <input
                        type="text"
                        value={newDescription ?? ''}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Eg: Pi bon seleksyon pou koute san entènèt"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewPlaylistForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-white/[0.08]"
                    >
                      Anile
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95 transition-all"
                    >
                      Anrejistre Playlist
                    </button>
                  </div>
                </form>
              )}

              {/* Playlist selector chips / tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlaylistId(p.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border shrink-0 ${
                      selectedPlaylistId === p.id
                        ? 'bg-gradient-to-r from-red-600/30 to-blue-600/30 border-red-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Disc3 className={`w-3.5 h-3.5 ${selectedPlaylistId === p.id ? 'text-yellow-400' : 'text-slate-500'}`} />
                    <span>{p.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.1] font-mono">
                      {p.trackIds.length}
                    </span>
                  </button>
                ))}

                <button
                  onClick={() => setShowNewPlaylistForm(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kreye Nouvo</span>
                </button>
              </div>

              {/* Active Playlist Detail & Tracks */}
              {currentPlaylist && (
                <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-4 sm:p-5 space-y-4">
                  {/* Playlist Header details */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-white">{currentPlaylist.title}</h3>
                        {currentPlaylist.isDefault && (
                          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Prensipal
                          </span>
                        )}
                      </div>
                      {currentPlaylist.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{currentPlaylist.description}</p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
                        <span>{playlistTracks.length} moso mizik</span>
                        <span>•</span>
                        <span>
                          {playlistTracks.filter((t) => cachedTrackIds.includes(t.id)).length} telechaje pou oflayn
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {playlistTracks.length > 0 && (
                        <button
                          id="btn-play-all-offline-playlist"
                          onClick={handlePlayAllTracks}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-950/40 active:scale-95 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Jwe Tout ({playlistTracks.length})</span>
                        </button>
                      )}

                      <button
                        onClick={() => setActiveTab('add')}
                        className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajoute Moso</span>
                      </button>

                      {!currentPlaylist.isDefault && (
                        <button
                          onClick={() => handleDeletePlaylist(currentPlaylist.id, currentPlaylist.title)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Efase Playlist sa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tracks List */}
                  {playlistTracks.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-900/60 rounded-xl border border-dashed border-slate-800">
                      <Disc3 className="w-10 h-10 text-slate-600 mx-auto mb-2.5 animate-spin-slow" />
                      <h4 className="text-sm font-bold text-slate-300">Playlist sa poko gen mizik</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                        Klike sou bouton "Ajoute Moso" anba a pou chwazi plizyè mizik ou vle koute san entènèt.
                      </p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition-all shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chwazi Mizik Pou Ajoute</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {playlistTracks.map((track, idx) => {
                        const isCached = cachedTrackIds.includes(track.id);
                        const isCurrent = currentTrack?.id === track.id;

                        return (
                          <div
                            key={track.id}
                            className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                              isCurrent
                                ? 'bg-red-950/40 border-red-500/40 shadow-sm'
                                : 'bg-slate-900/70 border-white/[0.04] hover:bg-slate-800/80 hover:border-white/[0.1]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-mono font-bold text-slate-500 w-4 text-right shrink-0">
                                {idx + 1}
                              </span>

                              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 group cursor-pointer"
                                onClick={() => onPlayToggle(track)}
                              >
                                <img
                                  src={track.coverUrl}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isCurrent && isPlaying ? (
                                    <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 text-white fill-current" />
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p
                                    onClick={() => onPlayToggle(track)}
                                    className={`text-xs sm:text-sm font-bold truncate cursor-pointer hover:underline ${
                                      isCurrent ? 'text-yellow-400' : 'text-white'
                                    }`}
                                  >
                                    {track.title}
                                  </p>
                                  {isCached ? (
                                    <span
                                      title="Telechaje pou oflayn"
                                      className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0 font-medium"
                                    >
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Oflayn Pare
                                    </span>
                                  ) : (
                                    <span
                                      title="Poko telechaje"
                                      className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0 font-medium"
                                    >
                                      Poko telechaje
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {track.artistName} • <span className="font-mono">{track.category}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onPlayToggle(track)}
                                className={`p-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                                  isCurrent
                                    ? 'bg-yellow-400 text-slate-950 shadow-md'
                                    : 'bg-white/[0.08] hover:bg-white/[0.15] text-slate-200'
                                }`}
                                title={isCurrent && isPlaying ? 'Poz mizik la' : 'Jwe mizik sa'}
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>

                              {!isCached && (
                                <button
                                  onClick={() => {
                                    offlineManager.addToQueue(track, currentPlaylist.id);
                                    if (isOnline) {
                                      offlineManager.startBatchDownload();
                                    }
                                    onToast?.('info', `"${track.title}" ajoute nan ke telechajman an.`);
                                  }}
                                  className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all active:scale-95"
                                  title="Mete nan ke telechajman"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleRemoveTrack(track.id, track.title)}
                                className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Retire nan playlist la"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 2: BATCH DOWNLOAD QUEUE ======================= */}
          {activeTab === 'queue' && (
            <div className="space-y-5">
              {/* Queue Status / Action Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-950 to-blue-950/50 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-400" />
                    Ke Telechajman an Pakèt (Batch Queue)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {queue.length === 0
                      ? 'Ke a vid pou kounye a.'
                      : `${queue.length} mizik nan ke a (${completedCount} fini, ${pendingCount} ap tann, ${errorCount} echwe).`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {queue.length > 0 && (
                    <button
                      onClick={() => offlineManager.clearQueue()}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-300 transition-colors"
                    >
                      Vide Ke a
                    </button>
                  )}

                  {isDownloading ? (
                    <button
                      onClick={() => offlineManager.cancelBatchDownload()}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Anile Telechajman</span>
                    </button>
                  ) : (
                    <button
                      id="btn-start-batch-download"
                      disabled={pendingCount === 0}
                      onClick={handleStartBatchDownload}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all ${
                        pendingCount > 0
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>Telechaje Tout An Pakèt ({pendingCount})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar if downloading */}
              {isDownloading && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-2 animate-slideDown">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Ap telechaje mizik yo an pakèt nan kach aparèy ou...
                    </span>
                    <span className="font-mono font-bold text-white">{overallProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 transition-all duration-300 ease-out"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Queue Items */}
              {queue.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <Download className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-300">Pa gen mizik nan ke telechajman an</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Ou ka ajoute plizyè mizik ansanm nan onglet "Ajoute Mizik" pou telechaje yo yon sèl kou.
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Chwazi Mizik Pou Mete Nan Ke a</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((item) => (
                    <div
                      key={item.trackId}
                      className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] flex items-center justify-between gap-3 hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.coverUrl}
                          alt={item.trackTitle}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">{item.trackTitle}</p>
                          <p className="text-[11px] text-slate-400 truncate">{item.artistName}</p>
                        </div>
                      </div>

                      {/* Status indicator / progress */}
                      <div className="flex items-center gap-3 shrink-0">
                        {item.status === 'downloading' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span className="font-mono">{item.progress}%</span>
                          </div>
                        )}

                        {item.status === 'completed' && (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Telechaje</span>
                          </div>
                        )}

                        {item.status === 'pending' && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.08]">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ap tann</span>
                          </div>
                        )}

                        {item.status === 'error' && (
                          <div className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Echèk</span>
                          </div>
                        )}

                        <button
                          onClick={() => offlineManager.removeFromQueue(item.trackId)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Retire nan ke a"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 3: ADD TRACKS SELECTOR ======================= */}
          {activeTab === 'add' && (
            <div className="space-y-4">
              {/* Filter / Search header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-white/[0.06]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackSearch ?? ''}
                    onChange={(e) => setTrackSearch(e.target.value)}
                    placeholder="Chèche pa tit mizik, atis, oswa kategori (Kompa, Drill, Rabòday)..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 outline-none"
                  />
                  {trackSearch && (
                    <button
                      onClick={() => setTrackSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Destinasyon:</span>
                  <select
                    value={selectedPlaylistId ?? ''}
                    onChange={(e) => setSelectedPlaylistId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500 font-bold"
                  >
                    {playlists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.trackIds.length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Floating bar when items selected */}
              {selectedTrackIdsToAdd.length > 0 && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950 via-slate-900 to-amber-950 border border-blue-500/40 flex items-center justify-between gap-3 animate-slideDown shadow-lg sticky top-0 z-20">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-mono">
                      {selectedTrackIdsToAdd.length}
                    </span>
                    <span>mizik chwazi</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTrackIdsToAdd([])}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    >
                      Deseleksyone
                    </button>

                    <button
                      id="btn-add-to-queue-only"
                      onClick={() => handleAddSelectedTracksToPlaylistAndQueue(false)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajoute nan Ke</span>
                    </button>

                    <button
                      id="btn-add-and-download-now"
                      onClick={() => handleAddSelectedTracksToPlaylistAndQueue(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ajoute & Telechaje Kounye a</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tracks Grid/List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredAvailableTracks.map((track) => {
                  const isSelected = selectedTrackIdsToAdd.includes(track.id);
                  const isAlreadyInPlaylist = currentPlaylist?.trackIds.includes(track.id);
                  const isCached = cachedTrackIds.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleToggleTrackSelection(track.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-950/50'
                          : isAlreadyInPlaylist
                          ? 'bg-slate-950/40 border-white/[0.04] opacity-80'
                          : 'bg-slate-950/70 border-white/[0.06] hover:bg-slate-800/80 hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-slate-600 bg-slate-900'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>

                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">{track.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.artistName} • <span className="font-mono">{track.category}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isCached ? (
                          <span
                            title="Deja telechaje"
                            className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold"
                          >
                            Oflayn
                          </span>
                        ) : isAlreadyInPlaylist ? (
                          <span
                            title="Nan playlist la deja"
                            className="text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-medium"
                          >
                            Nan playlist
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredAvailableTracks.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Pa gen mizik ki koresponn ak rechèch ou a.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info & cache management */}
        <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tout mizik ki telechaje yo kache lokalman pou koute san entènèt.</span>
          </div>

          <div className="flex items-center gap-3">
            {cachedTrackIds.length > 0 && (
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      'Èske ou sèten ou vle efase tout kach mizik oflayn yo pou libere memwa aparèy ou?'
                    )
                  ) {
                    await offlineManager.clearOfflineCache();
                    onToast?.('info', 'Tout kach mizik oflayn yo efase avèk siksè.');
                  }
                }}
                className="text-[11px] text-red-400 hover:text-red-300 hover:underline"
              >
                Vide memwa kach ({cachedTrackIds.length} mizik)
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold transition-colors"
            >
              Fèmen
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
