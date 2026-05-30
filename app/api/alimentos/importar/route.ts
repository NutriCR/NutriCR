import { NextResponse }     from 'next/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';
import { importarDesdeOFF }  from '@/lib/alimentos';

// ─── Lista de alimentos comunes de Costa Rica ─────────────────────────────────

export const LISTA_CR = [
  'arroz blanco', 'frijoles negros', 'frijoles rojos', 'pollo cocido', 'carne molida',
  'huevo', 'leche entera', 'queso', 'natilla', 'pan blanco',
  'tortilla de maíz', 'plátano maduro', 'plátano verde', 'yuca', 'papa',
  'zanahoria', 'chayote', 'ayote', 'tomate', 'cebolla',
  'chile dulce', 'ajo', 'culantro', 'apio', 'limón',
  'naranja', 'banano', 'mango', 'piña', 'sandía',
  'atún en lata', 'sardina', 'jamón', 'mortadela', 'salchicha',
  'aceite vegetal', 'mantequilla', 'azúcar', 'sal', 'avena',
  'pasta', 'espagueti', 'lechuga', 'pepino', 'brócoli',
  'coliflor', 'elote', 'palmito', 'pejibaye', 'cas',
];

// ─── POST /api/alimentos/importar ────────────────────────────────────────────
// Importa alimentos desde OpenFoodFacts en lotes.
// Body: { nombres?: string[] }  — omitir para usar la lista CR completa.
// Devuelve conteo de importados, ya existentes y no encontrados.

export async function POST(request: Request) {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({})) as { nombres?: string[] };
    const nombres = Array.isArray(body.nombres) ? body.nombres : LISTA_CR;

    // Procesar todos en paralelo (OFF es rápido; sin Claude como fallback)
    const resultados = await Promise.allSettled(
      nombres.map((n) => importarDesdeOFF(n)),
    );

    let importados    = 0;
    let yaExistentes  = 0;
    let noEncontrados = 0;
    const fallidos: string[] = [];

    resultados.forEach((r, i) => {
      if (r.status === 'rejected') {
        noEncontrados++;
        fallidos.push(nombres[i]);
        return;
      }
      if (r.value.importado)    importados++;
      else if (r.value.yaExistia) yaExistentes++;
      else {
        noEncontrados++;
        fallidos.push(nombres[i]);
      }
    });

    console.log(`[importar] importados=${importados} existentes=${yaExistentes} no_encontrados=${noEncontrados}`);

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
