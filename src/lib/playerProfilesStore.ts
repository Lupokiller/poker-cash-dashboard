import { getDbPool } from './db';
import { ensurePlayerProfilesTable } from './schemaMigrations';

export interface PlayerProfile {
  nameKey: string;
  displayName: string;
  fiadoLimit: number;
  updatedAt: string;
}

interface PlayerProfileRow {
  name_key: string;
  display_name: string;
  fiado_limit: number;
  updated_at: string;
}

function mapRow(row: PlayerProfileRow): PlayerProfile {
  return {
    nameKey: row.name_key,
    displayName: row.display_name,
    fiadoLimit: Number(row.fiado_limit) || 0,
    updatedAt: row.updated_at,
  };
}

export function playerNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export async function readPlayerProfiles(): Promise<PlayerProfile[]> {
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const result = await pool.query<PlayerProfileRow>(
    `SELECT name_key, display_name, fiado_limit, updated_at FROM player_profiles ORDER BY display_name ASC`
  );
  return result.rows.map(mapRow);
}

export async function getPlayerProfileByName(name: string): Promise<PlayerProfile | null> {
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const key = playerNameKey(name);
  const result = await pool.query<PlayerProfileRow>(
    `SELECT name_key, display_name, fiado_limit, updated_at FROM player_profiles WHERE name_key = $1`,
    [key]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}

export async function upsertPlayerProfile(name: string, fiadoLimit: number): Promise<PlayerProfile> {
  if (!Number.isFinite(fiadoLimit) || fiadoLimit < 0) {
    throw new Error('Limite de fiado invalido.');
  }
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const key = playerNameKey(name);
  const displayName = name.trim();
  const result = await pool.query<PlayerProfileRow>(
    `INSERT INTO player_profiles (name_key, display_name, fiado_limit)
     VALUES ($1, $2, $3)
     ON CONFLICT (name_key) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       fiado_limit = EXCLUDED.fiado_limit,
       updated_at = NOW()
     RETURNING name_key, display_name, fiado_limit, updated_at`,
    [key, displayName, fiadoLimit]
  );
  return mapRow(result.rows[0]);
}
