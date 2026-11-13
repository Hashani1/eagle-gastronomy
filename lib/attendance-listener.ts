// lib/attendance-listener.ts
import { kontrolloStatusin, clockIn, clockOut } from './attendance';

// Memorie e përkohshme për të shmangur dublimet e Clock-In
// në rast se disa faqe thirrin funksionin njëkohësisht
const lastClockInAttempt: Record<string, number> = {};

/**
 * Regjistron Clock-In automatikisht kur hyn përdoruesi.
 * Shmang dublimet nëse quhet shumë herë brenda 5 sekondave.
 */
export async function regjistroHyrjen(
  tenantId: string,
  userId: string,
  emri: string
): Promise<void> {
  if (!tenantId || !userId) return;

  const now = Date.now();
  const key = `${tenantId}-${userId}`;

  // Anti-duplikat: nëse është thirrur brenda 5 sekondave, injoroje
  if (lastClockInAttempt[key] && now - lastClockInAttempt[key] < 5000) {
    return;
  }
  lastClockInAttempt[key] = now;

  try {
    const statusi = await kontrolloStatusin(tenantId, userId);
    if (!statusi) {
      await clockIn(tenantId, userId, emri);
      console.log('✅ Clock-In u regjistrua automatikisht për', emri);
    } else {
      console.log('ℹ️ Përdoruesi është tashmë i kyçur që më parë:', emri);
    }
  } catch (err) {
    console.error('Gabim gjatë Clock-In:', err);
  }
}

/**
 * Regjistron Clock-Out automatikisht kur del përdoruesi.
 */
export async function regjistroDaljen(
  tenantId: string,
  userId: string
): Promise<void> {
  if (!tenantId || !userId) return;

  try {
    const statusi = await kontrolloStatusin(tenantId, userId);
    if (statusi) {
      await clockOut(tenantId, statusi.id, statusi.hyriNë);
      console.log('✅ Clock-Out u regjistrua automatikisht për', userId);
    }
  } catch (err) {
    console.error('Gabim gjatë Clock-Out:', err);
  }
}