import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';

interface ProductoInput {
  nombre:   string;
  cantidad: number;
  unidad:   string;
}

// ─── POST /api/despensa ───────────────────────────────────────────────────────
// Guarda los productos escaneados en el inventario del paciente autenticado.

export async function POST(request: Request) {
  try {
    const auth = await requirePaciente();
    if (!auth.ok) return auth.response;

    // El inventario se almacena bajo el nutriologo_id del paciente
    const nutriologoId = auth.data.nutriologoId;
    if (!nutriologoId) {
      return NextResponse.json(
        { error: 'No tienes un nutriólogo asignado. Verifica tu código de invitación.' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { productos } = body as { productos?: ProductoInput[] };

    if (!Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un arreglo de productos no vacío' },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = productos.map((p) => ({
      nutriologo_id: nutriologoId,
      paciente_id:   auth.data.pacienteId,   // requiere migración: ALTER TABLE inventario ADD COLUMN paciente_id uuid
      nombre:        p.nombre,
      unidad_medida: p.unidad,
      stock:         p.cantidad,
      categoria:     'tiquete-escaneado',
    })) as any[];

    const { data, error } = await createAdminClient()
      .from('inventario')
      .insert(rows)
      .select('id, nombre, stock, unidad_medida');

    if (error) {
      console.error('[despensa] insert inventario:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insertados: data.length, data }, { status: 201 });

  } catch (err) {
    console.error('[despensa] POST catch:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}

// ─── GET /api/despensa ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requirePaciente();
    if (!auth.ok) return auth.response;

    const nutriologoId = auth.data.nutriologoId;
    if (!nutriologoId) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await createAdminClient()
      .from('inventario')
      .select(
        'id, nombre, stock, unidad_medida, categoria, ' +
        'calorias_por_100g, proteinas_por_100g, carbohidratos_por_100g, grasas_por_100g, ' +
        'fecha_vencimiento, created_at',
      )
      .eq('nutriologo_id', nutriologoId)
      .eq('categoria', 'tiquete-escaneado')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[despensa] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[despensa] GET catch:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}
