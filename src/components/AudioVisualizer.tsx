import React, { useEffect, useRef, useState } from 'react';
import { globalSoundEngine } from '../utils/audioEngine';
import { Activity, Radio, Waves } from 'lucide-react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  category?: string;
  className?: string;
  variant?: 'bars' | 'wave' | 'compact';
  height?: number;
  showControls?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  category = 'Kompa',
  className = '',
  variant = 'bars',
  height = 48,
  showControls = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);
  const [activeMode, setActiveMode] = useState<'bars' | 'wave' | 'glow'>(
    variant === 'wave' ? 'wave' : 'bars'
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 240);
    let h = (canvas.height = height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          const dpr = window.devicePixelRatio || 1;
          width = entry.contentRect.width;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);
        }
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const numBars = Math.min(32, Math.max(16, Math.floor(width / 7)));
    const freqData = new Uint8Array(numBars);
    if (peaksRef.current.length !== numBars) {
      peaksRef.current = new Array(numBars).fill(0);
    }

    const render = () => {
      // Fetch live frequency data from global sound engine
      globalSoundEngine.getFrequencyData(freqData);

      const dpr = window.devicePixelRatio || 1;
      const displayW = canvas.width / dpr;
      const displayH = canvas.height / dpr;

      ctx.clearRect(0, 0, displayW, displayH);

      if (activeMode === 'bars') {
        const barWidth = Math.max(2.5, (displayW / numBars) - 2);
        const gap = 2;

        for (let i = 0; i < numBars; i++) {
          const rawVal = freqData[i] || 0;
          // Scale bar height
          const barHeight = Math.max(3, (rawVal / 255) * (displayH - 6));
          const x = i * (barWidth + gap) + gap;
          const y = displayH - barHeight;

          // Peak drop physics
          if (barHeight > (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = barHeight;
          } else {
            peaksRef.current[i] = Math.max(0, (peaksRef.current[i] || 0) - 0.6);
          }

          // Dynamic Haitian / Caribbean vibrant neon gradient
          const gradient = ctx.createLinearGradient(0, displayH, 0, 0);
          if (category === 'Drill' || category === 'Trap') {
            gradient.addColorStop(0, '#3b82f6'); // Electric Blue
            gradient.addColorStop(0.5, '#ec4899'); // Neon Pink
            gradient.addColorStop(1, '#ef4444'); // Crimson
          } else if (category === 'Afro' || category === 'Rabòday') {
            gradient.addColorStop(0, '#10b981'); // Emerald
            gradient.addColorStop(0.5, '#eab308'); // Gold
            gradient.addColorStop(1, '#f97316'); // Orange
          } else {
            // Kompa / Gouyad / Pop
            gradient.addColorStop(0, '#06b6d4'); // Cyan
            gradient.addColorStop(0.5, '#eab308'); // Yellow Gold
            gradient.addColorStop(1, '#f43f5e'); // Rose
          }

          // Draw main bar with rounded top
          ctx.fillStyle = gradient;
          ctx.beginPath();
          const radius = Math.min(barWidth / 2, 2);
          ctx.roundRect
            ? ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0])
            : ctx.rect(x, y, barWidth, barHeight);
          ctx.fill();

          // Draw floating peak cap
          const peakY = displayH - peaksRef.current[i] - 2;
          if (peakY >= 0 && peakY < displayH) {
            ctx.fillStyle = isPlaying ? '#fef08a' : '#94a3b8';
            ctx.fillRect(x, peakY, barWidth, 1.5);
          }
        }
      } else if (activeMode === 'wave') {
        // Continuous smooth flowing wave
        ctx.beginPath();
        const sliceWidth = displayW / (numBars - 1);
        let x = 0;

        ctx.moveTo(0, displayH);

        for (let i = 0; i < numBars; i++) {
          const v = freqData[i] / 255.0;
          const y = displayH - v * (displayH - 4);

          if (i === 0) {
            ctx.lineTo(x, y);
          } else {
            const prevX = (i - 1) * sliceWidth;
            const prevY = displayH - (freqData[i - 1] / 255.0) * (displayH - 4);
            const cx = (prevX + x) / 2;
            const cy = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cx, cy);
          }
          x += sliceWidth;
        }

        ctx.lineTo(displayW, displayH);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, 0, 0, displayH);
        waveGrad.addColorStop(0, 'rgba(234, 179, 8, 0.7)');
        waveGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.4)');
        waveGrad.addColorStop(1, 'rgba(6, 182, 212, 0.05)');

        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Stroke line on top
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Radial / Aurora Glow Beam
        for (let i = 0; i < numBars; i++) {
          const intensity = freqData[i] / 255;
          const x = (i / numBars) * displayW;
          const hBeam = intensity * displayH;

          const beamGrad = ctx.createRadialGradient(
            x,
            displayH,
            2,
            x,
            displayH - hBeam / 2,
            hBeam
          );
          beamGrad.addColorStop(0, 'rgba(244, 63, 94, 0.8)');
          beamGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.4)');
          beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = beamGrad;
          ctx.fillRect(x - 6, displayH - hBeam, 12, hBeam);
        }
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
  }, [isPlaying, category, activeMode, height]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl bg-[#060b17]/80 border border-white/[0.08] backdrop-blur-md p-1.5 transition-all duration-300 ${
        isPlaying ? 'border-yellow-400/40 shadow-lg shadow-yellow-500/10' : 'opacity-60'
      } ${className}`}
    >
      {/* Top Header / Mode Switcher if enabled */}
      <div className="flex items-center justify-between text-[10px] px-1 pb-1 font-mono">
        <span className="flex items-center gap-1 font-bold text-slate-300">
          <Radio
            className={`w-3 h-3 ${
              isPlaying ? 'text-yellow-400 animate-pulse' : 'text-slate-500'
            }`}
          />
          <span className={isPlaying ? 'text-yellow-400' : 'text-slate-400'}>
            {isPlaying ? 'Live Audio Spectrum' : 'Spectre Audio (Pòz)'}
          </span>
        </span>

        {showControls && (
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/[0.06]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMode('bars');
              }}
              className={`p-1 rounded ${
                activeMode === 'bars'
                  ? 'bg-yellow-400 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ba Frekans"
            >
              <Activity className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMode('wave');
              }}
              className={`p-1 rounded ${
                activeMode === 'wave'
                  ? 'bg-yellow-400 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vag / Waveform"
            >
              <Waves className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* HTML5 Canvas Render Area */}
      <canvas
        ref={canvasRef}
        style={{ height: `${height}px` }}
        className="w-full block transition-opacity duration-300"
      />
    </div>
  );
};
