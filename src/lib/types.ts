export type PaymentStatus = 'a receber' | 'a pagar' | 'quitado';

/** Meio de pagamento do buy-in/re-buy. */
export type PaymentMethod = 'pix' | 'dinheiro' | 'fiado';

export interface SessionClock {
  sessionDate: string;
  tableStartedAt: string | null;
  tableEndedAt: string | null;
}

export interface SessionPlayer {
  name: string;
  buyIn: number;
  cashOut: number;
  net: number;
  paymentStatus: PaymentStatus;
  /** Número de buy-ins/re-buys na sessão (default 1 para sessões antigas). */
  buyInCount?: number;
}

export interface Session {
  id: string;
  date: string;
  /** Valor pago ao staff na noite (persistido em poker_sessions.staff_cost). */
  staffCost: number;
  /** Total recebido via Pix na sessão. */
  totalPix: number;
  /** Total recebido em espécie na sessão. */
  totalDinheiro: number;
  /** Total a receber em fiado na sessão. */
  totalFiado: number;
  /** Início do cronômetro da mesa (ISO). */
  tableStartedAt?: string | null;
  /** Encerramento do cronômetro da mesa (ISO). */
  tableEndedAt?: string | null;
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
  avgRebuysPerSession?: number;
  profitableSessionRate?: number;
  avgNetPerSession?: number;
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
  /** Meio de pagamento desta entrada. */
  paymentMethod: PaymentMethod;
}
