'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import Card from '@/components/ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Medicion {
  id: string;
  fecha: string;
  peso: number | null;
  grasa_porcentaje: number | null;
  musculo_kg: number | null;
}

interface Plan {
  calorias_diarias: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  grasas_g: number | null;
}

interface Receta {
  id: string;
  nombre: string;
  calorias: number | null;
  tiempo_preparacion_minutos: number | null;
  tipo_comida: string;
}

interface Notificacion {
  id: string;
  tipo: string;
  mensaje: string;
  created_at: string;
}

type TipoComida = 'desayuno' | 'almuerzo' | 'cena' | 'merienda';

interface InicioData {
  mediciones: Medicion[];
  plan: Plan | null;
  recetaSugerida: Receta | null;
  notificacionReciente: Notificacion | null;
  tipoComida: TipoComida;
  paciente: { nombre: string; apellido: string | null };
}

type Metrica = 'peso' | 'grasa' | 'musculo';
type ChartPoint = { label: string; real: number | null; proyeccion: number | null };

// ─── Constants ────────────────────────────────────────────────────────────────

const TDEE_ASUMIDO = 2000; // kcal/día asumido si el paciente no tiene plan

const METRICA: Record<Metrica, { label: string; unit: string; color: string }> = {
  peso:    { label: 'Peso',    unit: 'kg', color: '#16a34a' },
  grasa:   { label: 'Grasa',   unit: '%',  color: '#ea580c' },
  musculo: { label: 'Músculo', unit: 'kg', color: '#2563eb' },
};

