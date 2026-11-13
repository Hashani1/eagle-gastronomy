// app/mire-search/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStafSession, StafSession } from '@/lib/pin-auth';
import { regjistroHyrjen } from '@/lib/attendance-listener';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MireSeArdhjePage() {
  const router = useRouter();
  const [session, setSession] = useState<StafSession | null>(null);
  const [tenantEmri, setTenantEmri] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [clockInDone, setClockInDone] = useState(false);

  useEffect(() => {
    async function load() {
      const s = getStafSession();
      if (!s) {
        router.push('/pin');
        return;
      }
      setSession(s);

      // Merr emrin e biznesit
      try {
        const tenantDoc = await getDoc(doc(db, 'tenants', s.tenantId));
        if (tenantDoc.exists()) {
          setTenantEmri(tenantDoc.data().emri || 'Biznesi');
        }
      } catch (err) {
        console.error('Gabim gjatë leximit të biznesit:', err);
      }

      // Regjistro Clock-In automatikisht
      try {
        await regjistroHyrjen(s.tenantId, s.uid, s.emri);
        setClockInDone(true);
      } catch (err) {
        console.error('Gabim Clock-In:', err);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  function vazhdo() {
    if (!session) return;
    if (session.roli === 'KAMARIER') router.push('/kamarier');
    else if (session.roli === 'SHANKIST') router.push('/kds');
    else if (session.roli === 'KUZHINIER') router.push('/kuzhina');
    else router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>

      <div className="relative z-10 w-full max-w-md bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-emerald-500/30">
          ✓
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-2">
          Mirësevini, {session?.emri}!
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Roli: <span className="text-orange-400 font-bold">{session?.roli}</span>
        </p>

        <div className="bg-slate-900/50 rounded-2xl p-5 mb-6 border border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-bold">
            Biznesi juaj
          </p>
          <p className="text-2xl font-extrabold text-white">
            🏢 {tenantEmri || 'Duke lexuar...'}
          </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-6">
          <p className="text-sm text-emerald-400 font-bold flex items-center justify-center gap-2">
            {clockInDone ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Kyçja në punë u regjistrua automatikisht
              </>
            ) : (
              <>⏳ Duke regjistruar kyçjen...</>
            )}
          </p>
        </div>

        <button
          onClick={vazhdo}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-2xl font-extrabold text-lg shadow-lg shadow-orange-500/30 transition-all transform active:scale-95"
        >
          Vazhdo → {session?.roli === 'KAMARIER' ? 'Kamarier' : session?.roli === 'SHANKIST' ? 'Shank' : 'Kuzhina'}
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('eagle-staf-session');
            router.push('/pin');
          }}
          className="mt-3 w-full text-slate-500 hover:text-red-400 text-xs font-bold transition"
        >
          ← Hyr si staf tjetër
        </button>
      </div>
    </div>
  );
}