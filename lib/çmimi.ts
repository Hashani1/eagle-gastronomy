// lib/çmimi.ts
// Funksione ndihmëse për konvertimin e çmimeve midis cent dhe euro

/**
 * Konverton cent në format euro (string).
 * Shembull: 150 → "1.50"
 *           200 → "2.00"
 *           50  → "0.50"
 */
export function centNëEuro(cent: number): string {
  const num = Number(cent) || 0;
  return (num / 100).toFixed(2);
}

/**
 * Konverton euro në cent (numër i plotë).
 * Shembull: "1.50" → 1 50
 *           "2"    → 2 00
 *           "0.50" → 5 0
 * Pranon edhe presje: "1,50" → 1 50
 */
export function euroNCent(euro: string | number): number {
  if (typeof euro === 'number') {
    return Math.round(euro * 100);
  }
  if (typeof euro === 'string') {
    const pastruar = euro.replace(',', '.').replace(/[^\d.]/g, '');
    const num = parseFloat(pastruar);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }
  return 0;
}

/**
 * Format i plotë për shfaqje: "1.50 €"
 */
export function formatoÇmimin(cent: number): string {
  return `${centNëEuro(cent)} €`;
}