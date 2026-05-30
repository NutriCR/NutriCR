'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Macros {
  calorias: number;
  proteina: number;
  carbos: number;
  grasas: number;
}

interface Comida {
  nombre: string;
  ingredientes: string[];
  instrucciones: string[];
  macros: Macros;
}

interface Menu {
  desayuno: Comida;
  almuerzo: Comida;
  cena: Comida;
  merienda: Comida;
}

// 'cargando' = verificando si ya hay menú para hoy (solo al montar)
type Estado = 'cargando' | 'idle' | 'generando' | 'listo' | 'error';
type ClaveComida = keyof Menu;

// ─── Config ───────────────────────────────────────────────────────────────────

const COMIDAS: { key: ClaveComida; label: string; icon: string; hora: string }[] = [
  { key: 'desayuno', label: 'Desayuno', icon: '☀️', hora: '7:00 am'  },
  { key: 'almuerzo', label: 'Almuerzo', icon: '🥗', hora: '12:00 pm' },
  { key: 'merienda', label: 'Merienda', icon: '🍎', hora: '3:00 pm'  },
  { key: 'cena',     label: 'Cena',     icon: '🌙', hora: '7:00 pm'  },
];

// ─── Helpers de normalización ────────────────────────────────────────────────

function parseMacro(val: unknown): number {
  if (typeof val === 'number') return Math.round(val);
  if (typeof val === 'string') return Math.round(parseFloat(val)) || 0;
  return 0;
}

function normalizarMacros(raw: unknown): Macros {
  const m = (raw ?? {}) as Record<string, unknown>;
  return {
    calorias: parseMacro(m.calorias  ?? m['calorías']  ?? m.calories),
    proteina: parseMacro(m.proteina  ?? m['proteínas'] ?? m.protein),
    carbos:   parseMacro(m.carbos    ?? m.carbohidratos ?? m.carbs),
    grasas:   parseMacro(m.grasas    ?? m.fats),
  };
}

function normalizarLista(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const o = item as Record<string, unknown>;
      const partes = [o.cantidad, o.unidad, o.nombre ?? o.item]
        .filter(Boolean)
        .map(String);
      return partes.join(' ') || JSON.stringify(item);
    }
    return String(item);
  });
}

function normalizarComida(raw: unknown): Comida {
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    nombre:        String(c.nombre ?? 'Plato del día'),
    ingredientes:  normalizarLista(c.ingredientes),
    instrucciones: normalizarLista(c.instrucciones ?? c.pasos ?? c.steps),
    macros:        normalizarMacros(c.macros),
  };
}

