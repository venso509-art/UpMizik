import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  Play,
  User,
  HeartHandshake,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Radio,
  ArrowRight,
  Globe
} from 'lucide-react';
import { MusicItem, ArtistUser, MusicCategory } from '../types';
import {
  isSpeechRecognitionSupported,
  getSpeechRecognitionInstance,
  parseVoiceTranscript,
  ParsedVoiceCommand,
  VoiceLanguage
} from '../utils/speechRecognition';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  musicList: MusicItem[];
  artists: ArtistUser[];
  onExecuteQuery: (query: string) => void;
  onPlaySong?: (song: MusicItem) => void;
  onOpenArtistProfile?: (artist: ArtistUser) => void;
  onSelectCategory?: (category: MusicCategory | string) => void;
  onOpenSupport?: (song: MusicItem) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  musicList,
  artists,
  onExecuteQuery,
  onPlaySong,
  onOpenArtistProfile,
  onSelectCategory,
  onOpenSupport
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>('ht-HT');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceCommand | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const autoExecTimerRef = useRef<any>(null);
  const audioAnimationRef = useRef<any>(null);

  const isSupported = isSpeechRecognitionSupported();

  // Initialize and start listening when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setTranscript('');
      setInterimTranscript('');
      setParsedResult(null);
      setIsAutoExecuting(false);
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
      if (autoExecTimerRef.current) clearInterval(autoExecTimerRef.current);
      if (audioAnimationRef.current) clearInterval(audioAnimationRef.current);
    };
  }, [isOpen, selectedLang]);

  // Audio level simulator animation while listening
  useEffect(() => {
    if (isListening) {
      audioAnimationRef.current = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 80) + 20);
      }, 100);
    } else {
      setAudioLevel(0);
      if (audioAnimationRef.current) clearInterval(audioAnimationRef.current);
    }
    return () => {
      if (audioAnimationRef.current) clearInterval(audioAnimationRef.current);
    };
  }, [isListening]);

  const startListening = () => {
    if (!isSupported) {
      setErrorMsg('Navigatè sa a pa sipòte Web Speech API. Tanpri itilize Chrome, Edge, oswa Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = getSpeechRecognitionInstance();
      if (!recognition) {
        setErrorMsg('Pa kapab inisyalize mikwofòn.');
        return;
      }

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLang === 'ht-HT' ? 'fr-HT' : selectedLang; // Chrome uses fr-HT / fr-FR fallback for Haitian French/Creole speech or en-US

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        if (interimStr) {
          setInterimTranscript(interimStr);
        }

        if (finalStr) {
          setTranscript(finalStr);
          setInterimTranscript('');
          const parsed = parseVoiceTranscript(finalStr, musicList, artists);
          setParsedResult(parsed);
          triggerAutoExecuteCountdown(parsed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMsg('Pèmisyon mikwofòn bloke. Tanpri otorize mikwofòn nan navigatè w la.');
        } else if (event.error === 'no-speech') {
          setErrorMsg('Nou pa tande anyen. Eseye pale ankò.');
        } else if (event.error === 'network') {
          setErrorMsg('Erè koneksyon rezo pou rekonesans vokal.');
        } else {
          setErrorMsg(`Erè: ${event.error}. Eseye ankò.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setErrorMsg('Erè lè n ap ouvri mikwofòn la.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const triggerAutoExecuteCountdown = (parsed: ParsedVoiceCommand) => {
    setIsAutoExecuting(true);
    let count = 2;
    setCountdown(count);

    if (autoExecTimerRef.current) clearInterval(autoExecTimerRef.current);

    autoExecTimerRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(autoExecTimerRef.current);
        executeCommand(parsed);
      }
    }, 1000);
  };

  const cancelAutoExecute = () => {
    if (autoExecTimerRef.current) clearInterval(autoExecTimerRef.current);
    setIsAutoExecuting(false);
  };

  const executeCommand = (commandToRun?: ParsedVoiceCommand | null) => {
    const cmd = commandToRun || parsedResult;
    if (!cmd) return;

    cancelAutoExecute();
    onClose();

    if (cmd.intent === 'PLAY_SONG' && cmd.matchedSong && onPlaySong) {
      onPlaySong(cmd.matchedSong);
      onExecuteQuery(cmd.matchedSong.title);
    } else if (cmd.intent === 'OPEN_ARTIST' && cmd.matchedArtist && onOpenArtistProfile) {
      onOpenArtistProfile(cmd.matchedArtist);
      onExecuteQuery(cmd.matchedArtist.stageName);
    } else if (cmd.intent === 'SELECT_CATEGORY' && cmd.matchedCategory && onSelectCategory) {
      onSelectCategory(cmd.matchedCategory);
      onExecuteQuery('');
    } else if (cmd.intent === 'OPEN_SUPPORT' && cmd.matchedSong && onOpenSupport) {
      onOpenSupport(cmd.matchedSong);
      onExecuteQuery(cmd.matchedSong.artistName);
    } else {
      // Default: set search query
      onExecuteQuery(cmd.query || transcript);
    }
  };

  const handlePresetSampleClick = (sampleText: string) => {
    setTranscript(sampleText);
    setInterimTranscript('');
    const parsed = parseVoiceTranscript(sampleText, musicList, artists);
    setParsedResult(parsed);
    triggerAutoExecuteCountdown(parsed);
  };

  if (!isOpen) return null;

  const currentDisplayTranscript = transcript || interimTranscript;

  return (
    <div
      id="voice-search-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-scroll bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-full flex items-center justify-center py-4">
        <div
          id="voice-search-modal-container"
          className="relative w-full max-w-lg bg-[#0a0f1d]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col items-center text-center my-auto max-h-[92dvh] overflow-y-auto"
        >
        {/* Subtle Ambient Glowing Background */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isListening ? 'bg-red-500/20' : parsedResult ? 'bg-blue-500/20' : 'bg-yellow-500/10'
        }`} />

        {/* Header Bar */}
        <div className="w-full flex items-center justify-between mb-6 z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isListening ? 'bg-red-400' : 'bg-blue-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isListening ? 'bg-red-500' : 'bg-blue-500'
              }`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isListening ? 'Rechèch Vokal An Direk' : 'Kòmand Vokal'}
            </span>
          </div>

          {/* Language Switcher Pill */}
          <div className="flex items-center bg-white/[0.06] rounded-full p-1 border border-white/[0.08]">
            <button
              onClick={() => setSelectedLang('ht-HT')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                selectedLang === 'ht-HT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇭🇹</span>
              <span>Kreyòl</span>
            </button>
            <button
              onClick={() => setSelectedLang('en-US')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                selectedLang === 'en-US'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇺🇸</span>
              <span>English</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Pulse / Microphone Stage */}
        <div className="my-3 relative flex items-center justify-center">
          {/* Animated Radial Waves */}
          {isListening && (
            <>
              <div className="absolute w-36 h-36 rounded-full bg-red-500/20 animate-ping opacity-60 pointer-events-none" />
              <div className="absolute w-28 h-28 rounded-full bg-rose-500/30 animate-pulse pointer-events-none" />
            </>
          )}

          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
              isListening
                ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-500/40 ring-4 ring-red-400/40 scale-105'
                : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white shadow-blue-500/30 hover:scale-105'
            }`}
            title={isListening ? 'Klike pou kanpe' : 'Klike pou pale'}
          >
            {isListening ? (
              <Mic className="w-10 h-10 animate-bounce" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>
        </div>

        {/* Audio Visualizer Equalizer Simulation */}
        <div className="h-6 flex items-center justify-center gap-1.5 my-2">
          {[0.4, 0.8, 1.2, 0.6, 1.0, 0.5, 0.9, 0.7].map((factor, i) => {
            const barHeight = isListening ? Math.max(4, (audioLevel * factor) % 24) : 4;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  isListening ? 'bg-gradient-to-t from-red-500 to-yellow-400' : 'bg-slate-700'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>

        {/* Live Transcription Bubble */}
        <div className="w-full mt-3 min-h-[70px] p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center text-center">
          {currentDisplayTranscript ? (
            <p className="text-base sm:text-lg font-bold text-white leading-snug break-words max-w-full">
              "{currentDisplayTranscript}"
            </p>
          ) : isListening ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 animate-pulse">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>
                {selectedLang === 'ht-HT'
                  ? 'M ap koute w... Pale kounya (eg: "Jwe Bakè", "Filtre Kompa")'
                  : 'Listening... Speak now (e.g. "Play Kompa", "Artist Baky")'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {selectedLang === 'ht-HT'
                ? 'Klike sou mikwo a pou kòmanse pale'
                : 'Click the microphone to start speaking'}
            </p>
          )}

          {errorMsg && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Detected Intent & Action Preview Card */}
        {parsedResult && (
          <div className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-[#0d1424] to-indigo-950/60 border border-blue-500/30 text-left animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {parsedResult.intent === 'PLAY_SONG' && <Play className="w-4 h-4 text-emerald-400" />}
                {parsedResult.intent === 'OPEN_ARTIST' && <User className="w-4 h-4 text-cyan-400" />}
                {parsedResult.intent === 'SELECT_CATEGORY' && <Filter className="w-4 h-4 text-yellow-400" />}
                {parsedResult.intent === 'OPEN_SUPPORT' && <HeartHandshake className="w-4 h-4 text-rose-400" />}
                {parsedResult.intent === 'SEARCH_QUERY' && <Search className="w-4 h-4 text-blue-400" />}
                <span className="text-xs font-bold text-slate-200">Aksyon Rekoni:</span>
              </div>

              {isAutoExecuting && (
                <button
                  onClick={cancelAutoExecute}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Anile ({countdown}s)
                </button>
              )}
            </div>

            <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span>{parsedResult.description}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                id="voice-execute-btn"
                onClick={() => executeCommand(parsedResult)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Egzekite Kounya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={startListening}
                className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-colors"
                title="Re-eseye pale"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Interactive Sample Commands */}
        <div className="w-full mt-6 pt-4 border-t border-white/[0.08] text-left">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
            <span>
              {selectedLang === 'ht-HT' ? 'Kòmand ou ka di an Kreyòl:' : 'Sample voice commands:'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(selectedLang === 'ht-HT'
              ? [
                  'Jwe Kompa',
                  'Chèche Bakè',
                  'Atis Jessy Flava',
                  'Filtre Drill',
                  'Sipòte Bedjine',
                  'Mizik Rabòday'
                ]
              : [
                  'Play Kompa',
                  'Search Bakè',
                  'Artist Wendy',
                  'Filter Drill',
                  'Support Roody',
                  'Find Rap'
                ]
            ).map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSampleClick(sample)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.1] hover:text-white text-slate-300 border border-white/[0.08] transition-all active:scale-95 flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3 text-slate-400" />
                <span>"{sample}"</span>
              </button>
            ))}
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};
