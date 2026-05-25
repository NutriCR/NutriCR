'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const searchParams = useSearchParams();
  const next         = searchParams.get('next');

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password,
      });

      // ── Error de autenticación ───────────────────────────────────────────────
      if (authError) {
        if (authError.message === 'Email not confirmed') {
          setError('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
        } else if (authError.message === 'Invalid login credentials') {
          setError('Email o contraseña incorrectos.');
        } else {
          setError(authError.message);
        }
        return;    // finally → setLoading(false)
      }

      if (!data.user) {
        setError('No se pudo obtener la sesión. Intenta de nuevo.');
        return;
      }

      // ── Determinar destino ───────────────────────────────────────────────────
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      const tipo     = data.user.user_metadata?.tipo_usuario as string | undefined;
      const destino  = safeNext ?? (tipo === 'paciente' ? '/paciente/inicio' : '/nutriologo/dashboard');

      window.location.href = destino;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 flex-col justify-between p-12">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <h1 className="text-4xl font-bold text-white mt-8 leading-tight">
            Bienvenido a<br />NutriCR
          </h1>
          <p className="text-brand-100 text-lg mt-4 leading-relaxed">
            Nutrición personalizada con<br />inteligencia artificial.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: '📊', text: 'Seguimiento de adherencia en tiempo real' },
            { icon: '🤖', text: 'Recetas generadas con IA según tu despensa' },
            { icon: '📈', text: 'Evolución corporal con gráficas InBody' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-brand-100">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Logo mobile */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">N</span>
          </div>
          <p className="text-sm font-semibold text-brand-700">NutriCR</p>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Iniciar sesión</h2>
          <p className="text-slate-400 text-sm mb-8">Ingresa tus credenciales para continuar.</p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Ingresando…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 text-center mb-4">¿Eres nuevo en NutriCR?</p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/auth/registro/nutriologo"
                className="flex flex-col items-center gap-1.5 border border-slate-200 rounded-xl p-4 text-center hover:border-brand-300 hover:bg-brand-50 transition-all"
              >
                <span className="text-2xl">🩺</span>
                <span className="text-xs font-semibold text-slate-700">Soy Nutriólogo</span>
              </Link>
              <Link
                href="/auth/registro/paciente"
                className="flex flex-col items-center gap-1.5 border border-slate-200 rounded-xl p-4 text-center hover:border-brand-300 hover:bg-brand-50 transition-all"
              >
                <span className="text-2xl">🙋</span>
                <span className="text-xs font-semibold text-slate-700">Soy Paciente</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
