/**
 * lib/alimentos.ts — Búsqueda y enriquecimiento nutricional
 *
 * Flujo de buscarAlimento():
 *  1. Busca en tabla local `alimentos` (DB como caché permanente)
 *  2. Si no existe → consulta OpenFoodFacts
 *     · Por código de barras (exacto)
 *     · Por nombre (búsqueda fuzzy, top-1)
 *  3. Si OFF tampoco tiene datos útiles → estima con Claude Haiku
 *  4. Guarda el resultado en `alimentos` y lo devuelve
 *
 * Módulo de SERVIDOR ÚNICAMENTE — no importar en componentes 'use client'.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { anthropic }         from '@/lib/anthropic/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DatosNutricionales {
  id:           string;
  nombre:       string;
  codigoBarras: string | null;
  calorias100g: number;
  proteina100g: number;
  carbos100g:   number;
  grasas100g:   number;
  fibra100g:    number | null;
  fuente:       'openfoodfacts' | 'usda' | 'manual' | 'ia';
  imagenUrl:    string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): DatosNutricionales {
  return {
    id:           String(row.id),
    nombre:       String(row.nombre),
    codigoBarras: (row.codigo_barras as string | null) ?? null,
    calorias100g: Number(row.calorias_100g)  || 0,
    proteina100g: Number(row.proteina_100g)  || 0,
    carbos100g:   Number(row.carbos_100g)    || 0,
    grasas100g:   Number(row.grasas_100g)    || 0,
    fibra100g:    row.fibra_100g != null ? Number(row.fibra_100g) : null,
    fuente:       (row.fuente as DatosNutricionales['fuente']) ?? 'manual',
    imagenUrl:    (row.imagen_url as string | null) ?? null,
  };
}

// ─── 1. Búsqueda local ────────────────────────────────────────────────────────

async function buscarEnLocal(
  nombre: string,
  codigoBarras?: string,
): Promise<DatosNutricionales | null> {
  const admin = createAdminClient();

  // Prioridad: código de barras (match exacto)
  if (codigoBarras) {
    const { data } = await admin
      .from('alimentos')
      .select('*')
      .eq('codigo_barras', codigoBarras)
      .maybeSingle();

    if (data) {
      console.log('[alimentos] encontrado en local por código de barras');
      return mapRow(data as Record<string, unknown>);
    }
  }

  // Búsqueda por nombre (ILIKE con tolerancia)
  const { data } = await admin
    .from('alimentos')
    .select('*')
    .ilike('nombre', `%${nombre.trim()}%`)
    .limit(1)
    .maybeSingle();

  if (data) {
    console.log('[alimentos] encontrado en local por nombre:', data.nombre);
    return mapRow(data as Record<string, unknown>);
  }

  return null;
}

// ─── 2. OpenFoodFacts ─────────────────────────────────────────────────────────

const OFF_HEADERS = {
  'User-Agent': 'NutriCR/1.0 (nutrismartcr.com; contact@nutrismartcr.com)',
};

function mapOFFNutriments(product: Record<string, unknown>): {
  nombre: string;
  calorias100g: number;
  proteina100g: number;
  carbos100g: number;
  grasas100g: number;
  fibra100g: number | null;
  imagenUrl: string | null;
} {
  const n = ((product.nutriments ?? {}) as Record<string, unknown>);

  // Las calorías pueden venir en kcal o kJ; preferir kcal
  const calKcal  = Number(n['energy-kcal_100g']  ?? 0);
  const calKj    = Number(n['energy_100g']        ?? 0);
  const calorias = calKcal > 0 ? calKcal : calKj > 0 ? Math.round(calKj / 4.184) : 0;

  const fibra = n['fiber_100g'] != null ? Number(n['fiber_100g']) : null;

  return {
    nombre:       String(product.product_name || product.generic_name || '').trim(),
    calorias100g: Math.round(calorias * 10) / 10,
    proteina100g: Math.round(Number(n['proteins_100g'] ?? 0) * 10) / 10,
    carbos100g:   Math.round(Number(n['carbohydrates_100g'] ?? 0) * 10) / 10,
    grasas100g:   Math.round(Number(n['fat_100g'] ?? 0) * 10) / 10,
    fibra100g:    fibra != null ? Math.round(fibra * 10) / 10 : null,
    imagenUrl:    (product.image_front_url ?? product.image_url ?? null) as string | null,
  };
}

/** Busca por código de barras en OpenFoodFacts. */
async function buscarOFFBarcode(
  barcode: string,
): Promise<Partial<DatosNutricionales> | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const res = await fetch(url, { headers: OFF_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;

    const json = await res.json() as { status: number; product?: Record<string, unknown> };
    if (json.status !== 1 || !json.product) return null;

    const mapped = mapOFFNutriments(json.product);
    if (!mapped.nombre) return null;

    console.log('[alimentos] encontrado en OpenFoodFacts (barcode):', mapped.nombre);
    return { ...mapped, fuente: 'openfoodfacts' };
  } catch {
    return null;
  }
}

