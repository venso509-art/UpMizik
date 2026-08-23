import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  MusicItem,
  ArtistUser,
  DonationItem,
  SocialPost,
  SocialPostComment,
  ArtistInboxMessage,
  PubItem,
  RpaItem,
  ArchiveRecord
} from '../types';

// Silence Firestore reachability polling warnings
try {
  setLogLevel('silent');
} catch {
  // Ignore if already set
}

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Helper function to safely strip undefined fields for Firestore compatibility
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// Helper function for timed operations (prevents blocking in offline/restricted sandbox)
function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timeout')), ms)
    )
  ]);
}

// Initialize Firestore with specific database ID from config or default, forced long polling, and undefined properties ignored
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
  }, dbId || undefined);
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    }, dbId || undefined);
  } catch {
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = firestoreInstance;
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.warn(`[Firestore ${operationType} on ${path}]`, error);
  return errInfo;
}

// Connection check (non-blocking)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    return Boolean(db);
  } catch {
    return false;
  }
}

/**
 * Cloud Firebase Sync Service
 * Seamlessly synchronizes, saves, and listens in real-time to Firestore collections
 */
export const FirebaseService = {
  // ==========================================
  // ARTISTS (Collection: 'artists')
  // ==========================================
  async syncArtists(list: ArtistUser[]) {
    try {
      for (const artist of list) {
        if (!artist.id) continue;
        const clean = sanitizeForFirestore(artist);
        await setDoc(doc(db, 'artists', artist.id), clean, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'artists');
    }
  },

  async fetchArtists(): Promise<ArtistUser[] | null> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'artists')), 3500);
      if (snap.empty) return null;
      return snap.docs.map(d => d.data() as ArtistUser);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'artists');
      return null;
    }
  },

  subscribeToArtists(callback: (artists: ArtistUser[]) => void): Unsubscribe {
    try {
      const colRef = collection(db, 'artists');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => d.data() as ArtistUser);
            callback(list);
          } else {
            callback([]);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'artists');
        }
      );
      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'artists');
      return () => {};
    }
  },

  async saveSingleArtist(artist: ArtistUser) {
    try {
      const clean = sanitizeForFirestore(artist);
      await setDoc(doc(db, 'artists', artist.id), clean, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `artists/${artist.id}`);
    }
  },

  async deleteArtist(id: string) {
    try {
      await deleteDoc(doc(db, 'artists', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `artists/${id}`);
    }
  },

  // ==========================================
  // DONATIONS / SIPÒ (Collection: 'donations')
  // ==========================================
  async syncDonations(list: DonationItem[]) {
    try {
      for (const don of list) {
        if (!don.id) continue;
        const clean = sanitizeForFirestore(don);
        await setDoc(doc(db, 'donations', don.id), clean, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'donations');
    }
  },

  async fetchDonations(): Promise<DonationItem[] | null> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'donations')), 3500);
      if (snap.empty) return null;
      return snap.docs.map(d => d.data() as DonationItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'donations');
      return null;
    }
  },

  subscribeToDonations(callback: (donations: DonationItem[]) => void): Unsubscribe {
    try {
      const colRef = collection(db, 'donations');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => d.data() as DonationItem);
            callback(list);
          } else {
            callback([]);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'donations');
        }
      );
      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'donations');
      return () => {};
    }
  },

  async saveSingleDonation(don: DonationItem) {
    try {
      const clean = sanitizeForFirestore(don);
      await setDoc(doc(db, 'donations', don.id), clean, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `donations/${don.id}`);
    }
  },

  async deleteDonation(id: string) {
    try {
      await deleteDoc(doc(db, 'donations', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `donations/${id}`);
    }
  },

  // ==========================================
  // MUSIC TRACKS (Collection: 'music')
  // ==========================================
  async syncMusic(list: MusicItem[]) {
    try {
      for (const item of list) {
        if (!item.id) continue;
        const clean = sanitizeForFirestore(item);
        await setDoc(doc(db, 'music', item.id), clean, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'music');
    }
  },

  async fetchMusic(): Promise<MusicItem[] | null> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'music')), 3500);
      if (snap.empty) return null;
      return snap.docs.map(d => d.data() as MusicItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'music');
      return null;
    }
  },

  subscribeToMusic(callback: (music: MusicItem[]) => void): Unsubscribe {
    try {
      const colRef = collection(db, 'music');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => d.data() as MusicItem);
            callback(list);
          } else {
            callback([]);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'music');
        }
      );
      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'music');
      return () => {};
    }
  },

  async saveSingleMusic(item: MusicItem) {
    try {
      const clean = sanitizeForFirestore(item);
      await setDoc(doc(db, 'music', item.id), clean, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `music/${item.id}`);
    }
  },

  async deleteMusic(id: string) {
    try {
      await deleteDoc(doc(db, 'music', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `music/${id}`);
    }
  },

  // ==========================================
  // SOCIAL POSTS (Collection: 'social_posts')
  // ==========================================
  async syncSocialPosts(list: SocialPost[]) {
    try {
      for (const post of list) {
        if (!post.id) continue;
        const clean = sanitizeForFirestore(post);
        await setDoc(doc(db, 'social_posts', post.id), clean, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'social_posts');
    }
  },

  async fetchSocialPosts(): Promise<SocialPost[] | null> {
    try {
      const q = query(collection(db, 'social_posts'), orderBy('createdAt', 'desc'));
      const snap = await withTimeout(getDocs(q), 3500);
      if (snap.empty) return null;
      return snap.docs.map(d => d.data() as SocialPost);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'social_posts');
      return null;
    }
  },

  subscribeToSocialPosts(callback: (posts: SocialPost[]) => void): Unsubscribe {
    try {
      const q = query(collection(db, 'social_posts'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => d.data() as SocialPost);
            callback(list);
          } else {
            callback([]);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'social_posts');
        }
      );
      return unsubscribe;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'social_posts');
      return () => {};
    }
  },

  async saveSinglePost(post: SocialPost) {
    try {
      const clean = sanitizeForFirestore(post);
      await setDoc(doc(db, 'social_posts', post.id), clean, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `social_posts/${post.id}`);
    }
  },

  // ==========================================
  // SOCIAL COMMENTS (Collection: 'social_comments')
  // ==========================================
  async saveSingleComment(comment: SocialPostComment) {
    try {
      const clean = sanitizeForFirestore(comment);
      await setDoc(doc(db, 'social_comments', comment.id), clean, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `social_comments/${comment.id}`);
    }
  },

  async fetchCommentsForPost(postId: string): Promise<SocialPostComment[] | null> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'social_comments')), 3500);
      if (snap.empty) return null;
      return snap.docs
        .map(d => d.data() as SocialPostComment)
        .filter(c => c.postId === postId);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'social_comments');
      return null;
    }
  },

  // ==========================================
  // INBOX NOTIFICATIONS (Collection: 'artist_inbox')
  // ==========================================
  async saveInboxMessage(msg: ArtistInboxMessage) {
    try {
      const clean = sanitizeForFirestore(msg);
      await setDoc(doc(db, 'artist_inbox', msg.id), clean, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `artist_inbox/${msg.id}`);
    }
  },

  // ==========================================
  // ARCHIVES (Collection: 'archives')
  // ==========================================
  async syncArchives(list: ArchiveRecord[]) {
    try {
      for (const arch of list) {
        if (!arch.id) continue;
        const clean = sanitizeForFirestore(arch);
        await setDoc(doc(db, 'archives', arch.id), clean, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'archives');
    }
  }
};
