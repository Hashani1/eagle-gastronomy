// app/admin/fix-pins/page.tsx
'use client';
import { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FixPinsPage() {
  const [loading, setLoading] = useState(false);
  const [rezultati, setRezultati] = useState<string[]>([]);

  async function fixPins() {
    setLoading(true);
    setRezultati([]);
    const logs: string[] = [];

    try {
      const snap = await getDocs(collection(db, 'users'));
      let fixuar = 0;

      for (const d of snap.docs) {
        const data = d.data();
        const pin = data.pin;

        if (pin === undefined || pin === null) {
          logs.push(`⚠️ ${data.emri}: nuk ka PIN`);
          continue;
        }

        // Nëse është numër, konverto në string
        if (typeof pin === 'number') {
          const pinStr = String(pin).padStart(4, '0');
          await updateDoc(doc(db, 'users', d.id), { pin: pinStr });
          logs.push(`✅ ${data.emri}: "${pin}" → "${pinStr}"`);
          fixuar++;
        } else if (typeof pin === 'string') {
          // Nëse është string me më pak se 4 shifra, plotësoje me 0
          if (pin.length < 4) {
            const pinStr = pin.padStart(4, '0');
            await updateDoc(doc(db, 'users', d.id), { pin: pinStr });
            logs.push(`✅ ${data.emri}: "${pin}" → "${pinStr}"`);
            fixuar++;
          } else {
            logs.push(`✔️ ${data.emri}: "${pin}" (në rregull)`);
          }
        }
      }

      logs.push(`\n📊 Total: ${fixuar} PIN-e u rregulluan nga ${snap.size} përdorues.`);
      setRezultati(logs);
    } catch (err) {
      console.error(err);
      setRezultati([`❌ Gabim: ${err}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-2xl font-extrabold text-slate-800 mb-4">
            🔧 Rregullo PIN-et
          </h1>
          <p className="text-slate-600 mb-6">
            Ky vegël konverton të gjithë PIN-et në format string 4-shifror. Kliko butonin më poshtë për ta rregulluar.
          </p>

          <button
            onClick={fixPins}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition disabled:opacity-50"
          >
            {loading ? 'Duke u rregulluar...' : '▶ Rregullo PIN-et'}
          </button>

          {rezultati.length > 0 && (
            <div className="mt-6 bg-slate-900 text-emerald-300 p-4 rounded-xl font-mono text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
              {rezultati.join('\n')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}