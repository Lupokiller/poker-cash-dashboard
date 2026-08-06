import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { finalizePlayerPayout } from '@/lib/registeredPlayersStore';
import { requireSession } from '@/lib/requireAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { name?: unknown; date?: unknown; cashOut?: unknown; settlementMethod?: unknown };
  try {
    body = (await request.json()) as {
      name?: unknown;
      date?: unknown;
      cashOut?: unknown;
      settlementMethod?: unknown;
    };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const cashOut = Number(body.cashOut ?? 0);
  const settlementMethod =
    body.settlementMethod === 'pix' || body.settlementMethod === 'dinheiro'
      ? body.settlementMethod
      : null;

  if (!name || !date) {
    return NextResponse.json({ message: 'Nome e data da sessao sao obrigatorios.' }, { status: 400 });
  }
  if (Number.isNaN(cashOut) || cashOut < 0) {
    return NextResponse.json({ message: 'Cash-out invalido.' }, { status: 400 });
  }

  try {
    await requireSession();
    const updated = await finalizePlayerPayout(name, date, cashOut, settlementMethod);
    if (!updated) {
      return NextResponse.json({ message: 'Jogador nao encontrado nesta sessao.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
    }
    return databaseErrorResponse(error, 'Nao foi possivel finalizar o payout.');
  }
}
