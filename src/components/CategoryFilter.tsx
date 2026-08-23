import React from 'react';
import { MusicCategory } from '../types';
import { Sparkles, Music, WifiOff, Zap, ListMusic } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: MusicCategory;
  onSelectCategory: (cat: MusicCategory) => void;
  offlineCount?: number;
  onOpenOfflineModal?: () => void;
}

const CATEGORIES: { label: MusicCategory; icon?: string }[] = [
  { label: 'Tout' },
  { label: 'Kompa' },
  { label: 'Drill' },
  { label: 'Afro' },
  { label: 'Trap' },
  { label: 'Rap' },
  { label: 'Hip-hop' },
  { label: 'Gouyad' },
  { label: 'Rabòday' }
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  offlineCount = 0,
  onOpenOfflineModal
}) => {
  const isOfflineSelected = selectedCategory === 'Oflayn';

  return (
    <div className="w-full py-4 bg-[#05070a]/85 backdrop-blur-xl border-b border-white/[0.06] sticky top-16 sm:top-20 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Stil:
          </span>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                id={`cat-filter-btn-${cat.label.toLowerCase()}`}
                onClick={() => onSelectCategory(cat.label)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-1 ring-blue-400/50 scale-105'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}

          {/* Quick Offline Cached Filter Tab */}
          <button
            id="cat-filter-btn-offline"
            onClick={() => onSelectCategory('Oflayn')}
            className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
              isOfflineSelected
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 ring-1 ring-amber-300 scale-105'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
            title="Mizik ki anrejistre nan kach aparèy ou a pou jwe menm lè pa gen entènèt"
          >
            <Zap className={`w-3.5 h-3.5 ${isOfflineSelected ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
            <span>Oflayn (San Entènèt)</span>
            {offlineCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                isOfflineSelected ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/30 text-amber-200'
              }`}>
                {offlineCount}
              </span>
            )}
          </button>

          {/* Manage Offline Playlist & Batch Queue */}
          {onOpenOfflineModal && (
            <button
              id="cat-filter-btn-manage-playlists"
              onClick={onOpenOfflineModal}
              className="px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 active:scale-95"
              title="Kreye Playlist pèsonalize ak telechaje plizyè mizik an pakèt"
            >
              <ListMusic className="w-3.5 h-3.5 text-blue-400" />
              <span>Playlist Oflayn & Ke</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

