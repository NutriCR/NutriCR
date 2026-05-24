import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * IDs de prueba fijos — se crean automáticamente en la primera llamada.
 * Reemplazar con IDs del usuario autenticado cuando se implemente auth.
 */
const TEST_USER_ID     = '11111111-1111-1111-1111-111111111111';
const TEST_NUTRIOLOGO_ID = '22222222-2222-2222-2222-222222222222';

interface ProductoInput {
  nombre: string;
  cantidad: number;
  unidad: string;
}

/**
 * Garantiza que los registros de prueba existen.
 * Lanza Error con mensaje descriptivo si algún upsert falla.
 */
async function ensureTestData(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { error: userError } = await supabase.from('usuarios').upsert(
    {
      id:           TEST_USER_ID,
      email:        'dev@nutricr.test',
      nombre:       'Dev',
      apellido:     'Test',
      tipo_usuario: 'nutriologo' as const,
    },
    { onConflict: 'id' },
  );

  if (userError) {
    console.error('[despensa] ensureTestData → upsert usuarios:', {
      message: userError.message,
      code:    userError.code,
      details: userError.details,
      hint:    userError.hint,
    });
    throw new Error(`upsert usuarios falló: ${userError.message} (code: ${userError.code})`);
  }

  const { error: nutriError } = await supabase.from('nutriologos').upsert(
    {
      id:           TEST_NUTRIOLOGO_ID,
      usuario_id:   TEST_USER_ID,
      especialidad: 'Desarrollo',
    },
    { onConflict: 'id' },
  );

  if (nutriError) {
    console.error('[despensa] ensureTestData → upsert nutriologos:', {
      message: nutriError.message,
      code:    nutriError.code,
      details: nutriError.details,
      hint:    nutriError.hint,
    });
    throw new Error(`upsert nutriologos falló: ${nutriError.message} (code: ${nutriError.code})`);
  }
}

// ─── POST /api/despensa ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();

    const body = await request.json();
    const { productos } = body as { productos?: ProductoInput[] };

    if (!Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un arreglo de productos no vacío' },
        { status: 400 },
      );
    }

    // Garantizar que los registros de prueba existen antes de insertar
    await ensureTestData(supabase);

    const rows = productos.map((p) => ({
      nutriologo_id: TEST_NUTRIOLOGO_ID,
      nombre:        p.nombre,
      unidad_medida: p.unidad,
      stock:         p.cantidad,
      categoria:     'tiquete-escaneado',
    }));

    const { data, error } = await supabase
      .from('inventario')
      .insert(rows)
      .select('id, nombre, stock, unidad_medida');

    if (error) {
      console.error('[despensa] insert inventario:', {
        message: error.message,
        code:    error.code,
        details: error.details,
        hint:    error.hint,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insertados: data.length, data }, { status: 201 });

  } catch (err: unknown) {
    // Captura excepciones JS (env vars faltantes, JSON inválido, errores de red, etc.)
    console.error('[despensa] catch exception:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET /api/despensa ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('inventario')
      .select(
        'id, nombre, stock, unidad_medida, categoria, ' +
        'calorias_por_100g, proteinas_por_100g, carbohidratos_por_100g, grasas_por_100g, ' +
        'fecha_vencimiento, created_at',
      )
      .eq('nutriologo_id', TEST_NUTRIOLOGO_ID)
      .eq('categoria', 'tiquete-escaneado')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[despensa] GET error:', {
        message: error.message,
        code:    error.code,
        details: error.details,
        hint:    error.hint,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error('[despensa] GET catch:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
