// lib/pin-auth.ts
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface StafSession {
  uid: string;
  emri: string;
  roli: string;
  tenantId: string;
  tenantEmri?: string;
}

const SESSION_KEY = 'eagle-staf-session';

/**
 * Verifikon PIN-in e stafit.
 * Pranon PIN si string ose numër.
 */
export async function loginMePinVetem(
  pin: string
): Promise<{ session: StafSession | null; gabim: string | null }> {
  if (!pin || pin.length !== 4) {
    return { session: null, gabim: 'PIN-i duhet të jetë 4 shifror.' };
  }

  // Provo të dyja variantet: si string dhe si numër
  const pinSiString = pin;
  const pinSiNumër = parseInt(pin);

  let userDoc: any = null;
  let userData: any = null;

  // 1. Kërko si string
  let q = query(collection(db, 'users'), where('pin', '==', pinSiString));
  let snap = await getDocs(q);

  if (!snap.empty) {
    userDoc = snap.docs[0];
    userData = userDoc.data();
  } else {
    // 2. Kërko si numër
    q = query(collection(db, 'users'), where('pin', '==', pinSiNumër));
    snap = await getDocs(q);
    if (!snap.empty) {
      userDoc = snap.docs[0];
      userData = userDoc.data();
    }
  }

  if (!userDoc) {
    return { session: null, gabim: 'PIN i gabuar. Provo përsëri.' };
  }

  // Kontrollo konfliktin (nëse ka shumë)
  // (Për thjeshtësi, marrim të parin)
  // Nëse do të kontrollosh konflikt, bëj një kontroll shtesë me të njëjtin PIN.

  if (userData.aktiv === false) {
    return { session: null, gabim: 'Llogaria juaj është çaktivizuar.' };
  }

  // Kontrollo biznesin
  let tenantEmri = 'Biznesi';
  try {
    const tenantDoc = await getDoc(doc(db, 'tenants', userData.tenantId));
    if (tenantDoc.exists()) {
      const tenantData = tenantDoc.data();
      tenantEmri = tenantData.emri || 'Biznesi';

      if (tenantData.aktiv === false) {
        return {
          session: null,
          gabim: 'Biznesi juaj është i pezulluar. Kontakto administratorin.',
        };
      }

      if (tenantData.dataSkadimit) {
        const skadenca =
          tenantData.dataSkadimit?.toDate?.() || new Date(tenantData.dataSkadimit);
        if (skadenca < new Date()) {
          return {
            session: null,
            gabim: 'Abonimi i biznesit ka skaduar. Kontakto administratorin.',
          };
        }
      }
    } else {
      return { session: null, gabim: 'Biznesi juaj nuk ekziston.' };
    }
  } catch (err) {
    console.error('Gabim gjatë kontrollit të tenant-it:', err);
  }

  const session: StafSession = {
    uid: userDoc.id,
    emri: userData.emri || 'Punonjës',
    roli: userData.roli || 'KAMARIER',
    tenantId: userData.tenantId,
    tenantEmri: tenantEmri,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return { session, gabim: null };
}

export function getStafSession(): StafSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStafSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}