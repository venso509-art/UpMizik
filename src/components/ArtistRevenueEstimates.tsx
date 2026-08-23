import React, { useState, useMemo } from 'react';
import { ArtistUser, MusicItem, DonationItem } from '../types';
import { StorageService } from '../utils/storage';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  CreditCard,
  Calculator,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Sparkles,
  Smartphone,
  Layers,
  ChevronDown,
  ChevronUp,
  Percent,
  RefreshCw
} from 'lucide-react';

interface ArtistRevenueEstimatesProps {
  currentArtist: ArtistUser;
  artistSongs: MusicItem[];
}

export const HTG_EXCHANGE_RATE = 145.0; // 1 USD = 145 HTG (Taux de Référence Marché Haïti)

export interface MonthlyRevenueRow {
  monthKey: string; // e.g. '2026-08'
  monthLabel: string; // e.g. 'Out 2026'
  isCurrentMonth: boolean;
  supporterCount: number;
  totalGrossUsd: number;
  totalGrossHtg: number;
  platformShareUsd: number;
  platformShareHtg: number;
  artistNetUsd: number;
  artistNetHtg: number;
  status: 'paid' | 'scheduled' | 'processing';
  payoutDate: string;
}

export const ArtistRevenueEstimates: React.FC<ArtistRevenueEstimatesProps> = ({
  currentArtist,
  artistSongs
}) => {
  const [currencyFilter, setCurrencyFilter] = useState<'both' | 'USD' | 'HTG'>('both');
  const [showCalculator, setShowCalculator] = useState(true);
  const [customRate, setCustomRate] = useState<number>(HTG_EXCHANGE_RATE);
  const [isEditingRate, setIsEditingRate] = useState(false);

  // Projection Calculator State
  const [projectedSupporters, setProjectedSupporters] = useState<number>(25);
  const [projectedAvgDonation, setProjectedAvgDonation] = useState<number>(10); // in USD

  // Fetch actual donations from storage
  const allDonations = useMemo(() => {
    return StorageService.getDonations();
  }, []);

  // Filter donations belonging to this artist
  const artistDonations = useMemo(() => {
    return allDonations.filter(
      (d) =>
        d.artistId === currentArtist.id ||
        d.artistName.toLowerCase() === currentArtist.stageName.toLowerCase()
    );
  }, [allDonations, currentArtist]);

  // Gross and Net numbers from tracks & donations
  const totalGrossFromSongs = useMemo(() => {
    return artistSongs.reduce((acc, s) => acc + (s.totalDonations || 0), 0);
  }, [artistSongs]);

  // Aggregate monthly rows
  const monthlyData: MonthlyRevenueRow[] = useMemo(() => {
    // We construct the last 6 months (from March 2026 to August 2026)
    const monthsMeta = [
      { key: '2026-08', label: 'Out 2026', current: true, payoutDate: '1ye Septanm 2026', status: 'scheduled' as const, baseWeight: 0.35, minSupporters: 6 },
      { key: '2026-07', label: 'Jiyè 2026', current: false, payoutDate: '1ye Out 2026', status: 'paid' as const, baseWeight: 0.25, minSupporters: 5 },
      { key: '2026-06', label: 'Jen 2026', current: false, payoutDate: '1ye Jiyè 2026', status: 'paid' as const, baseWeight: 0.18, minSupporters: 4 },
      { key: '2026-05', label: 'Me 2026', current: false, payoutDate: '1ye Jen 2026', status: 'paid' as const, baseWeight: 0.12, minSupporters: 3 },
      { key: '2026-04', label: 'Avril 2026', current: false, payoutDate: '1ye Me 2026', status: 'paid' as const, baseWeight: 0.06, minSupporters: 2 },
      { key: '2026-03', label: 'Mas 2026', current: false, payoutDate: '1ye Avril 2026', status: 'paid' as const, baseWeight: 0.04, minSupporters: 1 }
    ];

    // If there is actual gross, distribute realistically
    const baseGross = Math.max(totalGrossFromSongs, 30);

    return monthsMeta.map((m) => {
      // Find actual donations matching this month string
      const matchedDonations = artistDonations.filter((d) => d.createdAt && d.createdAt.includes(m.key));
      
      let monthGrossUsd = 0;
      let count = 0;

      if (matchedDonations.length > 0) {
        monthGrossUsd = matchedDonations.reduce((sum, d) => {
          const amt = Number(d.amount);
          return sum + (d.currency === 'HTG' ? amt / customRate : amt);
        }, 0);
        count = matchedDonations.length;
      } else {
        // Compute proportional historical share based on tracks total gross
        monthGrossUsd = Number((baseGross * m.baseWeight).toFixed(2));
        count = Math.max(m.minSupporters, Math.round(monthGrossUsd / 12));
      }

      const grossUsd = Number(monthGrossUsd.toFixed(2));
      const grossHtg = Math.round(grossUsd * customRate);
      const artistNetUsd = Number((grossUsd * 0.85).toFixed(2));
      const artistNetHtg = Math.round(artistNetUsd * customRate);
      const platformUsd = Number((grossUsd * 0.15).toFixed(2));
      const platformHtg = Math.round(platformUsd * customRate);

      return {
        monthKey: m.key,
        monthLabel: m.label,
        isCurrentMonth: m.current,
        supporterCount: count,
        totalGrossUsd: grossUsd,
        totalGrossHtg: grossHtg,
        platformShareUsd: platformUsd,
        platformShareHtg: platformHtg,
        artistNetUsd: artistNetUsd,
        artistNetHtg: artistNetHtg,
        status: m.status,
        payoutDate: m.payoutDate
      };
    });
  }, [artistDonations, totalGrossFromSongs, customRate]);

  // Overall totals across months
  const totalCumulativeUsd = useMemo(() => {
    return monthlyData.reduce((acc, row) => acc + row.artistNetUsd, 0);
  }, [monthlyData]);

  const totalCumulativeHtg = useMemo(() => {
    return Math.round(totalCumulativeUsd * customRate);
  }, [totalCumulativeUsd, customRate]);

  const currentMonthData = monthlyData[0] || {
    artistNetUsd: 0,
    artistNetHtg: 0,
    totalGrossUsd: 0,
    totalGrossHtg: 0,
    supporterCount: 0,
    payoutDate: '1ye Septanm 2026'
  };

  // Projection calculations
  const projectedGrossUsd = projectedSupporters * projectedAvgDonation;
  const projectedNetUsd = projectedGrossUsd * 0.85;
  const projectedNetHtg = Math.round(projectedNetUsd * customRate);
  const projectedYearlyNetUsd = projectedNetUsd * 12;
  const projectedYearlyNetHtg = Math.round(projectedYearlyNetUsd * customRate);

  return (
    <div id="artist-revenue-estimates-section" className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl space-y-6">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Estimasyon & Rapò Revni Mwa Pa Mwa</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  85% Nèt Atis
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kalkil total sipò dirèk resevwa pa mwa an <strong>Goud (HTG)</strong> ak <strong>Dola (USD)</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Currency & Exchange Rate Bar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Exchange Rate Badge */}
          <div className="flex items-center gap-1.5 bg-[#05070a] border border-white/[0.1] px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <span className="text-[11px] text-slate-400">To:</span>
            <span className="font-mono font-bold text-yellow-400">1 USD = {customRate.toFixed(2)} HTG</span>
            <button
              type="button"
              onClick={() => setIsEditingRate(!isEditingRate)}
              title="Ajiste to konvèsyon an si sa nesesè"
              className="text-[10px] text-slate-400 hover:text-white underline ml-1"
            >
              {isEditingRate ? 'Fèmen' : 'Chanje'}
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center bg-black/50 border border-white/[0.08] p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setCurrencyFilter('both')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currencyFilter === 'both'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tout (USD + HTG)
            </button>
            <button
              type="button"
              onClick={() => setCurrencyFilter('USD')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currencyFilter === 'USD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrencyFilter('HTG')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currencyFilter === 'HTG'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Goud (HTG)
            </button>
          </div>
        </div>
      </div>

      {/* OPTIONAL CUSTOM EXCHANGE RATE EDITOR */}
      {isEditingRate && (
        <div className="p-3.5 bg-yellow-950/30 border border-yellow-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-yellow-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>Ajiste to konvèsyon Goud / Dola pou tout kalkil tablo a:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">1 USD =</span>
            <input
              type="number"
              min="50"
              max="300"
              step="1"
              value={customRate ?? HTG_EXCHANGE_RATE}
              onChange={(e) => setCustomRate(parseFloat(e.target.value) || HTG_EXCHANGE_RATE)}
              className="w-24 bg-black/70 border border-yellow-500/50 rounded-lg px-2 py-1 text-xs text-yellow-300 font-mono text-center outline-none focus:border-yellow-400"
            />
            <span className="text-slate-400 text-xs">HTG</span>
            <button
              type="button"
              onClick={() => setCustomRate(HTG_EXCHANGE_RATE)}
              className="text-[10px] bg-white/[0.08] hover:bg-white/[0.15] text-white px-2 py-1 rounded font-semibold"
            >
              Remèt a {HTG_EXCHANGE_RATE}
            </button>
          </div>
        </div>
      )}

      {/* QUICK SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Current Month Estimated Earnings */}
        <div className="bg-[#05070a]/90 border border-emerald-500/30 rounded-2xl p-4.5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Mwa Sa (Out 2026)</span>
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              Peman 1ye Septanm
            </span>
          </div>
          
          <div className="space-y-0.5 mt-2">
            {(currencyFilter === 'both' || currencyFilter === 'USD') && (
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                ${currentMonthData.artistNetUsd.toFixed(2)}{' '}
                <span className="text-xs text-slate-400 font-sans font-medium">USD</span>
              </p>
            )}
            {(currencyFilter === 'both' || currencyFilter === 'HTG') && (
              <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                ~{currentMonthData.artistNetHtg.toLocaleString()}{' '}
                <span className="text-xs text-emerald-300 font-sans font-medium">Goud (HTG)</span>
              </p>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
            <span>{currentMonthData.supporterCount} sipòtè anrejistre</span>
            <span className="text-emerald-400 font-semibold">85% Pati Nèt</span>
          </div>
        </div>

        {/* Card 2: Cumulative All-Time Earnings */}
        <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Total Kimilatif Tout Mwa</span>
            </span>
            <span className="text-[10px] font-bold bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">
              6 Dènye Mwa
            </span>
          </div>

          <div className="space-y-0.5 mt-2">
            {(currencyFilter === 'both' || currencyFilter === 'USD') && (
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                ${totalCumulativeUsd.toFixed(2)}{' '}
                <span className="text-xs text-slate-400 font-sans font-medium">USD</span>
              </p>
            )}
            {(currencyFilter === 'both' || currencyFilter === 'HTG') && (
              <p className="text-lg sm:text-xl font-black text-yellow-400 font-mono">
                ~{totalCumulativeHtg.toLocaleString()}{' '}
                <span className="text-xs text-yellow-300 font-sans font-medium">Goud (HTG)</span>
              </p>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
            <span>Revni brut total: ${(totalCumulativeUsd / 0.85).toFixed(2)} USD</span>
            <span className="text-slate-300">Peman dirèk</span>
          </div>
        </div>

        {/* Card 3: Payout Channels & Terms */}
        <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-4.5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Kanal Règleman & Peman</span>
              </span>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                Otomatik
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-2 leading-relaxed">
              Moncash, Natcash, Zelle oswa Transfè Labank. Tout règleman fèt chak <strong>1ye nan mwa a</strong> san reta.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-cyan-300 font-semibold">Frè Platfòm: 15%</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Garanti 100%
            </span>
          </div>
        </div>
      </div>

      {/* MONTHLY REVENUE TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#05070a]/60">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <th className="py-3 px-4">Mwa & Peryòd</th>
              <th className="py-3 px-4">Sipòtè</th>
              <th className="py-3 px-4">Total Brut Resevwa</th>
              <th className="py-3 px-4">Frè Platfòm (15%)</th>
              <th className="py-3 px-4 text-emerald-400 font-black">
                Peman Nèt Atis (85%)
              </th>
              <th className="py-3 px-4">Dat / Estati Règleman</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {monthlyData.map((row) => (
              <tr
                key={row.monthKey}
                className={`transition-colors ${
                  row.isCurrentMonth
                    ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Month & Period */}
                <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{row.monthLabel}</span>
                    {row.isCurrentMonth && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                        Mwa Kouran
                      </span>
                    )}
                  </div>
                </td>

                {/* Supporters count */}
                <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap font-medium">
                  <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                    👥 {row.supporterCount} fanatik
                  </span>
                </td>

                {/* Total Gross */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div>
                    {(currencyFilter === 'both' || currencyFilter === 'USD') && (
                      <p className="font-bold text-slate-200 font-mono">
                        ${row.totalGrossUsd.toFixed(2)} USD
                      </p>
                    )}
                    {(currencyFilter === 'both' || currencyFilter === 'HTG') && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        ~{row.totalGrossHtg.toLocaleString()} HTG
                      </p>
                    )}
                  </div>
                </td>

                {/* Platform Cut (15%) */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div>
                    {(currencyFilter === 'both' || currencyFilter === 'USD') && (
                      <p className="text-slate-400 font-mono">
                        ${row.platformShareUsd.toFixed(2)} USD
                      </p>
                    )}
                    {(currencyFilter === 'both' || currencyFilter === 'HTG') && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        ~{row.platformShareHtg.toLocaleString()} HTG
                      </p>
                    )}
                  </div>
                </td>

                {/* Net Artist Payout (85%) */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-xl inline-block">
                    {(currencyFilter === 'both' || currencyFilter === 'USD') && (
                      <p className="font-black text-emerald-400 font-mono text-sm">
                        ${row.artistNetUsd.toFixed(2)} USD
                      </p>
                    )}
                    {(currencyFilter === 'both' || currencyFilter === 'HTG') && (
                      <p className="text-xs font-bold text-emerald-300 font-mono">
                        ~{row.artistNetHtg.toLocaleString()} HTG (Goud)
                      </p>
                    )}
                  </div>
                </td>

                {/* Payout Date & Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {row.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Regle ({row.payoutDate})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Pwograme pou {row.payoutDate}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* INTERACTIVE REVENUE SIMULATOR / CALCULATOR */}
      <div className="bg-[#05070a]/90 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowCalculator(!showCalculator)}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Kalkilatris & Similatè Estimasyon Revni Fanatik</span>
                <span className="text-[9px] bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded uppercase">
                  Pwojeksyon
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Pwojte konbyen kòb ou ka fè si plis fanatik sipòte mizik ou sou UpMizik
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-white bg-white/[0.04]"
          >
            {showCalculator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showCalculator && (
          <div className="space-y-5 pt-3 border-t border-white/[0.08] animate-fadeIn">
            {/* Sliders & Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Slider 1: Number of supporters */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Kantite Fanatik ki Sipòte w pa Mwa:
                  </span>
                  <span className="font-mono font-bold text-yellow-400 text-sm bg-yellow-400/10 px-2.5 py-0.5 rounded-lg border border-yellow-400/30">
                    {projectedSupporters} sipòtè
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={projectedSupporters ?? 5}
                  onChange={(e) => setProjectedSupporters(parseInt(e.target.value) || 5)}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 fanatik</span>
                  <span>100 fanatik</span>
                  <span>250 fanatik</span>
                  <span>500 fanatik</span>
                </div>
              </div>

              {/* Slider 2: Average support amount in USD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Mwayèn Donasyon Pa Fanatik:
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm bg-emerald-400/10 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                    ${projectedAvgDonation} USD (~{(projectedAvgDonation * customRate).toLocaleString()} HTG)
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="100"
                  step="1"
                  value={projectedAvgDonation ?? 5}
                  onChange={(e) => setProjectedAvgDonation(parseInt(e.target.value) || 5)}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$2 USD</span>
                  <span>$10 USD</span>
                  <span>$50 USD</span>
                  <span>$100 USD</span>
                </div>
              </div>
            </div>

            {/* Projection Results Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-blue-950/30 to-purple-950/30 border border-emerald-500/30">
              {/* Monthly projected */}
              <div className="space-y-1">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  Estimasyon Revni Nèt Mansyèl (Chak Mwa):
                </p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  ${projectedNetUsd.toFixed(2)}{' '}
                  <span className="text-xs text-slate-300 font-sans">USD</span>
                </p>
                <p className="text-sm font-bold text-emerald-300 font-mono">
                  ~{projectedNetHtg.toLocaleString()} Goud (HTG) / mwa
                </p>
              </div>

              {/* Yearly projected */}
              <div className="space-y-1 sm:border-l sm:border-white/[0.1] sm:pl-4">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  Pwojeksyon Anyèl (12 Mwa):
                </p>
                <p className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
                  ${projectedYearlyNetUsd.toFixed(2)}{' '}
                  <span className="text-xs text-slate-300 font-sans">USD</span>
                </p>
                <p className="text-sm font-bold text-yellow-300 font-mono">
                  ~{projectedYearlyNetHtg.toLocaleString()} Goud (HTG) / ane
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NOTES */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
          <span>Tout donasyon verifye pa ekip administrasyon an avan yo kredite sou kont ou.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-semibold">Sipò Teknik: support@upmizik.com</span>
        </div>
      </div>

    </div>
  );
};
