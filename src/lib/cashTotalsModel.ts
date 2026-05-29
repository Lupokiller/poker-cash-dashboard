import { PaymentMethod, RegisteredPlayer, Session } from './types';

export function sumRegisteredPlayerCashTotals(players: RegisteredPlayer[]): {
  totalPix: number;
  totalDinheiro: number;
  totalFiado: number;
} {
  let totalPix = 0;
  let totalDinheiro = 0;
  let totalFiado = 0;
  for (const player of players) {
    if (player.paymentMethod === 'dinheiro') {
      totalDinheiro += player.buyIn;
    } else if (player.paymentMethod === 'fiado') {
      totalFiado += player.buyIn;
    } else {
      totalPix += player.buyIn;
    }
  }
  return { totalPix, totalDinheiro, totalFiado };
}

export function sumSessionCashTotals(sessions: Session[]): {
  totalPix: number;
  totalDinheiro: number;
  totalFiado: number;
} {
  return sessions.reduce(
    (acc, session) => ({
      totalPix: acc.totalPix + (session.totalPix || 0),
      totalDinheiro: acc.totalDinheiro + (session.totalDinheiro || 0),
      totalFiado: acc.totalFiado + (session.totalFiado || 0),
    }),
    { totalPix: 0, totalDinheiro: 0, totalFiado: 0 }
  );
}

export function normalizePaymentMethod(value: unknown): PaymentMethod {
  if (value === 'dinheiro') return 'dinheiro';
  if (value === 'fiado') return 'fiado';
  return 'pix';
}
