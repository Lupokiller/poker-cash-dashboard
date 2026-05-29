import { SessionClock } from './types';

export type { SessionClock };

/** Duração em ms entre início e fim (ou agora se ainda rodando). */
export function getTableDurationMs(
  startedAt: string | null | undefined,
  endedAt?: string | null,
  now = Date.now()
): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return null;
  const end = endedAt ? new Date(endedAt).getTime() : now;
  if (Number.isNaN(end) || end < start) return null;
  return end - start;
}

/** Formata duração como "Xh Ymin" (mínimo 1 min se > 0). */
export function formatTableDuration(ms: number | null): string {
  if (ms == null || ms <= 0) return '—';
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

/** Horas decimais para cálculo de eficiência. */
export function durationMsToHours(ms: number | null): number | null {
  if (ms == null || ms <= 0) return null;
  return ms / 3_600_000;
}

/** Rake bruto ÷ horas logadas. */
export function computeRakePerHour(rakeBruto: number, durationMs: number | null): number | null {
  const hours = durationMsToHours(durationMs);
  if (hours == null || hours <= 0) return null;
  return rakeBruto / hours;
}

export function formatRakePerHour(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function isTableRunning(clock: SessionClock | null | undefined): boolean {
  return Boolean(clock?.tableStartedAt && !clock?.tableEndedAt);
}
