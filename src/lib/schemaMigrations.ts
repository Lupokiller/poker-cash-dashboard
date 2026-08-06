import { getDbPool } from './db';
import type { Pool } from 'pg';

let staffCostColumnReady: Promise<void> | null = null;

async function ensureFiadoPaymentMethodConstraint(pool: Pool): Promise<void> {
  await pool.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'registered_players'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%payment_method%'
      LOOP
        EXECUTE format('ALTER TABLE registered_players DROP CONSTRAINT IF EXISTS %I', r.conname);
      END LOOP;
    END $$;
  `);
  await pool.query(`
    ALTER TABLE registered_players
      ADD CONSTRAINT registered_players_payment_method_check
      CHECK (payment_method IN ('pix', 'dinheiro', 'fiado'))
  `).catch((error: { code?: string }) => {
    if (error.code !== '42710') {
      throw error;
    }
  });
}

/** Garante coluna staff_cost em poker_sessions (idempotente). */
export async function ensureStaffCostColumn(): Promise<void> {
  if (!staffCostColumnReady) {
    staffCostColumnReady = (async () => {
      const pool = getDbPool();
      await pool.query(
        `ALTER TABLE poker_sessions
         ADD COLUMN IF NOT EXISTS staff_cost NUMERIC(12, 2) NOT NULL DEFAULT 0`
      );
    })().catch((error) => {
      staffCostColumnReady = null;
      throw error;
    });
  }
  return staffCostColumnReady;
}

let paymentMethodColumnsReady: Promise<void> | null = null;

/** Garante payment_method e totais de caixa (idempotente). */
export async function ensurePaymentMethodColumns(): Promise<void> {
  if (!paymentMethodColumnsReady) {
    paymentMethodColumnsReady = (async () => {
      const pool = getDbPool();
      await pool.query(
        `ALTER TABLE registered_players
         ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'pix'`
      );
      await pool.query(
        `ALTER TABLE poker_sessions
         ADD COLUMN IF NOT EXISTS total_pix NUMERIC(12, 2) NOT NULL DEFAULT 0`
      );
      await pool.query(
        `ALTER TABLE poker_sessions
         ADD COLUMN IF NOT EXISTS total_dinheiro NUMERIC(12, 2) NOT NULL DEFAULT 0`
      );
      await pool.query(
        `ALTER TABLE poker_sessions
         ADD COLUMN IF NOT EXISTS total_fiado NUMERIC(12, 2) NOT NULL DEFAULT 0`
      );
      await ensureFiadoPaymentMethodConstraint(pool);
    })().catch((error) => {
      paymentMethodColumnsReady = null;
      throw error;
    });
  }
  return paymentMethodColumnsReady;
}

let buyInCountColumnReady: Promise<void> | null = null;

/** Garante buy_in_count em poker_session_players (idempotente). */
export async function ensureBuyInCountColumn(): Promise<void> {
  if (!buyInCountColumnReady) {
    buyInCountColumnReady = (async () => {
      const pool = getDbPool();
      await pool.query(
        `ALTER TABLE poker_session_players
         ADD COLUMN IF NOT EXISTS buy_in_count INTEGER NOT NULL DEFAULT 1`
      );
    })().catch((error) => {
      buyInCountColumnReady = null;
      throw error;
    });
  }
  return buyInCountColumnReady;
}

let sessionClockSchemaReady: Promise<void> | null = null;

/** Garante tabela session_clocks e colunas de tempo em poker_sessions. */
export async function ensureSessionClockSchema(): Promise<void> {
  if (!sessionClockSchemaReady) {
    sessionClockSchemaReady = (async () => {
      const pool = getDbPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS session_clocks (
          session_date DATE PRIMARY KEY,
          table_started_at TIMESTAMPTZ,
          table_ended_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(
        `ALTER TABLE poker_sessions ADD COLUMN IF NOT EXISTS table_started_at TIMESTAMPTZ`
      );
      await pool.query(
        `ALTER TABLE poker_sessions ADD COLUMN IF NOT EXISTS table_ended_at TIMESTAMPTZ`
      );
    })().catch((error) => {
      sessionClockSchemaReady = null;
      throw error;
    });
  }
  return sessionClockSchemaReady;
}

/** Executa migrações idempotentes para sessões. */
export async function ensureSessionSchema(): Promise<void> {
  await ensureStaffCostColumn();
  await ensurePaymentMethodColumns();
  await ensureBuyInCountColumn();
  await ensureSessionClockSchema();
}

let buyInLogsColumnReady: Promise<void> | null = null;

/** Garante buy_in_logs em registered_players (idempotente). */
export async function ensureBuyInLogsColumn(): Promise<void> {
  if (!buyInLogsColumnReady) {
    buyInLogsColumnReady = (async () => {
      const pool = getDbPool();
      await pool.query(
        `ALTER TABLE registered_players
         ADD COLUMN IF NOT EXISTS buy_in_logs JSONB NOT NULL DEFAULT '[]'::jsonb`
      );
    })().catch((error) => {
      buyInLogsColumnReady = null;
      throw error;
    });
  }
  return buyInLogsColumnReady;
}

let registeredPlayersUniqueReady: Promise<void> | null = null;

/** Consolida duplicatas (mesmo nome+data) e cria índice único. */
export async function ensureRegisteredPlayersUniqueNameDate(): Promise<void> {
  if (!registeredPlayersUniqueReady) {
    registeredPlayersUniqueReady = (async () => {
      const pool = getDbPool();
      const duplicates = await pool.query<{
        date: string;
        name_key: string;
        ids: string[];
      }>(`
        SELECT date::text AS date,
               LOWER(TRIM(name)) AS name_key,
               array_agg(id::text ORDER BY created_at ASC) AS ids
        FROM registered_players
        GROUP BY date, LOWER(TRIM(name))
        HAVING COUNT(*) > 1
      `);

      for (const group of duplicates.rows) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const rows = await client.query<{
            id: string;
            buy_in: number;
            cash_out: number;
            payment_status: string;
            payment_method: string | null;
            buy_in_logs: unknown;
            created_at: string;
            phone: string;
          }>(
            `SELECT id, buy_in, cash_out, payment_status, payment_method, buy_in_logs, created_at, phone
             FROM registered_players
             WHERE date = $1::date AND LOWER(TRIM(name)) = $2
             ORDER BY created_at ASC
             FOR UPDATE`,
            [group.date, group.name_key]
          );
          if (rows.rows.length <= 1) {
            await client.query('COMMIT');
            continue;
          }

          const primary = rows.rows[0];
          const logs: unknown[] = [];
          let totalCashOut = 0;
          let phone = '';
          let paymentStatus = primary.payment_status;
          let paymentMethod = primary.payment_method ?? 'pix';

          for (const row of rows.rows) {
            totalCashOut += Number(row.cash_out) || 0;
            if (row.phone?.trim()) phone = row.phone.trim();
            paymentStatus = row.payment_status;
            paymentMethod = row.payment_method ?? paymentMethod;
            const parsed = Array.isArray(row.buy_in_logs) ? row.buy_in_logs : [];
            if (parsed.length > 0) {
              logs.push(...parsed);
            } else if (Number(row.buy_in) > 0) {
              const created = row.created_at ? new Date(row.created_at) : new Date();
              const hh = String(created.getHours()).padStart(2, '0');
              const mm = String(created.getMinutes()).padStart(2, '0');
              logs.push({
                time: `${hh}:${mm}`,
                amount: Number(row.buy_in),
                paymentMethod: row.payment_method ?? 'pix',
              });
            }
          }

          const totalBuyIn = logs.reduce<number>((acc, item) => {
            const amount = item && typeof item === 'object' ? Number((item as { amount?: unknown }).amount) : 0;
            return acc + (Number.isFinite(amount) ? amount : 0);
          }, 0);

          await client.query(
            `UPDATE registered_players
             SET buy_in = $2,
                 cash_out = $3,
                 payment_status = $4,
                 payment_method = $5,
                 phone = CASE WHEN $6 <> '' THEN $6 ELSE phone END,
                 buy_in_logs = $7::jsonb
             WHERE id = $1`,
            [
              primary.id,
              totalBuyIn,
              totalCashOut,
              paymentStatus,
              paymentMethod,
              phone,
              JSON.stringify(logs),
            ]
          );

          const duplicateIds = rows.rows.slice(1).map((row) => row.id);
          await client.query(`DELETE FROM registered_players WHERE id = ANY($1::uuid[])`, [duplicateIds]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS registered_players_date_name_uidx
        ON registered_players (date, LOWER(TRIM(name)))
      `);
    })().catch((error) => {
      registeredPlayersUniqueReady = null;
      throw error;
    });
  }
  return registeredPlayersUniqueReady;
}

