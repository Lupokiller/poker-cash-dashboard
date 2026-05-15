import { NextResponse } from 'next/server';

export function isPostgresPasswordAuthFailure(caught: unknown): boolean {
  const e = caught as { code?: string; message?: string };
  if (e?.code === '28P01') return true;
  const m = e?.message;
  return typeof m === 'string' && m.toLowerCase().includes('password authentication failed');
}

export function isSupabasePoolerTenantNotFound(caught: unknown): boolean {
  const m = caught instanceof Error ? caught.message : '';
  const l = m.toLowerCase();
  return l.includes('tenant/user') && l.includes('not found');
}

export function databaseErrorResponse(caught: unknown, fallbackMessage: string) {
  const msg = caught instanceof Error ? caught.message : '';
  if (isPostgresPasswordAuthFailure(caught)) {
    return NextResponse.json(
      {
        message:
          'Senha do Postgres recusada (28P01). E a senha de Project Settings -> Database (reset/copiar), NAO a anon key nem a service_role do menu API. Confira DATABASE_URL ou DB_PASSWORD, salve o .env e reinicie o npm run dev.',
      },
      { status: 503 }
    );
  }
  if (msg.includes('modo transaction (porta 6543)')) {
    return NextResponse.json({ message: msg }, { status: 503 });
  }
  if (
    msg.includes('ainda contem [YOUR-PASSWORD]') ||
    msg.includes('host da DATABASE_URL e literalmente') ||
    msg.includes('DATABASE_URL invalida') ||
    msg.includes('O usuario do pooler')
  ) {
    return NextResponse.json({ message: msg }, { status: 503 });
  }
  if (isSupabasePoolerTenantNotFound(caught)) {
    return NextResponse.json(
      {
        message:
          'Usuario do pooler Supabase invalido (tenant nao encontrado). Na DATABASE_URL ou DB_USER use postgres.SEU_PROJECT_REF — nao deixe "postgres.xxxx". Copie a URI em Supabase -> Connect -> Session pool (porta 5432). Reinicie o npm run dev.',
      },
      { status: 503 }
    );
  }
  if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
    return NextResponse.json(
      {
        message:
          'Nao foi possivel resolver o host do banco (DNS). Confira DATABASE_URL/DB_HOST. Se usou db.PROJETO.supabase.co e sua rede nao tem IPv6, troque pela URI de Session pool (host *.pooler.supabase.com, porta 5432).',
      },
      { status: 503 }
    );
  }
  if (
    msg.includes('Connection terminated') ||
    msg.includes('connection timeout') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNRESET')
  ) {
    return NextResponse.json(
      {
        message:
          'Conexao com o Postgres caiu ou estourou tempo. Verifique internet/firewall, se o projeto Supabase nao esta pausado e se a URI e Session pool (5432) em vez de Direct se estiver em rede sem IPv6.',
      },
      { status: 503 }
    );
  }
  if (msg.includes('does not exist') && (msg.includes('relation') || msg.includes('table'))) {
    return NextResponse.json(
      {
        message:
          'Tabelas do app nao encontradas no Postgres. No Supabase: SQL Editor -> execute o arquivo db/schema.sql do projeto.',
      },
      { status: 503 }
    );
  }
  if (
    msg.includes('DATABASE_URL is not configured') ||
    msg.includes('Banco nao configurado: defina DATABASE_URL')
  ) {
    return NextResponse.json(
      {
        message:
          'Banco nao configurado: defina DATABASE_URL ou DB_HOST, DB_USER e DB_PASSWORD (veja .env.example), salve e reinicie o npm run dev.',
      },
      { status: 503 }
    );
  }
  console.error(caught);
  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
