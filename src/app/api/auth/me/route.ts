import { NextResponse } from 'next/server';
import { getSession } from '@/lib/requireAuth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
  }

  return NextResponse.json({
    id: session.sub,
    name: session.name,
    role: session.role,
  });
}
