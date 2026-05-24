'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJETIVOS = [
  'Bajar grasa',
  'Aumentar músculo',
  'Mantenimiento',
  'Mejorar salud general',
  'Control de enfermedad',
];

const RESTRICCIONES_OPCIONES = [
  'Sin gluten',
  'Sin lácteos',
  'Vegetariano',
  'Vegano',
  'Sin azúcar',
  'Alto en fibra',
];

const METRICAS = [
  { key: 'grasa_porcentaje', label: '% Grasa',  color: '#ef4444', axis: 'left',  unit: '%'  },
  { key: 'agua_porcentaje',  label: '% Agua',   color: '#3b82f6', axis: 'left',  unit: '%'  },
  { key: 'musculo_kg',       label: 'Músculo',  color: '#10b981', axis: 'right', unit: 'kg' },
  { key: 'peso',             label: 'Peso',     color: '#8b5cf6', axis: 'right', unit: 'kg' },
] as const;

type MetricaKey = (typeof METRICAS)[number]['key'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PacienteDetalle {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  objetivo: string | null;
  condiciones_medicas: string[];
  peso: number | null;
  altura: number | null;
  fecha_nacimiento: string | null;
}

interface PlanNutricional {
  id: string;
  calorias_diarias: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  grasas_g: number | null;
  restricciones_dieteticas: string[] | null;
}

interface MedicionInbody {
  id: string;
  paciente_id: string;
  fecha: string;
  peso: number | null;
  grasa_porcentaje: number | null;
  musculo_kg: number | null;
  agua_porcentaje: number | null;
}

interface Nota {
  id: string;
  paciente_id: string;
  nutriologo_id: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

// ─── Mock data (cuando el paciente no existe en la BD) ────────────────────────

const MOCK_PACIENTE: PacienteDetalle = {
  id:                  'mock-detalle',
  nombre:              'Ana',
  apellido:            'González Mora',
  email:               'ana.gonzalez@email.com',
  objetivo:            'Bajar grasa',
  condiciones_medicas: ['Hipotiroidismo', 'Resistencia a la insulina'],
  peso:                68.8,
  altura:              1.62,
  fecha_nacimiento:    '1990-04-15',
};

const MOCK_MEDICIONES: MedicionInbody[] = [
  { id: 'm1', paciente_id: 'mock-detalle', fecha: '2025-02-15', peso: 74.2, grasa_porcentaje: 33.5, musculo_kg: 27.8, agua_porcentaje: 50.5 },
  { id: 'm2', paciente_id: 'mock-detalle', fecha: '2025-03-10', peso: 72.1, grasa_porcentaje: 31.8, musculo_kg: 28.3, agua_porcentaje: 52.1 },
  { id: 'm3', paciente_id: 'mock-detalle', fecha: '2025-04-05', peso: 70.5, grasa_porcentaje: 30.2, musculo_kg: 28.9, agua_porcentaje: 53.4 },
  { id: 'm4', paciente_id: 'mock-detalle', fecha: '2025-05-01', peso: 68.8, grasa_porcentaje: 28.5, musculo_kg: 29.4, agua_porcentaje: 55.0 },
];

const MOCK_PLAN: PlanNutricional = {
  id:                      'plan-mock',
  calorias_diarias:        1800,
  proteinas_g:             140,
  carbohidratos_g:         180,
  grasas_g:                60,
  restricciones_dieteticas: ['Sin azúcar', 'Alto en fibra'],
};

const MOCK_NOTAS: Nota[] = [
  {
    id:            'nota-1',
    paciente_id:   'mock-detalle',
    nutriologo_id: '22222222-2222-2222-2222-222222222222',
    mensaje:       'Tu progreso es excelente. Recuerda tomar la tiroxina en ayunas, 30 minutos antes del desayuno. Sigue con el plan y nos vemos la próxima semana.',
    fecha:         '2025-05-10T10:30:00',
    leida:         true,
  },
  {
    id:            'nota-2',
    paciente_id:   'mock-detalle',
    nutriologo_id: '22222222-2222-2222-2222-222222222222',
    mensaje:       'Ajustamos las calorías a 1800 kcal para acelerar la pérdida de grasa sin perder masa muscular. El objetivo para junio es llegar a 26% de grasa.',
    fecha:         '2025-04-20T15:00:00',
    leida:         true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEstado(pct: number) {
  if (pct >= 70) return { label: 'Al día',  bg: 'bg-green-100', text: 'text-green-700',  dot: 'bg-green-500'  };
  if (pct >= 40) return { label: 'Revisar', bg: 'bg-amber-100', text: 'text-amber-700',  dot: 'bg-amber-500'  };
  return             { label: 'Urgente',   bg: 'bg-red-100',   text: 'text-red-700',    dot: 'bg-red-500'    };
}

function formatFecha(iso: string) {
  const d = new Date(iso + 'T12:00:00'); // evitar offset timezone
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' });
}

function formatFechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString('es-CR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function macroCalc(proteinas: number, carbos: number, grasas: number) {
  const total = proteinas * 4 + carbos * 4 + grasas * 9;
  if (total === 0) return { pPct: 0, cPct: 0, gPct: 0 };
  return {
    pPct: Math.round((proteinas * 4 / total) * 100),
    cPct: Math.round((carbos * 4 / total) * 100),
    gPct: Math.round((grasas * 9 / total) * 100),
  };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <h2 className="font-semibold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
      type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
    )}>
      <span>{type === 'ok' ? '✓' : '⚠'}</span>
      {msg}
    </div>
  );
}

// ─── Modal: Agregar medición ──────────────────────────────────────────────────

function ModalMedicion({
  onGuardar,
  onClose,
  saving,
}: {
  onGuardar: (m: Omit<MedicionInbody, 'id' | 'paciente_id'>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    fecha:            hoy,
    peso:             '',
    grasa_porcentaje: '',
    musculo_kg:       '',
    agua_porcentaje:  '',
  });

  function handleChange(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGuardar({
      fecha:            form.fecha,
      peso:             form.peso             ? parseFloat(form.peso)             : null,
      grasa_porcentaje: form.grasa_porcentaje ? parseFloat(form.grasa_porcentaje) : null,
      musculo_kg:       form.musculo_kg       ? parseFloat(form.musculo_kg)       : null,
      agua_porcentaje:  form.agua_porcentaje  ? parseFloat(form.agua_porcentaje)  : null,
    });
  }

  const field = (label: string, key: keyof typeof form, unit: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={key === 'fecha' ? 'date' : 'number'}
          step="0.1"
          value={form[key]}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={placeholder}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 pr-10"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Agregar medición InBody</h3>
            <p className="text-xs text-slate-400 mt-0.5">Todos los campos son opcionales excepto la fecha</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {field('Fecha', 'fecha', '', '')}
          <div className="grid grid-cols-2 gap-4">
            {field('Peso total',     'peso',             'kg', '70.5')}
            {field('% Grasa',        'grasa_porcentaje', '%',  '28.5')}
            {field('Masa muscular',  'musculo_kg',       'kg', '29.4')}
            {field('% Agua corporal','agua_porcentaje',  '%',  '55.0')}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={!form.fecha || saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar medición'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Custom tooltip para recharts ─────────────────────────────────────────────

interface ChartPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-600 mb-1.5">{label}</p>
      {payload.map((entry) => {
        const cfg = METRICAS.find((m) => m.key === entry.name);
        return (
          <p key={entry.name} style={{ color: entry.color }} className="font-medium">
            {cfg?.label ?? entry.name}: {entry.value}{cfg?.unit ?? ''}
          </p>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PacienteDetallePage({ params }: { params: { id: string } }) {
  const pacienteId = params.id;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [paciente,    setPaciente]    = useState<PacienteDetalle | null>(null);
  const [plan,        setPlan]        = useState<PlanNutricional | null>(null);
  const [mediciones,  setMediciones]  = useState<MedicionInbody[]>([]);
  const [notas,       setNotas]       = useState<Nota[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [adherencia,  setAdherencia]  = useState(0);
  const [isMock,      setIsMock]      = useState(false);

  // ── Section edit state ──────────────────────────────────────────────────────

  // Header / objetivo
  const [objetivo,      setObjetivo]      = useState('');
  const [savingObj,     setSavingObj]     = useState(false);

  // Padecimientos
  const [padecimientos,    setPadecimientos]    = useState<string[]>([]);
  const [nuevoPad,         setNuevoPad]         = useState('');
  const [savingPad,        setSavingPad]        = useState(false);

  // Plan nutricional
  const [planEdit, setPlanEdit] = useState({
    calorias:  0,
    proteinas: 0,
    carbos:    0,
    grasas:    0,
    restricciones: [] as string[],
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [planDirty,  setPlanDirty]  = useState(false);

  // Notas
  const [nuevaNota,     setNuevaNota]     = useState('');
  const [sendingNota,   setSendingNota]   = useState(false);

  // InBody chart
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricaKey>>(
    new Set<MetricaKey>(['grasa_porcentaje', 'musculo_kg', 'peso', 'agua_porcentaje']),
  );
  const [modalMedicion,  setModalMedicion]  = useState(false);
  const [savingMedicion, setSavingMedicion] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Load all data ───────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [resP, resM, resN] = await Promise.all([
        fetch(`/api/pacientes/${pacienteId}`),
        fetch(`/api/pacientes/${pacienteId}/mediciones`),
        fetch(`/api/pacientes/${pacienteId}/notas`),
      ]);

      if (!resP.ok) {
        // Paciente no encontrado → usar datos de ejemplo
        setIsMock(true);
        setPaciente(MOCK_PACIENTE);
        setObjetivo(MOCK_PACIENTE.objetivo ?? '');
        setPadecimientos(MOCK_PACIENTE.condiciones_medicas);
        setPlan(MOCK_PLAN);
        setPlanEdit({
          calorias:     MOCK_PLAN.calorias_diarias  ?? 0,
          proteinas:    MOCK_PLAN.proteinas_g        ?? 0,
          carbos:       MOCK_PLAN.carbohidratos_g    ?? 0,
          grasas:       MOCK_PLAN.grasas_g           ?? 0,
          restricciones: MOCK_PLAN.restricciones_dieteticas ?? [],
        });
        setMediciones(MOCK_MEDICIONES);
        setNotas(MOCK_NOTAS);
        setAdherencia(72);
        return;
      }

      const { paciente: p, plan: pl, adherencia: adh } = await resP.json();
      setPaciente(p);
      setObjetivo(p.objetivo ?? '');
      setPadecimientos(p.condiciones_medicas ?? []);
      setAdherencia(adh);

      if (pl) {
        setPlan(pl);
        setPlanEdit({
          calorias:      pl.calorias_diarias         ?? 0,
          proteinas:     pl.proteinas_g               ?? 0,
          carbos:        pl.carbohidratos_g           ?? 0,
          grasas:        pl.grasas_g                  ?? 0,
          restricciones: pl.restricciones_dieteticas  ?? [],
        });
      }

      if (resM.ok) {
        const { data } = await resM.json();
        setMediciones(data ?? []);
      }
      if (resN.ok) {
        const { data } = await resN.json();
        setNotas(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleObjetivoChange(value: string) {
    setObjetivo(value);
    if (isMock) { showToast('Modo demo — cambios no persisten', 'err'); return; }
    setSavingObj(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo: value }),
      });
      if (!res.ok) throw new Error();
      showToast('Objetivo actualizado');
    } catch {
      showToast('Error al guardar objetivo', 'err');
    } finally {
      setSavingObj(false);
    }
  }

  function handleAgregarPadecimiento() {
    const trim = nuevoPad.trim();
    if (!trim || padecimientos.includes(trim)) return;
    setPadecimientos((prev) => [...prev, trim]);
    setNuevoPad('');
  }

  function handleEliminarPadecimiento(pad: string) {
    setPadecimientos((prev) => prev.filter((p) => p !== pad));
  }

  async function handleGuardarPadecimientos() {
    if (isMock) { showToast('Modo demo — cambios no persisten', 'err'); return; }
    setSavingPad(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condiciones_medicas: padecimientos }),
      });
      if (!res.ok) throw new Error();
      showToast('Padecimientos guardados');
    } catch {
      showToast('Error al guardar padecimientos', 'err');
    } finally {
      setSavingPad(false);
    }
  }

  async function handleGuardarPlan() {
    if (isMock) { showToast('Modo demo — cambios no persisten', 'err'); return; }
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calorias_diarias:        planEdit.calorias   || null,
          proteinas_g:             planEdit.proteinas  || null,
          carbohidratos_g:         planEdit.carbos     || null,
          grasas_g:                planEdit.grasas     || null,
          restricciones_dieteticas: planEdit.restricciones,
        }),
      });
      if (!res.ok) throw new Error();
      setPlanDirty(false);
      showToast('Plan nutricional guardado');
    } catch {
      showToast('Error al guardar el plan', 'err');
    } finally {
      setSavingPlan(false);
    }
  }

  function updatePlanField(key: keyof typeof planEdit, value: number | string[]) {
    setPlanEdit((prev) => ({ ...prev, [key]: value }));
    setPlanDirty(true);
  }

  function toggleRestriccion(r: string) {
    setPlanEdit((prev) => {
      const next = prev.restricciones.includes(r)
        ? prev.restricciones.filter((x) => x !== r)
        : [...prev.restricciones, r];
      return { ...prev, restricciones: next };
    });
    setPlanDirty(true);
  }

  async function handleEnviarNota() {
    if (!nuevaNota.trim()) return;
    if (isMock) {
      const fake: Nota = {
        id:            `nota-${Date.now()}`,
        paciente_id:   pacienteId,
        nutriologo_id: '22222222-2222-2222-2222-222222222222',
        mensaje:       nuevaNota.trim(),
        fecha:         new Date().toISOString(),
        leida:         false,
      };
      setNotas((prev) => [fake, ...prev]);
      setNuevaNota('');
      showToast('Nota enviada (demo)');
      return;
    }
    setSendingNota(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: nuevaNota }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setNotas((prev) => [data, ...prev]);
      setNuevaNota('');
      showToast('Nota enviada al paciente');
    } catch {
      showToast('Error al enviar la nota', 'err');
    } finally {
      setSendingNota(false);
    }
  }

  async function handleGuardarMedicion(m: Omit<MedicionInbody, 'id' | 'paciente_id'>) {
    if (isMock) {
      const fake: MedicionInbody = { id: `m${Date.now()}`, paciente_id: pacienteId, ...m };
      setMediciones((prev) => [...prev, fake].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setModalMedicion(false);
      showToast('Medición agregada (demo)');
      return;
    }
    setSavingMedicion(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/mediciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setMediciones((prev) => [...prev, data].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setModalMedicion(false);
      showToast('Medición guardada');
    } catch {
      showToast('Error al guardar medición', 'err');
    } finally {
      setSavingMedicion(false);
    }
  }

  function toggleMetrica(key: MetricaKey) {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const estado        = getEstado(adherencia);
  const nombreCompleto = paciente ? `${paciente.nombre}${paciente.apellido ? ' ' + paciente.apellido : ''}` : '';
  const hasLeftAxis   = METRICAS.some((m) => m.axis === 'left'  && visibleMetrics.has(m.key));
  const hasRightAxis  = METRICAS.some((m) => m.axis === 'right' && visibleMetrics.has(m.key));
  const { pPct, cPct, gPct } = macroCalc(planEdit.proteinas, planEdit.carbos, planEdit.grasas);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-100 rounded-xl w-64" />
        <div className="h-48 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!paciente) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Mock banner ── */}
      {isMock && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-500">⚠️</span>
          <p className="text-sm text-amber-700">
            <strong>Datos de ejemplo</strong> — Este paciente no existe en la base de datos.
            Los cambios no se guardarán permanentemente.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          1. HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-5">
        {/* Back link */}
        <Link
          href="/nutriologo/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al dashboard
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 text-xl font-bold flex items-center justify-center flex-shrink-0">
              {(paciente.nombre.charAt(0) + (paciente.apellido?.charAt(0) ?? '')).toUpperCase()}
            </div>
            <div>
              {/* Nombre */}
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">{nombreCompleto}</h1>
              {/* Email */}
              <p className="text-sm text-slate-400 mt-0.5">{paciente.email}</p>

              {/* Objetivo selector */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400 font-medium">Meta:</span>
                <div className="relative">
                  <select
                    value={objetivo}
                    disabled={savingObj}
                    onChange={(e) => handleObjetivoChange(e.target.value)}
                    className="text-sm font-semibold text-brand-700 bg-brand-50 border-0 rounded-lg px-3 py-1 pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none disabled:opacity-50"
                  >
                    <option value="">Sin meta definida</option>
                    {OBJETIVOS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-500" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {savingObj && <span className="text-xs text-slate-400">Guardando…</span>}
              </div>
            </div>
          </div>

          {/* Badge de estado + adherencia */}
          <div className="flex flex-col items-end gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full',
              estado.bg, estado.text,
            )}>
              <span className={cn('w-2 h-2 rounded-full', estado.dot)} />
              {estado.label}
            </span>
            <p className="text-xs text-slate-400">Adherencia: <strong className="text-slate-700">{adherencia}%</strong> esta semana</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. INBODY
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="InBody — Evolución corporal"
        icon="📈"
        action={
          <button
            onClick={() => setModalMedicion(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="text-sm leading-none">+</span> Agregar medición
          </button>
        }
      >
        {/* Toggles de métricas */}
        <div className="flex flex-wrap gap-2 mb-5">
          {METRICAS.map((m) => {
            const active = visibleMetrics.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggleMetrica(m.key)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
                )}
                style={active ? { backgroundColor: m.color, borderColor: m.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : m.color }}
                />
                {m.label}
              </button>
            );
          })}
        </div>

        {mediciones.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-4xl">📊</span>
            <p className="font-medium text-slate-600">Sin mediciones registradas</p>
            <p className="text-sm text-slate-400">Agrega la primera medición InBody del paciente</p>
            <button
              onClick={() => setModalMedicion(true)}
              className="text-sm text-brand-600 hover:underline mt-1"
            >
              + Agregar primera medición
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mediciones} margin={{ top: 5, right: hasRightAxis ? 20 : 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="fecha"
                tickFormatter={formatFecha}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              {hasLeftAxis && (
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  domain={['auto', 'auto']}
                  width={42}
                />
              )}
              {hasRightAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  unit="kg"
                  domain={['auto', 'auto']}
                  width={42}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              {METRICAS.map((m) => (
                <Line
                  key={m.key}
                  yAxisId={m.axis}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: m.color, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  hide={!visibleMetrics.has(m.key)}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          3. PADECIMIENTOS
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="Padecimientos"
        icon="🩺"
        action={
          <button
            onClick={handleGuardarPadecimientos}
            disabled={savingPad}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 disabled:opacity-50 transition-colors"
          >
            {savingPad ? 'Guardando…' : 'Guardar cambios'}
          </button>
        }
      >
        {/* Lista de chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {padecimientos.length === 0 && (
            <p className="text-sm text-slate-400">Sin padecimientos registrados</p>
          )}
          {padecimientos.map((pad) => (
            <span
              key={pad}
              className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-sm font-medium px-3 py-1.5 rounded-full"
            >
              {pad}
              <button
                onClick={() => handleEliminarPadecimiento(pad)}
                className="text-red-400 hover:text-red-700 leading-none ml-0.5 text-base"
                aria-label={`Eliminar ${pad}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Agregar nuevo */}
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoPad}
            onChange={(e) => setNuevoPad(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAgregarPadecimiento()}
            placeholder="Ej: Diabetes tipo 2, Hipertensión…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            onClick={handleAgregarPadecimiento}
            disabled={!nuevoPad.trim()}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-40 transition-colors"
          >
            + Agregar
          </button>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          4. PLAN NUTRICIONAL
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        title="Plan nutricional"
        icon="📋"
        action={
          planDirty ? (
            <button
              onClick={handleGuardarPlan}
              disabled={savingPlan}
              className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {savingPlan ? 'Guardando…' : 'Guardar cambios'}
            </button>
          ) : (
            <span className="text-xs text-slate-400">Sin cambios pendientes</span>
          )
        }
      >
        {/* Calorías */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
            Calorías diarias
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={planEdit.calorias || ''}
              onChange={(e) => updatePlanField('calorias', parseInt(e.target.value) || 0)}
              placeholder="2000"
              className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <span className="text-slate-400 font-medium">kcal / día</span>
          </div>
        </div>

        {/* Macros */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
            Distribución de macros
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Proteínas',     key: 'proteinas' as const, color: 'bg-blue-500',   pct: pPct, cal: planEdit.proteinas * 4 },
              { label: 'Carbohidratos', key: 'carbos'    as const, color: 'bg-amber-400',  pct: cPct, cal: planEdit.carbos * 4    },
              { label: 'Grasas',        key: 'grasas'    as const, color: 'bg-rose-400',   pct: gPct, cal: planEdit.grasas * 9    },
            ].map(({ label, key, color, pct, cal }) => (
              <div key={key} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-2.5 h-2.5 rounded-full', color)} />
                    <span className="text-xs font-semibold text-slate-600">{label}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{pct}%</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <input
                    type="number"
                    value={planEdit[key] || ''}
                    onChange={(e) => updatePlanField(key, parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <span className="text-slate-400 text-sm">g</span>
                  <span className="text-slate-400 text-xs ml-auto">{cal} kcal</span>
                </div>
                {/* Mini barra */}
                <div className="mt-2 bg-slate-200 rounded-full h-1 overflow-hidden">
                  <div className={cn('h-1 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restricciones */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
            Restricciones dietéticas
          </label>
          <div className="flex flex-wrap gap-2">
            {RESTRICCIONES_OPCIONES.map((r) => {
              const active = planEdit.restricciones.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleRestriccion(r)}
                  className={cn(
                    'text-sm font-medium px-3 py-1.5 rounded-full border transition-all',
                    active
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600',
                  )}
                >
                  {active && <span className="mr-1">✓</span>}{r}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          5. NOTAS DEL NUTRIÓLOGO
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard title="Notas para el paciente" icon="📝">
        {/* Nueva nota */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Nueva nota
          </label>
          <textarea
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            placeholder="Escribe un mensaje o nota para el paciente… aparecerá en su app."
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none placeholder:text-slate-300"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {nuevaNota.length > 0 ? `${nuevaNota.length} caracteres` : 'El paciente recibirá la nota en su app'}
            </span>
            <button
              onClick={handleEnviarNota}
              disabled={!nuevaNota.trim() || sendingNota}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sendingNota ? (
                'Enviando…'
              ) : (
                <>
                  <span>📨</span> Enviar nota
                </>
              )}
            </button>
          </div>
        </div>

        {/* Historial */}
        {notas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Historial</p>
            <div className="space-y-3">
              {notas.map((nota) => (
                <div
                  key={nota.id}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-xs text-slate-400">{formatFechaLarga(nota.fecha)}</p>
                    {nota.leida ? (
                      <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Leída</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium flex-shrink-0">● Sin leer</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{nota.mensaje}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {notas.length === 0 && (
          <div className="text-center py-6 text-slate-400">
            <span className="text-3xl">📭</span>
            <p className="text-sm mt-2">Sin notas enviadas aún</p>
          </div>
        )}
      </SectionCard>

      {/* ── Modal medición ── */}
      {modalMedicion && (
        <ModalMedicion
          onGuardar={handleGuardarMedicion}
          onClose={() => setModalMedicion(false)}
          saving={savingMedicion}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
