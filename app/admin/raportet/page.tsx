// app/admin/raportet/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { formatoÇmimin } from '@/lib/çmimi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Porosi {
  id: string;
  totali: number;
  statusi: string;
  krijuar: any;
}

interface Shpenzim {
  shuma: number;
  data: any;
}

type Periudhë = 'sot' | 'java' | 'muaji' | 'viti';

export default function AdminRaportetPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <RaportetContent />
    </ProtectedRoute>
  );
}

function RaportetContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [porositë, setPorositë] = useState<Porosi[]>([]);
  const [shpenzimet, setShpenzimet] = useState<Shpenzim[]>([]);
  const [loading, setLoading] = useState(true);
  const [periudhë, setPeriudhë] = useState<Periudhë>('muaji');

  useEffect(() => {
    if (!TENANT_ID) return;

    // Lexo të ardhurat (Porositë e paguara)
    const qPorosi = query(
      collection(db, 'tenants', TENANT_ID, 'orders'),
      where('statusi', '==', 'PAGUAR')
    );
    const unsubPorosi = onSnapshot(qPorosi, (snap) => {
      const lista: Porosi[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          totali: Number(data.totali) || 0,
          statusi: String(data.statusi),
          krijuar: data.krijuar,
        };
      });
      setPorositë(lista);
    });

    // Lexo shpenzimet
    const unsubShpenzime = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'expenses'),
      (snap) => {
        const lista: Shpenzim[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            shuma: Number(data.shuma) || 0,
            data: data.data,
          };
        });
        setShpenzimet(lista);
        setLoading(false);
      }
    );

    return () => {
      unsubPorosi();
      unsubShpenzime();
    };
  }, [TENANT_ID]);

  function filtroSipasPeriudhës<T extends { krijuar?: any; data?: any }>(
    lista: T[],
    periudhë: Periudhë,
    isExpense = false
  ): T[] {
    const tani = new Date();
    const fillimi = new Date();

    if (periudhë === 'sot') {
      fillimi.setHours(0, 0, 0, 0);
    } else if (periudhë === 'java') {
      fillimi.setDate(tani.getDate() - 7);
      fillimi.setHours(0, 0, 0, 0);
    } else if (periudhë === 'muaji') {
      fillimi.setMonth(tani.getMonth() - 1);
      fillimi.setHours(0, 0, 0, 0);
    } else if (periudhë === 'viti') {
      fillimi.setFullYear(tani.getFullYear() - 1);
      fillimi.setHours(0, 0, 0, 0);
    }

    return lista.filter((item) => {
      const dateVal = isExpense ? item.data : item.krijuar;
      const data = dateVal?.toDate?.();
      return data ? data >= fillimi : false;
    });
  }

  const porositëFiltruara = filtroSipasPeriudhës(porositë, periudhë);
  const shpenzimetFiltruara = filtroSipasPeriudhës(shpenzimet, periudhë, true);

  const totaliHyrjeve = porositëFiltruara.reduce((s, p) => s + p.totali, 0);
  const totaliDaljeve = shpenzimetFiltruara.reduce((s, sh) => s + sh.shuma, 0);
  const fitimiNeto = totaliHyrjeve - totaliDaljeve;

  // Të dhëna për grafikun mujor (Hyrjet vs Daljet)
  const grafikuData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(1); // Fillimi i muajit
    d.setMonth(d.getMonth() - i);
    const emriMuajit = d.toLocaleDateString('sq-AL', { month: 'short' });
    const muajiFund = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const hyrjetMuajit = porositë.filter((p) => {
      const data = p.krijuar?.toDate?.();
      return data && data >= d && data < muajiFund;
    }).reduce((s, p) => s + p.totali, 0);

    const daljetMuajit = shpenzimet.filter((sh) => {
      const data = sh.data?.toDate?.();
      return data && data >= d && data < muajiFund;
    }).reduce((s, sh) => s + sh.shuma, 0);

    grafikuData.push({
      muaji: emriMuajit,
      Hyrje: hyrjetMuajit / 100,
      Dalje: daljetMuajit / 100,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
              ← Kthehu
            </a>
            <h1 className="text-3xl font-extrabold text-slate-800 mt-2">📊 Raporte Financiare</h1>
            <p className="text-slate-500 font-medium mt-1">Analiza e plotë e biznesit (Hyrje, Dalje, Fitim)</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['sot', 'java', 'muaji', 'viti'] as Periudhë[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriudhë(p)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition ${
                periudhë === p
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {p === 'sot' ? '📅 Sot' : p === 'java' ? '📆 7 Ditët e Fundit' : p === 'muaji' ? '📊 Ky Muaj' : '🗓️ Ky Vit'}
            </button>
          ))}
        </div>

        {/* Kartat Kryesore Financiare */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg shadow-emerald-500/20">
            <p className="text-sm font-bold opacity-90 uppercase tracking-widest">Hyrjet (Shitjet)</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-2">{formatoÇmimin(totaliHyrjeve)}</p>
            <p className="text-xs opacity-75 mt-1 font-medium">{porositëFiltruara.length} porosi</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-lg shadow-red-500/20">
            <p className="text-sm font-bold opacity-90 uppercase tracking-widest">Daljet (Shpenzimet)</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-2">{formatoÇmimin(totaliDaljeve)}</p>
            <p className="text-xs opacity-75 mt-1 font-medium">{shpenzimetFiltruara.length} transaksione</p>
          </div>
          <div className={`bg-gradient-to-br ${fitimiNeto >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'} text-white p-6 rounded-2xl shadow-lg`}>
            <p className="text-sm font-bold opacity-90 uppercase tracking-widest">Fitimi Neto</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-2">{formatoÇmimin(fitimiNeto)}</p>
            <p className="text-xs opacity-75 mt-1 font-medium">Hyrje - Dalje</p>
          </div>
        </div>

        {/* Grafiku Krahasues */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">📈 Hyrjet vs Daljet (6 Muajt e Fundit)</h2>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={grafikuData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="muaji" stroke="#64748b" style={{ fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" style={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '12px' }}
                  formatter={(value: number) => [`${value.toFixed(2)} €`]}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Hyrje" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Dalje" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela e Detajuar e Shpenzimeve */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">📉 Detajet e Daljeve (Shpenzimeve)</h2>
              <p className="text-sm text-slate-500 font-medium">{shpenzimetFiltruara.length} shpenzime në këtë periudhë</p>
            </div>
            <a href="/admin/shpenzimet" className="text-sm font-bold text-orange-500 hover:text-orange-600">Menaxho Shpenzimet →</a>
          </div>
          {shpenzimetFiltruara.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nuk ka shpenzime.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-bold text-slate-500 uppercase text-xs">Data</th>
                    <th className="text-left p-3 font-bold text-slate-500 uppercase text-xs">Kategoria</th>
                    <th className="text-right p-3 font-bold text-slate-500 uppercase text-xs">Shuma</th>
                  </tr>
                </thead>
                <tbody>
                  {shpenzimetFiltruara.map((sh, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-600 font-medium">
                        {sh.data?.toDate?.().toLocaleDateString('sq-AL') || '-'}
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {sh.data?.kategoria || 'E panjohur'}
                      </td>
                      <td className="p-3 text-right font-extrabold text-red-600">{formatoÇmimin(sh.shuma)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}