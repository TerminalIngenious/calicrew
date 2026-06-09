import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { collection, query, where, getDocs, getDocsFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { Session } from '../types';

interface SessionsContextType {
  sessions: Session[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionsContext = createContext<SessionsContextType>({
  sessions: [],
  loading: true,
  refresh: async () => {},
});

export function useUserSessions() {
  return useContext(SessionsContext);
}

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (forceServer = false) => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
      const snap = forceServer ? await getDocsFromServer(q) : await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setSessions(data);
    } catch (err) {
      console.error('Erreur chargement sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return (
    <SessionsContext.Provider value={{ sessions, loading, refresh }}>
      {children}
    </SessionsContext.Provider>
  );
}
