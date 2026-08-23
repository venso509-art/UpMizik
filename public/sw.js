// UpMizik Service Worker - Offline Caching & Intermittent Network Resilience Engine
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `upmizik-static-${CACHE_VERSION}`;
const AUDIO_CACHE = `upmizik-audio-${CACHE_VERSION}`;
const IMAGES_CACHE = `upmizik-images-${CACHE_VERSION}`;
const PAGES_CACHE = `upmizik-pages-${CACHE_VERSION}`;

const MAX_CACHED_SONGS = 35; // Maximum recently played audio tracks to retain in offline cache

// Core static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Cabinet+Grotesk:wght@700;800;900&display=swap'
];

// Helper: Trim cache to max size (LRU)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Delete oldest entries
      const toDelete = keys.slice(0, keys.length - maxItems);
      for (const req of toDelete) {
        await cache.delete(req);
      }
    }
  } catch {}
}

// Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        // Add core static assets
        await staticCache.addAll(PRECACHE_ASSETS).catch(() => {});
      } catch {}
      return self.skipWaiting();
    })()
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const allowedCaches = [STATIC_CACHE, AUDIO_CACHE, IMAGES_CACHE, PAGES_CACHE];
      const existingCaches = await caches.keys();
      
      await Promise.all(
        existingCaches.map((cacheName) => {
          if (!allowedCaches.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
      
      return self.clients.claim();
    })()
  );
});

// Helper: Check if request is for audio
function isAudioRequest(url, request) {
  const urlLower = url.toLowerCase();
  return (
    urlLower.endsWith('.mp3') ||
    urlLower.endsWith('.wav') ||
    urlLower.endsWith('.ogg') ||
    urlLower.endsWith('.m4a') ||
    urlLower.endsWith('.aac') ||
    urlLower.includes('/audio/') ||
    urlLower.includes('sound') ||
    urlLower.includes('audio-samples') ||
    request.headers.get('accept')?.includes('audio') ||
    request.destination === 'audio'
  );
}

// Helper: Check if request is for an image
function isImageRequest(url, request) {
  const urlLower = url.toLowerCase();
  return (
    urlLower.endsWith('.jpg') ||
    urlLower.endsWith('.jpeg') ||
    urlLower.endsWith('.png') ||
    urlLower.endsWith('.webp') ||
    urlLower.endsWith('.gif') ||
    urlLower.endsWith('.svg') ||
    urlLower.includes('images.unsplash.com') ||
    urlLower.includes('cloudinary.com') ||
    request.headers.get('accept')?.includes('image') ||
    request.destination === 'image'
  );
}

