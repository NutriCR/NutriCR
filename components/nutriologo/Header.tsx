'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/nutriologo/dashboard': 'Dashboard',
  '/nutriologo/pacientes': 'Pacientes',
  '/nutriologo/planes': 'Planes Nutricionales',
  '/nutriologo/inventario': 'Inventario',
  '/nutriologo/recetas': 'Recetas con IA',
};

export default function NutriHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'NutriCR';

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
      <h2 className="font-semibold text-slate-800">{title}</h2>
      <div className="flex items-center gap-3">
        <button className="text-slate-400 hover:text-slate-600 text-sm">🔔</button>
        <button className="text-slate-400 hover:text-slate-600 text-sm">⚙️</button>
      </div>
    </header>
  );
}
