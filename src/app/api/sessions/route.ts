import { NextResponse } from 'next/server';
import { readPokerSessions } from '@/lib/sessionsStore';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sessions = await readPokerSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Nao foi possivel carregar as sessoes.' }, { status: 500 });
  }
}
