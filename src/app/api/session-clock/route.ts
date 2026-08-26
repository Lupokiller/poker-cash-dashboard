import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { requireTableManager } from '@/lib/requireAuth';
import { endTable, readSessionClock, startTable } from '@/lib/sessionClockStore';
import { todayLocalISODate } from '@/lib/time';

export const runtime = 'nodejs';

function authErrorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'UNAUTHORIZED') {
    return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
  }
  if (msg === 'FORBIDDEN') {
    return NextResponse.json({ message: 'Apenas gerente ou administrador podem controlar a mesa.' }, { status: 403 });
  }
  return null;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? todayLocalISODate();
  if (!isValidDate(date)) {
    return NextResponse.json({ message: 'Data invalida.' }, { status: 400 });
  }

  try {
    const clock = await readSessionClock(date);
    return NextResponse.json(clock ?? { sessionDate: date, tableStartedAt: null, tableEndedAt: null });
  } catch (error) {
    return databaseErrorResponse(error, 'Nao foi possivel carregar o relogio da mesa.');
  }
}

export async function POST(request: Request) {
  let body: { action?: unknown; date?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; date?: unknown };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const action = body.action;
  const date = typeof body.date === 'string' ? body.date : todayLocalISODate();
  if (!isValidDate(date)) {
    return NextResponse.json({ message: 'Data invalida.' }, { status: 400 });
  }
  if (action !== 'start' && action !== 'end') {
    return NextResponse.json({ message: 'Acao invalida.' }, { status: 400 });
  }

  try {
    await requireTableManager();
    const clock = action === 'start' ? await startTable(date) : await endTable(date);
    return NextResponse.json(clock);
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;

    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('mesa') || msg.includes('Inicie')) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    return databaseErrorResponse(error, 'Nao foi possivel atualizar o relogio da mesa.');
  }
}
