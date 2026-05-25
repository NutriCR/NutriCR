'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegistroPacientePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre:             '',
    apellido:           '',
    email:              '',
    password:           '',
    confirmPass:        '',
    codigoNutriologo:   '',
  });
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [codigoValidado,   setCodigoValidado]   = useState<boolean | null>(null);
  const [validandoCodigo,  setValidandoCodigo]  = useState(false);

  function handleChange(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'codigoNutriologo') setCodigoValidado(null); // reset validación
  }

  async function validarCodigo() {
    if (form.codigoNutriologo.trim().length < 9) return;
    setValidandoCodigo(true);
    try {
      const res = await fetch(`/api/codigos?codigo=${encodeURIComponent(form.codigoNutriologo.trim())}`);
      const json = await res.json();
      setCodigoValidado(json.valido === true);
    } catch {
      setCodigoValidado(false);
    } finally {
      setValidandoCodigo(false);
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
      const supabase = createClient();

      // 1. Crear cuenta en Supabase Auth
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
      if (!signUpData.user) throw new Error('No se recibió respuesta del servidor.');

      // 2. Crear registros en BD (usuarios + pacientes) y validar código
      const res = await fetch('/api/auth/setup-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_usuario:       'paciente',
          nombre:             form.nombre.trim(),
          apellido:           form.apellido.trim() || null,
          codigo_nutriologo:  form.codigoNutriologo.trim(),
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error ?? 'Error al configurar el perfil.');

      router.push('/paciente/inicio');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('Ya existe una cuenta con este correo. Inicia sesión.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const field = (
    label: string,
    key: keyof typeof form,
    opts: { type?: string; placeholder?: string; required?: boolean },
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {opts.required !== false && <span className="text-red-400">*</span>}
      </label>
      <input
        type={opts.type ?? 'text'}
        value={form[key]}
        onChange={(e) => handleChange(key, e.target.value)}
        placeholder={opts.placeholder}
        required={opts.required !== false}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all"
      />
    </div>
  );

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
            <span className="text-sm font-bold text-brand-700">NutriCR</span>
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
            <div className="grid grid-cols-2 gap-3">
              {field('Nombre', 'nombre', { placeholder: 'María' })}
              {field('Apellido', 'apellido', { placeholder: 'López', required: false })}
            </div>
            {field('Correo electrónico', 'email', { type: 'email', placeholder: 'maria@email.com' })}
            {field('Contraseña', 'password', { type: 'password', placeholder: 'Mínimo 6 caracteres' })}
            {field('Confirmar contraseña', 'confirmPass', { type: 'password', placeholder: '••••••••' })}

            {/* Campo de código con validación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Código de tu nutriólogo <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={form.codigoNutriologo}
                    onChange={(e) => handleChange('codigoNutriologo', e.target.value.toUpperCase())}
                    onBlur={validarCodigo}
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all uppercase"
                  />
                  {codigoValidado === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</span>
                  )}
                  {codigoValidado === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">✗</span>
                  )}
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
              {codigoValidado === false && (
                <p className="text-xs text-red-500 mt-1">Código inválido o ya utilizado.</p>
              )}
              {codigoValidado === true && (
                <p className="text-xs text-green-600 mt-1">✓ Código válido.</p>
              )}
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