/** Executa migrações idempotentes para cadastros. */
export async function ensureRegisteredPlayerSchema(): Promise<void> {
  await ensurePaymentMethodColumns();
  await ensureBuyInLogsColumn();
  await ensureSettlementMethodColumn();
  await ensurePlayerProfilesTable();
  await ensureRegisteredPlayersUniqueNameDate();
}

let settlementMethodColumnReady: Promise<void> | null = null;

/** Garante settlement_method (acerto Pix/Dinheiro após cash-out). */
export async function ensureSettlementMethodColumn(): Promise<void> {
  if (!settlementMethodColumnReady) {
    settlementMethodColumnReady = (async () => {
      const pool = getDbPool();
      await pool.query(
        `ALTER TABLE registered_players
         ADD COLUMN IF NOT EXISTS settlement_method TEXT`
      );
      await pool.query(
        `ALTER TABLE registered_players DROP CONSTRAINT IF EXISTS registered_players_settlement_method_check`
      );
      await pool
        .query(
          `ALTER TABLE registered_players
           ADD CONSTRAINT registered_players_settlement_method_check
           CHECK (settlement_method IS NULL OR settlement_method IN ('pix', 'dinheiro'))`
        )
        .catch((error: { code?: string }) => {
          if (error.code !== '42710') {
            throw error;
          }
        });
      await pool.query(
        `ALTER TABLE registered_players ALTER COLUMN payment_method SET DEFAULT 'pix'`
      );
    })().catch((error) => {
      settlementMethodColumnReady = null;
      throw error;
    });
  }
  return settlementMethodColumnReady;
}

