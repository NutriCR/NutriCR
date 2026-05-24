import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// '2024-06-20' es el Stripe.LatestApiVersion de stripe@16.12
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { nutriologoId, pacienteId, monto, descripcion } = await request.json();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(monto * 100),
    currency: 'crc',
    metadata: { nutriologoId, pacienteId },
  });

  const { data, error } = await supabase
    .from('pagos')
    .insert({
      nutriologo_id: nutriologoId,
      paciente_id: pacienteId,
      monto,
      moneda: 'CRC',
      stripe_payment_intent_id: paymentIntent.id,
      descripcion,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, clientSecret: paymentIntent.client_secret }, { status: 201 });
}

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
