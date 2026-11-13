// app/pin/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginMePinVetem } from '@/lib/pin-auth';

export default function PinLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [gabim, setGabim] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setGabim('PIN-i duhet të jetë 4 shifror.');
      return;
    }

    setLoading(true);
    setGabim('');

    try {
      const result = await loginMePinVetem(pin);

      if (result.gabim) {
        setGabim(result.gabim);
        setPin('');
      } else if (result.session) {
        // 🆕 Dërgo te faqja e mirëseardhjes (Clock-In atje)
        router.push('/mire-search');
      }
    } catch (err) {
      console.error(err);
      setGabim('Gabim gjatë hyrjes.');
    } finally {
      setLoading(false);
    }
  }

  function shtoShifër(shifra: string) {
    if (pin.length < 4) {
      setPin(pin + shifra);
      setGabim('');
    }
  }

  function fshij() {
    setPin(pin.slice(0, -1));
    setGabim('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>

      <div className="relative z-10 w-full max-w-sm bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-orange-500/30">
            🦅
          </div>
          <h1 className="text-2xl font-extrabold text-white">Hyr me PIN</h1>
          <p className="text-slate-400 text-sm mt-1">Vendos 4 shifrat e tua</p>
        </div>

        {gabim && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-bold border border-red-500/30">
            {gabim}
          </div>
        )}

        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all ${
                i < pin.length ? 'bg-orange-500 scale-110' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'C') {
                  setPin('');
                  setGabim('');
                } else if (btn === '⌫') fshij();
                else shtoShifër(btn);
              }}
              disabled={loading}
              className={`py-4 rounded-2xl font-extrabold text-2xl transition-all active:scale-95 ${
                btn === 'C' || btn === '⌫'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-700/50 text-white hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              {btn}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleLogin()}
          disabled={loading || pin.length !== 4}
          className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-2xl font-extrabold text-lg shadow-lg shadow-orange-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Duke u verifikuar...' : '✓ HYR'}
        </button>

        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
          <a href="/login" className="text-orange-500 text-xs font-bold hover:underline">
            Hyr si Pronar →
          </a>
        </div>
      </div>
    </div>
  );
}