import { NextResponse }     from 'next/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';
import { importarAlimento }  from '@/lib/alimentos';
import { LISTA_CR }          from '@/lib/lista-alimentos-cr';

// ─── POST /api/alimentos/importar ────────────────────────────────────────────
// Importa un lote de alimentos usando USDA como fuente primaria y
// OpenFoodFacts como fallback. El cliente envía lotes pequeños (ej. 5 nombres)
// para poder mostrar progreso en tiempo real.
//
// Body: { nombres?: string[] }
//   · Si se envía nombres → procesa ese lote (flujo batch del cliente)
//   · Si se omite        → procesa toda la LISTA_CR (una sola llamada)
//
// Returns: { importados, yaExistentes, noEncontrados, total }

export async function POST(request: Request) {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({})) as { nombres?: string[] };
    const nombres: string[] = Array.isArray(body.nombres) ? body.nombres : [...LISTA_CR];

    // Procesar el lote en paralelo (USDA es rápido con dataType filtrado)
    const resultados = await Promise.allSettled(
      nombres.map((n) => importarAlimento(n)),
    );

    let importados    = 0;
    let yaExistentes  = 0;
    let noEncontrados = 0;
    const fallidos:   string[] = [];

    resultados.forEach((r, i) => {
      if (r.status === 'rejected') {
        noEncontrados++;
        fallidos.push(nombres[i]);
        return;
      }
      if (r.value.importado)      importados++;
      else if (r.value.yaExistia) yaExistentes++;
      else {
        noEncontrados++;
        fallidos.push(nombres[i]);
      }
    });

    console.log(
      `[importar] lote=${nombres.length} | importados=${importados}` +
      ` | existentes=${yaExistentes} | no_encontrados=${noEncontrados}`,
    );

    return NextResponse.json({
      importados,
      yaExistentes,
      noEncontrados,
      total:   nombres.length,
      fallidos,
    });
  } catch (err) {
    console.error('[importar] catch:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
