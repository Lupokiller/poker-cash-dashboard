import { getDbPool } from './db';
import { ensurePlayerProfilesTable } from './schemaMigrations';
import { ClubPlayerProfile, ClubPlayerStatus, PlayerOrigin } from './types';

interface PlayerProfileRow {
  name_key: string;
  display_name: string;
  phone: string;
  notes: string;
  club_status: string;
  tags: string[] | null;
  origin: string | null;
  first_seen_at: string | null;
  updated_at: string;
}

const VALID_STATUSES: ClubPlayerStatus[] = ['ativo', 'vip', 'inativo', 'bloqueado'];
const VALID_ORIGINS: PlayerOrigin[] = ['', 'indicacao', 'instagram', 'amigo', 'whatsapp', 'outro'];

function normalizeClubStatus(value: string | null | undefined): ClubPlayerStatus {
  if (value && VALID_STATUSES.includes(value as ClubPlayerStatus)) {
    return value as ClubPlayerStatus;
  }
  return 'ativo';
}

function normalizeOrigin(value: string | null | undefined): PlayerOrigin {
  if (value && VALID_ORIGINS.includes(value as PlayerOrigin)) {
    return value as PlayerOrigin;
  }
  return '';
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const tag = item.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 12) break;
  }
  return tags;
}

function mapRow(row: PlayerProfileRow): ClubPlayerProfile {
  return {
    nameKey: row.name_key,
    displayName: row.display_name,
    phone: row.phone ?? '',
    notes: row.notes ?? '',
    clubStatus: normalizeClubStatus(row.club_status),
    tags: normalizeTags(row.tags),
    origin: normalizeOrigin(row.origin),
    firstSeenAt: row.first_seen_at,
    updatedAt: row.updated_at,
  };
}

export function playerNameKey(name: string): string {
  return name.trim().toLowerCase();
}

const SELECT_PROFILE = `name_key, display_name, phone, notes, club_status, tags, origin, first_seen_at::text, updated_at`;

/** Sincroniza diretório do clube com todos os jogadores já cadastrados em sessões. */
export async function syncPlayerDirectoryFromRegistrations(): Promise<void> {
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  await pool.query(`
    WITH ranked AS (
      SELECT DISTINCT ON (LOWER(TRIM(name)))
        LOWER(TRIM(name)) AS name_key,
        TRIM(name) AS display_name,
        COALESCE(phone, '') AS phone
      FROM registered_players
      ORDER BY LOWER(TRIM(name)),
        CASE WHEN COALESCE(phone, '') <> '' THEN 0 ELSE 1 END,
        created_at DESC
    ),
    firsts AS (
      SELECT LOWER(TRIM(name)) AS name_key, MIN(date)::date AS first_seen_at
      FROM registered_players
      GROUP BY LOWER(TRIM(name))
    )
    INSERT INTO player_profiles (name_key, display_name, phone, first_seen_at)
    SELECT r.name_key, r.display_name, r.phone, f.first_seen_at
    FROM ranked r
    JOIN firsts f ON f.name_key = r.name_key
    ON CONFLICT (name_key) DO UPDATE SET
      phone = CASE
        WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone
        ELSE player_profiles.phone
      END,
      first_seen_at = COALESCE(player_profiles.first_seen_at, EXCLUDED.first_seen_at),
      updated_at = NOW()
  `);
}

async function lookupLatestPhoneFromRegistrations(name: string): Promise<string> {
  const pool = getDbPool();
  const key = playerNameKey(name);
  const result = await pool.query<{ phone: string }>(
    `SELECT phone FROM registered_players
     WHERE LOWER(TRIM(name)) = $1 AND COALESCE(phone, '') <> ''
     ORDER BY created_at DESC
     LIMIT 1`,
    [key]
  );
  return result.rows[0]?.phone?.trim() ?? '';
}

export async function readPlayerProfiles(): Promise<ClubPlayerProfile[]> {
  await ensurePlayerProfilesTable();
  await syncPlayerDirectoryFromRegistrations();
  const pool = getDbPool();
  const result = await pool.query<PlayerProfileRow>(
    `SELECT ${SELECT_PROFILE} FROM player_profiles ORDER BY display_name ASC`
  );
  return result.rows.map(mapRow);
}

