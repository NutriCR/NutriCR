'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const SLIDES = [
  { src: '/images/hero1.jpg', origin: 'center center' },
  { src: '/images/hero2.jpg', origin: 'top right'    },
  { src: '/images/hero3.jpg', origin: 'bottom left'  },
  { src: '/images/hero4.jpg', origin: 'center right' },
  { src: '/images/hero5.jpg', origin: 'top left'     },
];
const SLIDE_DURATION_MS = 4500;

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/** Devuelve true cuando el usuario ha hecho scroll más allá de `threshold` px. */
function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [threshold]);
  return scrolled;
}

/**
 * Configura un IntersectionObserver que añade la clase `is-visible` a todos los
 * elementos [data-reveal] y [data-reveal-line] cuando entran al viewport.
 * Sin librerías externas — solo CSS transitions y la API nativa del navegador.
 */
function useScrollReveal() {
  useEffect(() => {
    const addVisible = (el: Element) => el.classList.add('is-visible');

    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal],[data-reveal-line]').forEach(addVisible);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            addVisible(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
    );

    document.querySelectorAll('[data-reveal],[data-reveal-line]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Íconos SVG inline (sin librerías externas)
// ─────────────────────────────────────────────────────────────────────────────

function IconCamera({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4"  />
      <line x1="6"  y1="20" x2="6"  y2="14" />
      <line x1="2"  y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconTrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header — transparente sobre el hero, blanco al hacer scroll
// ─────────────────────────────────────────────────────────────────────────────

function Header({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm py-3' : 'bg-transparent py-5',
      )}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/icon-192x192.png"
            alt="Nutri Smart CR"
            width={52}
            height={52}
            className="rounded-xl flex-shrink-0 shadow-sm"
          />
          <span
            className={cn(
              'text-2xl font-bold tracking-tight transition-colors duration-300',
              scrolled ? 'text-brand-700' : 'text-white drop-shadow',
            )}
          >
            Nutri Smart CR
          </span>
        </div>

        {/* CTA desktop */}
        <Link
          href="/auth/login"
          className={cn(
            'hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-300',
            scrolled
              ? 'text-brand-700 hover:bg-brand-50'
              : 'text-white/90 hover:text-white border border-white/30 hover:border-white/60 backdrop-blur-sm',
          )}
        >
          Iniciar sesión <span aria-hidden>→</span>
        </Link>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const scrolled                 = useScrolled(60);
  const [currentSlide, setSlide] = useState(0);
  useScrollReveal();

  // Avance automático del slideshow
  useEffect(() => {
    const t = setInterval(() => setSlide((c) => (c + 1) % SLIDES.length), SLIDE_DURATION_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <Header scrolled={scrolled} />

      <main className="flex-1">

        {/* ══════════════════════════════════════════════════════════════════
            HERO — slideshow con Ken Burns + overlay + texto + CTAs
        ══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">

          {/* Slideshow de fondo */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            {SLIDES.map((slide, i) => {
              const active = i === currentSlide;
              return (
                <div
                  key={i}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-[1400ms] ease-in-out',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  {/*
                    La imagen siempre está montada (no hay remount).
                    Ken Burns: animación de 32 s en bucle; cada slide arranca
                    en una fase distinta gracias al delay negativo, por lo que
                    cuando una imagen se hace visible ya está en movimiento.
                  */}
                  <img
                    src={slide.src}
                    alt=""
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: slide.src.includes('hero2') ? 'center 20%' : 'center center',
                      animationName:           'kenBurns',
                      animationDuration:       '32s',
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDirection:      'alternate',
                      animationDelay:          `${-i * 6.4}s`,
                      animationFillMode:       'both',
                      transformOrigin:         slide.origin,
                      willChange:              'transform',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Overlay verde oscuro semitransparente — #1B5E20 al 70-80 % */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'rgba(20, 80, 20, 0.45)',
            }}
          />

          {/* Contenido del hero */}
          <div className="relative z-10 max-w-3xl mx-auto w-full">

            {/* Chip animado */}
            <div
              data-reveal
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse flex-shrink-0" />
              <span className="text-white/90 text-xs font-semibold tracking-widest uppercase">
                Diseñado para Costa Rica
              </span>
            </div>

            {/* Titular */}
            <h1
              data-reveal
              style={{ '--reveal-delay': '110ms', textShadow: '0 2px 8px rgba(0,0,0,0.4)' } as React.CSSProperties}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight"
            >
              Tu nutricionista contigo{' '}
              <span className="text-green-300">todos los días</span>
              <br className="hidden sm:block" />
              {' '}no solo en la cita
            </h1>

            {/* Subtítulo */}
            <p
              data-reveal
              style={{ '--reveal-delay': '240ms' } as React.CSSProperties}
              className="mt-6 text-lg sm:text-xl text-white/85 max-w-xl mx-auto leading-relaxed"
            >
              Seguimiento real, resultados reales.
              Diseñado para Costa Rica.
            </p>

            {/* Botones CTA */}
            <div
              data-reveal
              style={{ '--reveal-delay': '370ms' } as React.CSSProperties}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/auth/registro/nutriologo"
                className="group flex items-center justify-center gap-2.5 bg-white text-brand-700 font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-brand-50 active:scale-95 transition-all duration-200 text-base"
              >
                <span className="text-xl group-hover:scale-110 transition-transform duration-200" aria-hidden>🩺</span>
                Soy Nutricionista
              </Link>
              <Link
                href="/auth/registro/paciente"
                className="group flex items-center justify-center gap-2.5 bg-brand-500/90 hover:bg-brand-500 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all duration-200 border border-white/25 text-base"
              >
                <span className="text-xl group-hover:scale-110 transition-transform duration-200" aria-hidden>👤</span>
                Soy Paciente
              </Link>
            </div>

            {/* Link secundario */}
            <p
              data-reveal
              style={{ '--reveal-delay': '490ms' } as React.CSSProperties}
              className="mt-6 text-white/70 text-sm"
            >
              ¿Ya tenés cuenta?{' '}
              <Link href="/auth/login" className="text-white font-semibold underline underline-offset-2 hover:text-green-300 transition-colors">
                Iniciá sesión
              </Link>
            </p>
          </div>

          {/* Indicadores de diapositiva */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Foto ${i + 1}`}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === currentSlide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70',
                )}
              />
            ))}
          </div>

          {/* Flecha de scroll hacia abajo */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 animate-bounce" aria-hidden>
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            BENEFICIOS — 3 cards con fade-in + scale hover
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto">

            <div className="text-center mb-16">
              <span
                data-reveal
                className="inline-block bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
              >
                Por qué Nutri Smart CR
              </span>
              <h2
                data-reveal
                style={{ '--reveal-delay': '110ms' } as React.CSSProperties}
                className="text-3xl sm:text-4xl font-black text-slate-800 leading-tight"
              >
                Todo lo que necesitás para{' '}
                <span className="text-brand-600">comer mejor</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                {
                  Icon:  IconChart,
                  ring:  'ring-amber-100',
                  bg:    'bg-amber-50',
                  text:  'text-amber-600',
                  title: 'Seguimiento diario',
                  desc:  'Tu nutricionista ve lo que comés cada día y ajusta tu plan en tiempo real.',
                  delay: '0ms',
                },
                {
                  Icon:  IconCamera,
                  ring:  'ring-brand-100',
                  bg:    'bg-brand-50',
                  text:  'text-brand-600',
                  title: 'Fotos de tus comidas',
                  desc:  'Fotografiá lo que comés. Tu nutricionista lo revisa y te da retroalimentación.',
                  delay: '130ms',
                },
                {
                  Icon:  IconTrendingUp,
                  ring:  'ring-violet-100',
                  bg:    'bg-violet-50',
                  text:  'text-violet-600',
                  title: 'Resultados visibles',
                  desc:  'Mediciones InBody, progreso semanal y proyección de tus metas en una sola pantalla.',
                  delay: '260ms',
                },
              ].map((b) => (
                <div
                  key={b.title}
                  data-reveal
                  style={{ '--reveal-delay': b.delay } as React.CSSProperties}
                  className="group flex flex-col gap-5 p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-white"
                >
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center ring-4 flex-shrink-0', b.bg, b.ring, b.text)}>
                    <b.Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{b.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            PARA NUTRICIONISTAS — fondo verde oscuro
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-24 px-6 bg-[#1a4d2e] relative overflow-hidden">
          {/* Detalles decorativos de fondo */}
          <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
          <div aria-hidden className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03] pointer-events-none" />

          <div className="max-w-3xl mx-auto text-center relative z-10">
            {/* Chip */}
            <span
              data-reveal
              className="inline-block bg-white/10 border border-white/20 text-green-200 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-7"
            >
              Para nutricionistas
            </span>

            <h2
              data-reveal
              style={{ '--reveal-delay': '110ms' } as React.CSSProperties}
              className="text-3xl sm:text-4xl font-black text-white leading-tight mb-5"
            >
              Aumentá tu impacto sin{' '}
              <span className="text-green-300">aumentar tu carga</span>{' '}
              de trabajo
            </h2>

            <p
              data-reveal
              style={{ '--reveal-delay': '220ms' } as React.CSSProperties}
              className="text-green-100/80 text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
            >
              Dashboard completo con todos tus pacientes, seguimiento en tiempo real
              y comunicación directa desde una sola plataforma.
            </p>

            {/* Stats visuales */}
            <div
              data-reveal
              style={{ '--reveal-delay': '320ms' } as React.CSSProperties}
              className="grid grid-cols-3 gap-6 mb-10 max-w-lg mx-auto"
            >
              {[
                { value: '100%',  label: 'Visibilidad diaria' },
                { value: '3x',    label: 'Más retención'      },
                { value: '0 min', label: 'De papeleo extra'   },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-white">{s.value}</span>
                  <span className="text-xs text-green-200/70 leading-tight text-center">{s.label}</span>
                </div>
              ))}
            </div>

            <div
              data-reveal
              style={{ '--reveal-delay': '420ms' } as React.CSSProperties}
            >
              <Link
                href="/auth/registro/nutriologo"
                className="inline-flex items-center justify-center gap-2.5 bg-white text-[#1a4d2e] font-bold py-4 px-10 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-green-50 active:scale-95 transition-all duration-200 text-base"
              >
                <span aria-hidden>🩺</span>
                Registrá tu consultorio
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CÓMO FUNCIONA — 3 pasos + línea conectora animada
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-24 px-6 bg-slate-50">
          <div className="max-w-5xl mx-auto">

            <div className="text-center mb-16">
              <span
                data-reveal
                className="inline-block bg-brand-100 text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
              >
                Así funciona
              </span>
              <h2
                data-reveal
                style={{ '--reveal-delay': '110ms' } as React.CSSProperties}
                className="text-3xl sm:text-4xl font-black text-slate-800"
              >
                Empezá en tres pasos
              </h2>
            </div>

            {/*
              Layout:  [Paso 01] ——— [Paso 02] ——— [Paso 03]
              Mobile:  columna vertical sin líneas
              Desktop: grid 1fr auto 1fr auto 1fr (pasos + líneas intercaladas)
            */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_64px_1fr_64px_1fr] items-start gap-8 sm:gap-0">

              {/* Paso 01 */}
              <div
                data-reveal
                style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
                className="flex flex-col items-center text-center px-4"
              >
                <div className="w-[72px] h-[72px] rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 mb-6 flex-shrink-0">
                  <span className="text-xl font-black">01</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Tu nutricionista crea tu plan</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Define tus metas, restricciones y objetivos en la plataforma.
                </p>
              </div>

              {/* Línea 1 (solo desktop) */}
              <div className="hidden sm:flex items-start justify-center pt-9" aria-hidden>
                <div
                  data-reveal-line
                  style={{ '--reveal-delay': '260ms' } as React.CSSProperties}
                  className="h-px w-full bg-brand-300"
                />
              </div>

              {/* Paso 02 */}
              <div
                data-reveal
                style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
                className="flex flex-col items-center text-center px-4"
              >
                <div className="w-[72px] h-[72px] rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 mb-6 flex-shrink-0">
                  <span className="text-xl font-black">02</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Vos registrás tu día a día</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Fotografiá tus comidas, escaneá tu compra del súper, seguí tu progreso.
                </p>
              </div>

              {/* Línea 2 (solo desktop) */}
              <div className="hidden sm:flex items-start justify-center pt-9" aria-hidden>
                <div
                  data-reveal-line
                  style={{ '--reveal-delay': '440ms' } as React.CSSProperties}
                  className="h-px w-full bg-brand-300"
                />
              </div>

              {/* Paso 03 */}
              <div
                data-reveal
                style={{ '--reveal-delay': '360ms' } as React.CSSProperties}
                className="flex flex-col items-center text-center px-4"
              >
                <div className="w-[72px] h-[72px] rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 mb-6 flex-shrink-0">
                  <span className="text-xl font-black">03</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Tu nutricionista te acompaña</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Revisa tus fotos, ajusta tu plan y te manda correcciones entre citas.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CTA FINAL
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6 bg-brand-600 relative overflow-hidden">
          {/* Decoraciones de fondo */}
          <div aria-hidden className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
          <div aria-hidden className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />

          <div className="max-w-2xl mx-auto text-center relative z-10">
            <h2
              data-reveal
              className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight"
            >
              Empezá hoy, sin costo
            </h2>
            <p
              data-reveal
              style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
              className="text-brand-100 text-lg mb-10 leading-relaxed"
            >
              Registrá tu cuenta de nutricionista o pedile a tu profesional que te invite como paciente.
            </p>
            <div
              data-reveal
              style={{ '--reveal-delay': '240ms' } as React.CSSProperties}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/auth/registro/nutriologo"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl hover:bg-brand-50 active:scale-95 transition-all"
              >
                <span aria-hidden>🩺</span> Crear cuenta nutricionista
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold py-4 px-8 rounded-2xl border border-white/20 active:scale-95 transition-all"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-white px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Marca */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">N</span>
            </div>
            <span className="font-bold text-white">Nutri Smart CR</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/auth/registro/nutriologo" className="hover:text-white transition-colors">Nutricionistas</Link>
            <Link href="/auth/registro/paciente"   className="hover:text-white transition-colors">Pacientes</Link>
            <Link href="/auth/login"               className="hover:text-white transition-colors">Contacto</Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-slate-500 text-center sm:text-right">
            © {new Date().getFullYear()} Nutri Smart CR · Hecho en Costa Rica 🇨🇷
          </p>
        </div>
      </footer>

    </div>
  );
}
