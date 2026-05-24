'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import NutriHeader from './Header';

const STORAGE_KEY = 'nutricr-sidebar-expanded';

/**
 * Shell del panel del nutriólogo.
 * Gestiona el estado colapsable del sidebar, la persistencia en localStorage
 * y el backdrop de overlay en pantallas pequeñas (<1280px).
 *
 * Se mantiene como Client Component para que el layout padre siga siendo
 * un Server Component de Next.js (mejor rendimiento en SSR).
 */
export default function NutriShell({ children }: { children: React.ReactNode }) {
  // null = no inicializado todavía (evita flash de hidratación)
  const [expanded, setExpanded] = useState<boolean | null>(null);

  // ── Restaurar preferencia guardada (o usar default por tamaño de pantalla) ──
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setExpanded(stored === 'true');
    } else {
      // Por defecto expandido en pantallas xl+, colapsado en las demás
      setExpanded(window.innerWidth >= 1280);
    }
  }, []);

  // ── Guardar cambios en localStorage ────────────────────────────────────────
  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function close() {
    setExpanded(false);
    localStorage.setItem(STORAGE_KEY, 'false');
  }

  // Mientras no sabemos si el sidebar debe estar expandido, lo mostramos
  // colapsado sin transición para evitar un salto visual perceptible.
  const isExpanded  = expanded ?? false;
  const isReady     = expanded !== null;

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar (siempre fixed) ── */}
      <Sidebar
        expanded={isExpanded}
        animated={isReady}
        onToggle={toggle}
      />

      {/* ── Backdrop — overlay móvil (<xl) ── */}
      {isExpanded && (
        <div
          className="xl:hidden fixed inset-0 bg-black/40 z-20"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Contenido principal ── */}
      {/*
        En mobile el sidebar es overlay → ml-0 (contenido a ancho completo).
        En desktop el sidebar es "push" → margen = ancho del sidebar.
        Cuando `isReady` es false no aplicamos transición para evitar el flash.
      */}
      <div
        className={cn(
          'flex flex-col h-screen overflow-hidden',
          'ml-0',                                              // mobile siempre
          isExpanded ? 'xl:ml-64' : 'xl:ml-16',              // desktop: ajuste
          isReady && 'transition-[margin-left] duration-300 ease-in-out',
        )}
      >
        <NutriHeader onToggle={toggle} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
