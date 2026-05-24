'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
  expanded:  boolean;
  animated:  boolean;   // false hasta que NutriShell lee localStorage (evita flash)
  onToggle:  () => void;
}

const navItems = [
  { href: '/nutriologo/dashboard',  label: 'Dashboard',    icon: '📊' },
  { href: '/nutriologo/pacientes',  label: 'Pacientes',    icon: '👥' },
  { href: '/nutriologo/planes',     label: 'Planes',       icon: '📋' },
  { href: '/nutriologo/inventario', label: 'Inventario',   icon: '🥦' },
  { href: '/nutriologo/recetas',    label: 'Recetas IA',   icon: '✨' },
];

export default function Sidebar({ expanded, animated, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Posición y base
        'fixed left-0 top-0 h-screen z-30',
        'bg-white border-r border-slate-100 flex flex-col',
        // Ancho
        expanded ? 'w-64' : 'w-16',
        // Mobile: slide in/out; desktop: siempre visible (translate-x-0)
        expanded ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
        // Transición solo tras leer localStorage
        animated && 'transition-all duration-300 ease-in-out',
      )}
    >
      {/* ── Cabecera ── */}
      <div className={cn(
        'flex items-center border-b border-slate-100 flex-shrink-0',
        expanded ? 'px-4 py-5 gap-3' : 'px-0 py-5 justify-center',
      )}>
        {expanded ? (
          <>
            {/* Logo + texto */}
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brand-700 leading-tight">NutriCR</p>
              <p className="text-xs text-slate-400 leading-tight">Panel Nutriólogo</p>
            </div>
            {/* Botón colapsar (←) */}
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
              aria-label="Colapsar sidebar"
            >
              <ChevronLeft />
            </button>
          </>
        ) : (
          /* Botón expandir (→) cuando está colapsado */
          <button
            onClick={onToggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition-colors"
            aria-label="Expandir sidebar"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {/* ── Navegación ── */}
      <nav className={cn('flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden', expanded ? 'px-3' : 'px-2')}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}  /* tooltip cuando colapsado */
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors group',
                expanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              )}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>

              {/* Texto con fade — clip para que no "salte" al colapsar */}
              <span
                className={cn(
                  'whitespace-nowrap overflow-hidden transition-all duration-300',
                  expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Avatar del nutriólogo ── */}
      <div className={cn(
        'border-t border-slate-100 flex-shrink-0 flex items-center',
        expanded ? 'p-4 gap-3' : 'p-3 justify-center',
      )}>
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm flex-shrink-0">
          👤
        </div>
        {expanded && (
          <div className="min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-slate-700 truncate">Nutriólogo</p>
            <p className="text-xs text-slate-400 truncate">Admin</p>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Iconos SVG inline (sin dependencias externas) ─────────────────────────────

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
