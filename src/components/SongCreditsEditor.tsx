import React from 'react';
import { MusicCredit, ArtistUser } from '../types';
import { Percent, Plus, Trash2, User, Users, Phone, FileText, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface SongCreditsEditorProps {
  credits: MusicCredit[];
  mainArtistName: string;
  registeredArtists: ArtistUser[];
  onAddCredit: () => void;
  onRemoveCredit: (id: string) => void;
  onUpdateCredit: (id: string, field: keyof MusicCredit, value: any) => void;
}

export const SongCreditsEditor: React.FC<SongCreditsEditorProps> = ({
  credits,
  mainArtistName,
  registeredArtists,
  onAddCredit,
  onRemoveCredit,
  onUpdateCredit
}) => {
  const totalCollabPercent = credits.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0);
  const mainArtistPercent = Math.max(0, 100 - totalCollabPercent);
  const isOver100 = totalCollabPercent > 100;

  const roleOptions = [
    { value: 'Featuring / Vokal', label: '🎤 Featuring / Vokal' },
    { value: 'Konpozitè / Pawòl', label: '✍️ Konpozitè / Pawòl (Lyrics)' },
    { value: 'Pwodiktè / Beatmaker', label: '🎹 Pwodiktè / Beatmaker' },
    { value: 'Mix & Mastering', label: '🎚️ Mix & Mastering' },
    { value: 'Aranjè', label: '🎼 Aranjè Mizikal' },
    { value: 'Mizisyen / Enstriman', label: '🎸 Mizisyen / Enstriman' },
    { value: 'Ko-Pwodiktè', label: '🎛️ Ko-Pwodiktè' },
    { value: 'Lòt Kolaboratè', label: '🤝 Lòt Kolaborasyon' }
  ];

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-[#091122] to-[#050811] border border-cyan-500/30 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white">
                Kredi & Pousantaj Pataj (Split Sheet)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Pousantaj
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bay moun ki te patisipe sou moso sa (feat, konpozitè, beatmaker) pousantaj revni yo
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddCredit}
          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajoute Kredi</span>
        </button>
      </div>

      {/* Split Visual Progress Bar */}
      <div className="space-y-1.5 p-3 rounded-xl bg-[#03060f] border border-white/[0.08]">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            <span>Atis Prensipal ({mainArtistName || 'Ou menm'}):</span>
            <span className="font-mono font-bold text-white">{mainArtistPercent}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
            <span>Kolaboratè:</span>
            <span className="font-bold text-white">{totalCollabPercent}%</span>
            <span>/ 100%</span>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.min(100, mainArtistPercent)}%` }}
            className="h-full bg-yellow-400 transition-all duration-300"
            title={`Atis Prensipal: ${mainArtistPercent}%`}
          />
          {credits.map((c, idx) => {
            const colors = ['bg-cyan-400', 'bg-purple-400', 'bg-emerald-400', 'bg-pink-400', 'bg-orange-400'];
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={c.id}
                style={{ width: `${Math.max(0, Math.min(100, Number(c.percentage) || 0))}%` }}
                className={`h-full ${colorClass} transition-all duration-300`}
                title={`${c.name || 'Kolaboratè'}: ${c.percentage}%`}
              />
            );
          })}
        </div>

        {isOver100 && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium pt-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Atansyon: Pousantaj total kolaboratè yo depase 100%! Tanpri ajiste valè yo.</span>
          </div>
        )}
      </div>

      {/* Credit rows */}
      {credits.length === 0 ? (
        <div className="p-3 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/[0.1] text-slate-400 text-xs">
          <p>Pa gen kolaboratè ajoute pou kounya. 100% revni an ale dirèkteman pou atis prensipal la.</p>
          <button
            type="button"
            onClick={onAddCredit}
            className="mt-2 text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Klike la a pou ajoute yon moun (konpozitè, beatmaker, vokal)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {credits.map((credit, index) => {
            return (
              <div
                key={credit.id}
                className="p-3 sm:p-3.5 rounded-xl bg-[#040814] border border-white/[0.1] space-y-2.5 animate-fadeIn"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {credit.name ? credit.name : 'Nouvo Kredi'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveCredit(credit.id)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Retire kredi sa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  {/* Select Registered Artist or Custom */}
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Atis Enskri sou UpMizik (opsyonèl)
                    </label>
                    <select
                      value={credit.artistId || ''}
                      onChange={(e) => onUpdateCredit(credit.id, 'artistId', e.target.value)}
                      className="w-full bg-[#080d1a] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 outline-none"
                    >
                      <option value="">-- Moun Deyò / Antre Non l Anba --</option>
                      {registeredArtists.map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.stageName} ({art.city || 'Ayiti'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Name / Registered Name */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Non Moun nan / Atis la *
                    </label>
                    <input
                      type="text"
                      required
                      value={credit.name ?? ''}
                      onChange={(e) => onUpdateCredit(credit.id, 'name', e.target.value)}
                      placeholder="egz: DJ B-Mix, Jean Lyricist"
                      className="w-full bg-[#080d1a] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  {/* Percentage */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-yellow-300 font-bold mb-1">
                      Pousantaj (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={credit.percentage ?? ''}
                        onChange={(e) =>
                          onUpdateCredit(
                            credit.id,
                            'percentage',
                            e.target.value ? Math.min(100, Math.max(0, parseInt(e.target.value))) : 0
                          )
                        }
                        placeholder="20"
                        className="w-full bg-[#080d1a] border border-yellow-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-yellow-400 outline-none font-mono font-bold pr-7"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs font-bold text-yellow-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  {/* Role */}
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Wòl / Travay li fè nan moso a *
                    </label>
                    <select
                      value={credit.role ?? 'Producer'}
                      onChange={(e) => onUpdateCredit(credit.id, 'role', e.target.value)}
                      className="w-full bg-[#080d1a] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 outline-none"
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* MonCash / Natcash Phone */}
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Nimewo MonCash / Natcash (opsyonèl pou transfè)
                    </label>
                    <input
                      type="tel"
                      value={credit.phone || ''}
                      onChange={(e) => onUpdateCredit(credit.id, 'phone', e.target.value)}
                      placeholder="egz: +509 3700-0000"
                      className="w-full bg-[#080d1a] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>

                {/* Quick percentage helper presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Chwazi rapid:</span>
                  {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onUpdateCredit(credit.id, 'percentage', pct)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                        credit.percentage === pct
                          ? 'bg-yellow-400 text-slate-950 font-bold'
                          : 'bg-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.1]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
