'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PacienteRow {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  objetivo: string | null;
  adherencia: number;          // 0–100
  ultimaActividad: string | null;
}

interface Stats {
  totalPacientes:     number;
  adherenciaPromedio: number;
  ingresosMes:        number;
}

interface DashboardData {
  stats:      Stats;
  pacientes:  PacienteRow[];
  isMockData: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initiales(nombre: string, apellido: string | null) {
  return (nombre.charAt(0) + (apellido?.charAt(0) ?? '')).toUpperCase();
}

function tiempoAtras(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  if (mins  > 0) return `hace ${mins}min`;
  return 'ahora mismo';
}

function formatCRC(n: number) {
  return new Intl.NumberFormat('es-CR', {
    style:                 'currency',
    currency:              'CRC',
    minimumFractionDigits: 0,
  }).format(n);
}

function getEstado(pct: number) {
  if (pct >= 70) return { label: 'Al día',  bg: 'bg-green-100', text: 'text-green-700',  dot: 'bg-green-500'  };
  if (pct >= 40) return { label: 'Revisar', bg: 'bg-amber-100', text: 'text-amber-700',  dot: 'bg-amber-500'  };
  return             { label: 'Urgente',    bg: 'bg-red-100',   text: 'text-red-700',    dot: 'bg-red-500'    };
}

function getBarColor(pct: number) {
  if (pct >= 70) return 'bg-green-500';
  if (pct >= 40) return 'bg-amber-400';
  return             'bg-red-500';
}

/** 8 chars alfanuméricos sin ambiguos (0/O, 1/I), formateado XXXX-XXXX */
function generarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const raw   = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon:    string;
  label:   string;
  value:   string;
  sub?:    string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0', accent ?? 'bg-brand-50')}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-4 py-4 md:px-5 md:py-3.5 animate-pulse border-b border-slate-50">
      {/* Mobile skeleton */}
      <div className="flex items-start gap-3 md:hidden">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between gap-2">
            <div className="h-3.5 bg-slate-100 rounded w-32" />
            <div className="h-3.5 bg-slate-100 rounded w-8" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-44" />
          <div className="h-5 bg-slate-100 rounded-full w-16 mt-1" />
          <div className="h-1.5 bg-slate-100 rounded-full w-full" />
        </div>
      </div>
      {/* Desktop skeleton */}
      <div className="hidden md:flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-slate-100 rounded w-36" />
          <div className="h-3 bg-slate-100 rounded w-48" />
        </div>
        <div className="w-24 h-3 bg-slate-100 rounded" />
        <div className="w-32 h-2 bg-slate-100 rounded" />
        <div className="w-16 h-6 bg-slate-100 rounded-full" />
        <div className="w-20 h-7 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Modal: código de invitación ──────────────────────────────────────────────

function ModalCodigo({
  codigo,
  onNuevoCodigo,
  onClose,
}: {
  codigo:        string;
  onNuevoCodigo: () => void;
  onClose:       () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopiar() {
    await navigator.clipboard.writeText(codigo.replace('-', ''));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Agregar paciente</h3>
            <p className="text-sm text-slate-400 mt-0.5">Código de invitación único</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Código */}
          <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              Código de invitación
            </p>
            <p className="text-4xl font-mono font-bold text-slate-800 tracking-[0.25em]">
              {codigo}
            </p>
          </div>

          {/* Instrucciones */}
          <div className="bg-brand-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-brand-700">¿Cómo funciona?</p>
            <ol className="space-y-1.5 text-xs text-brand-600">
              <li className="flex gap-2"><span className="font-bold">1.</span> Copia este código y compártelo con tu paciente</li>
              <li className="flex gap-2"><span className="font-bold">2.</span> El paciente descarga NutriCR e ingresa el código</li>
              <li className="flex gap-2"><span className="font-bold">3.</span> Queda vinculado a tu panel automáticamente</li>
            </ol>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={handleCopiar}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                copiado
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white',
              )}
            >
              {copiado ? '✓ ¡Copiado!' : '📋 Copiar código'}
            </button>
            <button
              onClick={onNuevoCodigo}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              🔄 Nuevo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal]       = useState(false);
  const [codigo, setCodigo]     = useState('');

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/dashboard');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar dashboard');
      setData(json as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Filtro de búsqueda ─────────────────────────────────────────────────────

  const pacientesFiltrados = (data?.pacientes ?? []).filter((p) =>
    `${p.nombre} ${p.apellido ?? ''} ${p.email}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );

  // ── Abrir modal con nuevo código ───────────────────────────────────────────

  function abrirModal() {
    setCodigo(generarCodigo());
    setModal(true);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hoy = new Date().toLocaleDateString('es-CR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  });

  return (
    <div className="space-y-6">

      {/* ── Cabecera ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5 capitalize">{hoy}</p>
        </div>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <span className="text-base">+</span>
          Agregar paciente
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={cargar} className="text-xs text-red-500 underline mt-1">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* ── Métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 h-20 animate-pulse" />
            ))}
          </>
        ) : data ? (
          <>
            <StatCard
              icon="👥"
              label="Pacientes activos"
              value={String(data.stats.totalPacientes)}
              sub="en seguimiento"
              accent="bg-brand-50"
            />
            <StatCard
              icon="📊"
              label="Adherencia promedio"
              value={`${data.stats.adherenciaPromedio}%`}
              sub="últimos 7 días"
              accent={
                data.stats.adherenciaPromedio >= 70
                  ? 'bg-green-50'
                  : data.stats.adherenciaPromedio >= 40
                  ? 'bg-amber-50'
                  : 'bg-red-50'
              }
            />
            <StatCard
              icon="💰"
              label="Ingresos del mes"
              value={formatCRC(data.stats.ingresosMes)}
              sub={new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })}
              accent="bg-emerald-50"
            />
          </>
        ) : null}
      </div>

      {/* ── Lista de pacientes ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Barra superior */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h2 className="font-semibold text-slate-800">Mis pacientes</h2>
            {data && !loading && (
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
                {data.stats.totalPacientes}
              </span>
            )}
            {data?.isMockData && (
              <span className="bg-amber-100 text-amber-600 text-xs font-medium px-2 py-0.5 rounded-full">
                Datos de ejemplo
              </span>
            )}
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar paciente…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:bg-white transition-all w-52"
            />
          </div>
        </div>

        {/* Encabezados de tabla — solo desktop */}
        <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_104px_92px] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
          {['Paciente', 'Objetivo', 'Adherencia semanal', 'Estado', 'Acción'].map((h) => (
            <span key={h} className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {h}
            </span>
          ))}
        </div>

        {/* Filas */}
        {loading ? (
          <div>
            {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">{busqueda ? '🔍' : '👥'}</span>
            <p className="font-medium text-slate-600">
              {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin pacientes aún'}
            </p>
            {!busqueda && (
              <button onClick={abrirModal} className="text-sm text-brand-600 hover:underline">
                Agregar primer paciente →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pacientesFiltrados.map((p) => {
              const estado   = getEstado(p.adherencia);
              const isMock   = p.id.startsWith('mock-');
              const nombreCompleto = `${p.nombre}${p.apellido ? ' ' + p.apellido : ''}`;

              const EstadoBadge = () => (
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                  estado.bg, estado.text,
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', estado.dot)} />
                  {estado.label}
                </span>
              );

              const BarraAdherencia = () => (
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn('h-1.5 rounded-full transition-all duration-700', getBarColor(p.adherencia))}
                    style={{ width: `${p.adherencia}%` }}
                  />
                </div>
              );

              const BtnPerfil = ({ className }: { className?: string }) => (
                <button
                  disabled={isMock}
                  title={isMock ? 'Disponible con pacientes reales' : 'Ver perfil'}
                  className={cn(
                    'text-xs font-medium transition-colors px-3 py-1.5 rounded-lg whitespace-nowrap',
                    isMock
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-brand-600 hover:text-brand-800 hover:bg-brand-50',
                    className,
                  )}
                >
                  Ver perfil →
                </button>
              );

              return (
                <div key={p.id} className="hover:bg-slate-50/60 transition-colors">

                  {/* ── Móvil: card apilada (<md) ── */}
                  <div className="md:hidden px-4 py-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {initiales(p.nombre, p.apellido)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Fila 1: nombre + % */}
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                            {nombreCompleto}
                          </p>
                          <span className="text-sm font-bold text-slate-700 tabular-nums flex-shrink-0">
                            {p.adherencia}%
                          </span>
                        </div>

                        {/* Fila 2: email */}
                        <p className="text-xs text-slate-400 truncate mt-0.5">{p.email}</p>

                        {/* Fila 3: badge estado (su propia línea) */}
                        <div className="mt-2">
                          <EstadoBadge />
                        </div>

                        {/* Barra de progreso */}
                        <div className="mt-2">
                          <BarraAdherencia />
                        </div>

                        {/* Fila 4: última actividad + botón */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            {p.ultimaActividad ? tiempoAtras(p.ultimaActividad) : '—'}
                          </span>
                          <BtnPerfil />
                        </div>
                      </div>
                    </div>

                    {/* Objetivo — línea separada debajo si existe */}
                    {p.objetivo && (
                      <div className="mt-2 pl-12">
                        <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                          {p.objetivo}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Desktop: fila de grid (≥md) ── */}
                  <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_104px_92px] gap-4 px-5 py-3.5 items-center">
                    {/* Avatar + nombre + email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                        {initiales(p.nombre, p.apellido)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{nombreCompleto}</p>
                        <p className="text-xs text-slate-400 truncate">{p.email}</p>
                      </div>
                    </div>

                    {/* Objetivo */}
                    <div className="min-w-0">
                      {p.objetivo
                        ? <span className="inline-block text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full truncate max-w-full">{p.objetivo}</span>
                        : <span className="text-xs text-slate-300">—</span>
                      }
                    </div>

                    {/* Adherencia: % + tiempo + barra */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-700 tabular-nums">
                          {p.adherencia}%
                        </span>
                        {p.ultimaActividad && (
                          <span className="text-xs text-slate-400 truncate">
                            {tiempoAtras(p.ultimaActividad)}
                          </span>
                        )}
                      </div>
                      <BarraAdherencia />
                    </div>

                    {/* Estado badge */}
                    <div><EstadoBadge /></div>

                    {/* Botón */}
                    <div><BtnPerfil /></div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Pie de tabla */}
        {!loading && pacientesFiltrados.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {pacientesFiltrados.length} de {data?.stats.totalPacientes ?? 0} pacientes
              {busqueda && ` · Filtrando por "${busqueda}"`}
            </p>
            {data?.isMockData && (
              <p className="text-xs text-amber-500">
                ⚠️ Mostrando datos de ejemplo — los reales aparecen tras vincular pacientes
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Modal código de invitación ── */}
      {modal && (
        <ModalCodigo
          codigo={codigo}
          onNuevoCodigo={() => setCodigo(generarCodigo())}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}
