'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from 'lucide-react';
import { PlayerDetailPanel } from '@/components/PlayerDetailPanel';
import { PlayerDirectoryAvatar } from '@/components/PlayerDirectoryAvatar';
import { HistoricalPlayerBadges } from '@/components/HistoricalPlayerBadges';
import { PlayerStatusBadge } from '@/components/PlayerStatusBadge';
import { currency, prettyDate } from '@/lib/data';
import { PlayerDirectoryEntry, PlayerDisplayStatus } from '@/lib/playerDirectoryModel';
import { formatBrazilPhoneInput } from '@/lib/phoneMask';

type StatusFilter = 'all' | PlayerDisplayStatus;
type SortKey = 'name' | 'sessions' | 'lastPlayed' | 'net' | 'ltv';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: { id: StatusFilter; label: string; activeClass: string }[] = [
  { id: 'all', label: 'Todos', activeClass: 'border-zinc-400/40 bg-zinc-500/15 text-zinc-100' },
  { id: 'ativo', label: 'Ativos', activeClass: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100' },
  { id: 'sumido', label: 'Sumidos', activeClass: 'border-zinc-500/45 bg-zinc-600/20 text-zinc-200' },
  { id: 'vip', label: 'VIP', activeClass: 'border-amber-500/45 bg-amber-500/15 text-amber-100' },
  { id: 'inativo', label: 'Inativos', activeClass: 'border-zinc-600/45 bg-zinc-700/25 text-zinc-300' },
  { id: 'bloqueado', label: 'Bloqueados', activeClass: 'border-rose-500/45 bg-rose-500/15 text-rose-100' },
];

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = activeKey === sortKey;
  return (
    <button
      type='button'
      onClick={() => onSort(sortKey)}
      className={`group inline-flex items-center gap-1 font-medium transition hover:text-zinc-300 ${
        align === 'right' ? 'ml-auto' : ''
      } ${active ? 'text-emerald-300' : ''}`}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className='h-3 w-3' />
        ) : (
          <ArrowDown className='h-3 w-3' />
        )
      ) : (
        <span className='h-3 w-3 opacity-0 group-hover:opacity-40'>↕</span>
      )}
    </button>
  );
}

function DirectoryKpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${accent}`}>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-zinc-500'>{label}</p>
          <p className='mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-100'>{value}</p>
          {sub && <p className='mt-0.5 text-xs text-zinc-500'>{sub}</p>}
        </div>
        <div className='rounded-lg border border-white/5 bg-black/20 p-2'>
          <Icon className='h-4 w-4 text-zinc-400' />
        </div>
      </div>
    </div>
  );
}

export function PlayersDirectoryTab() {
  const [entries, setEntries] = useState<PlayerDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('lastPlayed');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedNameKey, setSelectedNameKey] = useState<string | null>(null);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/players');
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: string }).message)
            : 'Nao foi possivel carregar jogadores.'
        );
      }
      setEntries(Array.isArray(body) ? (body as PlayerDirectoryEntry[]) : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao carregar.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = {
      all: entries.length,
      ativo: 0,
      sumido: 0,
      vip: 0,
      inativo: 0,
      bloqueado: 0,
    };
    for (const entry of entries) {
      map[entry.displayStatus] += 1;
    }
    return map;
  }, [entries]);

  const summary = useMemo(() => {
    const withSessions = entries.filter((e) => e.sessionsPlayed > 0).length;
    const totalLtv = entries.reduce((acc, e) => acc + e.totalRakeGenerated, 0);
    const sumidosAtRisk = [...entries]
      .filter((e) => e.activityBadge === 'sumido' && e.totalRakeGenerated > 0)
      .sort((a, b) => b.totalRakeGenerated - a.totalRakeGenerated)
      .slice(0, 5);
    return { withSessions, totalLtv, sumidosAtRisk };
  }, [entries]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.displayStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const phone = entry.profile.phone.replace(/\D/g, '');
      const tags = entry.profile.tags.join(' ');
      const origin = entry.profile.origin;
      return (
        entry.profile.displayName.toLowerCase().includes(q) ||
        phone.includes(q.replace(/\D/g, '')) ||
        tags.includes(q) ||
        origin.includes(q)
      );
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortKey === 'name') {
        return dir * a.profile.displayName.localeCompare(b.profile.displayName, 'pt-BR');
      }
      if (sortKey === 'sessions') {
        return dir * (a.sessionsPlayed - b.sessionsPlayed);
      }
      if (sortKey === 'net') {
        return dir * (a.totalNet - b.totalNet);
      }
      if (sortKey === 'ltv') {
        return dir * (a.totalRakeGenerated - b.totalRakeGenerated);
      }
      const dateA = a.lastPlayedDate ?? '';
      const dateB = b.lastPlayedDate ?? '';
      return dir * dateA.localeCompare(dateB);
    });

    return list;
  }, [entries, query, statusFilter, sortKey, sortDir]);

  return (
    <section className='space-y-5'>
      {/* Hero */}
      <div className='glass-card relative overflow-hidden p-5 md:p-6'>
        <div
          className='pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.07] via-transparent to-sky-500/[0.04]'
          aria-hidden
        />
        <div className='relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div>
            <p className='text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80'>
              Diretório do clube
            </p>
            <h2 className='mt-1 text-2xl font-semibold tracking-tight text-zinc-100'>Jogadores</h2>
            <p className='mt-2 max-w-xl text-sm text-zinc-500'>
              Fichas completas com histórico, desempenho e notas internas. Clique em um jogador para ver detalhes.
            </p>
          </div>
          <button
            type='button'
            onClick={() => void loadDirectory()}
            disabled={loading}
            className='inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800/80 disabled:opacity-50'
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar lista
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <DirectoryKpi
          label='Cadastrados'
          value={entries.length}
          sub={`${summary.withSessions} já jogaram`}
          icon={Users}
          accent='border-zinc-800 from-zinc-900/60 to-zinc-950/40'
        />
        <DirectoryKpi
          label='Ativos'
          value={counts.ativo}
          sub='Últimos 30 dias'
          icon={UserCheck}
          accent='border-emerald-500/20 from-emerald-500/10 to-zinc-950/40'
        />
        <DirectoryKpi
          label='Sumidos'
          value={counts.sumido}
          sub='Sem jogar há +30 dias'
          icon={UserX}
          accent='border-zinc-700/50 from-zinc-800/30 to-zinc-950/40'
        />
        <DirectoryKpi
          label='LTV do clube'
          value={currency(summary.totalLtv)}
          sub='Rake estimado gerado'
          icon={Wallet}
          accent='border-sky-500/20 from-sky-500/10 to-zinc-950/40'
        />
      </div>

      {summary.sumidosAtRisk.length > 0 && (
        <div className='glass-card border-amber-500/20 p-4'>
          <div className='mb-3 flex items-center justify-between gap-2'>
            <div>
              <h3 className='text-sm font-semibold text-zinc-100'>Sumidos de alto valor</h3>
              <p className='text-xs text-zinc-500'>
                Jogaram bem para o clube e sumiram — priorize o retorno.
              </p>
            </div>
            <button
              type='button'
              onClick={() => setStatusFilter('sumido')}
              className='rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800'
            >
              Ver todos sumidos
            </button>
          </div>
          <ul className='grid gap-2 sm:grid-cols-2 lg:grid-cols-5'>
            {summary.sumidosAtRisk.map((entry) => (
              <li key={entry.profile.nameKey}>
                <button
                  type='button'
                  onClick={() => setSelectedNameKey(entry.profile.nameKey)}
                  className='w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5'
                >
                  <p className='truncate text-sm font-medium text-zinc-100'>
                    {entry.profile.displayName}
                  </p>
                  <p className='mt-0.5 text-[11px] text-zinc-500'>
                    {entry.daysSinceLastPlay != null
                      ? `${entry.daysSinceLastPlay}d fora`
                      : 'Sem sessões'}{' '}
                    · LTV {currency(entry.totalRakeGenerated)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toolbar + table */}
      <div className='glass-card overflow-hidden'>
        <div className='border-b border-zinc-800/80 p-4'>
          {error && (
            <p className='mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'>
              {error}
            </p>
          )}

          <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600' />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Buscar nome, telefone, tag ou origem...'
                className='w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20'
              />
            </div>
            <p className='shrink-0 text-xs tabular-nums text-zinc-500'>
              Exibindo <span className='font-medium text-zinc-300'>{filtered.length}</span> de{' '}
              {entries.length}
            </p>
          </div>

          <div className='mt-3 flex flex-wrap gap-1.5'>
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type='button'
                onClick={() => setStatusFilter(filter.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === filter.id
                    ? filter.activeClass
                    : 'border-zinc-800/80 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {filter.label}
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] tabular-nums ${
                    statusFilter === filter.id ? 'bg-black/20' : 'bg-zinc-800/80'
                  }`}
                >
                  {counts[filter.id]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='border-b border-zinc-800/80 bg-zinc-900/50 text-[10px] uppercase tracking-wider text-zinc-500'>
                <th className='px-4 py-3 text-left'>
                  <SortHeader
                    label='Jogador'
                    sortKey='name'
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className='hidden px-4 py-3 text-left font-medium md:table-cell'>Contato</th>
                <th className='px-4 py-3 text-left font-medium'>Status</th>
                <th className='px-4 py-3 text-right'>
                  <SortHeader
                    label='Sessões'
                    sortKey='sessions'
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align='right'
                  />
                </th>
                <th className='hidden px-4 py-3 text-left sm:table-cell'>
                  <SortHeader
                    label='Última sessão'
                    sortKey='lastPlayed'
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className='px-4 py-3 text-right'>
                  <SortHeader
                    label='LTV'
                    sortKey='ltv'
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align='right'
                  />
                </th>
                <th className='px-4 py-3 text-right'>
                  <SortHeader
                    label='Resultado'
                    sortKey='net'
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align='right'
                  />
                </th>
                <th className='hidden px-4 py-3 text-left font-medium lg:table-cell'>Conquistas</th>
                <th className='w-10 px-2 py-3' aria-hidden />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className='border-b border-zinc-800/50'>
                    <td colSpan={9} className='px-4 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='h-10 w-10 animate-pulse rounded-full bg-zinc-800' />
                        <div className='flex-1 space-y-2'>
                          <div className='h-3 w-32 animate-pulse rounded bg-zinc-800' />
                          <div className='h-2 w-20 animate-pulse rounded bg-zinc-800/70' />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading &&
                filtered.map((entry, index) => (
                  <motion.tr
                    key={entry.profile.nameKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.02, 0.2) }}
                    className='group border-b border-zinc-800/50 transition hover:bg-emerald-500/[0.03]'
                  >
                    <td className='px-4 py-3'>
                      <button
                        type='button'
                        onClick={() => setSelectedNameKey(entry.profile.nameKey)}
                        className='flex w-full items-center gap-3 text-left'
                      >
                        <PlayerDirectoryAvatar
                          name={entry.profile.displayName}
                          status={entry.displayStatus}
                          size='sm'
                        />
                        <div className='min-w-0'>
                          <p className='truncate font-medium text-zinc-100 group-hover:text-emerald-200'>
                            {entry.profile.displayName}
                          </p>
                          <div className='mt-0.5 flex flex-wrap gap-1'>
                            {entry.profile.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className='rounded border border-zinc-700/80 bg-zinc-900/80 px-1.5 py-px text-[10px] text-zinc-400'
                              >
                                {tag}
                              </span>
                            ))}
                            {entry.rankingRank != null && (
                              <span className='text-[10px] text-zinc-600'>
                                #{entry.rankingRank} · {entry.rankingPoints} pts
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className='hidden px-4 py-3 text-xs tabular-nums text-zinc-500 md:table-cell'>
                      {entry.profile.phone
                        ? formatBrazilPhoneInput(entry.profile.phone.replace(/\D/g, ''))
                        : '—'}
                    </td>
                    <td className='px-4 py-3'>
                      <PlayerStatusBadge status={entry.displayStatus} />
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums text-zinc-300'>
                      {entry.sessionsPlayed}
                    </td>
                    <td className='hidden px-4 py-3 text-xs text-zinc-400 sm:table-cell'>
                      {entry.lastPlayedDate ? (
                        <span>
                          {prettyDate(entry.lastPlayedDate)}
                          {entry.daysSinceLastPlay != null && (
                            <span className='mt-0.5 block text-[10px] text-zinc-600'>
                              há {entry.daysSinceLastPlay}d
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums text-sky-300/90'>
                      {currency(entry.totalRakeGenerated)}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-sm font-semibold tabular-nums ring-1 ${
                          entry.totalNet >= 0
                            ? 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/25'
                            : 'text-rose-400 bg-rose-500/10 ring-rose-500/25'
                        }`}
                      >
                        {currency(entry.totalNet)}
                      </span>
                    </td>
                    <td className='hidden max-w-[12rem] px-4 py-3 lg:table-cell'>
                      <HistoricalPlayerBadges badges={entry.historicalBadges} compact />
                    </td>
                    <td className='px-2 py-3'>
                      <button
                        type='button'
                        onClick={() => setSelectedNameKey(entry.profile.nameKey)}
                        className='rounded-lg p-1.5 text-zinc-600 transition group-hover:bg-zinc-800/80 group-hover:text-emerald-400'
                        aria-label={`Abrir ficha de ${entry.profile.displayName}`}
                      >
                        <ChevronRight className='h-4 w-4' />
                      </button>
                    </td>
                  </motion.tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className='px-4 py-16 text-center'>
                    <Users className='mx-auto h-10 w-10 text-zinc-700' />
                    <p className='mt-3 font-medium text-zinc-400'>Nenhum jogador encontrado</p>
                    <p className='mt-1 text-sm text-zinc-600'>
                      {query || statusFilter !== 'all'
                        ? 'Tente outro filtro ou limpe a busca.'
                        : 'Cadastre jogadores na aba de Cadastro.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PlayerDetailPanel
        nameKey={selectedNameKey}
        onClose={() => setSelectedNameKey(null)}
        onUpdated={() => void loadDirectory()}
      />
    </section>
  );
}
