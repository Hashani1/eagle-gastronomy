// app/login/page.tsx
'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fjalëkalim, setFjalëkalim] = useState('');
  const [gabim, setGabim] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setGabim('');

    try {
      await signInWithEmailAndPassword(auth, email, fjalëkalim);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setGabim('Email ose fjalëkalim i gabuar.');
      } else {
        setGabim('Gabim gjatë hyrjes. Provo përsëri.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div className="relative bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg shadow-orange-500/30 mb-4">
            🦅
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">Eagle Gastronomy</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Hyr si Pronar / Menaxher</p>
        </div>

        {gabim && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-6 text-sm text-center font-medium border border-red-100">
            {gabim}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="emri@eagle.al"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Fjalëkalim</label>
            <input
              type="password"
              value={fjalëkalim}
              onChange={(e) => setFjalëkalim(e.target.value)}
              placeholder="••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? 'Duke u kyçur...' : '🔐 KYÇU SI PRONAR'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
          <p className="text-sm text-slate-500">Je pjesë e stafit?</p>
          <Link
            href="/pin"
            className="block w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-slate-800/20"
          >
            👤 Hyr me Email & PIN
          </Link>
        </div>
      </div>
    </div>
  );
}