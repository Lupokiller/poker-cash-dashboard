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

/** Executa migrações idempotentes para cadastros. */
export async function ensureRegisteredPlayerSchema(): Promise<void> {
  await ensurePaymentMethodColumns();
  await ensureBuyInLogsColumn();
  await ensurePlayerProfilesTable();
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
