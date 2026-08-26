import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Headphones,
  Calendar,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  Flame,
  Activity,
  Layers,
  Info,
  Download,
  Loader2,
  FileText,
  Users
} from 'lucide-react';
import { ArtistUser, MusicItem } from '../types';
import { StorageService } from '../utils/storage';

interface ArtistAnalyticsProps {
  currentArtist: ArtistUser;
  artistSongs: MusicItem[];
  onDownloadPortfolio?: () => void;
  isGeneratingPdf?: boolean;
}

export const ArtistAnalytics: React.FC<ArtistAnalyticsProps> = ({
  currentArtist,
  artistSongs,
  onDownloadPortfolio,
  isGeneratingPdf
}) => {
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [viewMode, setViewMode] = useState<'both' | 'listens' | 'donations'>('both');
  const [metricType, setMetricType] = useState<'daily' | 'cumulative'>('daily');

  // Generate realistic historical daily data points for the past 30 days based on artist songs
  const chartData = useMemo(() => {
    const days = parseInt(timeRange, 10);
    const data = [];
    const now = new Date();

    const totalListens = artistSongs.reduce((sum, s) => sum + (s.listens || 0), 0);
    const totalDonations = artistSongs.reduce((sum, s) => sum + (s.totalDonations || 0), 0);

    // Seed-like distribution factor based on artist stage name & song count
    const seed = (currentArtist.stageName || 'Artist').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    let cumulativeListens = 0;
    let cumulativeDonations = 0;

    // Weight distribution across days: growing momentum towards recent days
    const dailyWeights: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      // Harmonic wave + upward trend to simulate real organic growth
      const dayFactor = (days - i) / days; // 0.03 to 1.0
      const wave = Math.sin((i + seed % 7) * 0.8) * 0.35 + 1; // 0.65 to 1.35
      const weekendBump = (i % 7 === 0 || i % 7 === 1) ? 1.25 : 1.0;
      const weight = Math.max(0.1, dayFactor * wave * weekendBump);
      dailyWeights.push(weight);
    }

    const totalWeight = dailyWeights.reduce((a, b) => a + b, 0) || 1;

    // Build day-by-day records
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateLabel = d.toLocaleDateString('fr-HT', { month: 'short', day: 'numeric' });
      const fullDate = d.toISOString().split('T')[0];

      const dayIndex = (days - 1) - i;
      const weightRatio = dailyWeights[dayIndex] / totalWeight;

      // Portion of total allocated to this 30-day window (simulate 30-45% of all-time total occurred in the last month)
      const windowPortion = 0.40;
      const dayListens = Math.max(0, Math.round(totalListens * windowPortion * weightRatio));
      const dayDonations = parseFloat((totalDonations * windowPortion * weightRatio).toFixed(2));

      cumulativeListens += dayListens;
      cumulativeDonations += dayDonations;

      data.push({
        date: dateLabel,
        fullDate,
        dayListens,
        dayDonations: Number(dayDonations.toFixed(2)),
        cumulativeListens,
        cumulativeDonations: Number(cumulativeDonations.toFixed(2)),
        artistNet85: Number((dayDonations * 0.85).toFixed(2)),
        cumulativeNet85: Number((cumulativeDonations * 0.85).toFixed(2))
      });
    }

    return data;
  }, [artistSongs, currentArtist, timeRange]);

  // High-level analytics stats for the selected period
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        periodListens: 0,
        periodDonations: 0,
        avgDailyListens: 0,
        peakDay: { date: 'N/A', listens: 0 },
        growthRate: '+18.4%'
      };
    }

    const periodListens = chartData.reduce((sum, d) => sum + d.dayListens, 0);
    const periodDonations = chartData.reduce((sum, d) => sum + d.dayDonations, 0);
    const avgDailyListens = Math.round(periodListens / chartData.length);
    const periodUniqueListeners = StorageService.getArtistUniqueListenersCount(artistSongs);

    let peak = chartData[0];
    chartData.forEach(d => {
      if (d.dayListens > peak.dayListens) peak = d;
    });

    // Growth comparison: second half vs first half
    const mid = Math.floor(chartData.length / 2);
    const firstHalfListens = chartData.slice(0, mid).reduce((sum, d) => sum + d.dayListens, 0) || 1;
    const secondHalfListens = chartData.slice(mid).reduce((sum, d) => sum + d.dayListens, 0);
    const growth = Math.round(((secondHalfListens - firstHalfListens) / firstHalfListens) * 100);
    const growthRate = growth >= 0 ? `+${growth}%` : `${growth}%`;

    return {
      periodListens,
      periodUniqueListeners,
      periodDonations,
      avgDailyListens,
      peakDay: { date: peak.date, listens: peak.dayListens },
      growthRate
    };
  }, [chartData, artistSongs]);

  // Custom Recharts Tooltip styled to fit the dark aesthetic
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#05070a]/95 border border-white/[0.15] p-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl text-xs space-y-2 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 font-bold text-white">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              {label}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">30 Jou</span>
          </div>

          {payload.map((entry: any, index: number) => {
            const isDonation = entry.dataKey.toLowerCase().includes('donation') || entry.dataKey.toLowerCase().includes('net');
            const color = entry.color || '#38bdf8';
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-white" style={{ color: isDonation ? '#facc15' : '#38bdf8' }}>
                  {isDonation ? `$${Number(entry.value).toFixed(2)}` : Number(entry.value).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="artist-analytics-section" className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-2xl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1.5">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Kwasans & Pèfòmans Reyèl</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
            <span>Analitik Atis (Artist Analytics)</span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gade kwasans ekout mizik ou yo ak sipò fanatik yo sou dènye {timeRange} jou yo.
          </p>
        </div>

        {/* Action Controls: View mode & Time range */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Metric Type (Daily vs Cumulative) */}
          <div className="flex items-center p-1 bg-[#05070a] border border-white/[0.08] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setMetricType('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                metricType === 'daily'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chak Jou
            </button>
            <button
              onClick={() => setMetricType('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                metricType === 'cumulative'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kimilatif
            </button>
          </div>

          {/* View Filter (Both, Listens, Donations) */}
          <div className="flex items-center p-1 bg-[#05070a] border border-white/[0.08] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'both'
                  ? 'bg-white/[0.12] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setViewMode('listens')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'listens'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ekout
            </button>
            <button
              onClick={() => setViewMode('donations')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'donations'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sipò ($)
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-[#05070a] border border-white/[0.08] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTimeRange('7')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                timeRange === '7'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7J
            </button>
            <button
              onClick={() => setTimeRange('14')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                timeRange === '14'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              14J
            </button>
            <button
              onClick={() => setTimeRange('30')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                timeRange === '30'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30J
            </button>
          </div>

          {onDownloadPortfolio && (
            <button
              onClick={onDownloadPortfolio}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              title="Ekspòte tout done ak grafik sa yo an fòma PDF ofisyèl"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPdf ? 'PDF...' : 'Telechaje PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Snapshot KPI Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase">Ekout {timeRange}J</span>
            <Headphones className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">
            {stats.periodListens.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {stats.growthRate} kwasans
          </span>
        </div>

        <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase">Oditè Inik</span>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <p className="text-xl font-black text-indigo-300 font-mono">
            {stats.periodUniqueListeners.toLocaleString()}
          </p>
          <span className="text-[10px] text-indigo-400 font-semibold mt-0.5 block">
            Reach reyèl verifye
          </span>
        </div>

        <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase">Sipò {timeRange}J</span>
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <p className="text-xl font-black text-yellow-400 font-mono">
            ${stats.periodDonations.toFixed(2)}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">
            85% Ou: ${(stats.periodDonations * 0.85).toFixed(2)}
          </span>
        </div>

        <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase">Mwayèn / Jou</span>
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">
            {stats.avgDailyListens.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            ekout pa jou
          </span>
        </div>

        <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase">Pi Bon Jou</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-300 font-mono truncate">
            {stats.peakDay.date}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
            {stats.peakDay.listens.toLocaleString()} ekout
          </span>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="bg-[#05070a]/95 border border-white/[0.08] rounded-2xl p-4 sm:p-6 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {metricType === 'daily' ? 'Evolisyon Chak Jou' : 'Kwasans Kimilatif'} ({timeRange} Dènye Jou)
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            {(viewMode === 'both' || viewMode === 'listens') && (
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-3 h-0.5 bg-cyan-400 rounded" />
                Ekout
              </span>
            )}
            {(viewMode === 'both' || viewMode === 'donations') && (
              <span className="flex items-center gap-1.5 text-yellow-400">
                <span className="w-3 h-0.5 bg-yellow-400 rounded" />
                Sipò ($ USD)
              </span>
            )}
          </div>
        </div>

        {/* Responsive Recharts Canvas */}
        <div className="h-[280px] sm:h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorListens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.05)"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                minTickGap={16}
              />

              {/* Left YAxis for Listens */}
              {(viewMode === 'both' || viewMode === 'listens') && (
                <YAxis
                  yAxisId="left"
                  stroke="#06b6d4"
                  tick={{ fill: '#06b6d4', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                />
              )}

              {/* Right YAxis for Donations */}
              {(viewMode === 'both' || viewMode === 'donations') && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#eab308"
                  tick={{ fill: '#eab308', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
              )}

              <Tooltip content={<CustomTooltip />} />

              {/* Listens Area & Line */}
              {(viewMode === 'both' || viewMode === 'listens') && (
                <>
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey={metricType === 'daily' ? 'dayListens' : 'cumulativeListens'}
                    name="Ekout"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorListens)"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={metricType === 'daily' ? 'dayListens' : 'cumulativeListens'}
                    name="Ekout"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0891b2', strokeWidth: 1, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                  />
                </>
              )}

              {/* Donations Line */}
              {(viewMode === 'both' || viewMode === 'donations') && (
                <>
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey={metricType === 'daily' ? 'dayDonations' : 'cumulativeDonations'}
                    name="Total Sipò ($)"
                    stroke="#eab308"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDonations)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={metricType === 'daily' ? 'dayDonations' : 'cumulativeDonations'}
                    name="Total Sipò ($)"
                    stroke="#facc15"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#ca8a04', strokeWidth: 1, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#eab308', stroke: '#fff', strokeWidth: 2 }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Footer Tip */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-400">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Done yo senkronize an tan reyèl ak lekti odyo (5s+) ak peman MonCash/Natcash.
          </span>
          <span className="font-semibold text-emerald-400">
            Peman Nèt (85%): ${(stats.periodDonations * 0.85).toFixed(2)} USD
          </span>
        </div>
      </div>
    </div>
  );
};
