import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { isPostgresPasswordAuthFailure, isSupabasePoolerTenantNotFound } from '@/lib/databaseErrorResponse';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const pool = getDbPool();
    const result = await pool.query<{ now: string }>('SELECT NOW()::text AS now');

    return NextResponse.json({
      ok: true,
      database: 'connected',
      now: result.rows[0]?.now ?? null,
    });
  } catch (error) {
    if (isPostgresPasswordAuthFailure(error)) {
      return NextResponse.json(
        {
          ok: false,
          database: 'disconnected',
          error:
            'Senha do Postgres incorreta. Supabase -> Project Settings -> Database -> confira ou resete a senha e atualize DB_PASSWORD ou DATABASE_URL no .env.',
        },
        { status: 503 }
      );
    }

    if (isSupabasePoolerTenantNotFound(error)) {
      return NextResponse.json(
        {
          ok: false,
          database: 'disconnected',
          error:
            'Usuario do pooler invalido: use postgres.SEU_PROJECT_REF (nao "postgres.xxxx"). Copie Connect -> Session pool no Supabase.',
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown database error';

    return NextResponse.json(
      {
        ok: false,
        database: 'disconnected',
        error: message,
      },
      { status: 500 }
    );
  }
}