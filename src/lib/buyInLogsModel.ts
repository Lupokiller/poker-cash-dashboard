import { normalizePaymentMethod } from './cashTotalsModel';
import { nowHHMM } from './time';
import { BuyInLogEntry, PaymentMethod, RegisteredPlayer } from './types';

export function parseBuyInLogs(raw: unknown): BuyInLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const amount = Number(row.amount);
      const time = typeof row.time === 'string' ? row.time : '';
      if (!Number.isFinite(amount) || amount <= 0 || !time) return null;
      return {
        time,
        amount,
        paymentMethod: normalizePaymentMethod(row.paymentMethod),
      };
    })
    .filter((entry): entry is BuyInLogEntry => entry !== null);
}

export function sumBuyInLogs(logs: BuyInLogEntry[]): number {
  return logs.reduce((acc, log) => acc + log.amount, 0);
}

export function createBuyInLogEntry(
  amount: number,
  paymentMethod: PaymentMethod,
  time = nowHHMM()
): BuyInLogEntry {
  return { time, amount, paymentMethod };
}

/** Reconstrói logs a partir de linhas legadas (sem buy_in_logs). */
export function buyInLogsFromLegacyRows(
  rows: Array<{ buyIn: number; paymentMethod: PaymentMethod; createdAt?: string }>
): BuyInLogEntry[] {
  return rows.map((row) => {
    let time = nowHHMM();
    if (row.createdAt) {
      const d = new Date(row.createdAt);
      if (!Number.isNaN(d.getTime())) {
        time = nowHHMM(d);
      }
    }
    return createBuyInLogEntry(row.buyIn, row.paymentMethod, time);
  });
}

export function formatBuyInHistorySummary(logs: BuyInLogEntry[], totalBuyIn: number): string {
  if (logs.length === 0) return currencyCompact(totalBuyIn);
  const count = logs.length;
  const details = logs.map((log) => `[${log.time}] ${currencyCompact(log.amount)}`).join(' | ');
  return `${currencyCompact(totalBuyIn)} (${count}x) → ${details}`;
}

function currencyCompact(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function resolveBuyInLogs(player: RegisteredPlayer & { createdAt?: string }): BuyInLogEntry[] {
  if (player.buyInLogs.length > 0) return player.buyInLogs;
  if (player.buyIn > 0) {
    return buyInLogsFromLegacyRows([
      {
        buyIn: player.buyIn,
        paymentMethod: player.paymentMethod,
        createdAt: player.createdAt,
      },
    ]);
  }
  return [];
}

export function cashTotalsFromBuyInLogs(logs: BuyInLogEntry[]) {
  let totalPix = 0;
  let totalDinheiro = 0;
  let totalFiado = 0;
  for (const log of logs) {
    if (log.paymentMethod === 'dinheiro') totalDinheiro += log.amount;
    else if (log.paymentMethod === 'fiado') totalFiado += log.amount;
    else totalPix += log.amount;
  }
  return { totalPix, totalDinheiro, totalFiado };
}

export function fiadoFromBuyInLogs(logs: BuyInLogEntry[]): number {
  return logs.filter((log) => log.paymentMethod === 'fiado').reduce((acc, log) => acc + log.amount, 0);
}

export function latestPaymentMethodFromLogs(logs: BuyInLogEntry[], fallback: PaymentMethod): PaymentMethod {
  return logs.length > 0 ? logs[logs.length - 1].paymentMethod : fallback;
}

export function hasMixedPaymentMethods(logs: BuyInLogEntry[]): boolean {
  if (logs.length <= 1) return false;
  const first = logs[0].paymentMethod;
  return logs.some((log) => log.paymentMethod !== first);
}

/** Verifica se o meio de pagamento aparece no histórico do jogador. */
export function playerHasPaymentMethodInHistory(
  player: RegisteredPlayer,
  method: PaymentMethod
): boolean {
  const logs = resolveBuyInLogs(player);
  if (logs.length > 0) {
    return logs.some((log) => log.paymentMethod === method);
  }
  return player.paymentMethod === method;
}

export type PaymentMethodFilter = 'all' | PaymentMethod;

export function filterPlayersByPaymentMethod(
  players: RegisteredPlayer[],
  filter: PaymentMethodFilter
): RegisteredPlayer[] {
  if (filter === 'all') return players;
  return players.filter((player) => playerHasPaymentMethodInHistory(player, filter));
}

export interface PaymentMethodBreakdownEntry {
  playerName: string;
  amount: number;
}

/** Lista jogadores e valores que compõem o total de um meio de pagamento. */
export function buildPaymentMethodBreakdown(
  players: RegisteredPlayer[],
  method: PaymentMethod
): PaymentMethodBreakdownEntry[] {
  const byKey = new Map<string, { displayName: string; amount: number }>();

  for (const player of players) {
    const logs = resolveBuyInLogs(player);
    let amount = 0;

    if (logs.length > 0) {
      amount = logs
        .filter((log) => log.paymentMethod === method)
        .reduce((acc, log) => acc + log.amount, 0);
    } else if (player.paymentMethod === method) {
      amount = player.buyIn;
    }

    if (amount <= 0) continue;

    const key = player.name.trim().toLowerCase();
    const cur = byKey.get(key);
    if (cur) {
      cur.amount += amount;
    } else {
      byKey.set(key, { displayName: player.name.trim(), amount });
    }
  }

  return [...byKey.values()]
    .map((entry) => ({ playerName: entry.displayName, amount: entry.amount }))
    .sort((a, b) => b.amount - a.amount || a.playerName.localeCompare(b.playerName));
}

/** Une linhas legadas duplicadas para exibição na sessão. */
export function unifyRegisteredPlayersForSession(
  players: RegisteredPlayer[],
  sessionDate: string
): RegisteredPlayer[] {
  const filtered = players.filter((player) => player.date === sessionDate);
  const groups = new Map<string, RegisteredPlayer[]>();

  for (const player of filtered) {
    const key = player.name.trim().toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(player);
    groups.set(key, list);
  }

  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];

    const sorted = [...group].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const latest = sorted[sorted.length - 1];
    const mergedLogs = sorted.flatMap((row) => resolveBuyInLogs(row));
    const totalBuyIn = sorted.reduce((acc, row) => acc + row.buyIn, 0);
    const totalCashOut = sorted.reduce((acc, row) => acc + row.cashOut, 0);

    return {
      ...latest,
      buyIn: totalBuyIn,
      cashOut: totalCashOut,
      net: totalCashOut - totalBuyIn,
      buyInLogs: mergedLogs,
      settlementMethod: latest.settlementMethod ?? null,
    };
  });
}
