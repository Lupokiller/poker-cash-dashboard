'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { KpiCard } from '@/components/KpiCard';
import { TableClockPanel } from '@/components/TableClockPanel';
import { RakeEvolutionChart } from '@/components/Charts';
import { currency, prettyDate } from '@/lib/data';
import { computeRakeBillingMetrics, sessionRakeBruto, type SessionRakeRow } from '@/lib/rakeModel';
import { todayLocalISODate } from '@/lib/time';
import { RegisteredPlayer, Session } from '@/lib/types';

function apiMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

function SessionRakeTableRow({
  row,
  canEdit,
  onSessionUpdated,
  onError,
  index,
}: {
  row: SessionRakeRow;
  canEdit: boolean;
  onSessionUpdated: (session: Session) => void;
  onError: (message: string) => void;
  index: number;
}) {
  const [staffInput, setStaffInput] = useState(String(row.staffCost));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStaffInput(String(row.staffCost));
  }, [row.staffCost, row.sessionId]);

  const staffDraft = Number(staffInput);
  const staffCostLive = Number.isFinite(staffDraft) && staffDraft >= 0 ? staffDraft : 0;
  const lucroRealLive = row.rakeBruto - staffCostLive;

  const persistStaff = async () => {
    const staffCost = staffCostLive;
    setStaffInput(String(staffCost));

    if (staffCost === row.staffCost) {
      return;
    }

    setSaving(true);
    onError('');
    try {
      const response = await fetch(`/api/sessions/${row.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffCost }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        onError(apiMessageFromBody(payload, 'Nao foi possivel salvar o custo de staff.'));
        setStaffInput(String(row.staffCost));
        return;
      }
      onSessionUpdated(payload as Session);
    } catch {
      onError('Nao foi possivel salvar o custo de staff.');
      setStaffInput(String(row.staffCost));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.22 }}
      className='border-t border-zinc-800/80'
    >
      <td className='py-2.5 font-medium text-zinc-100'>{prettyDate(row.date)}</td>
      <td className='py-2.5 text-right tabular-nums'>{row.playersCount}</td>
      <td className='py-2.5 text-right tabular-nums text-zinc-400'>{currency(row.totalEntradas)}</td>
      <td className='py-2.5 text-right tabular-nums text-zinc-400'>{currency(row.totalSaidas)}</td>
      <td className='py-2.5 text-right'>
        <span className='inline-block rounded-lg bg-emerald-500/10 px-2 py-1 font-semibold tabular-nums text-emerald-400 ring-1 ring-emerald-500/20'>
          {currency(row.rakeBruto)}
        </span>
      </td>
      <td className='py-2.5 text-right tabular-nums text-zinc-400'>{row.durationLabel}</td>
      <td className='py-2.5 text-right'>
        <span className='inline-block rounded-lg bg-amber-500/10 px-2 py-1 font-semibold tabular-nums text-amber-300 ring-1 ring-amber-500/20'>
          {row.rakePerHourLabel === '—' ? '—' : `${row.rakePerHourLabel}/h`}
        </span>
      </td>
      <td className='py-2.5 text-right'>
        <div className='flex justify-end'>
          {canEdit ? (
            <input
              type='number'
              min='0'
              step='1'
              disabled={saving}
              value={staffInput}
              onChange={(e) => setStaffInput(e.target.value)}
              onBlur={() => void persistStaff()}
              placeholder='0'
              className='w-28 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1 text-right text-sm tabular-nums text-zinc-100 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 disabled:opacity-50'
              aria-label={`Custo staff — ${prettyDate(row.date)}`}
            />
          ) : (
            <span className='tabular-nums text-zinc-400'>{currency(row.staffCost)}</span>
          )}
        </div>
      </td>
      <td className='py-2.5 text-right'>
        <span
          className={`inline-block rounded-lg px-2 py-1 font-semibold tabular-nums ring-1 ${
            lucroRealLive >= 0
              ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
          }`}
        >
          {currency(lucroRealLive)}
        </span>
      </td>
      <td className='py-2.5 text-right'>
        {row.reconciled ? (
          <span className='inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300'>
            Conciliado
          </span>
        ) : (
          <span className='inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300'>
            Revisar
          </span>
        )}
      </td>
    </motion.tr>
  );
}

interface RakeBillingTabProps {
  sessions: Session[];
  registeredPlayers?: RegisteredPlayer[];
  loading: boolean;
  error: string;
  canEditStaffCost: boolean;
  canControlTable: boolean;
  onRefresh: () => void;
  onSessionUpdated: (session: Session) => void;
}

function liveRakeForDate(registeredPlayers: RegisteredPlayer[], date: string): number {
  const rows = registeredPlayers.filter((p) => p.date === date);
  const buyIn = rows.reduce((acc, p) => acc + p.buyIn, 0);
  const cashOut = rows.reduce((acc, p) => acc + p.cashOut, 0);
  return buyIn - cashOut;
}

export function RakeBillingTab({
  sessions,
  registeredPlayers = [],
  loading,
  error,
  canEditStaffCost,
  canControlTable,
  onRefresh,
  onSessionUpdated,
}: RakeBillingTabProps) {
  const [staffSaveError, setStaffSaveError] = useState('');
  const [clockDate, setClockDate] = useState(() => todayLocalISODate());
  const metrics = useMemo(() => computeRakeBillingMetrics(sessions), [sessions]);

  const clockSession = useMemo(
    () => sessions.find((s) => s.date === clockDate),
    [sessions, clockDate]
  );

  const clockRakeBruto = useMemo(() => {
    if (clockSession) return sessionRakeBruto(clockSession);
    return liveRakeForDate(registeredPlayers, clockDate);
  }, [clockSession, registeredPlayers, clockDate]);

  const avgRakePerHour = useMemo(() => {
    const withRate = metrics.rows.filter((r) => r.rakePerHour != null);
    if (withRate.length === 0) return null;
    return withRate.reduce((acc, r) => acc + (r.rakePerHour ?? 0), 0) / withRate.length;
  }, [metrics.rows]);

  return (
    <section className='space-y-4'>
      <div className='glass-card space-y-3 p-4'>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-zinc-100'>Faturamento / Rake</h2>
            <p className='text-xs text-zinc-500'>
              Informe o que pagou ao staff em cada noite; o lucro real é o rake bruto menos esse custo.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={onRefresh}
              className='rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800/70'
            >
              Atualizar
            </button>
            {loading && <span className='text-xs text-zinc-500'>Carregando...</span>}
          </div>
        </div>
        {error && <p className='text-sm text-rose-300'>{error}</p>}
        {staffSaveError && <p className='text-sm text-rose-300'>{staffSaveError}</p>}
      </div>

      <div className='glass-card space-y-3 p-4'>
        <label className='flex max-w-xs flex-col gap-1 text-xs text-zinc-500'>
          Data do controle da mesa
          <input
            type='date'
            value={clockDate}
            onChange={(e) => setClockDate(e.target.value)}
            className='rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50'
          />
        </label>
        <TableClockPanel
          sessionDate={clockDate}
          rakeBruto={clockRakeBruto}
          canControl={canControlTable}
          onClockChange={onRefresh}
        />
      </div>

      {!loading && sessions.length === 0 && !error && (
        <p className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
          Ainda não há sessões finalizadas. Finalize jogos na aba Cadastro para ver rake e faturamento aqui.
        </p>
      )}

      <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        <KpiCard title='Rake total acumulado' value={currency(metrics.totalRakeAccumulated)} tone='green' />
        <KpiCard title='Média de rake por sessão' value={currency(metrics.averageRakePerSession)} tone='blue' />
        <KpiCard
          title='Média rake / hora'
          value={
            avgRakePerHour != null
              ? `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgRakePerHour)}/h`
              : '—'
          }
          tone='amber'
        />
        <KpiCard title='Custo total de staff' value={currency(metrics.totalStaffCostAccumulated)} tone='amber' />
        <KpiCard
          title='Lucro real líquido'
          value={currency(metrics.netProfitAccumulated)}
          tone={metrics.netProfitAccumulated >= 0 ? 'green' : 'red'}
        />
        <KpiCard title='Total de sessões' value={String(metrics.totalSessions)} tone='blue' />
      </section>

      <div className='glass-card p-4'>
        <h3 className='mb-1 text-lg font-semibold text-zinc-100'>Histórico jogo a jogo</h3>
        <p className='mb-4 text-xs text-zinc-500'>
          {canEditStaffCost
            ? 'Digite o valor pago ao staff na coluna "Custo Staff" e saia do campo para salvar.'
            : 'Somente administradores podem editar o custo de staff.'}
        </p>

        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='text-xs uppercase tracking-wide text-zinc-500'>
              <tr>
                <th className='py-3 text-left font-medium'>Data da Sessão</th>
                <th className='py-3 text-right font-medium'>Qtd Jogadores</th>
                <th className='py-3 text-right font-medium'>Total Entradas</th>
                <th className='py-3 text-right font-medium'>Total Saídas</th>
                <th className='py-3 text-right font-medium'>Rake Bruto</th>
                <th className='py-3 text-right font-medium'>Duração</th>
                <th className='py-3 text-right font-medium'>Rake / Hora</th>
                <th className='py-3 text-right font-medium'>Custo Staff</th>
                <th className='py-3 text-right font-medium'>Lucro Real</th>
                <th className='py-3 text-right font-medium'>Status</th>
              </tr>
            </thead>
            <tbody className='text-zinc-300'>
              {loading && (
                <tr>
                  <td colSpan={10} className='py-8 text-center text-zinc-500'>
                    Carregando sessões...
                  </td>
                </tr>
              )}
              {!loading &&
                metrics.rows.map((row, index) => (
                  <SessionRakeTableRow
                    key={row.sessionId}
                    row={row}
                    index={index}
                    canEdit={canEditStaffCost}
                    onSessionUpdated={onSessionUpdated}
                    onError={setStaffSaveError}
                  />
                ))}
              {!loading && metrics.rows.length === 0 && !error && (
                <tr>
                  <td colSpan={10} className='py-8 text-center text-zinc-500'>
                    Nenhuma sessão no histórico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {metrics.chartData.length > 0 && <RakeEvolutionChart data={metrics.chartData} />}
    </section>
  );
}