function normalizarMenu(raw: Record<string, unknown>): Menu {
  return {
    desayuno: normalizarComida(raw.desayuno),
    almuerzo: normalizarComida(raw.almuerzo),
    cena:     normalizarComida(raw.cena),
    merienda: normalizarComida(raw.merienda),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ComidaCard({
  comida,
  config,
  expandido,
  onToggle,
}: {
  comida:    Comida;
  config:    (typeof COMIDAS)[0];
  expandido: boolean;
  onToggle:  () => void;
}) {
  const { macros } = comida;

  return (
    <Card className="overflow-hidden">
      {/* ── Cabecera ── */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left active:bg-slate-50 transition-colors"
      >
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-2xl flex-shrink-0">
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                {config.label} · {config.hora}
              </p>
              <p className="font-semibold text-slate-800 mt-0.5 leading-snug">
                {comida.nombre}
              </p>
            </div>
            <span
              className={cn(
                'text-slate-300 text-lg flex-shrink-0 transition-transform duration-200 mt-0.5',
                expandido && 'rotate-180',
              )}
            >
              ▾
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
            <span className="text-xs text-slate-500">
              🔥 <span className="font-semibold text-slate-700">{macros.calorias}</span> kcal
            </span>
            <span className="text-xs text-slate-500">
              💪 <span className="font-semibold text-blue-600">{macros.proteina}g</span> prot
            </span>
            <span className="text-xs text-slate-500">
              🌾 <span className="font-semibold text-amber-600">{macros.carbos}g</span> carb
            </span>
            <span className="text-xs text-slate-500">
              🥑 <span className="font-semibold text-rose-600">{macros.grasas}g</span> gras
            </span>
          </div>
        </div>
      </button>

      {/* ── Contenido expandido ── */}
      {expandido && (
        <div className="px-4 pb-5 border-t border-slate-100 space-y-4">
          {comida.ingredientes.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Ingredientes
              </p>
              <ul className="space-y-1.5">
                {comida.ingredientes.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="text-brand-400 flex-shrink-0 mt-0.5 font-bold">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {comida.instrucciones.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Preparación
              </p>
              <ol className="space-y-2.5">
                {comida.instrucciones.map((paso, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{paso}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecetasPage() {
  const [estado,     setEstado]     = useState<Estado>('cargando');
  const [menu,       setMenu]       = useState<Menu | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<ClaveComida>>(new Set<ClaveComida>(['desayuno']));
  const [fuente,     setFuente]     = useState<'despensa' | 'tipicos_cr' | null>(null);

  // ── Verificar si ya hay menú para hoy al montar ────────────────────────────

  useEffect(() => {
    async function verificarMenuHoy() {
      console.log('[recetas] Verificando si existe menú guardado para hoy…');
      try {
        const res  = await fetch('/api/generar-recetas', {
          method: 'GET',
          cache:  'no-store',          // nunca usar caché: cada visita consulta Supabase
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json() as {
          menu:        Record<string, unknown> | null;
          fecha?:      string;
          debugError?: string;
        };

        console.log('[recetas] GET /api/generar-recetas →', {
          status:     res.status,
          tieneMenu:  !!json.menu,
          fecha:      json.fecha,
          debugError: json.debugError,
        });

        if (json.menu) {
          console.log('[recetas] Menú encontrado — mostrando sin llamar a IA ✓');
          setMenu(normalizarMenu(json.menu));
          setEstado('listo');
        } else {
          console.log('[recetas] Sin menú guardado — mostrando botón Generar');
          setEstado('idle');
        }
      } catch (err) {
        console.error('[recetas] Error al consultar menú del día:', err);
        // Si falla la verificación, ir al estado idle para que el usuario pueda generar
        setEstado('idle');
      }
    }

    verificarMenuHoy();
  }, []);

  // ── Generar (o regenerar) ──────────────────────────────────────────────────

  async function handleGenerar() {
    setEstado('generando');
    setError(null);
    setExpandidos(new Set<ClaveComida>(['desayuno']));

    try {
      const res  = await fetch('/api/generar-recetas', { method: 'POST' });
      const json = await res.json() as {
        menu?: Record<string, unknown>;
        usandoIngredientes?: string;
        error?: string;
      };

      if (!res.ok) throw new Error(json.error ?? 'Error al generar recetas');

      setMenu(normalizarMenu(json.menu!));
      setFuente((json.usandoIngredientes as 'despensa' | 'tipicos_cr') ?? null);
      setEstado('listo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setEstado('error');
    }
  }

  function toggleExpandido(key: ClaveComida) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // ── Totales ───────────────────────────────────────────────────────────────

  const totalDia = menu
    ? COMIDAS.reduce(
        (acc, c) => ({
          calorias: acc.calorias + menu[c.key].macros.calorias,
          proteina: acc.proteina + menu[c.key].macros.proteina,
          carbos:   acc.carbos   + menu[c.key].macros.carbos,
          grasas:   acc.grasas   + menu[c.key].macros.grasas,
        }),
        { calorias: 0, proteina: 0, carbos: 0, grasas: 0 },
      )
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between pt-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recetas del día</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Menú generado con tus ingredientes disponibles
          </p>
        </div>

        {/* Botón "Regenerar" — solo visible cuando ya hay menú */}
        {estado === 'listo' && (
          <button
            onClick={handleGenerar}
            className="flex-shrink-0 mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand-600 active:scale-95 transition-all px-2.5 py-1.5 rounded-xl hover:bg-brand-50"
            title="Generar un menú diferente para hoy"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerar
          </button>
        )}
      </div>

      {/* ── Estado: verificando si hay menú para hoy ── */}
      {estado === 'cargando' && (
        <div className="space-y-3">
          {COMIDAS.map((c) => (
            <div key={c.key} className="bg-slate-100 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Estado: sin menú todavía ── */}
      {estado === 'idle' && (
        <>
          <Button size="lg" onClick={handleGenerar} className="w-full">
            ✨ Generar recetas del día
          </Button>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center text-5xl shadow-inner">
              🍽️
            </div>
            <div>
              <p className="font-semibold text-slate-700">¿Qué comemos hoy?</p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                Claude crea un menú completo con los ingredientes de tu despensa.
                Si está vacía, usa recetas típicas costarricenses.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Estado: generando ── */}
      {estado === 'generando' && (
        <>
          <div className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-brand-600">
            <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Generando con Claude…
          </div>
          <div className="space-y-3">
            {COMIDAS.map((c) => (
              <div key={c.key} className="bg-slate-100 rounded-2xl h-24 animate-pulse" />
            ))}
            <div className="bg-brand-100 rounded-2xl h-32 animate-pulse" />
          </div>
        </>
      )}

      {/* ── Error ── */}
      {estado === 'error' && error && (
        <>
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
          <Button size="lg" onClick={handleGenerar} className="w-full">
            ✨ Intentar de nuevo
          </Button>
        </>
      )}

      {/* ── Fuente de ingredientes ── */}
      {fuente && estado === 'listo' && (
        <p className="text-xs text-slate-400 text-center -mt-2">
          {fuente === 'despensa'
            ? '🥫 Basado en los ingredientes de tu despensa'
            : '🇨🇷 Usando ingredientes típicos costarricenses (despensa vacía)'}
        </p>
      )}

      {/* ── Tarjetas de comidas ── */}
      {estado === 'listo' && menu && (
        <>
          <div className="space-y-3">
            {COMIDAS.map((config) => (
              <ComidaCard
                key={config.key}
                comida={menu[config.key]}
                config={config}
                expandido={expandidos.has(config.key)}
                onToggle={() => toggleExpandido(config.key)}
              />
            ))}
          </div>

          {/* ── Total del día ── */}
          {totalDia && (
            <Card className="p-4 bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 shadow-lg">
              <p className="text-sm font-semibold text-white/80 mb-3">
                📊 Total del día
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold">{totalDia.calorias}</p>
                  <p className="text-xs text-white/70 mt-0.5">kcal</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDia.proteina}g</p>
                  <p className="text-xs text-white/70 mt-0.5">proteína</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDia.carbos}g</p>
                  <p className="text-xs text-white/70 mt-0.5">carbos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDia.grasas}g</p>
                  <p className="text-xs text-white/70 mt-0.5">grasas</p>
                </div>
              </div>
            </Card>
          )}

          {/* ── Botón Regenerar al pie ── */}
          <div className="flex justify-center pt-1 pb-2">
            <button
              onClick={handleGenerar}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-600 active:scale-95 transition-all px-4 py-2.5 rounded-2xl hover:bg-brand-50 border border-slate-200 hover:border-brand-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generar otro menú para hoy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