/** Busca por nombre en OpenFoodFacts (top resultado). */
async function buscarOFFNombre(
  nombre: string,
): Promise<Partial<DatosNutricionales> | null> {
  try {
    const q   = encodeURIComponent(nombre);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&json=1&page_size=3&fields=product_name,generic_name,nutriments,image_front_url`;
    const res = await fetch(url, { headers: OFF_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;

    const json = await res.json() as { products?: Record<string, unknown>[] };
    const products = json.products ?? [];

    // Elegir el primer resultado con calorías válidas
    for (const product of products) {
      const mapped = mapOFFNutriments(product);
      if (mapped.calorias100g > 0) {
        console.log('[alimentos] encontrado en OpenFoodFacts (nombre):', mapped.nombre || nombre);
        return { ...mapped, fuente: 'openfoodfacts' };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── 3. Estimación con Claude Haiku ──────────────────────────────────────────

async function estimarConClaude(nombre: string): Promise<Partial<DatosNutricionales>> {
  console.log('[alimentos] estimando con Claude Haiku:', nombre);
  try {
    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 200,
      messages:   [{
        role:    'user',
        content: (
          `Estima los valores nutricionales por 100 gramos del alimento: "${nombre}". ` +
          `Responde ÚNICAMENTE en JSON, sin texto extra: ` +
          `{"calorias_100g": number, "proteina_100g": number, "carbos_100g": number, "grasas_100g": number, "fibra_100g": number}`
        ),
      }],
    });

    const block = message.content[0];
    if (block.type !== 'text') throw new Error('No text block');

    const raw    = block.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(raw) as Record<string, number>;

    return {
      calorias100g: Math.round(Number(parsed.calorias_100g) || 0),
      proteina100g: Math.round(Number(parsed.proteina_100g) || 0),
      carbos100g:   Math.round(Number(parsed.carbos_100g)   || 0),
      grasas100g:   Math.round(Number(parsed.grasas_100g)   || 0),
      fibra100g:    parsed.fibra_100g != null ? Math.round(Number(parsed.fibra_100g)) : null,
      fuente:       'ia',
    };
  } catch (err) {
    console.error('[alimentos] Claude Haiku falló:', err);
    // Devolver zeros — no bloqueamos el flujo principal
    return { calorias100g: 0, proteina100g: 0, carbos100g: 0, grasas100g: 0, fibra100g: null, fuente: 'ia' };
  }
}

// ─── 4. Guardar en tabla alimentos ───────────────────────────────────────────

async function guardarAlimento(
  nombre:        string,
  datos:         Partial<DatosNutricionales>,
  codigoBarras?: string,
): Promise<DatosNutricionales> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('alimentos')
    .insert({
      nombre:        datos.nombre?.trim() || nombre.trim(),
      codigo_barras: codigoBarras ?? null,
      calorias_100g: datos.calorias100g ?? 0,
      proteina_100g: datos.proteina100g ?? 0,
      carbos_100g:   datos.carbos100g   ?? 0,
      grasas_100g:   datos.grasas100g   ?? 0,
      fibra_100g:    datos.fibra100g    ?? null,
      fuente:        datos.fuente       ?? 'manual',
      imagen_url:    datos.imagenUrl    ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[alimentos] insert falló:', error?.message);
    // Devolver datos en memoria aunque no se guarden (no bloqueamos)
    return {
      id:           '',
      nombre:       datos.nombre?.trim() || nombre.trim(),
      codigoBarras: codigoBarras ?? null,
      calorias100g: datos.calorias100g ?? 0,
      proteina100g: datos.proteina100g ?? 0,
      carbos100g:   datos.carbos100g   ?? 0,
      grasas100g:   datos.grasas100g   ?? 0,
      fibra100g:    datos.fibra100g    ?? null,
      fuente:       datos.fuente       ?? 'manual',
      imagenUrl:    datos.imagenUrl    ?? null,
    };
  }

  console.log('[alimentos] guardado en tabla local — id:', data.id);
  return mapRow(data as Record<string, unknown>);
}

// ─── 4b. USDA FoodData Central ───────────────────────────────────────────────
// Usa SR Legacy + Foundation (valores por 100 g garantizados).
// Nutrient IDs: 1008=kcal, 1003=proteína, 1005=carbos, 1004=grasas, 1079=fibra

async function buscarEnUSDA(nombre: string): Promise<Partial<DatosNutricionales> | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    console.warn('[alimentos] USDA_API_KEY no configurada — saltando USDA');
    return null;
  }

  try {
    const q   = encodeURIComponent(nombre);
    const url =
      `https://api.nal.usda.gov/fdc/v1/foods/search` +
      `?query=${q}&api_key=${apiKey}&dataType=SR%20Legacy,Foundation&pageSize=1`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error('[alimentos] USDA HTTP error:', res.status);
      return null;
    }

    const json = await res.json() as {
      foods?: Array<{
        description: string;
        foodNutrients: Array<{ nutrientId: number; value: number }>;
      }>;
    };

    const food = json.foods?.[0];
    if (!food) return null;

    const get = (id: number): number =>
      food.foodNutrients.find((n) => n.nutrientId === id)?.value ?? 0;

    const calorias = get(1008);
    if (calorias === 0) return null;   // datos insuficientes

    console.log('[alimentos] USDA encontrado:', food.description);

    return {
      nombre:       food.description,
      calorias100g: Math.round(calorias    * 10) / 10,
      proteina100g: Math.round(get(1003)   * 10) / 10,
      carbos100g:   Math.round(get(1005)   * 10) / 10,
      grasas100g:   Math.round(get(1004)   * 10) / 10,
      fibra100g:    get(1079) > 0 ? Math.round(get(1079) * 10) / 10 : null,
      fuente:       'usda',
    };
  } catch (err) {
    console.error('[alimentos] USDA error:', err);
    return null;
  }
}

