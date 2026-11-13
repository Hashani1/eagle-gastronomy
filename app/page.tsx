// app/page.tsx
'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ClockWidget from './components/ClockWidget';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const eshteAdmin = user.roli === 'PRONAR' || user.roli === 'MENAXHER';
  const eshteShank = user.roli === 'SHANKIST' || eshteAdmin;
  const eshteKuzhinier = user.roli === 'KUZHINIER' || eshteAdmin;
  const eshteKamarier = user.roli === 'KAMARIER' || eshteAdmin;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-br from-orange-100 via-orange-50 to-transparent -z-10"></div>

        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
          <div className="font-bold text-lg flex items-center gap-2">
            <span className="text-orange-500 text-2xl">🦅</span> Eagle
          </div>
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
            {user.emri.charAt(0)}
          </div>
        </div>

        <div className="p-4 md:p-10 max-w-7xl mx-auto w-full">
          <header className="mb-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                  Mirësevini, <span className="text-orange-500">{user.emri}</span> 👋
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Çfarë do të menaxhojmë sot?</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-sm font-bold text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {user.roli}
                </span>
              </div>
            </div>
          </header>

          <div className="mb-10 animate-fade-in-up delay-100">
            <ClockWidget />
          </div>

          <div className="mb-12">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-slate-300 rounded-full"></span>
              Operacione
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {eshteKamarier && (
                <Link
                  href="/kamarier"
                  className="group relative bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px(rgba(59,130,246,0.15))] transition-all duration-500 animate-fade-in-up overflow-hidden border border-slate-100 flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-blue-100">
                    <span className="text-4xl group-hover:animate-float">🍽️</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Kamarier</h3>
                  <p className="text-sm text-slate-500 mt-1">Merr porosi nga klientët</p>
                  <div className="mt-4 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                    Hyr tani →
                  </div>
                </Link>
              )}

              {eshteShank && (
                <Link
                  href="/kds"
                  className="group relative bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px(rgba(16,185,129,0.15))] transition-all duration-500 animate-fade-in-up delay-100 overflow-hidden border border-slate-100 flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-emerald-100">
                    <span className="text-4xl group-hover:animate-float">🍹</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Shank</h3>
                  <p className="text-sm text-slate-500 mt-1">Përgatit pijet dhe kafet</p>
                  <div className="mt-4 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                    Hyr tani →
                  </div>
                </Link>
              )}

              {eshteKuzhinier && (
                <Link
                  href="/kuzhina"
                  className="group relative bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px(rgba(249,115,22,0.15))] transition-all duration-500 animate-fade-in-up delay-200 overflow-hidden border border-slate-100 flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-orange-100">
                    <span className="text-4xl group-hover:animate-float">👨‍🍳</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Kuzhina</h3>
                  <p className="text-sm text-slate-500 mt-1">Përgatit ushqimin</p>
                  <div className="mt-4 px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                    Hyr tani →
                  </div>
                </Link>
              )}

              <Link
                href="/mbyllja"
                className="group relative bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px(rgba(168,85,247,0.15))] transition-all duration-500 animate-fade-in-up delay-300 overflow-hidden border border-slate-100 flex flex-col items-center justify-center text-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-purple-100">
                  <span className="text-4xl group-hover:animate-float">💰</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Mbyllja</h3>
                <p className="text-sm text-slate-500 mt-1">Raporti Z & Barazimi</p>
                <div className="mt-4 px-4 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                  Hyr tani →
                </div>
              </Link>
            </div>
          </div>

          {/* MENAXHIM */}
          {eshteAdmin && (
            <div className="animate-fade-in-up delay-400">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-slate-300 rounded-full"></span>
                Menaxhim
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Link href="/admin/stafi" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">👥</span>
                  <span className="font-bold text-slate-700 text-sm">Stafi</span>
                </Link>
                <Link href="/admin/produktet" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">🍔</span>
                  <span className="font-bold text-slate-700 text-sm">Produktet</span>
                </Link>
                <Link href="/admin/tavolinat" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">🪑</span>
                  <span className="font-bold text-slate-700 text-sm">Tavolinat</span>
                </Link>
                <Link href="/admin/stoku" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">📦</span>
                  <span className="font-bold text-slate-700 text-sm">Stoku</span>
                </Link>
                <Link href="/admin/recetat" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">📋</span>
                  <span className="font-bold text-slate-700 text-sm">Recetat</span>
                </Link>
                <Link href="/admin/planimetria" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">🗺️</span>
                  <span className="font-bold text-slate-700 text-sm">Planimetria</span>
                </Link>
                <Link href="/admin/opsionet" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">⚙️</span>
                  <span className="font-bold text-slate-700 text-sm">Opsionet</span>
                </Link>
                <Link href="/admin/orari" className="bg-white hover:bg-slate-50 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 shadow-sm card-hover">
                  <span className="text-3xl">⏰</span>
                  <span className="font-bold text-slate-700 text-sm">Orari i Punës</span>
                </Link>
                <Link href="/admin/raportet" className="col-span-2 md:col-span-3 lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 p-6 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-indigo-500/30 card-hover">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">📊</span>
                    <div>
                      <span className="font-bold text-sm block">Raporte Shitjesh</span>
                      <span className="text-indigo-100 text-[10px]">Analizo performancën</span>
                    </div>
                  </div>
                  <span className="text-2xl">→</span>
                </Link>
              </div>
            </div>
          )}

          <footer className="mt-16 text-center text-xs text-slate-400 font-medium pb-8">
            Eagle Gastronomy &copy; 2024 - Ndërtuar nga Eagle Gastronomy për gastronominë
          </footer>
        </div>
      </main>
    </div>
  );
}