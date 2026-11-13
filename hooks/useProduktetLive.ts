// hooks/useProduktetLive.ts
'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Produkt {
  id: string;
  emri: string;
  çmimi: number;
  kategoria: string;
}

export interface Opsion {
  id: string;
  emri: string;
  çmimi: number;
  kategoria: string;
  aktiv: boolean;
}

export function useProduktetLive(tenantId: string) {
  const [produktet, setProduktet] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', tenantId, 'products'),
      (snap) => {
        const lista: Produkt[] = snap.docs.map((d) => {
          const data = d.data();
          let çmimiCent = 0;
          if (typeof data.çmimi === 'number') {
            çmimiCent = Math.round(data.çmimi);
          } else if (typeof data.çmimi === 'string') {
            const pastruar = data.çmimi.replace(',', '.').replace(/[^\d.]/g, '');
            const n = parseFloat(pastruar);
            çmimiCent = isNaN(n) ? 0 : Math.round(n);
          }
          return {
            id: d.id,
            emri: String(data.emri || 'Pa emër'),
            çmimi: çmimiCent,
            kategoria: String(data.kategoria || 'Të tjera'),
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setProduktet(lista);
        setLoading(false);
      },
      (err) => {
        console.error('Gabim onSnapshot:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  return { produktet, loading };
}

export function useOpsionetLive(tenantId: string) {
  const [opsionet, setOpsionet] = useState<Opsion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', tenantId, 'options'),
      (snap) => {
        const lista: Opsion[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            emri: String(data.emri || ''),
            çmimi: Number(data.çmimi) || 0,
            kategoria: String(data.kategoria || 'Kafe'),
            aktiv: data.aktiv !== false,
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setOpsionet(lista);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  return { opsionet, loading };
}