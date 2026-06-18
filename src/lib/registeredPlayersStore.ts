import { getDbPool } from './db';
import {
  createBuyInLogEntry,
  buyInLogsFromLegacyRows,
  parseBuyInLogs,
  sumBuyInLogs,
} from './buyInLogsModel';
import { normalizePaymentMethod } from './cashTotalsModel';
import { aggregateRegisteredPlayersForSession, AggregatedSessionPlayer } from './playerSessionModel';
import { upsertClubPlayerProfile } from './playerProfilesStore';
import { ensureRegisteredPlayerSchema } from './schemaMigrations';
import { PaymentMethod, PaymentStatus, RegisteredPlayer } from './types';

interface RegisteredPlayerRow {
  id: string;
  name: string;
  date: string;
  buy_in: number;
  cash_out: number;
  net: number;
  payment_status: PaymentStatus;
  phone: string;
  notes: string;
  payment_method: string | null;
  buy_in_logs: unknown;
  created_at: string;
}

const SELECT_FIELDS = `id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, payment_method, buy_in_logs, created_at`;

function mapRow(row: RegisteredPlayerRow): RegisteredPlayer {
  const buyInLogs = parseBuyInLogs(row.buy_in_logs);
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
    buyInLogs,
    createdAt: row.created_at,
  };
}

export async function readRegisteredPlayers() {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const result = await pool.query<RegisteredPlayerRow>(
    `SELECT ${SELECT_FIELDS} FROM registered_players ORDER BY created_at DESC`
  );
  return result.rows.map(mapRow);
}

export interface RegisterBuyInInput {
  name: string;
  date: string;
  buyIn: number;
  cashOut?: number;
  paymentStatus?: PaymentStatus;
  phone?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  fiadoLimit?: number;
}

/** Cadastra jogador novo ou soma buy-in na linha existente da sessão. */
export async function registerOrAddBuyIn(input: RegisterBuyInInput): Promise<RegisteredPlayer> {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const client = await pool.connect();

  const name = input.name.trim();
  const date = input.date;
  const buyIn = Number(input.buyIn) || 0;
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const phone = input.phone?.trim() ?? '';
  const notes = input.notes?.trim() ?? '';
  const newLog = createBuyInLogEntry(buyIn, paymentMethod);

  try {
    await client.query('BEGIN');

    const existing = await client.query<RegisteredPlayerRow>(
      `SELECT ${SELECT_FIELDS}
       FROM registered_players
       WHERE date = $1::date AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       ORDER BY created_at ASC
       FOR UPDATE`,
      [date, name]
    );

    let resultRow: RegisteredPlayerRow;

    if (existing.rows.length === 0) {
      const inserted = await client.query<RegisteredPlayerRow>(
        `INSERT INTO registered_players (name, date, buy_in, cash_out, payment_status, phone, notes, payment_method, buy_in_logs)
         VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9::jsonb)
         RETURNING ${SELECT_FIELDS}`,
        [
          name,
          date,
          buyIn,
          input.cashOut ?? 0,
          input.paymentStatus ?? 'a receber',
          phone,
          notes,
          paymentMethod,
          JSON.stringify([newLog]),
        ]
      );
      resultRow = inserted.rows[0];
    } else {
      const primary = existing.rows[0];
      let logs = parseBuyInLogs(primary.buy_in_logs);
      if (logs.length === 0 && existing.rows.length === 1) {
        logs = buyInLogsFromLegacyRows([
          {
            buyIn: Number(primary.buy_in),
            paymentMethod: normalizePaymentMethod(primary.payment_method),
            createdAt: primary.created_at,
          },
        ]);
      } else if (logs.length === 0 && existing.rows.length > 1) {
        logs = buyInLogsFromLegacyRows(
          existing.rows.map((row) => ({
            buyIn: Number(row.buy_in),
            paymentMethod: normalizePaymentMethod(row.payment_method),
            createdAt: row.created_at,
          }))
        );
      }

      logs = [...logs, newLog];
      const totalBuyIn = sumBuyInLogs(logs);
      const cashOut = Number(primary.cash_out) || 0;
      const mergedPhone = phone || primary.phone;

      const updated = await client.query<RegisteredPlayerRow>(
        `UPDATE registered_players
         SET buy_in = $2,
             payment_method = $3,
             phone = $4,
             buy_in_logs = $5::jsonb
         WHERE id = $1
         RETURNING ${SELECT_FIELDS}`,
        [primary.id, totalBuyIn, paymentMethod, mergedPhone, JSON.stringify(logs)]
      );
      resultRow = updated.rows[0];

      const duplicateIds = existing.rows.slice(1).map((row) => row.id);
      if (duplicateIds.length > 0) {
        await client.query(`DELETE FROM registered_players WHERE id = ANY($1::uuid[])`, [duplicateIds]);
      }
    }

    await client.query('COMMIT');

    await upsertClubPlayerProfile(name, {
      phone,
      fiadoLimit: input.fiadoLimit,
    });

    return mapRow(resultRow);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** @deprecated Use registerOrAddBuyIn */
export async function createRegisteredPlayer(player: Omit<RegisteredPlayer, 'id' | 'net' | 'buyInLogs'>) {
  return registerOrAddBuyIn({
    name: player.name,
    date: player.date,
    buyIn: player.buyIn,
    cashOut: player.cashOut,
    paymentStatus: player.paymentStatus,
    phone: player.phone,
    notes: player.notes,
    paymentMethod: player.paymentMethod,
  });
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
     RETURNING ${SELECT_FIELDS}`,
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

  const found = await pool.query<{ id: string }>(
    `SELECT id FROM registered_players
     WHERE date = $1::date AND LOWER(TRIM(name)) = LOWER(TRIM($2))
     ORDER BY created_at ASC
     LIMIT 1`,
    [sessionDate, name]
  );

  if (found.rows.length === 0) {
    return null;
  }

  await pool.query(
    `UPDATE registered_players
     SET cash_out = $2, payment_status = 'quitado'
     WHERE id = $1`,
    [found.rows[0].id, cashOut]
  );

  const all = await readRegisteredPlayers();
  const aggregated = aggregateRegisteredPlayersForSession(all, sessionDate);
  return aggregated.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null;
}

export async function deleteRegisteredPlayerById(id: string) {
  const pool = getDbPool();
  const result = await pool.query(`DELETE FROM registered_players WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export { normalizePaymentMethod };
