// app/admin/opsionet/page.tsx
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

const KATEGORITE = ['Kafe', 'Pije', 'Ushqim', 'Alkool', 'Të tjera'];

interface Opsion {
  id: string;
  emri: string;
  çmimi: number;
  kategoria: string;
  aktiv: boolean;
}

export default function AdminOpsionetPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <OpsionetContent />
    </ProtectedRoute>
  );
}

function OpsionetContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [opsionet, setOpsionet] = useState<Opsion[]>([]);
  const [loading, setLoading] = useState(true);
  const [emri, setEmri] = useState('');
  const [çmimi, setÇmimi] = useState('0');
  const [kategoria, setKategoria] = useState('Kafe');
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmri, setEditEmri] = useState('');
  const [editÇmimi, setEditÇmimi] = useState('0');
  const [editKategoria, setEditKategoria] = useState('Kafe');
  const [kërkimi, setKërkimi] = useState('');
  const [filtriKategori, setFiltriKategori] = useState('Të gjitha');

  useEffect(() => {
    if (!TENANT_ID) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'options'),
      (snap) => {
        const lista: Opsion[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            emri: String(data.emri || ''),
            çmimi: Number(data.çmimi) || 0,
            kategoria: String(data.kategoria || 'Kafe'),
            aktiv: data.aktiv !== false,
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setOpsionet(lista);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [TENANT_ID]);

  async function shto() {
    if (!emri.trim() || !TENANT_ID) {
      alert('Plotëso emrin!');
      return;
    }
    try {
      await addDoc(collection(db, 'tenants', TENANT_ID, 'options'), {
        emri: emri.trim(),
        çmimi: Math.round(parseFloat(çmimi || '0') * 100),
        kategoria,
        aktiv: true,
        krijuar: serverTimestamp(),
      });
      setEmri('');
      setÇmimi('0');
      setKategoria('Kafe');
    } catch (err) {
      console.error(err);
    }
  }

  function hapEdit(o: Opsion) {
    setEditId(o.id);
    setEditEmri(o.emri);
    setEditÇmimi((o.çmimi / 100).toFixed(2));
    setEditKategoria(o.kategoria);
  }

  async function ruajEdit() {
    if (!editId || !TENANT_ID) return;
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'options', editId), {
        emri: editEmri.trim(),
        çmimi: Math.round(parseFloat(editÇmimi || '0') * 100),
        kategoria: editKategoria,
      });
      setEditId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function fshi(id: string, emri: string) {
    if (!confirm(`A jeni i sigurt që doni të fshini opsionin "${emri}"?`) || !TENANT_ID) return;
    try {
      await deleteDoc(doc(db, 'tenants', TENANT_ID, 'options', id));
    } catch (err) {
      console.error(err);
    }
  }

  async function ndryshoAktiv(id: string, aktiv: boolean) {
    if (!TENANT_ID) return;
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'options', id), { aktiv });
    } catch (err) {
      console.error(err);
    }
  }

  const teFiltruara = opsionet.filter((o) => {
    const plotësonKategorinë = filtriKategori === 'Të gjitha' || o.kategoria === filtriKategori;
    const plotësonKërkimin = kërkimi === '' || o.emri.toLowerCase().includes(kërkimi.toLowerCase());
    return plotësonKategorinë && plotësonKërkimin;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">🔧 Opsione Artikujsh</h1>
          <p className="text-slate-500 font-medium mt-1">
            Menaxho shtesat për produktet (p.sh. "Pa sheqer", "Me qumësht soje")
          </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl mb-6 text-sm text-blue-800 font-medium">
          💡 <strong>Si funksionon:</strong> Opsionet i shoqëron me një <strong>kategori</strong> dhe do të shfaqen automatikisht te të gjitha produktet e asaj kategorie në kamarier.
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Shto opsion të re</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              placeholder="Emri (p.sh. Pa sheqer)"
              className="col-span-2 md:col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => e.key === 'Enter' && shto()}
            />
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <span className="bg-slate-100 px-3 py-3 text-sm text-slate-500 font-bold">+</span>
              <input
                type="number"
                step="0.10"
                value={çmimi}
                onChange={(e) => setÇmimi(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-2 py-3 outline-none bg-transparent text-slate-800"
              />
              <span className="bg-slate-100 px-3 py-3 text-sm text-slate-500 font-bold">€</span>
            </div>
            <select
              value={kategoria}
              onChange={(e) => setKategoria(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {KATEGORITE.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <button
              onClick={shto}
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
            placeholder="🔍 Kërko opsion..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFiltriKategori('Të gjitha')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                filtriKategori === 'Të gjitha'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Të gjitha ({opsionet.length})
            </button>
            {KATEGORITE.map((k) => {
              const numri = opsionet.filter((o) => o.kategoria === k).length;
              if (numri === 0) return null;
              return (
                <button
                  key={k}
                  onClick={() => setFiltriKategori(k)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                    filtriKategori === k
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {k} ({numri})
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8">Duke lexuar...</p>
        ) : teFiltruara.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-5xl mb-3 opacity-40">🔧</p>
            <p className="text-slate-500 font-bold">
              {opsionet.length === 0
                ? 'Nuk ka opsione. Shto të parin më sipër.'
                : 'Nuk ka opsione që përputhen.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Emri</th>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Kategoria</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Çmimi shtesë</th>
                  <th className="text-center p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Aktiv</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {teFiltruara.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{o.emri}</td>
                    <td className="p-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                        {o.kategoria}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {o.çmimi > 0 ? (
                        <span className="font-extrabold text-emerald-600">
                          +{(o.çmimi / 100).toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Falas</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => ndryshoAktiv(o.id, !o.aktiv)}
                        className={`w-12 h-6 rounded-full transition ${
                          o.aktiv ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                            o.aktiv ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => hapEdit(o)}
                        className="text-blue-600 hover:text-blue-800 text-sm mr-3 font-medium"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => fshi(o.id, o.emri)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edito Opsionin</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emri</label>
                <input value={editEmri} onChange={(e) => setEditEmri(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Çmimi shtesë (€)</label>
                <input type="number" step="0.10" value={editÇmimi} onChange={(e) => setEditÇmimi(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria</label>
                <select value={editKategoria} onChange={(e) => setEditKategoria(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800">
                  {KATEGORITE.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditId(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition">Anulo</button>
              <button onClick={ruajEdit} className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition">Ruaj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}