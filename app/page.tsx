import Link from 'next/link';

/**
 * Landing page — solo visible para usuarios sin sesión.
 * El middleware redirige usuarios autenticados a su panel antes de llegar aquí.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-brand-100 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-lg font-black leading-none">N</span>
          </div>
          <span className="text-lg font-bold text-brand-700 tracking-tight">
            Nutri Smart CR
          </span>
        </div>

        {/* Acción rápida desktop */}
        <Link
          href="/auth/login"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          Iniciar sesión
          <span aria-hidden>→</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ══════════════════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-6 py-16 sm:py-24 text-center flex flex-col items-center">

          {/* Decoración de fondo */}
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-white/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03]" />
          </div>

          {/* Icono hero */}
          <div className="relative w-20 h-20 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center mb-8 shadow-xl">
            <span className="text-4xl" aria-hidden>🥗</span>
          </div>

          {/* Tagline */}
          <h1 className="relative text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight max-w-2xl mx-auto">
            Tu nutriólogo, tu despensa y tus recetas{' '}
            <span className="text-brand-200">en un solo lugar</span>
          </h1>

          <p className="relative mt-5 text-brand-100 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Planes nutricionales personalizados con inteligencia artificial,
            seguimiento en tiempo real y recetas adaptadas a tu despensa.
          </p>

          {/* CTAs */}
          <div className="relative mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-md mx-auto">
            <Link
              href="/auth/registro/nutriologo"
              className="flex-1 flex items-center justify-center gap-2 bg-white text-brand-700 font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:bg-brand-50 active:scale-95 transition-all text-sm sm:text-base"
            >
              <span className="text-xl" aria-hidden>🩺</span>
              Soy Nutriólogo
            </Link>
            <Link
              href="/auth/registro/paciente"
              className="flex-1 flex items-center justify-center gap-2 bg-brand-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:bg-brand-400 active:scale-95 transition-all border border-white/20 text-sm sm:text-base"
            >
              <span className="text-xl" aria-hidden>👤</span>
              Soy Paciente
            </Link>
          </div>

          {/* Login link */}
          <p className="relative mt-6 text-brand-200 text-sm">
            ¿Ya tenés cuenta?{' '}
            <Link href="/auth/login" className="text-white font-semibold underline underline-offset-2 hover:text-brand-100 transition-colors">
              Iniciá sesión
            </Link>
          </p>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            BENEFICIOS
        ══════════════════════════════════════════════════════════════════════ */}
        <section className="px-6 py-16 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto">

            <div className="text-center mb-12">
              <span className="inline-block bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                ¿Por qué Nutri Smart CR?
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
                Nutrición inteligente,<br className="hidden sm:block" /> resultados reales
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon:  '🤖',
                  title: 'Recetas con IA',
                  desc:  'Generamos recetas personalizadas basadas en tu plan nutricional y los ingredientes que tenés en tu despensa.',
                  bg:    'bg-violet-50',
                  ring:  'ring-violet-100',
                  text:  'text-violet-700',
                },
                {
                  icon:  '📊',
                  title: 'Seguimiento real',
                  desc:  'Tu nutriólogo monitorea tu adherencia semanal y evolución InBody desde un panel profesional en tiempo real.',
                  bg:    'bg-brand-50',
                  ring:  'ring-brand-100',
                  text:  'text-brand-700',
                },
                {
                  icon:  '🛒',
                  title: 'Despensa inteligente',
                  desc:  'Escaneá tiquetes de supermercado para registrar tus compras y obtener recetas con lo que ya tenés en casa.',
                  bg:    'bg-amber-50',
                  ring:  'ring-amber-100',
                  text:  'text-amber-700',
                },
              ].map((b) => (
                <div
                  key={b.title}
                  className="flex flex-col items-start gap-4 p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-2xl ${b.bg} ring-4 ${b.ring} flex items-center justify-center text-2xl`}>
                    {b.icon}
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${b.text} mb-1`}>{b.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            BANNER FINAL (CTA secundario)
        ══════════════════════════════════════════════════════════════════════ */}
        <section className="px-6 py-14 bg-brand-50 border-t border-brand-100">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-2xl font-black text-brand-800 mb-3">
              Empezá hoy sin costo
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Registrá tu cuenta de nutriólogo o pedile a tu profesional que te invite como paciente.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth/registro/nutriologo"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3.5 px-7 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
              >
                <span aria-hidden>🩺</span> Crear cuenta nutriólogo
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-brand-50 text-brand-700 font-semibold py-3.5 px-7 rounded-xl border border-brand-200 shadow-sm hover:shadow-md transition-all text-sm"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-100 bg-white px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">N</span>
            </div>
            <span className="text-sm font-bold text-brand-700">Nutri Smart CR</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-5 text-xs text-slate-400">
            <Link href="/auth/login"              className="hover:text-brand-600 transition-colors">Iniciar sesión</Link>
            <Link href="/auth/registro/nutriologo" className="hover:text-brand-600 transition-colors">Soy nutriólogo</Link>
            <Link href="/auth/registro/paciente"   className="hover:text-brand-600 transition-colors">Soy paciente</Link>
          </nav>

          {/* Copy */}
          <p className="text-xs text-slate-300">
            © {new Date().getFullYear()} Nutri Smart CR
          </p>
        </div>
      </footer>

    </div>
  );
}
