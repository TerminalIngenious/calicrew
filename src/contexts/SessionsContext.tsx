import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { collection, query, where, getDocs, getDocsFromCache, getDocsFromServer } from 'firebase/firestore';
import type { QuerySnapshot } from 'firebase/firestore';
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
    const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
    const applique = (snap: QuerySnapshot) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setSessions(data);
    };

    // Le cache d'abord. `getDocs` attend le serveur avant de rendre la main :
    // sur un réseau hésitant, l'accueil restait sur son écran de chargement
    // alors que les séances étaient déjà sur l'appareil.
    if (!forceServer) {
      try {
        const cache = await getDocsFromCache(q);
        if (!cache.empty) {
          applique(cache);
          setLoading(false);
        }
      } catch {
        // Premier lancement, ou cache vidé : on attendra le serveur.
      }
    }

    try {
      const snap = forceServer ? await getDocsFromServer(q) : await getDocs(q);
      applique(snap);
    } catch (err) {
      console.error('Erreur chargement sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let fini = false;
    load().then(() => { fini = true; });
    /**
     * Garde-fou : si la lecture serveur ne revient jamais — Firestore peut
     * rester suspendu très longtemps sur un réseau qui répond à moitié — on
     * rend la main au bout de dix secondes. Mieux vaut un écran vide qui se
     * remplira tout seul qu'un chargement sans fin.
     */
    const secours = setTimeout(() => {
      if (!fini) {
        console.warn('Sessions : lecture serveur trop lente, on affiche ce qu\'on a.');
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(secours);
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
