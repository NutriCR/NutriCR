import { NextResponse }    from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente }   from '@/lib/supabase/auth-helpers';
import { buscarAlimento }    from '@/lib/alimentos';

// ─── Helper: enriquecer fila con datos nutricionales ─────────────────────────
// Llama a buscarAlimento() y actualiza la fila de inventario con los macros +
// alimento_id. Falla silenciosamente para no bloquear la respuesta principal.

async function enriquecerFila(
  filaId:   string,
  nombre:   string,
  admin:    ReturnType<typeof createAdminClient>,
): Promise<{
  calorias_por_100g:     number | null;
  proteinas_por_100g:    number | null;
  carbohidratos_por_100g: number | null;
  grasas_por_100g:       number | null;
  alimento_id:           string | null;
}> {
  try {
    const datos = await buscarAlimento(nombre);

    const update = {
      calorias_por_100g:      datos.calorias100g,
      proteinas_por_100g:     datos.proteina100g,
      carbohidratos_por_100g: datos.carbos100g,
      grasas_por_100g:        datos.grasas100g,
      alimento_id:            datos.id || null,
    };

    const { error } = await admin
      .from('inventario')
      .update(update)
      .eq('id', filaId);

    if (error) {
      console.error('[despensa] update nutricional:', error.message);
    } else {
      console.log(`[despensa] macros actualizados para "${nombre}" — fuente: ${datos.fuente}`);
    }

    return update;
  } catch (err) {
    console.error('[despensa] enriquecerFila falló:', err);
    return {
      calorias_por_100g:      null,
      proteinas_por_100g:     null,
      carbohidratos_por_100g: null,
      grasas_por_100g:        null,
      alimento_id:            null,
    };
  }
}

// ─── POST /api/despensa ───────────────────────────────────────────────────────
// Acepta dos formatos:
//
//  A) Escaneo de tiquete (batch):
//     { productos: [{ nombre, cantidad, unidad }] }
//
//  B) Agregado manual (single):
//     { nombre, cantidad, unidad, categoria, fecha_vencimiento? }
//
// En ambos casos, después del INSERT llama a buscarAlimento() para enriquecer
// con datos nutricionales y alimento_id.

export async function POST(request: Request) {
  try {
    const auth = await requirePaciente();
    if (!auth.ok) return auth.response;

    const nutriologoId = auth.data.nutriologoId;
    if (!nutriologoId) {
      return NextResponse.json(
        { error: 'No tienes un nutricionista asignado. Verifica tu código de invitación.' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[];

    if (Array.isArray(body.productos)) {
      // ── Formato A: batch desde el escáner ──────────────────────────────────
      if (body.productos.length === 0) {
        return NextResponse.json(
          { error: 'Se requiere un arreglo de productos no vacío' },
          { status: 400 },
        );
      }
      rows = (body.productos as { nombre: string; cantidad: number; unidad: string }[]).map((p) => ({
        nutriologo_id: nutriologoId,
        paciente_id:   auth.data.pacienteId,
        nombre:        p.nombre,
        unidad_medida: p.unidad,
        stock:         p.cantidad,
        categoria:     'tiquete-escaneado',
      }));

    } else {
      // ── Formato B: producto manual único ──────────────────────────────────
      const { nombre, cantidad, unidad, categoria, fecha_vencimiento } = body as {
        nombre:             string;
        cantidad:           number;
        unidad:             string;
        categoria:          string;
        fecha_vencimiento?: string | null;
      };

      if (!nombre?.trim() || !cantidad || !unidad) {
        return NextResponse.json(
          { error: 'nombre, cantidad y unidad son requeridos' },
          { status: 400 },
        );
      }

      rows = [{
        nutriologo_id:     nutriologoId,
        paciente_id:       auth.data.pacienteId,
        nombre:            nombre.trim(),
        unidad_medida:     unidad,
        stock:             Number(cantidad),
        categoria:         categoria ?? 'Otros',
        fecha_vencimiento: fecha_vencimiento || null,
      }];
    }

    // ── INSERT en inventario ──────────────────────────────────────────────────
    const { data: insertados, error } = await admin
      .from('inventario')
      .insert(rows)
      .select('id, nombre, stock, unidad_medida, categoria, fecha_vencimiento, created_at');

    if (error) {
      console.error('[despensa] insert inventario:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Enriquecer con macros (buscarAlimento) en paralelo ───────────────────
    // Busca en DB local → OpenFoodFacts → Claude y actualiza cada fila.
    const enriquecidos = await Promise.all(
      insertados.map(async (fila) => {
        const macros = await enriquecerFila(fila.id, fila.nombre, admin);
        return { ...fila, ...macros };
      }),
    );

    return NextResponse.json({ insertados: enriquecidos.length, data: enriquecidos }, { status: 201 });

  } catch (err) {
    console.error('[despensa] POST catch:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}

// ─── GET /api/despensa ────────────────────────────────────────────────────────
// Devuelve todos los productos del paciente (escaneados + manuales)
// incluyendo datos nutricionales y alimento_id.

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
        'id, nombre, stock, unidad_medida, categoria, alimento_id, ' +
        'calorias_por_100g, proteinas_por_100g, carbohidratos_por_100g, grasas_por_100g, ' +
        'fecha_vencimiento, created_at',
      )
      .eq('paciente_id', auth.data.pacienteId)
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
