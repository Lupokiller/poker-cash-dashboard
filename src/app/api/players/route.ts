import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { buildPlayerDirectory } from '@/lib/playerDirectoryModel';
import { readPlayerProfiles } from '@/lib/playerProfilesStore';
import { readPokerSessions } from '@/lib/sessionsStore';
import { requireSession } from '@/lib/requireAuth';

export const runtime = 'nodejs';

function authError(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'UNAUTHORIZED') {
    return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  try {
    await requireSession();
    const [profiles, sessions] = await Promise.all([readPlayerProfiles(), readPokerSessions()]);
    const directory = buildPlayerDirectory(profiles, sessions);
    return NextResponse.json(directory);
  } catch (error) {
    const authRes = authError(error);
    if (authRes) return authRes;
    return databaseErrorResponse(error, 'Nao foi possivel carregar o diretorio de jogadores.');
  }
}