// Helper: Handle Byte-Range requests for cached audio (critical for Safari, iOS, Chrome HTML5 audio)
async function handleRangeAudioRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) {
    return cachedResponse;
  }

  const arrayBuffer = await cachedResponse.arrayBuffer();
  const bytes = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(bytes[0], 10) || 0;
  const end = bytes[1] ? parseInt(bytes[1], 10) : arrayBuffer.byteLength - 1;
  const slicedBuffer = arrayBuffer.slice(start, end + 1);

  const headers = new Headers(cachedResponse.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${arrayBuffer.byteLength}`);
  headers.set('Content-Length', `${slicedBuffer.byteLength}`);
  headers.set('Accept-Ranges', 'bytes');

  return new Response(slicedBuffer, {
    status: 206,
    statusText: 'Partial Content',
    headers
  });
}

// Fetch Event Listener
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Ignore non-GET or chrome-extension requests
  if (request.method !== 'GET' || !url.startsWith('http')) {
    return;
  }

  // 1. AUDIO REQUESTS: Serve from cache if explicitly saved, otherwise stream directly from network
  if (isAudioRequest(url, request)) {
    event.respondWith(
      (async () => {
        const audioCache = await caches.open(AUDIO_CACHE);
        // Check if explicitly cached by user
        const cachedResponse = await audioCache.match(url, { ignoreSearch: true });

        if (cachedResponse) {
          // If browser requested range, return partial response
          return handleRangeAudioRequest(request, cachedResponse);
        }

        try {
          // Stream directly from network without forcing auto-cache
          return await fetch(request);
        } catch (fetchErr) {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(new ArrayBuffer(0), {
            status: 408,
            statusText: 'Audio Offline'
          });
        }
      })()
    );
    return;
  }

  // 2. IMAGE REQUESTS: Stale-While-Revalidate
  if (isImageRequest(url, request)) {
    event.respondWith(
      (async () => {
        const imagesCache = await caches.open(IMAGES_CACHE);
        const cachedResponse = await imagesCache.match(request);

        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              imagesCache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || (await networkFetch) || new Response('', { status: 404 });
      })()
    );
    return;
  }

  // 3. NAVIGATION / HTML DOCUMENTS: Network-First with Cache Fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const pagesCache = await caches.open(PAGES_CACHE);
            pagesCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Offline fallback
          const pagesCache = await caches.open(PAGES_CACHE);
          const cachedPage = await pagesCache.match(request);
          if (cachedPage) return cachedPage;

          const staticCache = await caches.open(STATIC_CACHE);
          return (
            (await staticCache.match('/index.html')) ||
            (await staticCache.match('/')) ||
            new Response('<h1>UpMizik Mòd Oflayn</h1><p>Tanpri rekonekte ak Entènèt la.</p>', {
              headers: { 'Content-Type': 'text/html' }
            })
          );
        }
      })()
    );
    return;
  }

  // 4. STATIC ASSETS (JS, CSS, FONTS): Stale-While-Revalidate
  event.respondWith(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      const cachedResponse = await staticCache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            staticCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || (await fetchPromise) || new Response(null, { status: 404 });
    })()
  );
});

// PostMessage API: Communicate with main React app
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  // Handle explicit audio track caching from client
  if (data.type === 'CACHE_AUDIO_TRACK') {
    const { audioUrl, coverUrl, trackId } = data.payload || {};
    
    (async () => {
      let audioCached = false;
      let coverCached = false;

      if (audioUrl && (audioUrl.startsWith('http') || audioUrl.startsWith('/'))) {
        try {
          const audioCache = await caches.open(AUDIO_CACHE);
          const existing = await audioCache.match(audioUrl);
          if (!existing) {
            const response = await fetch(audioUrl, { mode: 'cors' });
            if (response.ok) {
              await audioCache.put(audioUrl, response);
              await trimCache(AUDIO_CACHE, MAX_CACHED_SONGS);
              audioCached = true;
            }
          } else {
            audioCached = true;
          }
        } catch {}
      }

      if (coverUrl && (coverUrl.startsWith('http') || coverUrl.startsWith('/'))) {
        try {
          const imgCache = await caches.open(IMAGES_CACHE);
          const existing = await imgCache.match(coverUrl);
          if (!existing) {
            const response = await fetch(coverUrl, { mode: 'no-cors' });
            await imgCache.put(coverUrl, response);
            coverCached = true;
          } else {
            coverCached = true;
          }
        } catch {}
      }

      // Reply back to sender client
      if (event.source) {
        event.source.postMessage({
          type: 'CACHE_AUDIO_TRACK_RESULT',
          payload: { trackId, audioUrl, success: audioCached, coverCached }
        });
      }
    })();
  }

  // Handle cache stats query
  if (data.type === 'GET_CACHE_STATS') {
    (async () => {
      try {
        const audioCache = await caches.open(AUDIO_CACHE);
        const audioKeys = await audioCache.keys();
        const imgCache = await caches.open(IMAGES_CACHE);
        const imgKeys = await imgCache.keys();

        if (event.source) {
          event.source.postMessage({
            type: 'CACHE_STATS_RESULT',
            payload: {
              cachedAudioCount: audioKeys.length,
              cachedImagesCount: imgKeys.length,
              version: CACHE_VERSION
            }
          });
        }
      } catch {}
    })();
  }

  // Handle explicit cache clear
  if (data.type === 'CLEAR_AUDIO_CACHE') {
    (async () => {
      try {
        await caches.delete(AUDIO_CACHE);
        if (event.source) {
          event.source.postMessage({
            type: 'CLEAR_AUDIO_CACHE_RESULT',
            payload: { success: true }
          });
        }
      } catch {}
    })();
  }

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
