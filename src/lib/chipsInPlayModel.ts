import { aggregateRegisteredPlayersForSession } from './playerSessionModel';
import { RegisteredPlayer, SessionPlayer } from './types';

export interface ChipsInPlaySnapshot {
  totalBuyIns: number;
  quitadoCashOuts: number;
  chipsInPlay: number;
  activePlayersCount: number;
}

/** Fichas em jogo = buy-ins cadastrados − cash-outs de jogadores quitados. */
export function computeChipsInPlayFromRegistered(
  players: RegisteredPlayer[],
  sessionDate: string
): ChipsInPlaySnapshot {
  const rows = players.filter((p) => p.date === sessionDate);
  const totalBuyIns = rows.reduce((acc, p) => acc + p.buyIn, 0);
  const aggregated = aggregateRegisteredPlayersForSession(rows, sessionDate);
  const quitadoCashOuts = aggregated
    .filter((p) => p.paymentStatus === 'quitado')
    .reduce((acc, p) => acc + p.cashOut, 0);
  const activePlayersCount = aggregated.filter((p) => p.paymentStatus !== 'quitado').length;

  return {
    totalBuyIns,
    quitadoCashOuts,
    chipsInPlay: totalBuyIns - quitadoCashOuts,
    activePlayersCount,
  };
}

export function computeChipsInPlayFromSessionPlayers(players: SessionPlayer[]): ChipsInPlaySnapshot {
  const totalBuyIns = players.reduce((acc, p) => acc + p.buyIn, 0);
  const quitadoCashOuts = players
    .filter((p) => p.paymentStatus === 'quitado')
    .reduce((acc, p) => acc + p.cashOut, 0);
  const activePlayersCount = players.filter((p) => p.paymentStatus !== 'quitado').length;

  return {
    totalBuyIns,
    quitadoCashOuts,
    chipsInPlay: totalBuyIns - quitadoCashOuts,
    activePlayersCount,
  };
}
