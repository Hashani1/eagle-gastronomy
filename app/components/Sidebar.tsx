// app/components/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const LINKS = [
  { href: '/', label: 'Kryefaqja', icon: '🏠' },
  { href: '/admin/stafi', label: 'Stafi', icon: '👥' },
  { href: '/admin/produktet', label: 'Produktet', icon: '🍔' },
  { href: '/admin/tavolinat', label: 'Tavolinat', icon: '🪑' },
  { href: '/admin/stoku', label: 'Stoku', icon: '📦' },
  { href: '/admin/recetat', label: 'Recetat', icon: '👨‍🍳' },
  { href: '/admin/planimetria', label: 'Planimetria', icon: '🗺️' },
  { href: '/admin/orari', label: 'Orari i Punës', icon: '⏰' },
  { href: '/admin/raportet', label: 'Raportet', icon: '📊' },
  { href: '/admin/opsionet', label: 'Opsionet', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user) return null;

  const eshteAdmin = user.roli === 'PRONAR' || user.roli === 'MENAXHER';

  return (
    <aside className="hidden md:flex flex-col w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white min-h-screen shadow-2xl z-20 border-r border-slate-700/50">
      {/* Logo */}
      <div className="p-6 flex items-center gap-4 border-b border-slate-700/50">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30 animate-float">
          🦅
        </div>
        <div>
          <h1 className="font-bold text-xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Eagle
          </h1>
          <p className="text-xs text-orange-400 font-medium tracking-widest uppercase">Gastronomy</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {LINKS.map((l) => {
          if (!eshteAdmin && l.href.includes('/admin')) return null;

          const aktiv = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                aktiv
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 font-semibold scale-[1.02]'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 ${aktiv ? 'scale-110' : 'group-hover:scale-110'}`}>
                {l.icon}
              </span>
              <span className="text-sm tracking-wide">{l.label}</span>
              {aktiv && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 m-4 bg-slate-800/80 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center font-bold text-white shadow-inner">
            {user.emri.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-white">{user.emri}</p>
            <p className="text-xs text-slate-400 truncate">{user.roli}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-all duration-300 border border-red-500/20"
        >
          <span>🚪</span> Dil
        </button>
      </div>
    </aside>
  );
}