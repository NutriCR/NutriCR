'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegistroNutriologoPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre:          '',
    apellido:        '',
    email:           '',
    password:        '',
    confirmPass:     '',
    numeroColegiado: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPass) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options:  {
          data: {
            tipo_usuario: 'nutriologo',
            nombre:       form.nombre.trim(),
            apellido:     form.apellido.trim() || null,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error('No se recibió respuesta del servidor.');

      const res = await fetch('/api/auth/setup-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_usuario:     'nutriologo',
          nombre:           form.nombre.trim(),
          apellido:         form.apellido.trim() || null,
          numero_colegiado: form.numeroColegiado.trim() || null,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error ?? 'Error al configurar el perfil.');

      router.push('/nutriologo/dashboard');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(
        msg.includes('already registered') || msg.includes('User already registered')
          ? 'Ya existe una cuenta con este correo. Inicia sesión.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Clases reutilizables ──────────────────────────────────────────────────────
  const inputCls =
    'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <>
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-brand-600 to-brand-800 flex-col justify-between p-12">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-8 leading-tight">
            Únete como<br />Nutriólogo
          </h1>
          <p className="text-brand-100 text-base mt-4 leading-relaxed">
            Gestiona tus pacientes, planes nutricionales y recetas con IA desde un solo lugar.
          </p>
        </div>
        <div className="bg-white/10 rounded-2xl p-5">
          <p className="text-white text-sm font-medium mb-2">✅ Lo que obtienes:</p>
          <ul className="space-y-2 text-brand-100 text-sm">
            <li>• Dashboard con adherencia de pacientes</li>
            <li>• InBody y seguimiento de progreso</li>
            <li>• Generación de recetas con IA</li>
            <li>• Notas y comunicación con pacientes</li>
          </ul>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <span className="text-sm font-bold text-brand-700">NutriCR</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Registro — Nutriólogo</h2>
          <p className="text-slate-400 text-sm mb-6">Crea tu cuenta profesional en NutriCR.</p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nombre + Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={set('nombre')}
                  placeholder="Ana"
                  required
                  autoComplete="given-name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Apellido</label>
                <input
                  type="text"
                  value={form.apellido}
                  onChange={set('apellido')}
                  placeholder="González"
                  autoComplete="family-name"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Correo */}
            <div>
              <label className={labelCls}>
                Correo electrónico <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="ana@nutricr.cr"
                required
                autoComplete="email"
                className={inputCls}
              />
            </div>

            {/* N° Colegiado */}
            <div>
              <label className={labelCls}>N° Colegiado CCPNCR</label>
              <input
                type="text"
                value={form.numeroColegiado}
                onChange={set('numeroColegiado')}
                placeholder="Ej: CN-12345"
                autoComplete="off"
                className={inputCls}
              />
              <p className="text-xs text-slate-400 mt-1">
                Número de colegiado del Colegio de Nutricionistas de Costa Rica.
              </p>
            </div>

            {/* Contraseña */}
            <div>
              <label className={labelCls}>
                Contraseña <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
                className={inputCls}
              />
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className={labelCls}>
                Confirmar contraseña <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={form.confirmPass}
                onChange={set('confirmPass')}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-2"
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta de nutriólogo'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
