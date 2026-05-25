'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function PerfilPage() {
  const router          = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const nombre   = user?.user_metadata?.nombre   as string | undefined;
  const apellido = user?.user_metadata?.apellido  as string | undefined;
  const email    = user?.email;
  const iniciales = nombre
    ? (nombre.charAt(0) + (apellido?.charAt(0) ?? '')).toUpperCase()
    : '👤';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
      </div>

      {/* Avatar + nombre */}
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-3xl font-bold text-brand-700 mb-3">
          {loading ? '…' : iniciales}
        </div>
        {loading ? (
          <div className="h-4 bg-slate-100 rounded animate-pulse w-32 mb-2" />
        ) : (
          <>
            <p className="font-semibold text-slate-800 text-lg">
              {nombre ? `${nombre}${apellido ? ' ' + apellido : ''}` : 'Paciente'}
            </p>
            <p className="text-slate-500 text-sm">{email ?? '—'}</p>
          </>
        )}
      </div>

      {/* Datos */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Datos de la cuenta</h2>
        {[
          { label: 'Nombre',  value: nombre ? `${nombre}${apellido ? ' ' + apellido : ''}` : '—' },
          { label: 'Correo',  value: email ?? '—' },
          { label: 'Tipo',    value: 'Paciente' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0"
          >
            <span className="text-slate-500 text-sm">{item.label}</span>
            <span className="font-medium text-slate-800 text-sm">{item.value}</span>
          </div>
        ))}
      </Card>

      {/* Cerrar sesión */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
      >
        {loggingOut ? 'Cerrando sesión…' : (
          <>
            <span>🚪</span>
            Cerrar sesión
          </>
        )}
      </button>
    </div>
  );
}
