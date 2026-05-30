'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Card from '@/components/ui/Card';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Alimento {
  id:            string;
  nombre:        string;
  calorias_100g: number;
  proteina_100g: number;
  carbos_100g:   number;
  grasas_100g:   number;
  fibra_100g:    number | null;
  fuente:        'openfoodfacts' | 'usda' | 'manual' | 'ia';
  validado:      boolean;
  imagen_url:    string | null;
  created_at:    string;
}

interface FormAlimento {
  nombre:        string;
  calorias_100g: string;
  proteina_100g: string;
  carbos_100g:   string;
  grasas_100g:   string;
  fibra_100g:    string;
}

const FORM_VACIO: FormAlimento = {
  nombre:        '',
  calorias_100g: '',
  proteina_100g: '',
  carbos_100g:   '',
  grasas_100g:   '',
  fibra_100g:    '',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FUENTES = [
  { value: '',              label: 'Todas las fuentes' },
  { value: 'openfoodfacts', label: 'OpenFoodFacts' },
  { value: 'ia',            label: 'IA (estimado)' },
  { value: 'manual',        label: 'Manual' },
  { value: 'usda',          label: 'USDA' },
] as const;

const FUENTE_BADGE: Record<string, { label: string; cls: string }> = {
  openfoodfacts: { label: 'OpenFoodFacts', cls: 'bg-blue-100 text-blue-700' },
  usda:          { label: 'USDA',          cls: 'bg-purple-100 text-purple-700' },
  manual:        { label: 'Manual',        cls: 'bg-slate-100 text-slate-600' },
  ia:            { label: 'IA',            cls: 'bg-amber-100 text-amber-700' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numCampo(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : Math.round(n * 10) / 10;
}

function alimentoToForm(a: Alimento): FormAlimento {
  return {
    nombre:        a.nombre,
    calorias_100g: String(a.calorias_100g),
    proteina_100g: String(a.proteina_100g),
    carbos_100g:   String(a.carbos_100g),
    grasas_100g:   String(a.grasas_100g),
    fibra_100g:    a.fibra_100g != null ? String(a.fibra_100g) : '',
  };
}

// ─── ModalBase ────────────────────────────────────────────────────────────────

function ModalBase({
  open, onClose, titulo, children,
}: {
  open: boolean; onClose: () => void; titulo: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Drag handle (móvil) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{titulo}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 active:scale-90 transition-all"
            aria-label="Cerrar"
          >✕</button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-5 pt-4 pb-8" style={{ maxHeight: 'calc(100dvh - 120px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── CamposNutricionales ──────────────────────────────────────────────────────

function CamposNutricionales({
  form, onChange,
}: {
  form: FormAlimento;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputCls = cn(
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5',
    'text-sm text-slate-800 placeholder:text-slate-300',
    'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
  );

  const campos = [
    { name: 'calorias_100g', label: 'Calorías / 100g',  unit: 'kcal' },
    { name: 'proteina_100g', label: 'Proteína / 100g',   unit: 'g' },
    { name: 'carbos_100g',   label: 'Carbohidratos / 100g', unit: 'g' },
    { name: 'grasas_100g',   label: 'Grasas / 100g',    unit: 'g' },
    { name: 'fibra_100g',    label: 'Fibra / 100g',      unit: 'g (opcional)' },
  ] as const;

  return (
    <>
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          Nombre del alimento <span className="text-red-400">*</span>
        </label>
        <input
          name="nombre"
          type="text"
          value={form.nombre}
          onChange={onChange}
          placeholder="ej. Pechuga de pollo cocida"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {campos.map(({ name, label, unit }) => (
          <div key={name} className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">{label}</label>
            <div className="relative">
              <input
                name={name}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={(form as unknown as Record<string, string>)[name]}
                onChange={onChange}
                placeholder="0"
                className={cn(inputCls, 'pr-10')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 pointer-events-none">
                {unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Modal: Editar alimento ───────────────────────────────────────────────────

function ModalEditar({
  alimento, onClose, onGuardado,
}: {
  alimento: Alimento | null;
  onClose:  () => void;
  onGuardado: (a: Alimento) => void;
}) {
  const [form,      setForm]      = useState<FormAlimento>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (alimento) setForm(alimentoToForm(alimento));
  }, [alimento]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError(null);
  }

  async function handleGuardar(validar: boolean) {
    if (!alimento || !form.nombre.trim()) { setError('El nombre es requerido.'); return; }
    setGuardando(true);
    setError(null);
    try {
      const body = {
        nombre:        form.nombre.trim(),
        calorias_100g: numCampo(form.calorias_100g) ?? 0,
        proteina_100g: numCampo(form.proteina_100g) ?? 0,
        carbos_100g:   numCampo(form.carbos_100g)   ?? 0,
        grasas_100g:   numCampo(form.grasas_100g)   ?? 0,
        fibra_100g:    numCampo(form.fibra_100g),
        validado:      validar,
      };
      const res  = await fetch(`/api/alimentos/${alimento.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar');
      onGuardado(json.data as Alimento);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ModalBase open={!!alimento} onClose={onClose} titulo="Editar alimento">
      <div className="space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <CamposNutricionales form={form} onChange={handleChange} />

        {/* Fuente actual */}
        {alimento && (
          <p className="text-xs text-slate-400 mt-1">
            Fuente: <span className="font-medium">{FUENTE_BADGE[alimento.fuente]?.label ?? alimento.fuente}</span>
            {' · '}ID: <span className="font-mono">{alimento.id.slice(0, 8)}…</span>
          </p>
        )}

        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100">
          {/* Botón principal: Validar y guardar */}
          <button
            onClick={() => handleGuardar(true)}
            disabled={guardando}
            className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando…</>
            ) : (
              '✓ Validar y guardar'
            )}
          </button>

          {/* Guardar sin validar */}
          <button
            onClick={() => handleGuardar(false)}
            disabled={guardando}
            className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Guardar sin validar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

// ─── Modal: Agregar alimento ──────────────────────────────────────────────────

function ModalAgregar({
  open, onClose, onGuardado,
}: {
  open: boolean; onClose: () => void; onGuardado: (a: Alimento) => void;
}) {
  const [form,         setForm]         = useState<FormAlimento>(FORM_VACIO);
  const [busqueda,     setBusqueda]     = useState('');
  const [buscandoOFF,  setBuscandoOFF]  = useState(false);
  const [offStatus,    setOffStatus]    = useState<'idle' | 'ok' | 'notfound'>('idle');
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const offTimerRef                     = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) { setForm(FORM_VACIO); setBusqueda(''); setOffStatus('idle'); setError(null); }
  }, [open]);

  // Búsqueda debounced en OpenFoodFacts
  useEffect(() => {
    clearTimeout(offTimerRef.current);
    if (busqueda.length < 2) { setOffStatus('idle'); return; }

    offTimerRef.current = setTimeout(async () => {
      setBuscandoOFF(true);
      setOffStatus('idle');
      try {
        const res  = await fetch(`/api/alimentos/buscar-off?q=${encodeURIComponent(busqueda)}`);
        const json = await res.json() as { data: null | {
          nombre?: string; calorias100g?: number; proteina100g?: number;
          carbos100g?: number; grasas100g?: number; fibra100g?: number | null;
        }};

        if (json.data && (json.data.calorias100g ?? 0) > 0) {
          setForm((p) => ({
            ...p,
            nombre:        json.data!.nombre || busqueda,
            calorias_100g: String(json.data!.calorias100g ?? ''),
            proteina_100g: String(json.data!.proteina100g ?? ''),
            carbos_100g:   String(json.data!.carbos100g   ?? ''),
            grasas_100g:   String(json.data!.grasas100g   ?? ''),
            fibra_100g:    json.data!.fibra100g != null ? String(json.data!.fibra100g) : '',
          }));
          setOffStatus('ok');
        } else {
          setOffStatus('notfound');
        }
      } catch {
        setOffStatus('notfound');
      } finally {
        setBuscandoOFF(false);
      }
    }, 600);

    return () => clearTimeout(offTimerRef.current);
  }, [busqueda]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError(null);
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return; }
    setGuardando(true); setError(null);
    try {
      const res  = await fetch('/api/alimentos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nombre:        form.nombre.trim(),
          calorias_100g: numCampo(form.calorias_100g) ?? 0,
          proteina_100g: numCampo(form.proteina_100g) ?? 0,
          carbos_100g:   numCampo(form.carbos_100g)   ?? 0,
          grasas_100g:   numCampo(form.grasas_100g)   ?? 0,
          fibra_100g:    numCampo(form.fibra_100g),
          fuente:        offStatus === 'ok' ? 'openfoodfacts' : 'manual',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar');
      onGuardado(json.data as Alimento);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ModalBase open={open} onClose={onClose} titulo="Agregar alimento">
      <div className="space-y-3">
        {/* Buscador OpenFoodFacts */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Buscar en OpenFoodFacts
          </label>
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="ej. pechuga de pollo"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {buscandoOFF && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {offStatus === 'ok' && (
            <p className="text-xs text-brand-600 mt-1 font-medium">✓ Datos pre-llenados desde OpenFoodFacts — podés editar</p>
          )}
          {offStatus === 'notfound' && (
            <p className="text-xs text-slate-400 mt-1">No encontrado en OpenFoodFacts — ingresá los valores manualmente</p>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2 mb-3">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}
          <CamposNutricionales form={form} onChange={handleChange} />
        </div>

        <p className="text-xs text-slate-400">
          Se guardará como <strong>validado ✓</strong> y fuente <strong>
            {offStatus === 'ok' ? 'OpenFoodFacts' : 'Manual'}
          </strong>
        </p>

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full mt-2 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {guardando ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando…</>
          ) : (
            '+ Agregar alimento'
          )}
        </button>
      </div>
    </ModalBase>
  );
}

// ─── Modal: Importar alimentos base ──────────────────────────────────────────

function ModalImportar({
  open, onClose, onImportado,
}: {
  open: boolean; onClose: () => void; onImportado: () => void;
}) {
  const [estado, setEstado]   = useState<'idle' | 'importando' | 'listo'>('idle');
  const [resultado, setRes]   = useState<{ importados: number; yaExistentes: number; noEncontrados: number; total: number } | null>(null);

  useEffect(() => {
    if (open) { setEstado('idle'); setRes(null); }
  }, [open]);

  async function handleImportar() {
    setEstado('importando');
    try {
      const res  = await fetch('/api/alimentos/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const json = await res.json();
      setRes(json);
      setEstado('listo');
      onImportado();
    } catch {
      setEstado('idle');
    }
  }

  return (
    <ModalBase open={open} onClose={onClose} titulo="Importar alimentos base">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Importa los alimentos más comunes de Costa Rica consultando OpenFoodFacts.
          Los que no se encuentren allí <strong>no se importarán</strong> (sin estimación por IA).
        </p>

        <div className="bg-slate-50 rounded-xl p-3 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">50 alimentos de la lista</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            arroz blanco · frijoles negros · frijoles rojos · pollo cocido · carne molida ·
            huevo · leche · queso · natilla · pan blanco · tortilla de maíz · plátano maduro ·
            plátano verde · yuca · papa · zanahoria · chayote · ayote · tomate · cebolla ·
            chile dulce · ajo · culantro · apio · limón · naranja · banano · mango · piña ·
            sandía · atún · sardina · jamón · mortadela · salchicha · aceite · mantequilla ·
            azúcar · sal · avena · pasta · espagueti · lechuga · pepino · brócoli ·
            coliflor · elote · palmito · pejibaye · cas
          </p>
        </div>

        {estado === 'importando' && (
          <div className="flex items-center gap-3 py-4 justify-center">
            <span className="w-6 h-6 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-sm text-brand-600 font-medium">Consultando OpenFoodFacts… puede tomar 10-20 segundos</p>
          </div>
        )}

        {estado === 'listo' && resultado && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-brand-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-brand-700">{resultado.importados}</p>
              <p className="text-xs text-brand-500 mt-0.5">Importados</p>
            </div>
            <div className="bg-slate-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-600">{resultado.yaExistentes}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ya existían</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{resultado.noEncontrados}</p>
              <p className="text-xs text-amber-500 mt-0.5">No encontrados</p>
            </div>
          </div>
        )}

        {estado !== 'listo' && (
          <button
            onClick={handleImportar}
            disabled={estado === 'importando'}
            className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {estado === 'importando' ? 'Importando…' : '⬇ Importar alimentos base'}
          </button>
        )}

        {estado === 'listo' && (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
          >
            Cerrar
          </button>
        )}
      </div>
    </ModalBase>
  );
}

// ─── AlimentoCard ─────────────────────────────────────────────────────────────

function AlimentoCard({ alimento, onClick }: { alimento: Alimento; onClick: () => void }) {
  const fb = FUENTE_BADGE[alimento.fuente] ?? { label: alimento.fuente, cls: 'bg-slate-100 text-slate-600' };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-sm active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Nombre + badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <p className="font-semibold text-slate-800 capitalize text-sm leading-snug">
              {alimento.nombre}
            </p>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', fb.cls)}>
              {fb.label}
            </span>
            {alimento.validado ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                ✓ Validado
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                ⚡ Por revisar
              </span>
            )}
          </div>

          {/* Macros por 100g */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-xs text-slate-500">
              🔥 <span className="font-semibold text-slate-700">{alimento.calorias_100g}</span> kcal
            </span>
            <span className="text-xs text-slate-500">
              💪 <span className="font-semibold text-blue-600">{alimento.proteina_100g}g</span> prot
            </span>
            <span className="text-xs text-slate-500">
              🌾 <span className="font-semibold text-amber-600">{alimento.carbos_100g}g</span> carb
            </span>
            <span className="text-xs text-slate-500">
              🥑 <span className="font-semibold text-rose-600">{alimento.grasas_100g}g</span> gras
            </span>
            {alimento.fibra_100g != null && (
              <span className="text-xs text-slate-400">
                🌿 {alimento.fibra_100g}g fibra
              </span>
            )}
          </div>
        </div>

        {/* Icono editar */}
        <span className="flex-shrink-0 text-slate-300 text-lg mt-0.5">✎</span>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventarioPage() {
  const [alimentos,     setAlimentos]     = useState<Alimento[]>([]);
  const [total,         setTotal]         = useState(0);
  const [pages,         setPages]         = useState(1);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [busqueda,      setBusqueda]      = useState('');
  const [filtroFuente,  setFiltroFuente]  = useState('');
  const [filtroValid,   setFiltroValid]   = useState('');   // '' | 'true' | 'false'
  const [modalEditar,   setModalEditar]   = useState<Alimento | null>(null);
  const [modalAgregar,  setModalAgregar]  = useState(false);
  const [modalImportar, setModalImportar] = useState(false);

  // ── Cargar datos ────────────────────────────────────────────────────────────

  const cargar = useCallback(async (pg: number, q: string, fuente: string, valid: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)      params.set('q', q);
      if (fuente) params.set('fuente', fuente);
      if (valid)  params.set('validado', valid);
      params.set('page', String(pg));

      const res  = await fetch(`/api/alimentos?${params}`);
      const json = await res.json() as { data: Alimento[]; total: number; pages: number };
      setAlimentos(json.data ?? []);
      setTotal(json.total ?? 0);
      setPages(json.pages ?? 1);
    } catch (err) {
      console.error('[inventario] cargar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial y cuando cambian filtros/página
  useEffect(() => {
    const t = setTimeout(() => {
      cargar(page, busqueda, filtroFuente, filtroValid);
    }, busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [page, busqueda, filtroFuente, filtroValid, cargar]);

  // Reset page al cambiar filtros
  useEffect(() => { setPage(1); }, [busqueda, filtroFuente, filtroValid]);

  // ── Callbacks ───────────────────────────────────────────────────────────────

  function handleGuardado(actualizado: Alimento) {
    setAlimentos((prev) => prev.map((a) => a.id === actualizado.id ? actualizado : a));
  }

  function handleAgregado(nuevo: Alimento) {
    // Si está en la página 1, agregar al inicio
    if (page === 1) setAlimentos((prev) => [nuevo, ...prev.slice(0, 19)]);
    setTotal((t) => t + 1);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  const validados    = alimentos.filter((a) => a.validado).length;
  const porRevisar   = alimentos.filter((a) => !a.validado).length;

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="pt-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Catálogo de Alimentos</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {loading ? 'Cargando…' : `${total.toLocaleString('es-CR')} alimentos en total`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setModalImportar(true)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ⬇ Importar base CR
            </button>
            <button
              onClick={() => setModalAgregar(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors"
            >
              + Agregar alimento
            </button>
          </div>
        </div>

        {/* Stats pills */}
        {!loading && alimentos.length > 0 && (
          <div className="flex gap-3 mt-3 flex-wrap">
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              ✓ {validados} validados
            </span>
            {porRevisar > 0 && (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                ⚡ {porRevisar} por revisar
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Buscador ── */}
      <div className="relative">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar alimento por nombre…"
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-base">🔍</span>
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Filtro por fuente */}
        <select
          value={filtroFuente}
          onChange={(e) => setFiltroFuente(e.target.value)}
          className="flex-shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none"
        >
          {FUENTES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Filtro por validación */}
        {['', 'true', 'false'].map((v) => (
          <button
            key={v}
            onClick={() => setFiltroValid(v)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
              filtroValid === v
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300',
            )}
          >
            {v === '' ? 'Todos' : v === 'true' ? '✓ Validados' : '⚡ Por revisar'}
          </button>
        ))}
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : alimentos.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-4xl mb-3">🥦</p>
          <p className="font-semibold text-slate-700">
            {busqueda || filtroFuente || filtroValid ? 'Sin resultados para este filtro' : 'Catálogo vacío'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {busqueda ? `No se encontraron alimentos con "${busqueda}"` : 'Usá "Importar base CR" para cargar alimentos comunes o agrega uno manualmente.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {alimentos.map((a) => (
            <AlimentoCard
              key={a.id}
              alimento={a}
              onClick={() => setModalEditar(a)}
            />
          ))}
        </div>
      )}

      {/* ── Paginación ── */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            ← Anterior
          </button>

          <span className="text-sm text-slate-500">
            Página <strong>{page}</strong> de <strong>{pages}</strong>
          </span>

          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* ── Nota de cálculo ── */}
      {!loading && alimentos.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Todos los valores son por 100g · En planes nutricionales se calcula: macros × (gramos / 100)
        </p>
      )}

      {/* ── Modals ── */}
      <ModalEditar
        alimento={modalEditar}
        onClose={() => setModalEditar(null)}
        onGuardado={handleGuardado}
      />
      <ModalAgregar
        open={modalAgregar}
        onClose={() => setModalAgregar(false)}
        onGuardado={handleAgregado}
      />
      <ModalImportar
        open={modalImportar}
        onClose={() => setModalImportar(false)}
        onImportado={() => cargar(1, busqueda, filtroFuente, filtroValid)}
      />
    </div>
  );
}