const COMIDA: Record<TipoComida, { icon: string; label: string }> = {
  desayuno: { icon: '☀️',  label: 'Desayuno' },
  almuerzo: { icon: '🌤️', label: 'Almuerzo' },
  cena:     { icon: '🌙',  label: 'Cena'     },
  merienda: { icon: '🍎',  label: 'Merienda' },
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getSaludo(): string {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'Buenos días';
  if (h >= 12 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatFechaHoy(): string {
  return new Date().toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getMetricValue(m: Medicion, met: Metrica): number | null {
  if (met === 'peso')    return m.peso;
  if (met === 'grasa')   return m.grasa_porcentaje;
  return m.musculo_kg;
}

function buildChartData(
  mediciones: Medicion[],
  metrica: Metrica,
  plan: Plan | null,
): ChartPoint[] {
  // Take last 8 measurements that have a value for this metric
  const withValue = mediciones
    .filter((m) => getMetricValue(m, metrica) != null)
    .slice(-8);

  const points: ChartPoint[] = [];

  withValue.forEach((m, i) => {
    const val     = getMetricValue(m, metrica) as number;
    const isPivot = i === withValue.length - 1;
    const date    = new Date(m.fecha);
    const label   = date.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });

    points.push({
      label,
      real:      val,
      // Pivot point appears in BOTH series so the lines connect visually
      proyeccion: isPivot && plan ? val : null,
    });
  });

  const lastMedicion = withValue[withValue.length - 1];
  const lastVal      = lastMedicion ? getMetricValue(lastMedicion, metrica) : null;

  // Add 4-week projection only when we have a real starting point and a plan
  if (lastVal !== null && plan?.calorias_diarias) {
    const calDiff       = plan.calorias_diarias - TDEE_ASUMIDO;
    const weeklyKgChange = (calDiff * 7) / 7700; // ~7700 kcal ≈ 1 kg de tejido

    for (let w = 1; w <= 4; w++) {
      let projected: number;

      if (metrica === 'peso') {
        projected = lastVal + weeklyKgChange * w;
      } else if (metrica === 'grasa') {
        // En déficit, se pierde sobre todo grasa; en superávit, la % baja ligeramente
        const weeklyFatChange = calDiff < 0 ? weeklyKgChange * 0.4 : weeklyKgChange * 0.12;
        projected = lastVal + weeklyFatChange * w;
      } else {
        // Músculo: crece con superávit, casi sin cambio en déficit
        const weeklyMuscleGain = calDiff > 0 ? weeklyKgChange * 0.25 : 0;
        projected = lastVal + weeklyMuscleGain * w;
      }

      points.push({
        label:      `+${w} sem`,
        real:       null,
        proyeccion: parseFloat(projected.toFixed(1)),
      });
    }
  }

  return points;
}

// ─── Custom SVG dot for the real line ────────────────────────────────────────
// Regular measurements → small filled circle.
// Pivot (last real = today) → pulsing SMIL animation.

function PulsingDot(props: any) {
  const { cx, cy, stroke, payload } = props;
  if (payload?.real == null || cx == null || cy == null) return <g />;

  const color    = stroke ?? '#16a34a';
  const isPivot  = payload.proyeccion != null; // pivot has both series set

  if (!isPivot) {
    return (
      <circle cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={1.5} />
    );
  }

  return (
    <g>
      {/* Outer pulsing ring */}
      <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.3}>
        <animate attributeName="r"            values="5;14;5"       dur="2s" repeatCount="indefinite" />
        <animate attributeName="fill-opacity" values="0.3;0;0.3"   dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Solid inner dot */}
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
    </g>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InicioPage() {
  const [data,         setData]         = useState<InicioData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [metrica,      setMetrica]      = useState<Metrica>('peso');
  const [notifLeida,   setNotifLeida]   = useState(false);
  const [marcando,     setMarcando]     = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/paciente/inicio')
      .then((r) => r.json())
      .then((json: InicioData) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Chart data (memoized) ───────────────────────────────────────────────────
  const chartData = useMemo(
    () => (data ? buildChartData(data.mediciones, metrica, data.plan) : []),
    [data, metrica],
  );

  // Goal value = last proyeccion point
  const metaFinal = useMemo(() => {
    const last = [...chartData].reverse().find((p) => p.proyeccion != null);
    return last?.proyeccion ?? null;
  }, [chartData]);

  const hasChart = chartData.length > 0;
  const { unit, color } = METRICA[metrica];

  // ── Marcar notificación como leída ──────────────────────────────────────────
  async function marcarLeida(id: string) {
    setMarcando(true);
    try {
      await fetch('/api/notificaciones', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
      setNotifLeida(true);
    } finally {
      setMarcando(false);
    }
  }

  // ── Custom tooltip (memoized per unit to avoid recharts flicker) ────────────
  const CustomTooltip = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null;
      const realPt = payload.find((p: any) => p.dataKey === 'real'       && p.value != null);
      const projPt = payload.find((p: any) => p.dataKey === 'proyeccion' && p.value != null);
      const val    = realPt?.value ?? projPt?.value;
      if (val == null) return null;
      const isProj = !realPt && !!projPt;
      return (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xl px-3 py-2 text-xs pointer-events-none">
          <p className="font-semibold text-slate-500 mb-0.5">{label}</p>
          <p className={isProj ? 'text-slate-400 italic' : 'font-bold'} style={isProj ? {} : { color }}>
            {isProj ? '~' : ''}{Number(val).toFixed(1)}&thinsp;{unit}
            {isProj && <span className="ml-1">(proy.)</span>}
          </p>
        </div>
      );
    },
    [unit, color],
  );

  // ─── Derived display values ─────────────────────────────────────────────────
  const saludo     = getSaludo();
  const fecha      = formatFechaHoy();
  const nombre     = data?.paciente.nombre ?? '';
  const tipoComida = data?.tipoComida ?? 'desayuno';

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-4">

      {/* ── Saludo ─────────────────────────────────────────────────────────── */}
      <div className="pt-2">
        {loading ? (
          <>
            <div className="h-3.5 bg-slate-100 rounded animate-pulse w-36 mb-1.5" />
            <div className="h-7   bg-slate-100 rounded animate-pulse w-52" />
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm capitalize">{fecha}</p>
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">
              {saludo}{nombre ? `, ${nombre}` : ''}&nbsp;👋
            </h1>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GRÁFICA DE PROGRESO
      ══════════════════════════════════════════════════════════════════════ */}
      <Card className="p-4 space-y-3">

        {/* Header + selector de métrica */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-700 whitespace-nowrap">Mi progreso</h2>
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {(Object.entries(METRICA) as [Metrica, typeof METRICA[Metrica]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setMetrica(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                  metrica === key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart area */}
        {loading ? (
          <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
        ) : !hasChart ? (
          <div className="h-44 flex flex-col items-center justify-center rounded-xl bg-slate-50 text-center px-6">
            <span className="text-3xl mb-2">📊</span>
            <p className="text-sm font-medium text-slate-600">Sin mediciones aún</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Tu nutriólogo irá registrando tus datos de InBody aquí
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                  tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Línea sólida: mediciones reales */}
                <Line
                  type="monotone"
                  dataKey="real"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={<PulsingDot />}
                  activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />

                {/* Línea punteada: proyección */}
                <Line
                  type="monotone"
                  dataKey="proyeccion"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  strokeOpacity={0.55}
                  dot={false}
                  activeDot={{ r: 4, fill: color, strokeDasharray: '0' }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Leyenda de proyección y meta */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-5 border-t-2 border-dashed"
                  style={{ borderColor: color, opacity: 0.6 }}
                />
                <span>Proyección 4 semanas</span>
              </div>
              {metaFinal !== null && (
                <span className="font-semibold text-slate-600">
                  Meta:&nbsp;
                  <span style={{ color }}>
                    {metaFinal.toFixed(1)}&thinsp;{unit}
                  </span>
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          RECETA SUGERIDA
      ══════════════════════════════════════════════════════════════════════ */}
      {(loading || data?.recetaSugerida) && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl leading-none">{COMIDA[tipoComida].icon}</span>
            <h2 className="font-semibold text-slate-700 text-sm">
              {loading ? '' : `${COMIDA[tipoComida].label} sugerido`}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-5 bg-slate-100 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
            </div>
          ) : data?.recetaSugerida ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 leading-snug">{data.recetaSugerida.nombre}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  {data.recetaSugerida.calorias != null && (
                    <span>🔥 {data.recetaSugerida.calorias} kcal</span>
                  )}
                  {data.recetaSugerida.tiempo_preparacion_minutos != null && (
                    <span>⏱ {data.recetaSugerida.tiempo_preparacion_minutos} min</span>
                  )}
                </div>
              </div>
              <Link
                href="/paciente/recetas"
                className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 active:bg-brand-800 transition-colors whitespace-nowrap"
              >
                Ver receta
              </Link>
            </div>
          ) : null}
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          NOTA DEL NUTRIÓLOGO (solo si hay notificación no leída)
      ══════════════════════════════════════════════════════════════════════ */}
      {!loading && data?.notificacionReciente && !notifLeida && (
        <Card className="p-4 border-l-[3px] border-l-brand-500 bg-brand-50/40">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-brand-700 mb-1.5 uppercase tracking-wide">
                Mensaje de tu nutriólogo
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {data.notificacionReciente.mensaje}
              </p>
              <button
                onClick={() => marcarLeida(data.notificacionReciente!.id)}
                disabled={marcando}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors disabled:opacity-50"
              >
                {marcando ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Marcando…
                  </>
                ) : (
                  <>✓ Marcar como leída</>
                )}
              </button>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
