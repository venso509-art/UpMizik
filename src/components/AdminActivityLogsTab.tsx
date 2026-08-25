import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  User,
  Globe,
  Smartphone,
  Laptop,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { ActivityLogItem, ActivityEventType, ArtistUser } from '../types';
import { StorageService } from '../utils/storage';

interface AdminActivityLogsTabProps {
  artists?: ArtistUser[];
  onValidateArtist?: (artistId: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const AdminActivityLogsTab: React.FC<AdminActivityLogsTabProps> = ({
  artists = [],
  onValidateArtist,
  onNavigateToTab
}) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLogItem | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  // Load logs on mount
  const loadLogs = () => {
    setIsRefreshing(true);
    const localLogs = StorageService.getActivityLogs();
    setLogs(localLogs);

    // Also attempt fetching from API if backend is connected
    try {
      fetch('/api.php?action=get_activity_logs')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
            // Map backend DB fields to ActivityLogItem
            const mappedDbLogs: ActivityLogItem[] = data.data.map((item: any) => ({
              id: item.id || `db_log_${item.date_creation}`,
              eventType: item.type_evenement as ActivityEventType,
              email: item.email,
              artistId: item.artiste_id,
              artistName: item.nom_scene,
              reason: item.motif,
              ipAddress: item.ip_adresse,
              userAgent: item.user_agent,
              status: item.statut || 'warning',
              timestamp: item.date_creation
            }));

            // Merge local and DB logs without duplicates
            const combinedMap = new Map<string, ActivityLogItem>();
            [...localLogs, ...mappedDbLogs].forEach(l => combinedMap.set(l.id, l));
            const merged = Array.from(combinedMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setLogs(merged);
            StorageService.saveActivityLogs(merged);
          }
        })
        .catch(() => {
          // Graceful fallback to local storage
        })
        .finally(() => {
          setTimeout(() => setIsRefreshing(false), 400);
        });
    } catch (_) {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        log.email.toLowerCase().includes(query) ||
        (log.artistName && log.artistName.toLowerCase().includes(query)) ||
        log.reason.toLowerCase().includes(query) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(query));

      // Event Type filter
      const matchesType =
        selectedEventType === 'all' || log.eventType === selectedEventType;

      // Status filter
      const matchesStatus =
        selectedStatus === 'all' || log.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [logs, searchQuery, selectedEventType, selectedStatus]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const pendingFails = logs.filter(l => l.eventType === 'echec_connexion_pending').length;
    const credFails = logs.filter(l => l.eventType === 'echec_connexion_identifiants').length;
    const rejectedFails = logs.filter(l => l.eventType === 'echec_connexion_rejete' || l.eventType === 'echec_connexion_suspendu').length;
    const successes = logs.filter(l => l.eventType === 'connexion_reussie').length;

