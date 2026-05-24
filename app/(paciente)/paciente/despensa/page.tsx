'use client';

import { useState, useEffect, useCallback } from 'react';
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
  calorias_por_100g: number | null;
  proteinas_por_100g: number | null;
  carbohidratos_por_100g: number | null;
  grasas_por_100g: number | null;
  fecha_vencimiento: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Días restantes hasta la fecha de vencimiento (negativo = ya venció). */
function diasHastaVencer(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(`${fecha}T00:00:00`);
  return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
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
  return (
    <div className="bg-slate-100 rounded-2xl h-20 animate-pulse" />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DespensaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

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

  useEffect(() => {
    cargarDespensa();
  }, [cargarDespensa]);

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
      // Actualización optimista: quita el ítem de la lista inmediatamente
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  }

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

        {/* Badge de alertas */}
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
            <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
              Escanea un tiquete de supermercado para agregar tus productos automáticamente
            </p>
          </div>
          <Link href="/paciente/escanear">
            <Button size="lg">📷 Escanear tiquete</Button>
          </Link>
        </div>
      )}

      {/* ── Product list ── */}
      {!loading && productos.length > 0 && (
        <div className="space-y-3">
          {productos.map((p) => {
            const tieneMacros =
              p.calorias_por_100g       !== null ||
              p.proteinas_por_100g      !== null ||
              p.carbohidratos_por_100g  !== null ||
              p.grasas_por_100g         !== null;

            const estaEliminando = eliminando === p.id;

            return (
              <Card
                key={p.id}
                className={cn(
                  'p-4 transition-opacity duration-200',
                  estaEliminando && 'opacity-40 pointer-events-none',
                )}
              >
                <div className="flex items-start gap-3">

                  {/* Icono */}
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
                    🛒
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">

                    {/* Nombre + badge vencimiento */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 capitalize">
                        {p.nombre.toLowerCase()}
                      </p>
                      {p.fecha_vencimiento && (
                        <BadgeVencimiento fecha={p.fecha_vencimiento} />
                      )}
                    </div>

                    {/* Cantidad */}
                    <p className="text-sm text-slate-500 mt-0.5">
                      {p.stock} {p.unidad_medida ?? 'und'}
                    </p>

                    {/* Macros — solo si existen */}
                    {tieneMacros && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {p.calorias_por_100g !== null && (
                          <span className="text-xs text-slate-500">
                            🔥{' '}
                            <span className="font-medium text-slate-700">
                              {p.calorias_por_100g}
                            </span>{' '}
                            kcal
                          </span>
                        )}
                        {p.proteinas_por_100g !== null && (
                          <span className="text-xs text-slate-500">
                            💪{' '}
                            <span className="font-medium text-blue-600">
                              {p.proteinas_por_100g}g
                            </span>{' '}
                            prot
                          </span>
                        )}
                        {p.carbohidratos_por_100g !== null && (
                          <span className="text-xs text-slate-500">
                            🌾{' '}
                            <span className="font-medium text-amber-600">
                              {p.carbohidratos_por_100g}g
                            </span>{' '}
                            carb
                          </span>
                        )}
                        {p.grasas_por_100g !== null && (
                          <span className="text-xs text-slate-500">
                            🥑{' '}
                            <span className="font-medium text-rose-600">
                              {p.grasas_por_100g}g
                            </span>{' '}
                            gras
                          </span>
                        )}
                      </div>
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

      {/* ── FAB "+" ── */}
      {!loading && (
        <Link
          href="/paciente/escanear"
          className={cn(
            'fixed bottom-24 right-4 w-14 h-14 z-10',
            'bg-brand-600 hover:bg-brand-700 active:scale-95',
            'text-white rounded-full shadow-lg',
            'flex items-center justify-center text-3xl font-light',
            'transition-all duration-150',
          )}
          aria-label="Agregar productos escaneando un tiquete"
        >
          +
        </Link>
      )}
    </div>
  );
}
