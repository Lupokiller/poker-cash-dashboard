import { getDbPool } from './db';
import { normalizePaymentMethod } from './cashTotalsModel';
import { ensureSessionSchema, ensureRegisteredPlayerSchema } from './schemaMigrations';
import { readSessionClock } from './sessionClockStore';
import { PaymentMethod, PaymentStatus, Session, SessionPlayer } from './types';

interface SessionRow {
  id: string;
  session_date: string;
  staff_cost: string | number;
  total_pix: string | number;
  total_dinheiro: string | number;
  total_fiado: string | number;
  finalized_at: string;
  table_started_at?: string | null;
  table_ended_at?: string | null;
}

interface SessionPlayerRow {
  session_id: string;
  name: string;
  buy_in: number;
  cash_out: number;
  net: number;
  payment_status: PaymentStatus;
  buy_in_count?: number;
}

function mapSessionPlayer(row: SessionPlayerRow): SessionPlayer {
  return {
    name: row.name,
    buyIn: Number(row.buy_in),
    cashOut: Number(row.cash_out),
    net: Number(row.net),
    paymentStatus: row.payment_status,
    buyInCount: row.buy_in_count != null ? Number(row.buy_in_count) : 1,
  };
}

function sessionTotals(players: SessionPlayer[]) {
  const buyIn = players.reduce((a, p) => a + p.buyIn, 0);
  const cashOut = players.reduce((a, p) => a + p.cashOut, 0);
  const net = players.reduce((a, p) => a + p.net, 0);
  return { buyIn, cashOut, net, playersCount: players.length };
}

function mapSessionRow(row: SessionRow, players: SessionPlayer[]): Session {
  return {
    id: row.id,
    date: row.session_date,
    staffCost: Number(row.staff_cost) || 0,
    totalPix: Number(row.total_pix) || 0,
    totalDinheiro: Number(row.total_dinheiro) || 0,
    totalFiado: Number(row.total_fiado) || 0,
    tableStartedAt: row.table_started_at ?? null,
    tableEndedAt: row.table_ended_at ?? null,
    players,
    totals: sessionTotals(players),
  };
}

