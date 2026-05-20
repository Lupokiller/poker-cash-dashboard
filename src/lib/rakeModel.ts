import { Session } from './types';

/** Tolerância em centavos para arredondamentos de caixa. */
export const CASH_RECONCILE_EPS = 0.02;

/** Entradas da sessão (buy-in + rebuys agregados no campo buy-in). */
export function sessionTotalEntradas(session: Session): number {
  return session.totals.buyIn;
}

/** Saídas da sessão (cash-outs pagos). */
export function sessionTotalSaidas(session: Session): number {
  return session.totals.cashOut;
}

/** Rake = lucro líquido da casa = Entradas − Saídas. */
export function sessionRake(session: Session): number {
  return sessionTotalEntradas(session) - sessionTotalSaidas(session);
}

export interface SessionRakeRow {
  sessionId: string;
  date: string;
  playersCount: number;
  totalEntradas: number;
  totalSaidas: number;
  rake: number;
  reconciled: boolean;
}

/** Valida integridade interna: totais batem com jogadores e Σ net = −rake. */
export function isSessionReconciled(session: Session): boolean {
  const rake = sessionRake(session);
  const sumBuyIn = session.players.reduce((acc, p) => acc + p.buyIn, 0);
  const sumCashOut = session.players.reduce((acc, p) => acc + p.cashOut, 0);
  const sumNet = session.players.reduce((acc, p) => acc + p.net, 0);

  if (Math.abs(sumBuyIn - session.totals.buyIn) > CASH_RECONCILE_EPS) {
    return false;
  }
  if (Math.abs(sumCashOut - session.totals.cashOut) > CASH_RECONCILE_EPS) {
    return false;
  }
  if (Math.abs(sumNet - session.totals.net) > CASH_RECONCILE_EPS) {
    return false;
  }
  if (Math.abs(sumNet + rake) > CASH_RECONCILE_EPS) {
    return false;
  }

  return session.players.every(
    (p) => Math.abs(p.net - (p.cashOut - p.buyIn)) <= CASH_RECONCILE_EPS
  );
}

export function buildSessionRakeRow(session: Session): SessionRakeRow {
  return {
    sessionId: session.id,
    date: session.date,
    playersCount: session.totals.playersCount,
    totalEntradas: sessionTotalEntradas(session),
    totalSaidas: sessionTotalSaidas(session),
    rake: sessionRake(session),
    reconciled: isSessionReconciled(session),
  };
}

export interface ScopedCashAudit {
  /** Rake do período (Entradas − Saídas). */
  rake: number;
  totalEntradas: number;
  totalSaidas: number;
  reconciled: boolean;
  /** Sessões com inconsistência de dados (não confundir com “diferença = rake”). */
  inconsistentSessions: number;
}

export function computeScopedCashAudit(sessions: Session[]): ScopedCashAudit {
  const totalEntradas = sessions.reduce((acc, s) => acc + sessionTotalEntradas(s), 0);
  const totalSaidas = sessions.reduce((acc, s) => acc + sessionTotalSaidas(s), 0);
  const rake = totalEntradas - totalSaidas;
  const inconsistentSessions = sessions.filter((s) => !isSessionReconciled(s)).length;

  return {
    rake,
    totalEntradas,
    totalSaidas,
    reconciled: sessions.length === 0 || inconsistentSessions === 0,
    inconsistentSessions,
  };
}

export interface RakeBillingMetrics {
  totalRakeAccumulated: number;
  averageRakePerSession: number;
  totalSessions: number;
  rows: SessionRakeRow[];
  chartData: { date: string; rake: number; label: string }[];
}

export function computeRakeBillingMetrics(sessions: Session[]): RakeBillingMetrics {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map(buildSessionRakeRow).reverse();
  const totalRakeAccumulated = sorted.reduce((acc, s) => acc + sessionRake(s), 0);
  const totalSessions = sorted.length;
  const averageRakePerSession = totalSessions > 0 ? totalRakeAccumulated / totalSessions : 0;

  const chartData = sorted.map((s) => ({
    date: s.date,
    label: s.date.slice(5).replace('-', '/'),
    rake: sessionRake(s),
  }));

  return {
    totalRakeAccumulated,
    averageRakePerSession,
    totalSessions,
    rows,
    chartData,
  };
}
