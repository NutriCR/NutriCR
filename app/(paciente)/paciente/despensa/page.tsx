'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Producto {
  id: string;
  nombre: string;
  stock: number;
  unidad_medida: string | null;
  categoria: string | null;
  calorias_por_100g: number | null;
  proteinas_por_100g: number | null;
  carbohidratos_por_100g: number | null;
  grasas_por_100g: number | null;
  alimento_id: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
}

interface MacrosTotales {
  calorias: number;
  proteina: number;
  carbos:   number;
  grasas:   number;
}

interface FormState {
  nombre:            string;
  cantidad:          string;
  unidad:            string;
  categoria:         string;
  fecha_vencimiento: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIDADES = ['gramos', 'kg', 'unidades', 'litros', 'ml', 'tazas'] as const;

const CATEGORIAS = [
  'Proteínas',
  'Carbohidratos',
  'Verduras',
  'Frutas',
  'Lácteos',
  'Grasas',
  'Otros',
] as const;

const CATEGORIA_EMOJI: Record<string, string> = {
  'Proteínas':     '🥩',
  'Carbohidratos': '🌾',
  'Verduras':      '🥦',
  'Frutas':        '🍎',
  'Lácteos':       '🥛',
  'Grasas':        '🥑',
  'Otros':         '🛒',
  'tiquete-escaneado': '🛒',
};

const FORM_INICIAL: FormState = {
  nombre:            '',
  cantidad:          '',
  unidad:            'gramos',
  categoria:         'Otros',
  fecha_vencimiento: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte la cantidad en stock a gramos según la unidad.
 * Retorna null para unidades que no tienen conversión directa (unidades, tazas).
 */
function stockEnGramos(stock: number, unidad: string | null): number | null {
  switch (unidad) {
    case 'gramos':  return stock;
    case 'kg':      return stock * 1000;
    case 'ml':      return stock;          // aprox: 1 ml ≈ 1 g para líquidos comunes
    case 'litros':  return stock * 1000;
    case 'tazas':   return stock * 240;    // 1 taza ≈ 240 g
    default:        return null;           // 'unidades' u otro
  }
}

/**
 * Calcula las macros totales de un producto según su stock.
 * Devuelve null si no hay datos nutricionales o la unidad no es convertible.
 */
function calcularMacrosTotales(p: Producto): MacrosTotales | null {
  if (
    p.calorias_por_100g === null &&
    p.proteinas_por_100g === null
  ) return null;

  const gramos = stockEnGramos(p.stock, p.unidad_medida);
  if (!gramos || gramos <= 0) return null;

  const factor = gramos / 100;
  return {
    calorias: Math.round((p.calorias_por_100g      ?? 0) * factor),
    proteina: Math.round((p.proteinas_por_100g     ?? 0) * factor),
    carbos:   Math.round((p.carbohidratos_por_100g ?? 0) * factor),
    grasas:   Math.round((p.grasas_por_100g        ?? 0) * factor),
  };
}

function diasHastaVencer(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(`${fecha}T00:00:00`);
  return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

/** Devuelve hoy en formato YYYY-MM-DD para el min del date picker. */
function hoyISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BadgeVencimiento({ fecha }: { fecha: string }) {
  const dias = diasHastaVencer(fecha);
  if (dias < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
        ⚠️ Vencido
      </span>
    );
  }
  if (dias === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
        ⏰ Vence hoy
      </span>
    );
  }
  if (dias <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
        ⏰ Vence en {dias}d
      </span>
    );
  }
  return null;
}

function SkeletonCard() {
  return <div className="bg-slate-100 rounded-2xl h-20 animate-pulse" />;
}

// ─── Modal: Agregar producto ──────────────────────────────────────────────────

interface ModalAgregarProps {
  open:       boolean;
  onClose:    () => void;
  onGuardado: (producto: Producto) => void;
}

