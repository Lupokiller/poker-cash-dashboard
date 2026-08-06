'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Sparkles, Trophy, Users, CalendarDays, Search } from 'lucide-react';
import { currency, prettyDate } from '@/lib/data';
import { filterSessionsByScope, DashboardScope } from '@/lib/dashboardModel';
import { computeSeasonRanking, SeasonRankingEntry } from '@/lib/rankingModel';
import { computeHistoricalPlayerBadges } from '@/lib/playerDirectoryModel';
import { HistoricalPlayerBadges } from '@/components/HistoricalPlayerBadges';
import { currentLocalYearMonth } from '@/lib/time';
import { Session } from '@/lib/types';

type PeriodMode = 'session' | 'month' | 'total';

const PODIUM_ORDER: Array<{ place: 1 | 2 | 3; index: number; height: string }> = [
  { place: 2, index: 1, height: 'h-24' },
  { place: 1, index: 0, height: 'h-32' },
  { place: 3, index: 2, height: 'h-20' },
];

const PLACE_META = {
  1: {
    emoji: '🥇',
    label: 'Campeão',
    avatarRing: 'ring-amber-400/60 shadow-amber-500/25',
    podium: 'from-amber-500/35 via-amber-600/20 to-zinc-900/80 border-amber-400/40',
    glow: 'shadow-amber-500/20',
    text: 'text-amber-300',
  },
  2: {
    emoji: '🥈',
    label: 'Vice',
    avatarRing: 'ring-zinc-300/50 shadow-zinc-400/15',
    podium: 'from-zinc-400/25 via-zinc-500/15 to-zinc-900/80 border-zinc-400/35',
    glow: 'shadow-zinc-400/10',
    text: 'text-zinc-200',
  },
  3: {
    emoji: '🥉',
    label: '3º lugar',
    avatarRing: 'ring-orange-600/50 shadow-orange-700/20',
    podium: 'from-orange-700/30 via-orange-800/15 to-zinc-900/80 border-orange-600/35',
    glow: 'shadow-orange-700/15',
    text: 'text-orange-300',
  },
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function PlayerAvatar({
  name,
  place,
  size = 'md',
}: {
  name: string;
  place?: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg' ? 'h-16 w-16 text-base' : size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-12 w-12 text-sm';
  const ring = place ? PLACE_META[place].avatarRing : 'ring-zinc-600/40 shadow-black/20';

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-900 font-bold tracking-tight text-zinc-100 shadow-lg ring-2 ${sizeClass} ${ring}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

function RuleCard({
  emoji,
  title,
  points,
  description,
  accent,
}: {
  emoji: string;
  title: string;
  points: string;
  description: string;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`rounded-xl border bg-zinc-950/40 p-3 ${accent}`}
    >
      <div className='flex items-start gap-2.5'>
        <span className='text-2xl leading-none' aria-hidden>
          {emoji}
        </span>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-sm font-semibold text-zinc-100'>{title}</p>
            <span className='rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300 ring-1 ring-white/10'>
              {points}
            </span>
          </div>
          <p className='mt-1 text-xs leading-relaxed text-zinc-500'>{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

function PointBreakdown({ row }: { row: SeasonRankingEntry }) {
  const perfFromNet = row.performancePoints - row.goldenLettuceCount * 20;
  return (
    <div className='flex flex-wrap gap-1.5'>
      <span className='inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300'>
        <CalendarDays className='h-3 w-3' />
        {row.presencePoints} presença
      </span>
      {perfFromNet > 0 && (
        <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300'>
          <Sparkles className='h-3 w-3' />
          {perfFromNet} lucro
        </span>
      )}
      {row.goldenLettuceCount > 0 && (
        <span className='inline-flex items-center gap-1 rounded-full border border-lime-500/30 bg-lime-500/10 px-2 py-0.5 text-[10px] font-medium text-lime-300'>
          🥬 {row.goldenLettuceCount}× alface (+{row.goldenLettuceCount * 20})
        </span>
      )}
    </div>
  );
}

function PodiumSlot({ entry, place }: { entry: SeasonRankingEntry; place: 1 | 2 | 3 }) {
  const meta = PLACE_META[place];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place === 1 ? 0.1 : place === 2 ? 0 : 0.2, type: 'spring', stiffness: 260, damping: 22 }}
      className='flex flex-1 flex-col items-center'
    >
      <div className={`relative mb-3 flex flex-col items-center ${place === 1 ? 'scale-105' : ''}`}>
        {place === 1 && (
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className='absolute -top-7'
          >
            <Crown className='h-7 w-7 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]' />
          </motion.div>
        )}
        <PlayerAvatar name={entry.name} place={place} size={place === 1 ? 'lg' : 'md'} />
        <span className='mt-2 text-2xl' aria-hidden>
          {meta.emoji}
        </span>
      </div>

      <p className={`max-w-[8rem] truncate text-center text-sm font-bold ${meta.text}`}>{entry.name}</p>
      <p className='mt-0.5 text-2xl font-black tabular-nums text-amber-300'>{entry.totalPoints}</p>
      <p className='text-[10px] uppercase tracking-wider text-zinc-500'>pontos</p>

      <div
        className={`mt-3 flex w-full max-w-[7rem] flex-col justify-end rounded-t-xl border bg-gradient-to-t ${meta.podium} ${meta.glow} shadow-lg ${PODIUM_ORDER.find((p) => p.place === place)?.height ?? 'h-20'}`}
      >
        <p className='py-2 text-center text-xs font-semibold text-zinc-400'>{meta.label}</p>
      </div>
    </motion.div>
  );
}

function RankingRow({
  row,
  leaderPoints,
  index,
  periodMode,
  historicalBadges,
}: {
  row: SeasonRankingEntry;
  leaderPoints: number;
  index: number;
  periodMode: PeriodMode;
  historicalBadges?: ReturnType<typeof computeHistoricalPlayerBadges>;
}) {
  const pct = leaderPoints > 0 ? Math.round((row.totalPoints / leaderPoints) * 100) : 0;
  const sessionText =
    periodMode === 'session'
      ? 'nesta sessão'
      : row.sessionsPlayed === 1
        ? '1 sessão'
        : `${row.sessionsPlayed} sessões`;

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.04 }}
      className='rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-3 transition hover:border-zinc-700/80 hover:bg-white/[0.02]'
    >
      <div className='flex items-center gap-3'>
        <span className='w-8 shrink-0 text-center text-sm font-bold tabular-nums text-zinc-500'>#{row.rank}</span>
        <PlayerAvatar name={row.name} size='sm' />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <p className='truncate font-semibold text-zinc-100'>{row.name}</p>
            <span className='rounded-lg bg-amber-500/15 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-300 ring-1 ring-amber-400/25'>
              {row.totalPoints} pts
            </span>
          </div>
          <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800'>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.2 + index * 0.04, duration: 0.5, ease: 'easeOut' }}
              className='h-full rounded-full bg-gradient-to-r from-amber-500/80 to-amber-300/90'
            />
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500'>
            <span>{sessionText}</span>
            <span className={row.totalNet >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}>
              {currency(row.totalNet)} no total
            </span>
          </div>
          <div className='mt-2'>
            <PointBreakdown row={row} />
          </div>
          {historicalBadges && historicalBadges.length > 0 && (
            <div className='mt-2'>
              <HistoricalPlayerBadges badges={historicalBadges} />
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function RankingPeriodFilter({
  periodMode,
  onPeriodModeChange,
  sessions,
  selectedSessionId,
  onSessionChange,
  monthKey,
  onMonthChange,
}: {
  periodMode: PeriodMode;
  onPeriodModeChange: (mode: PeriodMode) => void;
  sessions: Session[];
  selectedSessionId: string;
  onSessionChange: (id: string) => void;
  monthKey: string;
  onMonthChange: (key: string) => void;
}) {
  const periodButton = (mode: PeriodMode, label: string) => (
    <button
      type='button'
      onClick={() => onPeriodModeChange(mode)}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        periodMode === mode
          ? 'border-amber-500/45 bg-amber-500/15 text-amber-100'
          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className='glass-card space-y-3 p-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-zinc-100'>Período do ranking</h2>
          <p className='text-xs text-zinc-500'>Veja o pódio por sessão, por mês ou acumulado da temporada.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <span className='self-center text-xs font-medium uppercase tracking-wide text-zinc-500'>Filtrar</span>
          {periodButton('session', 'Por sessão')}
          {periodButton('month', 'Por mês')}
          {periodButton('total', 'Total')}
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        {periodMode === 'session' && (
          <label className='flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-500'>
            Sessão
            <select
              value={selectedSessionId}
              onChange={(e) => onSessionChange(e.target.value)}
              disabled={sessions.length === 0}
              className='rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50'
            >
              {sessions.length === 0 ? (
                <option value=''>Nenhuma sessão finalizada</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {prettyDate(s.date)}
                  </option>
                ))
              )}
            </select>
          </label>
        )}

        {periodMode === 'month' && (
          <label className='flex flex-col gap-1 text-xs text-zinc-500'>
            Mês
            <input
              type='month'
              value={monthKey}
              onChange={(e) => onMonthChange(e.target.value)}
              className='rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500/40'
            />
          </label>
        )}
      </div>
    </div>
  );
}

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

function RankingRules() {
  return (
    <div className='grid gap-3 sm:grid-cols-3'>
      <RuleCard
        emoji='🎟️'
        title='Presença'
        points='+50 / sessão'
        description='Compareceu? Pontou. Quanto mais mesas, mais chances de subir.'
        accent='border-sky-500/25'
      />
      <RuleCard
        emoji='💰'
        title='Lucro na sessão'
        points='+1 / R$'
        description='Só soma quando o resultado é positivo. Perder não tira pontos.'
        accent='border-emerald-500/25'
      />
      <RuleCard
        emoji='🥬'
        title='Alface de Ouro'
        points='+20 bônus'
        description='Entrou 1 vez, saiu no verde. Badge de elite.'
        accent='border-lime-500/25'
      />
    </div>
  );
}

export function RankingTab({ sessions, loading }: { sessions: Session[]; loading: boolean }) {
  const [query, setQuery] = useState('');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('total');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [monthKey, setMonthKey] = useState(() => currentLocalYearMonth());

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.date.localeCompare(b.date)),
    [sessions]
  );

  useEffect(() => {
    if (periodMode !== 'session' || sortedSessions.length === 0) return;
    const exists = sortedSessions.some((s) => s.id === selectedSessionId);
    if (!exists) {
      setSelectedSessionId(sortedSessions[sortedSessions.length - 1].id);
    }
  }, [periodMode, sortedSessions, selectedSessionId]);

  const scope: DashboardScope = useMemo(() => {
    if (periodMode === 'total') return { kind: 'total' };
    if (periodMode === 'month') return { kind: 'month', yearMonth: monthKey };
    return { kind: 'session', sessionId: selectedSessionId };
  }, [periodMode, monthKey, selectedSessionId]);

  const scopedSessions = useMemo(
    () => filterSessionsByScope(sortedSessions, scope),
    [sortedSessions, scope]
  );

  const detailSession = periodMode === 'session' ? scopedSessions[0] : undefined;
  const monthLabel = formatMonthLabel(monthKey);

  const periodCopy = useMemo(() => {
    if (periodMode === 'session') {
      if (!detailSession) {
        return {
          badge: 'Ranking da sessão',
          title: 'Escolha uma sessão',
          subtitle: 'Selecione a noite para ver o ranking pontuado.',
          podiumTitle: 'Pódio da noite',
          emptyTitle: 'Selecione uma sessão',
          emptyMessage: 'Escolha uma sessão finalizada no seletor acima.',
        };
      }
      return {
        badge: 'Ranking da sessão',
        title: prettyDate(detailSession.date),
        subtitle: 'Pontuação só desta noite — quem dominou a mesa?',
        podiumTitle: 'Pódio da noite',
        emptyTitle: 'Sem ranking nesta sessão',
        emptyMessage: 'Esta sessão não tem jogadores registrados no ranking.',
      };
    }
    if (periodMode === 'month') {
      const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
      return {
        badge: 'Ranking do mês',
        title: label,
        subtitle: `${scopedSessions.length} sessão(ões) neste mês entram na pontuação.`,
        podiumTitle: 'Pódio do mês',
        emptyTitle: 'Nenhuma sessão neste mês',
        emptyMessage: `Não há sessões finalizadas em ${label}. Escolha outro mês ou veja o total.`,
      };
    }
    return {
      badge: 'Ranking total',
      title: 'Temporada completa',
      subtitle: 'Todas as sessões finalizadas somam pontos. Prejuízo não desconta.',
      podiumTitle: 'Pódio da temporada',
      emptyTitle: 'A temporada ainda não começou',
      emptyMessage:
        'Finalize a primeira sessão na aba Cadastro de Jogadores para liberar o pódio e a briga pelo Alface de Ouro 🥬',
    };
  }, [periodMode, detailSession, monthLabel, scopedSessions.length]);

  const ranking = useMemo(() => computeSeasonRanking(scopedSessions), [scopedSessions]);

  const historicalBadgesByName = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeHistoricalPlayerBadges>>();
    for (const row of ranking) {
      const key = row.name.trim().toLowerCase();
      map.set(key, computeHistoricalPlayerBadges(sessions, key));
    }
    return map;
  }, [ranking, sessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranking;
    return ranking.filter((r) => r.name.toLowerCase().includes(q));
  }, [ranking, query]);

  const stats = useMemo(() => {
    const sessionCount = scopedSessions.length;
    const totalPoints = ranking.reduce((a, r) => a + r.totalPoints, 0);
    const lettuceKing = [...ranking].sort((a, b) => b.goldenLettuceCount - a.goldenLettuceCount)[0];
    return {
      sessionCount,
      playerCount: ranking.length,
      totalPoints,
      leader: ranking[0],
      lettuceKing: lettuceKing?.goldenLettuceCount ? lettuceKing : null,
    };
  }, [ranking, scopedSessions.length]);

  const topThree = ranking.slice(0, 3);
  const leaderPoints = ranking[0]?.totalPoints ?? 1;

  if (loading) {
    return (
      <section className='space-y-4'>
        <RankingPeriodFilter
          periodMode={periodMode}
          onPeriodModeChange={setPeriodMode}
          sessions={sortedSessions}
          selectedSessionId={selectedSessionId}
          onSessionChange={setSelectedSessionId}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
        />
        <div className='glass-card animate-pulse p-8 text-center'>
          <Trophy className='mx-auto h-10 w-10 text-amber-500/40' />
          <p className='mt-3 text-sm text-zinc-500'>Carregando ranking…</p>
        </div>
      </section>
    );
  }

  if (ranking.length === 0) {
    return (
      <section className='space-y-4'>
        <RankingPeriodFilter
          periodMode={periodMode}
          onPeriodModeChange={setPeriodMode}
          sessions={sortedSessions}
          selectedSessionId={selectedSessionId}
          onSessionChange={setSelectedSessionId}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
        />
        <div className='glass-card overflow-hidden p-8 text-center'>
          <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10'>
            <Trophy className='h-10 w-10 text-amber-400/70' />
          </div>
          <h2 className='mt-4 text-xl font-semibold text-zinc-100'>{periodCopy.emptyTitle}</h2>
          <p className='mx-auto mt-2 max-w-md text-sm text-zinc-500'>{periodCopy.emptyMessage}</p>
        </div>
        <RankingRules />
      </section>
    );
  }

  return (
    <section className='space-y-5'>
      <RankingPeriodFilter
        periodMode={periodMode}
        onPeriodModeChange={setPeriodMode}
        sessions={sortedSessions}
        selectedSessionId={selectedSessionId}
        onSessionChange={setSelectedSessionId}
        monthKey={monthKey}
        onMonthChange={setMonthKey}
      />

      {/* Hero */}
      <div className='glass-card relative overflow-hidden p-5 md:p-6'>
        <div
          className='pointer-events-none absolute inset-0 opacity-60'
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(251,191,36,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 50%, rgba(59,130,246,0.08), transparent 50%)',
          }}
        />
        <div className='relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-start gap-4'>
            <div className='rounded-2xl border border-amber-500/35 bg-amber-500/15 p-3 shadow-lg shadow-amber-500/10'>
              <Trophy className='h-8 w-8 text-amber-400' />
            </div>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/90'>
                {periodCopy.badge}
              </p>
              <h2 className='text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl'>{periodCopy.title}</h2>
              <p className='mt-1 max-w-xl text-sm text-zinc-400'>{periodCopy.subtitle}</p>
            </div>
          </div>

          <div className='grid grid-cols-3 gap-2 md:min-w-[16rem]'>
            <div className='rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-center'>
              <Users className='mx-auto h-4 w-4 text-sky-400' />
              <p className='mt-1 text-lg font-bold tabular-nums text-zinc-100'>{stats.playerCount}</p>
              <p className='text-[10px] uppercase text-zinc-500'>Jogadores</p>
            </div>
            <div className='rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-center'>
              <CalendarDays className='mx-auto h-4 w-4 text-violet-400' />
              <p className='mt-1 text-lg font-bold tabular-nums text-zinc-100'>{stats.sessionCount}</p>
              <p className='text-[10px] uppercase text-zinc-500'>Sessões</p>
            </div>
            <div className='rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-center'>
              <Sparkles className='mx-auto h-4 w-4 text-amber-400' />
              <p className='mt-1 text-lg font-bold tabular-nums text-zinc-100'>{stats.totalPoints}</p>
              <p className='text-[10px] uppercase text-zinc-500'>Pts totais</p>
            </div>
          </div>
        </div>
      </div>

      <RankingRules />

      {/* Pódio */}
      {topThree.length > 0 && (
        <div className='glass-card p-4 md:p-6'>
          <div className='mb-4 flex items-center gap-2'>
            <Medal className='h-5 w-5 text-amber-400' />
            <h3 className='text-lg font-semibold text-zinc-100'>{periodCopy.podiumTitle}</h3>
          </div>
          <div className='flex items-end justify-center gap-2 px-2 sm:gap-4 md:gap-8'>
            {PODIUM_ORDER.map(({ place, index }) => {
              const entry = topThree[index];
              if (!entry) {
                return <div key={place} className='flex-1' />;
              }
              return <PodiumSlot key={entry.name} entry={entry} place={place} />;
            })}
          </div>
          {stats.lettuceKing && (
            <p className='mt-4 text-center text-xs text-zinc-500'>
              🥬 Rei do Alface:{' '}
              <span className='font-semibold text-lime-300'>
                {stats.lettuceKing.name} ({stats.lettuceKing.goldenLettuceCount}×)
              </span>
            </p>
          )}
        </div>
      )}

      {/* Lista completa */}
      <div className='glass-card p-4'>
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-zinc-100'>Classificação completa</h3>
            <p className='text-xs text-zinc-500'>Barra = % dos pontos do líder ({leaderPoints} pts)</p>
          </div>
          <div className='relative max-w-xs'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600' />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Buscar jogador…'
              className='w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20'
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className='py-8 text-center text-sm text-zinc-500'>Nenhum jogador encontrado para &quot;{query}&quot;.</p>
        ) : (
          <ul className='space-y-2'>
            {filtered.map((row, index) =>
              row.rank <= 3 ? (
                <motion.li
                  key={row.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='rounded-xl border border-amber-500/15 bg-amber-500/5 p-3'
                >
                  <div className='flex items-center gap-3'>
                    <span className='text-xl'>{PLACE_META[row.rank as 1 | 2 | 3].emoji}</span>
                    <PlayerAvatar name={row.name} place={row.rank as 1 | 2 | 3} size='sm' />
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='font-semibold text-zinc-100'>{row.name}</p>
                        <span className='text-lg font-black tabular-nums text-amber-300'>{row.totalPoints} pts</span>
                      </div>
                      <PointBreakdown row={row} />
                      <div className='mt-2'>
                        <HistoricalPlayerBadges
                          badges={historicalBadgesByName.get(row.name.trim().toLowerCase()) ?? []}
                        />
                      </div>
                    </div>
                    <span
                      className={`hidden text-sm font-semibold tabular-nums sm:block ${
                        row.totalNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currency(row.totalNet)}
                    </span>
                  </div>
                </motion.li>
              ) : (
                <RankingRow
                  key={row.name}
                  row={row}
                  leaderPoints={leaderPoints}
                  index={index}
                  periodMode={periodMode}
                  historicalBadges={historicalBadgesByName.get(row.name.trim().toLowerCase())}
                />
              )
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
