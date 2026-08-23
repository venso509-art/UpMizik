export interface BannerGeneratorOptions {
  stageName: string;
  genre: string; // e.g. 'Kompa', 'Drill', 'Rap', 'Afro', 'Trap', 'Rabòday', 'Gouyad', 'Rasin'
  city?: string;
  subtitle?: string; // e.g. Motto or quote
  themeStyle?: 'kompa' | 'drill' | 'rap' | 'afro' | 'raboday' | 'gouyad' | 'rasin' | 'cyber';
  accentColor?: string;
  width?: number;
  height?: number;
}

export interface GenreThemeConfig {
  id: string;
  name: string;
  genreName: string;
  badgeLabel: string;
  gradient: [string, string, string];
  accentColor: string;
  secondaryColor: string;
  lightGlowColor: string;
  patternType: 'waves' | 'bars' | 'circles' | 'rays' | 'pulse' | 'mesh';
  description: string;
}

export const GENRE_THEMES: Record<string, GenreThemeConfig> = {
  Kompa: {
    id: 'kompa',
    name: 'Konpa Sunset & Gold',
    genreName: 'Konpa Dirèk & Gouyad',
    badgeLabel: '✦ OFISYÈL KONPA DIRÈK ✦',
    gradient: ['#040714', '#151d3b', '#3b1c0e'],
    accentColor: '#f59e0b',
    secondaryColor: '#3b82f6',
    lightGlowColor: 'rgba(245, 158, 11, 0.45)',
    patternType: 'waves',
    description: 'Ton ble nwit ak lò solèy kouche, anbyans sal konsè ak salon klasik.'
  },
  Drill: {
    id: 'drill',
    name: 'Drill Midnight Flame',
    genreName: 'Drill 509 & Underground',
    badgeLabel: '✦ DRILL KREYÒL 509 ✦',
    gradient: ['#02040a', '#081026', '#2a0a05'],
    accentColor: '#00f2fe',
    secondaryColor: '#ff4b1f',
    lightGlowColor: 'rgba(0, 242, 254, 0.4)',
    patternType: 'bars',
    description: 'Ble neyon elektrik ak flanm dife ambre, son lou ak ritm agresif.'
  },
  Rap: {
    id: 'rap',
    name: 'Rap Kreyòl Neon Studio',
    genreName: 'Rap Kreyòl & Hip-Hop',
    badgeLabel: '✦ RAP KREYÒL OFISYÈL ✦',
    gradient: ['#05030a', '#1a0933', '#0b162c'],
    accentColor: '#c084fc',
    secondaryColor: '#60a5fa',
    lightGlowColor: 'rgba(192, 132, 252, 0.45)',
    patternType: 'pulse',
    description: 'Koulè vyolèt neyon ak studio mikwo, teksti lari ak vwa fon.'
  },
  Trap: {
    id: 'trap',
    name: 'Trap-Soul Dark Velvet',
    genreName: 'Trap-Soul & Cloud Beats',
    badgeLabel: '✦ TRAP-SOUL VIBE ✦',
    gradient: ['#03050d', '#130e29', '#24081c'],
    accentColor: '#f43f5e',
    secondaryColor: '#a855f7',
    lightGlowColor: 'rgba(244, 63, 94, 0.45)',
    patternType: 'mesh',
    description: 'Woz fonse ak vyolèt mistik, bas 808 ak melodi velours.'
  },
  Afro: {
    id: 'afro',
    name: 'Afro-Kreyòl Solar Pulse',
    genreName: 'Afrobeat & Afro-Fusion',
    badgeLabel: '✦ AFRO-KREYÒL SOLAR ✦',
    gradient: ['#040a06', '#0d2818', '#382207'],
    accentColor: '#10b981',
    secondaryColor: '#fbbf24',
    lightGlowColor: 'rgba(251, 191, 36, 0.45)',
    patternType: 'rays',
    description: 'Vèt twopikal ak lò solèy vivan, enèji dans ak tanbou solè.'
  },
  Rabòday: {
    id: 'raboday',
    name: 'Rabòday Carnival Neon',
    genreName: 'Rabòday & Electro-Rara',
    badgeLabel: '✦ RABÒDAY ENÈJI KANAVAL ✦',
    gradient: ['#050811', '#06202a', '#2c1004'],
    accentColor: '#06b6d4',
    secondaryColor: '#f97316',
    lightGlowColor: 'rgba(6, 182, 212, 0.5)',
    patternType: 'bars',
    description: 'Laza klere ak tanbou kanaval, vitès ak kouran elektrik.'
  },
  Gouyad: {
    id: 'gouyad',
    name: 'Gouyad Velvet Midnight',
    genreName: 'Gouyad & Love Zouk',
    badgeLabel: '✦ GOUYAD NOSTALJI ✦',
    gradient: ['#04060e', '#160b24', '#260814'],
    accentColor: '#ec4899',
    secondaryColor: '#6366f1',
    lightGlowColor: 'rgba(236, 72, 153, 0.4)',
    patternType: 'waves',
    description: 'Woz fennen ak ble zafè renmen, kadans dous ak amoni amoure.'
  },
  Rasin: {
    id: 'rasin',
    name: 'Rasin Ayisyen Heritage',
    genreName: 'Mizik Rasin & Tradisyon',
    badgeLabel: '✦ RASIN AYISYEN ERITAJ ✦',
    gradient: ['#080402', '#211005', '#0f172a'],
    accentColor: '#d97706',
    secondaryColor: '#ef4444',
    lightGlowColor: 'rgba(217, 119, 6, 0.45)',
    patternType: 'rays',
    description: 'Tè cho ak tanbou zansèt yo, eritaj kiltirèl puisan ak diyite.'
  }
};

