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
      setError('Necesitas un código de tu nutricionista para registrarte.');
      return;
    }

    setLoading(true);
    try {
      // ── Paso 1: validar el código ANTES de crear la cuenta ──────────────────
      const validacion = await checkCodigo(form.codigoNutriologo.trim());
      setCodigoValidado(validacion.valido);

      if (!validacion.valido) {
        setError(validacion.error ?? 'Código inválido, verificá con tu nutricionista.');
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
          user_id:           signUpData.user.id,
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
    <div className="relative min-h-screen overflow-y-auto">
      {/* ── Fondo hero ──────────────────────────────────────────────────────── */}
      <img
        src="/images/hero2.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
      />

      {/* ── Overlay blur ────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.15)' }}
      />

      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center py-10 px-4">
        {/* Logo + nombre */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/icons/icon-192x192.png"
            alt="Nutri Smart CR"
            width={52}
            height={52}
            className="rounded-xl shadow-md"
          />
          <span
            className="text-2xl font-bold text-white"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}
          >
            Nutri Smart CR
          </span>
        </div>

        {/* Card del formulario */}
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl p-8 mb-8"
          style={{ background: 'rgba(255,255,255,0.85)' }}
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Registro — Paciente</h2>
          <p className="text-slate-400 text-sm mb-6">
            Necesitas un código de tu nutricionista para registrarte.
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

            {/* Código de nutricionista */}
            <div>
              <label className={labelCls}>
                Código de tu nutricionista <span className="text-red-400">*</span>
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
                Tu nutricionista te compartirá este código desde su panel.
              </p>
              {codigoValidado === false && <p className="text-xs text-red-500 mt-1">Código inválido, verificá con tu nutricionista.</p>}
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
    </div>
  );
}
