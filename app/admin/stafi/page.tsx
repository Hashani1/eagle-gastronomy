// app/admin/stafi/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/app/components/ProtectedRoute';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Instancë e dytë për të krijuar përdorues pa u shkëputur nga llogaria e pronarit
const appDytësore = getApps().find((app) => app.name === 'SecondaryApp')
  || initializeApp(firebaseConfig, 'SecondaryApp');
const authDytësore = getAuth(appDytësore);

interface Staf {
  id: string; // UID
  emri: string;
  email: string;
  roli: string;
}

export default function AdminStafiPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <StafiContent />
    </ProtectedRoute>
  );
}

function StafiContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [stafi, setStafi] = useState<Staf[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulari
  const [emri, setEmri] = useState('');
  const [email, setEmail] = useState('');
  const [fjalekalim, setFjalekalim] = useState('');
  const [roli, setRoli] = useState('KAMARIER');
  const [dukeKrijuar, setDukeKrijuar] = useState(false);
  const [gabim, setGabim] = useState('');
  const [sukses, setSukses] = useState('');

  useEffect(() => {
    if (!TENANT_ID) return;
    
    // Lexo vetëm përdoruesit e këtij biznesi
    const q = query(
      collection(db, 'users'),
      where('tenantId', '==', TENANT_ID)
    );

    const unsub = onSnapshot(q, (snap) => {
      const lista: Staf[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          emri: data.emri || 'Pa emër',
          email: data.email || '',
          roli: data.roli || 'KAMARIER',
        };
      });
      // Rendit: Pronari i pari, pastaj të tjerët
      lista.sort((a, b) => {
        if (a.roli === 'PRONAR') return -1;
        if (b.roli === 'PRONAR') return 1;
        return a.emri.localeCompare(b.emri);
      });
      setStafi(lista);
      setLoading(false);
    });

    return () => unsub();
  }, [TENANT_ID]);

  async function handleKrijoStaf(e: React.FormEvent) {
    e.preventDefault();
    setDukeKrijuar(true);
    setGabim('');
    setSukses('');

    if (!emri.trim() || !email.trim() || !fjalekalim.trim()) {
      setGabim('Plotëso të gjitha fushat!');
      setDukeKrijuar(false);
      return;
    }

    if (fjalekalim.length < 6) {
      setGabim('Fjalëkalimi duhet të jetë të paktën 6 karaktere.');
      setDukeKrijuar(false);
      return;
    }

    try {
      // 1. Krijo llogarinë në Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(authDytësore, email, fjalekalim);
      const uid = userCredential.user.uid;

      // 2. Krijo profilin në Firestore me tenantId e pronarit
      await setDoc(doc(db, 'users', uid), {
        emri: emri.trim(),
        email: email.trim(),
        roli: roli,
        tenantId: TENANT_ID,
        krijuar: serverTimestamp(),
      });

      setSukses(`Punonjësi ${emri} u krijua me sukses!`);
      setEmri('');
      setEmail('');
      setFjalekalim('');
      setRoli('KAMARIER');

      setTimeout(() => setSukses(''), 3000);

    } catch (error: any) {
      console.error('Gabim:', error);
      if (error.code === 'auth/email-already-in-use') {
        setGabim('Ky email është i regjistruar më parë.');
      } else if (error.code === 'auth/weak-password') {
        setGabim('Fjalëkalimi është shumë i dobët.');
      } else {
        setGabim('Gabim gjatë krijimit të punonjësit.');
      }
    } finally {
      setDukeKrijuar(false);
    }
  }

  async function fshiStaf(id: string, emri: string) {
    if (id === user?.uid) {
      alert('Nuk mund të fshini llogarinë tuaj!');
      return;
    }
    if (!confirm(`A jeni i sigurt që doni të fshini ${emri}?`)) return;
    
    try {
      // Fshin vetëm profilin nga Firestore. Llogaria në Auth mbetet e pavlefshme.
      // Për ta fshirë edhe nga Auth, duhet Firebase Admin SDK (server-side).
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error('Gabim:', err);
      alert('Gabim gjatë fshirjes!');
    }
  }

  const etiketaRoli = (r: string) => {
    if (r === 'PRONAR') return { emri: 'Pronar', ngjyra: 'bg-purple-100 text-purple-700' };
    if (r === 'MENAXHER') return { emri: 'Menaxher', ngjyra: 'bg-blue-100 text-blue-700' };
    if (r === 'KAMARIER') return { emri: 'Kamarier', ngjyra: 'bg-emerald-100 text-emerald-700' };
    if (r === 'SHANKIST') return { emri: 'Shankist', ngjyra: 'bg-amber-100 text-amber-700' };
    if (r === 'KUZHINIER') return { emri: 'Kuzhinier', ngjyra: 'bg-orange-100 text-orange-700' };
    return { emri: r, ngjyra: 'bg-slate-100 text-slate-700' };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">👥 Menaxho Stafin</h1>
          <p className="text-slate-500 font-medium mt-1">Shto dhe menaxho punonjësit e kafenesë tënde</p>
        </div>

        {/* Forma e shtimit */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Shto punonjës të re</h2>
          
          {gabim && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm font-medium">
              {gabim}
            </div>
          )}
          {sukses && (
            <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm font-medium">
              ✅ {sukses}
            </div>
          )}

          <form onSubmit={handleKrijoStaf} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              placeholder="Emri i plotë"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <input
              type="password"
              value={fjalekalim}
              onChange={(e) => setFjalekalim(e.target.value)}
              placeholder="Fjalëkalimi"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <select
              value={roli}
              onChange={(e) => setRoli(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="KAMARIER">Kamarier</option>
              <option value="SHANKIST">Shankist</option>
              <option value="KUZHINIER">Kuzhinier</option>
              <option value="MENAXHER">Menaxher</option>
            </select>
            
            <div className="md:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                disabled={dukeKrijuar}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition disabled:opacity-50"
              >
                {dukeKrijuar ? 'Duke krijuar...' : '+ Shto Punonjës'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista e stafit */}
        {loading ? (
          <p className="text-center text-slate-400 py-8">Duke lexuar stafin...</p>
        ) : stafi.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-5xl mb-3 opacity-40">👥</p>
            <p className="text-slate-500 font-bold">Nuk ka staf të regjistruar.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Emri</th>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Email</th>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Roli</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {stafi.map((s) => {
                  const etiketa = etiketaRoli(s.roli);
                  const eshtePronar = s.id === user?.uid;
                  return (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{s.emri} {eshtePronar && '(Ju)'}</td>
                      <td className="p-4 text-slate-600 font-medium">{s.email}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${etiketa.ngjyra}`}>
                          {etiketa.emri}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {!eshtePronar && (
                          <button
                            onClick={() => fshiStaf(s.id, s.emri)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            🗑️ Fshi
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}