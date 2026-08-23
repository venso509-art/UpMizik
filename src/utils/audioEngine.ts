// Web Audio & HTML5 Audio playback manager
// Strictly plays authentic admin/artist uploaded audio files with high fidelity and zero cacophony/synthetic noise.
import { IdbStorage } from './idbStorage';

type TimeUpdateCallback = (currentTime: number, duration: number) => void;

/**
 * Utility to calculate exact audio duration from an uploaded File, Blob, or URL
 */
export function getAudioDuration(fileOrUrl: File | Blob | string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const dur = Math.round(audio.duration || 180);
        if (typeof fileOrUrl !== 'string') {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }
        resolve(dur > 0 && Number.isFinite(dur) ? dur : 180);
      };
      audio.onerror = () => {
        if (typeof fileOrUrl !== 'string') {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }
        resolve(180);
      };
      audio.src = url;
    } catch {
      resolve(180);
    }
  });
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private currentTrackId: string | null = null;
  private currentTrackTitle: string = '';
  private currentCategory: string = 'Kompa';
  private timer: any = null;
  private activeNodes: any[] = [];
  private timeListeners: TimeUpdateCallback[] = [];
  private currentTime = 0;
  private duration = 180; // Default 3 min
  private htmlAudio: HTMLAudioElement | null = null;
  private lastFreqArray: Uint8Array = new Uint8Array(32);
  private currentVolume = 0.9;
  private isMuted = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (!this.analyser) {
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.82;
      }
      if (!this.masterGain) {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
  }

  public onTimeUpdate(callback: TimeUpdateCallback): () => void {
    this.timeListeners.push(callback);
    return () => {
      this.timeListeners = this.timeListeners.filter(cb => cb !== callback);
    };
  }

  private emitTime(current: number, dur: number) {
    this.timeListeners.forEach(cb => {
      try {
        cb(current, dur);
      } catch (err) {
        console.error('Time update listener error', err);
      }
    });
  }

  public async loadTrack(
    trackIdOrAudioUrl?: string,
    audioUrlOrTitle?: string,
    titleOrCategory?: string,
    categoryOrDuration?: string | number,
    knownDuration?: number
  ) {
    this.stop();

    // Overload resolution to remain backwards compatible with (audioUrl, title, category)
    let trackId: string | null = null;
    let audioUrl: string | undefined = undefined;
    let title: string = 'Mizik UpMizik';
    let category: string = 'Kompa';
    let dur: number = 180;

    if (arguments.length >= 4 && typeof arguments[3] === 'string') {
      // (trackId, audioUrl, title, category, knownDuration)
      trackId = trackIdOrAudioUrl || null;
      audioUrl = audioUrlOrTitle;
      title = titleOrCategory || 'Mizik UpMizik';
      category = (categoryOrDuration as string) || 'Kompa';
      dur = knownDuration || 180;
    } else {
      // (audioUrl, title, category, duration)
      audioUrl = trackIdOrAudioUrl;
      title = audioUrlOrTitle || 'Mizik UpMizik';
      category = titleOrCategory || 'Kompa';
      if (typeof categoryOrDuration === 'number') {
        dur = categoryOrDuration;
      }
    }

    this.currentTrackId = trackId;
    this.currentTrackTitle = title;
    this.currentCategory = category;
    this.currentTime = 0;
    this.duration = dur > 0 ? dur : 180;

    const resolvedUrl = audioUrl?.startsWith('idb:') ? await IdbStorage.resolveMediaUrl(audioUrl) : audioUrl;

    if (resolvedUrl && (resolvedUrl.startsWith('http') || resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('data:audio'))) {
      try {
        this.htmlAudio = new Audio();
        this.htmlAudio.crossOrigin = 'anonymous';
        this.htmlAudio.src = resolvedUrl;
        this.htmlAudio.volume = this.isMuted ? 0 : this.currentVolume;
        
        this.htmlAudio.onloadedmetadata = () => {
          if (this.htmlAudio && this.htmlAudio.duration && Number.isFinite(this.htmlAudio.duration)) {
            this.duration = Math.round(this.htmlAudio.duration);
            this.emitTime(this.currentTime, this.duration);
          }
        };

        this.htmlAudio.ontimeupdate = () => {
          if (this.htmlAudio) {
            this.currentTime = this.htmlAudio.currentTime;
            if (this.htmlAudio.duration && Number.isFinite(this.htmlAudio.duration)) {
              this.duration = Math.round(this.htmlAudio.duration);
            }
            this.emitTime(this.currentTime, this.duration);
          }
        };

        this.htmlAudio.onended = () => {
          this.isPlaying = false;
          this.currentTime = this.duration;
          this.emitTime(this.duration, this.duration);
        };

        this.htmlAudio.onerror = () => {
          this.pause();
        };

        if (this.isPlaying) {
          this.htmlAudio.play().catch(() => {
            this.startTimeSimulation();
          });
        }
        return;
      } catch {
        this.pause();
      }
    } else {
      // If no valid uploaded audio URL is present, simulate smooth playback timer without emitting any noise
      if (this.isPlaying) {
        this.startTimeSimulation();
      }
    }
  }

  public play() {
    this.isPlaying = true;

    if (this.htmlAudio) {
      this.htmlAudio.play().catch(() => {
        this.startTimeSimulation();
      });
    } else {
      this.startTimeSimulation();
    }
  }

  private startTimeSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      if (!this.isPlaying) return;
      this.currentTime += 0.5;
      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.isPlaying = false;
        clearInterval(this.timer);
        this.timer = null;
      }
      this.emitTime(this.currentTime, this.duration);
    }, 500);
  }

  public seek(seconds: number) {
    const target = Math.max(0, Math.min(seconds, this.duration));
    this.currentTime = target;

    if (this.htmlAudio) {
      try {
        this.htmlAudio.currentTime = target;
      } catch {
        // Fallback silently
      }
    }

    this.emitTime(this.currentTime, this.duration);
  }

  public skip(deltaSeconds: number) {
    this.seek(this.currentTime + deltaSeconds);
  }

  public setVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.currentVolume = clamped;
    this.isMuted = clamped === 0;

    if (this.htmlAudio) {
      this.htmlAudio.volume = this.isMuted ? 0 : clamped;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : clamped, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.isMuted ? 0 : this.currentVolume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.htmlAudio) {
      this.htmlAudio.muted = muted;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.currentVolume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getFrequencyData(targetArray?: Uint8Array): Uint8Array {
    const numBins = targetArray ? targetArray.length : 32;
    const output = targetArray || new Uint8Array(numBins);

    if (this.analyser && this.isPlaying) {
      try {
        const binCount = this.analyser.frequencyBinCount;
        const temp = new Uint8Array(binCount);
        this.analyser.getByteFrequencyData(temp);

        let total = 0;
        for (let i = 0; i < temp.length; i++) {
          total += temp[i];
        }

        if (total > 0) {
          const step = binCount / numBins;
          for (let i = 0; i < numBins; i++) {
            const srcIdx = Math.floor(i * step);
            output[i] = temp[srcIdx] || 0;
          }
          this.lastFreqArray = output;
          return output;
        }
      } catch (e) {}
    }

    if (this.isPlaying) {
      const t = Date.now() / 1000;
      for (let i = 0; i < numBins; i++) {
        const val = 80 * Math.sin(t * 4 + i * 0.5) + 60 * Math.cos(t * 2 + i * 0.3) + 70;
        output[i] = Math.min(255, Math.max(15, Math.floor(val)));
      }
      this.lastFreqArray = output;
      return output;
    }

    for (let i = 0; i < numBins; i++) {
      output[i] = Math.max(0, Math.floor((this.lastFreqArray[i] || 0) * 0.85));
    }
    this.lastFreqArray = output;
    return output;
  }

  public pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio = null;
    }
    this.activeNodes.forEach(node => {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }
}

export const globalSoundEngine = new SoundEngine();
