import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { buildPlayerDetail } from '@/lib/playerDirectoryModel';
import {
  getPlayerProfileByNameKey,
  updateClubPlayerProfile,
} from '@/lib/playerProfilesStore';
import { readPokerSessions } from '@/lib/sessionsStore';
import { requireSession } from '@/lib/requireAuth';
import { ClubPlayerStatus } from '@/lib/types';

export const runtime = 'nodejs';

function authError(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'UNAUTHORIZED') {
    return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ nameKey: string }> }
) {
  const { nameKey } = await context.params;
  const key = decodeURIComponent(nameKey).trim().toLowerCase();
  if (!key) {
    return NextResponse.json({ message: 'Jogador invalido.' }, { status: 400 });
  }

  try {
    await requireSession();
    const profile = await getPlayerProfileByNameKey(key);
    if (!profile) {
      return NextResponse.json({ message: 'Jogador nao encontrado.' }, { status: 404 });
    }
    const sessions = await readPokerSessions();
    const detail = buildPlayerDetail(profile, sessions);
    return NextResponse.json(detail);
  } catch (error) {
    const authRes = authError(error);
    if (authRes) return authRes;
    return databaseErrorResponse(error, 'Nao foi possivel carregar a ficha do jogador.');
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ nameKey: string }> }
) {
  const { nameKey } = await context.params;
  const key = decodeURIComponent(nameKey).trim().toLowerCase();
  if (!key) {
    return NextResponse.json({ message: 'Jogador invalido.' }, { status: 400 });
  }

  let body: { notes?: unknown; clubStatus?: unknown; phone?: unknown };
  try {
    body = (await request.json()) as { notes?: unknown; clubStatus?: unknown; phone?: unknown };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const notes = typeof body.notes === 'string' ? body.notes : undefined;
  const clubStatus =
    typeof body.clubStatus === 'string' ? (body.clubStatus as ClubPlayerStatus) : undefined;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;

  try {
    await requireSession();
    const updated = await updateClubPlayerProfile(key, { notes, clubStatus, phone });
    if (!updated) {
      return NextResponse.json({ message: 'Jogador nao encontrado.' }, { status: 404 });
    }
    const sessions = await readPokerSessions();
    const detail = buildPlayerDetail(updated, sessions);
    return NextResponse.json(detail);
  } catch (error) {
    const authRes = authError(error);
    if (authRes) return authRes;
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('invalido')) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    return databaseErrorResponse(error, 'Nao foi possivel atualizar o jogador.');
  }
}
