'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CashAuditBanner } from '@/components/CashAuditBanner';
import { ChipsInPlayCard } from '@/components/ChipsInPlayCard';
import { TableClockPanel } from '@/components/TableClockPanel';
import { KpiCard } from '@/components/KpiCard';
import { PlayersTable } from '@/components/PlayersTable';
import { RankingChart, BankrollLine, DistributionPie } from '@/components/Charts';
import { PlayerRegistrationTab } from '@/components/PlayerRegistrationTab';
import { LogoutButton } from '@/components/LogoutButton';
import { RakeBillingTab } from '@/components/RakeBillingTab';
import { UsersManagementTab } from '@/components/UsersManagementTab';
import { PlayersDirectoryTab } from '@/components/PlayersDirectoryTab';
import { RankingTab } from '@/components/RankingTab';
import { SessionCashSummary } from '@/components/SessionCashSummary';
import { currency, prettyDate } from '@/lib/data';
import { RegisteredPlayer, Session } from '@/lib/types';
import { sumRegisteredPlayerCashTotals, sumSessionCashTotals } from '@/lib/cashTotalsModel';
import { aggregateRegisteredPlayersForSession } from '@/lib/playerSessionModel';
import { unifyRegisteredPlayersForSession } from '@/lib/buyInLogsModel';
import { computeDashboardMetrics, DashboardScope, filterSessionsByScope } from '@/lib/dashboardModel';
import { computeSessionGamificationBadges, computeGamificationBadgesFromPlayers, badgesMapToRecord } from '@/lib/playerGamificationModel';
import { computeScopedCashAudit, sessionRakeBruto } from '@/lib/rakeModel';
import {
  computeChipsInPlayFromRegistered,
  computeChipsInPlayFromSessionPlayers,
} from '@/lib/chipsInPlayModel';
import { currentLocalYearMonth, todayLocalISODate } from '@/lib/time';

type PeriodMode = 'session' | 'month' | 'total';
type AppTab = 'dashboard' | 'cadastro' | 'jogadores' | 'ranking' | 'faturamento' | 'usuarios';

