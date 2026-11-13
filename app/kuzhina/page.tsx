// app/kuzhina/page.tsx
'use client';
import { usePorositeLive } from '@/hooks/usePorositeLive';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { printoKuzhinë } from '@/lib/printer';
import {
  eshteZëriAktiv,
  vendosZërin,
  njoftoPorosiERe,
  luajTestZëri,
} from '@/lib/zeri';
import { useAuth } from '@/lib/auth-context';
import { regjistroHyrjen } from '@/lib/attendance-listener';

const TENANT_ID = 'demo-tenant';

const NGROJAT: Record<string, string> = {
  NË_PRITJE: 'Në Pritje',
  NË_PËRGATITJE: 'Në Përgatitje',
  GATI: 'Gati',
};

const NGJYRAT: Record<string, string> = {
  NË_PRITJE: 'bg-red-50 border-red-500',
  NË_PËRGATITJE: 'bg-amber-50 border-amber-500',
  GATI: 'bg-emerald-50 border-emerald-500',
};

export default function KuzhinaPage() {
  return (
    <ProtectedRoute
      roletELejuara={['PRONAR', 'MENAXHER', 'KAMARIER', 'KUZHINIER', 'SHANKIST']}
    >
      <KuzhinaContent />
    </ProtectedRoute>
  );
}

function KuzhinaContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  // 🆕 Auto Clock-In
  const clockInDone = useRef(false);
  useEffect(() => {
    if (!user || clockInDone.current) return;
    const eshteStaf = ['KAMARIER', 'SHANKIST', 'KUZHINIER'].includes(user.roli);
    if (!eshteStaf) return;
    clockInDone.current = true;
    regjistroHyrjen(user.tenantId, user.uid, user.emri);
  }, [user]);

  const { porosite, loading, gabim } = usePorositeLive(TENANT_ID);
  const [emratTavolinave, setEmratTavolinave] = useState<Record<string, string>>({});
  const [zëriAktiv, setZëriAktiv] = useState(true);
  const idETëNjohura = useRef<Set<string>>(new Set());

  useEffect(() => {
    setZëriAktiv(eshteZëriAktiv());
  }, []);

  useEffect(() => {
    async function lexoEmrat() {
      const rezultat: Record<string, string> = {};
      for (const p of porosite) {
        if (p.tableId && !rezultat[p.tableId]) {
          try {
            const d = await getDoc(doc(db, 'tenants', TENANT_ID, 'tables', p.tableId));
            if (d.exists()) rezultat[p.tableId] = d.data().emri || p.tableId.slice(0, 6);
            else rezultat[p.tableId] = p.tableId.slice(0, 6);
          } catch {
            rezultat[p.tableId] = p.tableId.slice(0, 6);
          }
        }
      }
      setEmratTavolinave(rezultat);
    }
    if (porosite.length > 0 && TENANT_ID) lexoEmrat();
  }, [porosite, TENANT_ID]);

  async function ndryshoStatus(id: string, statusi: string) {
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'orders', id), { statusi });
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  function eshteUshqim(a: any): boolean {
    if (a.kategoria === 'Ushqim') return true;
    const emri = String(a.emri || '').toLowerCase();
    const fjalëUshqim = [
      'sanduiç', 'sandwic', 'pica', 'pizza', 'pasta', 'burger', 'buk',
      'sallatë', 'kebab', 'hamburger', 'hamburg', 'soup', 'supë', 'supe',
      'omlet', 'patate', 'fruta deti', 'pulë', 'pule', 'mish', 'biftek',
      'rroll', 'wrap', 'taco', 'qebap', 'qofte', 'qoftë', 'suxhuk',
    ];
    return fjalëUshqim.some((f) => emri.includes(f));
  }

  const porositeKUZHINË = porosite.filter((o) =>
    o.artikujt?.some((a: any) => eshteUshqim(a))
  );

  useEffect(() => {
    if (porositeKUZHINË.length === 0) return;
    const tëReja = porositeKUZHINË.filter((o) => !idETëNjohura.current.has(o.id));
    if (tëReja.length > 0 && idETëNjohura.current.size > 0) {
      const tavolina = emratTavolinave[tëReja[0].tableId] || 'një tavolinë';
      njoftoPorosiERe(tavolina, 'kuzhinë');
    }
    porositeKUZHINË.forEach((o) => idETëNjohura.current.add(o.id));
  }, [porositeKUZHINË, emratTavolinave]);

  function toggleZëri() {
    const iRi = !zëriAktiv;
    setZëriAktiv(iRi);
    vendosZërin(iRi);
  }

  function printo(p: any) {
    const ushqim = p.artikujt.filter((a: any) => eshteUshqim(a));
    printoKuzhinë({
      emriBiznesit: 'Eagle Gastronomy',
      tavolina: emratTavolinave[p.tableId] || p.tableId?.slice(0, 6) || '?',
      kamarieri: p.kamarierEmri,
      data: p.krijuar?.toDate?.().toLocaleDateString('sq-AL') || '',
      ora: p.krijuar?.toDate?.().toLocaleTimeString('sq-AL') || '',
      numriPorosisë: p.id.slice(0, 6),
      artikujt: ushqim,
      totali: p.totali,
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (gabim) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="font-bold text-red-800">Gabim:</p>
          <p className="text-sm text-red-600 mt-1">{gabim}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30">
              👨‍🍳
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">Kuzhina</h1>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                Përgatit porositë · live
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleZëri}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors shadow-sm ${
                zëriAktiv
                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {zëriAktiv ? '🔊' : '🔇'}
            </button>
            <div className="bg-slate-100 px-4 py-2 rounded-xl text-center border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Porosi aktive
              </p>
              <p className="text-xl font-extrabold text-slate-800">
                {porositeKUZHINË.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {!zëriAktiv && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl mb-6 text-sm font-bold text-yellow-800 flex items-center justify-between">
            <span>🔇 Zëri është i çaktivizuar</span>
            <button
              onClick={toggleZëri}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition"
            >
              Aktivizo
            </button>
          </div>
        )}

        {porositeKUZHINË.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
            <p className="text-6xl mb-4 opacity-50">🍕</p>
            <p className="text-slate-600 text-lg font-bold">Nuk ka porosi ushqimi</p>
            <p className="text-sm text-slate-400 mt-2 font-medium">
              Porositë e reja do të shfaqen këtu automatikisht
            </p>
            <button
              onClick={luajTestZëri}
              className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-bold transition"
            >
              🔊 Testo zërin
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {porositeKUZHINË.map((o) => {
              const artikujUshqim = o.artikujt?.filter((a: any) => eshteUshqim(a)) || [];
              return (
                <div
                  key={o.id}
                  className={`rounded-3xl border shadow-lg overflow-hidden transition-all hover:shadow-xl animate-fade-in-up ${
                    NGJYRAT[o.statusi] || 'bg-white'
                  }`}
                >
                  <div className="bg-white/80 backdrop-blur-sm px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-lg text-slate-800">
                        {emratTavolinave[o.tableId] || o.tableId?.slice(0, 6)}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        👤 {o.kamarierEmri}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold ${
                        o.statusi === 'NË_PRITJE'
                          ? 'bg-red-100 text-red-700'
                          : o.statusi === 'NË_PËRGATITJE'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {NGROJAT[o.statusi] || o.statusi}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-bold text-slate-500 mb-3">
                      🕐 {o.krijuar?.toDate?.().toLocaleTimeString('sq-AL') || '...'}
                    </p>
                    <ul className="space-y-2 mb-4">
                      {artikujUshqim.map((a: any, idx: number) => (
                        <li
                          key={idx}
                          className="text-sm bg-white/60 rounded-xl px-3 py-2 border border-slate-100"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">
                              {a.emri}{' '}
                              <span className="text-slate-500 font-medium">
                                × {a.sasia}
                              </span>
                            </span>
                          </div>
                          {a.opsionet && a.opsionet.length > 0 && (
                            <p className="text-xs text-blue-600 font-bold mt-1">
                              🔧 {a.opsionet.map((o: any) => o.emri).join(', ')}
                            </p>
                          )}
                          {a.shënime && (
                            <p className="text-xs text-red-600 font-bold mt-1">
                              ⚠ {a.shënime}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="mb-3">
                      <button
                        onClick={() => printo(o)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition"
                      >
                        🖨️ Printo
                      </button>
                    </div>
                    <div>
                      {o.statusi === 'NË_PRITJE' && (
                        <button
                          onClick={() => ndryshoStatus(o.id, 'NË_PËRGATITJE')}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl text-sm font-extrabold shadow-md shadow-amber-500/30 transition transform active:scale-95"
                        >
                          ▶ Nis Përgatitjen
                        </button>
                      )}
                      {o.statusi === 'NË_PËRGATITJE' && (
                        <button
                          onClick={() => ndryshoStatus(o.id, 'GATI')}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-extrabold shadow-md shadow-emerald-500/30 transition transform active:scale-95"
                        >
                          ✓ Përfundo
                        </button>
                      )}
                      {o.statusi === 'GATI' && (
                        <div className="bg-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm font-extrabold text-center">
                          ✅ Gati
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}