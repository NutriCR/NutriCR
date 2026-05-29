import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';

const BUCKET = 'diario-comidas';

// ─── GET /api/diario ──────────────────────────────────────────────────────────
// Devuelve las últimas 10 fotos del paciente autenticado.

export async function GET() {
  const auth = await requirePaciente();
  if (!auth.ok) return auth.response;

  const { data, error } = await createAdminClient()
    .from('diario_comidas')
    .select('id, foto_url, descripcion, created_at')
    .eq('paciente_id', auth.data.pacienteId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// ─── POST /api/diario ─────────────────────────────────────────────────────────
// Recibe multipart/form-data con 'file' (imagen) y 'descripcion' (opcional).
// Sube la imagen a Storage y guarda los metadatos en diario_comidas.

export async function POST(request: Request) {
  try {
    const auth = await requirePaciente();
    if (!auth.ok) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Body inválido — se esperaba multipart/form-data' }, { status: 400 });
    }

    const file        = formData.get('file') as File | null;
    const descripcion = (formData.get('descripcion') as string | null)?.trim() || null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 10 MB' }, { status: 413 });
    }

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filePath = `${auth.data.pacienteId}/${Date.now()}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());
    const admin    = createAdminClient();

    // Subir a Storage
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error('[diario] upload error:', uploadErr.message);
      return NextResponse.json(
        { error: `Error al subir la imagen: ${uploadErr.message}` },
        { status: 500 },
      );
    }

    // URL pública
    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(filePath);

    // Guardar metadatos
    const { data, error: dbErr } = await admin
      .from('diario_comidas')
      .insert({ paciente_id: auth.data.pacienteId, foto_url: publicUrl, descripcion })
      .select()
      .single();

    if (dbErr) {
      console.error('[diario] db insert error:', dbErr.message);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (err) {
    console.error('[diario] POST unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
