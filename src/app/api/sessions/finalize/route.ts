import { NextResponse } from 'next/server';
import { finalizeSessionForDate } from '@/lib/sessionsStore';

export const runtime = 'nodejs';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  let body: { date?: string };
  try {
    body = (await request.json()) as { date?: string };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const date = body.date?.trim();
  if (!date || !datePattern.test(date)) {
    return NextResponse.json({ message: 'Informe a data da sessao (YYYY-MM-DD).' }, { status: 400 });
  }

  try {
    const session = await finalizeSessionForDate(date);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao finalizar sessao.';
    if (message.includes('Nenhum cadastro')) {
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Nao foi possivel finalizar a sessao.' }, { status: 500 });
  }
}
