// Native IndexedDB Store for UpMizik Ayiti
// Handles large media assets (Audio files, high-res covers, payment proofs, full offline backups)
// to prevent localStorage quota exhaustion.

const DB_NAME = 'upmizik_media_db_v1';
const DB_VERSION = 1;
const STORE_MEDIA = 'media';
const STORE_COLLECTIONS = 'collections';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA);
        }
        if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
          db.createObjectStore(STORE_COLLECTIONS);
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        dbInstance = db;
        db.onclose = () => {
          dbInstance = null;
          dbPromise = null;
        };
        db.onversionchange = () => {
          try {
            db.close();
          } catch {
            // silent
          }
          dbInstance = null;
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = (event) => {
        dbInstance = null;
        dbPromise = null;
        console.warn('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
      request.onblocked = () => {
        dbInstance = null;
        dbPromise = null;
      };
    } catch (err) {
      dbInstance = null;
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

// In-memory cache for fast blob URLs
const objectUrlCache = new Map<string, string>();

async function getValidDB(): Promise<IDBDatabase> {
  try {
    const db = await openDB();
    return db;
  } catch {
    dbInstance = null;
    dbPromise = null;
    return openDB();
  }
}

export const IdbStorage = {
  /**
   * Save a blob, file, or data string to IndexedDB
   */
  saveMedia: async (key: string, data: Blob | File | string): Promise<void> => {
    try {
      const db = await getValidDB();
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_MEDIA, 'readwrite');
          tx.onerror = () => {
            dbInstance = null;
            dbPromise = null;
            reject(tx.error);
          };
          const store = tx.objectStore(STORE_MEDIA);
          const req = store.put(data, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (e) {
          dbInstance = null;
          dbPromise = null;
          resolve();
        }
      });
    } catch {
      // Fallback silently if storage unavailable
    }
  },

  /**
   * Get a media item from IndexedDB
   */
  getMedia: async (key: string): Promise<Blob | File | string | null> => {
    try {
      const db = await getValidDB();
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_MEDIA, 'readonly');
          tx.onerror = () => {
            dbInstance = null;
            dbPromise = null;
            reject(tx.error);
          };
          const store = tx.objectStore(STORE_MEDIA);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        } catch {
          dbInstance = null;
          dbPromise = null;
          resolve(null);
        }
      });
    } catch {
      return null;
    }
  },

  /**
   * Delete a media item from IndexedDB
   */
  deleteMedia: async (key: string): Promise<void> => {
    try {
      const db = await getValidDB();
      // Revoke any cached blob URL
      if (objectUrlCache.has(key)) {
        try {
          URL.revokeObjectURL(objectUrlCache.get(key)!);
        } catch {
          // ignore
        }
        objectUrlCache.delete(key);
      }
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_MEDIA, 'readwrite');
          tx.onerror = () => {
            dbInstance = null;
            dbPromise = null;
            reject(tx.error);
          };
          const store = tx.objectStore(STORE_MEDIA);
          const req = store.delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch {
          dbInstance = null;
          dbPromise = null;
          resolve();
        }
      });
    } catch {
      // Fallback silently
    }
  },

  /**
   * Resolves a media key or URL into a playable/renderable URL.
   * If it's an IndexedDB key (e.g. 'idb:audio_123'), retrieves the blob and creates an ObjectURL.
   */
  resolveMediaUrl: async (urlOrKey?: string): Promise<string> => {
    if (!urlOrKey) return '';
    if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://') || urlOrKey.startsWith('blob:')) {
      return urlOrKey;
    }
    if (urlOrKey.startsWith('idb:')) {
      const key = urlOrKey.replace('idb:', '');
      if (objectUrlCache.has(key)) {
        return objectUrlCache.get(key)!;
      }
      const data = await IdbStorage.getMedia(key);
      if (data) {
        if (data instanceof Blob) {
          const blobUrl = URL.createObjectURL(data);
          objectUrlCache.set(key, blobUrl);
          return blobUrl;
        } else if (typeof data === 'string') {
          return data;
        }
      }
      return '';
    }
    return urlOrKey;
  },

  /**
   * Asynchronously backup large JSON collections
   */
  saveCollectionBackup: async <T>(key: string, data: T): Promise<void> => {
    try {
      const db = await getValidDB();
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
          tx.onerror = () => {
            dbInstance = null;
            dbPromise = null;
            reject(tx.error);
          };
          const store = tx.objectStore(STORE_COLLECTIONS);
          const req = store.put(data, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch {
          dbInstance = null;
          dbPromise = null;
          resolve();
        }
      });
    } catch {
      // Fallback silently
    }
  },

  /**
   * Retrieve collection backup from IndexedDB
   */
  getCollectionBackup: async <T>(key: string): Promise<T | null> => {
    try {
      const db = await getValidDB();
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
          tx.onerror = () => {
            dbInstance = null;
            dbPromise = null;
            reject(tx.error);
          };
          const store = tx.objectStore(STORE_COLLECTIONS);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        } catch {
          dbInstance = null;
          dbPromise = null;
          resolve(null);
        }
      });
    } catch {
      return null;
    }
  }
};
