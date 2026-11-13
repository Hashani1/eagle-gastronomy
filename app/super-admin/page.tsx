// app/super-admin/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: string;
  emri: string;
  pronarId: string;
  krijuar: any;
  plani: string;
  aktiv: boolean;
}

// Krijojmë një instancë të dytë të Firebase për të krijuar përdorues të rinj
// pa u shkëputur nga llogaria e Super Adminit.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const appDytësore = getApps().find(app => app.name === 'SecondaryApp') 
  || initializeApp(firebaseConfig, 'SecondaryApp');
const authDytësore = getAuth(appDytësore);

export default function SuperAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const [modalHapur, setModalHapur] = useState(false);
  const [dukeKrijuar, setDukeKrijuar] = useState(false);
  const [gabim, setGabim] = useState('');
  const [sukses, setSukses] = useState('');

  const [emriKafenes, setEmriKafenes] = useState('');
  const [emriPronarit, setEmriPronarit] = useState('');
  const [email, setEmail] = useState('');
  const [fjalekalim, setFjalekalim] = useState('');
  const [plani, setPlani] = useState('Premium - 59€/muaj');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const eshteSuperAdmin = user.email === 'superadmin@eagle.al';
    if (!eshteSuperAdmin) {
      alert('Nuk keni leje për këtë faqe!');
      router.push('/');
      return;
    }

    const unsub = onSnapshot(collection(db, 'tenants'), (snap) => {
      const lista: Tenant[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          emri: data.emri,
          pronarId: data.pronarId,
          krijuar: data.krijuar,
          plani: data.plani || 'BAZË',
          aktiv: data.aktiv !== false,
        };
      });
      lista.sort((a, b) => (b.krijuar?.toMillis?.() || 0) - (a.krijuar?.toMillis?.() || 0));
      setTenants(lista);
      setLoadingTenants(false);
    });

    return () => unsub();
  }, [user, loading, router]);

  async function handleKrijoBiznes(e: React.FormEvent) {
    e.preventDefault();
    setDukeKrijuar(true);
    setGabim('');
    setSukses('');

    try {
      // 1. Krijo llogarinë në Firebase Auth duke përdorur instancën e dytë
      const userCredential = await createUserWithEmailAndPassword(authDytësore, email, fjalekalim);
      const uid = userCredential.user.uid;

      // 2. Krijo dokumentin e Tenant-it (Kafenesë)
      const tenantRef = doc(collection(db, 'tenants'));
      const tenantId = tenantRef.id;

      await setDoc(tenantRef, {
        emri: emriKafenes,
        pronarId: uid,
        plani: plani,
        aktiv: true,
        krijuar: serverTimestamp(),
      });

      // 3. Krijo profilin e Pronarit në koleksionin global 'users'
      await setDoc(doc(db, 'users', uid), {
        emri: emriPronarit,
        email: email,
        roli: 'PRONAR',
        tenantId: tenantId,
        krijuar: serverTimestamp(),
      });

      // 4. Krijo zonën e parë dhe një tavolinë bazë
      const zoneRef = await addDoc(collection(db, 'tenants', tenantId, 'zones'), {
        emri: 'Salla Kryesore',
        krijuar: serverTimestamp(),
      });

      await addDoc(collection(db, 'tenants', tenantId, 'tables'), {
        emri: 'Tavolina 1',
        karrige: 4,
        statusi: 'E_LIRË',
        pozX: 60,
        pozY: 60,
        zoneId: zoneRef.id,
        krijuar: serverTimestamp(),
      });

      // 5. Krijo produkte bazë
      const produktetBaze = [
        { emri: 'Espresso', çmimi: 150, kategoria: 'Kafe', stacioni: 'BAR' },
        { emri: 'Kapuçino', çmimi: 200, kategoria: 'Kafe', stacioni: 'BAR' },
        { emri: 'Coca-Cola', çmimi: 200, kategoria: 'Pije', stacioni: 'BAR' },
        { emri: 'Pizza Margarita', çmimi: 600, kategoria: 'Ushqim', stacioni: 'KUZHINË' },
      ];

      for (const p of produktetBaze) {
        await addDoc(collection(db, 'tenants', tenantId, 'products'), {
          ...p,
          krijuar: serverTimestamp(),
        });
      }

      setSukses('Biznesi u krijua me sukses!');
      setModalHapur(false);
      setEmriKafenes('');
      setEmriPronarit('');
      setEmail('');
      setFjalekalim('');
      
      setTimeout(() => setSukses(''), 3000);

    } catch (error: any) {
      console.error('Gabim:', error);
      if (error.code === 'auth/email-already-in-use') {
        setGabim('Ky email është i regjistruar më parë.');
      } else if (error.code === 'auth/weak-password') {
        setGabim('Fjalëkalimi duhet të jetë të paktën 6 karaktere.');
      } else {
        setGabim(error.message || 'Ndodhi një gabim i papritur.');
      }
    } finally {
      setDukeKrijuar(false);
    }
  }

  if (loading || loadingTenants) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
              ← Kthehu
            </a>
            <h1 className="text-3xl font-extrabold text-slate-800 mt-2">🚀 Super Admin</h1>
            <p className="text-slate-500 font-medium mt-1">Menaxhimi i të gjitha kafeneve në SaaS</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-orange-500/30 text-center">
              <p className="text-xs font-bold uppercase tracking-widest opacity-90">Kafene aktive</p>
              <p className="text-2xl font-extrabold">{tenants.length}</p>
            </div>
            <button
              onClick={() => setModalHapur(true)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition"
            >
              + Krijo Biznes
            </button>
          </div>
        </header>

        {sukses && (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 font-bold border border-green-200">
            ✅ {sukses}
          </div>
        )}

        {tenants.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-6xl mb-3 opacity-30">🏢</p>
            <p className="text-slate-500 font-bold">Nuk ka kafene të regjistruara.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tenants.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-extrabold text-lg text-slate-800">{t.emri}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${t.aktiv ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {t.aktiv ? 'Aktiv' : 'Joaktiv'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mb-3">ID: {t.id.slice(0, 12)}...</p>
                <div className="space-y-1 text-sm text-slate-600">
                  <p><strong>Plani:</strong> {t.plani}</p>
                  <p><strong>Krijuar:</strong> {t.krijuar?.toDate?.().toLocaleDateString('sq-AL') || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalHapur && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Krijo Biznes të Ri</h3>
            
            {gabim && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm font-medium">
                {gabim}
              </div>
            )}

            <form onSubmit={handleKrijoBiznes} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Emri i Kafenesë</label>
                <input
                  type="text"
                  value={emriKafenes}
                  onChange={(e) => setEmriKafenes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Emri i Pronarit</label>
                <input
                  type="text"
                  value={emriPronarit}
                  onChange={(e) => setEmriPronarit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email i Pronarit</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fjalëkalimi</label>
                <input
                  type="password"
                  value={fjalekalim}
                  onChange={(e) => setFjalekalim(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Plani</label>
                <select
                  value={plani}
                  onChange={(e) => setPlani(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Bazë - 29€/muaj">Bazë - 29€/muaj</option>
                  <option value="Premium - 59€/muaj">Premium - 59€/muaj</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalHapur(false); setGabim(''); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  disabled={dukeKrijuar}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition disabled:opacity-50"
                >
                  {dukeKrijuar ? 'Duke krijuar...' : 'Krijo Biznesin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}