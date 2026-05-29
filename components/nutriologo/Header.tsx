'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/nutriologo/dashboard':  'Dashboard',
  '/nutriologo/pacientes':  'Pacientes',
  '/nutriologo/planes':     'Planes Nutricionales',
  '/nutriologo/inventario': 'Inventario',
  '/nutriologo/recetas':    'Recetas con IA',
};

interface NutriHeaderProps {
  onToggle: () => void;
}

export default function NutriHeader({ onToggle }: NutriHeaderProps) {
  const pathname = usePathname();
  const title    = pageTitles[pathname] ?? 'Nutri Smart CR';

  return (
    <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
      {/* Hamburger — visible en mobile, oculto en xl (el sidebar muestra su propio toggle) */}
      <button
        onClick={onToggle}
        className="xl:hidden flex flex-col gap-1.5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label="Abrir menú"
      >
        <span className="block w-5 h-0.5 bg-current rounded-full" />
        <span className="block w-5 h-0.5 bg-current rounded-full" />
        <span className="block w-5 h-0.5 bg-current rounded-full" />
      </button>

      <h2 className="flex-1 font-semibold text-slate-800">{title}</h2>

      <div className="flex items-center gap-2 text-slate-400">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors text-base"
          aria-label="Notificaciones"
        >
          🔔
        </button>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors text-base"
          aria-label="Configuración"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
