import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';

// ─── DELETE /api/despensa/[id] ────────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  try {
    const auth = await requirePaciente();
    if (!auth.ok) return auth.response;

    const nutriologoId = auth.data.nutriologoId;
    if (!nutriologoId) {
      return NextResponse.json({ error: 'Sin nutriólogo asignado' }, { status: 400 });
    }

    const { error } = await createAdminClient()
      .from('inventario')
      .delete()
      .eq('id', id)
      .eq('paciente_id', auth.data.pacienteId); // guard: solo eliminar ítems propios

    if (error) {
      console.error('[despensa] DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[despensa] DELETE catch:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}
