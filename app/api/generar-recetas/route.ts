import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { anthropic } from '@/lib/anthropic/client';

/**
 * ID de prueba — reemplazar con el nutriólogo del usuario autenticado cuando se implemente auth.
 */
const TEST_NUTRIOLOGO_ID = '22222222-2222-2222-2222-222222222222';

/**
 * Ingredientes típicos costarricenses de fallback cuando la despensa está vacía.
 */
const INGREDIENTES_CR_FALLBACK = [
  'arroz', 'frijoles negros', 'pollo', 'plátano maduro', 'tortillas de maíz',
  'huevos', 'tomate', 'cebolla', 'chile dulce', 'culantro', 'ajo',
  'papa', 'zanahoria', 'repollo', 'aguacate', 'chayote', 'yuca',
];

function buildPrompt(listaProductos: string): string {
  return (
    `Eres un nutricionista costarricense. Con estos ingredientes disponibles: ${listaProductos}, ` +
    `genera un menú para el día con desayuno, almuerzo, cena y una merienda. ` +
    `Usa ingredientes típicos costarricenses cuando sea posible. ` +
    `Para cada comida incluye: nombre del plato, ingredientes con cantidades, ` +
    `instrucciones simples y macros aproximados (calorías, proteína, carbohidratos, grasas). ` +
    `Responde ÚNICAMENTE en JSON con esta estructura: ` +
    `{ "menu": { ` +
    `"desayuno": {"nombre": string, "ingredientes": string[], "instrucciones": string[], "macros": {"calorias": number, "proteina": number, "carbos": number, "grasas": number}}, ` +
    `"almuerzo": {"nombre": string, "ingredientes": string[], "instrucciones": string[], "macros": {"calorias": number, "proteina": number, "carbos": number, "grasas": number}}, ` +
    `"cena": {"nombre": string, "ingredientes": string[], "instrucciones": string[], "macros": {"calorias": number, "proteina": number, "carbos": number, "grasas": number}}, ` +
    `"merienda": {"nombre": string, "ingredientes": string[], "instrucciones": string[], "macros": {"calorias": number, "proteina": number, "carbos": number, "grasas": number}} ` +
    `} }`
  );
}

// ─── POST /api/generar-recetas ────────────────────────────────────────────────

export async function POST() {
  try {
    const supabase = createAdminClient();

    // 1. Obtener productos disponibles en la despensa
    const { data: inventario, error: invError } = await supabase
      .from('inventario')
      .select('nombre, stock, unidad_medida')
      .eq('nutriologo_id', TEST_NUTRIOLOGO_ID)
      .eq('categoria', 'tiquete-escaneado')
      .order('created_at', { ascending: false });

    if (invError) {
      console.error('[generar-recetas] fetch inventario:', {
        message: invError.message,
        code:    invError.code,
        details: invError.details,
      });
      return NextResponse.json({ error: invError.message }, { status: 500 });
    }

    // 2. Construir lista de ingredientes (despensa real o fallback costarricense)
    const usandoDespensa = Array.isArray(inventario) && inventario.length > 0;

    const listaProductos = usandoDespensa
      ? inventario
          .map((item) => `${item.nombre} (${item.stock} ${item.unidad_medida ?? 'und'})`)
          .join(', ')
      : INGREDIENTES_CR_FALLBACK.join(', ');

    const prompt = buildPrompt(listaProductos);

    // 3. Llamar a Claude
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      return NextResponse.json(
        { error: 'El modelo no devolvió texto' },
        { status: 500 },
      );
    }

    // 4. Limpiar posibles bloques markdown
    const raw = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

    // 5. Parsear JSON
    let parsed: { menu: Record<string, unknown> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[generar-recetas] JSON inválido de Claude:', raw.slice(0, 300));
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta con formato inválido' },
        { status: 500 },
      );
    }

    // 6. Validar estructura mínima
    const COMIDAS_REQUERIDAS = ['desayuno', 'almuerzo', 'cena', 'merienda'];
    if (!parsed?.menu || COMIDAS_REQUERIDAS.some((c) => !parsed.menu[c])) {
      console.error('[generar-recetas] Estructura incompleta:', Object.keys(parsed?.menu ?? {}));
      return NextResponse.json(
        { error: 'La respuesta de la IA no incluye todas las comidas del día' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      menu:                parsed.menu,
      usandoIngredientes:  usandoDespensa ? 'despensa' : 'tipicos_cr',
    });

  } catch (err: unknown) {
    console.error('[generar-recetas] catch:', err);
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
