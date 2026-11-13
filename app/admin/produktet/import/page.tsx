// app/admin/produktet/import/page.tsx
'use client';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { siNumër } from '@/lib/çmimi';
import ProtectedRoute from '@/app/components/ProtectedRoute';

const TENANT_ID = 'demo-tenant';

const SHEMBULL = `Espresso, 1.50, Kafe
Makiato, 1.80, Kafe
Kapuçino, 2.00, Kafe
Coca-Cola, 2.00, Pije
Pizza Margarita, 6.00, Ushqim`;

// ─── KOMPONENTI KRYESOR (MBROJTËSI) ───
export default function ImportProduktetPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <ImportContent />
    </ProtectedRoute>
  );
}

// ─── PËRMBAJTJA E FAQES ───
function ImportContent() {
  const [teksti, setTeksti] = useState('');
  const [dukeImportuar, setDukeImportuar] = useState(false);
  const [rezultati, setRezultati] = useState<{
    sukses: number;
    gabime: string[];
  } | null>(null);

  async function importo() {
    if (!teksti.trim()) {
      alert('Ngjit tekstin me produkte!');
      return;
    }

    setDukeImportuar(true);
    setRezultati(null);

    const rreshtat = teksti
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    let sukses = 0;
    const gabime: string[] = [];

    for (let i = 0; i < rreshtat.length; i++) {
      const rreshti = rreshtat[i];
      const pjeset = rreshti.split(',').map((p) => p.trim());

      if (pjeset.length < 3) {
        gabime.push(`Rreshti ${i + 1}: format i gabuar`);
        continue;
      }

      const [emri, çmimiStr, kategoria] = pjeset;
      const çmimiCent = Math.round(parseFloat(çmimiStr) * 100);

      if (!emri || isNaN(çmimiCent) || çmimiCent <= 0 || !kategoria) {
        gabime.push(`Rreshti ${i + 1}: të dhëna të pavlefshme`);
        continue;
      }

      try {
        await addDoc(collection(db, 'tenants', TENANT_ID, 'products'), {
          emri,
          çmimi: çmimiCent,
          kategoria,
          krijuar: serverTimestamp(),
        });
        sukses++;
      } catch (err: any) {
        gabime.push(`Rreshti ${i + 1}: ${err.message}`);
      }
    }

    setRezultati({ sukses, gabime });
    setDukeImportuar(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <a href="/admin/produktet" className="text-sm text-gray-600 hover:text-emerald-600">
            ← Kthehu te produktet
          </a>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">⚡ Import Bulk</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold">Produktet:</label>
            <button
              onClick={() => setTeksti(SHEMBULL)}
              className="text-xs text-blue-600 hover:underline"
            >
              Plotëso me shembull
            </button>
          </div>
          <textarea
            value={teksti}
            onChange={(e) => setTeksti(e.target.value)}
            placeholder={`Espresso, 1.50, Kafe\nMakiato, 1.80, Kafe`}
            rows={15}
            className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
            disabled={dukeImportuar}
          />
        </div>

        <button
          onClick={importo}
          disabled={dukeImportuar || !teksti.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition"
        >
          {dukeImportuar ? '⏳ Duke importuar...' : '⚡ Importo të gjitha'}
        </button>

        {rezultati && (
          <div className="mt-6 space-y-3">
            {rezultati.sukses > 0 && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <p className="font-bold text-green-800">
                  ✅ U importuan {rezultati.sukses} produkte me sukses!
                </p>
              </div>
            )}
            {rezultati.gabime.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <p className="font-bold text-red-800 mb-2">
                  ⚠️ {rezultati.gabime.length} gabime:
                </p>
                <ul className="text-sm text-red-700">
                  {rezultati.gabime.map((g, i) => (
                    <li key={i}>• {g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}