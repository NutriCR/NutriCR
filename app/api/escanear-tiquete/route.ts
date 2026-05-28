import { NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic/client';

type AnthropicMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const MIME_WHITELIST: AnthropicMime[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ─── Prompts ──────────────────────────────────────────────────────────────────

// System: establece el rol antes de que llegue la imagen
const SYSTEM_PROMPT =
  `Eres un extractor de datos de tiquetes de supermercado costarricenses. ` +
  `Tu ÚNICA salida válida es JSON puro y bien formado. ` +
  `NUNCA uses bloques de código markdown (\`\`\`). ` +
  `NUNCA escribas texto, explicaciones ni saludo antes o después del JSON. ` +
  `Tu respuesta debe comenzar exactamente con { y terminar exactamente con }.`;

// User: instrucción específica con la estructura esperada
const USER_PROMPT =
  `Analiza el tiquete de supermercado en esta imagen y devuelve ÚNICAMENTE el siguiente JSON:\n` +
  `{"productos":[{"nombre":"string","cantidad":number,"unidad":"string"}]}\n\n` +
  `Reglas:\n` +
  `• Solo el JSON — sin markdown, sin comentarios, sin texto adicional\n` +
  `• nombre: nombre del producto tal como aparece en el tiquete\n` +
  `• cantidad: número (usa 1 si no se distingue)\n` +
  `• unidad: "unidad", "kg", "g", "L", "ml" según corresponda\n` +
  `• Agrupa líneas del mismo producto sumando cantidades`;

// ─── Helper de extracción robusta ─────────────────────────────────────────────
// Maneja todos estos casos que Claude puede devolver aunque no se le pida:
//   - ```json { ... } ```
//   - ``` { ... } ```
//   - "Aquí el JSON:\n{ ... }"
//   - "{ ... }\nEspero que ayude."

function extraerJSON(text: string): string {
  // 1. Quitar TODOS los fences de markdown (opening y closing)
  let s = text
    .replace(/```[\w]*\n?/g, '')  // ```json  o  ```JSON  o  ```
    .replace(/```/g, '')
    .trim();

  // 2. Extraer el objeto JSON más externo por posición de llaves
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }

  return s;
}

// ─── POST /api/escanear-tiquete ───────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64) {
      return NextResponse.json({ error: 'Campo imageBase64 requerido' }, { status: 400 });
    }

    const safeMime: AnthropicMime = MIME_WHITELIST.includes(mimeType as AnthropicMime)
      ? (mimeType as AnthropicMime)
      : 'image/jpeg';

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      system:     SYSTEM_PROMPT,          // ← nuevo: rol separado del prompt de usuario
      max_tokens: 2000,                   // ← antes 1024; tiquetes largos necesitan más
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type:       'base64',
                media_type: safeMime,
                data:       imageBase64,
              },
            },
            {
              type: 'text',
              text: USER_PROMPT,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      return NextResponse.json(
        { error: 'El modelo no devolvió texto' },
        { status: 500 },
      );
    }

    // Extraer el JSON aunque Claude haya rodeado la respuesta con texto o markdown
    const raw = extraerJSON(block.text);

    let parsed: { productos: { nombre: string; cantidad: number; unidad: string }[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[escanear-tiquete] JSON inválido tras extracción.\nRaw original:', block.text, '\nTras extraer:', raw);
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta con formato inválido', raw: block.text },
        { status: 500 },
      );
    }

    if (!Array.isArray(parsed?.productos)) {
      return NextResponse.json(
        { error: 'Estructura inesperada en la respuesta de la IA' },
        { status: 500 },
      );
    }

    const productos = parsed.productos.map((p) => ({
      nombre:   String(p.nombre   ?? 'Producto desconocido'),
      cantidad: Number(p.cantidad ?? 1),
      unidad:   String(p.unidad   ?? 'unidad'),
    }));

    return NextResponse.json({ productos });

  } catch (err) {
    console.error('[escanear-tiquete]', err);
    const msg = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
