import { Pool, PoolConfig } from 'pg';
import { parseIntoClientConfig } from 'pg-connection-string';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

let __poolConnectionKey: string | undefined;

function getConnectionStringFromParts(): string | null {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = stripOptionalPasswordBrackets((process.env.DB_PASSWORD ?? '').trim());
  const database = process.env.DB_NAME?.trim() || 'postgres';
  const port = process.env.DB_PORT?.trim() || '5432';

  if (!host || !user) {
    return null;
  }
  if (password === '') {
    return null;
  }

  return buildPostgresUri({
    user,
    password,
    host,
    port,
    database,
  });
}

function stripOptionalPasswordBrackets(password: string): string {
  if (password.length >= 2 && password.startsWith('[') && password.endsWith(']')) {
    return password.slice(1, -1);
  }
  return password;
}

function buildPostgresUri(parts: { user: string; password: string; host: string; port: string; database: string }) {
  const { user, password, host, port, database } = parts;
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function parseConnectionAsUrl(connectionString: string): URL {
  const normalized = connectionString.startsWith('postgres://')
    ? `http://${connectionString.slice('postgres://'.length)}`
    : connectionString.startsWith('postgresql://')
      ? `http://${connectionString.slice('postgresql://'.length)}`
      : connectionString;
  return new URL(normalized);
}

/** Re-serializa a URI com user/senha codificados (evita @ na senha quebrar o parse). */
function normalizePostgresConnectionUrl(raw: string): string {
  const trimmed = raw.trim();
  const url = parseConnectionAsUrl(trimmed);
  const user = decodeURIComponent(url.username || 'postgres');
  const password = stripOptionalPasswordBrackets(decodeURIComponent(url.password || ''));
  const host = url.hostname;
  const port = url.port || '5432';
  const database = (url.pathname || '/postgres').replace(/^\//, '') || 'postgres';
  return buildPostgresUri({ user, password, host, port, database });
}

function getConnectionString() {
  const fromUrl = process.env.DATABASE_URL?.trim();
  const fromParts = getConnectionStringFromParts();

  const resolved = fromUrl || fromParts;
  if (!resolved) {
    throw new Error(
      'Banco nao configurado: defina DATABASE_URL ou DB_HOST + DB_USER + DB_PASSWORD (+ DB_NAME, DB_PORT). Veja .env.example.'
    );
  }

  const normalized = fromUrl ? normalizePostgresConnectionUrl(fromUrl) : fromParts!;
  assertDatabaseUrlNotPlaceholder(normalized);

  return normalized;
}

/** Evita .env de exemplo do Supabase sem trocar a senha, ou host "HOST" do template antigo. */
function assertDatabaseUrlNotPlaceholder(connectionString: string) {
  const lower = connectionString.toLowerCase();
  if (lower.includes('[your-password]')) {
    throw new Error(
      'DATABASE_URL ainda contem [YOUR-PASSWORD]. No Supabase, use a senha real do banco (Project Settings -> Database) e reinicie o npm run dev.'
    );
  }

  try {
    const url = parseConnectionAsUrl(connectionString);
    const host = url.hostname.toLowerCase();
    const user = decodeURIComponent(url.username || '').toLowerCase();
    if (user === 'postgres.xxxx' || /\.xxxx$/i.test(user)) {
      throw new Error(
        'O usuario do pooler ainda e "postgres.xxxx" (exemplo). Troque por postgres.SEU_PROJECT_REF (o ref esta na URL do projeto Supabase e na string Connect -> Session pool). Salve o .env e reinicie o npm run dev.'
      );
    }
    if (host === 'host') {
      throw new Error(
        'O host da DATABASE_URL e literalmente "HOST" (texto de exemplo). Abra o Supabase -> Connect -> escolha Session pool ou Direct -> copie a URI completa (ela termina em .supabase.co ou .pooler.supabase.com). Cole no .env na linha DATABASE_URL= sem aspas, salve e reinicie o npm run dev.'
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('DATABASE_URL')) {
      throw e;
    }
    if (e instanceof Error && e.message.startsWith('O host da DATABASE_URL')) {
      throw e;
    }
    if (e instanceof Error && e.message.startsWith('O usuario do pooler')) {
      throw e;
    }
    throw new Error(
      'DATABASE_URL invalida (nao foi possivel interpretar a URI). Confira se comecou com postgres:// ou postgresql://.'
    );
  }
}

function isSupabaseHost(connectionString: string) {
  const lower = connectionString.toLowerCase();
  return lower.includes('.supabase.co') || lower.includes('pooler.supabase.com');
}

/**
 * Modo transaction do pooler Supabase (porta 6543) nao suporta prepared statements,
 * que o `pg` usa em queries parametrizadas ($1, $2, ...). Use Session pooler (5432 no host pooler)
 * ou conexao direta ao Postgres. Ver .env.example.
 */
function isSupabaseTransactionPooler(connectionString: string) {
  try {
    return parseConnectionAsUrl(connectionString).port === '6543';
  } catch {
    return false;
  }
}

function resolveSsl(connectionString: string) {
  if (process.env.POSTGRES_SSL === 'true') {
    return { rejectUnauthorized: false } as const;
  }
  if (process.env.POSTGRES_SSL === 'false' && !isSupabaseHost(connectionString)) {
    return undefined;
  }
  if (isSupabaseHost(connectionString)) {
    return { rejectUnauthorized: false } as const;
  }
  return undefined;
}

export function getDbPool() {
  const connectionString = getConnectionString();

  if (global.__pgPool && __poolConnectionKey !== connectionString) {
    void global.__pgPool.end();
    global.__pgPool = undefined;
  }

  if (!global.__pgPool) {
    if (isSupabaseTransactionPooler(connectionString)) {
      throw new Error(
        'DATABASE_URL usa o pooler em modo transaction (porta 6543). Este app usa `pg` com prepared statements, o que quebra nesse modo. No Supabase: Project Settings -> Connect -> use "Session pool" (recomendado no dev) ou "Direct connection", e cole a URI em DATABASE_URL. Veja .env.example.'
      );
    }

    __poolConnectionKey = connectionString;
    const clientConfig = parseIntoClientConfig(connectionString);
    const ssl = resolveSsl(connectionString);

    const poolConfig: PoolConfig = {
      ...clientConfig,
      application_name: 'poker-cash-dashboard',
      max: Number(process.env.PG_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 30_000),
    };

    if (ssl !== undefined) {
      poolConfig.ssl = ssl;
    }

    global.__pgPool = new Pool(poolConfig);
  }

  return global.__pgPool;
}
