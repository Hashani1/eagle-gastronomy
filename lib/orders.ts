// lib/orders.ts
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

interface OpsionIZgjedhur {
  emri: string;
  çmimi: number;
}

interface ArtikullPorosie {
  productId: string;
  emri: string;
  çmimi: number;
  sasia: number;
  kategoria?: string;
  shënime?: string;
  opsionet?: OpsionIZgjedhur[];
}

export async function krijoPorosi(
  tenantId: string, // 🆕 Tani merret si parameter
  tableId: string,
  kamarierId: string,
  kamarierEmri: string,
  artikujt: ArtikullPorosie[]
): Promise<string> {
  const totaliCent = artikujt.reduce((s, a) => {
    const çmimiMeOpsione =
      (a.çmimi || 0) +
      (a.opsionet || []).reduce((so, o) => so + (o.çmimi || 0), 0);
    return s + çmimiMeOpsione * a.sasia;
  }, 0);

  const porosiaRef = await addDoc(
    collection(db, 'tenants', tenantId, 'orders'),
    {
      tableId,
      kamarierId,
      kamarierEmri,
      statusi: 'NË_PRITJE',
      totali: totaliCent,
      krijuar: serverTimestamp(),
      përditësuar: serverTimestamp(),
      metoda: null,
      artikujt,
    }
  );

  // Zbrit stokun
  try {
    for (const artikull of artikujt) {
      const q = query(
        collection(db, 'tenants', tenantId, 'recipes'),
        where('productId', '==', artikull.productId)
      );
      const snap = await getDocs(q);

      for (const recetaDoc of snap.docs) {
        const receta = recetaDoc.data();
        const ingredientId = receta.ingredientId as string;
        const sasiaRecetë = Number(receta.sasia) || 0;
        const totaliZbritje = sasiaRecetë * artikull.sasia;

        if (totaliZbritje <= 0) continue;

        await updateDoc(
          doc(db, 'tenants', tenantId, 'ingredients', ingredientId),
          {
            stokuAktual: increment(-totaliZbritje),
          }
        );
      }
    }
  } catch (err) {
    console.error('Gabim gjatë zbritjes së stokut:', err);
  }

  try {
    await updateDoc(doc(db, 'tenants', tenantId, 'tables', tableId), {
      statusi: 'E_ZËNË',
    });
  } catch (err) {
    console.error('Gabim gjatë përditësimit të tavolinës:', err);
  }

  return porosiaRef.id;
}