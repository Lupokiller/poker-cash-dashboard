import { computeGamificationBadgesFromPlayers, GamificationBadge } from './playerGamificationModel';
import { computeSeasonRanking } from './rankingModel';
import { sessionRakeBruto } from './rakeModel';
import {
  ClubPlayerProfile,
  ClubPlayerStatus,
  PaymentStatus,
  PlayerActivityBadge,
  Session,
} from './types';

export const INACTIVE_DAYS_THRESHOLD = 30;

export type PlayerDisplayStatus = ClubPlayerStatus | PlayerActivityBadge;

export type HistoricalGamificationBadge =
  | 'veterano'
  | 'regular'
  | 'hot_streak'
  | 'alface_ouro'
  | 'sniper_elite'
  | 'filantropo_elite';

export interface HistoricalBadgeMeta {
  id: HistoricalGamificationBadge;
  emoji: string;
  label: string;
  description: string;
  className: string;
}

export const HISTORICAL_BADGES: Record<HistoricalGamificationBadge, HistoricalBadgeMeta> = {
  veterano: {
    id: 'veterano',
    emoji: '🏅',
    label: 'Veterano',
    description: '10 ou mais sessões no clube',
    className: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
  },
  regular: {
    id: 'regular',
    emoji: '🔁',
    label: 'Regular',
    description: '5 ou mais sessões jogadas',
    className: 'border-sky-400/50 bg-sky-500/20 text-sky-200',
  },
  hot_streak: {
    id: 'hot_streak',
    emoji: '🔥',
    label: 'Em chamas',
    description: '3 sessões lucrativas seguidas',
    className: 'border-orange-400/50 bg-orange-500/20 text-orange-200',
  },
  alface_ouro: {
    id: 'alface_ouro',
    emoji: '🥬',
    label: 'Alface de Ouro',
    description: '3+ sessões com 1 buy-in e lucro',
    className: 'border-lime-400/50 bg-lime-500/20 text-lime-200',
  },
  sniper_elite: {
    id: 'sniper_elite',
    emoji: '🎯',
    label: 'Sniper Elite',
    description: 'Maior lucro da mesa em 3+ sessões',
    className: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
  },
  filantropo_elite: {
    id: 'filantropo_elite',
    emoji: '💸',
    label: 'Filantropo Elite',
    description: 'Mais re-buys da mesa em 3+ sessões',
    className: 'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200',
  },
};

export interface PlayerSessionHistoryRow {
  date: string;
  sessionId: string;
  buyIn: number;
  cashOut: number;
  net: number;
  buyInCount: number;
  paymentStatus: PaymentStatus;
  sessionBadges: GamificationBadge[];
  rakeGenerated: number;
}

export interface PlayerDirectoryEntry {
  profile: ClubPlayerProfile;
  sessionsPlayed: number;
  lastPlayedDate: string | null;
  /** Dias desde a última sessão (null se nunca jogou). */
  daysSinceLastPlay: number | null;
  totalNet: number;
  totalBuyIn: number;
  avgBuyIn: number;
  /** Valor estimado gerado para o clube (share do rake). */
  totalRakeGenerated: number;
  profitableSessionRate: number;
  avgNetPerSession: number;
  activityBadge: PlayerActivityBadge;
  displayStatus: PlayerDisplayStatus;
  historicalBadges: HistoricalGamificationBadge[];
  rankingPoints: number;
  rankingRank: number | null;
}

export interface PlayerDetail extends PlayerDirectoryEntry {
  sessionHistory: PlayerSessionHistoryRow[];
  netChartData: { label: string; date: string; cumulativeNet: number }[];
  totalRakeGenerated: number;
}

interface PlayerSessionSlice {
  date: string;
  sessionId: string;
  buyIn: number;
  cashOut: number;
  net: number;
  buyInCount: number;
  paymentStatus: PaymentStatus;
  sessionBadges: GamificationBadge[];
  rakeGenerated: number;
}

