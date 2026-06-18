import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { registerOrAddBuyIn, normalizePaymentMethod, readRegisteredPlayers } from '@/lib/registeredPlayersStore';
import { PaymentStatus } from '@/lib/types';

export const runtime = 'nodejs';

interface CreateRegisteredPlayerInput {
  name?: string;
  date?: string;
  buyIn?: number;
  cashOut?: number;
  paymentStatus?: PaymentStatus;
  phone?: string;
  notes?: string;
  paymentMethod?: string;
  fiadoLimit?: number;
}

const allowedStatuses: PaymentStatus[] = ['a receber', 'a pagar', 'quitado'];

export async function GET() {
  try {
    const players = await readRegisteredPlayers();
    return NextResponse.json(players);
  } catch (error) {
    return databaseErrorResponse(error, 'Nao foi possivel carregar os cadastros.');
  }
}

export async function POST(request: Request) {
  let body: CreateRegisteredPlayerInput;
  try {
    body = (await request.json()) as CreateRegisteredPlayerInput;
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ message: 'Nome do jogador é obrigatório.' }, { status: 400 });
  }

  const buyIn = Number(body.buyIn ?? 0);
  const cashOut = Number(body.cashOut ?? 0);
  const paymentStatus = allowedStatuses.includes(body.paymentStatus ?? 'a receber')
    ? (body.paymentStatus as PaymentStatus)
    : 'a receber';

  const paymentMethod = normalizePaymentMethod(body.paymentMethod);

  try {
    const created = await registerOrAddBuyIn({
      name: body.name.trim(),
      date: body.date || new Date().toISOString().slice(0, 10),
      buyIn,
      cashOut,
      paymentStatus,
      phone: body.phone?.trim() ?? '',
      notes: body.notes?.trim() ?? '',
      paymentMethod,
      fiadoLimit: Number(body.fiadoLimit ?? 0),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error, 'Nao foi possivel salvar o cadastro.');
  }
}
