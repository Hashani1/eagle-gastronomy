// hooks/usePorositeLive.ts
'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PorosiLive {
  id: string;
  tableId: string;
  kamarierEmri: string;
  statusi: string;
  totali: number;
  krijuar: any;
  metoda?: string;
  artikujt?: any[];
}

export function usePorositeLive(tenantId: string) {
  const [porosite, setPorosite] = useState<PorosiLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [gabim, setGabim] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const q = query(
      collection(db, 'tenants', tenantId, 'orders'),
      where('statusi', 'in', ['NË_PRITJE', 'NË_PËRGATITJE', 'GATI']),
      orderBy('krijuar', 'asc')
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista: PorosiLive[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<PorosiLive, 'id'>),
        }));
        setPorosite(lista);
        setLoading(false);
      },
      (err) => {
        console.error('Gabim onSnapshot:', err);
        setGabim(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return { porosite, loading, gabim };
}