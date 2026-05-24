import { NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic/client';

type AnthropicMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const MIME_WHITELIST: AnthropicMime[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const PROMPT = `Eres un asistente que extrae productos de tiquetes de supermercado costarricenses. Analiza esta imagen y devuelve ÚNICAMENTE un JSON con esta estructura: { "productos": [ { "nombre": string, "cantidad": number, "unidad": string } ] }. Solo el JSON, sin texto adicional.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64) {
      return NextResponse.json({ error: 'Campo imageBase64 requerido' }, { status: 400 });
    }

    // Sanitizar MIME type — Claude solo acepta estos cuatro
    const safeMime: AnthropicMime = MIME_WHITELIST.includes(mimeType as AnthropicMime)
      ? (mimeType as AnthropicMime)
      : 'image/jpeg';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: safeMime,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      return NextResponse.json(
        { error: 'El modelo no devolvió texto' },
        { status: 500 }
      );
    }

    // Limpiar posibles bloques markdown que el modelo agregue por error
    const raw = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

    let parsed: { productos: { nombre: string; cantidad: number; unidad: string }[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[escanear-tiquete] JSON inválido de Claude:', raw);
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta con formato inválido', raw },
        { status: 500 }
      );
    }

    // Validar estructura mínima
    if (!Array.isArray(parsed?.productos)) {
      return NextResponse.json(
        { error: 'Estructura inesperada en la respuesta de la IA' },
        { status: 500 }
      );
    }

    // Normalizar campos por si Claude omite algo
    const productos = parsed.productos.map((p) => ({
      nombre: String(p.nombre ?? 'Producto desconocido'),
      cantidad: Number(p.cantidad ?? 1),
      unidad: String(p.unidad ?? 'unidad'),
    }));

    return NextResponse.json({ productos });
  } catch (err) {
    console.error('[escanear-tiquete]', err);
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
