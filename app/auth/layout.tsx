/**
 * Layout limpio para las pantallas de autenticación.
 * Sin sidebar ni bottom nav — pantalla completa.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {children}
    </div>
  );
}
