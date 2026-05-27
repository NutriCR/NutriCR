'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/paciente/inicio',   label: 'Inicio',   icon: '🏠' },
  { href: '/paciente/recetas',  label: 'Recetas',  icon: '🍽️' },
  { href: '/paciente/diario',   label: 'Diario',   icon: '📸', fab: true },
  { href: '/paciente/despensa', label: 'Despensa', icon: '🥫' },
  { href: '/paciente/perfil',   label: 'Perfil',   icon: '👤' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 safe-bottom z-20">
      <div className="flex items-end">
        {navItems.map((item) => {
          const active = pathname === item.href;

          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center pb-2 -mt-5"
              >
                <span
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all',
                    active
                      ? 'bg-brand-700 scale-110'
                      : 'bg-brand-600 hover:bg-brand-700'
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium mt-1',
                    active ? 'text-brand-700' : 'text-slate-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors',
                active ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