function ModalAgregar({ open, onClose, onGuardado }: ModalAgregarProps) {
  const [form,      setForm]      = useState<FormState>(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const inputNombreRef            = useRef<HTMLInputElement>(null);

  // Resetear el form y enfocar el primer campo al abrir
  useEffect(() => {
    if (open) {
      setForm(FORM_INICIAL);
      setError(null);
      // Pequeño delay para que la animación de entrada no interfiera con el foco
      const t = setTimeout(() => inputNombreRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevenir scroll del body mientras el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validación cliente
    if (!form.nombre.trim()) {
      setError('El nombre del producto es requerido.');
      inputNombreRef.current?.focus();
      return;
    }
    const cantidad = parseFloat(form.cantidad);
    if (!form.cantidad || isNaN(cantidad) || cantidad <= 0) {
      setError('Ingresá una cantidad válida mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/despensa', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nombre:            form.nombre.trim(),
          cantidad,
          unidad:            form.unidad,
          categoria:         form.categoria,
          fecha_vencimiento: form.fecha_vencimiento || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar');

      // El endpoint devuelve { data: [producto] }
      const nuevo: Producto = json.data?.[0];
      if (nuevo) onGuardado(nuevo);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {/* ── Overlay ── */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Bottom sheet ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agregar producto a despensa"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'bg-white rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Agregar producto</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Form — scroll interno para pantallas pequeñas */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-5 pt-4 pb-8 space-y-4"
          style={{ maxHeight: 'calc(100dvh - 140px)' }}
        >

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <span className="text-red-400 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ── Nombre ── */}
          <div className="space-y-1.5">
            <label htmlFor="nombre" className="block text-sm font-semibold text-slate-700">
              Nombre del producto <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputNombreRef}
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              placeholder="ej. Pechuga de pollo"
              autoComplete="off"
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-base text-slate-800',
                'placeholder:text-slate-300',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                'transition-shadow duration-150',
                'border-slate-200 bg-white',
              )}
            />
          </div>

          {/* ── Cantidad + Unidad en la misma fila ── */}
          <div className="grid grid-cols-[1fr_140px] gap-3">

            <div className="space-y-1.5">
              <label htmlFor="cantidad" className="block text-sm font-semibold text-slate-700">
                Cantidad <span className="text-red-400">*</span>
              </label>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={form.cantidad}
                onChange={handleChange}
                placeholder="0"
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-base text-slate-800',
                  'placeholder:text-slate-300',
                  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                  'transition-shadow duration-150',
                  'border-slate-200 bg-white',
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="unidad" className="block text-sm font-semibold text-slate-700">
                Unidad
              </label>
              <select
                id="unidad"
                name="unidad"
                value={form.unidad}
                onChange={handleChange}
                className={cn(
                  'w-full rounded-xl border px-3 py-3 text-base text-slate-800',
                  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                  'transition-shadow duration-150',
                  'border-slate-200 bg-white',
                  'appearance-none',
                )}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Categoría ── */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Categoría
            </label>
            {/* Pill selector — más fácil de tocar en móvil que un <select> */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, categoria: cat }))}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-150 active:scale-95',
                    form.categoria === cat
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300',
                  )}
                >
                  {CATEGORIA_EMOJI[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── Fecha de vencimiento ── */}
          <div className="space-y-1.5">
            <label htmlFor="fecha_vencimiento" className="block text-sm font-semibold text-slate-700">
              Fecha de vencimiento{' '}
              <span className="text-slate-400 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="fecha_vencimiento"
              name="fecha_vencimiento"
              type="date"
              min={hoyISO()}
              value={form.fecha_vencimiento}
              onChange={handleChange}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-base text-slate-800',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                'transition-shadow duration-150',
                'border-slate-200 bg-white',
                !form.fecha_vencimiento && 'text-slate-300',
              )}
            />
          </div>

          {/* ── Botón submit ── */}
          <button
            type="submit"
            disabled={guardando}
            className={cn(
              'w-full rounded-2xl py-4 text-base font-bold text-white',
              'bg-brand-600 hover:bg-brand-700 active:scale-[0.98]',
              'transition-all duration-150 shadow-md',
              'flex items-center justify-center gap-2',
              guardando && 'opacity-70 pointer-events-none',
            )}
          >
            {guardando ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando…
              </>
            ) : (
              '✓ Agregar a despensa'
            )}
          </button>

        </form>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DespensaPage() {
  const [productos,  setProductos]  = useState<Producto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  const cargarDespensa = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/despensa');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar la despensa');
      setProductos(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDespensa(); }, [cargarDespensa]);

  // ── Agregar producto (callback desde el modal) ─────────────────────────────

  const handleProductoGuardado = useCallback((nuevo: Producto) => {
    // Agrega el nuevo producto al inicio de la lista sin recargar
    setProductos((prev) => [nuevo, ...prev]);
  }, []);

  // ── Eliminar ───────────────────────────────────────────────────────────────

  async function handleEliminar(id: string) {
    setEliminando(id);
    setError(null);
    try {
      const res = await fetch(`/api/despensa/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Error al eliminar');
      }
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  }

  // ── Totales nutricionales de toda la despensa ─────────────────────────────

  const totalDespensa = productos.reduce<MacrosTotales | null>((acc, p) => {
    const m = calcularMacrosTotales(p);
    if (!m) return acc;
    if (!acc) return { ...m };
    return {
      calorias: acc.calorias + m.calorias,
      proteina: acc.proteina + m.proteina,
      carbos:   acc.carbos   + m.carbos,
      grasas:   acc.grasas   + m.grasas,
    };
  }, null);

  // ── Render ─────────────────────────────────────────────────────────────────

  const proxAVencer = productos.filter(
    (p) => p.fecha_vencimiento && diasHastaVencer(p.fecha_vencimiento) <= 3,
  ).length;

  return (
    <div className="space-y-5 pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mi Despensa</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading
              ? 'Cargando…'
              : `${productos.length} producto${productos.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {proxAVencer > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
            ⏰ {proxAVencer} por vencer
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700 break-words">{error}</p>
              <button
                onClick={cargarDespensa}
                className="text-xs text-red-500 underline mt-1"
              >
                Reintentar
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Skeletons ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && productos.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-12 text-center">
          <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center text-5xl shadow-inner">
            🥫
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-lg">Tu despensa está vacía</p>
            <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
              Usá el botón <strong className="text-slate-600">+</strong> para agregar productos
              manualmente o escaneá un tiquete del supermercado.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-brand-600 text-white font-semibold px-5 py-3 rounded-2xl shadow-md hover:bg-brand-700 active:scale-95 transition-all"
            >
              ✏️ Agregar manualmente
            </button>
            <Link href="/paciente/escanear">
              <Button variant="secondary" size="lg">📷 Escanear tiquete</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Product list ── */}
      {!loading && productos.length > 0 && (
        <div className="space-y-3">
          {productos.map((p) => {
            const macrosTotales  = calcularMacrosTotales(p);
            const tienePor100g   = p.calorias_por_100g !== null || p.proteinas_por_100g !== null;
            const estaEliminando = eliminando === p.id;
            const emoji          = CATEGORIA_EMOJI[p.categoria ?? ''] ?? '🛒';

            return (
              <Card
                key={p.id}
                className={cn(
                  'p-4 transition-opacity duration-200',
                  estaEliminando && 'opacity-40 pointer-events-none',
                )}
              >
                <div className="flex items-start gap-3">

                  {/* Icono según categoría */}
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
                    {emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">

                    {/* Nombre + badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 capitalize">
                        {p.nombre.toLowerCase()}
                      </p>
                      {p.fecha_vencimiento && (
                        <BadgeVencimiento fecha={p.fecha_vencimiento} />
                      )}
                    </div>

                    {/* Cantidad + categoría */}
                    <p className="text-sm text-slate-500 mt-0.5">
                      {p.stock} {p.unidad_medida ?? 'und'}
                      {p.categoria && p.categoria !== 'tiquete-escaneado' && (
                        <span className="ml-2 text-xs text-slate-400">· {p.categoria}</span>
                      )}
                    </p>

                    {/* Macros TOTALES del stock (calorías/100g × gramos en stock) */}
                    {macrosTotales && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        <span className="text-xs text-slate-500">
                          🔥 <span className="font-semibold text-slate-700">{macrosTotales.calorias}</span> kcal
                        </span>
                        <span className="text-xs text-slate-500">
                          💪 <span className="font-semibold text-blue-600">{macrosTotales.proteina}g</span> prot
                        </span>
                        <span className="text-xs text-slate-500">
                          🌾 <span className="font-semibold text-amber-600">{macrosTotales.carbos}g</span> carb
                        </span>
                        <span className="text-xs text-slate-500">
                          🥑 <span className="font-semibold text-rose-600">{macrosTotales.grasas}g</span> gras
                        </span>
                      </div>
                    )}

                    {/* Fallback: valores por 100g cuando la unidad no es convertible */}
                    {!macrosTotales && tienePor100g && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {p.calorias_por_100g !== null && (
                          <span className="text-xs text-slate-400">
                            🔥 <span className="font-medium">{p.calorias_por_100g}</span> kcal/100g
                          </span>
                        )}
                        {p.proteinas_por_100g !== null && (
                          <span className="text-xs text-slate-400">
                            💪 <span className="font-medium">{p.proteinas_por_100g}g</span> prot/100g
                          </span>
                        )}
                        {p.carbohidratos_por_100g !== null && (
                          <span className="text-xs text-slate-400">
                            🌾 <span className="font-medium">{p.carbohidratos_por_100g}g</span> carb/100g
                          </span>
                        )}
                        {p.grasas_por_100g !== null && (
                          <span className="text-xs text-slate-400">
                            🥑 <span className="font-medium">{p.grasas_por_100g}g</span> gras/100g
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badge fuente (si tiene alimento_id = datos encontrados) */}
                    {p.alimento_id && (
                      <span className="inline-block mt-1.5 text-[10px] text-brand-500 font-medium">
                        ✓ datos nutricionales
                      </span>
                    )}
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={() => handleEliminar(p.id)}
                    disabled={estaEliminando}
                    className="text-slate-300 hover:text-red-400 active:scale-90 transition-all text-2xl leading-none flex-shrink-0 p-1 -mr-1"
                    aria-label={`Eliminar ${p.nombre}`}
                  >
                    {estaEliminando ? (
                      <span className="block w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '×'
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Resumen nutricional total de la despensa ── */}
      {!loading && totalDespensa && (
        <Card className="p-4 bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0 shadow-lg">
          <p className="text-sm font-semibold text-white/80 mb-3">
            📊 Total nutricional de tu despensa
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold">{totalDespensa.calorias.toLocaleString('es-CR')}</p>
              <p className="text-xs text-white/70 mt-0.5">kcal</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDespensa.proteina}g</p>
              <p className="text-xs text-white/70 mt-0.5">proteína</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDespensa.carbos}g</p>
              <p className="text-xs text-white/70 mt-0.5">carbos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDespensa.grasas}g</p>
              <p className="text-xs text-white/70 mt-0.5">grasas</p>
            </div>
          </div>
          <p className="text-[10px] text-white/50 text-center mt-3">
            Suma de los productos con cantidad en gramos, kg, ml o litros
          </p>
        </Card>
      )}

      {/* ── FAB "+" → abre modal ── */}
      {!loading && (
        <button
          onClick={() => setModalOpen(true)}
          className={cn(
            'fixed bottom-24 right-4 w-14 h-14 z-10',
            'bg-brand-600 hover:bg-brand-700 active:scale-95',
            'text-white rounded-full shadow-lg',
            'flex items-center justify-center text-3xl font-light',
            'transition-all duration-150',
          )}
          aria-label="Agregar producto a la despensa"
        >
          +
        </button>
      )}

      {/* ── Modal ── */}
      <ModalAgregar
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGuardado={handleProductoGuardado}
      />

    </div>
  );
}
