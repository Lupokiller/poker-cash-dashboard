'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { KpiCard } from '@/components/KpiCard';
import { PlayersTable } from '@/components/PlayersTable';
import { RankingChart, BankrollLine, DistributionPie } from '@/components/Charts';
import { PlayerRegistrationTab } from '@/components/PlayerRegistrationTab';
import { LogoutButton } from '@/components/LogoutButton';
import { UsersManagementTab } from '@/components/UsersManagementTab';
import { currency, prettyDate } from '@/lib/data';
import { Session } from '@/lib/types';
import { computeDashboardMetrics, DashboardScope, filterSessionsByScope } from '@/lib/dashboardModel';

type PeriodMode = 'session' | 'month' | 'total';
type AppTab = 'dashboard' | 'cadastro' | 'usuarios';

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
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));

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

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

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

  return (
    <main className='mx-auto max-w-7xl space-y-6 p-4 md:p-8'>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className='text-3xl font-semibold'>Dashboard Home Game Poker</h1>
          <div className='flex flex-wrap items-center gap-2'>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              dbHealth === 'connected'
                ? 'bg-emerald-500/20 text-emerald-300'
                : dbHealth === 'disconnected'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-slate-500/20 text-slate-300'
            }`}
          >
            {dbHealth === 'connected' ? 'Banco conectado' : dbHealth === 'disconnected' ? 'Banco desconectado' : 'Verificando banco...'}
          </span>
          <LogoutButton />
          </div>
        </div>
        <p className='text-slate-400'>
          {currentUser ? `Ola, ${currentUser.name}` : 'Visao financeira premium para gestao de cash game.'}
        </p>
      </motion.div>

      <section className='glass-card p-3'>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              activeTab === 'dashboard' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Dashboard
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('cadastro')}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              activeTab === 'cadastro' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Cadastro de Jogadores
          </button>
          {currentUser?.role === 'admin' && (
            <button
              type='button'
              onClick={() => setActiveTab('usuarios')}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                activeTab === 'usuarios' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Usuarios
            </button>
          )}
        </div>
      </section>

      {activeTab === 'dashboard' ? (
        <>
          <section className='glass-card space-y-3 p-4'>
            <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
              <div>
                <h2 className='text-lg font-semibold'>Metricas</h2>
                <p className='text-xs text-slate-500'>Dados das sessoes finalizadas na aba de cadastro.</p>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <button
                  type='button'
                  onClick={() => void loadSessions()}
                  className='rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700'
                >
                  Atualizar
                </button>
                {sessionsLoading && <span className='text-xs text-slate-500'>Carregando...</span>}
              </div>
            </div>

            {sessionsError && <p className='text-sm text-rose-300'>{sessionsError}</p>}

            <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
              <div className='flex flex-wrap gap-2'>
                <span className='self-center text-xs uppercase tracking-wide text-slate-500'>Periodo</span>
                <button
                  type='button'
                  onClick={() => setPeriodMode('session')}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    periodMode === 'session' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Por sessao
                </button>
                <button
                  type='button'
                  onClick={() => setPeriodMode('month')}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    periodMode === 'month' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Por mes
                </button>
                <button
                  type='button'
                  onClick={() => setPeriodMode('total')}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    periodMode === 'total' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Total
                </button>
              </div>

              {periodMode === 'session' && (
                <label className='flex flex-col gap-1 text-xs text-slate-400'>
                  Sessao
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    disabled={sessions.length === 0}
                    className='min-w-[12rem] rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400 disabled:opacity-50'
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
                <label className='flex flex-col gap-1 text-xs text-slate-400'>
                  Mes
                  <input
                    type='month'
                    value={monthKey}
                    onChange={(e) => setMonthKey(e.target.value)}
                    className='rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
                  />
                </label>
              )}
            </div>

            <p className='text-xs text-slate-500'>
              {periodMode === 'session' && (detailSession ? `Visualizando ${prettyDate(detailSession.date)}.` : 'Selecione uma sessao finalizada.')}
              {periodMode === 'month' && `Visualizando ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} (${scopedSessions.length} sessoes).`}
              {periodMode === 'total' && `Visualizando todas as sessoes (${scopedSessions.length} no total).`}
            </p>
          </section>

          {!sessionsLoading && sessions.length === 0 && !sessionsError && (
            <p className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
              Ainda nao ha sessoes finalizadas. Use &quot;Finalizar sessao do dia&quot; na aba Cadastro para gravar o dia e liberar os graficos.
            </p>
          )}

          <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            <KpiCard title='Total em jogo' value={currency(metrics.totalBuyIns - metrics.totalCashOuts)} tone='blue' />
            <KpiCard title='Total de buy-ins' value={currency(metrics.totalBuyIns)} tone='blue' />
            <KpiCard title='Total de cash-outs' value={currency(metrics.totalCashOuts)} tone='green' />
            <KpiCard title='Saldo pendente' value={currency(metrics.pending)} tone='amber' />
            <KpiCard
              title='Maior ganhador'
              value={`${metrics.topWinner?.name ?? '-'} - ${currency(metrics.topWinner?.net ?? 0)}`}
              tone='green'
            />
            <KpiCard
              title='Maior perdedor'
              value={`${metrics.topLoser?.name ?? '-'} - ${currency(metrics.topLoser?.net ?? 0)}`}
              tone='red'
            />
          </section>

          <PlayersTable players={metrics.playersSummary} />

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
            !sessionsLoading && <p className='text-center text-sm text-slate-500'>Sem dados neste periodo para exibir graficos.</p>
          )}

          <section className='glass-card p-4'>
            {detailSession ? (
              <div className='grid gap-3 text-sm md:grid-cols-3'>
                <div>
                  <p className='text-slate-400'>Data da sessao</p>
                  <p className='font-semibold'>{prettyDate(detailSession.date)}</p>
                </div>
                <div>
                  <p className='text-slate-400'>Jogadores</p>
                  <p className='font-semibold'>{detailSession.totals.playersCount}</p>
                </div>
                <div>
                  <p className='text-slate-400'>Resumo financeiro</p>
                  <p className='font-semibold'>{currency(detailSession.totals.net)}</p>
                </div>
                <div className='md:col-span-3'>
                  <p className='text-slate-400'>Buy-ins / Cash-outs</p>
                  <p className='font-semibold'>
                    {currency(detailSession.totals.buyIn)} / {currency(detailSession.totals.cashOut)}
                  </p>
                </div>
              </div>
            ) : (
              <div className='grid gap-2 text-sm text-slate-300 md:grid-cols-3'>
                <div>
                  <p className='text-slate-400'>Sessoes no filtro</p>
                  <p className='font-semibold'>{scopedSessions.length}</p>
                </div>
                <div>
                  <p className='text-slate-400'>Resultado agregado</p>
                  <p className='font-semibold'>{currency(scopedSessions.reduce((a, s) => a + s.totals.net, 0))}</p>
                </div>
                <div>
                  <p className='text-slate-400'>Buy-ins / Cash-outs</p>
                  <p className='font-semibold'>
                    {currency(metrics.totalBuyIns)} / {currency(metrics.totalCashOuts)}
                  </p>
                </div>
              </div>
            )}
          </section>
        </>
      ) : activeTab === 'cadastro' ? (
        <PlayerRegistrationTab onSessionsChanged={() => void loadSessions()} />
      ) : (
        <UsersManagementTab />
      )}
    </main>
  );
}
