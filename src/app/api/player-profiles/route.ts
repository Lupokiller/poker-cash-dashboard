import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import {
  getPlayerProfileByName,
  playerNameKey,
  readPlayerProfiles,
  upsertClubPlayerProfile,
} from '@/lib/playerProfilesStore';
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  try {
    await requireSession();
    if (name?.trim()) {
      const profile = await getPlayerProfileByName(name);
      return NextResponse.json(
        profile ?? {
          nameKey: playerNameKey(name),
          displayName: name.trim(),
          phone: '',
          notes: '',
          clubStatus: 'ativo' as ClubPlayerStatus,
          tags: [],
          origin: '',
          firstSeenAt: null,
          updatedAt: null,
        }
      );
    }
    const profiles = await readPlayerProfiles();
    return NextResponse.json(profiles);
  } catch (error) {
    const authRes = authError(error);
    if (authRes) return authRes;
    return databaseErrorResponse(error, 'Nao foi possivel carregar perfis.');
  }
}

export async function PUT(request: Request) {
  let body: { name?: unknown; phone?: unknown; notes?: unknown; clubStatus?: unknown };
  try {
    body = (await request.json()) as {
      name?: unknown;
      phone?: unknown;
      notes?: unknown;
      clubStatus?: unknown;
    };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
  const notes = typeof body.notes === 'string' ? body.notes : undefined;
  const clubStatus =
    typeof body.clubStatus === 'string' ? (body.clubStatus as ClubPlayerStatus) : undefined;

  if (!name) {
    return NextResponse.json({ message: 'Nome do jogador e obrigatorio.' }, { status: 400 });
  }

  try {
    await requireSession();
    const profile = await upsertClubPlayerProfile(name, { phone, notes, clubStatus });
    return NextResponse.json(profile);
  } catch (error) {
    const authRes = authError(error);
    if (authRes) return authRes;
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('invalido')) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    return databaseErrorResponse(error, 'Nao foi possivel salvar o perfil.');
  }
}
