import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * ID de prueba fijo — coincide con el que usa POST /api/despensa.
 * Sirve como guard para que solo se eliminen ítems propios del usuario de prueba.
 */
const TEST_NUTRIOLOGO_ID = '22222222-2222-2222-2222-222222222222';

// ─── DELETE /api/despensa/[id] ────────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('inventario')
      .delete()
      .eq('id', id)
      .eq('nutriologo_id', TEST_NUTRIOLOGO_ID); // guard: solo eliminar ítems propios

    if (error) {
      console.error('[despensa] DELETE error:', {
        message: error.message,
        code:    error.code,
        details: error.details,
        hint:    error.hint,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[despensa] DELETE catch:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
