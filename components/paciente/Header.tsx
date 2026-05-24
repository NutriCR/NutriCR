'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/paciente/inicio': 'Inicio',
  '/paciente/plan': 'Mi Plan',
  '/paciente/escanear': 'Escanear Tiquete',
  '/paciente/recetas': 'Recetas',
  '/paciente/perfil': 'Mi Perfil',
};

export default function PacienteHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'NutriCR';

  return (
    <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <span className="font-bold text-brand-700">NutriCR</span>
      <h1 className="font-semibold text-slate-700 text-sm">{title}</h1>
      <button className="text-slate-400 text-sm">🔔</button>
    </header>
  );
}
