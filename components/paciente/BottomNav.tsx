'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/paciente/inicio',   label: 'Inicio',   icon: '🏠' },
  { href: '/paciente/recetas',  label: 'Recetas',  icon: '🍽️' },
  { fab: true,                  label: 'Registro',  icon: '➕' },
  { href: '/paciente/despensa', label: 'Despensa', icon: '🥫' },
  { href: '/paciente/perfil',   label: 'Perfil',   icon: '👤' },
];

const registroOpciones = [
  {
    href:        '/paciente/escanear',
    icon:        '🧾',
    titulo:      'Factura del super',
    descripcion: 'Escanea un tiquete y analiza tus compras',
  },
  {
    href:        '/paciente/diario',
    icon:        '📸',
    titulo:      'Registro de comida',
    descripcion: 'Fotografía lo que estás comiendo',
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [showSheet, setShowSheet] = useState(false);

  // El FAB está "activo" si la ruta actual corresponde a alguna de sus sub-pantallas
  const fabActive = pathname === '/paciente/escanear' || pathname === '/paciente/diario';

  function handleOpcion(href: string) {
    setShowSheet(false);
    router.push(href);
  }

  return (
    <>
      {/* ── Barra de navegación ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 safe-bottom z-20">
        <div className="flex items-end">
          {navItems.map((item, idx) => {
            if (item.fab) {
              return (
                <button
                  key={idx}
                  onClick={() => setShowSheet(true)}
                  className="flex-1 flex flex-col items-center pb-2 -mt-5"
                >
                  <span
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all',
                      fabActive || showSheet
                        ? 'bg-brand-700 scale-110'
                        : 'bg-brand-600 hover:bg-brand-700'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium mt-1',
                      fabActive || showSheet ? 'text-brand-700' : 'text-slate-400'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            if (!item.href) return null;
            const active = pathname === item.href;

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

      {/* ── Bottom sheet de registro ── */}
      {showSheet && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setShowSheet(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white rounded-t-3xl shadow-2xl pb-safe">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Título */}
            <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 px-5">
              ¿Qué querés registrar?
            </p>

            {/* Opciones */}
            <div className="flex flex-col gap-3 px-5 pb-8">
              {registroOpciones.map((op) => (
                <button
                  key={op.href}
                  onClick={() => handleOpcion(op.href)}
                  className="flex items-center gap-4 bg-slate-50 hover:bg-brand-50 active:scale-[0.98] rounded-2xl p-4 border border-slate-100 hover:border-brand-200 transition-all text-left"
                >
                  <span className="text-4xl flex-shrink-0 w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    {op.icon}
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 text-base leading-tight">{op.titulo}</p>
                    <p className="text-sm text-slate-400 mt-0.5 leading-snug">{op.descripcion}</p>
                  </div>
                  <svg className="ml-auto flex-shrink-0 text-slate-300" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