export async function getPlayerProfileByNameKey(nameKey: string): Promise<ClubPlayerProfile | null> {
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const result = await pool.query<PlayerProfileRow>(
    `SELECT ${SELECT_PROFILE} FROM player_profiles WHERE name_key = $1`,
    [nameKey.trim().toLowerCase()]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}

export async function getPlayerProfileByName(name: string): Promise<ClubPlayerProfile | null> {
  const key = playerNameKey(name);
  const profile = await getPlayerProfileByNameKey(key);

  if (profile) {
    if (profile.phone) {
      return profile;
    }
    const phone = await lookupLatestPhoneFromRegistrations(name);
    if (phone) {
      return upsertClubPlayerProfile(name, { phone });
    }
    return profile;
  }

  const pool = getDbPool();
  const latest = await pool.query<{ display_name: string; phone: string }>(
    `SELECT TRIM(name) AS display_name, COALESCE(phone, '') AS phone
     FROM registered_players
     WHERE LOWER(TRIM(name)) = $1
     ORDER BY CASE WHEN COALESCE(phone, '') <> '' THEN 0 ELSE 1 END, created_at DESC
     LIMIT 1`,
    [key]
  );
  if (latest.rows.length === 0) {
    return null;
  }
  const row = latest.rows[0];
  return upsertClubPlayerProfile(row.display_name, { phone: row.phone.trim() });
}

export async function upsertClubPlayerProfile(
  name: string,
  options: {
    phone?: string;
    notes?: string;
    clubStatus?: ClubPlayerStatus;
    tags?: string[];
    origin?: PlayerOrigin;
  }
): Promise<ClubPlayerProfile> {
  await ensurePlayerProfilesTable();
  const pool = getDbPool();
  const key = playerNameKey(name);
  const displayName = name.trim();
  const phone = options.phone?.trim() ?? '';

  const existingResult = await pool.query<PlayerProfileRow>(
    `SELECT ${SELECT_PROFILE} FROM player_profiles WHERE name_key = $1`,
    [key]
  );
  const existing = existingResult.rows[0] ? mapRow(existingResult.rows[0]) : null;
  const phoneValue = phone || existing?.phone || '';
  const notesValue = options.notes !== undefined ? options.notes.trim() : (existing?.notes ?? '');
  const statusValue = options.clubStatus ?? existing?.clubStatus ?? 'ativo';
  const tagsValue = options.tags !== undefined ? normalizeTags(options.tags) : (existing?.tags ?? []);
  const originValue =
    options.origin !== undefined ? normalizeOrigin(options.origin) : (existing?.origin ?? '');

  if (options.origin !== undefined && !VALID_ORIGINS.includes(originValue)) {
    throw new Error('Origem do jogador invalida.');
  }

  const result = await pool.query<PlayerProfileRow>(
    `INSERT INTO player_profiles (name_key, display_name, phone, notes, club_status, tags, origin)
     VALUES ($1, $2, $3, $4, $5, $6::text[], $7)
     ON CONFLICT (name_key) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE player_profiles.phone END,
       notes = EXCLUDED.notes,
       club_status = EXCLUDED.club_status,
       tags = EXCLUDED.tags,
       origin = EXCLUDED.origin,
       updated_at = NOW()
     RETURNING ${SELECT_PROFILE}`,
    [key, displayName, phoneValue, notesValue, statusValue, tagsValue, originValue]
  );
  return mapRow(result.rows[0]);
}

export async function updateClubPlayerProfile(
  nameKey: string,
  options: {
    notes?: string;
    clubStatus?: ClubPlayerStatus;
    phone?: string;
    tags?: string[];
    origin?: PlayerOrigin;
  }
): Promise<ClubPlayerProfile | null> {
  const existing = await getPlayerProfileByNameKey(nameKey);
  if (!existing) {
    return null;
  }

  if (options.clubStatus && !VALID_STATUSES.includes(options.clubStatus)) {
    throw new Error('Status do jogador invalido.');
  }

  return upsertClubPlayerProfile(existing.displayName, {
    phone: options.phone,
    notes: options.notes !== undefined ? options.notes : existing.notes,
    clubStatus: options.clubStatus ?? existing.clubStatus,
    tags: options.tags !== undefined ? options.tags : existing.tags,
    origin: options.origin !== undefined ? options.origin : existing.origin,
  });
}

export type PlayerProfile = ClubPlayerProfile;
