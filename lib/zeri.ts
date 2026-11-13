// lib/zeri.ts

let zëriAktiv = true;

/**
 * Kontrollo nëse zëri është i aktivizuar.
 */
export function eshteZëriAktiv(): boolean {
  if (typeof window === 'undefined') return true;
  const ruajtur = localStorage.getItem('zëri-aktiv');
  return ruajtur === null ? true : ruajtur === 'true';
}

export function vendosZërin(aktiv: boolean): void {
  zëriAktiv = aktiv;
  if (typeof window !== 'undefined') {
    localStorage.setItem('zëri-aktiv', String(aktiv));
  }
}

/**
 * Luan një zë shqip (ose beep si fallback).
 */
export function luajZë(teksti: string): void {
  if (typeof window === 'undefined') return;
  if (!eshteZëriAktiv()) return;

  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(teksti);
      utterance.lang = 'sq-AL';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const zërat = window.speechSynthesis.getVoices();
      const zëShqip = zërat.find((z) => z.lang.startsWith('sq'));
      const zëAnglisht = zërat.find((z) => z.lang.startsWith('en'));
      if (zëShqip) utterance.voice = zëShqip;
      else if (zëAnglisht) utterance.voice = zëAnglisht;

      window.speechSynthesis.speak(utterance);
      return;
    }
  } catch (err) {
    console.warn('SpeechSynthesis nuk u aktivizua:', err);
  }

  luajBeep();
}

function luajBeep(): void {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (err) {
    console.warn('Beep nuk u aktivizua:', err);
  }
}

export function njoftoPorosiERe(tavolina: string, lloji: 'kuzhinë' | 'shank'): void {
  const teksti = lloji === 'kuzhinë'
    ? `Porosi e re ushqimi për ${tavolina}`
    : `Porosi e re pije për ${tavolina}`;
  luajZë(teksti);
}

export function njoftoPorosiGati(tavolina: string): void {
  luajZë(`Porosia për ${tavolina} është gati`);
}

export function luajTestZëri(): void {
  luajZë('Test. Zëri i sistemit punon.');
}