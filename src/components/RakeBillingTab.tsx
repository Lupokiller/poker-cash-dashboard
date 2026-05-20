'use client';

import { motion } from 'framer-motion';
import { KpiCard } from '@/components/KpiCard';
import { RakeEvolutionChart } from '@/components/Charts';
import { currency, prettyDate } from '@/lib/data';
import { computeRakeBillingMetrics } from '@/lib/rakeModel';
import { Session } from '@/lib/types';

interface RakeBillingTabProps {
  sessions: Session[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export function RakeBillingTab({ sessions, loading, error, onRefresh }: RakeBillingTabProps) {
  const metrics = computeRakeBillingMetrics(sessions);

  return (
    <section className='space-y-4'>
      <div className='glass-card space-y-3 p-4'>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-zinc-100'>Faturamento / Rake</h2>
            <p className='text-xs text-zinc-500'>
              Lucro da casa por sessão: soma de buy-ins e rebuys menos cash-outs pagos aos jogadores.
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
      </div>

      {!loading && sessions.length === 0 && !error && (
        <p className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
          Ainda não há sessões finalizadas. Finalize jogos na aba Cadastro para ver rake e faturamento aqui.
        </p>
      )}

      <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <KpiCard title='Rake total acumulado' value={currency(metrics.totalRakeAccumulated)} tone='green' />
        <KpiCard title='Média de rake por sessão' value={currency(metrics.averageRakePerSession)} tone='blue' />
        <KpiCard title='Total de sessões' value={String(metrics.totalSessions)} tone='amber' />
      </section>

      <div className='glass-card p-4'>
        <h3 className='mb-1 text-lg font-semibold text-zinc-100'>Histórico jogo a jogo</h3>
        <p className='mb-4 text-xs text-zinc-500'>Valores exatos por noite finalizada no sistema.</p>

        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='text-xs uppercase tracking-wide text-zinc-500'>
              <tr>
                <th className='py-3 text-left font-medium'>Data da Sessão</th>
                <th className='py-3 text-right font-medium'>Qtd Jogadores</th>
                <th className='py-3 text-right font-medium'>Total Entradas</th>
                <th className='py-3 text-right font-medium'>Total Saídas</th>
                <th className='py-3 text-right font-medium'>Rake da Casa</th>
                <th className='py-3 text-right font-medium'>Status</th>
              </tr>
            </thead>
            <tbody className='text-zinc-300'>
              {loading && (
                <tr>
                  <td colSpan={6} className='py-8 text-center text-zinc-500'>
                    Carregando sessões...
                  </td>
                </tr>
              )}
              {!loading &&
                metrics.rows.map((row, index) => (
                  <motion.tr
                    key={row.sessionId}
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
                        {currency(row.rake)}
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
                ))}
              {!loading && metrics.rows.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className='py-8 text-center text-zinc-500'>
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
