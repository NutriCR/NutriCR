import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { anthropic } from '@/lib/anthropic/client';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('recetas_generadas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { pacienteId, planId, tipComida, restricciones } = await request.json();

  const prompt = `Genera una receta de ${tipComida} para un paciente con las siguientes restricciones: ${restricciones || 'ninguna'}.
  Responde en JSON con los campos: nombre, descripcion, ingredientes (array con nombre, cantidad, unidad), instrucciones (array de pasos), calorias, tiempo_preparacion_minutos.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Error generando receta' }, { status: 500 });
  }

  let recetaData;
  try {
    recetaData = JSON.parse(content.text);
  } catch {
    return NextResponse.json({ error: 'Respuesta IA inválida' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('recetas_generadas')
    .insert({
      paciente_id: pacienteId,
      plan_nutricional_id: planId,
      tipo_comida: tipComida,
      generada_por_ia: true,
      prompt_usado: prompt,
      ...recetaData,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
