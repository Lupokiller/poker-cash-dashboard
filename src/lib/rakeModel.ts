import { Session } from './types';
import {
  computeRakePerHour,
  formatRakePerHour,
  formatTableDuration,
  getTableDurationMs,
} from './sessionClockModel';

/** Tolerância em centavos para arredondamentos de caixa. */
export const CASH_RECONCILE_EPS = 0.02;

export function sessionTotalEntradas(session: Session): number {
  return session.totals.buyIn;
}

export function sessionTotalSaidas(session: Session): number {
  return session.totals.cashOut;
}

/** Rake bruto = entradas − saídas (antes do custo de staff). */
export function sessionRakeBruto(session: Session): number {
  return sessionTotalEntradas(session) - sessionTotalSaidas(session);
}

export function sessionRake(session: Session): number {
  return sessionRakeBruto(session);
}

export function sessionStaffCost(session: Session): number {
  return Number(session.staffCost) || 0;
}

/** Lucro real no bolso = rake bruto − custo staff. */
export function sessionLucroReal(session: Session): number {
  return sessionRakeBruto(session) - sessionStaffCost(session);
}

export interface SessionRakeRow {
  sessionId: string;
  date: string;
  playersCount: number;
  totalEntradas: number;
  totalSaidas: number;
  rakeBruto: number;
  staffCost: number;
  lucroReal: number;
  reconciled: boolean;
  tableStartedAt: string | null;
  tableEndedAt: string | null;
  durationLabel: string;
  rakePerHour: number | null;
  rakePerHourLabel: string;
}

export function isSessionReconciled(session: Session): boolean {
  const rake = sessionRakeBruto(session);
  const sumBuyIn = session.players.reduce((acc, p) => acc + p.buyIn, 0);
  const sumCashOut = session.players.reduce((acc, p) => acc + p.cashOut, 0);
  const sumNet = session.players.reduce((acc, p) => acc + p.net, 0);

  if (Math.abs(sumBuyIn - session.totals.buyIn) > CASH_RECONCILE_EPS) return false;
  if (Math.abs(sumCashOut - session.totals.cashOut) > CASH_RECONCILE_EPS) return false;
  if (Math.abs(sumNet - session.totals.net) > CASH_RECONCILE_EPS) return false;
  if (Math.abs(sumNet + rake) > CASH_RECONCILE_EPS) return false;

  return session.players.every(
    (p) => Math.abs(p.net - (p.cashOut - p.buyIn)) <= CASH_RECONCILE_EPS
  );
}

export function buildSessionRakeRow(session: Session): SessionRakeRow {
  const rakeBruto = sessionRakeBruto(session);
  const durationMs = getTableDurationMs(session.tableStartedAt, session.tableEndedAt);
  const rakePerHour = computeRakePerHour(rakeBruto, durationMs);

  return {
    sessionId: session.id,
    date: session.date,
    playersCount: session.totals.playersCount,
    totalEntradas: sessionTotalEntradas(session),
    totalSaidas: sessionTotalSaidas(session),
    rakeBruto,
    staffCost: sessionStaffCost(session),
    lucroReal: sessionLucroReal(session),
    reconciled: isSessionReconciled(session),
    tableStartedAt: session.tableStartedAt ?? null,
    tableEndedAt: session.tableEndedAt ?? null,
    durationLabel: formatTableDuration(durationMs),
    rakePerHour,
    rakePerHourLabel: formatRakePerHour(rakePerHour),
  };
}

export interface ScopedCashAudit {
  rake: number;
  totalEntradas: number;
  totalSaidas: number;
  reconciled: boolean;
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
  totalStaffCostAccumulated: number;
  netProfitAccumulated: number;
  totalSessions: number;
  rows: SessionRakeRow[];
  chartData: { date: string; lucroReal: number; label: string }[];
}

export function computeRakeBillingMetrics(sessions: Session[]): RakeBillingMetrics {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map(buildSessionRakeRow).reverse();
  const totalRakeAccumulated = sorted.reduce((acc, s) => acc + sessionRakeBruto(s), 0);
  const totalStaffCostAccumulated = sorted.reduce((acc, s) => acc + sessionStaffCost(s), 0);
  const netProfitAccumulated = totalRakeAccumulated - totalStaffCostAccumulated;
  const totalSessions = sorted.length;
  const averageRakePerSession = totalSessions > 0 ? totalRakeAccumulated / totalSessions : 0;

  const chartData = sorted.map((s) => ({
    date: s.date,
    label: s.date.slice(5).replace('-', '/'),
    lucroReal: sessionLucroReal(s),
  }));

  return {
    totalRakeAccumulated,
    averageRakePerSession,
    totalStaffCostAccumulated,
    netProfitAccumulated,
    totalSessions,
    rows,
    chartData,
  };
}
