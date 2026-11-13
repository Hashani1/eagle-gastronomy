// app/admin/shpenzimet/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { formatoÇmimin, euroNCent } from '@/lib/çmimi';

const KATEGORITE = ['Furnitorë', 'Qira', 'Rryma/Uji', 'Pagat', 'Mirëmbajtje', 'Të tjera'];

interface Shpenzim {
  id: string;
  emri: string;
  shuma: number; // në cent
  kategoria: string;
  data: any;
}

export default function ShpenzimetPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <ShpenzimetContent />
    </ProtectedRoute>
  );
}

function ShpenzimetContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [shpenzimet, setShpenzimet] = useState<Shpenzim[]>([]);
  const [loading, setLoading] = useState(true);
  const [emri, setEmri] = useState('');
  const [shuma, setShuma] = useState('');
  const [kategoria, setKategoria] = useState('Furnitorë');

  useEffect(() => {
    if (!TENANT_ID) return;
    const q = query(
      collection(db, 'tenants', TENANT_ID, 'expenses'),
      orderBy('data', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista: Shpenzim[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          emri: String(data.emri || ''),
          shuma: Number(data.shuma) || 0,
          kategoria: String(data.kategoria || 'Të tjera'),
          data: data.data,
        };
      });
      setShpenzimet(lista);
      setLoading(false);
    });
    return () => unsub();
  }, [TENANT_ID]);

  async function shtoShpenzim() {
    if (!emri.trim() || !shuma || !TENANT_ID) {
      alert('Plotëso emrin dhe shumën!');
      return;
    }
    try {
      await addDoc(collection(db, 'tenants', TENANT_ID, 'expenses'), {
        emri: emri.trim(),
        shuma: euroNCent(shuma),
        kategoria,
        data: serverTimestamp(),
      });
      setEmri('');
      setShuma('');
    } catch (err) {
      console.error(err);
    }
  }

  async function fshiShpenzim(id: string) {
    if (!confirm('A jeni i sigurt?') || !TENANT_ID) return;
    try {
      await deleteDoc(doc(db, 'tenants', TENANT_ID, 'expenses', id));
    } catch (err) {
      console.error(err);
    }
  }

  const totaliShpenzimeve = shpenzimet.reduce((s, sh) => s + sh.shuma, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">📉 Regjistri i Shpenzimeve</h1>
          <p className="text-slate-500 font-medium mt-1">Regjistro të gjitha daljet e parave (investimet)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Shto shpenzim të re</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              value={emri}
              onChange={(e) => setEmri(e.target.value)}
              placeholder="Emri (p.sh. Fatura e dritave)"
              className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <input
                type="number"
                step="0.01"
                value={shuma}
                onChange={(e) => setShuma(e.target.value)}
                placeholder="Shuma (€)"
                className="flex-1 px-4 py-3 outline-none bg-transparent text-slate-800"
              />
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
              onClick={shtoShpenzim}
              className="col-span-2 md:col-span-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-red-500/30 transition"
            >
              + Shto Shpenzim
            </button>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6 flex justify-between items-center">
          <p className="font-bold text-red-800">Totali i Shpenzimeve</p>
          <p className="text-2xl font-extrabold text-red-700">{formatoÇmimin(totaliShpenzimeve)}</p>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8">Duke lexuar...</p>
        ) : shpenzimet.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-5xl mb-3 opacity-40">📉</p>
            <p className="text-slate-500 font-bold">Nuk ka shpenzime të regjistruara.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs">Emri</th>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs">Kategoria</th>
                  <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs">Data</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs">Shuma</th>
                  <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {shpenzimet.map((sh) => (
                  <tr key={sh.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{sh.emri}</td>
                    <td className="p-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold">{sh.kategoria}</span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {sh.data?.toDate?.().toLocaleDateString('sq-AL') || '-'}
                    </td>
                    <td className="p-4 text-right font-extrabold text-red-600">{formatoÇmimin(sh.shuma)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => fshiShpenzim(sh.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}