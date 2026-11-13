// app/kamarier/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { krijoPorosi } from '@/lib/orders';
import {
  useProduktetLive,
  useOpsionetLive,
  Produkt,
  Opsion,
} from '@/hooks/useProduktetLive';
import {
  updateDoc,
  doc,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatoÇmimin, euroNCent } from '@/lib/çmimi';
import { useAuth } from '@/lib/auth-context';
import FloorPlan, { Tavolina } from '@/app/components/FloorPlan';
import { printoKupon, printoKuzhinë, printoShank } from '@/lib/printer';
import { eshteZëriAktiv, vendosZërin, njoftoPorosiGati } from '@/lib/zeri';
import { kontrolloZënien } from '@/lib/tables-lock';
import { regjistroHyrjen } from '@/lib/attendance-listener';

interface Zona {
  id: string;
  emri: string;
}

interface OpsionIZgjedhur {
  emri: string;
  çmimi: number;
}

interface ShportaItem {
  produkt: Produkt;
  sasia: number;
  opsionet: OpsionIZgjedhur[];
  key: string;
}

interface Porosi {
  id: string;
  tableId: string;
  statusi: string;
  totali: number;
  artikujt: any[];
  krijuar: any;
}

interface PjesaFatures {
  numri: number;
  shuma: number;
  paguar: boolean;
}

