'use client';

import { useState, useEffect, useRef } from 'react';

interface EntradaDiario {
  id: string;
  foto_url: string;
  descripcion: string | null;
  created_at: string;
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function DiarioPage() {
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [descripcion, setDesc]    = useState('');
  const [subiendo, setSubiendo]   = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [historial, setHistorial] = useState<EntradaDiario[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState<EntradaDiario | null>(null);

  // ── Cargar historial ────────────────────────────────────────────────────────
  async function cargarHistorial() {
    setCargando(true);
    try {
      const res  = await fetch('/api/diario');
      const json = await res.json();
      if (res.ok) setHistorial(json.data ?? []);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarHistorial(); }, []);

  // ── Seleccionar archivo ─────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg('La imagen no puede superar 10 MB.');
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  }

  function cancelarPreview() {
    setPreview(null);
    setFile(null);
    setDesc('');
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Subir foto ─────────────────────────────────────────────────────────────
  async function handleSubir() {
    if (!file) return;
    setSubiendo(true);
    setErrorMsg(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      if (descripcion.trim()) fd.append('descripcion', descripcion.trim());

      const res  = await fetch('/api/diario', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error ?? 'Error al subir la foto.');
        return;
      }

      // Agregar al inicio del historial y limpiar preview
      setHistorial((prev) => [json.data, ...prev].slice(0, 10));
      cancelarPreview();
    } catch {
      setErrorMsg('Error de conexión. Intentá de nuevo.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Diario de comidas</h2>
        <p className="text-sm text-slate-400 mt-0.5">Fotografiá lo que comés para que tu nutriólogo pueda verlo</p>
      </div>

      {/* ── Zona de captura ── */}
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-brand-200 rounded-2xl bg-brand-50 flex flex-col items-center justify-center gap-3 py-10 cursor-pointer active:bg-brand-100 transition-colors"
        >
          <span className="text-5xl">📸</span>
          <p className="text-sm font-semibold text-brand-700">Tomar foto o elegir de galería</p>
          <p className="text-xs text-brand-400">JPG · PNG · HEIC — máximo 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        /* ── Preview antes de subir ── */
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-square w-full max-w-sm mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={cancelarPreview}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Campo descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              ¿Qué estás comiendo? <span className="text-slate-300">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDesc(e.target.value.slice(0, 100))}
                placeholder="Ej: Almuerzo con arroz, pollo y ensalada"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300">
                {descripcion.length}/100
              </span>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠️</span> {errorMsg}
            </p>
          )}

          <button
            onClick={handleSubir}
            disabled={subiendo}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {subiendo ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Subiendo…
              </>
            ) : (
              <>📤 Subir foto</>
            )}
          </button>
        </div>
      )}

      {/* ── Historial ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Últimas fotos</h3>

        {cargando ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : historial.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <span className="text-3xl block mb-2">🍽️</span>
            <p className="text-sm">Aún no subiste ninguna foto</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {historial.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setFotoAmpliada(entry)}
                className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.foto_url}
                  alt={entry.descripcion ?? 'Foto de comida'}
                  className="w-full h-full object-cover group-active:scale-95 transition-transform"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <p className="text-white text-[10px] leading-tight">
                    {new Date(entry.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal foto ampliada ── */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center text-lg hover:bg-white/30"
            onClick={() => setFotoAmpliada(null)}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoAmpliada.foto_url}
            alt={fotoAmpliada.descripcion ?? 'Foto'}
            className="max-w-full max-h-[70vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-3 text-center" onClick={(e) => e.stopPropagation()}>
            {fotoAmpliada.descripcion && (
              <p className="text-white font-medium text-sm mb-1">{fotoAmpliada.descripcion}</p>
            )}
            <p className="text-white/60 text-xs">{formatFecha(fotoAmpliada.created_at)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
