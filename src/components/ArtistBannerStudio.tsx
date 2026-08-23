import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Download,
  Check,
  RefreshCw,
  Palette,
  Upload,
  Image as ImageIcon,
  Sliders,
  ShieldCheck,
  Music,
  MapPin,
  Eye,
  Loader2,
  Lock,
  AlertCircle,
  X,
  Type
} from 'lucide-react';
import { ArtistUser } from '../types';
import {
  generateStylizedBanner,
  GENRE_THEMES,
  GenreThemeConfig,
  getThemeConfigForGenre
} from '../utils/bannerGenerator';
import { StorageService } from '../utils/storage';
import { compressAndReadFile } from '../utils/imageUtils';

interface ArtistBannerStudioProps {
  currentArtist: ArtistUser;
  onBannerUpdated?: (newBannerUrl: string) => void;
  isArtistActive?: boolean;
  onBlockedAction?: (actionName: string) => void;
}

export const ArtistBannerStudio: React.FC<ArtistBannerStudioProps> = ({
  currentArtist,
  onBannerUpdated,
  isArtistActive = true,
  onBlockedAction
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customStageName, setCustomStageName] = useState<string>(currentArtist.stageName);
  const [selectedGenre, setSelectedGenre] = useState<string>(() => {
    if (currentArtist.bannerGenreTheme) return currentArtist.bannerGenreTheme;
    if (currentArtist.musicalRoots) {
      if (currentArtist.musicalRoots.toLowerCase().includes('drill')) return 'Drill';
      if (currentArtist.musicalRoots.toLowerCase().includes('rap')) return 'Rap';
      if (currentArtist.musicalRoots.toLowerCase().includes('afro')) return 'Afro';
      if (currentArtist.musicalRoots.toLowerCase().includes('rabòday')) return 'Rabòday';
      if (currentArtist.musicalRoots.toLowerCase().includes('gouyad')) return 'Gouyad';
      if (currentArtist.musicalRoots.toLowerCase().includes('rasin')) return 'Rasin';
      if (currentArtist.musicalRoots.toLowerCase().includes('trap')) return 'Trap';
    }
    return 'Kompa';
  });

  const [customCity, setCustomCity] = useState<string>(currentArtist.city || 'Ayiti');
  const [customSubtitle, setCustomSubtitle] = useState<string>(
    currentArtist.artistQuote || `${selectedGenre} • ${currentArtist.city || 'Ayiti'}`
  );
  
  const [previewBannerUrl, setPreviewBannerUrl] = useState<string>(() => {
    if (currentArtist.headerBannerUrl) return currentArtist.headerBannerUrl;
    return generateStylizedBanner({
      stageName: currentArtist.stageName,
      genre: selectedGenre,
      city: currentArtist.city,
      subtitle: currentArtist.artistQuote
    });
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto generate initial or when artist changes if no banner
  const handleGenerate = (genreToUse = selectedGenre) => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateStylizedBanner({
        stageName: customStageName.trim() || currentArtist.stageName,
        genre: genreToUse,
        city: customCity.trim() || currentArtist.city,
        subtitle: customSubtitle.trim() || undefined
      });
      setPreviewBannerUrl(generated);
      setIsGenerating(false);
    }, 250);
  };

  const handleGenreSelect = (genreKey: string) => {
    setSelectedGenre(genreKey);
    handleGenerate(genreKey);
  };

  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Tanpri chwazi yon fichye imaj valab (PNG, JPG, WebP).');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // Compress to 1280x480 standard banner dimension
      const compressed = await compressAndReadFile(file, 1280, 480, 0.85);
      if (compressed) {
        setPreviewBannerUrl(compressed);
      }
    } catch (err) {
      console.error('Erè pandan telechaje foto bannè:', err);
      setErrorMessage('Pa rive trete foto a. Tanpri re-eseye ak yon lòt imaj.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyToProfile = () => {
    if (!isArtistActive) {
      const msg = 'Ou pap ka chanje oswa aplike bannè sou pwofil ou toutotan Administratè UpMizik la pa fin valide prèv transfè w la.';
      setErrorMessage(msg);
      if (onBlockedAction) {
        onBlockedAction('Aplike Bannè');
      }
      setTimeout(() => setErrorMessage(null), 6000);
      return;
    }

    if (!previewBannerUrl) return;

    const updatedArtist: ArtistUser = {
      ...currentArtist,
      headerBannerUrl: previewBannerUrl,
      bannerGenreTheme: selectedGenre
    };

    StorageService.saveArtist(updatedArtist);
    if (onBannerUpdated) {
      onBannerUpdated(previewBannerUrl);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleDownloadBanner = () => {
    if (!previewBannerUrl) return;
    const link = document.createElement('a');
    link.href = previewBannerUrl;
    link.download = `UpMizik_Banner_${currentArtist.stageName.replace(/\s+/g, '_')}_${selectedGenre}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentThemeConfig = getThemeConfigForGenre(selectedGenre);

  return (
    <div className="bg-[#0a0f1d]/95 border border-white/[0.08] rounded-3xl p-5 sm:p-7 backdrop-blur-xl space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span>Jenetè & Modifikatè Bannè Pwofil Atis</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Chwazi yon anbyans AI stilize oswa telechaje pwòp foto kouvèti w (1280x420) pou pwofil piblik ou.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCustomImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.12] flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isUploadingPhoto ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Upload className="w-4 h-4 text-cyan-400" />
            )}
            <span>{isUploadingPhoto ? 'Ap trete...' : 'Telechaje Pwòp Foto W'}</span>
          </button>

          <button
            id="banner-auto-generate-btn"
            type="button"
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-yellow-950/40 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{isGenerating ? 'Ap Jenere...' : 'Re-Jenere Bannè AI'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Area (16:9 Aspect Ratio) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Apèsi Bannè Pwofil la (16:9 Widescreen)</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">1280 x 420 HD</span>
        </div>

        <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.12] shadow-2xl bg-black aspect-[16/6] sm:aspect-[16/5.5]">
          {previewBannerUrl ? (
            <img
              src={previewBannerUrl}
              alt={`Bannè ${currentArtist.stageName}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
              Klike sou 'Re-Jenere' pou kreye bannè a
            </div>
          )}

          {/* Quick overlay badge for selected theme */}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white flex items-center gap-1.5">
            <Palette className="w-3 h-3 text-yellow-400" />
            <span>{currentThemeConfig.name}</span>
          </div>
        </div>
      </div>

      {/* Genre Style Selection Tabs */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Chwazi Stil Mizikal & Anbyans Vizyèl
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(GENRE_THEMES).map(([key, config]) => {
            const isSelected = selectedGenre === key;
            return (
              <button
                key={key}
                type="button"
                id={`genre-theme-btn-${key.toLowerCase()}`}
                onClick={() => handleGenreSelect(key)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-yellow-400/80 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-lg shadow-yellow-500/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-yellow-400' : 'text-white'}`}>
                    {key}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ backgroundColor: config.accentColor }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  {config.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtitle & Customization Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Non Sèn sou Bannè a
          </label>
          <input
            type="text"
            value={customStageName ?? ''}
            onChange={(e) => setCustomStageName(e.target.value)}
            placeholder="egz: Roody Roodboy, Wendy..."
            className="w-full bg-[#05070a] border border-white/[0.12] focus:border-yellow-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Vil / Orijin sou Bannè a
          </label>
          <input
            type="text"
            value={customCity ?? ''}
            onChange={(e) => setCustomCity(e.target.value)}
            placeholder="egz: Pòtoprens, Okap, Leyogàn..."
            className="w-full bg-[#05070a] border border-white/[0.12] focus:border-yellow-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Deviz oswa Sou-Tit sou Bannè a
          </label>
          <input
            type="text"
            value={customSubtitle ?? ''}
            onChange={(e) => setCustomSubtitle(e.target.value)}
            placeholder="egz: Mizik se vwa nanm nou..."
            className="w-full bg-[#05070a] border border-white/[0.12] focus:border-yellow-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => handleGenerate()}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mete Chanjman yo sou Bannè a</span>
        </button>
      </div>

      {/* Error & Block Notification */}
      {errorMessage && (
        <div className="p-4 bg-red-950/80 border-2 border-red-500/80 rounded-2xl flex items-center gap-3 text-xs text-red-200 animate-fadeIn backdrop-blur-md shadow-xl shadow-red-950/50">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="font-bold text-white">Aksyon Bloke!</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200 animate-fadeIn backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="font-semibold">Bannè stilize a anrejistre sou pwofil ou avèk siksè!</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start sm:self-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bannè a ap parèt sou tout kat pwofil ou ak paj mizik ou yo.</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="banner-download-file-btn"
            type="button"
            onClick={handleDownloadBanner}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08] flex items-center justify-center gap-2 transition-all active:scale-95"
            title="Telechaje imaj bannè a an fòma PNG pou rezo sosyal ou yo"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Telechaje Fichye HD (PNG)</span>
          </button>

          <button
            id="banner-apply-profile-btn"
            type="button"
            onClick={handleApplyToProfile}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
              !isArtistActive
                ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 shadow-lg shadow-red-950/30'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white shadow-lg shadow-red-950/50'
            }`}
          >
            {!isArtistActive ? (
              <>
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Bloke - Ap Tann Validasyon Admin</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Aplike sou Pwofil Mwen</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

