import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-brand-700 mb-4">NutriCR</h1>
        <p className="text-xl text-brand-600">Nutrición personalizada con inteligencia artificial</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/nutriologo/dashboard"
          className="flex-1 bg-brand-600 text-white text-center py-4 px-6 rounded-2xl font-semibold hover:bg-brand-700 transition-colors shadow-lg"
        >
          Soy Nutriólogo
        </Link>
        <Link
          href="/paciente/inicio"
          className="flex-1 bg-white text-brand-600 text-center py-4 px-6 rounded-2xl font-semibold border-2 border-brand-600 hover:bg-brand-50 transition-colors shadow-lg"
        >
          Soy Paciente
        </Link>
      </div>
    </main>
  );
}
