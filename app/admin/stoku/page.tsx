// app/admin/stoku/page.tsx
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

const NJESIT = ['gram', 'mililitër', 'copë', 'shishe'];

interface Ingredient {
  id: string;
  emri: string;
  njesia: string;
  stokuAktual: number;
  stokuMinimal: number;
}

export default function AdminStokuPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <StokuContent />
    </ProtectedRoute>
  );
}

function StokuContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [ing, setIng] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [emri, setEmri] = useState('');
  const [njesia, setNjesia] = useState('gram');
  const [stoku, setStoku] = useState('');
  const [minimal, setMinimal] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmri, setEditEmri] = useState('');
  const [editNjesia, setEditNjesia] = useState('gram');
  const [editStoku, setEditStoku] = useState('');
  const [editMinimal, setEditMinimal] = useState('');
  const [restokId, setRestokId] = useState<string | null>(null);
  const [restokSasi, setRestokSasi] = useState('');
  const [kërkimi, setKërkimi] = useState('');

  useEffect(() => {
    if (!TENANT_ID) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'ingredients'),
      (snap) => {
        const lista: Ingredient[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            emri: String(data.emri || ''),
            njesia: String(data.njesia || 'gram'),
            stokuAktual: Number(data.stokuAktual) || 0,
            stokuMinimal: Number(data.stokuMinimal) || 0,
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setIng(lista);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [TENANT_ID]);

  async function shtoIng() {
    if (!emri.trim() || !TENANT_ID) {
      alert('Plotëso emrin!');
      return;
    }
    try {
      await addDoc(collection(db, 'tenants', TENANT_ID, 'ingredients'), {
        emri: emri.trim(),
        njesia,
        stokuAktual: parseFloat(stoku) || 0,
        stokuMinimal: parseFloat(minimal) || 0,
        krijuar: serverTimestamp(),
      });
      setEmri('');
      setStoku('');
      setMinimal('');
      setNjesia('gram');
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  function hapEdit(i: Ingredient) {
    setEditId(i.id);
    setEditEmri(i.emri);
    setEditNjesia(i.njesia);
    setEditStoku(String(i.stokuAktual));
    setEditMinimal(String(i.stokuMinimal));
  }

  async function ruajEdit() {
    if (!editId || !TENANT_ID) return;
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'ingredients', editId), {
        emri: editEmri.trim(),
        njesia: editNjesia,
        stokuAktual: parseFloat(editStoku) || 0,
        stokuMinimal: parseFloat(editMinimal) || 0,
      });
      setEditId(null);
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  async function fshiIng(id: string, emri: string) {
    if (!confirm(`A jeni i sigurt që doni të fshini "${emri}"?`) || !TENANT_ID) return;
    try {
      await deleteDoc(doc(db, 'tenants', TENANT_ID, 'ingredients', id));
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  async function restok(id: string) {
    if (!restokSasi || !TENANT_ID) return;
    try {
      const ingAktual = ing.find((i) => i.id === id);
      if (!ingAktual) return;
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'ingredients', id), {
        stokuAktual: ingAktual.stokuAktual + parseFloat(restokSasi),
      });
      setRestokId(null);
      setRestokSasi('');
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  const teFiltruara = ing.filter(
    (i) => kërkimi === '' || i.emri.toLowerCase().includes(kërkimi.toLowerCase())
  );
  const alarme = ing.filter((i) => i.stokuMinimal > 0 && i.stokuAktual <= i.stokuMinimal);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">📦 Stoku & Përbërësit</h1>
          <p className="text-slate-500 font-medium mt-1">{ing.length} përbërës gjithsej</p>
        </div>

        {alarme.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6">
            <p className="font-bold text-red-800">
              ⚠️ {alarme.length} përbërës nën nivelin minimal:
            </p>
            <p className="text-sm text-red-600 mt-1">
              {alarme.map((a) => a.emri).join(', ')}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Shto përbërës të re</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              placeholder="Emri (p.sh. Kafe)"
              className="col-span-2 md:col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select
              value={njesia}
              onChange={(e) => setNjesia(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {NJESIT.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.1"
              value={stoku}
              onChange={(e) => setStoku(e.target.value)}
              placeholder="Stoku fillestar"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="number"
              step="0.1"
              value={minimal}
              onChange={(e) => setMinimal(e.target.value)}
              placeholder="Minimumi"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={shtoIng}
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
            placeholder="🔍 Kërko përbërës..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8">Duke lexuar...</p>
        ) : teFiltruara.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-5xl mb-3 opacity-40">📦</p>
            <p className="text-slate-500 font-bold">Nuk ka përbërës.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Emri</th>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Njësia</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Stoku</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Minimal</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {teFiltruara.map((i) => {
                  const alarm = i.stokuMinimal > 0 && i.stokuAktual <= i.stokuMinimal;
                  return (
                    <tr key={i.id} className={`border-t border-slate-100 ${alarm ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-bold text-slate-800">{i.emri}</td>
                      <td className="p-4 text-slate-500">{i.njesia}</td>
                      <td className={`p-4 text-right font-extrabold ${alarm ? 'text-red-600' : 'text-slate-700'}`}>
                        {i.stokuAktual.toFixed(1)}
                      </td>
                      <td className="p-4 text-right text-slate-500">{i.stokuMinimal.toFixed(1)}</td>
                      <td className="p-4 text-right space-x-1">
                        {restokId === i.id ? (
                          <>
                            <input
                              type="number"
                              step="0.1"
                              value={restokSasi}
                              onChange={(e) => setRestokSasi(e.target.value)}
                              placeholder="Sasia"
                              className="w-20 border rounded-lg px-2 py-1 text-xs"
                              autoFocus
                            />
                            <button onClick={() => restok(i.id)} className="bg-emerald-600 text-white px-2 py-1 rounded-lg text-xs font-bold">OK</button>
                            <button onClick={() => { setRestokId(null); setRestokSasi(''); }} className="text-slate-500 text-xs">✕</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setRestokId(i.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold">+ Restok</button>
                            <button onClick={() => hapEdit(i)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold">✏️</button>
                            <button onClick={() => fshiIng(i.id, i.emri)} className="bg-red-100 hover:bg-red-200 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold">🗑️</button>
                          </>
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

      {editId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edito Përbërësin</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emri</label>
                <input value={editEmri} onChange={(e) => setEditEmri(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Njësia</label>
                <select value={editNjesia} onChange={(e) => setEditNjesia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800">
                  {NJESIT.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stoku aktual</label>
                <input type="number" step="0.1" value={editStoku} onChange={(e) => setEditStoku(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Minimumi</label>
                <input type="number" step="0.1" value={editMinimal} onChange={(e) => setEditMinimal(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
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