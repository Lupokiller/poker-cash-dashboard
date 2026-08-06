export type PaymentStatus = 'a receber' | 'a pagar' | 'quitado';

/** Meio de pagamento do buy-in/re-buy. */
export type PaymentMethod = 'pix' | 'dinheiro' | 'fiado';

/** Como o saldo final foi acertado (após cash-out). Null = ainda em aberto. */
export type SettlementMethod = 'pix' | 'dinheiro';

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

/** Entrada individual de buy-in/re-buy na sessão. */
export interface BuyInLogEntry {
  time: string;
  amount: number;
  paymentMethod: PaymentMethod;
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
  /** Meio de pagamento da última entrada (ou única). */
  paymentMethod: PaymentMethod;
  /** Histórico de buy-ins com horário. */
  buyInLogs: BuyInLogEntry[];
  /** Como o resultado foi acertado (Pix/Dinheiro). Null enquanto em aberto. */
  settlementMethod: SettlementMethod | null;
  createdAt?: string;
}

/** Status manual do jogador no clube. */
export type ClubPlayerStatus = 'ativo' | 'vip' | 'inativo' | 'bloqueado';

/** Como o jogador chegou ao clube. */
export type PlayerOrigin =
  | ''
  | 'indicacao'
  | 'instagram'
  | 'amigo'
  | 'whatsapp'
  | 'outro';

export const PLAYER_ORIGIN_OPTIONS: { value: PlayerOrigin; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'amigo', label: 'Amigo / mesa' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'outro', label: 'Outro' },
];

/** Badge de atividade calculada automaticamente. */
export type PlayerActivityBadge = 'ativo' | 'sumido';

/** Diretório fixo do clube. */
export interface ClubPlayerProfile {
  nameKey: string;
  displayName: string;
  phone: string;
  notes: string;
  clubStatus: ClubPlayerStatus;
  /** Tags livres (ex.: agressivo, PLO, amigo do Guga). */
  tags: string[];
  /** Origem do jogador no clube. */
  origin: PlayerOrigin;
  firstSeenAt: string | null;
  updatedAt: string | null;
}
