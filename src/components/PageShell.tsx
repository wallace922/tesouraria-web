import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavLink {
  to: string;
  label: string;
  icon: string;
}

const NAV_LINKS: NavLink[] = [
  { to: '/',            label: 'Dashboard', icon: '⊞' },
  { to: '/busca',       label: 'Busca',     icon: '🔍' },
  { to: '/cadastro',    label: 'Cadastro',  icon: '＋' },

];

interface PageShellProps {
  children: React.ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen font-mono relative" style={{ backgroundColor: '#0e1410', color: '#e5e7eb' }}>
      {/* Background com Brasão */}
      <div 
        className="fixed inset-0 bg-cover bg-fixed bg-center z-0 pointer-events-none"
        style={{ backgroundImage: 'url(/brasao.png)', opacity: 0.25 }}
      />
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-black/50 z-0 pointer-events-none" />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 h-24 border-b border-white/10 bg-black/60 backdrop-blur-md"
      >
        <div className="flex items-center gap-4">
          <div className="h-20 flex items-center justify-center shrink-0">
            <img src="/brasao.png" alt="Brasão Seção de Tesouraria" className="h-full aspect-square object-contain drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-amber-400 font-black tracking-widest text-sm uppercase">
              Gestão de Tesouraria
            </h1>
            <p className="text-stone-500 text-[10px] tracking-widest uppercase">
              Sistema de Controle Financeiro
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.to === '/'
                ? pathname === '/'
                : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all duration-150 border',
                  isActive
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                    : 'bg-transparent border-white/20 text-stone-400 hover:border-white/40 hover:text-stone-200',
                ].join(' ')}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="relative z-10">{children}</main>
    </div>
  );
}
