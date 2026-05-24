'use client';

import { useState, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Producto {
  nombre: string;
  cantidad: number;
  unidad: string;
}

type Estado = 'idle' | 'preview' | 'scanning' | 'results' | 'saving' | 'saved';

export default function EscanearPage() {
  const [estado, setEstado] = useState<Estado>('idle');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [insertados, setInsertados] = useState(0);

  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  // ─── Handlers ────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setProductos([]);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setEstado('preview');
    };
    reader.readAsDataURL(file);
  }

  async function handleEscanear() {
    if (!imageFile || !imagePreview) return;
    setEstado('scanning');
    setError(null);

    try {
      const base64 = imagePreview.split(',')[1];
      const mimeType = imageFile.type || 'image/jpeg';

      const res = await fetch('/api/escanear-tiquete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al escanear');

      const lista: Producto[] = data.productos ?? [];
      if (lista.length === 0) throw new Error('No se detectaron productos en la imagen');

      setProductos(lista);
      setEstado('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setEstado('preview');
    }
  }

  async function handleAgregarDespensa() {
    if (!productos.length) return;
    setEstado('saving');
    setError(null);

    try {
      const res = await fetch('/api/despensa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');

      setInsertados(data.insertados ?? productos.length);
      setEstado('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setEstado('results');
    }
  }

  function eliminarProducto(idx: number) {
    setProductos((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleReset() {
    setEstado('idle');
    setImageFile(null);
    setImagePreview(null);
    setProductos([]);
    setError(null);
    setInsertados(0);
    if (camaraRef.current) camaraRef.current.value = '';
    if (galeriaRef.current) galeriaRef.current.value = '';
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-4">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Escanear Tiquete</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Foto de un tiquete → Claude extrae los productos automáticamente
        </p>
      </div>

      {/* Estado: idle — selector de fuente */}
      {estado === 'idle' && (
        <div className="flex flex-col items-center gap-5 py-8">
          <div className="w-28 h-28 rounded-3xl bg-brand-50 flex items-center justify-center text-5xl shadow-inner">
            🧾
          </div>

          <p className="text-slate-500 text-sm text-center max-w-xs">
            Toma una foto o selecciona una imagen de tu tiquete de supermercado
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Inputs ocultos */}
            <input
              ref={camaraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={galeriaRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              size="lg"
              onClick={() => camaraRef.current?.click()}
              className="w-full"
            >
              📷 Abrir cámara
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => galeriaRef.current?.click()}
              className="w-full"
            >
              🖼️ Seleccionar de galería
            </Button>
          </div>
        </div>
      )}

      {/* Preview de imagen — estados preview, scanning, results */}
      {imagePreview && estado !== 'saved' && (
        <Card className="overflow-hidden">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Tiquete seleccionado"
              className={cn(
                'w-full object-contain max-h-72',
                estado === 'scanning' && 'opacity-50'
              )}
            />

            {/* Overlay de scanning */}
            {estado === 'scanning' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-brand-700 font-semibold text-sm bg-white/90 px-3 py-1 rounded-full">
                  Analizando con Claude…
                </p>
              </div>
            )}
          </div>

          {/* Cambiar imagen (solo en preview) */}
          {estado === 'preview' && (
            <div className="px-4 py-2 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => camaraRef.current?.click()}
                className="text-xs text-slate-400 hover:text-brand-600 transition-colors"
              >
                📷 Retomar foto
              </button>
              <button
                onClick={() => galeriaRef.current?.click()}
                className="text-xs text-slate-400 hover:text-brand-600 transition-colors"
              >
                🖼️ Cambiar imagen
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex gap-2 items-start">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Botón Escanear (solo en preview) */}
      {estado === 'preview' && (
        <div className="space-y-3">
          <Button size="lg" onClick={handleEscanear} className="w-full">
            ✨ Escanear con Claude Vision
          </Button>
          <p className="text-center text-xs text-slate-400">
            Powered by Anthropic Claude
          </p>
        </div>
      )}

      {/* Lista de productos detectados */}
      {estado === 'results' && productos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">
              Productos detectados
            </h2>
            <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {productos.length}
            </span>
          </div>

          <Card className="divide-y divide-slate-50">
            {productos.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                  🛒
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate capitalize">
                    {p.nombre.toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.cantidad} {p.unidad}
                  </p>
                </div>
                <button
                  onClick={() => eliminarProducto(idx)}
                  className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                  aria-label={`Eliminar ${p.nombre}`}
                >
                  ×
                </button>
              </div>
            ))}
          </Card>

          <p className="text-xs text-slate-400 text-center">
            Toca × para quitar productos incorrectos
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              size="lg"
              onClick={handleAgregarDespensa}
              className="w-full"
              disabled={productos.length === 0}
            >
              📦 Agregar a mi despensa
            </Button>
            <Button
              size="md"
              variant="ghost"
              onClick={handleReset}
              className="w-full"
            >
              Escanear otro tiquete
            </Button>
          </div>
        </div>
      )}

      {/* Estado: guardando */}
      {estado === 'saving' && (
        <Card className="p-6 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm">Guardando en tu despensa…</p>
        </Card>
      )}

      {/* Estado: guardado exitosamente */}
      {estado === 'saved' && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center text-4xl">
            ✅
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-800">
              ¡Despensa actualizada!
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {insertados} {insertados === 1 ? 'producto agregado' : 'productos agregados'} exitosamente
            </p>
          </div>
          <Button size="lg" onClick={handleReset} className="w-full max-w-xs">
            Escanear otro tiquete
          </Button>
        </div>
      )}

      {/* Inputs ocultos accesibles desde preview también */}
      {estado !== 'idle' && (
        <>
          <input
            ref={camaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={galeriaRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