// ─── Exports adicionales (sin guardar en DB) ─────────────────────────────────

/**
 * Busca en OpenFoodFacts por nombre sin guardar en DB.
 * Usado para pre-llenar formularios del nutricionista.
 */
export async function buscarEnOFF(nombre: string): Promise<Partial<DatosNutricionales> | null> {
  const datos = await buscarOFFNombre(nombre).catch(() => null);
  if (!datos || (datos.calorias100g ?? 0) === 0) return null;
  return datos;
}

/**
 * Importa un alimento desde OpenFoodFacts (sin Claude como fallback).
 * Si el alimento ya existe localmente, lo retorna como existente.
 * Si no está en OFF, devuelve { importado: false }.
 * @deprecated Preferir importarAlimento() que usa USDA como fuente primaria.
 */
export async function importarDesdeOFF(nombre: string): Promise<{
  importado: boolean;
  yaExistia: boolean;
  alimento?: DatosNutricionales;
}> {
  const local = await buscarEnLocal(nombre).catch(() => null);
  if (local) return { importado: false, yaExistia: true, alimento: local };

  const offData = await buscarOFFNombre(nombre).catch(() => null);
  if (!offData || (offData.calorias100g ?? 0) === 0) {
    return { importado: false, yaExistia: false };
  }

  try {
    const saved = await guardarAlimento(nombre, offData);
    return { importado: true, yaExistia: false, alimento: saved };
  } catch {
    return { importado: false, yaExistia: false };
  }
}

/**
 * Importa un alimento usando USDA como fuente primaria y OFF como fallback.
 * Sin Claude — solo fuentes oficiales de datos nutricionales.
 * Orden: DB local → USDA FoodData Central → OpenFoodFacts
 */
export async function importarAlimento(nombre: string): Promise<{
  importado: boolean;
  yaExistia: boolean;
  fuente?: 'usda' | 'openfoodfacts';
  alimento?: DatosNutricionales;
}> {
  // 1. Cache local
  const local = await buscarEnLocal(nombre).catch(() => null);
  if (local) return { importado: false, yaExistia: true, alimento: local };

  // 2. USDA (fuente primaria — datos por 100g garantizados)
  const usdaData = await buscarEnUSDA(nombre).catch(() => null);
  if (usdaData && (usdaData.calorias100g ?? 0) > 0) {
    try {
      const saved = await guardarAlimento(nombre, usdaData);
      return { importado: true, yaExistia: false, fuente: 'usda', alimento: saved };
    } catch { /* intenta con OFF */ }
  }

  // 3. Fallback: OpenFoodFacts
  const offData = await buscarOFFNombre(nombre).catch(() => null);
  if (offData && (offData.calorias100g ?? 0) > 0) {
    try {
      const saved = await guardarAlimento(nombre, offData);
      return { importado: true, yaExistia: false, fuente: 'openfoodfacts', alimento: saved };
    } catch { /* fall through */ }
  }

  return { importado: false, yaExistia: false };
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Busca datos nutricionales para un alimento.
 * Orden: DB local → OpenFoodFacts → Claude Haiku
 * Guarda automáticamente en `alimentos` si lo encuentra en fuente externa.
 *
 * @param nombre       Nombre del alimento (requerido)
 * @param codigoBarras Código de barras EAN/UPC (opcional)
 */
export async function buscarAlimento(
  nombre:        string,
  codigoBarras?: string,
): Promise<DatosNutricionales> {
  const nombreNorm = nombre.trim().toLowerCase();

  // 1. Caché local
  const local = await buscarEnLocal(nombreNorm, codigoBarras).catch(() => null);
  if (local) return local;

  // 2. OpenFoodFacts
  let offData: Partial<DatosNutricionales> | null = null;

  if (codigoBarras) {
    offData = await buscarOFFBarcode(codigoBarras);
  }
  if (!offData) {
    offData = await buscarOFFNombre(nombreNorm);
  }

  if (offData && (offData.calorias100g ?? 0) > 0) {
    return guardarAlimento(nombre, offData, codigoBarras);
  }

  // 3. Estimación con Claude
  const claudeData = await estimarConClaude(nombre);
  return guardarAlimento(nombre, claudeData, codigoBarras);
}
