import Link from 'next/link';

/**
 * Landing page — solo visible para usuarios sin sesión.
 * Si hay sesión activa, el middleware redirige a /nutriologo/dashboard
 * o /paciente/inicio antes de que esta página se renderice.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-6">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">N</span>
        </div>
        <h1 className="text-5xl font-bold text-brand-700 mb-4">Nutri Smart CR</h1>
        <p className="text-xl text-brand-600">Nutrición personalizada con inteligencia artificial</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/auth/login"
          className="flex-1 bg-brand-600 text-white text-center py-4 px-6 rounded-2xl font-semibold hover:bg-brand-700 transition-colors shadow-lg"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/auth/registro/paciente"
          className="flex-1 bg-white text-brand-600 text-center py-4 px-6 rounded-2xl font-semibold border-2 border-brand-600 hover:bg-brand-50 transition-colors shadow-lg"
        >
          Registrarme
        </Link>
      </div>

      <p className="mt-8 text-sm text-brand-500">
        ¿Eres nutriólogo?{' '}
        <Link href="/auth/registro/nutriologo" className="font-semibold underline hover:text-brand-700">
          Crea tu cuenta profesional
        </Link>
      </p>
    </main>
  );
}
