import { getDbPool } from './db';
import { RegisteredPlayer } from './types';

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
  };
}

export async function readRegisteredPlayers() {
  const pool = getDbPool();
  const result = await pool.query<RegisteredPlayerRow>(
    `SELECT id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, created_at
     FROM registered_players
     ORDER BY created_at DESC`
  );
  return result.rows.map(mapRow);
}

export async function createRegisteredPlayer(player: Omit<RegisteredPlayer, 'id' | 'net'>) {
  const pool = getDbPool();
  const result = await pool.query<RegisteredPlayerRow>(
    `INSERT INTO registered_players (name, date, buy_in, cash_out, payment_status, phone, notes)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7)
     RETURNING id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, created_at`,
    [player.name, player.date, player.buyIn, player.cashOut, player.paymentStatus, player.phone, player.notes]
  );
  return mapRow(result.rows[0]);
}

export async function updateRegisteredPlayerCashAndStatus(
  id: string,
  cashOut: number,
  paymentStatus: RegisteredPlayer['paymentStatus']
) {
  const pool = getDbPool();
  const result = await pool.query<RegisteredPlayerRow>(
    `UPDATE registered_players
     SET cash_out = $2, payment_status = $3
     WHERE id = $1
     RETURNING id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, created_at`,
    [id, cashOut, paymentStatus]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}

export async function deleteRegisteredPlayerById(id: string) {
  const pool = getDbPool();
  const result = await pool.query(`DELETE FROM registered_players WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
