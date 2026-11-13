// lib/auth-context.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getStafSession, clearStafSession } from './pin-auth';

interface UserData {
  uid: string;
  email: string;
  emri: string;
  roli: string;
  tenantId: string;
  isPinLogin: boolean; // 🆕 Dallojmë PIN nga Email
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Kontrollo sesionin PIN së pari
    const stafSession = getStafSession();
    if (stafSession) {
      setUser({
        uid: stafSession.uid,
        email: '',
        emri: stafSession.emri,
        roli: stafSession.roli,
        tenantId: stafSession.tenantId,
        isPinLogin: true,
      });
      setLoading(false);
      return;
    }

    // 2. Nëse nuk ka sesion PIN, kontrollo Firebase Auth (Email)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              emri: data.emri || 'Pa emër',
              roli: data.roli || 'KAMARIER',
              tenantId: data.tenantId || '',
              isPinLogin: false,
            });
          } else {
            console.warn('Nuk u gjet profil për këtë përdorues.');
            setUser(null);
          }
        } catch (err) {
          console.error('Gabim gjatë leximit të profilit:', err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    clearStafSession();
    if (auth.currentUser) {
      await signOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);