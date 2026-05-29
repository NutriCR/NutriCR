import NutriShell from '@/components/nutriologo/NutriShell';

/**
 * Layout del panel del nutricionista.
 * Se mantiene como Server Component — la lógica interactiva del sidebar
 * vive en NutriShell (Client Component).
 */
export default function NutriologoLayout({ children }: { children: React.ReactNode }) {
  return <NutriShell>{children}</NutriShell>;
}
