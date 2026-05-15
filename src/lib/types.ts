export type PaymentStatus = 'a receber' | 'a pagar' | 'quitado';

export interface SessionPlayer {
  name: string;
  buyIn: number;
  cashOut: number;
  net: number;
  paymentStatus: PaymentStatus;
}

export interface Session {
  id: string;
  date: string;
  players: SessionPlayer[];
  totals: {
    buyIn: number;
    cashOut: number;
    net: number;
    playersCount: number;
  };
}

export interface PlayerSummary {
  name: string;
  buyIn: number;
  cashOut: number;
  net: number;
  sessions: number;
  paymentStatus: PaymentStatus;
}

export interface PokerData {
  generatedAt: string;
  sourceFile: string;
  sessions: Session[];
  playersSummary: PlayerSummary[];
}

export interface RegisteredPlayer {
  id: string;
  name: string;
  date: string;
  buyIn: number;
  cashOut: number;
  net: number;
  paymentStatus: PaymentStatus;
  phone: string;
  notes: string;
}
