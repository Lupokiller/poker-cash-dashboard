import { Session } from './types';

export interface SeasonRankingEntry {
  rank: number;
  name: string;
  totalPoints: number;
  sessionsPlayed: number;
  presencePoints: number;
  performancePoints: number;
  goldenLettuceCount: number;
  totalNet: number;
}

/** Ranking da temporada: +50 presença, +1/R$ lucro, +20 Alface de Ouro (1 buy-in + lucro). */
export function computeSeasonRanking(sessions: Session[]): SeasonRankingEntry[] {
  const byName = new Map<
    string,
    {
      displayName: string;
      sessionsPlayed: number;
      presencePoints: number;
      performancePoints: number;
      goldenLettuceCount: number;
      totalNet: number;
    }
  >();

  for (const session of sessions) {
    for (const player of session.players) {
      const key = player.name.trim().toLowerCase();
      const cur = byName.get(key) ?? {
        displayName: player.name.trim(),
        sessionsPlayed: 0,
        presencePoints: 0,
        performancePoints: 0,
        goldenLettuceCount: 0,
        totalNet: 0,
      };

      cur.sessionsPlayed += 1;
      cur.presencePoints += 50;
      cur.totalNet += player.net;

      if (player.net > 0) {
        cur.performancePoints += Math.floor(player.net);
      }

      const buyInCount = player.buyInCount ?? 1;
      if (buyInCount === 1 && player.net > 0) {
        cur.goldenLettuceCount += 1;
        cur.performancePoints += 20;
      }

      byName.set(key, cur);
    }
  }

  const rows = [...byName.values()]
    .map((v) => ({
      rank: 0,
      name: v.displayName,
      totalPoints: v.presencePoints + v.performancePoints,
      sessionsPlayed: v.sessionsPlayed,
      presencePoints: v.presencePoints,
      performancePoints: v.performancePoints,
      goldenLettuceCount: v.goldenLettuceCount,
      totalNet: v.totalNet,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalNet - a.totalNet || a.name.localeCompare(b.name));

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
