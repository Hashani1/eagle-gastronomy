// app/admin/tavolinat/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface Tavolina {
  id: string;
  emri: string;
  karrige: number;
  statusi: string;
}

export default function AdminTavolinatPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <TavolinatContent />
    </ProtectedRoute>
  );
}

function TavolinatContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [tavolinat, setTavolinat] = useState<Tavolina[]>([]);
  const [loading, setLoading] = useState(true);
  const [emri, setEmri] = useState('');
  const [karrige, setKarrige] = useState('4');
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmri, setEditEmri] = useState('');
  const [editKarrige, setEditKarrige] = useState('');
  const [kërkimi, setKërkimi] = useState('');

  useEffect(() => {
    if (!TENANT_ID) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'tables'),
      (snap) => {
        const lista: Tavolina[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            emri: String(data.emri || 'Pa emër'),
            karrige: Number(data.karrige) || 0,
            statusi: String(data.statusi || 'E_LIRË'),
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setTavolinat(lista);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [TENANT_ID]);

  async function shtoTavolinë() {
    if (!emri.trim() || !TENANT_ID) {
      alert('Plotëso emrin!');
      return;
    }
    const karrigeNumër = parseInt(karrige);
    if (isNaN(karrigeNumër) || karrigeNumër < 1) {
      alert('Numri i karrigeve duhet të jetë të paktën 1!');
      return;
    }
    try {
      await addDoc(collection(db, 'tenants', TENANT_ID, 'tables'), {
        emri: emri.trim(),
        karrige: karrigeNumër,
        statusi: 'E_LIRË',
        krijuar: serverTimestamp(),
      });
      setEmri('');
      setKarrige('4');
    } catch (err) {
      console.error('Gabim:', err);
      alert('Gabim!');
    }
  }

  function hapEdit(t: Tavolina) {
    setEditId(t.id);
    setEditEmri(t.emri);
    setEditKarrige(String(t.karrige));
  }

  async function ruajEdit() {
    if (!editId || !TENANT_ID) return;
    const karrigeNumër = parseInt(editKarrige);
    if (isNaN(karrigeNumër) || karrigeNumër < 1) {
      alert('Numri i karrigeve duhet të jetë të paktën 1!');
      return;
    }
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'tables', editId), {
        emri: editEmri.trim(),
        karrige: karrigeNumër,
      });
      setEditId(null);
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  async function fshiTavolinë(id: string, emri: string) {
    if (!confirm(`A jeni i sigurt që doni të fshini "${emri}"?`) || !TENANT_ID) return;
    try {
      await deleteDoc(doc(db, 'tenants', TENANT_ID, 'tables', id));
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  async function ndryshoStatus(id: string, statusiIRi: string) {
    if (!TENANT_ID) return;
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'tables', id), {
        statusi: statusiIRi,
      });
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  const teFiltruara = tavolinat.filter(
    (t) => kërkimi === '' || t.emri.toLowerCase().includes(kërkimi.toLowerCase())
  );

  const teLira = tavolinat.filter((t) => t.statusi === 'E_LIRË').length;
  const teZena = tavolinat.filter((t) => t.statusi === 'E_ZËNË').length;
  const nePritje = tavolinat.filter((t) => t.statusi === 'POROSI_NË_PRITJE').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">🪑 Menaxho Tavolinat</h1>
          <p className="text-slate-500 font-medium mt-1">{tavolinat.length} tavolina gjithsej</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-emerald-700 font-bold uppercase tracking-widest">Të lira</p>
            <p className="text-2xl font-extrabold text-emerald-700">{teLira}</p>
          </div>
          <div className="bg-white border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-red-700 font-bold uppercase tracking-widest">Të zëna</p>
            <p className="text-2xl font-extrabold text-red-700">{teZena}</p>
          </div>
          <div className="bg-white border-l-4 border-amber-500 p-4 rounded-xl shadow-sm">
            <p className="text-xs text-amber-700 font-bold uppercase tracking-widest">Në pritje</p>
            <p className="text-2xl font-extrabold text-amber-700">{nePritje}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Shto tavolinë të re</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && shtoTavolinë()}
              placeholder="Emri (p.sh. Terasa 1)"
              className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="number"
              min="1"
              value={karrige}
              onChange={(e) => setKarrige(e.target.value)}
              placeholder="Karrige"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={shtoTavolinë}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition"
            >
              + Shto
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            value={kërkimi}
            onChange={(e) => setKërkimi(e.target.value)}
            placeholder="🔍 Kërko tavolinë..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8">Duke lexuar...</p>
        ) : teFiltruara.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-5xl mb-3 opacity-40">🪑</p>
            <p className="text-slate-500 font-bold">Nuk ka tavolina.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {teFiltruara.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl shadow-sm p-4 border-l-4 ${
                  t.statusi === 'E_LIRË'
                    ? 'bg-white border-emerald-500'
                    : t.statusi === 'E_ZËNË'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-amber-50 border-amber-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-lg text-slate-800">{t.emri}</p>
                    <p className="text-sm text-slate-500">{t.karrige} karrige</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      t.statusi === 'E_LIRË'
                        ? 'bg-emerald-100 text-emerald-700'
                        : t.statusi === 'E_ZËNË'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {t.statusi === 'E_LIRË' ? 'E lirë' : t.statusi === 'E_ZËNË' ? 'E zënë' : 'Në pritje'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  <button
                    onClick={() => hapEdit(t)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold"
                  >
                    ✏️ Edito
                  </button>
                  {t.statusi === 'E_ZËNË' && (
                    <button
                      onClick={() => ndryshoStatus(t.id, 'E_LIRË')}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold"
                    >
                      🔓 Liro
                    </button>
                  )}
                  {t.statusi !== 'E_ZËNË' && (
                    <button
                      onClick={() => ndryshoStatus(t.id, 'E_ZËNË')}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-xs font-bold"
                    >
                      🔒 Zë
                    </button>
                  )}
                  <button
                    onClick={() => fshiTavolinë(t.id, t.emri)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold ml-auto"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edito Tavolinën</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emri</label>
                <input
                  value={editEmri}
                  onChange={(e) => setEditEmri(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Karrige</label>
                <input
                  type="number"
                  min="1"
                  value={editKarrige}
                  onChange={(e) => setEditKarrige(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition"
              >
                Anulo
              </button>
              <button
                onClick={ruajEdit}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition"
              >
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}