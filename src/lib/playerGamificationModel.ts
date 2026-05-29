import { Session, SessionPlayer } from './types';

export type GamificationBadge = 'sniper' | 'filantropo' | 'muralha';

export interface GamificationBadgeMeta {
  id: GamificationBadge;
  emoji: string;
  label: string;
  description: string;
  className: string;
}

export const GAMIFICATION_BADGES: Record<GamificationBadge, GamificationBadgeMeta> = {
  sniper: {
    id: 'sniper',
    emoji: '🎯',
    label: 'Sniper',
    description: 'Maior lucro líquido da sessão',
    className:
      'border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/40',
  },
  filantropo: {
    id: 'filantropo',
    emoji: '💸',
    label: 'Filantropo',
    description: 'Mais re-buys na sessão',
    className:
      'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200 shadow-sm shadow-fuchsia-500/20 ring-1 ring-fuchsia-400/40',
  },
  muralha: {
    id: 'muralha',
    emoji: '🧱',
    label: 'Muralha',
    description: 'Apenas 1 buy-in e resultado positivo ou neutro',
    className:
      'border-sky-400/50 bg-sky-500/20 text-sky-200 shadow-sm shadow-sky-500/20 ring-1 ring-sky-400/40',
  },
};

export function computeGamificationBadgesFromPlayers(
  players: SessionPlayer[]
): Map<string, GamificationBadge[]> {
  const result = new Map<string, GamificationBadge[]>();
  if (players.length === 0) return result;

  const nameKey = (name: string) => name.trim().toLowerCase();

  const sniper = [...players].sort((a, b) => b.net - a.net || a.name.localeCompare(b.name))[0];
  if (sniper) {
    result.set(nameKey(sniper.name), [...(result.get(nameKey(sniper.name)) ?? []), 'sniper']);
  }

  const filantropo = [...players].sort((a, b) => {
    const rebuysA = Math.max(0, (a.buyInCount ?? 1) - 1);
    const rebuysB = Math.max(0, (b.buyInCount ?? 1) - 1);
    if (rebuysB !== rebuysA) return rebuysB - rebuysA;
    return b.buyIn - a.buyIn || a.name.localeCompare(b.name);
  })[0];
  if (filantropo && Math.max(0, (filantropo.buyInCount ?? 1) - 1) > 0) {
    result.set(nameKey(filantropo.name), [...(result.get(nameKey(filantropo.name)) ?? []), 'filantropo']);
  }

  for (const p of players) {
    const count = p.buyInCount ?? 1;
    if (count === 1 && p.net >= 0) {
      const key = nameKey(p.name);
      const badges = result.get(key) ?? [];
      if (!badges.includes('muralha')) {
        result.set(key, [...badges, 'muralha']);
      }
    }
  }

  return result;
}

export function computeSessionGamificationBadges(
  sessions: Session[]
): Map<string, GamificationBadge[]> {
  if (sessions.length !== 1) return new Map();
  return computeGamificationBadgesFromPlayers(sessions[0].players);
}

export function badgesMapToRecord(map: Map<string, GamificationBadge[]>): Record<string, GamificationBadge[]> {
  const result: Record<string, GamificationBadge[]> = {};
  for (const [key, badges] of map.entries()) {
    result[key] = badges;
  }
  return result;
}
