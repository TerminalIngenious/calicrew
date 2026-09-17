import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types';

export const MAX_DISPLAY_NAME = 20;

interface AuthContextType {
  user: User | null;
  /**
   * Pseudo courant. Exposé à part de `user.displayName` car updateProfile()
   * mute l'objet User sans déclencher de rendu React.
   */
  displayName: string;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setDisplayName(u?.displayName || '');
      setLoading(false);
    });
  }, []);

  async function signUp(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const profile: UserProfile = {
      uid: cred.user.uid,
      displayName,
      email,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  /**
   * Le pseudo est dupliqué dans le profil Auth et dans users/{uid} : les
   * classements et le chat lisent la copie Firestore, il faut donc les deux.
   */
  async function updateDisplayName(name: string) {
    const current = auth.currentUser;
    if (!current) throw new Error('Non connecté');

    const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME);
    if (!trimmed) throw new Error('Le pseudo ne peut pas être vide');
    if (trimmed === current.displayName) return;

    await updateProfile(current, { displayName: trimmed });
    await updateDoc(doc(db, 'users', current.uid), { displayName: trimmed });
    setDisplayName(trimmed);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, displayName, loading, signUp, signIn, signOut, updateDisplayName }}
    >
      {children}
    </AuthContext.Provider>
  );
}
