import { getDbPool } from './db';
import { ensureSessionClockSchema } from './schemaMigrations';
import { SessionClock } from './types';

interface SessionClockRow {
  session_date: string;
  table_started_at: string | null;
  table_ended_at: string | null;
}

function mapRow(row: SessionClockRow): SessionClock {
  return {
    sessionDate: row.session_date,
    tableStartedAt: row.table_started_at,
    tableEndedAt: row.table_ended_at,
  };
}

export async function readSessionClock(sessionDate: string): Promise<SessionClock | null> {
  await ensureSessionClockSchema();
  const pool = getDbPool();
  const result = await pool.query<SessionClockRow>(
    `SELECT session_date::text AS session_date, table_started_at, table_ended_at
     FROM session_clocks WHERE session_date = $1::date`,
    [sessionDate]
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function startTable(sessionDate: string): Promise<SessionClock> {
  await ensureSessionClockSchema();
  const pool = getDbPool();
  const existing = await readSessionClock(sessionDate);
  if (existing?.tableStartedAt && !existing.tableEndedAt) {
    throw new Error('A mesa já está em andamento para esta data.');
  }
  if (existing?.tableStartedAt && existing.tableEndedAt) {
    throw new Error('A mesa já foi encerrada. Reinicie apenas em um novo dia.');
  }

  const result = await pool.query<SessionClockRow>(
    `INSERT INTO session_clocks (session_date, table_started_at, table_ended_at)
     VALUES ($1::date, NOW(), NULL)
     ON CONFLICT (session_date) DO UPDATE
       SET table_started_at = NOW(), table_ended_at = NULL, updated_at = NOW()
     RETURNING session_date::text AS session_date, table_started_at, table_ended_at`,
    [sessionDate]
  );
  return mapRow(result.rows[0]);
}

export async function endTable(sessionDate: string): Promise<SessionClock> {
  await ensureSessionClockSchema();
  const pool = getDbPool();
  const existing = await readSessionClock(sessionDate);
  if (!existing?.tableStartedAt) {
    throw new Error('Inicie a mesa antes de encerrar.');
  }
  if (existing.tableEndedAt) {
    throw new Error('A mesa já foi encerrada.');
  }

  const result = await pool.query<SessionClockRow>(
    `UPDATE session_clocks
     SET table_ended_at = NOW(), updated_at = NOW()
     WHERE session_date = $1::date
     RETURNING session_date::text AS session_date, table_started_at, table_ended_at`,
    [sessionDate]
  );
  return mapRow(result.rows[0]);
}

/** Copia horários do relógio ao vivo para a sessão finalizada. */
export async function copySessionClockToFinalizedSession(
  sessionDate: string,
  sessionId: string
): Promise<void> {
  await ensureSessionClockSchema();
  const clock = await readSessionClock(sessionDate);
  if (!clock?.tableStartedAt) return;

  const pool = getDbPool();
  await pool.query(
    `UPDATE poker_sessions
     SET table_started_at = $2, table_ended_at = $3
     WHERE id = $1`,
    [sessionId, clock.tableStartedAt, clock.tableEndedAt]
  );
}
