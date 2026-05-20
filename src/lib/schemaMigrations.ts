import { getDbPool } from './db';

let staffCostColumnReady: Promise<void> | null = null;

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
