import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Music,
  User,
  Play,
  Pause,
  HeartHandshake,
  ArrowRight,
  Sparkles,
  MapPin,
  Flame,
  Radio,
  SlidersHorizontal,
  CheckCircle2,
  Tag,
  Mic
} from 'lucide-react';
import { MusicItem, ArtistUser, MusicCategory } from '../types';
import { getArtistBadgeInfo, calculateArtistTotalDonations } from '../utils/badgeSystem';
import { VoiceSearchModal } from './VoiceSearchModal';

interface LiveSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  musicList: MusicItem[];
  artists: ArtistUser[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  onPlayToggle: (music: MusicItem) => void;
  onOpenSupport: (music: MusicItem) => void;
  onOpenArtistProfile: (artist: ArtistUser) => void;
  onSelectCategory?: (category: MusicCategory | string) => void;
  onSearchSubmit?: () => void;
  variant?: 'compact' | 'hero' | 'mobile';
  placeholder?: string;
  autoFocus?: boolean;
}

const POPULAR_SUGGESTIONS = [
  'Bakè',
  'Kompa',
  'Drill',
  'Rabòday',
  'Jessy Flava',
  'Gouyad',
  'Pòtoprens',
  'Kap-Ayisyen',
  'Afro',
  'Trap'
];

const ALL_CATEGORIES: MusicCategory[] = [
  'Kompa',
  'Drill',
  'Rabòday',
  'Afro',
  'Trap',
  'Rap',
  'Hip-hop',
  'Gouyad'
];

