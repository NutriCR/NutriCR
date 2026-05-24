'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/nutriologo/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/nutriologo/pacientes', label: 'Pacientes', icon: '👥' },
  { href: '/nutriologo/planes', label: 'Planes', icon: '📋' },
  { href: '/nutriologo/inventario', label: 'Inventario', icon: '🥦' },
  { href: '/nutriologo/recetas', label: 'Recetas IA', icon: '✨' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-xl font-bold text-brand-700">NutriCR</h1>
        <p className="text-xs text-slate-400 mt-0.5">Panel Nutriólogo</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm">
            👤
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Nutriólogo</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
