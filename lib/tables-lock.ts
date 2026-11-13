// lib/tables-lock.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Kontrollon nëse një tavolinë është e zënë nga një kamarier tjetër.
 * Kthen informacion nëse është e bllokuar dhe nga kush.
 */
export async function kontrolloZënien(
  tenantId: string,
  tableId: string,
  kamarierId: string
): Promise<{
  locked: boolean;
  kamarierEmri?: string;
  kamarierId?: string;
  porosiAktive?: number;
}> {
  const q = query(
    collection(db, 'tenants', tenantId, 'orders'),
    where('tableId', '==', tableId),
    where('statusi', 'in', ['NË_PRITJE', 'NË_PËRGATITJE', 'GATI'])
  );
  const snap = await getDocs(q);
  
  if (snap.empty) {
    return { locked: false };
  }

  const firstOrder = snap.docs[0].data();
  const zënëNga = firstOrder.kamarierId;
  const kamarierEmri = firstOrder.kamarierEmri || 'Kamarier tjetër';
  
  // Nëse është i njëjti kamarier, nuk është i bllokuar
  if (zënëNga === kamarierId) {
    return { locked: false, porosiAktive: snap.size };
  }
  
  return {
    locked: true,
    kamarierEmri: kamarierEmri,
    kamarierId: zënëNga,
    porosiAktive: snap.size,
  };
}