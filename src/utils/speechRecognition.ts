import { MusicItem, ArtistUser, MusicCategory } from '../types';

export type VoiceLanguage = 'ht-HT' | 'en-US' | 'fr-FR';

export type VoiceIntentType = 
  | 'PLAY_SONG' 
  | 'OPEN_ARTIST' 
  | 'SELECT_CATEGORY' 
  | 'OPEN_SUPPORT' 
  | 'SEARCH_QUERY';

export interface ParsedVoiceCommand {
  rawTranscript: string;
  intent: VoiceIntentType;
  query: string;
  matchedSong?: MusicItem;
  matchedArtist?: ArtistUser;
  matchedCategory?: MusicCategory;
  description: string;
  confidence?: number;
}

// Check if Web Speech API is supported
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

// Get SpeechRecognition Constructor safely
export function getSpeechRecognitionInstance(): any | null {
  if (typeof window === 'undefined') return null;
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRec) return null;
  return new SpeechRec();
}

const CATEGORY_SYNONYMS: Record<MusicCategory, string[]> = {
  'Tout': ['tout', 'tout mizik', 'tout kategori', 'all', 'all music'],
  'Kompa': ['kompa', 'konpa', 'compas', 'kompa direct', 'direct', 'gouyad kompa'],
  'Drill': ['drill', 'dril', 'drill 509', 'ayiti drill', 'haitian drill'],
  'Rabòday': ['raboday', 'rabòday', 'raborday', 'rabodai', 'elektwo raboday'],
  'Afro': ['afro', 'afrobeats', 'afrobeat', 'afro-kreyol', 'afro kreyol', 'afro pop'],
  'Trap': ['trap', 'trap kreyol', 'trape', 'trap music'],
  'Rap': ['rap', 'rap kreyol', 'rap kreyòl', 'rap ayisyen', 'rap kreyol 509'],
  'Hip-hop': ['hip hop', 'hip-hop', 'hiphop', 'boom bap'],
  'Gouyad': ['gouyad', 'gouyad sansib', 'guayad', 'gouyade', 'slow kompa'],
  'Oflayn': ['oflayn', 'offline', 'telechaje', 'downloaded']
};

/**
 * Intelligent voice command parser for Haitian Creole and English
 */