/**
 * Resolves appropriate theme configuration based on genre name
 */
export function getThemeConfigForGenre(genre: string): GenreThemeConfig {
  const normalized = (genre || '').trim().toLowerCase();
  
  if (normalized.includes('kompa') || normalized.includes('konpa')) return GENRE_THEMES.Kompa;
  if (normalized.includes('drill')) return GENRE_THEMES.Drill;
  if (normalized.includes('rap') || normalized.includes('hip-hop')) return GENRE_THEMES.Rap;
  if (normalized.includes('trap')) return GENRE_THEMES.Trap;
  if (normalized.includes('afro')) return GENRE_THEMES.Afro;
  if (normalized.includes('rabòday') || normalized.includes('raboday')) return GENRE_THEMES.Rabòday;
  if (normalized.includes('gouyad')) return GENRE_THEMES.Gouyad;
  if (normalized.includes('rasin') || normalized.includes('vodou') || normalized.includes('rara')) return GENRE_THEMES.Rasin;

  return GENRE_THEMES.Kompa;
}

/**
 * Generates a high resolution stylized Header Banner as a Data URL (PNG)
 */
export function generateStylizedBanner(options: BannerGeneratorOptions): string {
  const width = options.width || 1280;
  const height = options.height || 420;

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const theme = getThemeConfigForGenre(options.genre);

  // 1. Background Gradient (Atmospheric Deep Canvas)
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, theme.gradient[0]);
  bgGradient.addColorStop(0.5, theme.gradient[1]);
  bgGradient.addColorStop(1, theme.gradient[2]);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Stage Light Orbs (Glow effects)
  const glow1 = ctx.createRadialGradient(width * 0.25, height * 0.3, 10, width * 0.25, height * 0.3, width * 0.45);
  glow1.addColorStop(0, theme.lightGlowColor);
  glow1.addColorStop(0.6, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(width * 0.8, height * 0.65, 10, width * 0.8, height * 0.65, width * 0.4);
  glow2.addColorStop(0, theme.secondaryColor + '33');
  glow2.addColorStop(0.7, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // 3. Grid / Studio Texture Overlay
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Procedural Frequency Audio Waves / Sound Bars in Background
  ctx.save();
  const barsCount = 64;
  const barWidth = width / barsCount;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  
  for (let i = 0; i < barsCount; i++) {
    // Generate organic pseudo-random heights that peak in the middle-right
    const norm = i / barsCount;
    const wave = Math.sin(norm * Math.PI * 2) * 0.5 + 0.5;
    const noise = Math.sin(i * 13.5 + 2.1) * 0.3 + 0.7;
    const barHeight = (height * 0.45) * (wave * 0.6 + 0.4) * noise;

    const barGrad = ctx.createLinearGradient(0, height - barHeight, 0, height);
    barGrad.addColorStop(0, theme.accentColor + '55');
    barGrad.addColorStop(1, 'rgba(255,255,255,0.01)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(i * barWidth + 2, height - barHeight, barWidth - 4, barHeight);
  }
  ctx.restore();

  // 5. Stylized Geometric Neon Line Accents
  ctx.save();
  ctx.strokeStyle = theme.accentColor + '88';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.05, height * 0.85);
  ctx.lineTo(width * 0.4, height * 0.85);
  ctx.stroke();

  // Accent Dot
  ctx.fillStyle = theme.accentColor;
  ctx.beginPath();
  ctx.arc(width * 0.4 + 10, height * 0.85, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6. UpMizik Watermark / Crest (Top Right)
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 13px sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('UPMIZIK 509 • ESPAS ATIS', width - 220, 38);
  ctx.restore();

  // 7. Genre & Origin Badge (Top Left)
  ctx.save();
  const badgeText = theme.badgeLabel;
  ctx.font = 'bold 12px sans-serif';
  const badgeMetrics = ctx.measureText(badgeText);
  const badgePaddingX = 14;
  const badgeWidth = badgeMetrics.width + badgePaddingX * 2;
  const badgeHeight = 28;
  const badgeX = width * 0.06;
  const badgeY = 32;

  // Badge background pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeStyle = theme.accentColor + '66';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 14);
  ctx.fill();
  ctx.stroke();

  // Badge Text
  ctx.fillStyle = theme.accentColor;
  ctx.fillText(badgeText, badgeX + badgePaddingX, badgeY + 18);
  ctx.restore();

  // 8. Main Stage Name Typography
  ctx.save();
  const displayStageName = (options.stageName || 'Atis UpMizik').toUpperCase();
  
  // Set font size adaptively based on length
  let fontSize = 54;
  if (displayStageName.length > 18) fontSize = 38;
  else if (displayStageName.length > 12) fontSize = 44;

  ctx.font = `900 ${fontSize}px "Cabinet Grotesk", "Impact", "Plus Jakarta Sans", sans-serif`;
  ctx.shadowColor = theme.accentColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';

  const textX = width * 0.06;
  const textY = height * 0.52;
  ctx.fillText(displayStageName, textX, textY);

  // Secondary Clean render without blur for crisp edges
  ctx.shadowBlur = 0;
  ctx.fillText(displayStageName, textX, textY);
  ctx.restore();

  // 9. Subtitle / Motto / Musical Roots
  ctx.save();
  const subText = options.subtitle || `${theme.genreName} • ${options.city || 'Ayiti'}`;
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
  
  // Subtitle backdrop pill
  const subMetrics = ctx.measureText(subText);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.roundRect(textX, height * 0.58, Math.min(subMetrics.width + 24, width * 0.7), 32, 8);
  ctx.fill();

  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(subText, textX + 12, height * 0.58 + 21);
  ctx.restore();

  // 10. Origin City / Location Tag (Bottom Left)
  if (options.city) {
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(`📍 ${options.city.toUpperCase()}`, textX, height * 0.85 - 10);
    ctx.restore();
  }

  // 11. Subtle Vignette Border Shadow
  ctx.save();
  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, 'rgba(0,0,0,0.3)');
  vignette.addColorStop(0.3, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.8, 'rgba(0,0,0,0.1)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
