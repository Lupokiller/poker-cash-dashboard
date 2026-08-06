import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { deleteRegisteredPlayerById, updateRegisteredPlayerCashAndStatus } from '@/lib/registeredPlayersStore';
import { PaymentStatus } from '@/lib/types';

export const runtime = 'nodejs';

const allowedStatuses: PaymentStatus[] = ['a receber', 'a pagar', 'quitado'];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: { cashOut?: unknown; paymentStatus?: unknown; settlementMethod?: unknown };
  try {
    body = (await request.json()) as {
      cashOut?: unknown;
      paymentStatus?: unknown;
      settlementMethod?: unknown;
    };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const cashOut = Number(body.cashOut ?? 0);
  if (Number.isNaN(cashOut) || cashOut < 0) {
    return NextResponse.json({ message: 'Cash-out invalido.' }, { status: 400 });
  }

  const paymentStatus = allowedStatuses.includes(body.paymentStatus as PaymentStatus)
    ? (body.paymentStatus as PaymentStatus)
    : null;
  if (!paymentStatus) {
    return NextResponse.json({ message: 'Status de pagamento invalido.' }, { status: 400 });
  }

  const settlementMethod =
    body.settlementMethod === 'pix' || body.settlementMethod === 'dinheiro'
      ? body.settlementMethod
      : body.settlementMethod === null
        ? null
        : undefined;

  try {
    const updated = await updateRegisteredPlayerCashAndStatus(
      id,
      cashOut,
      paymentStatus,
      settlementMethod === undefined ? null : settlementMethod
    );
    if (!updated) {
      return NextResponse.json({ message: 'Registro nao encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return databaseErrorResponse(error, 'Nao foi possivel atualizar o cadastro.');
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const removed = await deleteRegisteredPlayerById(id);

    if (!removed) {
      return NextResponse.json({ message: 'Registro não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return databaseErrorResponse(error, 'Nao foi possivel excluir o cadastro.');
  }
}
