// app/admin/orari/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface Attendance {
  id: string;
  userId: string;
  emri: string;
  hyriNë: any;
  doliNë: any;
  oraPunuara: number | null;
}

export default function OrariPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <OrariContent />
    </ProtectedRoute>
  );
}

function OrariContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtri, setFiltri] = useState<'sot' | 'java' | 'te_gjitha'>('sot');

  useEffect(() => {
    if (!TENANT_ID) return;
    const q = query(
      collection(db, 'tenants', TENANT_ID, 'attendance'),
      orderBy('hyriNë', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const lista: Attendance[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          emri: data.emri,
          hyriNë: data.hyriNë,
          doliNë: data.doliNë,
          oraPunuara: data.oraPunuara,
        };
      });
      setRecords(lista);
      setLoading(false);
    });

    return () => unsub();
  }, [TENANT_ID]);

  const tani = new Date();
  const fillimiISot = new Date(tani.getFullYear(), tani.getMonth(), tani.getDate());
  const fillimiIJavës = new Date(tani);
  fillimiIJavës.setDate(tani.getDate() - 7);

  const recordsFiltruar = records.filter((r) => {
    const data = r.hyriNë?.toDate?.();
    if (!data) return false;
    if (filtri === 'sot') return data >= fillimiISot;
    if (filtri === 'java') return data >= fillimiIJavës;
    return true;
  });

  const totaliOreve = recordsFiltruar
    .filter((r) => r.oraPunuara)
    .reduce((sum, r) => sum + (r.oraPunuara || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">⏰ Orari i Punës</h1>
          <p className="text-slate-500 font-medium mt-1">Regjistrimi i hyrjeve dhe daljeve të stafit</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total orësh</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{totaliOreve.toFixed(1)}h</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Regjistrime</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">{recordsFiltruar.length}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['sot', 'java', 'te_gjitha'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltri(f)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                filtri === f
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {f === 'sot' ? '📅 Sot' : f === 'java' ? '📆 7 Ditët e Fundit' : '📋 Të Gjitha'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : recordsFiltruar.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-6xl mb-3 opacity-30">📅</p>
              <p className="text-slate-500 font-bold">Nuk ka regjistrime për këtë periudhë.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Punonjësi</th>
                    <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Data</th>
                    <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Hyrja</th>
                    <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Dalja</th>
                    <th className="text-right p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Orët</th>
                  </tr>
                </thead>
                <tbody>
                  {recordsFiltruar.map((r) => {
                    const dataHyri = r.hyriNë?.toDate?.();
                    const dataDoli = r.doliNë?.toDate?.();
                    const eshteHapur = !r.doliNë;
                    return (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-slate-800">{r.emri}</span>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          {dataHyri?.toLocaleDateString('sq-AL') || '-'}
                        </td>
                        <td className="p-4 font-medium text-slate-700">
                          {dataHyri?.toLocaleTimeString('sq-AL') || '-'}
                        </td>
                        <td className="p-4">
                          {eshteHapur ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Në punë
                            </span>
                          ) : (
                            <span className="font-medium text-slate-700">
                              {dataDoli?.toLocaleTimeString('sq-AL') || '-'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {r.oraPunuara !== null ? (
                            <span className="font-extrabold text-emerald-600">{r.oraPunuara.toFixed(2)}h</span>
                          ) : (
                            <span className="text-slate-400">-</span>
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
      </div>
    </div>
  );
}