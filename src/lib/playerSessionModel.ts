import { PaymentStatus, RegisteredPlayer } from './types';

export interface AggregatedSessionPlayer {
  name: string;
  buyIn: number;
  cashOut: number;
  net: number;
  paymentStatus: PaymentStatus;
  phone: string;
  sessionDate: string;
  latestRegistrationId: string;
  buyInCount: number;
}

/** Agrega buy-ins/re-buys de um jogador na sessão (para payout e dashboard ao vivo). */
export function aggregateRegisteredPlayersForSession(
  players: RegisteredPlayer[],
  sessionDate: string
): AggregatedSessionPlayer[] {
  const byKey = new Map<
    string,
    {
      displayName: string;
      buyIn: number;
      cashOut: number;
      net: number;
      paymentStatus: PaymentStatus;
      phone: string;
      latestRegistrationId: string;
      buyInCount: number;
      sortKey: string;
    }
  >();

  for (const player of players) {
    if (player.date !== sessionDate) continue;

    const key = player.name.trim().toLowerCase();
    const sortKey = player.id;
    const cur = byKey.get(key);

    if (!cur) {
      byKey.set(key, {
        displayName: player.name.trim(),
        buyIn: player.buyIn,
        cashOut: player.cashOut,
        net: player.net,
        paymentStatus: player.paymentStatus,
        phone: player.phone,
        latestRegistrationId: player.id,
        buyInCount: 1,
        sortKey,
      });
    } else {
      cur.buyIn += player.buyIn;
      cur.cashOut += player.cashOut;
      cur.net += player.net;
      cur.buyInCount += 1;
      if (player.phone.trim()) {
        cur.phone = player.phone;
      }
      if (sortKey >= cur.sortKey) {
        cur.paymentStatus = player.paymentStatus;
        cur.latestRegistrationId = player.id;
        cur.sortKey = sortKey;
      }
    }
  }

  return [...byKey.values()]
    .map((v) => ({
      name: v.displayName,
      buyIn: v.buyIn,
      cashOut: v.cashOut,
      net: v.net,
      paymentStatus: v.paymentStatus,
      phone: v.phone,
      sessionDate,
      latestRegistrationId: v.latestRegistrationId,
      buyInCount: v.buyInCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Soma fiado acumulado do jogador na sessão (buy-ins com paymentMethod fiado). */
export function sumFiadoAccumulatedForPlayer(
  players: RegisteredPlayer[],
  playerName: string,
  sessionDate: string,
  extraBuyIn = 0
): number {
  const key = playerName.trim().toLowerCase();
  let total = extraBuyIn;
  for (const p of players) {
    if (p.date !== sessionDate) continue;
    if (p.name.trim().toLowerCase() !== key) continue;
    if (p.paymentMethod === 'fiado') {
      total += p.buyIn;
    }
  }
  return total;
}