interface CurrentUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dbHealth, setDbHealth] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('total');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [monthKey, setMonthKey] = useState(() => currentLocalYearMonth());
  const [contactByPlayerName, setContactByPlayerName] = useState<Record<string, string>>({});
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError('');
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Falha ao carregar sessoes.');
      }
      const data = (await response.json()) as Session[];
      setSessions(data);
    } catch {
      setSessionsError('Nao foi possivel carregar as sessoes finalizadas.');
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadRegisteredPlayers = useCallback(async () => {
    try {
      const response = await fetch('/api/registered-players');
      if (!response.ok) {
        return;
      }
      const rows = (await response.json()) as unknown;
      if (!Array.isArray(rows)) {
        return;
      }
      const players = rows as RegisteredPlayer[];
      const sorted = [...players].sort((a, b) => {
        const byDate = String(b.date).localeCompare(String(a.date));
        if (byDate !== 0) {
          return byDate;
        }
        return String(b.id).localeCompare(String(a.id));
      });
      const map: Record<string, string> = {};
      for (const r of sorted) {
        const key = r.name.trim().toLowerCase();
        const digits = r.phone?.replace(/\D/g, '') ?? '';
        if (digits.length >= 10) {
          map[key] = r.phone.trim();
        }
      }
      setContactByPlayerName(map);
      setRegisteredPlayers(players);
    } catch {
      /* contatos opcionais */
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (activeTab !== 'dashboard' && activeTab !== 'faturamento') {
      return;
    }
    void loadRegisteredPlayers();
  }, [activeTab, sessions, loadRegisteredPlayers]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = (await response.json()) as CurrentUser;
          setCurrentUser(data);
        }
      } catch {
        /* middleware redireciona se nao autenticado */
      }
    };
    void loadMe();
  }, []);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const response = await fetch('/api/health/db');
        setDbHealth(response.ok ? 'connected' : 'disconnected');
      } catch {
        setDbHealth('disconnected');
      }
    };

    void checkDb();
  }, []);

  useEffect(() => {
    if (periodMode !== 'session' || sessions.length === 0) {
      return;
    }
    const exists = sessions.some((s) => s.id === selectedSessionId);
    if (!exists) {
      setSelectedSessionId(sessions[sessions.length - 1].id);
    }
  }, [periodMode, sessions, selectedSessionId]);

  const scope: DashboardScope = useMemo(() => {
    if (periodMode === 'total') {
      return { kind: 'total' };
    }
    if (periodMode === 'month') {
      return { kind: 'month', yearMonth: monthKey };
    }
    return { kind: 'session', sessionId: selectedSessionId };
  }, [periodMode, monthKey, selectedSessionId]);

  const scopedSessions = useMemo(() => filterSessionsByScope(sessions, scope), [sessions, scope]);

  const metrics = useMemo(() => computeDashboardMetrics(scopedSessions), [scopedSessions]);

  const cashAudit = useMemo(() => computeScopedCashAudit(scopedSessions), [scopedSessions]);

  const rakePeriodLabel = useMemo(() => {
    if (periodMode === 'session') return 'nesta sessão';
    if (periodMode === 'month') return 'neste mês';
    return 'no período';
  }, [periodMode]);

  const detailSession = useMemo(() => {
    if (periodMode !== 'session') {
      return undefined;
    }
    return scopedSessions[0];
  }, [periodMode, scopedSessions]);

  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    if (!y || !m) {
      return monthKey;
    }
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  }, [monthKey]);

  const liveRegisteredForDetailSession = useMemo(() => {
    const sessionDate =
      detailSession?.date ?? (periodMode === 'session' ? todayLocalISODate() : undefined);
    if (!sessionDate) {
      return [];
    }
    return unifyRegisteredPlayersForSession(registeredPlayers, sessionDate);
  }, [detailSession, registeredPlayers, periodMode]);

  const cashTotals = useMemo(() => {
    if (periodMode === 'session' && liveRegisteredForDetailSession.length > 0) {
      return sumRegisteredPlayerCashTotals(liveRegisteredForDetailSession);
    }
    return sumSessionCashTotals(scopedSessions);
  }, [periodMode, liveRegisteredForDetailSession, scopedSessions]);

  const cashSummaryLabel = useMemo(() => {
    if (periodMode === 'session' && detailSession) {
      return liveRegisteredForDetailSession.length > 0
        ? `Sessão ${prettyDate(detailSession.date)} — totais ao vivo do cadastro`
        : `Sessão ${prettyDate(detailSession.date)}`;
    }
    if (periodMode === 'month') {
      return `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} (${scopedSessions.length} sessões)`;
    }
    if (periodMode === 'total') {
      return `Todas as sessões (${scopedSessions.length} no total)`;
    }
    return undefined;
  }, [periodMode, detailSession, liveRegisteredForDetailSession.length, monthLabel, scopedSessions.length]);

  const cashSummaryPlayers = useMemo(() => {
    if (periodMode !== 'session' || liveRegisteredForDetailSession.length === 0) {
      return undefined;
    }
    return liveRegisteredForDetailSession;
  }, [periodMode, liveRegisteredForDetailSession]);

  const liveSessionPlayers = useMemo(() => {
    if (periodMode !== 'session') {
      return [];
    }
    const sessionDate = detailSession?.date ?? liveRegisteredForDetailSession[0]?.date;
    if (!sessionDate || liveRegisteredForDetailSession.length === 0) {
      return [];
    }
    return aggregateRegisteredPlayersForSession(liveRegisteredForDetailSession, sessionDate);
  }, [periodMode, detailSession, liveRegisteredForDetailSession]);

  const gamificationBadges = useMemo(() => {
    if (liveSessionPlayers.length > 0) {
      const players = liveSessionPlayers.map((p) => ({
        name: p.name,
        buyIn: p.buyIn,
        cashOut: p.cashOut,
        net: p.net,
        paymentStatus: p.paymentStatus,
        buyInCount: p.buyInCount,
      }));
      return badgesMapToRecord(computeGamificationBadgesFromPlayers(players));
    }
    if (periodMode === 'session' && scopedSessions.length === 1) {
      return badgesMapToRecord(computeSessionGamificationBadges(scopedSessions));
    }
    return {};
  }, [liveSessionPlayers, periodMode, scopedSessions]);

  const sessionDateForAudit = useMemo(() => {
    if (periodMode !== 'session') return null;
    return detailSession?.date ?? liveRegisteredForDetailSession[0]?.date ?? null;
  }, [periodMode, detailSession, liveRegisteredForDetailSession]);

  const chipsInPlay = useMemo(() => {
    if (!sessionDateForAudit) return null;
    if (liveRegisteredForDetailSession.length > 0) {
      return computeChipsInPlayFromRegistered(registeredPlayers, sessionDateForAudit);
    }
    if (detailSession) {
      return computeChipsInPlayFromSessionPlayers(detailSession.players);
    }
    return null;
  }, [sessionDateForAudit, liveRegisteredForDetailSession.length, registeredPlayers, detailSession]);

  const dashboardSessionRake = useMemo(() => {
    if (!sessionDateForAudit) return 0;
    if (detailSession?.date === sessionDateForAudit) {
      return sessionRakeBruto(detailSession);
    }
    const rows = registeredPlayers.filter((p) => p.date === sessionDateForAudit);
    const buyIn = rows.reduce((acc, p) => acc + p.buyIn, 0);
    const cashOut = rows.reduce((acc, p) => acc + p.cashOut, 0);
    return buyIn - cashOut;
  }, [sessionDateForAudit, detailSession, registeredPlayers]);

  return (
    <main className='min-h-screen bg-zinc-950 text-zinc-50'>
      <div className='mx-auto max-w-7xl space-y-6 p-4 md:p-8'>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight text-white md:text-3xl'>Dashboard Home Game Poker</h1>
            <p className='mt-1 max-w-2xl text-sm text-zinc-400'>
              {currentUser ? `Olá, ${currentUser.name}` : 'Visão financeira para gestão premium de cash game.'}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              dbHealth === 'connected'
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                : dbHealth === 'disconnected'
                  ? 'border-rose-500/35 bg-rose-500/10 text-rose-300'
                  : 'border-zinc-700 bg-zinc-900/50 text-zinc-400'
            }`}
          >
            {dbHealth === 'connected' ? 'Banco conectado' : dbHealth === 'disconnected' ? 'Banco desconectado' : 'Verificando banco...'}
          </span>
          <LogoutButton />
          </div>
        </div>
      </motion.div>

      <section className='glass-card p-2 md:p-3'>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === 'dashboard'
                ? 'border-sky-500/45 bg-sky-500/15 text-sky-100 shadow-lg shadow-sky-500/5'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            Dashboard
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('cadastro')}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === 'cadastro'
                ? 'border-sky-500/45 bg-sky-500/15 text-sky-100 shadow-lg shadow-sky-500/5'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            Cadastro de Jogadores
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('jogadores')}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === 'jogadores'
                ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100 shadow-lg shadow-emerald-500/5'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            Jogadores
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('ranking')}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === 'ranking'
                ? 'border-amber-500/45 bg-amber-500/15 text-amber-100 shadow-lg shadow-amber-500/5'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            Ranking
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('faturamento')}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === 'faturamento'
                ? 'border-sky-500/45 bg-sky-500/15 text-sky-100 shadow-lg shadow-sky-500/5'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            Faturamento / Rake
          </button>
          {currentUser?.role === 'admin' && (
            <button
              type='button'
              onClick={() => setActiveTab('usuarios')}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                activeTab === 'usuarios'
                  ? 'border-violet-500/45 bg-violet-500/15 text-violet-100 shadow-lg shadow-violet-500/5'
                  : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              Usuários
            </button>
          )}
        </div>
      </section>

      {activeTab === 'dashboard' ? (
        <>
          <section className='glass-card space-y-3 p-4'>
            <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-zinc-100'>Métricas</h2>
                <p className='text-xs text-zinc-500'>Dados das sessões finalizadas na aba de cadastro.</p>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <button
                  type='button'
                  onClick={() => void loadSessions()}
                  className='rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800/70'
                >
                  Atualizar
                </button>
                {sessionsLoading && <span className='text-xs text-zinc-500'>Carregando...</span>}
              </div>
            </div>

            <CashAuditBanner
              audit={cashAudit}
              hasSessions={scopedSessions.length > 0}
              rakePeriodLabel={rakePeriodLabel}
            />

            {sessionsError && <p className='text-sm text-rose-300'>{sessionsError}</p>}

            <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
              <div className='flex flex-wrap gap-2'>
                <span className='self-center text-xs font-medium uppercase tracking-wide text-zinc-500'>Período</span>
                <button
                  type='button'
                  onClick={() => setPeriodMode('session')}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    periodMode === 'session'
                      ? 'border-sky-500/45 bg-sky-500/15 text-sky-100'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Por sessão
                </button>
                <button
                  type='button'
                  onClick={() => setPeriodMode('month')}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    periodMode === 'month'
                      ? 'border-sky-500/45 bg-sky-500/15 text-sky-100'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Por mês
                </button>
                <button
                  type='button'
                  onClick={() => setPeriodMode('total')}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    periodMode === 'total'
                      ? 'border-sky-500/45 bg-sky-500/15 text-sky-100'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Total
                </button>
              </div>

              {periodMode === 'session' && (
                <label className='flex flex-col gap-1 text-xs text-zinc-500'>
                  Sessão
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    disabled={sessions.length === 0}
                    className='min-w-[12rem] rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/25 disabled:opacity-50'
                  >
                    {sessions.length === 0 ? (
                      <option value=''>Nenhuma sessao salva</option>
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
                    onChange={(e) => setMonthKey(e.target.value)}
                    className='rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50'
                  />
                </label>
              )}
            </div>

            <p className='text-xs text-zinc-500'>
              {periodMode === 'session' && (detailSession ? `Visualizando ${prettyDate(detailSession.date)}.` : 'Selecione uma sessao finalizada.')}
              {periodMode === 'month' && `Visualizando ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} (${scopedSessions.length} sessoes).`}
              {periodMode === 'total' && `Visualizando todas as sessoes (${scopedSessions.length} no total).`}
            </p>
          </section>

          {(scopedSessions.length > 0 ||
            (periodMode === 'session' && liveRegisteredForDetailSession.length > 0)) && (
            <SessionCashSummary
              totalPix={cashTotals.totalPix}
              totalDinheiro={cashTotals.totalDinheiro}
              totalFiado={cashTotals.totalFiado}
              label={cashSummaryLabel}
              players={cashSummaryPlayers}
            />
          )}

          {!sessionsLoading && sessions.length === 0 && !sessionsError && (
            <p className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
              Ainda não há sessões finalizadas. Use &quot;Finalizar sessão do dia&quot; na aba Cadastro para gravar o dia e liberar os gráficos.
            </p>
          )}

          {periodMode === 'session' && sessionDateForAudit && currentUser?.role === 'admin' && (
            <TableClockPanel
              sessionDate={sessionDateForAudit}
              rakeBruto={dashboardSessionRake}
              canControl
              compact
            />
          )}

          <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {periodMode === 'session' && chipsInPlay && (
              <div className='sm:col-span-2 xl:col-span-1'>
                <ChipsInPlayCard snapshot={chipsInPlay} />
              </div>
            )}
            <KpiCard title='Total em jogo' value={currency(metrics.totalBuyIns - metrics.totalCashOuts)} tone='blue' />
            <KpiCard title='Total de buy-ins' value={currency(metrics.totalBuyIns)} tone='blue' />
            <KpiCard title='Total de cash-outs' value={currency(metrics.totalCashOuts)} tone='green' />
            <KpiCard title='Saldo pendente' value={currency(metrics.pending)} tone='amber' />
            {metrics.topWinner && metrics.playersSummary.length > 0 ? (
              <KpiCard
                title='Maior ganhador'
                tone='green'
                playerHighlight={{
                  name: metrics.topWinner.name,
                  amount: currency(metrics.topWinner.net),
                  kind: 'winner',
                }}
              />
            ) : (
              <KpiCard title='Maior ganhador' value='—' tone='green' />
            )}
            {metrics.topLoser && metrics.playersSummary.length > 0 ? (
              <KpiCard
                title='Maior perdedor'
                tone='red'
                playerHighlight={{
                  name: metrics.topLoser.name,
                  amount: currency(metrics.topLoser.net),
                  kind: 'loser',
                }}
              />
            ) : (
              <KpiCard title='Maior perdedor' value='—' tone='red' />
            )}
          </section>

          <PlayersTable
            players={metrics.playersSummary}
            liveSessionPlayers={liveSessionPlayers}
            enablePayout={periodMode === 'session' && liveSessionPlayers.length > 0}
            showPerformanceColumns={periodMode !== 'session' || liveSessionPlayers.length === 0}
            gamificationBadges={gamificationBadges}
            contactByPlayerName={contactByPlayerName}
            onPayoutComplete={() => void loadRegisteredPlayers()}
          />

          {metrics.playersSummary.length > 0 ? (
            <>
              <section className='grid gap-4 lg:grid-cols-3'>
                <div className='lg:col-span-2'>
                  <RankingChart data={metrics.rankingData} />
                </div>
                <DistributionPie data={metrics.dist} />
              </section>

              <BankrollLine data={metrics.bankrollData} />
            </>
          ) : (
            !sessionsLoading && <p className='text-center text-sm text-zinc-500'>Sem dados neste período para exibir gráficos.</p>
          )}

          <section className='glass-card p-4'>
            {detailSession ? (
              <div className='grid gap-3 text-sm md:grid-cols-3'>
                <div>
                  <p className='text-zinc-500'>Data da sessão</p>
                  <p className='font-semibold text-zinc-100'>{prettyDate(detailSession.date)}</p>
                </div>
                <div>
                  <p className='text-zinc-500'>Jogadores</p>
                  <p className='font-semibold text-zinc-100'>{detailSession.totals.playersCount}</p>
                </div>
                <div>
                  <p className='text-zinc-500'>Resumo financeiro</p>
                  <p className='font-semibold text-zinc-100'>{currency(detailSession.totals.net)}</p>
                </div>
                <div className='md:col-span-3'>
                  <p className='text-zinc-500'>Buy-ins / Cash-outs</p>
                  <p className='font-semibold text-zinc-100'>
                    {currency(detailSession.totals.buyIn)} / {currency(detailSession.totals.cashOut)}
                  </p>
                </div>
              </div>
            ) : (
              <div className='grid gap-2 text-sm text-zinc-300 md:grid-cols-3'>
                <div>
                  <p className='text-zinc-500'>Sessões no filtro</p>
                  <p className='font-semibold text-zinc-100'>{scopedSessions.length}</p>
                </div>
                <div>
                  <p className='text-zinc-500'>Resultado agregado</p>
                  <p className='font-semibold text-zinc-100'>{currency(scopedSessions.reduce((a, s) => a + s.totals.net, 0))}</p>
                </div>
                <div>
                  <p className='text-zinc-500'>Buy-ins / Cash-outs</p>
                  <p className='font-semibold text-zinc-100'>
                    {currency(metrics.totalBuyIns)} / {currency(metrics.totalCashOuts)}
                  </p>
                </div>
              </div>
            )}
          </section>
        </>
      ) : activeTab === 'cadastro' ? (
        <PlayerRegistrationTab
          canControlTable={currentUser?.role === 'admin'}
          onSessionsChanged={() => {
            void loadSessions();
            void loadRegisteredPlayers();
          }}
        />
      ) : activeTab === 'jogadores' ? (
        <PlayersDirectoryTab />
      ) : activeTab === 'ranking' ? (
        <RankingTab sessions={sessions} loading={sessionsLoading} />
      ) : activeTab === 'faturamento' ? (
        <RakeBillingTab
          sessions={sessions}
          registeredPlayers={registeredPlayers}
          loading={sessionsLoading}
          error={sessionsError}
          canEditStaffCost={currentUser?.role === 'admin'}
          canControlTable={currentUser?.role === 'admin'}
          onRefresh={() => {
            void loadSessions();
            void loadRegisteredPlayers();
          }}
          onSessionUpdated={(updated) =>
            setSessions((current) => current.map((s) => (s.id === updated.id ? updated : s)))
          }
        />
      ) : (
        <UsersManagementTab />
      )}
      </div>
    </main>
  );
}