let playerProfilesTableReady: Promise<void> | null = null;

/** Garante tabela player_profiles (limite de fiado). */
export async function ensurePlayerProfilesTable(): Promise<void> {
  if (!playerProfilesTableReady) {
    playerProfilesTableReady = (async () => {
      const pool = getDbPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS player_profiles (
          name_key TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          club_status TEXT NOT NULL DEFAULT 'ativo',
          first_seen_at DATE,
          fiado_limit NUMERIC(12, 2) NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(
        `ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`
      );
      await pool.query(
        `ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`
      );
      await pool.query(
        `ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS club_status TEXT NOT NULL DEFAULT 'ativo'`
      );
      await pool.query(
        `ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS first_seen_at DATE`
      );
      await pool.query(
        `ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'`
      );
      await pool.query(
        `ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT ''`
      );
      await pool.query(`
        ALTER TABLE player_profiles DROP CONSTRAINT IF EXISTS player_profiles_origin_check
      `);
      await pool
        .query(
          `
        ALTER TABLE player_profiles
          ADD CONSTRAINT player_profiles_origin_check
          CHECK (origin IN ('', 'indicacao', 'instagram', 'amigo', 'whatsapp', 'outro'))
      `
        )
        .catch((error: { code?: string }) => {
          if (error.code !== '42710') {
            throw error;
          }
        });
      await pool.query(`
        ALTER TABLE player_profiles DROP CONSTRAINT IF EXISTS player_profiles_club_status_check
      `);
      await pool.query(`
        ALTER TABLE player_profiles
          ADD CONSTRAINT player_profiles_club_status_check
          CHECK (club_status IN ('ativo', 'vip', 'inativo', 'bloqueado'))
      `).catch((error: { code?: string }) => {
        if (error.code !== '42710') {
          throw error;
        }
      });
      await pool.query(
        `CREATE INDEX IF NOT EXISTS player_profiles_display_name_idx ON player_profiles (display_name)`
      );
    })().catch((error) => {
      playerProfilesTableReady = null;
      throw error;
    });
  }
  return playerProfilesTableReady;
}
