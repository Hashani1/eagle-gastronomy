// app/admin/planimetria/page.tsx
'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import FloorPlan, { Tavolina } from '@/app/components/FloorPlan';

interface Zona {
  id: string;
  emri: string;
}

export default function AdminPlanimetriaPage() {
  return (
    <ProtectedRoute roletELejuara={['PRONAR', 'MENAXHER']}>
      <PlanimetriaContent />
    </ProtectedRoute>
  );
}

function PlanimetriaContent() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  const [zonat, setZonat] = useState<Zona[]>([]);
  const [tavolinat, setTavolinat] = useState<Tavolina[]>([]);
  const [zonaAktive, setZonaAktive] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [emriZonës, setEmriZonës] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editEmri, setEditEmri] = useState('');
  const [editKarrige, setEditKarrige] = useState('4');
  const [editForma, setEditForma] = useState<'katrore' | 'rrethore' | 'drejtkëndëshe'>('katrore');
  const [editMadhësia, setEditMadhësia] = useState<'e_vogël' | 'mesatare' | 'e_madhe'>('mesatare');

  const [modalShto, setModalShto] = useState(false);
  const [shtoEmri, setShtoEmri] = useState('');
  const [shtoKarrige, setShtoKarrige] = useState('4');
  const [shtoForma, setShtoForma] = useState<'katrore' | 'rrethore' | 'drejtkëndëshe'>('katrore');
  const [shtoMadhësia, setShtoMadhësia] = useState<'e_vogël' | 'mesatare' | 'e_madhe'>('mesatare');

  useEffect(() => {
    if (!TENANT_ID) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', TENANT_ID, 'zones'),
      (snap) => {
        const lista: Zona[] = snap.docs.map((d) => ({
          id: d.id,
          emri: String(d.data().emri || ''),
        }));
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setZonat(lista);
        if (!zonaAktive && lista.length > 0) setZonaAktive(lista[0].id);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [TENANT_ID, zonaAktive]);

  useEffect(() => {
    if (!zonaAktive || !TENANT_ID) return;
    const q = query(
      collection(db, 'tenants', TENANT_ID, 'tables'),
      where('zoneId', '==', zonaAktive)
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista: Tavolina[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          emri: String(data.emri || ''),
          karrige: Number(data.karrige) || 0,
          statusi: String(data.statusi || 'E_LIRË'),
          pozX: Number(data.pozX) || 40,
          pozY: Number(data.pozY) || 40,
          forma: (data.forma || 'katrore') as 'katrore' | 'rrethore' | 'drejtkëndëshe',
          madhësia: (data.madhësia || 'mesatare') as 'e_vogël' | 'mesatare' | 'e_madhe',
        };
      });
      setTavolinat(lista);
    });
    return () => unsub();
  }, [zonaAktive, TENANT_ID]);

  async function krijoZonë() {
    if (!emriZonës.trim() || !TENANT_ID) {
      alert('Shkruaj emrin e zonës!');
      return;
    }
    try {
      const ref = await addDoc(collection(db, 'tenants', TENANT_ID, 'zones'), {
        emri: emriZonës.trim(),
        krijuar: serverTimestamp(),
      });
      setEmriZonës('');
      setZonaAktive(ref.id);
    } catch (err) {
      console.error(err);
    }
  }

  function hapShtoTavolinë() {
    setShtoEmri(`Tavolina ${tavolinat.length + 1}`);
    setShtoKarrige('4');
    setShtoForma('katrore');
    setShtoMadhësia('mesatare');
    setModalShto(true);
  }

  async function krijoTavolinë() {
    if (!zonaAktive || !TENANT_ID) {
      alert('Zgjidh një zonë!');
      return;
    }
    if (!shtoEmri.trim()) {
      alert('Shkruaj emrin e tavolinës!');
      return;
    }
    const karrigeNum = parseInt(shtoKarrige);
    if (isNaN(karrigeNum) || karrigeNum < 1 || karrigeNum > 12) {
      alert('Numri i karrigeve duhet të jetë 1-12!');
      return;
    }
    try {
      const x = 60 + Math.random() * 300;
      const y = 60 + Math.random() * 300;
      await addDoc(collection(db, 'tenants', TENANT_ID, 'tables'), {
        emri: shtoEmri.trim(),
        karrige: karrigeNum,
        statusi: 'E_LIRË',
        forma: shtoForma,
        madhësia: shtoMadhësia,
        pozX: Math.round(x),
        pozY: Math.round(y),
        zoneId: zonaAktive,
        krijuar: serverTimestamp(),
      });
      setModalShto(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function lëvizTavolinën(id: string, x: number, y: number) {
    if (!TENANT_ID) return;
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'tables', id), {
        pozX: Math.round(x),
        pozY: Math.round(y),
      });
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  function hapEdit(t: Tavolina) {
    setEditId(t.id);
    setEditEmri(t.emri);
    setEditKarrige(String(t.karrige));
    setEditForma(t.forma || 'katrore');
    setEditMadhësia(t.madhësia || 'mesatare');
  }

  async function ruajEdit() {
    if (!editId || !TENANT_ID) return;
    const karrigeNum = parseInt(editKarrige);
    if (isNaN(karrigeNum) || karrigeNum < 1 || karrigeNum > 12) {
      alert('Numri i karrigeve duhet të jetë 1-12!');
      return;
    }
    if (!editEmri.trim()) {
      alert('Shkruaj emrin!');
      return;
    }
    try {
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'tables', editId), {
        emri: editEmri.trim(),
        karrige: karrigeNum,
        forma: editForma,
        madhësia: editMadhësia,
      });
      setEditId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function fshiTavolinë(id: string, emri: string) {
    if (!confirm(`A jeni i sigurt që doni të fshini "${emri}"?`) || !TENANT_ID) return;
    try {
      await deleteDoc(doc(db, 'tenants', TENANT_ID, 'tables', id));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Duke lexuar...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        <div className="mb-6">
          <a href="/" className="text-sm font-medium text-slate-500 hover:text-orange-500">
            ← Kthehu
          </a>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-2">🗺️ Planimetria</h1>
          <p className="text-slate-500 font-medium mt-1">
            Tërhiq tavolinat, ndrysho emrin, formën dhe karriget sipas dëshirës.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">Shto zonë të re</label>
          <div className="flex gap-2">
            <input
              value={emriZonës}
              onChange={(e) => setEmriZonës(e.target.value)}
              placeholder="p.sh. Salla Kryesore, Terasa, Bar"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => e.key === 'Enter' && krijoZonë()}
            />
            <button
              onClick={krijoZonë}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition"
            >
              + Zonë
            </button>
          </div>
        </div>

        {zonat.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {zonat.map((z) => (
              <button
                key={z.id}
                onClick={() => setZonaAktive(z.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition ${
                  zonaAktive === z.id
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {z.emri}
              </button>
            ))}
          </div>
        )}

        {zonaAktive && (
          <div className="mb-4 flex gap-3 items-center">
            <button
              onClick={hapShtoTavolinë}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition"
            >
              + Shto tavolinë
            </button>
            <span className="text-sm font-bold text-slate-500">{tavolinat.length} tavolina</span>
          </div>
        )}

        {zonat.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <p className="text-5xl mb-3 opacity-40">🗺️</p>
            <p className="text-slate-500 font-bold">Nuk ka zona. Krijo zonën e parë më sipër.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <FloorPlan
              tavolinat={tavolinat}
              editable={true}
              onTavolinaLëviz={lëvizTavolinën}
              onTavolinaKliko={(t) => hapEdit(t)}
            />
          </div>
        )}

        {zonaAktive && tavolinat.length > 0 && (
          <div className="mt-4 text-xs font-bold text-slate-500 text-center bg-white rounded-full px-6 py-3 shadow-sm border border-slate-100 w-max mx-auto">
            💡 Tërhiq tavolinat për t'i zhvendosur · Kliko për të edituar
          </div>
        )}
      </div>

      {editId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edito Tavolinën</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emri</label>
                <input value={editEmri} onChange={(e) => setEditEmri(e.target.value)} placeholder="p.sh. Tavolina VIP, Bar 3" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Numri i karrigeve (1-12)</label>
                <input type="number" min="1" max="12" value={editKarrige} onChange={(e) => setEditKarrige(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Forma</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setEditForma('katrore')} className={`p-3 border-2 rounded-lg flex flex-col items-center ${editForma === 'katrore' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <div className="w-8 h-8 bg-orange-200 border-2 border-orange-500 rounded-md" />
                    <span className="text-xs mt-1 font-bold">Katrore</span>
                  </button>
                  <button type="button" onClick={() => setEditForma('rrethore')} className={`p-3 border-2 rounded-lg flex flex-col items-center ${editForma === 'rrethore' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <div className="w-8 h-8 bg-orange-200 border-2 border-orange-500 rounded-full" />
                    <span className="text-xs mt-1 font-bold">Rrethore</span>
                  </button>
                  <button type="button" onClick={() => setEditForma('drejtkëndëshe')} className={`p-3 border-2 rounded-lg flex flex-col items-center ${editForma === 'drejtkëndëshe' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <div className="w-10 h-6 bg-orange-200 border-2 border-orange-500 rounded-md" />
                    <span className="text-xs mt-1 font-bold">Drejtk.</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Madhësia</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setEditMadhësia('e_vogël')} className={`py-2 rounded-lg border-2 text-sm font-bold ${editMadhësia === 'e_vogël' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>E vogël</button>
                  <button type="button" onClick={() => setEditMadhësia('mesatare')} className={`py-2 rounded-lg border-2 text-sm font-bold ${editMadhësia === 'mesatare' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>Mesatare</button>
                  <button type="button" onClick={() => setEditMadhësia('e_madhe')} className={`py-2 rounded-lg border-2 text-sm font-bold ${editMadhësia === 'e_madhe' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>E madhe</button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { if (editId) fshiTavolinë(editId, editEmri); setEditId(null); }} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-xl font-bold">🗑️</button>
              <button onClick={() => setEditId(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition">Anulo</button>
              <button onClick={ruajEdit} className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition">Ruaj</button>
            </div>
          </div>
        </div>
      )}

      {modalShto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Shto Tavolinë të Re</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emri</label>
                <input value={shtoEmri} onChange={(e) => setShtoEmri(e.target.value)} placeholder="p.sh. Tavolina VIP, Bar 3" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Numri i karrigeve (1-12)</label>
                <input type="number" min="1" max="12" value={shtoKarrige} onChange={(e) => setShtoKarrige(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Forma</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setShtoForma('katrore')} className={`p-3 border-2 rounded-lg flex flex-col items-center ${shtoForma === 'katrore' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <div className="w-8 h-8 bg-orange-200 border-2 border-orange-500 rounded-md" />
                    <span className="text-xs mt-1 font-bold">Katrore</span>
                  </button>
                  <button type="button" onClick={() => setShtoForma('rrethore')} className={`p-3 border-2 rounded-lg flex flex-col items-center ${shtoForma === 'rrethore' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <div className="w-8 h-8 bg-orange-200 border-2 border-orange-500 rounded-full" />
                    <span className="text-xs mt-1 font-bold">Rrethore</span>
                  </button>
                  <button type="button" onClick={() => setShtoForma('drejtkëndëshe')} className={`p-3 border-2 rounded-lg flex flex-col items-center ${shtoForma === 'drejtkëndëshe' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <div className="w-10 h-6 bg-orange-200 border-2 border-orange-500 rounded-md" />
                    <span className="text-xs mt-1 font-bold">Drejtk.</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Madhësia</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setShtoMadhësia('e_vogël')} className={`py-2 rounded-lg border-2 text-sm font-bold ${shtoMadhësia === 'e_vogël' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>E vogël</button>
                  <button type="button" onClick={() => setShtoMadhësia('mesatare')} className={`py-2 rounded-lg border-2 text-sm font-bold ${shtoMadhësia === 'mesatare' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>Mesatare</button>
                  <button type="button" onClick={() => setShtoMadhësia('e_madhe')} className={`py-2 rounded-lg border-2 text-sm font-bold ${shtoMadhësia === 'e_madhe' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>E madhe</button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setModalShto(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition">Anulo</button>
              <button onClick={krijoTavolinë} className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition">+ Shto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}