export async function readPokerSessions(): Promise<Session[]> {
  await ensureSessionSchema();
  const pool = getDbPool();
  const sessionsResult = await pool.query<SessionRow>(
    `SELECT id, session_date::text AS session_date, staff_cost, total_pix, total_dinheiro, total_fiado, finalized_at, table_started_at, table_ended_at
     FROM poker_sessions ORDER BY session_date ASC`
  );

  if (sessionsResult.rows.length === 0) {
    return [];
  }

  const ids = sessionsResult.rows.map((r) => r.id);
  const playersResult = await pool.query<SessionPlayerRow & { session_date: string }>(
    `SELECT sp.session_id, s.session_date::text AS session_date, sp.name, sp.buy_in, sp.cash_out, sp.net, sp.payment_status, sp.buy_in_count
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

  return sessionsResult.rows.map((row) => mapSessionRow(row, bySession.get(row.id) ?? []));
}

export async function updateSessionStaffCost(sessionId: string, staffCost: number): Promise<Session | null> {
  if (!Number.isFinite(staffCost) || staffCost < 0) {
    throw new Error('Custo de staff invalido.');
  }

  await ensureSessionSchema();
  const pool = getDbPool();
  const result = await pool.query<SessionRow>(
    `UPDATE poker_sessions
     SET staff_cost = $2
     WHERE id = $1
     RETURNING id, session_date::text AS session_date, staff_cost, total_pix, total_dinheiro, total_fiado, finalized_at, table_started_at, table_ended_at`,
    [sessionId, staffCost]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const playersResult = await pool.query<SessionPlayerRow>(
    `SELECT session_id, name, buy_in, cash_out, net, payment_status, buy_in_count
     FROM poker_session_players WHERE session_id = $1 ORDER BY name ASC`,
    [sessionId]
  );

  return mapSessionRow(row, playersResult.rows.map(mapSessionPlayer));
}

export interface SessionAggregationResult {
  players: SessionPlayer[];
  totalPix: number;
  totalDinheiro: number;
  totalFiado: number;
}

export async function aggregateRegisteredPlayersForDate(sessionDate: string): Promise<SessionAggregationResult> {
  await ensureRegisteredPlayerSchema();
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
    payment_method: string | null;
    created_at: string;
  }

  const result = await pool.query<RegRow>(
    `SELECT id, name, date::text AS date, buy_in, cash_out, net, payment_status, phone, notes, payment_method, created_at
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
    paymentMethod: normalizePaymentMethod(row.payment_method) as PaymentMethod,
    createdAt: row.created_at,
  }));

  let totalPix = 0;
  let totalDinheiro = 0;
  let totalFiado = 0;

  const byKey = new Map<
    string,
    {
      displayName: string;
      buyIn: number;
      cashOut: number;
      net: number;
      paymentStatus: PaymentStatus;
      buyInCount: number;
      lastTs: string;
    }
  >();

  for (const p of rows) {
    if (p.paymentMethod === 'dinheiro') {
      totalDinheiro += p.buyIn;
    } else if (p.paymentMethod === 'fiado') {
      totalFiado += p.buyIn;
    } else {
      totalPix += p.buyIn;
    }

    const key = p.name.trim().toLowerCase();
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, {
        displayName: p.name.trim(),
        buyIn: p.buyIn,
        cashOut: p.cashOut,
        net: p.net,
        paymentStatus: p.paymentStatus,
        buyInCount: 1,
        lastTs: p.createdAt,
      });
    } else {
      cur.buyIn += p.buyIn;
      cur.cashOut += p.cashOut;
      cur.net += p.net;
      cur.buyInCount += 1;
      if (p.createdAt >= cur.lastTs) {
        cur.paymentStatus = p.paymentStatus;
        cur.lastTs = p.createdAt;
      }
    }
  }

  const players = [...byKey.values()].map((v) => ({
    name: v.displayName,
    buyIn: v.buyIn,
    cashOut: v.cashOut,
    net: v.net,
    paymentStatus: v.paymentStatus,
    buyInCount: v.buyInCount,
  }));

  return { players, totalPix, totalDinheiro, totalFiado };
}

export async function finalizeSessionForDate(sessionDate: string): Promise<Session> {
  const { players, totalPix, totalDinheiro, totalFiado } = await aggregateRegisteredPlayersForDate(sessionDate);
  if (players.length === 0) {
    throw new Error('Nenhum cadastro encontrado para esta data.');
  }

  await ensureSessionSchema();
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

    const clock = await readSessionClock(sessionDate);

    const ins = await client.query<SessionRow>(
      `INSERT INTO poker_sessions (session_date, staff_cost, total_pix, total_dinheiro, total_fiado, table_started_at, table_ended_at)
       VALUES ($1::date, $2, $3, $4, $5, $6, $7)
       RETURNING id, session_date::text AS session_date, staff_cost, total_pix, total_dinheiro, total_fiado, finalized_at, table_started_at, table_ended_at`,
      [
        sessionDate,
        preservedStaffCost,
        totalPix,
        totalDinheiro,
        totalFiado,
        clock?.tableStartedAt ?? null,
        clock?.tableEndedAt ?? null,
      ]
    );

    const sessionId = ins.rows[0].id;

    for (const p of players) {
      await client.query(
        `INSERT INTO poker_session_players (session_id, name, buy_in, cash_out, net, payment_status, buy_in_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sessionId, p.name, p.buyIn, p.cashOut, p.net, p.paymentStatus, p.buyInCount ?? 1]
      );
    }

    await client.query('COMMIT');

    return mapSessionRow(ins.rows[0], players);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
