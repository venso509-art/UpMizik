import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

export interface FloatingHeartParticle {
  id: number;
  x: number; // offset in px
  y: number; // offset in px
  size: number; // in px
  color: string;
  rotation: number; // in deg
  flyX: number; // sway in px
  duration: number; // in seconds
  scale: number;
}

const HEART_COLORS = [
  '#ef4444', // Red-500
  '#f43f5e', // Rose-500
  '#ec4899', // Pink-500
  '#fbbf24', // Amber-400
  '#f97316', // Orange-500
  '#e11d48', // Rose-600
  '#ff007f'  // Neon Pink
];

export interface FloatingHeartsProps {
  hearts: FloatingHeartParticle[];
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({ hearts }) => {
  if (!hearts || hearts.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute animate-float-heart"
          style={{
            left: `${h.x}%`,
            bottom: `${h.y}%`,
            ['--tw-fly-x' as any]: `${h.flyX}px`,
            ['--tw-rot' as any]: `${h.rotation}deg`,
            animationDuration: `${h.duration}s`,
            transformOrigin: 'bottom center'
          }}
        >
          <Heart
            className="drop-shadow-[0_2px_10px_rgba(239,68,68,0.75)]"
            style={{
              width: `${h.size}px`,
              height: `${h.size}px`,
              fill: h.color,
              color: h.color
            }}
          />
        </div>
      ))}
    </div>
  );
};

export function createHeartBurst(
  count = 6,
  startX = 50,
  startY = 30
): FloatingHeartParticle[] {
  const particles: FloatingHeartParticle[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const size = Math.floor(Math.random() * 12) + 16; // 16px to 28px
    const flyX = (Math.random() - 0.5) * 80; // -40px to +40px
    const rotation = (Math.random() - 0.5) * 60; // -30deg to +30deg
    const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    const duration = 0.85 + Math.random() * 0.45; // 0.85s to 1.3s
    const jitterX = (Math.random() - 0.5) * 14;
    const jitterY = (Math.random() - 0.5) * 10;

    particles.push({
      id: now + i + Math.random(),
      x: Math.max(10, Math.min(90, startX + jitterX)),
      y: Math.max(10, Math.min(90, startY + jitterY)),
      size,
      color,
      rotation,
      flyX,
      duration,
      scale: 1
    });
  }

  return particles;
}
