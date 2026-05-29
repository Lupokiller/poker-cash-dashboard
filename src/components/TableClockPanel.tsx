'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Square, Timer } from 'lucide-react';
import { prettyDate } from '@/lib/data';
import {
  computeRakePerHour,
  formatRakePerHour,
  formatTableDuration,
  getTableDurationMs,
  isTableRunning,
} from '@/lib/sessionClockModel';
import { SessionClock } from '@/lib/types';

function apiMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

export function TableClockPanel({
  sessionDate,
  rakeBruto,
  canControl,
  compact = false,
  onClockChange,
}: {
  sessionDate: string;
  rakeBruto: number;
  canControl: boolean;
  compact?: boolean;
  onClockChange?: () => void;
}) {
  const [clock, setClock] = useState<SessionClock | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const loadClock = useCallback(async () => {
    try {
      const response = await fetch(`/api/session-clock?date=${encodeURIComponent(sessionDate)}`);
      if (!response.ok) return;
      const data = (await response.json()) as SessionClock;
      setClock(data);
    } finally {
      setLoading(false);
    }
  }, [sessionDate]);

  useEffect(() => {
    setLoading(true);
    void loadClock();
  }, [loadClock]);

  useEffect(() => {
    if (!isTableRunning(clock)) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, [clock]);

  const durationMs = useMemo(
    () => getTableDurationMs(clock?.tableStartedAt, clock?.tableEndedAt),
    [clock, tick]
  );
  const rakePerHour = useMemo(() => computeRakePerHour(rakeBruto, durationMs), [rakeBruto, durationMs]);
  const running = isTableRunning(clock);
  const ended = Boolean(clock?.tableStartedAt && clock?.tableEndedAt);

  const runAction = async (action: 'start' | 'end') => {
    setActing(true);
    setError('');
    try {
      const response = await fetch('/api/session-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, date: sessionDate }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiMessageFromBody(payload, 'Nao foi possivel atualizar a mesa.'));
        return;
      }
      setClock(payload as SessionClock);
      onClockChange?.();
    } catch {
      setError('Nao foi possivel atualizar a mesa.');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className={`glass-card ${compact ? 'p-4' : 'p-5'} relative overflow-hidden`}>
      <div
        className='pointer-events-none absolute inset-0 opacity-50'
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 0% 0%, rgba(59,130,246,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(16,185,129,0.08), transparent 50%)',
        }}
      />
      <div className='relative space-y-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5'>
              <Timer className='h-5 w-5 text-sky-400' />
            </div>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-400/90'>
                Tempo de jogo
              </p>
              <h3 className='text-lg font-semibold text-zinc-100'>
                {compact ? 'Cronômetro da mesa' : `Mesa — ${prettyDate(sessionDate)}`}
              </h3>
              <p className='mt-0.5 text-xs text-zinc-500'>
                {running
                  ? 'Mesa em andamento — cronômetro ativo.'
                  : ended
                    ? 'Mesa encerrada — duração registrada.'
                    : 'Inicie quando o primeiro deal começar.'}
              </p>
            </div>
          </div>

          {canControl && (
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                disabled={acting || running || ended || loading}
                onClick={() => void runAction('start')}
                className='inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40'
              >
                <Play className='h-4 w-4' />
                Iniciar Mesa
              </button>
              <button
                type='button'
                disabled={acting || !running || loading}
                onClick={() => void runAction('end')}
                className='inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40'
              >
                <Square className='h-4 w-4' />
                Encerrar Mesa
              </button>
            </div>
          )}
        </div>

        {error && <p className='text-sm text-rose-300'>{error}</p>}

        <div className={`grid gap-3 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          <motion.div
            layout
            className={`rounded-xl border p-3 ${
              running
                ? 'border-emerald-500/35 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                : 'border-zinc-800 bg-zinc-950/40'
            }`}
          >
            <div className='flex items-center gap-2 text-zinc-500'>
              <Clock className='h-3.5 w-3.5' />
              <p className='text-[10px] font-semibold uppercase tracking-wide'>Duração</p>
            </div>
            <p className='mt-2 text-2xl font-bold tabular-nums text-zinc-100'>
              {loading ? '…' : formatTableDuration(durationMs)}
            </p>
            {running && (
              <p className='mt-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400'>Ao vivo</p>
            )}
          </motion.div>

          <div className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-3'>
            <p className='text-[10px] font-semibold uppercase tracking-wide text-zinc-500'>Rake bruto</p>
            <p className='mt-2 text-2xl font-bold tabular-nums text-emerald-400'>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
                rakeBruto
              )}
            </p>
          </div>

          <motion.div
            layout
            className='rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 to-orange-500/5 p-3 ring-1 ring-amber-400/25 sm:col-span-2 lg:col-span-1'
          >
            <p className='text-[10px] font-semibold uppercase tracking-wide text-amber-400/90'>Rake por hora</p>
            <p className='mt-2 text-2xl font-bold tabular-nums text-amber-300'>
              {rakePerHour != null ? `${formatRakePerHour(rakePerHour)} / h` : '—'}
            </p>
            <p className='mt-1 text-[10px] text-zinc-500'>Eficiência horária da mesa</p>
          </motion.div>

          {!compact && (
            <div className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 sm:col-span-2 lg:col-span-1'>
              <p className='text-[10px] font-semibold uppercase tracking-wide text-zinc-500'>Horários</p>
              <p className='mt-2 text-sm text-zinc-300'>
                {clock?.tableStartedAt
                  ? new Date(clock.tableStartedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
                {' → '}
                {clock?.tableEndedAt
                  ? new Date(clock.tableEndedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : running
                    ? 'em andamento'
                    : '—'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
