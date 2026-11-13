// app/components/ClockWidget.tsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { kontrolloStatusin, AttendanceRecord } from '@/lib/attendance';

export default function ClockWidget() {
  const { user } = useAuth();
  const [statusi, setStatusi] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [kohaAktuale, setKohaAktuale] = useState(new Date());

  // Rifresko kohën çdo sekondë
  useEffect(() => {
    const interval = setInterval(() => setKohaAktuale(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Kontrollo statusin fillestar
  useEffect(() => {
    async function load() {
      if (!user) return;
      const s = await kontrolloStatusin(user.tenantId, user.uid);
      setStatusi(s);
      setLoading(false);
    }
    load();

    // Rifresko çdo 10 sekonda për të reflektuar gjendjen
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return <div className="h-32 bg-slate-100 rounded-3xl animate-pulse"></div>;
  }

  const oraHyri = statusi?.hyriNë?.toDate?.();
  const kohëPunuara = oraHyri
    ? (kohaAktuale.getTime() - oraHyri.getTime()) / (1000 * 60 * 60)
    : 0;
  const orë = Math.floor(kohëPunuara);
  const minuta = Math.floor((kohëPunuara - orë) * 60);
  const sekonda = Math.floor(((kohëPunuara - orë) * 60 - minuta) * 60);

  // Nëse përdoruesi është pronar/menaxher, nuk shfaqim ClockWidget
  const eshteStaf = user && ['KAMARIER', 'SHANKIST', 'KUZHINIER'].includes(user.roli);
  if (!eshteStaf) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>

      <div className="relative z-10">
        <p className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              statusi ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
            }`}
          ></span>
          Statusi i Punës
        </p>

        {statusi ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold">
                🟢 Jemi në punë!
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Hyrë në: {oraHyri?.toLocaleTimeString('sq-AL')}
              </p>
              <div className="flex gap-4 mt-3">
                <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Orë
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-400">
                    {String(orë).padStart(2, '0')}
                  </p>
                </div>
                <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Min
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-400">
                    {String(minuta).padStart(2, '0')}
                  </p>
                </div>
                <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Sek
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-400">
                    {String(sekonda).padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
                  Ora ndalon kur të dalësh
                </p>
                <p className="text-sm text-slate-300 font-medium">
                  Kliko "🚪 Dil" në menunë anësore për ta ndaluar orën.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-extrabold">
              {kohaAktuale.toLocaleTimeString('sq-AL')}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {kohaAktuale.toLocaleDateString('sq-AL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <p className="text-sm text-amber-400 font-bold mt-4">
              ⚠️ Ora do të fillojë automatikisht sapo të kyçesh përsëri.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}