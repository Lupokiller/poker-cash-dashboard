import { getDbPool } from './db';
import { ensureStaffCostColumn } from './schemaMigrations';
import { PaymentStatus, Session, SessionPlayer } from './types';

interface SessionRow {
  id: string;
  session_date: string;
  staff_cost: string | number;
  finalized_at: string;
}

interface SessionPlayerRow {
  session_id: string;
  name: string;
  buy_in: number;
  cash_out: number;
  net: number;
  payment_status: PaymentStatus;
}

function mapSessionPlayer(row: SessionPlayerRow): SessionPlayer {
  return {
    name: row.name,
    buyIn: Number(row.buy_in),
    cashOut: Number(row.cash_out),
    net: Number(row.net),
    paymentStatus: row.payment_status,
  };
}

function sessionTotals(players: SessionPlayer[]) {
  const buyIn = players.reduce((a, p) => a + p.buyIn, 0);
  const cashOut = players.reduce((a, p) => a + p.cashOut, 0);
  const net = players.reduce((a, p) => a + p.net, 0);
  return { buyIn, cashOut, net, playersCount: players.length };
}

export async function readPokerSessions(): Promise<Session[]> {
  await ensureStaffCostColumn();
  const pool = getDbPool();
  const sessionsResult = await pool.query<SessionRow>(
    `SELECT id, session_date::text AS session_date, staff_cost, finalized_at FROM poker_sessions ORDER BY session_date ASC`
  );

  if (sessionsResult.rows.length === 0) {
    return [];
  }

  const ids = sessionsResult.rows.map((r) => r.id);
  const playersResult = await pool.query<SessionPlayerRow & { session_date: string }>(
    `SELECT sp.session_id, s.session_date::text AS session_date, sp.name, sp.buy_in, sp.cash_out, sp.net, sp.payment_status
     FROM poker_session_players sp
     JOIN poker_sessions s ON s.id = sp.session_id
     WHERE sp.session_id = ANY($1::uuid[])
     ORDER BY s.session_date ASC, sp.name ASC`,
    [ids]
  );

  const bySession = new Map<string, SessionPlayer[]>();
  for (const row of playersResult.rows) {
    const list = bySession.get(row.session_id) ?? [];
    list.push(mapSessionPlayer(row));
    bySession.set(row.session_id, list);
  }

  return sessionsResult.rows.map((row) => {
    const players = bySession.get(row.id) ?? [];
    return {
      id: row.id,
      date: row.session_date,
      staffCost: Number(row.staff_cost) || 0,
      players,
      totals: sessionTotals(players),
    };
  });
}

export async function updateSessionStaffCost(sessionId: string, staffCost: number): Promise<Session | null> {
  if (!Number.isFinite(staffCost) || staffCost < 0) {
    throw new Error('Custo de staff invalido.');
  }

  await ensureStaffCostColumn();
  const pool = getDbPool();
  const result = await pool.query<SessionRow>(
    `UPDATE poker_sessions
     SET staff_cost = $2
     WHERE id = $1
     RETURNING id, session_date::text AS session_date, staff_cost, finalized_at`,
    [sessionId, staffCost]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const playersResult = await pool.query<SessionPlayerRow>(
    `SELECT session_id, name, buy_in, cash_out, net, payment_status
     FROM poker_session_players WHERE session_id = $1 ORDER BY name ASC`,
    [sessionId]
  );

  const players = playersResult.rows.map(mapSessionPlayer);
  return {
    id: row.id,
    date: row.session_date,
    staffCost: Number(row.staff_cost) || 0,
    players,
    totals: sessionTotals(players),
  };
}

export async function aggregateRegisteredPlayersForDate(sessionDate: string): Promise<SessionPlayer[]> {
  const pool = getDbPool();
  interface RegRow {
    id: string;
    name: string;
    date: string;
    buy_in: string;
    cash_out: string;
    net: string;
    payment_status: PaymentStatus;
    phone: string;
    notes: string;
    created_at: string;
  }

  const result = await pool.query<RegRow>(
    `SELECT id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, created_at
     FROM registered_players WHERE date = $1::date ORDER BY created_at ASC`,
    [sessionDate]
  );

  const rows = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    buyIn: Number(row.buy_in),
    cashOut: Number(row.cash_out),
    net: Number(row.net),
    paymentStatus: row.payment_status,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  const byKey = new Map<
    string,
    { displayName: string; buyIn: number; cashOut: number; net: number; paymentStatus: PaymentStatus; lastTs: string }
  >();

  for (const p of rows) {
    const key = p.name.trim().toLowerCase();
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, {
        displayName: p.name.trim(),
        buyIn: p.buyIn,
        cashOut: p.cashOut,
        net: p.net,
        paymentStatus: p.paymentStatus,
        lastTs: p.createdAt,
      });
    } else {
      cur.buyIn += p.buyIn;
      cur.cashOut += p.cashOut;
      cur.net += p.net;
      if (p.createdAt >= cur.lastTs) {
        cur.paymentStatus = p.paymentStatus;
        cur.lastTs = p.createdAt;
      }
    }
  }

  return [...byKey.values()].map((v) => ({
    name: v.displayName,
    buyIn: v.buyIn,
    cashOut: v.cashOut,
    net: v.net,
    paymentStatus: v.paymentStatus,
  }));
}

export async function finalizeSessionForDate(sessionDate: string): Promise<Session> {
  const players = await aggregateRegisteredPlayersForDate(sessionDate);
  if (players.length === 0) {
    throw new Error('Nenhum cadastro encontrado para esta data.');
  }

  await ensureStaffCostColumn();
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const prevStaff = await client.query<{ staff_cost: string }>(
      `SELECT staff_cost FROM poker_sessions WHERE session_date = $1::date`,
      [sessionDate]
    );
    const preservedStaffCost = Number(prevStaff.rows[0]?.staff_cost) || 0;

    await client.query(`DELETE FROM poker_sessions WHERE session_date = $1::date`, [sessionDate]);

    const ins = await client.query<SessionRow>(
      `INSERT INTO poker_sessions (session_date, staff_cost) VALUES ($1::date, $2)
       RETURNING id, session_date::text AS session_date, staff_cost, finalized_at`,
      [sessionDate, preservedStaffCost]
    );

    const sessionId = ins.rows[0].id;

    for (const p of players) {
      await client.query(
        `INSERT INTO poker_session_players (session_id, name, buy_in, cash_out, net, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, p.name, p.buyIn, p.cashOut, p.net, p.paymentStatus]
      );
    }

    await client.query('COMMIT');

    const totals = sessionTotals(players);
    return {
      id: sessionId,
      date: sessionDate,
      staffCost: preservedStaffCost,
      players,
      totals,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
