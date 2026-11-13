// app/register/page.tsx
'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [emriKafenes, setEmriKafenes] = useState('');
  const [emri, setEmri] = useState('');
  const [email, setEmail] = useState('');
  const [fjalekalim, setFjalekalim] = useState('');
  const [gabim, setGabim] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setGabim('');

    if (!emriKafenes.trim() || !emri.trim() || !email.trim() || !fjalekalim.trim()) {
      setGabim('Plotëso të gjitha fushat!');
      setLoading(false);
      return;
    }

    if (fjalekalim.length < 6) {
      setGabim('Fjalëkalimi duhet të jetë të paktën 6 karaktere.');
      setLoading(false);
      return;
    }

    try {
      // 1. Krijo llogarinë në Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, fjalekalim);
      const uid = userCredential.user.uid;

      // 2. Krijo ID unike për këtë kafe (Tenant)
      const tenantRef = doc(collection(db, 'tenants'));
      const tenantId = tenantRef.id;

      // 3. Krijo biznesin në Firestore
      await setDoc(tenantRef, {
        emri: emriKafenes.trim(),
        pronarId: uid,
        krijuar: serverTimestamp(),
        plani: 'BAZË',
        aktiv: true,
      });

      // 4. Krijo profilin e përdoruesit (Pronar) në një koleksion global
      await setDoc(doc(db, 'users', uid), {
        emri: emri.trim(),
        email: email.toLowerCase().trim(),
        roli: 'PRONAR',
        tenantId: tenantId,
        krijuar: serverTimestamp(),
      });

      // 5. Krijo zonën e parë (Salla Kryesore)
      const zoneRef = doc(collection(db, 'tenants', tenantId, 'zones'));
      await setDoc(zoneRef, {
        emri: 'Salla Kryesore',
        krijuar: serverTimestamp(),
      });

      // 6. Krijo një tavolinë të parë test
      const tableRef = doc(collection(db, 'tenants', tenantId, 'tables'));
      await setDoc(tableRef, {
        emri: 'Tavolina 1',
        karrige: 4,
        statusi: 'E_LIRË',
        pozX: 60,
        pozY: 60,
        zoneId: zoneRef.id,
        krijuar: serverTimestamp(),
      });

      // 7. Krijo disa produkte bazë
      const produktetBaze = [
        { emri: 'Espresso', çmimi: 150, kategoria: 'Kafe', stacioni: 'BAR' },
        { emri: 'Kapuçino', çmimi: 200, kategoria: 'Kafe', stacioni: 'BAR' },
        { emri: 'Coca-Cola', çmimi: 200, kategoria: 'Pije', stacioni: 'BAR' },
        { emri: 'Pizza Margarita', çmimi: 600, kategoria: 'Ushqim', stacioni: 'KUZHINË' },
      ];

      for (const p of produktetBaze) {
        const ref = doc(collection(db, 'tenants', tenantId, 'products'));
        await setDoc(ref, {
          ...p,
          krijuar: serverTimestamp(),
        });
      }

      // Sukses! Dërgo në Home
      router.push('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setGabim('Ky email është i regjistruar më parë.');
      } else if (err.code === 'auth/weak-password') {
        setGabim('Fjalëkalimi është shumë i dobët.');
      } else {
        setGabim('Gabim gjatë regjistrimit. Provo përsëri.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-orange-500/30 mb-4">
            🦅
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Krijo Kafenë Tënde</h1>
          <p className="text-slate-500 text-sm mt-1">Fillo me Eagle Gastronomy falas</p>
        </div>

        {gabim && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm text-center font-medium border border-red-100">
            {gabim}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Emri i Kafenesë</label>
            <input
              type="text"
              value={emriKafenes}
              onChange={(e) => setEmriKafenes(e.target.value)}
              placeholder="p.sh. Kafe Central"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Emri Juaj</label>
            <input
              type="text"
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              placeholder="p.sh. Ardit Krasniqi"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ardit@kafja.al"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Fjalëkalim</label>
            <input
              type="password"
              value={fjalekalim}
              onChange={(e) => setFjalekalim(e.target.value)}
              placeholder="Të paktën 6 karaktere"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? 'Duke u regjistruar...' : '🚀 Krijo Kafenë'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Ke llogari?{' '}
          <Link href="/login" className="text-orange-500 font-bold hover:underline">
            Kyçu
          </Link>
        </div>
      </div>
    </div>
  );
}