    return { total, pendingFails, credFails, rejectedFails, successes };
  }, [logs]);

  const handleDeleteSingleLog = (logId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    StorageService.deleteActivityLog(logId);
    setLogs(prev => prev.filter(l => l.id !== logId));
    if (selectedLogDetail?.id === logId) {
      setSelectedLogDetail(null);
    }
  };

  const handleClearAllLogs = () => {
    StorageService.clearActivityLogs();
    setLogs([]);
    setConfirmClearAll(false);
    setSelectedLogDetail(null);

    // Call API clear endpoint
    try {
      fetch('/api.php?action=clear_activity_logs', { method: 'POST' }).catch(() => {});
    } catch (_) {}
  };

  const handleCopyEmail = (email: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const getEventBadge = (type: ActivityEventType) => {
    switch (type) {
      case 'echec_connexion_pending':
        return {
          label: 'Kont an Atant ($4.99)',
          icon: Clock,
          bg: 'bg-amber-500/15',
          text: 'text-amber-300',
          border: 'border-amber-500/30'
        };
      case 'alerte_force_brute':
        return {
          label: '🚨 Fòs Brit (Brute Force)',
          icon: ShieldAlert,
          bg: 'bg-red-600/20',
          text: 'text-red-300 font-bold',
          border: 'border-red-500/50'
        };
      case 'echec_connexion_rate_limit':
        return {
          label: 'Rate Limiting (Bloke)',
          icon: ShieldAlert,
          bg: 'bg-orange-500/20',
          text: 'text-orange-300',
          border: 'border-orange-500/40'
        };
      case 'echec_connexion_identifiants':
        return {
          label: 'PIN / Modpas Enkòrèk',
          icon: KeyRound,
          bg: 'bg-red-500/15',
          text: 'text-red-400',
          border: 'border-red-500/30'
        };
      case 'echec_connexion_rejete':
        return {
          label: 'Kont Rejte',
          icon: XCircle,
          bg: 'bg-rose-500/15',
          text: 'text-rose-400',
          border: 'border-rose-500/30'
        };
      case 'echec_connexion_suspendu':
        return {
          label: 'Kont Sispann',
          icon: ShieldAlert,
          bg: 'bg-purple-500/15',
          text: 'text-purple-300',
          border: 'border-purple-500/30'
        };
      case 'connexion_reussie':
        return {
          label: 'Koneksyon Reyisi',
          icon: CheckCircle2,
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-300',
          border: 'border-emerald-500/30'
        };
      default:
        return {
          label: 'Aktivite',
          icon: Info,
          bg: 'bg-slate-500/15',
          text: 'text-slate-300',
          border: 'border-slate-500/30'
        };
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSeconds < 60) return 'Kounye a';
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min pase`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} èdtan pase`;
      const days = Math.floor(diffSeconds / 86400);
      if (days < 7) return `${days} jou pase`;

      return date.toLocaleDateString('ht-HT', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#0a0f1d] to-slate-900 border border-amber-500/25 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-400/10">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Jounal & Log Aktivite Koneksyon Atis
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  {logs.length} Total Log
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Swiv tout tantativ koneksyon nan <code className="text-yellow-400 font-mono">artist_dashboard</code>, echèk pou kont ki an atant validasyon $4.99 oswa PIN enkòrèk.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              id="refresh-activity-logs-btn"
              onClick={loadLogs}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 border border-white/[0.1] flex items-center gap-2 transition-all disabled:opacity-50"
              title="Rafrechi lis la"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Ap chaje...' : 'Rafrechi'}</span>
            </button>

            {logs.length > 0 && (
              <button
                id="clear-all-activity-logs-btn"
                onClick={() => setConfirmClearAll(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 flex items-center gap-2 transition-all"
                title="Efase tout jounal la"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Netwaye Tout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Pending Failures */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'echec_connexion_pending' ? 'all' : 'echec_connexion_pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedEventType === 'echec_connexion_pending'
              ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-[#0a0f1d] border-amber-500/25 hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400">Kont an Atant ($4.99)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-300">
              {stats.pendingFails}
            </span>
            <span className="text-[11px] text-slate-400">tantativ</span>
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1">
            Atis ki enskri men pako valide
          </p>
        </div>

        {/* Card 2: Invalid PIN */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'echec_connexion_identifiants' ? 'all' : 'echec_connexion_identifiants')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedEventType === 'echec_connexion_identifiants'
              ? 'bg-red-500/20 border-red-400 shadow-lg shadow-red-500/20'
              : 'bg-[#0a0f1d] border-red-500/25 hover:border-red-400/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400">PIN / Modpas Enkòrèk</span>
            <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-red-400">
              {stats.credFails}
            </span>
            <span className="text-[11px] text-slate-400">erè</span>
          </div>
          <p className="text-[11px] text-red-400/80 mt-1">
            Kòd PIN oswa imèl pa matche
          </p>
        </div>

        {/* Card 3: Rejected / Suspended */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'echec_connexion_rejete' ? 'all' : 'echec_connexion_rejete')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedEventType === 'echec_connexion_rejete'
              ? 'bg-rose-500/20 border-rose-400 shadow-lg shadow-rose-500/20'
              : 'bg-[#0a0f1d] border-rose-500/25 hover:border-rose-400/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400">Rejte / Sispann</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-400">
              {stats.rejectedFails}
            </span>
            <span className="text-[11px] text-slate-400">bloke</span>
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1">
            Aksè refize oswa kont sispann
          </p>
        </div>

        {/* Card 4: Successes */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'connexion_reussie' ? 'all' : 'connexion_reussie')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedEventType === 'connexion_reussie'
              ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/20'
              : 'bg-[#0a0f1d] border-emerald-500/25 hover:border-emerald-400/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400">Koneksyon Reyisi</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {stats.successes}
            </span>
            <span className="text-[11px] text-slate-400">siksè</span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            Atis ki konekte san pwoblèm
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0a0f1d] border border-white/[0.08] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-activity-logs-input"
              type="text"
              value={searchQuery ?? ''}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Chèche pa imèl, non atis, motif, oswa IP..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type and Status Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] shrink-0">
              <button
                onClick={() => setSelectedEventType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedEventType === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tout ({logs.length})
              </button>
              <button
                onClick={() => setSelectedEventType('echec_connexion_pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedEventType === 'echec_connexion_pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-amber-400 hover:bg-amber-400/10'
                }`}
              >
                Atant ({stats.pendingFails})
              </button>
              <button
                onClick={() => setSelectedEventType('echec_connexion_identifiants')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedEventType === 'echec_connexion_identifiants'
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                    : 'text-red-400 hover:bg-red-400/10'
                }`}
              >
                PIN Enkòrèk ({stats.credFails})
              </button>
              <button
                onClick={() => setSelectedEventType('connexion_reussie')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedEventType === 'connexion_reussie'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-emerald-400 hover:bg-emerald-400/10'
                }`}
              >
                Siksè ({stats.successes})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs List Container */}
      <div className="bg-[#0a0f1d] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Pa gen okenn jounal aktivite ki koresponn</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery || selectedEventType !== 'all'
                  ? 'Eseye retire filtè yo oswa chanje mo rechèch ou a.'
                  : 'Tout tantativ koneksyon echwe oswa reyisi pral parèt otomatikman isit la.'}
              </p>
            </div>
            {(searchQuery || selectedEventType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedEventType('all');
                  setSelectedStatus('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20 hover:bg-amber-400/20 transition-all"
              >
                Retire tout filtè yo
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredLogs.map((log, index) => {
              const badge = getEventBadge(log.eventType);
              const BadgeIcon = badge.icon;
              const isPending = log.eventType === 'echec_connexion_pending';

              // Tcheke si atis sa a egziste nan lis atis aktyèl la
              const matchedArtist = artists.find(
                a => (log.artistId && a.id === log.artistId) || a.email.toLowerCase() === log.email.toLowerCase()
              );

              return (
                <div
                  key={log.id}
                  id={`activity-log-item-${log.id}`}
                  onClick={() => setSelectedLogDetail(log)}
                  className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                >
                  {/* Left Column: Icon + Event Type + Message */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${badge.bg} ${badge.border} ${badge.text} shadow-md`}
                    >
                      <BadgeIcon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg} ${badge.border} ${badge.text}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>

                        {log.artistName && (
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-400" />
                            {log.artistName}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 font-mono">
                          • {formatTimeAgo(log.timestamp)}
                        </span>
                      </div>

                      {/* Email and Reason */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-amber-300 font-semibold bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10">
                          {log.email}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyEmail(log.email, e)}
                          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                          title="Kopi imèl la"
                        >
                          {copiedEmail === log.email ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed break-words">
                        {log.reason}
                      </p>

                      {/* IP & User Agent Info */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 font-mono">
                        {log.ipAddress && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-400" />
                            {log.ipAddress}
                          </span>
                        )}
                        {log.userAgent && (
                          <span className="truncate max-w-[200px] sm:max-w-xs text-slate-500 text-[10px]" title={log.userAgent}>
                            {log.userAgent.includes('Mobile') || log.userAgent.includes('Android') || log.userAgent.includes('iPhone') ? '📱 Mobil' : '💻 Odinatè'} ({log.userAgent.substring(0, 35)}...)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Quick validation button if artist is pending */}
                    {isPending && matchedArtist && matchedArtist.status === 'pending' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onValidateArtist) {
                            onValidateArtist(matchedArtist.id);
                          } else if (onNavigateToTab) {
                            onNavigateToTab('artists_pending');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-yellow-300 shadow-md shadow-amber-400/20 flex items-center gap-1.5 transition-all"
                        title="Valide kont atis sa a dirèkteman"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Valide Atis</span>
                      </button>
                    )}

                    {isPending && (!matchedArtist || matchedArtist.status !== 'pending') && onNavigateToTab && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToTab('artists_pending');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-amber-300 border border-amber-400/25 flex items-center gap-1.5 transition-all"
                      >
                        <span>Wè Demann</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}

                    {/* Delete single log */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSingleLog(log.id, e)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Efase log sa a"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLogDetail && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedLogDetail(null)}
        >
          <div
            className="relative max-w-lg w-full bg-[#0a0f1d] border border-white/[0.15] rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Detay Jounal Aktivite</h3>
                  <p className="text-[11px] font-mono text-slate-400">{selectedLogDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold block mb-1">Kalite Evènman:</span>
                <span className="text-amber-300 font-mono font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 inline-block">
                  {selectedLogDetail.eventType}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1">Imèl / Kontak:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.1]">
                    {selectedLogDetail.email}
                  </span>
                  <button
                    onClick={() => handleCopyEmail(selectedLogDetail.email)}
                    className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-colors"
                    title="Kopi imèl"
                  >
                    {copiedEmail === selectedLogDetail.email ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {selectedLogDetail.artistName && (
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Non Sèn Atis la:</span>
                  <span className="text-yellow-400 font-bold text-sm">
                    {selectedLogDetail.artistName} {selectedLogDetail.artistId && `(${selectedLogDetail.artistId})`}
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-400 font-bold block mb-1">Motif / Rezon:</span>
                <p className="text-slate-200 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                  {selectedLogDetail.reason}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Adrès IP:</span>
                  <span className="text-slate-300 font-mono bg-black/40 px-2 py-1 rounded border border-white/[0.06] block truncate">
                    {selectedLogDetail.ipAddress || '127.0.0.1'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Dat & Lè:</span>
                  <span className="text-slate-300 font-mono bg-black/40 px-2 py-1 rounded border border-white/[0.06] block truncate">
                    {new Date(selectedLogDetail.timestamp).toLocaleString('ht-HT')}
                  </span>
                </div>
              </div>

              {selectedLogDetail.userAgent && (
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Navigatè / Aparèy:</span>
                  <p className="text-[11px] text-slate-400 font-mono bg-black/40 p-2 rounded-lg border border-white/[0.06] break-all">
                    {selectedLogDetail.userAgent}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => handleDeleteSingleLog(selectedLogDetail.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Efase Log Sa a</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-all"
              >
                Fèmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear All Modal */}
      {confirmClearAll && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setConfirmClearAll(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#0a0f1d] border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Netwaye Tout Jounal Aktivite yo?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Aksyon sa a pral efase tout istorik tantativ koneksyon yo nèt. Ou p ap ka retounen dèyè.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmClearAll(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.12] text-slate-300"
              >
                Anile
              </button>
              <button
                onClick={handleClearAllLogs}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
              >
                Wi, Netwaye Tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
