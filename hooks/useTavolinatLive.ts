// hooks/useTavolinatLive.ts
'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Tavolina {
  id: string;
  emri: string;
  karrige: number;
  statusi: string;
  pozX?: number;
  pozY?: number;
  forma?: 'katrore' | 'rrethore' | 'drejtkëndëshe';
  madhësia?: 'e_vogël' | 'mesatare' | 'e_madhe';
}

export function useTavolinatLive(tenantId: string) {
  const [tavolinat, setTavolinat] = useState<Tavolina[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', tenantId, 'tables'),
      (snap) => {
        const lista: Tavolina[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            emri: String(data.emri || ''),
            karrige: Number(data.karrige) || 0,
            statusi: String(data.statusi || 'E_LIRË'),
            pozX: Number(data.pozX) || 40,
            pozY: Number(data.pozY) || 40,
            forma: (data.forma || 'katrore') as any,
            madhësia: (data.madhësia || 'mesatare') as any,
          };
        });
        lista.sort((a, b) => a.emri.localeCompare(b.emri));
        setTavolinat(lista);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  return { tavolinat, loading };
}