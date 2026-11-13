// app/admin/produktet/page.tsx
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
import { centNëEuro, euroNCent, formatoÇmimin } from '@/lib/çmimi';
import ProtectedRoute from '@/app/components/ProtectedRoute';

const KATEGORITE = ['Kafe', 'Pije', 'Ushqim', 'Alkool', 'Të tjera'];

interface Produkt {
  id: string;
  emri: string;
  çmimiCent: number;
  kategoria: string;
}

export default function AdminProduktetPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <ProduktetContent />
    </ProtectedRoute>
  );
}

function ProduktetContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [produktet, setProduktet] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);

  const [emri, setEmri] = useState('');
  const [çmimiEuro, setÇmimiEuro] = useState('');
  const [kategoria, setKategoria] = useState('Kafe');

  const [editId, setEditId] = useState<string | null>(null);
  const [editEmri, setEditEmri] = useState('');
  const [editÇmimiEuro, setEditÇmimiEuro] = useState('');
  const [editKategoria, setEditKategoria] = useState('Kafe');

  const [filtriKategori, setFiltriKategori] = useState('Të gjitha');
  const [kërkimi, setKërkimi] = useState('');

  useEffect(() => {
    if (!TENANT_ID) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'products'),
      (snap) => {
        const lista: Produkt[] = snap.docs.map((d) => {
          const data = d.data();
          let çmimiCent = 0;
          if (typeof data.çmimi === 'number') {
            çmimiCent = Math.round(data.çmimi);
          } else if (typeof data.çmimi === 'string') {
            const pastruar = data.çmimi.replace(',', '.').replace(/[^\d.]/g, '');
            const n = parseFloat(pastruar);
            çmimiCent = isNaN(n) ? 0 : Math.round(n);
          }
          return {
            id: d.id,
            emri: String(data.emri || 'Pa emër'),
            çmimiCent,
            kategoria: String(data.kategoria || 'Të tjera'),
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setProduktet(lista);
        setLoading(false);
      },
      (err) => {
        console.error('Gabim onSnapshot:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [TENANT_ID]);

  async function shtoProdukt() {
    if (!emri.trim() || !çmimiEuro || !TENANT_ID) {
      alert('Plotëso emrin dhe çmimin!');
      return;
    }
    const cent = euroNCent(çmimiEuro);
    if (cent <= 0) {
      alert('Çmimi duhet të jetë më i madh se 0!');
      return;
    }
    try {
      await addDoc(collection(db, 'tenants', TENANT_ID, 'products'), {
        emri: emri.trim(),
        çmimi: cent,
        kategoria,
        krijuar: serverTimestamp(),
      });
      setEmri('');
      setÇmimiEuro('');
      setKategoria('Kafe');
    } catch (err) {
      console.error('Gabim:', err);
      alert('Gabim gjatë shtimit!');
    }
  }

  function hapEdit(p: Produkt) {
    setEditId(p.id);
    setEditEmri(p.emri);
    setEditÇmimiEuro(centNëEuro(p.çmimiCent));
    setEditKategoria(p.kategoria);
  }

  async function ruajEdit() {
    if (!editId || !TENANT_ID) return;
    const cent = euroNCent(editÇmimiEuro);
    if (cent <= 0) {
      alert('Çmimi duhet të jetë më i madh se 0!');
      return;
    }
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'products', editId), {
        emri: editEmri.trim(),
        çmimi: cent,
        kategoria: editKategoria,
      });
      setEditId(null);
    } catch (err) {
      console.error('Gabim:', err);
      alert('Gabim gjatë ruajtjes!');
    }
  }

  async function fshiProdukt(id: string, emri: string) {
    if (!confirm(`A jeni i sigurt që doni të fshini "${emri}"?`) || !TENANT_ID) return;
    try {
      await deleteDoc(doc(db, 'tenants', TENANT_ID, 'products', id));
    } catch (err) {
      console.error('Gabim:', err);
      alert('Gabim gjatë fshirjes!');
    }
  }

  const produktetEFiltruara = produktet.filter((p) => {
    const plotësonKategorinë =
      filtriKategori === 'Të gjitha' || p.kategoria === filtriKategori;
    const plotësonKërkimin =
      kërkimi === '' || p.emri.toLowerCase().includes(kërkimi.toLowerCase());
    return plotësonKategorinë && plotësonKërkimin;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-2">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">📋 Menaxho Produktet</h1>
              <p className="text-slate-500 font-medium mt-1">
                {produktet.length} produkte gjithsej
              </p>
            </div>
            <a
              href="/admin/produktet/import"
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-center transition shadow-lg shadow-purple-500/30"
            >
              ⚡ Import Bulk
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Shto produkt të re</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && shtoProdukt()}
              placeholder="Emri (p.sh. Espresso)"
              className="col-span-2 md:col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
            <input
              type="text"
              inputMode="decimal"
              value={çmimiEuro}
              onChange={(e) => setÇmimiEuro(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && shtoProdukt()}
              placeholder="Çmimi € (p.sh. 1.50)"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
            <select
              value={kategoria}
              onChange={(e) => setKategoria(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            >
              {KATEGORITE.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <button
              onClick={shtoProdukt}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition"
            >
              + Shto
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3 font-medium">
            💡 Shkruaj çmimin në euro. Shembull: <code>1.50</code> për 1 euro e 50 cent.
          </p>
        </div>

        <div className="mb-4">
          <input
            value={kërkimi}
            onChange={(e) => setKërkimi(e.target.value)}
            placeholder="🔍 Kërko produkt..."
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
              Të gjitha ({produktet.length})
            </button>
            {KATEGORITE.map((k) => {
              const numri = produktet.filter((p) => p.kategoria === k).length;
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
        ) : produktetEFiltruara.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-5xl mb-3 opacity-40">📋</p>
            <p className="text-slate-500 font-bold">
              {produktet.length === 0
                ? 'Nuk ka produkte. Shto të parin më sipër.'
                : 'Nuk ka produkte që përputhen me filtrin.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Emri</th>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Kategoria</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Çmimi</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {produktetEFiltruara.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{p.emri}</td>
                    <td className="p-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                        {p.kategoria}
                      </span>
                    </td>
                    <td className="p-4 text-right font-extrabold text-emerald-600">
                      {formatoÇmimin(p.çmimiCent)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => hapEdit(p)}
                        className="text-blue-600 hover:text-blue-800 text-sm mr-3 font-medium"
                      >
                        ✏️ Edito
                      </button>
                      <button
                        onClick={() => fshiProdukt(p.id, p.emri)}
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
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edito Produktin</h3>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Çmimi (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editÇmimiEuro}
                  onChange={(e) => setEditÇmimiEuro(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria</label>
                <select
                  value={editKategoria}
                  onChange={(e) => setEditKategoria(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {KATEGORITE.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
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