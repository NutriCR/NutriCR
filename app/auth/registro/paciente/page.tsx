'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegistroPacientePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre:           '',
    apellido:         '',
    email:            '',
    password:         '',
    confirmPass:      '',
    codigoNutriologo: '',
  });
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [codigoValidado,  setCodigoValidado]  = useState<boolean | null>(null);
  const [validandoCodigo, setValidandoCodigo] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = k === 'codigoNutriologo' ? e.target.value.toUpperCase() : e.target.value;
      setForm((f) => ({ ...f, [k]: v }));
      if (k === 'codigoNutriologo') setCodigoValidado(null);
    };
  }

  // ── Validación en tiempo real (onBlur / botón Verificar) ─────────────────────
  async function validarCodigo() {
    const codigo = form.codigoNutriologo.trim();
    if (codigo.length < 9) return;
    setValidandoCodigo(true);
    try {
      const res  = await fetch(`/api/codigos?codigo=${encodeURIComponent(codigo)}`);
      const json = await res.json() as { valido: boolean; error?: string };
      setCodigoValidado(json.valido === true);
    } catch {
      setCodigoValidado(false);
    } finally {
      setValidandoCodigo(false);
    }
  }

  // ── Validación directa que devuelve el resultado (no depende del estado) ─────
  async function checkCodigo(codigo: string): Promise<{ valido: boolean; error?: string }> {
    try {
      const res  = await fetch(`/api/codigos?codigo=${encodeURIComponent(codigo)}`);
      const json = await res.json() as { valido: boolean; error?: string };
      return json;
    } catch {
      return { valido: false, error: 'Error de conexión al validar el código.' };
    }
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
    if (!form.codigoNutriologo.trim()) {
      setError('Necesitas un código de tu nutriólogo para registrarte.');
      return;
    }

    setLoading(true);
    try {
      // ── Paso 1: validar el código ANTES de crear la cuenta ──────────────────
      // Si el código es inválido, no tiene sentido crear el usuario en Auth.
      const validacion = await checkCodigo(form.codigoNutriologo.trim());
      setCodigoValidado(validacion.valido);

      if (!validacion.valido) {
        setError(validacion.error ?? 'Código inválido, verificá con tu nutriólogo.');
        return;
      }

      // ── Paso 2: crear cuenta en Supabase Auth ───────────────────────────────
      const supabase = createClient();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options:  {
          data: {
            tipo_usuario: 'paciente',
            nombre:       form.nombre.trim(),
            apellido:     form.apellido.trim() || null,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);

      if (!signUpData.user) {
        // Supabase devuelve user: null cuando el email ya está registrado
        // y "Confirm email" está activado (protección anti-enumeración).
        throw new Error('User already registered');
      }

      const res = await fetch('/api/auth/setup-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_usuario:      'paciente',
          nombre:            form.nombre.trim(),
          apellido:          form.apellido.trim() || null,
          codigo_nutriologo: form.codigoNutriologo.trim(),
          user_id:           signUpData.user.id,   // para el Modo B (sin sesión)
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error ?? 'Error al configurar el perfil.');

      router.push('/paciente/inicio');
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
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-emerald-500 to-brand-700 flex-col justify-between p-12">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-8 leading-tight">
            Únete como<br />Paciente
          </h1>
          <p className="text-white/80 text-base mt-4 leading-relaxed">
            Accede a tu plan nutricional personalizado, recetas del día y seguimiento de progreso.
          </p>
        </div>
        <div className="bg-white/10 rounded-2xl p-5">
          <p className="text-white text-sm font-medium mb-2">✅ Lo que obtienes:</p>
          <ul className="space-y-2 text-white/80 text-sm">
            <li>• Plan nutricional personalizado</li>
            <li>• Recetas del día generadas con IA</li>
            <li>• Escaneo de tiquetes de supermercado</li>
            <li>• Notas y seguimiento de tu nutriólogo</li>
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
            <span className="text-sm font-bold text-brand-700">Nutri Smart CR</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Registro — Paciente</h2>
          <p className="text-slate-400 text-sm mb-6">
            Necesitas un código de tu nutriólogo para registrarte.
          </p>

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
                  placeholder="María"
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
                  placeholder="López"
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
                placeholder="maria@email.com"
                required
                autoComplete="email"
                className={inputCls}
              />
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

            {/* Código de nutriólogo */}
            <div>
              <label className={labelCls}>
                Código de tu nutriólogo <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={form.codigoNutriologo}
                    onChange={set('codigoNutriologo')}
                    onBlur={validarCodigo}
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                    required
                    autoComplete="off"
                    className={`${inputCls} font-mono tracking-widest uppercase`}
                  />
                  {codigoValidado === true  && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</span>}
                  {codigoValidado === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">✗</span>}
                </div>
                <button
                  type="button"
                  onClick={validarCodigo}
                  disabled={validandoCodigo || form.codigoNutriologo.length < 9}
                  className="px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  {validandoCodigo ? '…' : 'Verificar'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tu nutriólogo te compartirá este código desde su panel.
              </p>
              {codigoValidado === false && <p className="text-xs text-red-500 mt-1">Código inválido, verificá con tu nutriólogo.</p>}
              {codigoValidado === true  && <p className="text-xs text-green-600 mt-1">✓ Código válido.</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-2"
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta de paciente'}
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
