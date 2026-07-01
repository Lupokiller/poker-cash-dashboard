import { enrichPlayersSummaryWithPerformance } from './playerPerformanceModel';
import { sessionRakeBruto } from './rakeModel';
import { PlayerSummary, Session } from './types';

export type DashboardScope =
  | { kind: 'session'; sessionId: string }
  | { kind: 'month'; yearMonth: string }
  | { kind: 'total' };

export function filterSessionsByScope(all: Session[], scope: DashboardScope): Session[] {
  const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));
  if (scope.kind === 'total') {
    return sorted;
  }
  if (scope.kind === 'month') {
    return sorted.filter((s) => s.date.slice(0, 7) === scope.yearMonth);
  }
  return sorted.filter((s) => s.id === scope.sessionId);
}

export function buildPlayersSummary(sessions: Session[]): PlayerSummary[] {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<
    string,
    {
      displayName: string;
      buyIn: number;
      cashOut: number;
      net: number;
      sessionCount: number;
      paymentStatus: PlayerSummary['paymentStatus'];
    }
  >();

  for (const s of sorted) {
    for (const p of s.players) {
      const key = p.name.trim().toLowerCase();
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          displayName: p.name.trim(),
          buyIn: p.buyIn,
          cashOut: p.cashOut,
          net: p.net,
          sessionCount: 1,
          paymentStatus: p.paymentStatus,
        });
      } else {
        cur.buyIn += p.buyIn;
        cur.cashOut += p.cashOut;
        cur.net += p.net;
        cur.paymentStatus = p.paymentStatus;
        cur.sessionCount += 1;
      }
    }
  }

  return [...map.entries()].map(([, v]) => ({
    name: v.displayName,
    buyIn: v.buyIn,
    cashOut: v.cashOut,
    net: v.net,
    sessions: v.sessionCount,
    paymentStatus: v.paymentStatus,
  }));
}

/** Rake acumulado por sessão (entradas − saídas), visão do caixa do clube. */
export function buildBankrollPoints(sessions: Session[]) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  return sorted.map((s) => {
    running += sessionRakeBruto(s);
    return { session: s.date.slice(5), balance: running, id: s.id };
  });
}

export interface DashboardMetrics {
  sessions: Session[];
  playersSummary: PlayerSummary[];
  totalBuyIns: number;
  totalCashOuts: number;
  pending: number;
  topWinner: PlayerSummary | undefined;
  topLoser: PlayerSummary | undefined;
  rankingData: { name: string; net: number }[];
  bankrollData: { session: string; balance: number }[];
  dist: { name: string; value: number }[];
}

export function computeDashboardMetrics(sessions: Session[]): DashboardMetrics {
  const totalBuyIns = sessions.reduce((acc, s) => acc + s.totals.buyIn, 0);
  const totalCashOuts = sessions.reduce((acc, s) => acc + s.totals.cashOut, 0);
  const playersSummary = enrichPlayersSummaryWithPerformance(sessions, buildPlayersSummary(sessions));
  const pending = playersSummary.reduce((acc, p) => acc + (p.net > 0 ? p.net : 0), 0);

  const sortedByNet = [...playersSummary].sort((a, b) => b.net - a.net);
  const topWinner = sortedByNet[0];
  const topLoser = [...playersSummary].sort((a, b) => a.net - b.net)[0];

  const rankingData = playersSummary.map((p) => ({ name: p.name, net: p.net }));
  const bankrollFull = buildBankrollPoints(sessions);
  const bankrollData = bankrollFull.map(({ session, balance }) => ({ session, balance }));

  const lucro = playersSummary.filter((p) => p.net > 0).reduce((a, p) => a + p.net, 0);
  const preju = Math.abs(playersSummary.filter((p) => p.net < 0).reduce((a, p) => a + p.net, 0));
  const zero = playersSummary.filter((p) => p.net === 0).length;

  return {
    sessions,
    playersSummary,
    totalBuyIns,
    totalCashOuts,
    pending,
    topWinner,
    topLoser,
    rankingData,
    bankrollData,
    dist: [
      { name: 'Lucro', value: lucro },
      { name: 'Prejuizo', value: preju },
      { name: 'Quitados', value: zero },
    ],
  };
}
