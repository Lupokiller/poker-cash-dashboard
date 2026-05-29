import { PlayerSummary, Session } from './types';

/** Enriquece resumo de jogadores com métricas de performance por sessão. */
export function enrichPlayersSummaryWithPerformance(
  sessions: Session[],
  summary: PlayerSummary[]
): PlayerSummary[] {
  const stats = new Map<
    string,
    { sessionNets: number[]; rebuyCounts: number[] }
  >();

  for (const session of sessions) {
    for (const player of session.players) {
      const key = player.name.trim().toLowerCase();
      const cur = stats.get(key) ?? { sessionNets: [], rebuyCounts: [] };
      cur.sessionNets.push(player.net);
      cur.rebuyCounts.push(Math.max(0, (player.buyInCount ?? 1) - 1));
      stats.set(key, cur);
    }
  }

  return summary.map((player) => {
    const key = player.name.trim().toLowerCase();
    const data = stats.get(key);
    if (!data || data.sessionNets.length === 0) {
      return {
        ...player,
        avgRebuysPerSession: 0,
        profitableSessionRate: 0,
        avgNetPerSession: player.sessions > 0 ? player.net / player.sessions : 0,
      };
    }

    const profitable = data.sessionNets.filter((n) => n > 0).length;
    const avgRebuys =
      data.rebuyCounts.reduce((a, b) => a + b, 0) / data.rebuyCounts.length;
    const avgNet = data.sessionNets.reduce((a, b) => a + b, 0) / data.sessionNets.length;

    return {
      ...player,
      avgRebuysPerSession: avgRebuys,
      profitableSessionRate: (profitable / data.sessionNets.length) * 100,
      avgNetPerSession: avgNet,
    };
  });
}
