// app/admin/recetat/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { formatoÇmimin } from '@/lib/çmimi';

interface Produkt {
  id: string;
  emri: string;
  çmimiCent: number;
  kategoria: string;
}

interface Ingredient {
  id: string;
  emri: string;
  njesia: string;
  stokuAktual: number;
}

interface RecetaItem {
  id: string;
  ingredientId: string;
  sasia: number;
}

export default function AdminRecetatPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <RecetatContent />
    </ProtectedRoute>
  );
}

function RecetatContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [produktet, setProduktet] = useState<Produkt[]>([]);
  const [ing, setIng] = useState<Ingredient[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [receta, setReceta] = useState<RecetaItem[]>([]);
  const [ingId, setIngId] = useState('');
  const [sasia, setSasia] = useState('');

  useEffect(() => {
    if (!TENANT_ID) return;
    const unsubP = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'products'),
      (snap) => {
        const lista: Produkt[] = snap.docs.map((d) => {
          const data = d.data();
          let cent = 0;
          if (typeof data.çmimi === 'number') cent = Math.round(data.çmimi);
          else if (typeof data.çmimi === 'string') {
            const n = parseFloat(String(data.çmimi).replace(',', '.'));
            cent = isNaN(n) ? 0 : Math.round(n);
          }
          return {
            id: d.id,
            emri: String(data.emri || ''),
            çmimiCent: cent,
            kategoria: String(data.kategoria || ''),
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setProduktet(lista);
        if (!productId && lista.length > 0) setProductId(lista[0].id);
      }
    );

    const unsubI = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'ingredients'),
      (snap) => {
        const lista: Ingredient[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            emri: String(data.emri || ''),
            njesia: String(data.njesia || 'gram'),
            stokuAktual: Number(data.stokuAktual) || 0,
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setIng(lista);
      }
    );

    return () => {
      unsubP();
      unsubI();
    };
  }, [TENANT_ID, productId]);

  useEffect(() => {
    if (!productId || !TENANT_ID) return;
    const q = query(
      collection(db, 'tenants', TENANT_ID, 'recipes'),
      where('productId', '==', productId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista: RecetaItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ingredientId: String(data.ingredientId || ''),
          sasia: Number(data.sasia) || 0,
        };
      });
      setReceta(lista);
    });
    return () => unsub();
  }, [productId, TENANT_ID]);

  function getIngInfo(id: string): { emri: string; njesia: string } {
    const i = ing.find((x) => x.id === id);
    return { emri: i?.emri || '?', njesia: i?.njesia || '' };
  }

  async function shtoNeRecete() {
    if (!productId || !ingId || !sasia || !TENANT_ID) {
      alert('Plotëso të gjitha fushat!');
      return;
    }
    const sasiaNum = parseFloat(sasia);
    if (isNaN(sasiaNum) || sasiaNum <= 0) {
      alert('Sasia duhet të jetë më e madhe se 0!');
      return;
    }
    try {
      const q = query(
        collection(db, 'tenants', TENANT_ID, 'recipes'),
        where('productId', '==', productId),
        where('ingredientId', '==', ingId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'tenants', TENANT_ID, 'recipes', snap.docs[0].id));
      }
      await addDoc(collection(db, 'tenants', TENANT_ID, 'recipes'), {
        productId,
        ingredientId: ingId,
        sasia: sasiaNum,
      });
      setIngId('');
      setSasia('');
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  async function hiqNgaReceta(id: string) {
    if (!confirm('A jeni i sigurt?') || !TENANT_ID) return;
    try {
      await deleteDoc(doc(db, 'tenants', TENANT_ID, 'recipes', id));
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  const produktiAktual = produktet.find((p) => p.id === productId);
  const ingEzgjedhur = ing.find((i) => i.id === ingId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">📋 Recetat</h1>
          <p className="text-slate-500 font-medium mt-1">
            Lidh produktet me përbërësit. Kur shet, stoku zbret automatikisht.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">Zgjidh produktin</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {produktet.length === 0 && <option value="">Nuk ka produkte</option>}
            {produktet.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emri} — {formatoÇmimin(p.çmimiCent)}
              </option>
            ))}
          </select>
        </div>

        {produktiAktual && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <h2 className="font-bold text-slate-800 mb-4">
                Përbërësit e "{produktiAktual.emri}"
              </h2>
              {receta.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 font-medium">
                  Ky produkt nuk ka recetë ende.
                </p>
              ) : (
                <ul className="space-y-2">
                  {receta.map((r) => {
                    const info = getIngInfo(r.ingredientId);
                    return (
                      <li
                        key={r.id}
                        className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-100"
                      >
                        <span>
                          <span className="font-bold text-slate-800">{info.emri}</span>
                          <span className="text-slate-500 ml-2 font-medium">
                            {r.sasia} {info.njesia}
                          </span>
                        </span>
                        <button
                          onClick={() => hiqNgaReceta(r.id)}
                          className="text-red-600 text-xs font-bold hover:text-red-800"
                        >
                          Hiq
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-bold text-slate-800 mb-4">Shto përbërës në recetë</h3>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={ingId}
                  onChange={(e) => setIngId(e.target.value)}
                  className="flex-1 min-w-[160px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Zgjidh përbërësin...</option>
                  {ing.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.emri} ({i.njesia})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.1"
                  value={sasia}
                  onChange={(e) => setSasia(e.target.value)}
                  placeholder="Sasia"
                  className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {ingEzgjedhur && (
                  <span className="self-center text-xs font-bold text-slate-500">
                    {ingEzgjedhur.njesia}
                  </span>
                )}
                <button
                  onClick={shtoNeRecete}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition"
                >
                  + Shto
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}