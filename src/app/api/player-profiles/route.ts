import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { getPlayerProfileByName, readPlayerProfiles, upsertClubPlayerProfile } from '@/lib/playerProfilesStore';
import { requireSession } from '@/lib/requireAuth';

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
      return NextResponse.json(profile ?? { displayName: name.trim(), phone: '', fiadoLimit: 0 });
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
  let body: { name?: unknown; fiadoLimit?: unknown; phone?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; fiadoLimit?: unknown; phone?: unknown };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const fiadoLimit = body.fiadoLimit != null ? Number(body.fiadoLimit) : undefined;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;

  if (!name) {
    return NextResponse.json({ message: 'Nome do jogador e obrigatorio.' }, { status: 400 });
  }

  try {
    await requireSession();
    const profile = await upsertClubPlayerProfile(name, { fiadoLimit, phone });
    return NextResponse.json(profile);
  } catch (error) {
    const authRes = authError(error);
    if (authRes) return authRes;
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('invalido')) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    return databaseErrorResponse(error, 'Nao foi possivel salvar o limite de fiado.');
  }
}