function daysSince(dateIso: string, today = new Date()): number {
  const d = new Date(`${dateIso}T12:00:00`);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function resolvePlayerActivity(lastPlayedDate: string | null): PlayerActivityBadge {
  if (!lastPlayedDate) return 'sumido';
  return daysSince(lastPlayedDate) > INACTIVE_DAYS_THRESHOLD ? 'sumido' : 'ativo';
}

export function resolvePlayerDisplayStatus(
  clubStatus: ClubPlayerStatus,
  activityBadge: PlayerActivityBadge
): PlayerDisplayStatus {
  if (clubStatus === 'bloqueado' || clubStatus === 'inativo' || clubStatus === 'vip') {
    return clubStatus;
  }
  return activityBadge;
}

function collectPlayerSessions(sessions: Session[], nameKey: string): PlayerSessionSlice[] {
  const rows: PlayerSessionSlice[] = [];
  for (const session of sessions) {
    const player = session.players.find((p) => p.name.trim().toLowerCase() === nameKey);
    if (!player) continue;
    const badgeMap = computeGamificationBadgesFromPlayers(session.players);
    const sessionRake = sessionRakeBruto(session);
    const playerShare =
      session.totals.buyIn > 0 ? (player.buyIn / session.totals.buyIn) * sessionRake : 0;
    rows.push({
      date: session.date,
      sessionId: session.id,
      buyIn: player.buyIn,
      cashOut: player.cashOut,
      net: player.net,
      buyInCount: player.buyInCount ?? 1,
      paymentStatus: player.paymentStatus,
      sessionBadges: badgeMap.get(nameKey) ?? [],
      rakeGenerated: playerShare,
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeHistoricalPlayerBadges(
  sessions: Session[],
  nameKey: string
): HistoricalGamificationBadge[] {
  const slices = collectPlayerSessions(sessions, nameKey);
  const badges: HistoricalGamificationBadge[] = [];
  if (slices.length >= 10) badges.push('veterano');
  else if (slices.length >= 5) badges.push('regular');

  let streak = 0;
  let maxStreak = 0;
  let goldenLettuce = 0;
  let sniperCount = 0;
  let filantropoCount = 0;

  for (const slice of slices) {
    if (slice.net > 0) {
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
    if (slice.buyInCount === 1 && slice.net > 0) {
      goldenLettuce += 1;
    }
    if (slice.sessionBadges.includes('sniper')) sniperCount += 1;
    if (slice.sessionBadges.includes('filantropo')) filantropoCount += 1;
  }

  if (maxStreak >= 3) badges.push('hot_streak');
  if (goldenLettuce >= 3) badges.push('alface_ouro');
  if (sniperCount >= 3) badges.push('sniper_elite');
  if (filantropoCount >= 3) badges.push('filantropo_elite');

  return badges;
}

function buildDirectoryEntry(
  profile: ClubPlayerProfile,
  sessions: Session[],
  rankingByName: Map<string, { points: number; rank: number }>
): PlayerDirectoryEntry {
  const slices = collectPlayerSessions(sessions, profile.nameKey);
  const sessionsPlayed = slices.length;
  const lastPlayedDate = sessionsPlayed > 0 ? slices[slices.length - 1].date : null;
  const totalNet = slices.reduce((acc, s) => acc + s.net, 0);
  const totalBuyIn = slices.reduce((acc, s) => acc + s.buyIn, 0);
  const totalRakeGenerated = slices.reduce((acc, s) => acc + s.rakeGenerated, 0);
  const profitable = slices.filter((s) => s.net > 0).length;
  const activityBadge = resolvePlayerActivity(lastPlayedDate);
  const ranking = rankingByName.get(profile.nameKey);

  return {
    profile,
    sessionsPlayed,
    lastPlayedDate,
    daysSinceLastPlay: lastPlayedDate ? daysSince(lastPlayedDate) : null,
    totalNet,
    totalBuyIn,
    avgBuyIn: sessionsPlayed > 0 ? totalBuyIn / sessionsPlayed : 0,
    totalRakeGenerated,
    profitableSessionRate: sessionsPlayed > 0 ? (profitable / sessionsPlayed) * 100 : 0,
    avgNetPerSession: sessionsPlayed > 0 ? totalNet / sessionsPlayed : 0,
    activityBadge,
    displayStatus: resolvePlayerDisplayStatus(profile.clubStatus, activityBadge),
    historicalBadges: computeHistoricalPlayerBadges(sessions, profile.nameKey),
    rankingPoints: ranking?.points ?? 0,
    rankingRank: ranking?.rank ?? null,
  };
}

export function buildPlayerDirectory(
  profiles: ClubPlayerProfile[],
  sessions: Session[]
): PlayerDirectoryEntry[] {
  const ranking = computeSeasonRanking(sessions);
  const rankingByName = new Map(
    ranking.map((row) => [row.name.trim().toLowerCase(), { points: row.totalPoints, rank: row.rank }])
  );

  return profiles
    .map((profile) => buildDirectoryEntry(profile, sessions, rankingByName))
    .sort((a, b) => {
      const bySessions = b.sessionsPlayed - a.sessionsPlayed;
      if (bySessions !== 0) return bySessions;
      return a.profile.displayName.localeCompare(b.profile.displayName, 'pt-BR');
    });
}

export function buildPlayerDetail(
  profile: ClubPlayerProfile,
  sessions: Session[]
): PlayerDetail {
  const ranking = computeSeasonRanking(sessions);
  const rankingByName = new Map(
    ranking.map((row) => [row.name.trim().toLowerCase(), { points: row.totalPoints, rank: row.rank }])
  );
  const base = buildDirectoryEntry(profile, sessions, rankingByName);
  const slices = collectPlayerSessions(sessions, profile.nameKey);

  let cumulative = 0;
  const netChartData = slices.map((slice) => {
    cumulative += slice.net;
    return {
      date: slice.date,
      label: slice.date.slice(5).replace('-', '/'),
      cumulativeNet: cumulative,
    };
  });

  return {
    ...base,
    sessionHistory: slices.map((slice) => ({
      date: slice.date,
      sessionId: slice.sessionId,
      buyIn: slice.buyIn,
      cashOut: slice.cashOut,
      net: slice.net,
      buyInCount: slice.buyInCount,
      paymentStatus: slice.paymentStatus,
      sessionBadges: slice.sessionBadges,
      rakeGenerated: slice.rakeGenerated,
    })),
    netChartData,
    totalRakeGenerated: slices.reduce((acc, s) => acc + s.rakeGenerated, 0),
  };
}