export function parseVoiceTranscript(
  transcript: string,
  musicList: MusicItem[],
  artists: ArtistUser[]
): ParsedVoiceCommand {
  const clean = transcript.trim().toLowerCase();
  
  if (!clean) {
    return {
      rawTranscript: transcript,
      intent: 'SEARCH_QUERY',
      query: '',
      description: 'Pa gen anyen ki te di'
    };
  }

  // 1. Check for Play Intent
  // Kreyòl: "jwe [x]", "koute [x]", "mete [x]", "fè m koute [x]"
  // English: "play [x]", "listen to [x]", "put on [x]", "stream [x]"
  const playMatch = clean.match(/^(?:jwe|joue|koute|ekoute|mete|fè\s+m\s+koute|play|listen\s+to|stream)\s+(.+)$/i);
  if (playMatch && playMatch[1]) {
    const target = playMatch[1].trim();
    
    // Check if target matches a specific song title or artist
    const foundSong = musicList.find(
      s => s.title.toLowerCase().includes(target) || 
           target.includes(s.title.toLowerCase()) ||
           s.artistName.toLowerCase().includes(target)
    );

    if (foundSong) {
      return {
        rawTranscript: transcript,
        intent: 'PLAY_SONG',
        query: foundSong.title,
        matchedSong: foundSong,
        description: `Jwe mizik "${foundSong.title}" pa ${foundSong.artistName}`
      };
    }

    // Check category match under play command (e.g. "jwe kompa")
    for (const [cat, syns] of Object.entries(CATEGORY_SYNONYMS)) {
      if (syns.some(s => target.includes(s) || s.includes(target))) {
        return {
          rawTranscript: transcript,
          intent: 'SELECT_CATEGORY',
          query: cat,
          matchedCategory: cat as MusicCategory,
          description: `Filtre epi koute kategori ${cat}`
        };
      }
    }

    return {
      rawTranscript: transcript,
      intent: 'SEARCH_QUERY',
      query: target,
      description: `Chèche mizik: "${target}"`
    };
  }

  // 2. Check for Artist Profile Intent
  // Kreyòl: "atis [x]", "biyografi [x]", "pwofil [x]", "wè atis [x]", "kiyès ki [x]"
  // English: "artist [x]", "profile of [x]", "who is [x]", "show artist [x]"
  const artistMatch = clean.match(/^(?:atis|biyografi|pwofil|wè\s+atis|kiyès\s+ki|artist|profile\s+of|who\s+is|show\s+artist)\s+(.+)$/i);
  if (artistMatch && artistMatch[1]) {
    const target = artistMatch[1].trim();
    const foundArtist = artists.find(
      a => a.stageName.toLowerCase().includes(target) || 
           target.includes(a.stageName.toLowerCase()) ||
           a.name.toLowerCase().includes(target)
    );

    if (foundArtist) {
      return {
        rawTranscript: transcript,
        intent: 'OPEN_ARTIST',
        query: foundArtist.stageName,
        matchedArtist: foundArtist,
        description: `Ouvri pwofil ak biyografi ${foundArtist.stageName}`
      };
    }

    return {
      rawTranscript: transcript,
      intent: 'SEARCH_QUERY',
      query: target,
      description: `Chèche atis "${target}"`
    };
  }

  // 3. Check for Support/Donation Intent
  // Kreyòl: "sipòte [x]", "sipote [x]", "ede [x]", "donasyon pou [x]", "voye kòb bay [x]"
  // English: "support [x]", "donate to [x]", "tip [x]", "help [x]"
  const supportMatch = clean.match(/^(?:sipòte|sipote|ede|donasyon\s+pou|voye\s+kòb\s+bay|support|donate\s+to|tip|help)\s+(.+)$/i);
  if (supportMatch && supportMatch[1]) {
    const target = supportMatch[1].trim();
    
    // Check if artist matches
    const foundArtist = artists.find(
      a => a.stageName.toLowerCase().includes(target) || 
           target.includes(a.stageName.toLowerCase())
    );

    const foundSong = musicList.find(
      s => s.title.toLowerCase().includes(target) || 
           s.artistName.toLowerCase().includes(target)
    );

    if (foundSong) {
      return {
        rawTranscript: transcript,
        intent: 'OPEN_SUPPORT',
        query: foundSong.artistName,
        matchedSong: foundSong,
        description: `Fè yon sipò pou ${foundSong.artistName} sou moso "${foundSong.title}"`
      };
    }

    if (foundArtist) {
      const artistSong = musicList.find(s => s.artistId === foundArtist.id || s.artistName.toLowerCase() === foundArtist.stageName.toLowerCase());
      if (artistSong) {
        return {
          rawTranscript: transcript,
          intent: 'OPEN_SUPPORT',
          query: foundArtist.stageName,
          matchedSong: artistSong,
          matchedArtist: foundArtist,
          description: `Fè yon sipò pou atis ${foundArtist.stageName}`
        };
      }
    }

    return {
      rawTranscript: transcript,
      intent: 'SEARCH_QUERY',
      query: target,
      description: `Chèche atis pou sipòte: "${target}"`
    };
  }

  // 4. Check for Category Filter Intent
  // Kreyòl: "filtre [x]", "kategori [x]", "stil [x]", "mizik [x]"
  // English: "filter [x]", "category [x]", "genre [x]", "music [x]"
  const filterMatch = clean.match(/^(?:filtre|kategori|stil|mizik|genre|filter|category)\s+(.+)$/i);
  const targetCategoryQuery = filterMatch ? filterMatch[1].trim() : clean;

  for (const [cat, syns] of Object.entries(CATEGORY_SYNONYMS)) {
    if (syns.some(s => targetCategoryQuery === s || targetCategoryQuery.includes(s) || clean === s)) {
      return {
        rawTranscript: transcript,
        intent: 'SELECT_CATEGORY',
        query: cat,
        matchedCategory: cat as MusicCategory,
        description: `Filtre kategori ${cat}`
      };
    }
  }

  // 5. Check for Search Prefix
  // Kreyòl: "chèche [x]", "chache [x]", "jwenn [x]", "montre m [x]"
  // English: "search [x]", "find [x]", "look for [x]", "search for [x]"
  const searchPrefixMatch = clean.match(/^(?:chèche|chache|jwenn|montre\s+m|search\s+for|search|find|look\s+for)\s+(.+)$/i);
  const searchQueryText = searchPrefixMatch ? searchPrefixMatch[1].trim() : clean;

  // Check if query is exact artist
  const exactArtist = artists.find(
    a => a.stageName.toLowerCase() === searchQueryText ||
         a.name.toLowerCase() === searchQueryText
  );
  if (exactArtist) {
    return {
      rawTranscript: transcript,
      intent: 'OPEN_ARTIST',
      query: exactArtist.stageName,
      matchedArtist: exactArtist,
      description: `Ouvri pwofil atis ${exactArtist.stageName}`
    };
  }

  // Check if query is exact song
  const exactSong = musicList.find(
    s => s.title.toLowerCase() === searchQueryText
  );
  if (exactSong) {
    return {
      rawTranscript: transcript,
      intent: 'PLAY_SONG',
      query: exactSong.title,
      matchedSong: exactSong,
      description: `Jwe moso "${exactSong.title}" pa ${exactSong.artistName}`
    };
  }

  // Default fallback: Search query
  return {
    rawTranscript: transcript,
    intent: 'SEARCH_QUERY',
    query: searchQueryText,
    description: `Chèche: "${searchQueryText}"`
  };
}
