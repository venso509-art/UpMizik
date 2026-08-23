import React, { useEffect, useRef, useState, useId } from 'react';
import * as d3 from 'd3';
import { globalSoundEngine } from '../utils/audioEngine';
import { Activity, Waves, Disc3, Gauge, Sparkles, Sliders, Volume2, Maximize2 } from 'lucide-react';

export type VisualizerMode = 'bars' | 'wave' | 'radial' | 'vumeter';
export type VisualizerPalette = 'ayiti' | 'neon' | 'sunset' | 'emerald';

interface D3AudioVisualizerProps {
  isPlaying: boolean;
  category?: string;
  className?: string;
  height?: number;
  compact?: boolean;
  showControls?: boolean;
  initialMode?: VisualizerMode;
  initialPalette?: VisualizerPalette;
  onExpand?: () => void;
}

export const D3AudioVisualizer: React.FC<D3AudioVisualizerProps> = ({
  isPlaying,
  category = 'Kompa',
  className = '',
  height = 54,
  compact = false,
  showControls = false,
  initialMode = 'bars',
  initialPalette,
  onExpand
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);
  const filterId = useId().replace(/:/g, '');

  const [mode, setMode] = useState<VisualizerMode>(initialMode);
  const [palette, setPalette] = useState<VisualizerPalette>(() => {
    if (initialPalette) return initialPalette;
    if (category === 'Drill' || category === 'Trap') return 'neon';
    if (category === 'Afro' || category === 'Rabòday') return 'emerald';
    return 'ayiti';
  });
  const [sensitivity, setSensitivity] = useState<number>(1.2); // 0.8 to 2.0
  const [liveStats, setLiveStats] = useState({
    amplitudePct: 0,
    peakDb: -48,
    bassEnergyPct: 0,
    trebleEnergyPct: 0
  });

  // Palette color definitions for D3 gradients
  const getPaletteColors = (selectedPalette: VisualizerPalette) => {
    switch (selectedPalette) {
      case 'neon':
        return {
          c1: '#06b6d4', // Cyan
          c2: '#a855f7', // Purple
          c3: '#ec4899', // Pink
          accent: '#f43f5e',
          glow: 'rgba(236, 72, 153, 0.45)'
        };
      case 'sunset':
        return {
          c1: '#eab308', // Gold
          c2: '#f97316', // Orange
          c3: '#ef4444', // Red
          accent: '#fde047',
          glow: 'rgba(249, 115, 22, 0.45)'
        };
      case 'emerald':
        return {
          c1: '#10b981', // Emerald
          c2: '#14b8a6', // Teal
          c3: '#84cc16', // Lime
          accent: '#a7f3d0',
          glow: 'rgba(16, 185, 129, 0.45)'
        };
      case 'ayiti':
      default:
        return {
          c1: '#2563eb', // Ble Ayisyen
          c2: '#eab308', // Lò Solèy
          c3: '#dc2626', // Wouj Ayisyen
          accent: '#fef08a',
          glow: 'rgba(220, 38, 38, 0.45)'
        };
    }
  };

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    let width = containerEl.clientWidth || 240;
    let h = height;

    const svg = d3.select(svgEl);

    // Setup resize observer for dynamic responsive dimensions
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          width = entry.contentRect.width;
          svg.attr('width', width).attr('height', h).attr('viewBox', `0 0 ${width} ${h}`);
        }
      }
    });
    resizeObserver.observe(containerEl);

    svg.attr('width', width).attr('height', h).attr('viewBox', `0 0 ${width} ${h}`);

    const numBins = compact ? 20 : Math.min(48, Math.max(18, Math.floor(width / (compact ? 8 : 7))));
    const freqBuffer = new Uint8Array(numBins);

    if (peaksRef.current.length !== numBins) {
      peaksRef.current = new Array(numBins).fill(0);
    }

    let frameCount = 0;
    const colors = getPaletteColors(palette);

    // Main D3 render loop driven by requestAnimationFrame
    const render = () => {
      frameCount++;

      // Retrieve live audio frequency spectrum from audio engine
      globalSoundEngine.getFrequencyData(freqBuffer);

      // Compute real-time amplitudes & acoustic energy metrics
      let sumSquares = 0;
      let maxRaw = 0;
      let bassSum = 0;
      let trebleSum = 0;
      const bassCutoff = Math.floor(numBins * 0.25);
      const trebleStart = Math.floor(numBins * 0.7);

      for (let i = 0; i < numBins; i++) {
        const val = freqBuffer[i] * sensitivity;
        const clampedVal = Math.min(255, val);
        sumSquares += clampedVal * clampedVal;
        if (clampedVal > maxRaw) maxRaw = clampedVal;

        if (i < bassCutoff) {
          bassSum += clampedVal;
        } else if (i >= trebleStart) {
          trebleSum += clampedVal;
        }
      }

      const rms = Math.sqrt(sumSquares / numBins) / 255;
      const peakNorm = maxRaw / 255;
      const bassEnergy = bassCutoff > 0 ? (bassSum / (bassCutoff * 255)) : 0;
      const trebleEnergy = (numBins - trebleStart) > 0 ? (trebleSum / ((numBins - trebleStart) * 255)) : 0;

      // Calculate approximate dBFS from RMS
      const db = isPlaying && rms > 0.001 ? Math.max(-48, Math.min(0, Math.round(20 * Math.log10(rms)))) : -48;

      if (frameCount % 6 === 0) {
        setLiveStats({
          amplitudePct: Math.round(rms * 100),
          peakDb: db,
          bassEnergyPct: Math.round(bassEnergy * 100),
          trebleEnergyPct: Math.round(trebleEnergy * 100)
        });
      }

      // Clear previous frame content inside dynamic group
      const mainGroup = svg.select<SVGGElement>('g.visualizer-main');
      if (mainGroup.empty()) {
        svg.append('g').attr('class', 'visualizer-main');
      }
      const g = svg.select<SVGGElement>('g.visualizer-main');

      if (mode === 'bars') {
        // --- MODE 1: D3 DYNAMIC FREQUENCY BARS & PEAK CAPS ---
        const data = Array.from(freqBuffer).map((raw, i) => {
          const val = Math.min(255, raw * sensitivity);
          const scaledH = Math.max(compact ? 2 : 4, (val / 255) * (h - (compact ? 6 : 10)));

          // Physics peak drop
          if (scaledH > (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = scaledH;
          } else {
            peaksRef.current[i] = Math.max(0, (peaksRef.current[i] || 0) - 0.75);
          }

          return {
            index: i,
            value: scaledH,
            peak: peaksRef.current[i],
            normValue: val / 255
          };
        });

        const xScale = d3.scaleBand()
          .domain(data.map(d => d.index.toString()))
          .range([0, width])
          .padding(compact ? 0.22 : 0.28);

        // Bind data to rect bars
        const bars = g.selectAll<SVGRectElement, typeof data[0]>('rect.freq-bar')
          .data(data, d => d.index.toString());

        bars.enter()
          .append('rect')
          .attr('class', 'freq-bar')
          .attr('rx', Math.max(1.5, xScale.bandwidth() / 3))
          .attr('ry', Math.max(1.5, xScale.bandwidth() / 3))
          .merge(bars)
          .attr('x', d => xScale(d.index.toString()) || 0)
          .attr('y', d => h - d.value)
          .attr('width', xScale.bandwidth())
          .attr('height', d => d.value)
          .attr('fill', `url(#grad-${filterId})`)
          .attr('opacity', d => (isPlaying ? 0.85 + (d.normValue * 0.15) : 0.4));

        bars.exit().remove();

        // Bind data to floating peak cap lines
        const peaks = g.selectAll<SVGRectElement, typeof data[0]>('rect.peak-cap')
          .data(data, d => d.index.toString());

        peaks.enter()
          .append('rect')
          .attr('class', 'peak-cap')
          .attr('rx', 1)
          .attr('ry', 1)
          .merge(peaks)
          .attr('x', d => xScale(d.index.toString()) || 0)
          .attr('y', d => Math.max(1, h - d.peak - (compact ? 2 : 3)))
          .attr('width', xScale.bandwidth())
          .attr('height', compact ? 1.5 : 2)
          .attr('fill', colors.accent)
          .attr('opacity', isPlaying ? 0.95 : 0.35);

        peaks.exit().remove();

      } else if (mode === 'wave') {
        // --- MODE 2: D3 FLUID ORGANIC KINETIC WAVE (CURVED AREA) ---
        // Clean any stray bar rects
        g.selectAll('rect').remove();

        const waveData = Array.from(freqBuffer).map((raw, i) => {
          const norm = Math.min(1, (raw * sensitivity) / 255);
          return {
            x: (i / (numBins - 1)) * width,
            y: h - Math.max(compact ? 4 : 6, norm * (h - (compact ? 8 : 12))),
            norm
          };
        });

        // Add padding points for clean closed area
        const waveAreaGenerator = d3.area<{ x: number; y: number; norm: number }>()
          .x(d => d.x)
          .y0(h)
          .y1(d => d.y)
          .curve(d3.curveCatmullRom.alpha(0.6));

        const waveLineGenerator = d3.line<{ x: number; y: number; norm: number }>()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveCatmullRom.alpha(0.6));

        // Area path
        const areaPath = g.selectAll<SVGPathElement, typeof waveData>('path.wave-area')
          .data([waveData]);

        areaPath.enter()
          .append('path')
          .attr('class', 'wave-area')
          .merge(areaPath)
          .attr('d', waveAreaGenerator(waveData))
          .attr('fill', `url(#grad-${filterId})`)
          .attr('opacity', isPlaying ? 0.75 : 0.3);

        areaPath.exit().remove();

        // Stroke line on top
        const strokePath = g.selectAll<SVGPathElement, typeof waveData>('path.wave-stroke')
          .data([waveData]);

        strokePath.enter()
          .append('path')
          .attr('class', 'wave-stroke')
          .attr('fill', 'none')
          .attr('stroke-width', compact ? 1.5 : 2.5)
          .merge(strokePath)
          .attr('d', waveLineGenerator(waveData))
          .attr('stroke', colors.accent)
          .attr('opacity', isPlaying ? 1 : 0.4);

        strokePath.exit().remove();

      } else if (mode === 'radial') {
        // --- MODE 3: D3 CIRCULAR RADIAL MANDALA / PULSING ORBIT ---
        g.selectAll('rect, path.wave-area, path.wave-stroke').remove();

        const centerX = width / 2;
        const centerY = h / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.38;
        const maxBarLen = Math.min(centerX, centerY) * 0.58;
        const pulse = 1 + (bassEnergy * 0.35);

        const radialData = Array.from(freqBuffer).map((raw, i) => {
          const angle = (i / numBins) * 2 * Math.PI - Math.PI / 2;
          const norm = Math.min(1, (raw * sensitivity) / 255);
          const len = baseRadius * pulse + norm * maxBarLen;
          return {
            i,
            angle,
            x1: centerX + Math.cos(angle) * (baseRadius * pulse),
            y1: centerY + Math.sin(angle) * (baseRadius * pulse),
            x2: centerX + Math.cos(angle) * len,
            y2: centerY + Math.sin(angle) * len,
            norm
          };
        });

        // Draw radial spikes with D3
        const spikes = g.selectAll<SVGLineElement, typeof radialData[0]>('line.radial-spike')
          .data(radialData, d => d.i.toString());

        spikes.enter()
          .append('line')
          .attr('class', 'radial-spike')
          .attr('stroke-linecap', 'round')
          .merge(spikes)
          .attr('x1', d => d.x1)
          .attr('y1', d => d.y1)
          .attr('x2', d => d.x2)
          .attr('y2', d => d.y2)
          .attr('stroke-width', Math.max(1.5, (width / numBins) * 0.55))
          .attr('stroke', d => d.norm > 0.6 ? colors.c3 : d.norm > 0.3 ? colors.c2 : colors.c1)
          .attr('opacity', isPlaying ? 0.9 : 0.4);

        spikes.exit().remove();

        // Pulsing center circle
        const centerCircle = g.selectAll<SVGCircleElement, number>('circle.radial-center')
          .data([bassEnergy]);

        centerCircle.enter()
          .append('circle')
          .attr('class', 'radial-center')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .merge(centerCircle)
          .attr('r', baseRadius * pulse * 0.75)
          .attr('fill', `url(#grad-${filterId})`)
          .attr('opacity', isPlaying ? 0.85 : 0.4);

        centerCircle.exit().remove();

      } else if (mode === 'vumeter') {
        // --- MODE 4: D3 VU DUAL CHANNEL LED LEVEL METER ---
        g.selectAll('rect.freq-bar, rect.peak-cap, path, line, circle').remove();

        const numLeds = compact ? 12 : 24;
        const channelHeight = (h - 12) / 2;
        const ledWidth = (width - (numLeds * 3)) / numLeds;

        // Channel 1: Left / RMS, Channel 2: Right / Bass-Mid
        const ch1Level = Math.min(1, rms * 1.6 * sensitivity);
        const ch2Level = Math.min(1, (bassEnergy * 0.7 + peakNorm * 0.4) * sensitivity);

        const ledsData: Array<{ id: string; x: number; y: number; active: boolean; zone: 'green' | 'yellow' | 'red' }> = [];

        for (let ch = 0; ch < 2; ch++) {
          const curLevel = ch === 0 ? ch1Level : ch2Level;
          const activeCount = Math.round(curLevel * numLeds);
          const y = ch === 0 ? 3 : channelHeight + 8;

          for (let i = 0; i < numLeds; i++) {
            const x = i * (ledWidth + 3) + 2;
            const ratio = i / numLeds;
            const zone = ratio > 0.8 ? 'red' : ratio > 0.5 ? 'yellow' : 'green';
            ledsData.push({
              id: `ch${ch}-led${i}`,
              x,
              y,
              active: i < activeCount && isPlaying,
              zone
            });
          }
        }

        const leds = g.selectAll<SVGRectElement, typeof ledsData[0]>('rect.vu-led')
          .data(ledsData, d => d.id);

        leds.enter()
          .append('rect')
          .attr('class', 'vu-led')
          .attr('rx', 2)
          .attr('ry', 2)
          .merge(leds)
          .attr('x', d => d.x)
          .attr('y', d => d.y)
          .attr('width', Math.max(2, ledWidth))
          .attr('height', Math.max(3, channelHeight))
          .attr('fill', d => {
            if (!d.active) return '#1e293b';
            if (d.zone === 'red') return '#ef4444';
            if (d.zone === 'yellow') return '#eab308';
            return '#10b981';
          })
          .attr('opacity', d => d.active ? 1 : 0.25);

        leds.exit().remove();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isPlaying, height, mode, palette, sensitivity, compact, category, filterId]);

  const colors = getPaletteColors(palette);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none transition-all duration-300 ${
        compact
          ? 'py-0 px-1'
          : 'rounded-2xl bg-[#030712]/90 border border-white/[0.08] backdrop-blur-xl p-3 shadow-xl'
      } ${isPlaying ? 'border-amber-500/30' : 'opacity-70'} ${className}`}
    >
      {/* Dynamic SVG Gradients & Glow Filter Defs */}
      <svg
        ref={svgRef}
        style={{ height: `${height}px` }}
        className="w-full block overflow-visible"
      >
        <defs>
          <linearGradient id={`grad-${filterId}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.c1} stopOpacity={0.9} />
            <stop offset="50%" stopColor={colors.c2} stopOpacity={0.95} />
            <stop offset="100%" stopColor={colors.c3} stopOpacity={1} />
          </linearGradient>

          <linearGradient id={`grad-horiz-${filterId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.c1} />
            <stop offset="50%" stopColor={colors.c2} />
            <stop offset="100%" stopColor={colors.c3} />
          </linearGradient>
        </defs>
      </svg>

      {/* Top Header / Mode Switcher & Dynamic Audio Metrics (When not compact) */}
      {!compact && showControls && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
            <button
              id="d3-viz-mode-bars"
              type="button"
              onClick={() => setMode('bars')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                mode === 'bars'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ekivalizè Ba D3"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Ba EQ</span>
            </button>

            <button
              id="d3-viz-mode-wave"
              type="button"
              onClick={() => setMode('wave')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                mode === 'wave'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vag Dinamik D3 (Fluid Wave)"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Vag</span>
            </button>

            <button
              id="d3-viz-mode-radial"
              type="button"
              onClick={() => setMode('radial')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                mode === 'radial'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Sèk Vibwasyon Radikal D3"
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Sèk</span>
            </button>

            <button
              id="d3-viz-mode-vumeter"
              type="button"
              onClick={() => setMode('vumeter')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                mode === 'vumeter'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mèt Anplitid VU Meter"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>VU Meter</span>
            </button>
          </div>

          {/* Palette & Sensitivity Selectors */}
          <div className="flex items-center gap-2">
            {/* Haitian & Thematic Palettes */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
              {(['ayiti', 'neon', 'sunset', 'emerald'] as VisualizerPalette[]).map((p) => (
                <button
                  key={p}
                  id={`d3-viz-palette-${p}`}
                  type="button"
                  onClick={() => setPalette(p)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-all ${
                    palette === p
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p === 'ayiti' ? '🇭🇹 Ayiti' : p === 'neon' ? '⚡ Neon' : p === 'sunset' ? '🌅 Solèy' : '🌴 Karayib'}
                </button>
              ))}
            </div>

            {/* Sensitivity Booster */}
            <button
              id="d3-viz-sensitivity-toggle"
              type="button"
              onClick={() => {
                setSensitivity((prev) => (prev >= 1.8 ? 0.8 : prev === 0.8 ? 1.2 : 1.8));
              }}
              className="px-2 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-1"
              title="Chanje sansiblite anplitid la"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>{sensitivity === 0.8 ? '0.8x' : sensitivity === 1.2 ? '1.2x' : '1.8x'}</span>
            </button>

            {/* Expand / Fullscreen Callback if provided */}
            {onExpand && (
              <button
                id="d3-viz-expand-btn"
                type="button"
                onClick={onExpand}
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-slate-300 hover:text-white"
                title="Ouvri Vizyalizè D3 an Gran"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>

        </div>
      )}

      {/* Live Audio Metrics Banner (RMS Amplitude, Bass, dB level) */}
      {!compact && showControls && (
        <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-400">
          <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.04] flex flex-col">
            <span className="text-slate-500">Anplitid (RMS)</span>
            <span className="text-white font-bold text-xs">{liveStats.amplitudePct}%</span>
          </div>
          <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.04] flex flex-col">
            <span className="text-slate-500">Nivo Peak (dB)</span>
            <span className={`font-bold text-xs ${liveStats.peakDb > -6 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {liveStats.peakDb} dB
            </span>
          </div>
          <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.04] flex flex-col">
            <span className="text-slate-500">Enèji Bas</span>
            <span className="text-amber-400 font-bold text-xs">{liveStats.bassEnergyPct}%</span>
          </div>
          <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.04] flex flex-col">
            <span className="text-slate-500">Harmonik Treble</span>
            <span className="text-blue-400 font-bold text-xs">{liveStats.trebleEnergyPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