export const LiveSearchBar: React.FC<LiveSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  musicList,
  artists,
  currentPlayingId,
  isPlaying,
  onPlayToggle,
  onOpenSupport,
  onOpenArtistProfile,
  onSelectCategory,
  onSearchSubmit,
  variant = 'compact',
  placeholder = 'Chèche yon mizik, atis, oubyen stil...',
  autoFocus = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard shortcut listener (press '/' or Cmd+K to focus search when not in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();

  // Search Results Computation
  const searchResults = useMemo(() => {
    if (!cleanQuery) {
      return {
        matchedSongs: [],
        matchedArtists: [],
        matchedCategories: [],
        hasMatches: false
      };
    }

    // Match Artists
    const matchedArtists = artists.filter((artist) => {
      return (
        artist.stageName.toLowerCase().includes(cleanQuery) ||
        artist.name.toLowerCase().includes(cleanQuery) ||
        artist.city.toLowerCase().includes(cleanQuery) ||
        (artist.musicalRoots && artist.musicalRoots.toLowerCase().includes(cleanQuery)) ||
        (artist.musicalInfluences && artist.musicalInfluences.toLowerCase().includes(cleanQuery)) ||
        (artist.bio && artist.bio.toLowerCase().includes(cleanQuery))
      );
    }).slice(0, 4);

    // Match Songs
    const matchedSongs = musicList.filter((song) => {
      return (
        song.title.toLowerCase().includes(cleanQuery) ||
        song.artistName.toLowerCase().includes(cleanQuery) ||
        song.category.toLowerCase().includes(cleanQuery) ||
        (song.feat && song.feat.toLowerCase().includes(cleanQuery))
      );
    }).slice(0, 6);

    // Match Categories
    const matchedCategories = ALL_CATEGORIES.filter((cat) =>
      cat.toLowerCase().includes(cleanQuery)
    );

    const hasMatches =
      matchedSongs.length > 0 || matchedArtists.length > 0 || matchedCategories.length > 0;

    return {
      matchedSongs,
      matchedArtists,
      matchedCategories,
      hasMatches
    };
  }, [cleanQuery, musicList, artists]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      setIsOpen(false);
      if (onSearchSubmit) {
        onSearchSubmit();
      }
    }
  };

  const handleSelectSongItem = (song: MusicItem) => {
    setIsOpen(false);
    onPlayToggle(song);
  };

  const handleSelectArtistItem = (artist: ArtistUser) => {
    setIsOpen(false);
    onOpenArtistProfile(artist);
  };

  const handleSelectCategoryItem = (category: MusicCategory | string) => {
    setIsOpen(false);
    setSearchQuery('');
    if (onSelectCategory) {
      onSelectCategory(category);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // Helper to highlight matching text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400/30 text-yellow-300 font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Container styling variations
  const isHero = variant === 'hero';
  const isMobile = variant === 'mobile';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Field Container */}
      <div className="relative w-full">
        <Search
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
            isOpen ? 'text-yellow-400' : 'text-slate-400'
          } ${isHero ? 'w-5 h-5 left-4' : 'w-4 h-4'}`}
        />

        <input
          ref={inputRef}
          type="text"
          value={searchQuery ?? ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={`w-full outline-none transition-all placeholder:text-slate-500 font-normal ${
            isHero
              ? 'bg-[#0d1424]/95 border border-white/[0.18] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-slate-100 text-sm sm:text-base rounded-2xl pl-12 pr-12 py-3.5 sm:py-4 shadow-2xl backdrop-blur-md'
              : isMobile
              ? 'bg-[#0d1424] border border-white/[0.12] focus:border-blue-500 text-slate-200 text-sm rounded-xl pl-10 pr-10 py-2.5 shadow-inner'
              : 'bg-[#0d1424]/80 border border-white/[0.1] hover:border-white/[0.2] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-200 text-xs sm:text-sm rounded-full pl-10 pr-10 py-2.5 backdrop-blur-md'
          }`}
        />

        {/* Clear, Voice Search & Keyboard Badge */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {searchQuery ? (
            <button
              onClick={handleClear}
              type="button"
              title="Efase rechèch la"
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            !isMobile && (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white/[0.06] border border-white/[0.08] rounded">
                /
              </kbd>
            )
          )}

          {/* Voice Search Button */}
          <button
            id={`voice-search-mic-btn-${variant}`}
            type="button"
            onClick={() => {
              setIsOpen(false);
              setShowVoiceModal(true);
            }}
            title="Rechèch pa vwa (Kreyòl / Anglè)"
            aria-label="Kòmanse rechèch vokal"
            className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all active:scale-90 relative group"
          >
            <Mic className="w-4 h-4" />
            <span className="absolute -top-7 right-0 pointer-events-none hidden group-hover:block bg-slate-900 text-[10px] text-slate-200 px-2 py-0.5 rounded shadow border border-slate-700 whitespace-nowrap">
              Pale pou chèche
            </span>
          </button>
        </div>
      </div>

      {/* Floating Live Search Results Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-2 z-50 bg-[#060a14]/95 backdrop-blur-2xl border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden transition-all animate-fadeIn ${
            isHero ? 'max-h-[480px]' : 'max-h-[420px]'
          } overflow-y-auto divide-y divide-white/[0.06] text-left`}
        >
          {/* STATE 1: Empty Query / Search Suggestions */}
          {!cleanQuery && (
            <div className="p-4 sm:p-5">
              {/* Quick Voice Search Banner inside dropdown */}
              <div
                onClick={() => {
                  setIsOpen(false);
                  setShowVoiceModal(true);
                }}
                className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-blue-950/40 to-slate-900/60 border border-blue-500/20 hover:border-blue-500/40 flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-yellow-400 transition-colors">
                      Rechèch Vokal (Kreyòl & Anglè)
                    </p>
                    <p className="text-[10px] text-slate-400">Pale pou jwe mizik, jwenn atis, oubyen filtre stil</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Pale <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Rechèch Popilè sou UpMizik</span>
                </span>
                <span className="text-[11px] text-slate-500">Tape pou wè rezilta dirèk</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {POPULAR_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] hover:border-yellow-400/40 transition-all flex items-center gap-1.5 group"
                  >
                    <Search className="w-3 h-3 text-slate-500 group-hover:text-yellow-400 transition-colors" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>

              {/* Quick Categories list */}
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-400" />
                  <span>Eksplore pa Jan Mizikal:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CATEGORIES.slice(0, 6).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectCategoryItem(cat)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition-all"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: Query Typed with Results */}
          {cleanQuery && searchResults.hasMatches && (
            <div className="py-2 space-y-3">
              {/* SECTION: MATCHING CATEGORIES */}
              {searchResults.matchedCategories.length > 0 && (
                <div className="px-3 pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-blue-400" />
                    <span>Kategori / Jan</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {searchResults.matchedCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSelectCategoryItem(cat)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-all"
                      >
                        <span>{cat}</span>
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: MATCHING ARTISTS */}
              {searchResults.matchedArtists.length > 0 && (
                <div className="px-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-yellow-400" />
                      <span>Atis Yo ({searchResults.matchedArtists.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Klike pou wè pwofil</span>
                  </div>

                  <div className="space-y-1">
                    {searchResults.matchedArtists.map((artist) => {
                      const artistSongs = musicList.filter((m) => m.artistId === artist.id);
                      const badgeInfo = getArtistBadgeInfo(artist, artistSongs);

                      return (
                        <div
                          key={artist.id}
                          onClick={() => handleSelectArtistItem(artist)}
                          className="group p-2 rounded-xl hover:bg-white/[0.07] border border-transparent hover:border-white/[0.08] cursor-pointer flex items-center justify-between gap-3 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/[0.1] bg-black">
                              <img
                                src={artist.avatarUrl}
                                alt={artist.stageName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              {artist.status === 'active' && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border border-black" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                                  {highlightMatch(artist.stageName, cleanQuery)}
                                </h4>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${badgeInfo.bgClass} ${badgeInfo.colorClass} border ${badgeInfo.borderClass}`}
                                >
                                  {badgeInfo.shortLabel}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="flex items-center gap-0.5 text-slate-400 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-red-400 shrink-0" />
                                  {highlightMatch(artist.city, cleanQuery)}
                                </span>
                                <span>•</span>
                                <span className="text-slate-400">
                                  {artistSongs.length} {artistSongs.length === 1 ? 'mizik' : 'mizik'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectArtistItem(artist);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/[0.06] group-hover:bg-blue-600/30 text-slate-300 group-hover:text-blue-300 border border-white/[0.08] group-hover:border-blue-500/40 transition-all flex items-center gap-1"
                            >
                              <span>Pwofil</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: MATCHING SONGS */}
              {searchResults.matchedSongs.length > 0 && (
                <div className="px-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Music className="w-3 h-3 text-red-400" />
                      <span>Mizik Yo ({searchResults.matchedSongs.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Koute oubyen sipòte</span>
                  </div>

                  <div className="space-y-1">
                    {searchResults.matchedSongs.map((song) => {
                      const isThisPlaying = currentPlayingId === song.id && isPlaying;
                      return (
                        <div
                          key={song.id}
                          className="group p-2 rounded-xl hover:bg-white/[0.07] border border-transparent hover:border-white/[0.08] flex items-center justify-between gap-3 transition-all"
                        >
                          <div
                            onClick={() => handleSelectSongItem(song)}
                            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                          >
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/[0.1] bg-black">
                              <img
                                src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                                alt={song.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPlayToggle(song);
                                }}
                                className={`absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                                  isThisPlaying
                                    ? 'bg-red-600 text-white scale-100'
                                    : 'bg-black/70 text-yellow-400 opacity-90 group-hover:scale-105'
                                }`}
                              >
                                {isThisPlaying ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current ml-0.5" />
                                )}
                              </button>
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-yellow-300 transition-colors">
                                {highlightMatch(song.title, cleanQuery)}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span className="text-slate-300 truncate">
                                  {highlightMatch(song.artistName, cleanQuery)}
                                </span>
                                {song.feat && (
                                  <span className="text-slate-500 truncate text-[10px]">
                                    (ft. {highlightMatch(song.feat, cleanQuery)})
                                  </span>
                                )}
                                <span>•</span>
                                <span className="text-yellow-400/90 text-[10px] font-semibold">
                                  {song.category}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                onOpenSupport(song);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500/10 hover:bg-yellow-500 text-yellow-300 hover:text-slate-950 border border-yellow-500/30 transition-all flex items-center gap-1"
                              title={`Sipòte ${song.artistName}`}
                            >
                              <HeartHandshake className="w-3 h-3" />
                              <span className="hidden sm:inline">Sipòte</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE 3: Query Typed with NO Results */}
          {cleanQuery && !searchResults.hasMatches && (
            <div className="p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Nou pa jwenn okenn atis oubyen mizik pou «{searchQuery}»
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Eseye chèche pa non atis (egz: <em>Jessy Flava, Sonson</em>), vil (egz: <em>Pòtoprens, Kafou</em>), oubyen stil mizik.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Eseye sijesyon sa yo:
                </span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {POPULAR_SUGGESTIONS.slice(0, 5).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSuggestionClick(item)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DROPDOWN FOOTER: View all results in main feed */}
          {cleanQuery && (
            <div className="bg-[#04060c] px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>
                  {searchResults.matchedSongs.length + searchResults.matchedArtists.length} rezilta jwenn
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onSearchSubmit) onSearchSubmit();
                }}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Filtre nan paj la</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voice Search Modal */}
      <VoiceSearchModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        musicList={musicList}
        artists={artists}
        onExecuteQuery={(query) => {
          setSearchQuery(query);
          if (onSearchSubmit) onSearchSubmit();
        }}
        onPlaySong={(song) => {
          onPlayToggle(song);
          if (onSearchSubmit) onSearchSubmit();
        }}
        onOpenArtistProfile={(artist) => {
          onOpenArtistProfile(artist);
        }}
        onSelectCategory={(cat) => {
          if (onSelectCategory) onSelectCategory(cat);
        }}
        onOpenSupport={(song) => {
          onOpenSupport(song);
        }}
      />
    </div>
  );
};
