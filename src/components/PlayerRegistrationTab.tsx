'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ClipboardList,
  Layers,
  RefreshCw,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { PaymentStatus, PaymentMethod, RegisteredPlayer, ClubPlayerProfile } from '@/lib/types';
import { currency, prettyDate } from '@/lib/data';
import { PaymentStatusMenu } from '@/components/PaymentStatusMenu';
import { PaymentMethodBadge, PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { PlayerNameAutocomplete } from '@/components/PlayerNameAutocomplete';
import { PlayerDirectoryAvatar } from '@/components/PlayerDirectoryAvatar';
import { PlayerGamificationBadges } from '@/components/PlayerGamificationBadge';
import { BuyInHistoryHint } from '@/components/BuyInHistoryHint';
import { QuickRebuyPopover } from '@/components/QuickRebuyPopover';
import { QuickCashOutPopover } from '@/components/QuickCashOutPopover';
import {
  countPlayersByPaymentFilter,
  PaymentMethodFilterBar,
} from '@/components/PaymentMethodFilterBar';
import { SessionCashSummary } from '@/components/SessionCashSummary';
import { TableClockPanel } from '@/components/TableClockPanel';
import { sumRegisteredPlayerCashTotals } from '@/lib/cashTotalsModel';
import { computeChipsInPlayFromRegistered } from '@/lib/chipsInPlayModel';
import {
  filterPlayersByPaymentMethod,
  hasMixedPaymentMethods,
  PaymentMethodFilter,
  resolveBuyInLogs,
  unifyRegisteredPlayersForSession,
} from '@/lib/buyInLogsModel';
import {
  badgesMapToRecord,
  computeGamificationBadgesFromPlayers,
  GamificationBadge,
} from '@/lib/playerGamificationModel';
import { todayLocalISODate } from '@/lib/time';
import { formatBrazilPhoneInput } from '@/lib/phoneMask';

function apiMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

interface PlayerFormState {
  name: string;
  buyIn: string;
  phone: string;
  paymentMethod: PaymentMethod;
}

const defaultForm: PlayerFormState = {
  name: '',
  buyIn: '',
  phone: '',
  paymentMethod: 'pix',
};

function CadastroKpi({
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
    <div className={`rounded-xl border bg-gradient-to-br p-3.5 ${accent}`}>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-zinc-500'>{label}</p>
          <p className='mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-100'>{value}</p>
          {sub && <p className='mt-0.5 truncate text-[11px] text-zinc-500'>{sub}</p>}
        </div>
        <div className='rounded-lg border border-white/5 bg-black/20 p-2'>
          <Icon className='h-4 w-4 text-zinc-400' />
        </div>
      </div>
    </div>
  );
}

function RegisteredPlayerRow({
  player,
  sessionDate,
  sessionPlayers,
  badges,
  onUpdated,
  onRemoved,
  onRebuySaved,
  onError,
  enableEnterAnimation,
  onEnterAnimationComplete,
}: {
  player: RegisteredPlayer;
  sessionDate: string;
  sessionPlayers: RegisteredPlayer[];
  badges: GamificationBadge[];
  onUpdated: (p: RegisteredPlayer) => void;
  onRemoved: (id: string) => void;
  onRebuySaved: (saved: RegisteredPlayer) => void;
  onError: (message: string) => void;
  enableEnterAnimation: boolean;
  onEnterAnimationComplete?: () => void;
}) {
  const [cashOutInput, setCashOutInput] = useState(String(player.cashOut));
  const [saving, setSaving] = useState(false);
  const logs = resolveBuyInLogs(player);
  const paymentBadgeMethod = hasMixedPaymentMethods(logs) ? 'misto' : player.paymentMethod;
  const isPending = player.paymentStatus !== 'quitado';

  useEffect(() => {
    setCashOutInput(String(player.cashOut));
  }, [player.cashOut, player.id]);

  const persist = async (cashOut: number, paymentStatus: PaymentStatus) => {
    setSaving(true);
    onError('');
    try {
      const response = await fetch(`/api/registered-players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashOut, paymentStatus }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        onError(apiMessageFromBody(payload, 'Nao foi possivel atualizar cash-out ou status.'));
        setCashOutInput(String(player.cashOut));
        return;
      }
      onUpdated(payload as RegisteredPlayer);
    } catch {
      onError('Nao foi possivel atualizar cash-out ou status.');
      setCashOutInput(String(player.cashOut));
    } finally {
      setSaving(false);
    }
  };

  const handleCashOutBlur = () => {
    const n = Number(cashOutInput);
    const cashOut = Number.isFinite(n) && n >= 0 ? n : 0;
    setCashOutInput(String(cashOut));
    if (cashOut !== player.cashOut) {
      void persist(cashOut, player.paymentStatus);
    }
  };

  const handlePaymentStatusChange = (paymentStatus: PaymentStatus) => {
    const n = Number(cashOutInput);
    const cashOut = Number.isFinite(n) && n >= 0 ? n : 0;
    if (paymentStatus !== player.paymentStatus || cashOut !== player.cashOut) {
      void persist(cashOut, paymentStatus);
    }
  };

  return (
    <motion.tr
      className={`border-b border-zinc-800/50 transition hover:bg-sky-500/[0.03] ${
        isPending ? 'bg-amber-500/[0.02]' : ''
      }`}
      initial={enableEnterAnimation ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => {
        if (enableEnterAnimation) {
          onEnterAnimationComplete?.();
        }
      }}
    >
      <td className='px-4 py-3'>
        <div className='flex items-center gap-3'>
          <PlayerDirectoryAvatar name={player.name} status='ativo' size='sm' />
          <div className='min-w-0'>
            <p className='truncate font-medium text-zinc-100'>
              {player.name}
              <PlayerGamificationBadges badges={badges} />
            </p>
            <p className='text-[11px] text-zinc-500'>
              {player.phone ? formatBrazilPhoneInput(player.phone.replace(/\D/g, '')) : 'Sem telefone'}
            </p>
          </div>
        </div>
      </td>
      <td className='relative px-4 py-3 text-right'>
        <BuyInHistoryHint player={player} />
      </td>
      <td className='px-4 py-3 text-right'>
        <PaymentMethodBadge method={paymentBadgeMethod} />
      </td>
      <td className='px-4 py-3 text-right'>
        <input
          type='number'
          min='0'
          step='1'
          disabled={saving}
          value={cashOutInput}
          onChange={(e) => setCashOutInput(e.target.value)}
          onBlur={() => handleCashOutBlur()}
          className='w-28 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 text-right text-sm text-zinc-100 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 disabled:opacity-50'
        />
      </td>
      <td className='px-4 py-3 text-right'>
        <span
          className={`inline-block rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums ring-1 ${
            player.net >= 0
              ? 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/25'
              : 'text-rose-400 bg-rose-500/10 ring-rose-500/25'
          }`}
        >
          {currency(player.net)}
        </span>
      </td>
      <td className='px-4 py-3 text-right'>
        <div className='flex justify-end'>
          <PaymentStatusMenu
            value={player.paymentStatus}
            disabled={saving}
            onChange={handlePaymentStatusChange}
            align='right'
          />
        </div>
      </td>
      <td className='px-4 py-3 text-right'>
        <div className='flex flex-wrap items-center justify-end gap-1.5'>
          <QuickCashOutPopover player={player} onUpdated={onUpdated} onError={onError} />
          <QuickRebuyPopover
            player={player}
            sessionDate={sessionDate}
            sessionPlayers={sessionPlayers}
            onSaved={onRebuySaved}
            onError={onError}
          />
          <button
            type='button'
            onClick={() => onRemoved(player.id)}
            className='rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20'
          >
            Excluir
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

interface PlayerRegistrationTabProps {
  onSessionsChanged?: () => void;
  canControlTable?: boolean;
}

export function PlayerRegistrationTab({
  onSessionsChanged,
  canControlTable = false,
}: PlayerRegistrationTabProps) {
  const [form, setForm] = useState<PlayerFormState>(defaultForm);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionDate, setSessionDate] = useState(() => todayLocalISODate());
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState('');
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [enterAnimationIds, setEnterAnimationIds] = useState<Set<string>>(() => new Set());
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethodFilter>('all');

  const playersForSession = useMemo(
    () => unifyRegisteredPlayersForSession(players, sessionDate),
    [players, sessionDate]
  );

  const filteredPlayersForSession = useMemo(
    () => filterPlayersByPaymentMethod(playersForSession, paymentFilter),
    [playersForSession, paymentFilter]
  );

  const paymentFilterCounts = useMemo(
    () => countPlayersByPaymentFilter(playersForSession),
    [playersForSession]
  );

  const liveCashTotals = useMemo(
    () => sumRegisteredPlayerCashTotals(playersForSession),
    [playersForSession]
  );

  const chipsInPlay = useMemo(
    () => computeChipsInPlayFromRegistered(players, sessionDate),
    [players, sessionDate]
  );

  const sessionRakeBruto = useMemo(() => {
    const buyIn = playersForSession.reduce((acc, p) => acc + p.buyIn, 0);
    const cashOut = playersForSession.reduce((acc, p) => acc + p.cashOut, 0);
    return buyIn - cashOut;
  }, [playersForSession]);

  const pendingCount = useMemo(
    () => playersForSession.filter((p) => p.paymentStatus !== 'quitado').length,
    [playersForSession]
  );

  const gamificationBadges = useMemo(() => {
    const sessionPlayers = playersForSession.map((p) => ({
      name: p.name,
      buyIn: p.buyIn,
      cashOut: p.cashOut,
      net: p.net,
      paymentStatus: p.paymentStatus,
      buyInCount: resolveBuyInLogs(p).length,
    }));
    return badgesMapToRecord(computeGamificationBadgesFromPlayers(sessionPlayers));
  }, [playersForSession]);

  const loadPlayers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/registered-players');
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(apiMessageFromBody(body, 'Nao foi possivel carregar os registros.'));
      }
      if (!Array.isArray(body)) {
        throw new Error('Resposta invalida do servidor.');
      }
      setPlayers(body as RegisteredPlayer[]);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Nao foi possivel carregar os registros.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlayers();
  }, []);

  const loadProfileForName = async (name: string) => {
    if (!name.trim()) return;
    try {
      const response = await fetch(`/api/player-profiles?name=${encodeURIComponent(name.trim())}`);
      if (!response.ok) return;
      const data = (await response.json()) as { displayName?: string; phone?: string };
      setForm((current) => {
        if (current.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
          return current;
        }
        const phoneDigits = data.phone?.replace(/\D/g, '') ?? '';
        return {
          ...current,
          phone: phoneDigits || current.phone,
        };
      });
    } catch {
      /* perfil opcional */
    }
  };

  useEffect(() => {
    const name = form.name.trim();
    if (!name) return;
    const timer = window.setTimeout(() => {
      void loadProfileForName(name);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name]);

  const handleSelectClubPlayer = (profile: ClubPlayerProfile | { displayName: string; phone: string }) => {
    setForm((current) => ({
      ...current,
      name: profile.displayName,
      phone: profile.phone?.replace(/\D/g, '') ?? '',
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const buyIn = Number(form.buyIn);
    if (!form.name.trim()) return;
    if (!Number.isFinite(buyIn) || buyIn <= 0) {
      setError('Informe um buy-in maior que zero.');
      return;
    }

    setError('');
    try {
      const response = await fetch('/api/registered-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          date: sessionDate,
          buyIn,
          cashOut: 0,
          paymentStatus: 'a receber' as PaymentStatus,
          phone: form.phone.trim(),
          notes: '',
          paymentMethod: form.paymentMethod,
        }),
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiMessageFromBody(body, 'Nao foi possivel salvar o cadastro.'));
        return;
      }

      const saved = body as RegisteredPlayer;
      mergeSavedPlayer(saved);
      setForm(defaultForm);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Nao foi possivel salvar o cadastro.';
      setError(message);
    }
  };

  const finalizeSession = async () => {
    setFinalizeMessage('');
    setError('');
    setFinalizeLoading(true);
    try {
      const response = await fetch('/api/sessions/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: sessionDate }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || 'Nao foi possivel finalizar a sessao.');
      }
      setFinalizeMessage('Sessao finalizada e metricas salvas na dashboard.');
      onSessionsChanged?.();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Nao foi possivel finalizar a sessao.';
      setError(message);
    } finally {
      setFinalizeLoading(false);
      setFinalizeModalOpen(false);
    }
  };

  const removePlayer = async (id: string) => {
    setError('');
    try {
      const target = players.find((player) => player.id === id);
      const response = await fetch(`/api/registered-players/${id}`, { method: 'DELETE' });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiMessageFromBody(body, 'Nao foi possivel excluir o registro.'));
        return;
      }
      setPlayers((current) =>
        current.filter((player) => {
          if (!target) return player.id !== id;
          return !(
            player.date === target.date &&
            player.name.trim().toLowerCase() === target.name.trim().toLowerCase()
          );
        })
      );
    } catch {
      setError('Nao foi possivel excluir o registro.');
    }
  };

  const updatePlayerInList = (updated: RegisteredPlayer) => {
    setPlayers((current) => current.map((p) => (p.id === updated.id ? updated : p)));
  };

  const mergeSavedPlayer = (saved: RegisteredPlayer) => {
    setEnterAnimationIds((prev) => new Set(prev).add(saved.id));
    setPlayers((current) => {
      const withoutDuplicates = current.filter(
        (player) =>
          !(
            player.date === sessionDate &&
            player.name.trim().toLowerCase() === saved.name.trim().toLowerCase() &&
            player.id !== saved.id
          )
      );
      const existingIndex = withoutDuplicates.findIndex((player) => player.id === saved.id);
      if (existingIndex >= 0) {
        return withoutDuplicates.map((player) => (player.id === saved.id ? saved : player));
      }
      return [saved, ...withoutDuplicates];
    });
  };

  return (
    <section className='flex max-h-[calc(100dvh-10.5rem)] flex-col md:max-h-none'>
      {/* Topo fixo — formulário + operação da noite */}
      <div className='shrink-0 space-y-4 border-b border-zinc-800/60 bg-zinc-950/95 pb-4 backdrop-blur-md md:border-0 md:bg-transparent md:backdrop-blur-none'>
        {/* Hero */}
        <div className='glass-card relative overflow-hidden p-5'>
          <div
            className='pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.07] via-transparent to-violet-500/[0.04]'
            aria-hidden
          />
          <div className='relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/80'>
                Operação da noite
              </p>
              <h2 className='mt-1 text-2xl font-semibold tracking-tight text-zinc-100'>Cadastro da sessão</h2>
              <p className='mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500'>
                <CalendarDays className='h-4 w-4 text-sky-500/70' />
                <span>{prettyDate(sessionDate)}</span>
                <span className='text-zinc-700'>·</span>
                <span>Cadastre buy-ins e feche cash-outs ao vivo</span>
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <label className='flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm'>
                <span className='text-xs text-zinc-500'>Data</span>
                <input
                  type='date'
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  className='bg-transparent text-zinc-100 outline-none'
                />
              </label>
              <button
                type='button'
                onClick={() => void loadPlayers()}
                disabled={loading}
                className='inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 disabled:opacity-50'
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                type='button'
                disabled={finalizeLoading}
                onClick={() => setFinalizeModalOpen(true)}
                className='inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500 disabled:opacity-60'
              >
                <ClipboardList className='h-4 w-4' />
                Finalizar dia
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className='rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200'>
            {error}
          </p>
        )}
        {finalizeMessage && (
          <p className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300'>
            {finalizeMessage}
          </p>
        )}

        {/* KPIs */}
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <CadastroKpi
            label='Na mesa'
            value={playersForSession.length}
            sub={`${chipsInPlay.activePlayersCount} ainda jogando`}
            icon={Users}
            accent='border-sky-500/20 from-sky-500/10 to-zinc-950/40'
          />
          <CadastroKpi
            label='Buy-ins'
            value={currency(chipsInPlay.totalBuyIns)}
            sub='Total da sessão'
            icon={Wallet}
            accent='border-zinc-800 from-zinc-900/60 to-zinc-950/40'
          />
          <CadastroKpi
            label='Fichas em jogo'
            value={currency(chipsInPlay.chipsInPlay)}
            sub={`${currency(chipsInPlay.quitadoCashOuts)} já saíram`}
            icon={Layers}
            accent={
              chipsInPlay.chipsInPlay >= 0
                ? 'border-violet-500/20 from-violet-500/10 to-zinc-950/40'
                : 'border-rose-500/20 from-rose-500/10 to-zinc-950/40'
            }
          />
          <CadastroKpi
            label='Pendências'
            value={pendingCount}
            sub='A pagar ou a receber'
            icon={UserPlus}
            accent='border-amber-500/20 from-amber-500/10 to-zinc-950/40'
          />
        </div>

        {/* Cronômetro */}
        <TableClockPanel
          sessionDate={sessionDate}
          rakeBruto={sessionRakeBruto}
          canControl={canControlTable}
          compact
        />

        {/* Formulário compacto */}
        <div className='glass-card p-4'>
          <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
            Novo buy-in / re-buy
          </p>
          <form onSubmit={handleSubmit} className='grid gap-3 md:grid-cols-12'>
            <div className='md:col-span-4'>
              <PlayerNameAutocomplete
                value={form.name}
                onChange={(name) => setForm((current) => ({ ...current, name }))}
                onSelectProfile={handleSelectClubPlayer}
                required
              />
            </div>
            <input
              type='number'
              min='0'
              value={form.buyIn}
              onChange={(event) => setForm((current) => ({ ...current, buyIn: event.target.value }))}
              placeholder='Valor do buy-in'
              className='rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50 md:col-span-2'
            />
            <input
              value={formatBrazilPhoneInput(form.phone)}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                setForm((current) => ({ ...current, phone: digits }));
              }}
              placeholder='Telefone'
              inputMode='numeric'
              autoComplete='tel'
              className='rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50 md:col-span-3'
            />
            <div className='md:col-span-3'>
              <PaymentMethodSelector
                value={form.paymentMethod}
                onChange={(paymentMethod) => setForm((current) => ({ ...current, paymentMethod }))}
              />
            </div>
            <button
              type='submit'
              className='rounded-xl border border-sky-500/40 bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-500 md:col-span-12 lg:col-span-12'
            >
              Salvar cadastro
            </button>
          </form>
        </div>
      </div>

      {/* Lista rolável */}
      <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pt-4 md:overflow-visible md:pt-4'>
        <SessionCashSummary
          totalPix={liveCashTotals.totalPix}
          totalDinheiro={liveCashTotals.totalDinheiro}
          totalFiado={liveCashTotals.totalFiado}
          label={`Sessão ${sessionDate} — conferência de caixa`}
          players={playersForSession}
        />

        <div className='glass-card overflow-hidden'>
          <div className='border-b border-zinc-800/80 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-zinc-100'>Registros da sessão</h3>
                <p className='text-xs text-zinc-500'>
                  {filteredPlayersForSession.length} jogador(es) · badges da noite ao lado do nome
                </p>
              </div>
              {pendingCount > 0 && (
                <span className='inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200'>
                  {pendingCount} pendência{pendingCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className='mt-3'>
              <PaymentMethodFilterBar
                value={paymentFilter}
                onChange={setPaymentFilter}
                counts={paymentFilterCounts}
              />
            </div>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b border-zinc-800/80 bg-zinc-900/50 text-[10px] uppercase tracking-wider text-zinc-500'>
                  <th className='px-4 py-3 text-left font-medium'>Jogador</th>
                  <th className='px-4 py-3 text-right font-medium'>Buy-in</th>
                  <th className='px-4 py-3 text-right font-medium'>Pagamento</th>
                  <th className='px-4 py-3 text-right font-medium'>Cash-out</th>
                  <th className='px-4 py-3 text-right font-medium'>Resultado</th>
                  <th className='px-4 py-3 text-right font-medium'>Status</th>
                  <th className='px-4 py-3 text-right font-medium'>Ações</th>
                </tr>
              </thead>
              <tbody className='text-zinc-300'>
                {filteredPlayersForSession.map((player) => (
                  <RegisteredPlayerRow
                    key={player.id}
                    player={player}
                    sessionDate={sessionDate}
                    sessionPlayers={playersForSession}
                    badges={gamificationBadges[player.name.trim().toLowerCase()] ?? []}
                    onUpdated={updatePlayerInList}
                    onRemoved={removePlayer}
                    onRebuySaved={mergeSavedPlayer}
                    onError={setError}
                    enableEnterAnimation={enterAnimationIds.has(player.id)}
                    onEnterAnimationComplete={() =>
                      setEnterAnimationIds((prev) => {
                        const next = new Set(prev);
                        next.delete(player.id);
                        return next;
                      })
                    }
                  />
                ))}
                {!loading && filteredPlayersForSession.length === 0 && playersForSession.length > 0 && (
                  <tr>
                    <td colSpan={7} className='px-4 py-12 text-center text-zinc-500'>
                      Nenhum jogador com este meio de pagamento.
                    </td>
                  </tr>
                )}
                {!loading && playersForSession.length === 0 && (
                  <tr>
                    <td colSpan={7} className='px-4 py-16 text-center'>
                      <Users className='mx-auto h-10 w-10 text-zinc-700' />
                      <p className='mt-3 font-medium text-zinc-400'>Nenhum cadastro nesta data</p>
                      <p className='mt-1 text-sm text-zinc-600'>Use o formulário acima para o primeiro buy-in.</p>
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={7} className='px-4 py-12 text-center text-zinc-500'>
                      Carregando registros...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {finalizeModalOpen && (
        <div
          className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
          role='dialog'
          aria-modal='true'
          aria-labelledby='finalize-modal-title'
        >
          <div className='glass-card max-w-md border-zinc-700/90 p-5 shadow-2xl'>
            <h2 id='finalize-modal-title' className='text-lg font-semibold text-zinc-100'>
              Finalizar sessão do dia?
            </h2>
            <p className='mt-2 text-sm text-zinc-400'>
              Grava as métricas de <span className='font-medium text-zinc-200'>{prettyDate(sessionDate)}</span> na
              dashboard. Esta ação não pode ser desfeita automaticamente.
            </p>
            <ul className='mt-3 space-y-1 text-xs text-zinc-500'>
              <li>· {playersForSession.length} jogador(es) na sessão</li>
              <li>· Buy-ins: {currency(chipsInPlay.totalBuyIns)}</li>
              <li>· {pendingCount} pendência(s) de pagamento</li>
            </ul>
            <div className='mt-5 flex flex-wrap justify-end gap-2'>
              <button
                type='button'
                disabled={finalizeLoading}
                onClick={() => setFinalizeModalOpen(false)}
                className='rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800/80'
              >
                Cancelar
              </button>
              <button
                type='button'
                disabled={finalizeLoading}
                onClick={() => void finalizeSession()}
                className='rounded-xl border border-violet-500/40 bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60'
              >
                {finalizeLoading ? 'Salvando...' : 'Confirmar e gravar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
