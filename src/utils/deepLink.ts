import { MusicItem, ArtistUser } from '../types';

/**
 * Utility functions for Deep Linking, Dynamic OpenGraph Meta-tags,
 * and Social Story Visual Card generation for WhatsApp & Instagram.
 */

export const generateTrackDeepLink = (musicId: string): string => {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?track=${encodeURIComponent(musicId)}`;
};

export const generateArtistProfileDeepLink = (artistIdOrStageName: string): string => {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?artist=${encodeURIComponent(artistIdOrStageName)}`;
};

/**
 * Dynamically updates document meta tags for scrapers / client preview tools
 */
export const updateDocumentMetaTags = (music: MusicItem): void => {
  const title = `${music.title} - ${music.artistName} | UpMizik Ayiti`;
  const description = `Koute "${music.title}" pa ${music.artistName} sou UpMizik. Sipòte atis la dirèkteman ak MonCash & Natcash!`;
  const deepLink = generateTrackDeepLink(music.id);
  const imageUrl = music.coverUrl;

  document.title = title;

  const setMetaTag = (attr: string, key: string, content: string) => {
    let element = document.querySelector(`meta[${attr}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, key);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // Standard Open Graph
  setMetaTag('property', 'og:title', `${music.title} - ${music.artistName}`);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', imageUrl);
  setMetaTag('property', 'og:url', deepLink);
  setMetaTag('property', 'og:type', 'music.song');
  setMetaTag('property', 'og:site_name', 'UpMizik Ayiti');
  setMetaTag('property', 'og:audio', music.audioUrl);

  // Twitter Card
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', `${music.title} - ${music.artistName}`);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', imageUrl);

  // Schema.org
  setMetaTag('itemprop', 'name', title);
  setMetaTag('itemprop', 'description', description);
  setMetaTag('itemprop', 'image', imageUrl);
};

/**
 * Dynamically updates document meta tags for Artist Profile OpenGraph sharing
 */
export const updateArtistDocumentMetaTags = (artist: ArtistUser, songsCount?: number): void => {
  const title = `${artist.stageName} - Pwofil Atis Ofisyèl | UpMizik Ayiti`;
  const bioSummary = artist.artistQuote
    ? `“${artist.artistQuote}”`
    : artist.bio
    ? (artist.bio.length > 140 ? artist.bio.substring(0, 137) + '...' : artist.bio)
    : `Dekouvri tout moso mizik, biyografi, ak aktivite atis ${artist.stageName} sou UpMizik Ayiti.`;

  const description = `${bioSummary} • Vil: ${artist.city || 'Ayiti'} • ${songsCount !== undefined ? `${songsCount} moso mizik • ` : ''}Koute epi sipòte dirèkteman ak MonCash & Natcash sou UpMizik.`;
  const deepLink = generateArtistProfileDeepLink(artist.id || artist.stageName);
  const imageUrl = artist.headerBannerUrl || artist.avatarUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80';

  document.title = title;

  const setMetaTag = (attr: string, key: string, content: string) => {
    let element = document.querySelector(`meta[${attr}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, key);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // Standard Open Graph (WhatsApp, Facebook, LinkedIn, iMessage)
  setMetaTag('property', 'og:title', `${artist.stageName} - Pwofil Atis Ofisyèl UpMizik`);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:image', imageUrl);
  setMetaTag('property', 'og:image:alt', `Bannè & Pwofil ${artist.stageName}`);
  setMetaTag('property', 'og:image:width', '1200');
  setMetaTag('property', 'og:image:height', '630');
  setMetaTag('property', 'og:url', deepLink);
  setMetaTag('property', 'og:type', 'profile');
  setMetaTag('property', 'og:site_name', 'UpMizik Ayiti');

  // Twitter / X Card
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', `${artist.stageName} | Pwofil Atis UpMizik`);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', imageUrl);
  if (artist.twitterHandle) {
    setMetaTag('name', 'twitter:creator', artist.twitterHandle.startsWith('@') ? artist.twitterHandle : `@${artist.twitterHandle}`);
  }

  // Schema.org
  setMetaTag('itemprop', 'name', title);
  setMetaTag('itemprop', 'description', description);
  setMetaTag('itemprop', 'image', imageUrl);
};

export interface StoryCardOptions {
  format: 'story' | 'feed'; // story is 9:16 (1080x1920), feed is 1:1 (1080x1080)
  theme?: 'dark' | 'neon' | 'haitian';
}

/**
 * Draws a high-definition story preview card on a Canvas element
 */
export const drawStoryPreviewCanvas = (
  canvas: HTMLCanvasElement,
  music: MusicItem,
  options: StoryCardOptions = { format: 'story', theme: 'dark' }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const isStory = options.format === 'story';
    const width = 1080;
    const height = isStory ? 1920 : 1080;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const coverImg = new Image();
    coverImg.crossOrigin = 'anonymous';
    coverImg.src = music.coverUrl;

    coverImg.onload = () => {
      // 1. Draw Deep Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#05070a');
      bgGrad.addColorStop(0.5, '#0a0f1d');
      bgGrad.addColorStop(1, '#020408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Blurred Cover Backdrop with subtle glow
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.filter = 'blur(60px)';
      ctx.drawImage(coverImg, -100, -100, width + 200, height + 200);
      ctx.restore();

      // Vignette Overlay
      const vignette = ctx.createRadialGradient(width / 2, height / 2, width / 4, width / 2, height / 2, height / 1.1);
      vignette.addColorStop(0, 'rgba(5, 7, 10, 0.4)');
      vignette.addColorStop(1, 'rgba(5, 7, 10, 0.95)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Haitian Flag Subtle Top Accent Bar
      const blueBar = ctx.createLinearGradient(0, 0, width / 2, 0);
      blueBar.addColorStop(0, '#00209F');
      blueBar.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = blueBar;
      ctx.fillRect(0, 0, width / 2, 16);

      const redBar = ctx.createLinearGradient(width / 2, 0, width, 0);
      redBar.addColorStop(0, '#dc2626');
      redBar.addColorStop(1, '#D21034');
      ctx.fillStyle = redBar;
      ctx.fillRect(width / 2, 0, width / 2, 16);

      // 3. Header: UpMizik Brand Badge
      const headerY = isStory ? 180 : 100;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';

      // Brand Logo Text
      ctx.fillStyle = '#eab308'; // Gold Up
      ctx.fillText('UP', width / 2 - 80, headerY);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('MIZIK', width / 2 + 10, headerY);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('AYITI', width / 2 + 140, headerY);

      // Subtitle badge
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 24px sans-serif';
      ctx.fillText('DEKOUVRI • KOUTE • SIPÒTE JÈN TALAN YO', width / 2, headerY + 45);

      // 4. Center Main Album Art Card
      const artSize = isStory ? 740 : 540;
      const artX = (width - artSize) / 2;
      const artY = isStory ? 340 : 190;
      const radius = 48;

      // Card shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 25;

      // Rounded rect clip for main cover
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, radius);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, radius);
      ctx.clip();
      ctx.drawImage(coverImg, artX, artY, artSize, artSize);

      // Subtle overlay inside cover
      const innerGrad = ctx.createLinearGradient(artX, artY + artSize * 0.6, artX, artY + artSize);
      innerGrad.addColorStop(0, 'transparent');
      innerGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = innerGrad;
      ctx.fillRect(artX, artY, artSize, artSize);
      ctx.restore();

      // Category Pill inside Cover (Bottom Left of image)
      ctx.save();
      const pillX = artX + 32;
      const pillY = artY + artSize - 70;
      ctx.fillStyle = 'rgba(7, 12, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, 190, 48, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(music.category.toUpperCase(), pillX + 95, pillY + 32);
      ctx.restore();

      // 5. Track Information Below Cover
      const infoStartY = artY + artSize + (isStory ? 80 : 55);

      // Track Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px sans-serif';
      ctx.textAlign = 'center';
      const truncatedTitle = music.title.length > 26 ? music.title.substring(0, 24) + '...' : music.title;
      ctx.fillText(truncatedTitle, width / 2, infoStartY);

      // Artist Name
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(music.artistName, width / 2, infoStartY + 60);

      // Waveform Bars Decoration
      const waveY = infoStartY + (isStory ? 130 : 100);
      const numBars = 36;
      const barWidth = 12;
      const gap = 10;
      const totalWaveWidth = numBars * (barWidth + gap);
      const waveStartX = (width - totalWaveWidth) / 2;

      for (let i = 0; i < numBars; i++) {
        const barHeight = Math.abs(Math.sin((i / numBars) * Math.PI * 3 + 1)) * 55 + 15;
        const bx = waveStartX + i * (barWidth + gap);
        const by = waveY - barHeight / 2;

        const barGrad = ctx.createLinearGradient(bx, by, bx, by + barHeight);
        barGrad.addColorStop(0, '#38bdf8');
        barGrad.addColorStop(0.5, '#eab308');
        barGrad.addColorStop(1, '#ef4444');

        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(bx, by, barWidth, barHeight, 6);
        ctx.fill();
      }

      // 6. Metrics & Support CTA (Bottom section)
      if (isStory) {
        const statsBoxY = waveY + 80;
        const boxW = 860;
        const boxH = 140;
        const boxX = (width - boxW) / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
        ctx.beginPath();
        ctx.roundRect(boxX, statsBoxY, boxW, boxH, 28);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Metric 1: Listens
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 20px sans-serif';
        ctx.fillText('EKOUT', boxX + boxW * 0.25, statsBoxY + 50);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px monospace';
        ctx.fillText((music.listens || 0).toLocaleString(), boxX + boxW * 0.25, statsBoxY + 100);

        // Divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(boxX + boxW * 0.5, statsBoxY + 25);
        ctx.lineTo(boxX + boxW * 0.5, statsBoxY + boxH - 25);
        ctx.stroke();

        // Metric 2: Donations
        ctx.fillStyle = '#facc15';
        ctx.font = '600 20px sans-serif';
        ctx.fillText('TOTAL SIPÒ FANATIK', boxX + boxW * 0.75, statsBoxY + 50);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(`$${(music.totalDonations || 0).toFixed(2)} USD`, boxX + boxW * 0.75, statsBoxY + 100);
        ctx.restore();

        // Bottom CTA Button Graphic
        const ctaY = statsBoxY + 190;
        const ctaW = 760;
        const ctaH = 96;
        const ctaX = (width - ctaW) / 2;

        const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
        ctaGrad.addColorStop(0, '#f59e0b');
        ctaGrad.addColorStop(0.5, '#eab308');
        ctaGrad.addColorStop(1, '#f59e0b');

        ctx.save();
        ctx.shadowColor = 'rgba(234, 179, 8, 0.4)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = ctaGrad;
        ctx.beginPath();
        ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 30);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#05070a';
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎧 KOUTE EPI SIPÒTE SOU UPMIZIK.COM', width / 2, ctaY + 60);

        // Footer URL text
        ctx.fillStyle = '#64748b';
        ctx.font = '600 22px monospace';
        ctx.fillText('upmizik.com • MonCash & Natcash', width / 2, height - 60);
      } else {
        // Feed bottom
        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎧 KOUTE EPI SIPÒTE SOU UPMIZIK.COM (MonCash & Natcash)', width / 2, height - 70);
      }

      try {
        const dataUrl = canvas.toDataURL('image/png', 0.95);
        resolve(dataUrl);
      } catch (err) {
        resolve(music.coverUrl);
      }
    };

    coverImg.onerror = () => {
      // Fallback simple background if cross-origin image fails
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(music.title, width / 2, height / 2);
      resolve(canvas.toDataURL('image/png'));
    };
  });
};

/**
 * Netwaye paramèt rechèch (query params tankou ?track=..., ?artist=..., ?post=...)
 * ak hash (#...) nan adrès navigatè a san rechaje paj la.
 * Sa pèmèt itilizatè a retounen dirèkteman sou baz sit la (upmizik.com)
 * pou l ka navige lib e libè san lyen an pa bloke l oswa fòse l retounen sou menm paj la.
 */
export const clearDeepLinkUrlParams = (): void => {
  try {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const cleanPath = window.location.pathname || '/';
      window.history.replaceState({}, document.title, cleanPath);
    }
  } catch {
    // Ignore any history manipulation errors in restricted environments
  }
};
