// app/mbyllja/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatoÇmimin, euroNCent } from '@/lib/çmimi';

interface Porosi {
  id: string;
  totali: number;
  metoda: 'CASH' | 'KARTË' | null;
  statusi: string;
  krijuar: any;
}

interface RaportZ {
  kamarierEmri: string;
  data: string;
  oraMbylljes: string;
  totaliPorosive: number;
  priturCash: number;
  priturKartë: number;
  numëruarCash: number;
  numëruarKartë: number;
  diferencaCash: number;
  diferencaKartë: number;
  statusiCash: 'Mungesë' | 'Tepricë' | 'Barazim';
  statusiKartë: 'Mungesë' | 'Tepricë' | 'Barazim';
}

function përcaktoStatusin(diferenca: number): 'Mungesë' | 'Tepricë' | 'Barazim' {
  if (diferenca > 0) return 'Tepricë';
  if (diferenca < 0) return 'Mungesë';
  return 'Barazim';
}

export default function MbylljaPage() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [porositë, setPorositë] = useState<Porosi[]>([]);
  const [loading, setLoading] = useState(true);
  const [hapi, setHapi] = useState<'count' | 'konfirmo' | 'raport'>('count');
  const [cash, setCash] = useState('');
  const [kartë, setKartë] = useState('');
  const [raport, setRaport] = useState<RaportZ | null>(null);
  const [dukeRuajtur, setDukeRuajtur] = useState(false);

  useEffect(() => {
    if (!user || !TENANT_ID) return;
    const fillimiIDitës = new Date();
    fillimiIDitës.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'tenants', TENANT_ID, 'orders'),
      where('kamarierId', '==', user.uid),
      where('statusi', '==', 'PAGUAR')
    );

    const unsub = onSnapshot(q, (snap) => {
      const lista: Porosi[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            totali: Number(data.totali) || 0,
            metoda: data.metoda || null,
            statusi: String(data.statusi),
            krijuar: data.krijuar,
          };
        })
        .filter((p) => {
          const d = p.krijuar?.toDate?.();
          return d ? d >= fillimiIDitës : true;
        });
      setPorositë(lista);
      setLoading(false);
    });

    return () => unsub();
  }, [user, TENANT_ID]);

  const priturCash = porositë.filter((p) => p.metoda === 'CASH').reduce((s, p) => s + p.totali, 0);
  const priturKartë = porositë.filter((p) => p.metoda === 'KARTË').reduce((s, p) => s + p.totali, 0);

  function vazhdo() {
    if (!cash || !kartë) {
      alert('Plotëso të dyja fushat!');
      return;
    }
    setHapi('konfirmo');
  }

  async function dorëzo() {
    if (!user || !TENANT_ID) return;
    setDukeRuajtur(true);

    const numëruarCash = euroNCent(cash);
    const numëruarKartë = euroNCent(kartë);
    const diferencaCash = numëruarCash - priturCash;
    const diferencaKartë = numëruarKartë - priturKartë;

    const raportiIRi: RaportZ = {
      kamarierEmri: user.emri,
      data: new Date().toLocaleDateString('sq-AL'),
      oraMbylljes: new Date().toLocaleTimeString('sq-AL'),
      totaliPorosive: porositë.length,
      priturCash,
      priturKartë,
      numëruarCash,
      numëruarKartë,
      diferencaCash,
      diferencaKartë,
      statusiCash: përcaktoStatusin(diferencaCash),
      statusiKartë: përcaktoStatusin(diferencaKartë),
    };

    try {
      await addDoc(collection(db, 'tenants', TENANT_ID, 'shifts'), {
        ...raportiIRi,
        kamarierId: user.uid,
        krijuar: serverTimestamp(),
      });
      setRaport(raportiIRi);
      setHapi('raport');
    } catch (err) {
      console.error('Gabim:', err);
      alert('Gabim gjatë ruajtjes!');
    } finally {
      setDukeRuajtur(false);
    }
  }

  function reset() {
    setCash('');
    setKartë('');
    setRaport(null);
    setHapi('count');
  }

  if (hapi === 'count' || hapi === 'konfirmo') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-lg mx-auto animate-fade-in-up">
          <div className="mb-6">
            <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
              ← Kthehu
            </a>
            <h1 className="text-3xl font-extrabold text-slate-800 mt-2">💰 Mbyllja e Ndërrimit</h1>
            <p className="text-slate-500 font-medium mt-1">Numëro paratë fizikisht dhe fut shumat</p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl mb-6">
            <p className="text-sm text-blue-800 font-bold">
              Kamarier: {user?.emri}
            </p>
            <p className="text-sm text-blue-800 font-medium">
              Porosi të paguara sot: {porositë.length}
            </p>
          </div>

          {hapi === 'count' && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">💵 Cash i numëruar fizikisht (€)</label>
                <input type="text" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="p.sh. 45.50" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Numëro kartëmonedhat dhe monedhat, pastaj shkruaj totalin.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">💳 Kartë e numëruar (€)</label>
                <input type="text" inputMode="decimal" value={kartë} onChange={(e) => setKartë(e.target.value)} placeholder="p.sh. 120.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Totali i pagesave me kartë (nga POS-i).</p>
              </div>

              <button onClick={vazhdo} disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30 transition transform active:scale-95 disabled:opacity-50">
                Vazhdo → Konfirmo
              </button>
            </>
          )}

          {hapi === 'konfirmo' && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                <h3 className="font-bold text-slate-800 mb-3">Konfirmo shumat</h3>
                <div className="space-y-2 text-sm font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cash i numëruar:</span>
                    <span className="font-extrabold text-slate-800">{euroNCent(cash) ? formatoÇmimin(euroNCent(cash)) : '0.00 €'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kartë e numëruar:</span>
                    <span className="font-extrabold text-slate-800">{euroNCent(kartë) ? formatoÇmimin(euroNCent(kartë)) : '0.00 €'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-xl mb-6 text-sm text-yellow-800 font-bold">
                ⚠️ Kur të dorëzosh, ndërrimi do të mbyllet dhe nuk mund të ndryshohet më.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setHapi('count')} disabled={dukeRuajtur} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-xl font-bold transition">← Kthehu</button>
                <button onClick={dorëzo} disabled={dukeRuajtur} className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-500/30 transition disabled:opacity-50">
                  {dukeRuajtur ? 'Duke dorëzuar...' : '✓ Dorëzo & Gjenero Z'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (hapi === 'raport' && raport) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-slate-800">📋 Raport Z</h1>
            <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition">
              🖨️ Printo
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="text-center border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-xl font-extrabold text-slate-800">RAPORT Z — MBYLLJE NDËRRIMI</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Eagle Gastronomy · Kafe Demo</p>
            </div>

            <div className="space-y-2 text-sm mb-6 font-medium">
              <div className="flex justify-between"><span className="text-slate-600">Data:</span><span className="font-bold">{raport.data}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Kamarier:</span><span className="font-bold">{raport.kamarierEmri}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Ora e mbylljes:</span><span className="font-bold">{raport.oraMbylljes}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Totali i porosive:</span><span className="font-bold">{raport.totaliPorosive}</span></div>
            </div>

            <div className="border-t border-slate-100 pt-4 mb-4">
              <h3 className="font-bold text-slate-700 mb-2">TOTALET E PRITURA NGA SISTEMI</h3>
              <div className="space-y-2 text-sm font-medium">
                <div className="flex justify-between"><span className="text-slate-600">Cash:</span><span className="font-extrabold">{formatoÇmimin(raport.priturCash)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Kartë:</span><span className="font-extrabold">{formatoÇmimin(raport.priturKartë)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-bold">Totali:</span><span className="font-extrabold">{formatoÇmimin(raport.priturCash + raport.priturKartë)}</span></div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mb-4">
              <h3 className="font-bold text-slate-700 mb-2">NUMËRIMI FIZIK (BLIND COUNT)</h3>
              <div className="space-y-2 text-sm font-medium">
                <div className="flex justify-between"><span className="text-slate-600">Cash i numëruar:</span><span className="font-extrabold">{formatoÇmimin(raport.numëruarCash)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Kartë e numëruar:</span><span className="font-extrabold">{formatoÇmimin(raport.numëruarKartë)}</span></div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mb-4">
              <h3 className="font-bold text-slate-700 mb-2">DIFERENCAT (OVER / SHORT)</h3>
              <div className="space-y-2 text-sm font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Cash:</span>
                  <div className="text-right">
                    <span className="font-extrabold">{formatoÇmimin(Math.abs(raport.diferencaCash))}</span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${raport.statusiCash === 'Mungesë' ? 'bg-red-100 text-red-700' : raport.statusiCash === 'Tepricë' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{raport.statusiCash}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Kartë:</span>
                  <div className="text-right">
                    <span className="font-extrabold">{formatoÇmimin(Math.abs(raport.diferencaKartë))}</span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${raport.statusiKartë === 'Mungesë' ? 'bg-red-100 text-red-700' : raport.statusiKartë === 'Tepricë' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{raport.statusiKartë}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 text-center">
              <p className="text-lg font-extrabold text-emerald-600">✅ NDËRRIMI U MBYLL</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Raporti u ruajt automatikisht</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <a href="/" className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-center py-3 rounded-xl font-bold transition">Kthehu në Home</a>
            <button onClick={reset} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition">Mbyllje tjetër</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}