export default function KamarierPage() {
  const { user } = useAuth();
  const TENANT_ID = user?.tenantId || '';

  // 🆕 Auto Clock-In kur kamarieri hyn direkt në këtë faqe
  const clockInDone = useRef(false);
  useEffect(() => {
    if (!user || clockInDone.current) return;
    const eshteStaf = ['KAMARIER', 'SHANKIST', 'KUZHINIER'].includes(user.roli);
    if (!eshteStaf) return;

    clockInDone.current = true;
    regjistroHyrjen(user.tenantId, user.uid, user.emri);
  }, [user]);

  const { produktet, loading: loadingProduktet } = useProduktetLive(TENANT_ID);
  const { opsionet } = useOpsionetLive(TENANT_ID);

  const [zonat, setZonat] = useState<Zona[]>([]);
  const [tavolinat, setTavolinat] = useState<Tavolina[]>([]);
  const [zonaAktive, setZonaAktive] = useState<string>('');
  const [tavolina, setTavolina] = useState<Tavolina | null>(null);
  const [shporta, setShporta] = useState<ShportaItem[]>([]);
  const [dukeDërguar, setDukeDërguar] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [filtriKategori, setFiltriKategori] = useState('Të gjitha');
  const [loadingZonat, setLoadingZonat] = useState(true);
  const [animacionShtimi, setAnimacionShtimi] = useState<string | null>(null);
  const [porositëAktive, setPorositëAktive] = useState<Porosi[]>([]);
  const [shfaqHistorik, setShfaqHistorik] = useState(false);
  const [zëriAktiv, setZëriAktiv] = useState(true);
  const statusetEMëparshme = useRef<Record<string, string>>({});

  const [modalProdukt, setModalProdukt] = useState<Produkt | null>(null);
  const [opsionetEZgjedhura, setOpsionetEZgjedhura] = useState<OpsionIZgjedhur[]>(
    []
  );
  const [shënimeProdukt, setShënimeProdukt] = useState('');

  const [modal, setModal] = useState<{
    porosite: Porosi[];
    totali: number;
  } | null>(null);
  const [dhënë, setDhënë] = useState('');

  const [modalNdarje, setModalNdarje] = useState(false);
  const [numriPersonave, setNumriPersonave] = useState(2);
  const [pjesët, setPjesët] = useState<PjesaFatures[]>([]);
  const [pjesaAktive, setPjesaAktive] = useState<number | null>(null);
  const [dhënëPjesa, setDhënëPjesa] = useState('');

  useEffect(() => {
    setZëriAktiv(eshteZëriAktiv());
  }, []);

  // Lexo zonat
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
        setLoadingZonat(false);
      }
    );
    return () => unsub();
  }, [TENANT_ID, zonaAktive]);

  // Lexo tavolinat e zonës aktive
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
          forma: (data.forma || 'katrore') as
            | 'katrore'
            | 'rrethore'
            | 'drejtkëndëshe',
          madhësia: (data.madhësia || 'mesatare') as
            | 'e_vogël'
            | 'mesatare'
            | 'e_madhe',
        };
      });
      setTavolinat(lista);
    });
    return () => unsub();
  }, [zonaAktive, TENANT_ID]);

  // Lexo porositë aktive për të shfaqur emrin e kamarierit
  useEffect(() => {
    if (!TENANT_ID) return;
    const q = query(
      collection(db, 'tenants', TENANT_ID, 'orders'),
      where('statusi', 'in', ['NË_PRITJE', 'NË_PËRGATITJE', 'GATI'])
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => d.data());
      setTavolinat((prev) =>
        prev.map((t) => {
          const order = orders.find((o: any) => o.tableId === t.id);
          if (order && order.kamarierEmri && order.kamarierId !== user?.uid) {
            return { ...t, kamarierEmri: order.kamarierEmri };
          }
          return { ...t, kamarierEmri: undefined };
        })
      );
    });
    return () => unsub();
  }, [TENANT_ID, user]);

  // Lexo porositë aktive të tavolinës së zgjedhur
  useEffect(() => {
    if (!tavolina || !TENANT_ID) {
      setPorositëAktive([]);
      return;
    }
    const q = query(
      collection(db, 'tenants', TENANT_ID, 'orders'),
      where('tableId', '==', tavolina.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista: Porosi[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            tableId: String(data.tableId || ''),
            statusi: String(data.statusi || ''),
            totali: Number(data.totali) || 0,
            artikujt: data.artikujt || [],
            krijuar: data.krijuar,
          };
        })
        .filter((p) => p.statusi !== 'PAGUAR' && p.statusi !== 'ANULUAR');
      lista.sort((a, b) => {
        const ta = a.krijuar?.toMillis?.() || 0;
        const tb = b.krijuar?.toMillis?.() || 0;
        return ta - tb;
      });
      setPorositëAktive(lista);
    });
    return () => unsub();
  }, [tavolina, TENANT_ID]);

  // Njofto kur porosia është gati
  useEffect(() => {
    if (!tavolina || porositëAktive.length === 0) return;
    porositëAktive.forEach((p) => {
      const statusiIMëparshëm = statusetEMëparshme.current[p.id];
      if (statusiIMëparshëm && statusiIMëparshëm !== 'GATI' && p.statusi === 'GATI') {
        njoftoPorosiGati(tavolina.emri);
      }
      statusetEMëparshme.current[p.id] = p.statusi;
    });
  }, [porositëAktive, tavolina]);

  function merrOpsionetProduktit(p: Produkt): Opsion[] {
    return opsionet.filter(
      (o) => o.aktiv && (o.kategoria === p.kategoria || o.kategoria === 'Të tjera')
    );
  }

  function klikoProdukt(p: Produkt) {
    const opsionePërKëtë = merrOpsionetProduktit(p);
    if (opsionePërKëtë.length === 0) {
      shtoProduktNëShportë(p, [], '');
    } else {
      setModalProdukt(p);
      setOpsionetEZgjedhura([]);
      setShënimeProdukt('');
    }
  }

  function shtoProduktNëShportë(
    p: Produkt,
    opsionetZgjedhura: OpsionIZgjedhur[],
    shënime: string
  ) {
    const key = `${p.id}-${Date.now()}-${Math.random()}`;
    const çmimiMeOpsione = p.çmimi + opsionetZgjedhura.reduce((s, o) => s + o.çmimi, 0);
    setShporta((prev) => [
      ...prev,
      {
        produkt: { ...p, çmimi: çmimiMeOpsione },
        sasia: 1,
        opsionet: opsionetZgjedhura,
        key,
      },
    ]);
    setAnimacionShtimi(key);
    setTimeout(() => setAnimacionShtimi(null), 500);
  }

  function konfirmoOpsionet() {
    if (!modalProdukt) return;
    shtoProduktNëShportë(modalProdukt, opsionetEZgjedhura, shënimeProdukt);
    setModalProdukt(null);
    setOpsionetEZgjedhura([]);
    setShënimeProdukt('');
  }

  function toggleOpsion(o: Opsion) {
    setOpsionetEZgjedhura((prev) => {
      const ekziston = prev.find((x) => x.emri === o.emri);
      if (ekziston) return prev.filter((x) => x.emri !== o.emri);
      return [...prev, { emri: o.emri, çmimi: o.çmimi }];
    });
  }

  function hiqProdukt(key: string) {
    setShporta((prev) => prev.filter((i) => i.key !== key));
  }

  function ndryshoSasi(key: string, delta: number) {
    setShporta((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, sasia: Math.max(0, i.sasia + delta) } : i))
        .filter((i) => i.sasia > 0)
    );
  }

  const totaliCent = shporta.reduce((s, i) => s + i.produkt.çmimi * i.sasia, 0);
  const totaliPorosiveAktive = porositëAktive.reduce((s, p) => s + p.totali, 0);
  const totaliPërPagesë = totaliCent + totaliPorosiveAktive;

  async function klikoTavolinë(t: Tavolina) {
    if (!user) return;

    const kontrolli = await kontrolloZënien(TENANT_ID, t.id, user.uid);
    if (kontrolli.locked) {
      alert(
        `⛔ Kjo tavolinë është e zënë nga ${kontrolli.kamarierEmri}.\n\nNuk mund të ndërhyni në porositë e saj.`
      );
      return;
    }
    setTavolina(t);
  }

  async function dërgoPorosi() {
    if (!tavolina || shporta.length === 0 || !user) return;
    setDukeDërguar(true);
    try {
      await krijoPorosi(
        TENANT_ID,
        tavolina.id,
        user.uid,
        user.emri,
        shporta.map((i) => ({
          productId: i.produkt.id,
          emri: i.produkt.emri,
          çmimi: i.produkt.çmimi,
          sasia: i.sasia,
          kategoria: i.produkt.kategoria,
          opsionet: i.opsionet,
        }))
      );

      await updateDoc(doc(db, 'tenants', TENANT_ID, 'tables', tavolina.id), {
        statusi: 'E_ZËNË',
      });

      setShporta([]);
      setSukses(true);
      setTimeout(() => setSukses(false), 3000);
    } catch (err) {
      console.error('Gabim:', err);
      alert('Gabim gjatë dërgimit!');
    } finally {
      setDukeDërguar(false);
    }
  }

  function printoPorosiKuzhinë(p: Porosi) {
    const ushqim = p.artikujt.filter((a: any) => a.kategoria === 'Ushqim');
    if (ushqim.length === 0) {
      alert('Kjo porosi nuk ka ushqim!');
      return;
    }
    printoKuzhinë({
      emriBiznesit: 'Eagle Gastronomy',
      tavolina: tavolina?.emri || p.tableId.slice(0, 6),
      kamarieri: user?.emri || 'Kamarier',
      data: p.krijuar?.toDate?.().toLocaleDateString('sq-AL') || '',
      ora: p.krijuar?.toDate?.().toLocaleTimeString('sq-AL') || '',
      numriPorosisë: p.id.slice(0, 6),
      artikujt: ushqim,
      totali: p.totali,
    });
  }

  function printoPorosiShank(p: Porosi) {
    const pije = p.artikujt.filter(
      (a: any) => a.kategoria !== 'Ushqim' && a.kategoria !== undefined
    );
    if (pije.length === 0) {
      alert('Kjo porosi nuk ka pije!');
      return;
    }
    printoShank({
      emriBiznesit: 'Eagle Gastronomy',
      tavolina: tavolina?.emri || p.tableId.slice(0, 6),
      kamarieri: user?.emri || 'Kamarier',
      data: p.krijuar?.toDate?.().toLocaleDateString('sq-AL') || '',
      ora: p.krijuar?.toDate?.().toLocaleTimeString('sq-AL') || '',
      numriPorosisë: p.id.slice(0, 6),
      artikujt: pije,
      totali: p.totali,
    });
  }

  function hapPagesën() {
    if (porositëAktive.length === 0) {
      alert('Nuk ka porosi për pagesë!');
      return;
    }
    setModal({ porosite: porositëAktive, totali: totaliPorosiveAktive });
    setDhënë('');
  }

  async function konfirmoPagesën() {
    if (!modal || !tavolina || !user) return;
    try {
      for (const p of modal.porosite) {
        await updateDoc(doc(db, 'tenants', TENANT_ID, 'orders', p.id), {
          statusi: 'PAGUAR',
          metoda: 'CASH',
        });
      }
      await updateDoc(doc(db, 'tenants', TENANT_ID, 'tables', tavolina.id), {
        statusi: 'E_LIRË',
      });

      const tëGjithëArtikujt = modal.porosite.flatMap((p) => p.artikujt);
      printoKupon({
        emriBiznesit: 'Eagle Gastronomy',
        adresa: 'Rr. Nëna Terezë, Prishtinë',
        telefoni: '+383 44 123 456',
        tavolina: tavolina.emri,
        kamarieri: user.emri,
        data: new Date().toLocaleDateString('sq-AL'),
        ora: new Date().toLocaleTimeString('sq-AL'),
        numriPorosisë: modal.porosite[0].id.slice(0, 6).toUpperCase(),
        artikujt: tëGjithëArtikujt,
        totali: modal.totali,
        metoda: 'CASH',
        numëruarCash: euroNCent(dhënë),
        kusur: euroNCent(dhënë) - modal.totali,
      });

      setModal(null);
      setDhënë('');
      setTavolina(null);
    } catch (err) {
      console.error('Gabim:', err);
    }
  }

  function hapNdarjen() {
    if (porositëAktive.length === 0) {
      alert('Nuk ka porosi për të ndarë!');
      return;
    }
    const shumaPërPerson = Math.floor(totaliPorosiveAktive / numriPersonave);
    const mbetja = totaliPorosiveAktive - shumaPërPerson * numriPersonave;
    const pjesëtEReja: PjesaFatures[] = [];
    for (let i = 0; i < numriPersonave; i++) {
      pjesëtEReja.push({
        numri: i + 1,
        shuma: shumaPërPerson + (i === 0 ? mbetja : 0),
        paguar: false,
      });
    }
    setPjesët(pjesëtEReja);
    setPjesaAktive(null);
    setDhënëPjesa('');
    setModalNdarje(true);
  }

  function rindaj(numriIRi: number) {
    if (!numriIRi || numriIRi < 2) return;
    const shumaPërPerson = Math.floor(totaliPorosiveAktive / numriIRi);
    const mbetja = totaliPorosiveAktive - shumaPërPerson * numriIRi;
    const pjesëtEReja: PjesaFatures[] = [];
    for (let i = 0; i < numriIRi; i++) {
      pjesëtEReja.push({
        numri: i + 1,
        shuma: shumaPërPerson + (i === 0 ? mbetja : 0),
        paguar: false,
      });
    }
    setNumriPersonave(numriIRi);
    setPjesët(pjesëtEReja);
    setPjesaAktive(null);
  }

  async function paguajPjesën() {
    if (pjesaAktive === null) return;
    const pjesa = pjesët[pjesaAktive];
    if (!pjesa || pjesa.paguar) return;
    const eRe = pjesët.map((p, i) =>
      i === pjesaAktive ? { ...p, paguar: true } : p
    );
    setPjesët(eRe);
    setPjesaAktive(null);
    setDhënëPjesa('');
    const tëGjithaPaguar = eRe.every((p) => p.paguar);
    if (tëGjithaPaguar && tavolina && user) {
      try {
        for (const p of porositëAktive) {
          await updateDoc(doc(db, 'tenants', TENANT_ID, 'orders', p.id), {
            statusi: 'PAGUAR',
            metoda: 'CASH',
          });
        }
        await updateDoc(doc(db, 'tenants', TENANT_ID, 'tables', tavolina.id), {
          statusi: 'E_LIRË',
        });

        const tëGjithëArtikujt = porositëAktive.flatMap((p) => p.artikujt);
        printoKupon({
          emriBiznesit: 'Eagle Gastronomy',
          adresa: 'Rr. Nëna Terezë, Prishtinë',
          telefoni: '+383 44 123 456',
          tavolina: tavolina.emri,
          kamarieri: user.emri,
          data: new Date().toLocaleDateString('sq-AL'),
          ora: new Date().toLocaleTimeString('sq-AL'),
          numriPorosisë: porositëAktive[0].id.slice(0, 6).toUpperCase(),
          artikujt: tëGjithëArtikujt,
          totali: totaliPorosiveAktive,
          metoda: 'CASH',
        });

        setModalNdarje(false);
        setPjesët([]);
        setTavolina(null);
      } catch (err) {
        console.error('Gabim:', err);
      }
    }
  }

  function mbyllNdarjen() {
    setModalNdarje(false);
    setPjesët([]);
    setPjesaAktive(null);
    setDhënëPjesa('');
  }

  function toggleZëri() {
    const iRi = !zëriAktiv;
    setZëriAktiv(iRi);
    vendosZërin(iRi);
  }

  const kategoritë = [
    'Të gjitha',
    ...Array.from(new Set(produktet.map((p) => p.kategoria))),
  ];
  const produktetEFiltruara =
    filtriKategori === 'Të gjitha'
      ? produktet
      : produktet.filter((p) => p.kategoria === filtriKategori);

  const shumaPaguar = pjesët
    .filter((p) => p.paguar)
    .reduce((s, p) => s + p.shuma, 0);
  const shumaMbetur = totaliPorosiveAktive - shumaPaguar;

  // ═══ EKRANI 1: Planimetria ═══
  if (!tavolina) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <a
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-orange-500 transition-colors flex items-center gap-2"
            >
              <span>←</span> Kthehu në Home
            </a>
            <button
              onClick={toggleZëri}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all shadow-sm ${
                zëriAktiv
                  ? 'bg-white text-emerald-600 hover:bg-emerald-50 border border-slate-200'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              {zëriAktiv ? '🔊' : '🔇'}
            </button>
          </div>

          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              🍽️ Zgjidh Tavolinën
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Kliko mbi një tavolinë për të marrë porosi. Vetëm tavolinat e lira ose tuajat janë të aksesueshme.
            </p>
          </header>

          {loadingZonat ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : zonat.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
              <p className="text-6xl mb-4 opacity-50">🗺️</p>
              <p className="text-slate-500 font-medium">Nuk ka zona të konfiguruara.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {zonat.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => setZonaAktive(z.id)}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                      zonaAktive === z.id
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {z.emri}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <FloorPlan
                  tavolinat={tavolinat}
                  editable={false}
                  kamarierAktualId={user?.uid}
                  onTavolinaKliko={klikoTavolinë}
                />
              </div>
              <div className="flex gap-6 mt-8 text-xs font-bold text-slate-500 justify-center flex-wrap bg-white w-max mx-auto px-6 py-3 rounded-full shadow-sm border border-slate-100">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400"></span> E lirë
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400"></span> E zënë (e kamarierit tjetër)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span> Porosi në pritje
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ═══ EKRANI 2: Menuja e produktit ═══
  return (
    <div className="min-h-screen bg-slate-50 pb-56">
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          <button
            onClick={() => {
              setTavolina(null);
              setShporta([]);
              setShfaqHistorik(false);
            }}
            className="text-sm font-medium text-slate-500 hover:text-orange-500 mb-2 flex items-center gap-1 transition-colors"
          >
            ← Kthehu te planimetria
          </button>
          <div className="flex justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                {tavolina.emri}
                <span className="text-sm font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                  {tavolina.karrige} vende
                </span>
              </h2>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={toggleZëri}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${
                  zëriAktiv
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {zëriAktiv ? '🔊' : '🔇'}
              </button>
              {porositëAktive.length > 0 && (
                <>
                  <button
                    onClick={hapNdarjen}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all"
                  >
                    👥 Ndaj
                  </button>
                  <button
                    onClick={hapPagesën}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all"
                  >
                    💰 Paguaj
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
        {porositëAktive.length > 0 && (
          <div className="mb-8 animate-fade-in-up">
            <button
              onClick={() => setShfaqHistorik(!shfaqHistorik)}
              className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-800 px-5 py-4 rounded-2xl font-bold text-sm flex justify-between items-center transition-all shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                Porosi aktive ({porositëAktive.length})
                <span className="bg-white px-2 py-0.5 rounded-lg text-blue-600">
                  {formatoÇmimin(totaliPorosiveAktive)}
                </span>
              </span>
              <span className="text-blue-400 text-lg">{shfaqHistorik ? '▲' : '▼'}</span>
            </button>

            {shfaqHistorik && (
              <div className="mt-3 space-y-3">
                {porositëAktive.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 transition-all hover:shadow-md ${
                      p.statusi === 'GATI'
                        ? 'border-emerald-500'
                        : p.statusi === 'NË_PËRGATITJE'
                        ? 'border-amber-500'
                        : 'border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-400">
                        Porosia #{idx + 1} ·{' '}
                        {p.krijuar?.toDate?.().toLocaleTimeString('sq-AL') || '...'}
                      </span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold ${
                          p.statusi === 'GATI'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.statusi === 'NË_PËRGATITJE'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.statusi === 'GATI'
                          ? '✅ Gati'
                          : p.statusi === 'NË_PËRGATITJE'
                          ? '👨‍🍳 Duke u përgatitur'
                          : '⏳ Në pritje'}
                      </span>
                    </div>
                    <ul className="text-sm space-y-2 text-slate-700">
                      {p.artikujt.map((a: any, i: number) => (
                        <li key={i} className="flex justify-between items-start">
                          <div>
                            <span className="font-bold">{a.emri}</span> × {a.sasia}
                            {a.opsionet && a.opsionet.length > 0 && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">
                                + {a.opsionet.map((o: any) => o.emri).join(', ')}
                              </p>
                            )}
                          </div>
                          <span className="text-slate-500 font-medium">
                            {formatoÇmimin(a.çmimi * a.sasia)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => printoPorosiKuzhinë(p)}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          🖨️ Kuzhinë
                        </button>
                        <button
                          onClick={() => printoPorosiShank(p)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          🖨️ Shank
                        </button>
                      </div>
                      <span className="font-extrabold text-lg text-slate-800">
                        {formatoÇmimin(p.totali)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {kategoritë.map((k) => (
            <button
              key={k}
              onClick={() => setFiltriKategori(k)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                filtriKategori === k
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <div>
          {loadingProduktet ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {produktetEFiltruara.map((p) => {
                const kaOpsione = merrOpsionetProduktit(p).length > 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => klikoProdukt(p)}
                    className="group bg-white border border-slate-100 rounded-2xl p-4 text-left shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 active:scale-95 flex flex-col justify-between min-h-[120px]"
                  >
                    <div className="flex justify-between items-start w-full">
                      <p className="font-bold text-slate-800 leading-tight">{p.emri}</p>
                      {kaOpsione && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                          🔧
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-orange-500 font-extrabold text-lg mt-2">
                        {formatoÇmimin(p.çmimi)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        {p.kategoria}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {shporta.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-4 z-30 animate-fade-in-up">
          <div className="max-w-4xl mx-auto">
            <div className="max-h-48 overflow-auto mb-4 scrollbar-hide space-y-2">
              {shporta.map((i) => (
                <div
                  key={i.key}
                  className={`flex items-start justify-between py-3 px-4 rounded-xl border border-slate-100 transition-all ${
                    animacionShtimi === i.key
                      ? 'bg-orange-50 border-orange-200 scale-[1.02]'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-800">{i.produkt.emri}</p>
                    {i.opsionet.length > 0 && (
                      <p className="text-xs text-blue-600 font-medium mt-0.5">
                        🔧 {i.opsionet.map((o) => o.emri).join(', ')}
                      </p>
                    )}
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      {formatoÇmimin(i.produkt.çmimi)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                    <button
                      onClick={() => ndryshoSasi(i.key, -1)}
                      className="w-8 h-8 bg-white rounded-md shadow-sm font-bold text-slate-600 hover:text-red-500 transition-colors"
                    >
                      −
                    </button>
                    <span className="font-extrabold w-6 text-center text-slate-800">
                      {i.sasia}
                    </span>
                    <button
                      onClick={() => ndryshoSasi(i.key, +1)}
                      className="w-8 h-8 bg-white rounded-md shadow-sm font-bold text-slate-600 hover:text-emerald-500 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => hiqProdukt(i.key)}
                    className="ml-4 mt-2 text-slate-300 hover:text-red-500 transition-colors text-lg"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-end mb-3 px-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Totali
                </p>
                <p className="font-extrabold text-2xl text-slate-800">
                  {formatoÇmimin(totaliPërPagesë)}
                </p>
              </div>
              <p className="text-xs font-medium text-slate-500 text-right">
                {shporta.reduce((s, i) => s + i.sasia, 0)} artikuj në shportë
              </p>
            </div>
            <button
              onClick={dërgoPorosi}
              disabled={dukeDërguar}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30 disabled:opacity-50 transition-all transform active:scale-[0.98]"
            >
              {dukeDërguar ? 'Duke dërguar...' : '📤 Dërgo në Shank / Kuzhinë'}
            </button>
          </div>
        </div>
      )}

      {modalProdukt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Opsione
                </p>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {modalProdukt.emri}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Baza
                </p>
                <p className="text-lg font-extrabold text-emerald-600">
                  {formatoÇmimin(modalProdukt.çmimi)}
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-2">
                {merrOpsionetProduktit(modalProdukt).map((o) => {
                  const iZgjedhur = opsionetEZgjedhura.some(
                    (x) => x.emri === o.emri
                  );
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleOpsion(o)}
                      className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all ${
                        iZgjedhur
                          ? 'bg-orange-50 border-orange-500 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                            iZgjedhur
                              ? 'bg-orange-500 border-orange-500'
                              : 'border-slate-300'
                          }`}
                        >
                          {iZgjedhur && (
                            <span className="text-white text-sm font-bold">✓</span>
                          )}
                        </span>
                        <span
                          className={`font-bold ${
                            iZgjedhur ? 'text-orange-900' : 'text-slate-700'
                          }`}
                        >
                          {o.emri}
                        </span>
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          o.çmimi > 0 ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {o.çmimi > 0 ? `+${formatoÇmimin(o.çmimi)}` : 'Falas'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
                  <span>Opsione të zgjedhura:</span>
                  <span>
                    {formatoÇmimin(
                      opsionetEZgjedhura.reduce((s, o) => s + o.çmimi, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-extrabold text-xl text-slate-800 pt-3 border-t border-slate-200">
                  <span>Totali:</span>
                  <span className="text-orange-500">
                    {formatoÇmimin(
                      modalProdukt.çmimi +
                        opsionetEZgjedhura.reduce((s, o) => s + o.çmimi, 0)
                    )}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModalProdukt(null);
                    setOpsionetEZgjedhura([]);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition"
                >
                  Anulo
                </button>
                <button
                  onClick={konfirmoOpsionet}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition"
                >
                  + Shto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-sm font-medium opacity-90 mb-1">Pagesë me Cash</p>
              <p className="text-4xl font-extrabold">{formatoÇmimin(modal.totali)}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-slate-700 mb-3 text-center">
                Sa para dha klienti?
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={dhënë}
                onChange={(e) => setDhënë(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-4 text-4xl font-extrabold text-center text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[5, 10, 20, 50].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDhënë(String(v))}
                    className="bg-slate-100 hover:bg-slate-200 py-2 rounded-xl font-bold text-slate-700 transition"
                  >
                    {v}€
                  </button>
                ))}
              </div>
              {dhënë && euroNCent(dhënë) > 0 && (
                <div
                  className={`mt-6 p-4 rounded-2xl text-center border-2 transition-all ${
                    euroNCent(dhënë) - modal.totali < 0
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {euroNCent(dhënë) - modal.totali < 0 ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1">
                        Mungon
                      </p>
                      <p className="text-3xl font-extrabold">
                        {formatoÇmimin(Math.abs(euroNCent(dhënë) - modal.totali))}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1">
                        Kusuri për t'u kthyer
                      </p>
                      <p className="text-4xl font-extrabold">
                        {formatoÇmimin(euroNCent(dhënë) - modal.totali)}
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setModal(null);
                    setDhënë('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition"
                >
                  Anulo
                </button>
                <button
                  onClick={konfirmoPagesën}
                  disabled={euroNCent(dhënë) - modal.totali < 0}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 disabled:opacity-50 transition"
                >
                  ✓ Konfirmo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalNdarje && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <p className="text-sm font-medium opacity-90 mb-1">
                  Ndarja e Faturës
                </p>
                <p className="text-3xl font-extrabold">
                  {formatoÇmimin(totaliPorosiveAktive)}
                </p>
              </div>
              <span className="text-4xl opacity-50">👥</span>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
                    Paguar
                  </p>
                  <p className="text-xl font-extrabold text-emerald-700">
                    {formatoÇmimin(shumaPaguar)}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">
                    Mbetur
                  </p>
                  <p className="text-xl font-extrabold text-red-700">
                    {formatoÇmimin(shumaMbetur)}
                  </p>
                </div>
              </div>
              {pjesët.every((p) => !p.paguar) && (
                <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">
                    Ndarje për sa persona?
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        onClick={() => rindaj(n)}
                        className={`w-12 h-12 rounded-full font-extrabold text-lg transition-all ${
                          numriPersonave === n
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3 mb-6">
                {pjesët.map((p, idx) => (
                  <div
                    key={p.numri}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      p.paguar
                        ? 'bg-emerald-50 border-emerald-200'
                        : pjesaAktive === idx
                        ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-100'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">
                          Personi {p.numri}
                        </p>
                        <p className="text-xl font-extrabold text-slate-800">
                          {formatoÇmimin(p.shuma)}
                        </p>
                      </div>
                      {p.paguar ? (
                        <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          ✓ Paguar
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setPjesaAktive(idx);
                            setDhënëPjesa('');
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition"
                        >
                          Paguaj
                        </button>
                      )}
                    </div>
                    {pjesaAktive === idx && !p.paguar && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={dhënëPjesa}
                          onChange={(e) => setDhënëPjesa(e.target.value)}
                          placeholder="Sa dha? (€)"
                          autoFocus
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:border-blue-500 focus:outline-none mb-3"
                        />
                        {dhënëPjesa && euroNCent(dhënëPjesa) > 0 && (
                          <div
                            className={`p-2 rounded-lg text-center text-xs font-bold mb-3 ${
                              euroNCent(dhënëPjesa) - p.shuma < 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {euroNCent(dhënëPjesa) - p.shuma < 0 ? (
                              <span>
                                Mungon:{' '}
                                {formatoÇmimin(
                                  Math.abs(euroNCent(dhënëPjesa) - p.shuma)
                                )}
                              </span>
                            ) : (
                              <span>
                                Kusuri:{' '}
                                {formatoÇmimin(euroNCent(dhënëPjesa) - p.shuma)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setPjesaAktive(null);
                              setDhënëPjesa('');
                            }}
                            className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold"
                          >
                            Anulo
                          </button>
                          <button
                            onClick={paguajPjesën}
                            disabled={euroNCent(dhënëPjesa) - p.shuma < 0}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50 shadow-md"
                          >
                            ✓ Konfirmo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto">
              <button
                onClick={mbyllNdarjen}
                className="w-full bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 py-3 rounded-xl font-bold transition"
              >
                Mbyll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}