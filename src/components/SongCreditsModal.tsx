import React from 'react';
import { MusicItem, ArtistUser } from '../types';
import { X, Percent, Award, User, Music, Mic, FileText, CheckCircle2, Sparkles, DollarSign } from 'lucide-react';

interface SongCreditsModalProps {
  song: MusicItem | null;
  showPercentages?: boolean;
  onClose: () => void;
  onSelectArtist?: (artistId: string) => void;
}

export const SongCreditsModal: React.FC<SongCreditsModalProps> = ({
  song,
  showPercentages = false,
  onClose,
  onSelectArtist
}) => {
  if (!song) return null;

  const credits = song.credits || [];
  const totalCollabPercent = credits.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0);
  const mainArtistPercent = Math.max(0, 100 - totalCollabPercent);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#070b16] border border-white/[0.12] rounded-3xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-[#0c1527] to-[#070b16]">
          <div className="flex items-center gap-3">
            <img
              src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
              alt={song.title}
              className="w-12 h-12 rounded-xl object-cover border border-white/[0.1] shadow-md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {showPercentages ? 'Kredi & Split Sheet' : 'Kredi & Patisipan'}
                </span>
                {song.releaseFormat && song.releaseFormat !== 'single' && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-500/30">
                    {song.releaseFormat === 'album' ? '💿 Albòm' : song.releaseFormat === 'ep' ? '💽 EP' : song.releaseFormat === 'mixtape' ? '📼 Mixtape' : '🎙️ Demo'}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white text-base truncate mt-0.5">{song.title}</h3>
              <p className="text-xs text-slate-400 truncate">{song.artistName} {song.feat ? `ft. ${song.feat}` : ''}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Split Sheet Summary - ONLY visible in Admin/Artist private view */}
          {showPercentages && (
            <div className="p-4 rounded-2xl bg-[#03060f] border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Pataj Dwa & Revni (Split Sheet - Sekrè)</span>
                <span className="font-mono text-cyan-400 font-bold">100% Total</span>
              </div>

              {/* Split Progress Bar */}
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${Math.min(100, mainArtistPercent)}%` }}
                  className="h-full bg-yellow-400 transition-all"
                  title={`Atis Prensipal: ${mainArtistPercent}%`}
                />
                {credits.map((c, idx) => {
                  const colors = ['bg-cyan-400', 'bg-purple-400', 'bg-emerald-400', 'bg-pink-400', 'bg-orange-400'];
                  const colorClass = colors[idx % colors.length];
                  return (
                    <div
                      key={c.id}
                      style={{ width: `${Math.max(0, Math.min(100, Number(c.percentage) || 0))}%` }}
                      className={`h-full ${colorClass} transition-all`}
                      title={`${c.name}: ${c.percentage}%`}
                    />
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400">
                Divizyon revni sa vizib sèlman pou Administrasyon ak Jesyon Atis la.
              </p>
            </div>
          )}

          {/* Contributors List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {showPercentages ? 'Lis Atis & Patisipan sou Moso Sa' : 'Moun ki patisipe nan pwodiksyon moso a'}
            </h4>

            {/* Main Artist Row */}
            <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-white">{song.artistName}</p>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-yellow-400 text-slate-950">
                      Atis Prensipal
                    </span>
                  </div>
                  <p className="text-xs text-yellow-300/80">Chantè / Pèfòmans Prensipal</p>
                </div>
              </div>

              {showPercentages && (
                <div className="text-right">
                  <span className="text-base font-black font-mono text-yellow-400">
                    {mainArtistPercent}%
                  </span>
                  <p className="text-[10px] text-slate-400">Pousantaj</p>
                </div>
              )}
            </div>

            {/* Linked Collab (if existing) */}
            {song.collab && !credits.some((c) => c.artistId === song.collab?.artistId) && (
              <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {song.collab.avatarUrl ? (
                    <img
                      src={song.collab.avatarUrl}
                      alt={song.collab.artistName}
                      className="w-9 h-9 rounded-xl object-cover border border-purple-400"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm">
                      🎤
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-white">{song.collab.artistName}</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <p className="text-xs text-purple-300">{song.collab.role || 'Featuring / Vokal'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">
                    Featuring
                  </span>
                </div>
              </div>
            )}

            {/* Custom Credits */}
            {credits.map((credit, idx) => {
              return (
                <div
                  key={credit.id || idx}
                  className="p-3 rounded-2xl bg-[#040814] border border-white/[0.08] flex items-center justify-between hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center justify-center font-bold text-sm">
                      {credit.role.includes('Beat') || credit.role.includes('Pwodiktè')
                        ? '🎹'
                        : credit.role.includes('Pawòl') || credit.role.includes('Konpozitè')
                        ? '✍️'
                        : credit.role.includes('Mix') || credit.role.includes('Master')
                        ? '🎚️'
                        : credit.role.includes('Gita')
                        ? '🎸'
                        : credit.role.includes('Klavye')
                        ? '🎹'
                        : '🎤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-white">{credit.name}</p>
                        {credit.artistId && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectArtist && credit.artistId) {
                                onClose();
                                onSelectArtist(credit.artistId);
                              }
                            }}
                            className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 hover:underline transition-all"
                          >
                            Atis UpMizik ↗
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{credit.role}</p>
                      {credit.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5">{credit.notes}</p>
                      )}
                    </div>
                  </div>

                  {showPercentages && (
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {credit.percentage}%
                      </span>
                      <p className="text-[10px] text-slate-400">Pousantaj</p>
                    </div>
                  )}
                </div>
              );
            })}

            {credits.length === 0 && !song.collab && (
              <div className="p-4 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400">
                <p>Moso sa reyalize pa {song.artistName}.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#050811] flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Sistèm Kredi UpMizik</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-all"
          >
            Fèmen
          </button>
        </div>
      </div>
    </div>
  );
};
