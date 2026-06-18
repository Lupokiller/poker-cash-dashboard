import { getDbPool } from './db';
import { ensurePlayerProfilesTable } from './schemaMigrations';
import { ClubPlayerProfile } from './types';

interface PlayerProfileRow {
  name_key: string;
  display_name: string;
  phone: string;
  fiado_limit: number;
  updated_at: string;
}

function mapRow(row: PlayerProfileRow): ClubPlayerProfile {
  return {
    nameKey: row.name_key,
    displayName: row.display_name,
    phone: row.phone ?? '',
    fiadoLimit: Number(row.fiado_limit) || 0,
    updatedAt: row.updated_at,
  };
}

export function playerNameKey(name: string): string {
  return name.trim().toLowerCase();
}

const SELECT_PROFILE = `name_key, display_name, phone, fiado_limit, updated_at`;

export async function readPlayerProfiles(): Promise<ClubPlayerProfile[]> {
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const result = await pool.query<PlayerProfileRow>(
    `SELECT ${SELECT_PROFILE} FROM player_profiles ORDER BY display_name ASC`
  );
  return result.rows.map(mapRow);
}

export async function getPlayerProfileByName(name: string): Promise<ClubPlayerProfile | null> {
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const key = playerNameKey(name);
  const result = await pool.query<PlayerProfileRow>(
    `SELECT ${SELECT_PROFILE} FROM player_profiles WHERE name_key = $1`,
    [key]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}

export async function upsertClubPlayerProfile(
  name: string,
  options: { phone?: string; fiadoLimit?: number }
): Promise<ClubPlayerProfile> {
  const fiadoLimit = options.fiadoLimit;
  if (fiadoLimit != null && (!Number.isFinite(fiadoLimit) || fiadoLimit < 0)) {
    throw new Error('Limite de fiado invalido.');
  }

  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const key = playerNameKey(name);
  const displayName = name.trim();
  const phone = options.phone?.trim() ?? '';

  const existing = await getPlayerProfileByName(name);
  const limitValue = fiadoLimit ?? existing?.fiadoLimit ?? 0;
  const phoneValue = phone || existing?.phone || '';

  const result = await pool.query<PlayerProfileRow>(
    `INSERT INTO player_profiles (name_key, display_name, phone, fiado_limit)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name_key) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE player_profiles.phone END,
       fiado_limit = EXCLUDED.fiado_limit,
       updated_at = NOW()
     RETURNING ${SELECT_PROFILE}`,
    [key, displayName, phoneValue, limitValue]
  );
  return mapRow(result.rows[0]);
}

/** @deprecated Use upsertClubPlayerProfile */
export async function upsertPlayerProfile(name: string, fiadoLimit: number): Promise<ClubPlayerProfile> {
  return upsertClubPlayerProfile(name, { fiadoLimit });
}

// Back-compat alias for imports expecting PlayerProfile
export type PlayerProfile = ClubPlayerProfile;
