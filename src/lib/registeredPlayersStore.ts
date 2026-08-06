import { getDbPool } from './db';
import {
  createBuyInLogEntry,
  buyInLogsFromLegacyRows,
  parseBuyInLogs,
  sumBuyInLogs,
} from './buyInLogsModel';
import { normalizePaymentMethod } from './cashTotalsModel';
import { aggregateRegisteredPlayersForSession, AggregatedSessionPlayer } from './playerSessionModel';
import { getPlayerProfileByName, upsertClubPlayerProfile } from './playerProfilesStore';
import { ensureRegisteredPlayerSchema } from './schemaMigrations';
import { BuyInLogEntry, PaymentMethod, PaymentStatus, RegisteredPlayer } from './types';

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

function resolveLogsFromRow(row: RegisteredPlayerRow): BuyInLogEntry[] {
  const logs = parseBuyInLogs(row.buy_in_logs);
  if (logs.length > 0) return logs;
  if (Number(row.buy_in) > 0) {
    return buyInLogsFromLegacyRows([
      {
        buyIn: Number(row.buy_in),
        paymentMethod: normalizePaymentMethod(row.payment_method),
        createdAt: row.created_at,
      },
    ]);
  }
  return [];
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
}

/** Cadastra jogador novo ou soma buy-in na linha existente da sessão. */
export async function registerOrAddBuyIn(input: RegisterBuyInInput): Promise<RegisteredPlayer> {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const client = await pool.connect();

  const name = input.name.trim();
  const date = input.date;
  const buyIn = Number(input.buyIn);
  if (!Number.isFinite(buyIn) || buyIn <= 0) {
    throw new Error('Buy-in deve ser maior que zero.');
  }
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const inputPhone = input.phone?.trim() ?? '';
  const notes = input.notes?.trim() ?? '';
  const newLog = createBuyInLogEntry(buyIn, paymentMethod);

  const clubProfile = inputPhone ? null : await getPlayerProfileByName(name);
  const phone = inputPhone || clubProfile?.phone?.trim() || '';

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
      // Sempre reconstrói a partir de todas as linhas (evita perder buy-ins de duplicatas).
      const logs = [...existing.rows.flatMap(resolveLogsFromRow), newLog];
      const totalBuyIn = sumBuyInLogs(logs);
      const mergedPhone = phone || primary.phone;

      // Rebuy após cash-out: reabre a conta (senão fica quitado com fichas velhas).
      const updated = await client.query<RegisteredPlayerRow>(
        `UPDATE registered_players
         SET buy_in = $2,
             cash_out = 0,
             payment_status = 'a receber',
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

    await upsertClubPlayerProfile(name, { phone });

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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const found = await client.query<RegisteredPlayerRow>(
      `SELECT ${SELECT_FIELDS} FROM registered_players WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const target = found.rows[0];
    const siblings = await client.query<RegisteredPlayerRow>(
      `SELECT ${SELECT_FIELDS}
       FROM registered_players
       WHERE date = $1::date AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       ORDER BY created_at ASC
       FOR UPDATE`,
      [target.date, target.name]
    );

    const primary = siblings.rows[0] ?? target;
    const logs = siblings.rows.flatMap(resolveLogsFromRow);
    const totalBuyIn = logs.length > 0 ? sumBuyInLogs(logs) : Number(primary.buy_in);

    const updated = await client.query<RegisteredPlayerRow>(
      `UPDATE registered_players
       SET buy_in = $2,
           cash_out = $3,
           payment_status = $4,
           buy_in_logs = $5::jsonb
       WHERE id = $1
       RETURNING ${SELECT_FIELDS}`,
      [primary.id, totalBuyIn, cashOut, paymentStatus, JSON.stringify(logs)]
    );

    const duplicateIds = siblings.rows.filter((row) => row.id !== primary.id).map((row) => row.id);
    if (duplicateIds.length > 0) {
      await client.query(`DELETE FROM registered_players WHERE id = ANY($1::uuid[])`, [duplicateIds]);
    }

    await client.query('COMMIT');
    return mapRow(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

    const found = await client.query<RegisteredPlayerRow>(
      `SELECT ${SELECT_FIELDS}
       FROM registered_players
       WHERE date = $1::date AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       ORDER BY created_at ASC
       FOR UPDATE`,
      [sessionDate, name]
    );

    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const primary = found.rows[0];
    const logs = found.rows.flatMap(resolveLogsFromRow);
    const totalBuyIn = logs.length > 0 ? sumBuyInLogs(logs) : Number(primary.buy_in);

    await client.query(
      `UPDATE registered_players
       SET buy_in = $2,
           cash_out = $3,
           payment_status = 'quitado',
           buy_in_logs = $4::jsonb
       WHERE id = $1`,
      [primary.id, totalBuyIn, cashOut, JSON.stringify(logs)]
    );

    const duplicateIds = found.rows.slice(1).map((row) => row.id);
    if (duplicateIds.length > 0) {
      await client.query(`DELETE FROM registered_players WHERE id = ANY($1::uuid[])`, [duplicateIds]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const all = await readRegisteredPlayers();
  const aggregated = aggregateRegisteredPlayersForSession(all, sessionDate);
  return aggregated.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()) ?? null;
}

/** Remove o jogador da sessão (todas as linhas duplicadas do mesmo nome+data). */
export async function deleteRegisteredPlayerById(id: string) {
  await ensureRegisteredPlayerSchema();
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const found = await client.query<{ id: string; name: string; date: string }>(
      `SELECT id, name, date::text AS date FROM registered_players WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const row = found.rows[0];
    await client.query(
      `DELETE FROM registered_players
       WHERE date = $1::date AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
      [row.date, row.name]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { normalizePaymentMethod };
