import { getDbPool } from './db';
import { normalizePaymentMethod } from './cashTotalsModel';
import { aggregateRegisteredPlayersForSession, AggregatedSessionPlayer } from './playerSessionModel';
import { ensureRegisteredPlayerSchema } from './schemaMigrations';
import { PaymentMethod, RegisteredPlayer } from './types';

interface RegisteredPlayerRow {
  id: string;
  name: string;
  date: string;
  buy_in: number;
  cash_out: number;
  net: number;
  payment_status: RegisteredPlayer['paymentStatus'];
  phone: string;
  notes: string;
  payment_method: string | null;
  created_at: string;
}

function mapRow(row: RegisteredPlayerRow): RegisteredPlayer {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    buyIn: Number(row.buy_in),
    cashOut: Number(row.cash_out),
    net: Number(row.net),
    paymentStatus: row.payment_status,
    phone: row.phone,
    notes: row.notes,
    paymentMethod: normalizePaymentMethod(row.payment_method),
  };
}

export async function readRegisteredPlayers() {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const result = await pool.query<RegisteredPlayerRow>(
    `SELECT id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, payment_method, created_at
     FROM registered_players
     ORDER BY created_at DESC`
  );
  return result.rows.map(mapRow);
}

export async function createRegisteredPlayer(player: Omit<RegisteredPlayer, 'id' | 'net'>) {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const result = await pool.query<RegisteredPlayerRow>(
    `INSERT INTO registered_players (name, date, buy_in, cash_out, payment_status, phone, notes, payment_method)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, payment_method, created_at`,
    [
      player.name,
      player.date,
      player.buyIn,
      player.cashOut,
      player.paymentStatus,
      player.phone,
      player.notes,
      player.paymentMethod ?? 'pix',
    ]
  );
  return mapRow(result.rows[0]);
}

export async function updateRegisteredPlayerCashAndStatus(
  id: string,
  cashOut: number,
  paymentStatus: RegisteredPlayer['paymentStatus']
) {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const result = await pool.query<RegisteredPlayerRow>(
    `UPDATE registered_players
     SET cash_out = $2, payment_status = $3
     WHERE id = $1
     RETURNING id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, payment_method, created_at`,
    [id, cashOut, paymentStatus]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}

export async function finalizePlayerPayout(
  name: string,
  sessionDate: string,
  cashOut: number
): Promise<AggregatedSessionPlayer | null> {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const rows = await client.query<{ id: string }>(
      `SELECT id FROM registered_players
       WHERE date = $1::date AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       ORDER BY created_at ASC`,
      [sessionDate, name]
    );

    if (rows.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const latestId = rows.rows[rows.rows.length - 1].id;

    await client.query(
      `UPDATE registered_players
       SET cash_out = 0, payment_status = 'quitado'
       WHERE date = $1::date AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
      [sessionDate, name]
    );

    await client.query(
      `UPDATE registered_players
       SET cash_out = $2, payment_status = 'quitado'
       WHERE id = $1`,
      [latestId, cashOut]
    );

    await client.query('COMMIT');

    const all = await readRegisteredPlayers();
    const aggregated = aggregateRegisteredPlayersForSession(all, sessionDate);
    return aggregated.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRegisteredPlayerById(id: string) {
  const pool = getDbPool();
  const result = await pool.query(`DELETE FROM registered_players WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export { normalizePaymentMethod };
