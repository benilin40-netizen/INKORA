import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'ai-studio-inkora-5bb88a89-1959-4032-bc50-c9e9b44c71bd');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache
let cachedAccessToken: string | null = null;
export const getCachedAccessToken = () => cachedAccessToken;

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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Skill requirement: Test connection on app startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database initializing.');
    }
    return false;
  }
}
testConnection().catch(() => {});

export const AuthService = {
  // Real Google Sign In popup
  async signInWithGoogle(): Promise<{ user: FirebaseUser; profile: User }> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
      const fbUser = result.user;
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      let profile: User;
      if (userSnap.exists()) {
        profile = userSnap.data() as User;
      } else {
        profile = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Author',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          bio: 'Writing thoughts and crafting worlds on INOKORA.',
          followersCount: 0,
          joinedDate: Date.now(),
          publicBookshelf: true
        };
        await setDoc(userDocRef, profile);
      }

      return { user: fbUser, profile };
    } catch (error: any) {
      console.error('[AuthService] Google Sign In Error:', error);
      throw error;
    }
  },

  // Real Email/Password Sign Up with atomic profile creation in Firestore
  async signUpWithEmail(email: string, pass: string, name: string): Promise<{ user: FirebaseUser; profile: User }> {
    try {
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, email, pass);
      } catch (err: any) {
        if (err?.code === 'auth/email-already-in-use') {
          // Fall back to sign in if email already exists
          cred = await signInWithEmailAndPassword(auth, email, pass);
        } else {
          throw err;
        }
      }
      const fbUser = cred.user;

      if (name.trim()) {
        await updateProfile(fbUser, { displayName: name.trim() });
      }

      let profile: User = {
        id: fbUser.uid,
        name: name.trim() || fbUser.displayName || 'Author',
        email: fbUser.email || email,
        avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        bio: 'Writing thoughts and crafting worlds on INOKORA.',
        followersCount: 0,
        joinedDate: Date.now(),
        publicBookshelf: true
      };

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          await setDoc(userDocRef, profile);
        } else {
          profile = userSnap.data() as User;
        }
      } catch (profileErr) {
        console.warn('[AuthService] Profile document creation deferred/failed:', profileErr);
      }
      return { user: fbUser, profile };
    } catch (error: any) {
      console.error('[AuthService] Sign Up Error:', error);
      throw error;
    }
  },

  // Real Email/Password Sign In
  async signInWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser; profile: User }> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = cred.user;

      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      let profile: User;
      if (userSnap.exists()) {
        profile = userSnap.data() as User;
      } else {
        profile = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Author',
          email: fbUser.email || email,
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          bio: 'Writing thoughts and crafting worlds on INOKORA.',
          followersCount: 0,
          joinedDate: Date.now(),
          publicBookshelf: true
        };
        await setDoc(userDocRef, profile);
      }

      return { user: fbUser, profile };
    } catch (error: any) {
      console.error('[AuthService] Sign In Error:', error);
      throw error;
    }
  },

  // Password reset email
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('[AuthService] Password Reset Error:', error);
      throw error;
    }
  },

  // Real Sign Out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      cachedAccessToken = null;
    } catch (error: any) {
      console.error('[AuthService] Sign Out Error:', error);
      throw error;
    }
  },

  // Session restore listener
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
};
