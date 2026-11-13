// lib/attendance.ts
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface AttendanceRecord {
  id: string;
  userId: string;
  emri: string;
  hyriNë: any;
  doliNë: any | null;
  oraPunuara: number | null;
}

export async function kontrolloStatusin(
  tenantId: string,
  userId: string
): Promise<AttendanceRecord | null> {
  const q = query(
    collection(db, 'tenants', tenantId, 'attendance'),
    where('userId', '==', userId),
    where('doliNë', '==', null)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    userId: data.userId,
    emri: data.emri,
    hyriNë: data.hyriNë,
    doliNë: data.doliNë,
    oraPunuara: data.oraPunuara,
  };
}

export async function clockIn(
  tenantId: string,
  userId: string,
  emri: string
): Promise<void> {
  const ekziston = await kontrolloStatusin(tenantId, userId);
  if (ekziston) {
    throw new Error('Ju jeni tashmë të kyçur në punë!');
  }

  await addDoc(collection(db, 'tenants', tenantId, 'attendance'), {
    userId,
    emri,
    hyriNë: serverTimestamp(),
    doliNë: null,
    oraPunuara: null,
  });
}

export async function clockOut(
  tenantId: string,
  recordId: string,
  hyriNë: any
): Promise<void> {
  const tani = new Date();
  const hyri = hyriNë?.toDate?.() || new Date();
  const diferencaMs = tani.getTime() - hyri.getTime();
  const oraPunuara = Math.round((diferencaMs / (1000 * 60 * 60)) * 100) / 100;

  await updateDoc(doc(db, 'tenants', tenantId, 'attendance', recordId), {
    doliNë: serverTimestamp(),
    oraPunuara,
  });
}

// 🆕 Funksion për të ruajtur pagën për orë (Bruto) të stafit
export async function ruajPagënPërOrë(
  userId: string,
  pagaPërOrë: number
): Promise<void> {
  // Përditëson profilin global të përdoruesit
  await updateDoc(doc(db, 'users', userId), {
    pagaPërOrë: pagaPërOrë,
  });
}