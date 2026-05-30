import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';
import { anthropic } from '@/lib/anthropic/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Fecha de hoy en zona horaria de Costa Rica (UTC-6, sin DST). */
function hoyEnCR(): string {
  const crMs = Date.now() - 6 * 60 * 60 * 1000;
  return new Date(crMs).toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ─── GET /api/generar-recetas ─────────────────────────────────────────────────
// Devuelve el menú ya guardado para HOY si existe, o { menu: null } si no.

export async function GET() {
  try {
    const auth = await requirePaciente();
    if (!auth.ok) return auth.response;

    const { pacienteId } = auth.data;
    const hoy = hoyEnCR();

    const { data, error } = await createAdminClient()
      .from('recetas_generadas')
      .select('menu, created_at')
      .eq('paciente_id', pacienteId)
      .eq('fecha', hoy)
      .is('tipo_comida', null)
      .maybeSingle();

    if (error) {
      console.error('[generar-recetas] GET error:', error);
      return NextResponse.json({ menu: null });
    }

    return NextResponse.json({
      menu:  data?.menu ?? null,
      fecha: hoy,
    });

  } catch (err) {
    console.error('[generar-recetas] GET catch:', err);
    return NextResponse.json({ menu: null });
  }
}

// ─── POST /api/generar-recetas ────────────────────────────────────────────────
// Genera un nuevo menú con Claude, lo persiste y lo devuelve.
// Si ya existe un menú para hoy, lo sobreescribe (flujo de "Regenerar").

export async function POST() {
  try {
    const auth = await requirePaciente();
    if (!auth.ok) return auth.response;

    const { pacienteId, nutriologoId } = auth.data;
    const admin = createAdminClient();
    const hoy   = hoyEnCR();

    // 1. Despensa del paciente (si tiene nutricionista asignado)
    let inventario: { nombre: string; stock: number; unidad_medida: string | null }[] = [];

    if (nutriologoId) {
      const { data, error: invError } = await admin
        .from('inventario')
        .select('nombre, stock, unidad_medida')
        .eq('nutriologo_id', nutriologoId)
        .eq('categoria', 'tiquete-escaneado')
        .order('created_at', { ascending: false });

      if (invError) {
        console.error('[generar-recetas] fetch inventario:', invError);
      } else {
        inventario = data ?? [];
      }
    }

    // 2. Lista de ingredientes
    const usandoDespensa  = inventario.length > 0;
    const listaProductos  = usandoDespensa
      ? inventario.map((item) => `${item.nombre} (${item.stock} ${item.unidad_medida ?? 'und'})`).join(', ')
      : INGREDIENTES_CR_FALLBACK.join(', ');

    // 3. Llamar a Claude
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: buildPrompt(listaProductos) }],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      return NextResponse.json({ error: 'El modelo no devolvió texto' }, { status: 500 });
    }

    // 4. Parsear respuesta
    const raw = block.text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

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

    const COMIDAS_REQUERIDAS = ['desayuno', 'almuerzo', 'cena', 'merienda'];
    if (!parsed?.menu || COMIDAS_REQUERIDAS.some((c) => !parsed.menu[c])) {
      return NextResponse.json(
        { error: 'La respuesta de la IA no incluye todas las comidas del día' },
        { status: 500 },
      );
    }

    // 5. Persistir en recetas_generadas
    //    Primero borrar el menú existente de hoy (si el paciente está regenerando)
    const { error: deleteErr, count: deleteCount } = await admin
      .from('recetas_generadas')
      .delete({ count: 'exact' })
      .eq('paciente_id', pacienteId)
      .eq('fecha', hoy)
      .is('tipo_comida', null);

    if (deleteErr) {
      console.error('[generar-recetas] delete error:', deleteErr);
    } else {
      console.log(`[generar-recetas] delete OK — filas eliminadas: ${deleteCount ?? 0}`);
    }

    const insertPayload = {
      paciente_id:     pacienteId,
      nombre:          `menu_diario_${hoy}`,
      generada_por_ia: true,
      tipo_comida:     null,          // null = menú completo del día
      fecha:           hoy,
      menu:            JSON.parse(JSON.stringify(parsed.menu)),
    };
    console.log('[generar-recetas] insert payload keys:', Object.keys(insertPayload));

    const { error: insertErr, data: insertData } = await admin
      .from('recetas_generadas')
      .insert(insertPayload)
      .select('id, fecha')
      .single();

    if (insertErr) {
      // No bloqueamos la respuesta — el menú igual se devuelve al cliente
      console.error('[generar-recetas] insert ERROR — code:', insertErr.code);
      console.error('[generar-recetas] insert ERROR — message:', insertErr.message);
      console.error('[generar-recetas] insert ERROR — details:', insertErr.details);
      console.error('[generar-recetas] insert ERROR — hint:', insertErr.hint);
    } else {
      console.log('[generar-recetas] insert OK — id:', insertData?.id, '— fecha:', insertData?.fecha);
    }

    return NextResponse.json({
      menu:               parsed.menu,
      usandoIngredientes: usandoDespensa ? 'despensa' : 'tipicos_cr',
      fecha:              hoy,
    });

  } catch (err) {
    console.error('[generar-recetas] catch:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
