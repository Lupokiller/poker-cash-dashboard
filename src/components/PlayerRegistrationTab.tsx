'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PaymentStatus, PaymentMethod, RegisteredPlayer, ClubPlayerProfile } from '@/lib/types';
import { currency } from '@/lib/data';
import { PaymentStatusMenu } from '@/components/PaymentStatusMenu';
import { PaymentMethodBadge, PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { PlayerNameAutocomplete } from '@/components/PlayerNameAutocomplete';
import { BuyInHistoryHint } from '@/components/BuyInHistoryHint';
import { QuickRebuyPopover } from '@/components/QuickRebuyPopover';
import { QuickCashOutPopover } from '@/components/QuickCashOutPopover';
import {
  countPlayersByPaymentFilter,
  PaymentMethodFilterBar,
} from '@/components/PaymentMethodFilterBar';
import { SessionCashSummary } from '@/components/SessionCashSummary';
import { sumRegisteredPlayerCashTotals } from '@/lib/cashTotalsModel';
import {
  filterPlayersByPaymentMethod,
  hasMixedPaymentMethods,
  PaymentMethodFilter,
  resolveBuyInLogs,
  unifyRegisteredPlayersForSession,
} from '@/lib/buyInLogsModel';
import { sumFiadoAccumulatedForPlayer } from '@/lib/playerSessionModel';
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
  fiadoLimit: string;
}

const defaultForm: PlayerFormState = {
  name: '',
  buyIn: '',
  phone: '',
  paymentMethod: 'pix',
  fiadoLimit: '0',
};

function RegisteredPlayerRow({
  player,
  sessionDate,
  sessionPlayers,
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
      className='border-t border-zinc-800/80'
      initial={enableEnterAnimation ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => {
        if (enableEnterAnimation) {
          onEnterAnimationComplete?.();
        }
      }}
    >
      <td className='py-2.5 font-medium text-zinc-100'>{player.name}</td>
      <td className='relative py-2.5 text-right'>
        <BuyInHistoryHint player={player} />
      </td>
      <td className='py-2.5 text-right'>
        <PaymentMethodBadge method={paymentBadgeMethod} />
      </td>
      <td className='py-2.5 text-right'>
        <input
          type='number'
          min='0'
          step='1'
          disabled={saving}
          value={cashOutInput}
          onChange={(e) => setCashOutInput(e.target.value)}
          onBlur={() => handleCashOutBlur()}
          className='w-28 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1 text-right text-sm text-zinc-100 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 disabled:opacity-50'
        />
      </td>
      <td className='py-2.5 text-right'>
        <span
          className={`inline-block rounded-lg px-2 py-1 font-semibold tabular-nums ${
            player.net >= 0
              ? 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20'
              : 'text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20'
          }`}
        >
          {currency(player.net)}
        </span>
      </td>
      <td className='py-2.5 text-right'>
        <div className='flex justify-end'>
          <PaymentStatusMenu
            value={player.paymentStatus}
            disabled={saving}
            onChange={handlePaymentStatusChange}
            align='right'
          />
        </div>
      </td>
      <td className='py-2.5 text-zinc-400'>{player.phone ? formatBrazilPhoneInput(player.phone.replace(/\D/g, '')) : '-'}</td>
      <td className='py-2.5 text-right'>
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
}

export function PlayerRegistrationTab({ onSessionsChanged }: PlayerRegistrationTabProps) {
  const [form, setForm] = useState<PlayerFormState>(defaultForm);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState('');
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [enterAnimationIds, setEnterAnimationIds] = useState<Set<string>>(() => new Set());
  const [fiadoBlocked, setFiadoBlocked] = useState(false);
  const [forceFiadoSubmit, setForceFiadoSubmit] = useState(false);
  const [fiadoAlert, setFiadoAlert] = useState('');
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

  const totalNet = useMemo(() => playersForSession.reduce((acc, player) => acc + player.net, 0), [playersForSession]);

  const liveCashTotals = useMemo(
    () => sumRegisteredPlayerCashTotals(playersForSession),
    [playersForSession]
  );

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
      const data = (await response.json()) as { fiadoLimit?: number; phone?: string };
      setForm((current) => ({
        ...current,
        fiadoLimit: String(data.fiadoLimit ?? 0),
        phone: data.phone?.replace(/\D/g, '') ?? current.phone,
      }));
    } catch {
      /* perfil opcional */
    }
  };

  const handleSelectClubPlayer = (profile: ClubPlayerProfile | { displayName: string; phone: string; fiadoLimit: number }) => {
    setForm((current) => ({
      ...current,
      name: profile.displayName,
      phone: profile.phone?.replace(/\D/g, '') ?? '',
      fiadoLimit: String(profile.fiadoLimit ?? 0),
    }));
  };

  const evaluateFiadoLimit = (name: string, buyIn: number, paymentMethod: PaymentMethod) => {
    if (paymentMethod !== 'fiado') {
      setFiadoBlocked(false);
      setFiadoAlert('');
      return false;
    }
    const limit = Number(form.fiadoLimit || '0');
    const accumulated = sumFiadoAccumulatedForPlayer(
      playersForSession,
      name,
      sessionDate,
      buyIn,
      paymentMethod === 'fiado'
    );
    if (accumulated > limit) {
      setFiadoBlocked(true);
      setFiadoAlert(
        `⚠️ ATENÇÃO: O jogador ${name.trim()} atingiu o limite máximo de Fiado permitido (Limite: ${currency(limit)} / Acumulado: ${currency(accumulated)}).`
      );
      return true;
    }
    setFiadoBlocked(false);
    setFiadoAlert('');
    return false;
  };

  useEffect(() => {
    const buyIn = Number(form.buyIn || '0');
    if (form.name.trim() && form.paymentMethod === 'fiado') {
      evaluateFiadoLimit(form.name, buyIn, form.paymentMethod);
    } else {
      setFiadoBlocked(false);
      setFiadoAlert('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.buyIn, form.paymentMethod, playersForSession, sessionDate, form.fiadoLimit]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const buyIn = Number(form.buyIn || '0');

    if (!form.name.trim()) {
      return;
    }

    const blocked = evaluateFiadoLimit(form.name, buyIn, form.paymentMethod);
    if (blocked && !forceFiadoSubmit) {
      setForceFiadoSubmit(true);
      return;
    }

    setError('');
    setForceFiadoSubmit(false);

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
          fiadoLimit: Number(form.fiadoLimit || '0'),
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
      setFiadoBlocked(false);
      setFiadoAlert('');
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
    const response = await fetch(`/api/registered-players/${id}`, { method: 'DELETE' });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      setError(apiMessageFromBody(body, 'Nao foi possivel excluir o registro.'));
      return;
    }

    setPlayers((current) => current.filter((player) => player.id !== id));
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
    <section className='space-y-4'>
      <div className='glass-card p-4'>
        <h2 className='mb-1 text-xl font-semibold tracking-tight text-zinc-100'>Cadastro de jogador</h2>
        <p className='mb-4 text-sm text-zinc-500'>
          Defina a data da sessão abaixo. Novos jogadores entram nesse dia. Cash-out e status são ajustados na lista após o cadastro.
        </p>
        {error && <p className='mb-3 text-sm text-rose-300'>{error}</p>}
        {finalizeMessage && <p className='mb-3 text-sm text-emerald-400'>{finalizeMessage}</p>}

        <div className='mb-4 rounded-xl border border-sky-500/20 bg-zinc-900/40 p-3'>
          <label className='flex flex-col gap-1 text-xs text-zinc-500'>
            <span className='font-semibold uppercase tracking-wide text-sky-400/90'>Data da sessão</span>
            <span className='font-normal normal-case text-zinc-600'>Usada para todos os cadastros desta rodada e para finalizar o dia na dashboard.</span>
            <input
              type='date'
              value={sessionDate}
              onChange={(event) => setSessionDate(event.target.value)}
              className='mt-1 max-w-xs rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50'
            />
          </label>
        </div>

        <div className='mb-4 flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 md:flex-row md:items-center md:justify-between'>
          <div className='flex flex-col gap-1'>
            <span className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>Encerrar dia na dashboard</span>
            <p className='text-xs text-zinc-600'>Usa a mesma data da sessão acima para gravar métricas no banco.</p>
          </div>
          <button
            type='button'
            disabled={finalizeLoading}
            onClick={() => setFinalizeModalOpen(true)}
            className='shrink-0 rounded-xl border border-violet-500/40 bg-violet-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60'
          >
            Finalizar sessão do dia
          </button>
        </div>

        <form onSubmit={handleSubmit} className='grid gap-3 md:grid-cols-2'>
          <PlayerNameAutocomplete
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
            onSelectProfile={handleSelectClubPlayer}
            required
          />
          <input
            type='number'
            min='0'
            value={form.buyIn}
            onChange={(event) => setForm((current) => ({ ...current, buyIn: event.target.value }))}
            placeholder='Buy-in pago'
            className='rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50'
          />
          <div className='md:col-span-2'>
            <p className='mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500'>Meio de pagamento</p>
            <PaymentMethodSelector
              value={form.paymentMethod}
              onChange={(paymentMethod) => {
                setForm((current) => ({ ...current, paymentMethod }));
                setForceFiadoSubmit(false);
              }}
            />
          </div>
          <label className='flex flex-col gap-1 md:col-span-2'>
            <span className='text-xs font-semibold uppercase tracking-wide text-violet-400/90'>
              Limite de Fiado (opcional)
            </span>
            <span className='text-xs text-zinc-600'>Padrão R$ 0 — qualquer fiado exige confirmação manual se ultrapassar.</span>
            <input
              type='number'
              min={0}
              step='1'
              value={form.fiadoLimit}
              onChange={(event) => setForm((current) => ({ ...current, fiadoLimit: event.target.value }))}
              placeholder='Ex: 1000'
              className='max-w-xs rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50'
            />
          </label>
          {fiadoAlert && (
            <div className='md:col-span-2 rounded-xl border border-rose-500/50 bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-200 ring-1 ring-rose-500/30'>
              {fiadoAlert}
            </div>
          )}
          <input
            value={formatBrazilPhoneInput(form.phone)}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
              setForm((current) => ({ ...current, phone: digits }));
            }}
            onBlur={() => void loadProfileForName(form.name)}
            placeholder='Telefone / Pix — preenchido ao selecionar jogador'
            inputMode='numeric'
            autoComplete='tel'
            className='md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50'
          />
          <button
            type='submit'
            className={`rounded-xl border px-4 py-2 text-sm font-semibold text-white shadow-lg md:col-span-2 ${
              fiadoBlocked
                ? 'border-rose-500/50 bg-rose-600 shadow-rose-900/20 hover:bg-rose-500'
                : 'border-sky-500/40 bg-sky-600 shadow-sky-900/20 hover:bg-sky-500'
            } transition`}
          >
            {fiadoBlocked && forceFiadoSubmit ? 'Confirmar Forçar Cadastro' : fiadoBlocked ? 'Forçar Cadastro' : 'Salvar cadastro / re-buy'}
          </button>
        </form>
      </div>

      <SessionCashSummary
        totalPix={liveCashTotals.totalPix}
        totalDinheiro={liveCashTotals.totalDinheiro}
        totalFiado={liveCashTotals.totalFiado}
        label={`Sessão ${sessionDate} — totais ao vivo do cadastro`}
        players={playersForSession}
      />

      <div className='glass-card p-4'>
        <div className='mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-zinc-100'>Registros da sessão</h3>
            <p className='text-xs text-zinc-500'>Apenas jogadores com a data da sessão selecionada acima.</p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => void loadPlayers()}
              className='rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700'
            >
              Atualizar
            </button>
            <span className='text-sm tabular-nums text-zinc-400'>
              Saldo acumulado: <span className='font-medium text-zinc-200'>{currency(totalNet)}</span>
            </span>
          </div>
        </div>

        <div className='mb-4'>
          <PaymentMethodFilterBar
            value={paymentFilter}
            onChange={setPaymentFilter}
            counts={paymentFilterCounts}
          />
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='text-xs uppercase tracking-wide text-zinc-500'>
              <tr>
                <th className='py-3 text-left font-medium'>Jogador</th>
                <th className='py-3 text-right font-medium'>Buy-in</th>
                <th className='py-3 text-right font-medium'>Pagamento</th>
                <th className='py-3 text-right font-medium'>Cash-out</th>
                <th className='py-3 text-right font-medium'>Resultado</th>
                <th className='py-3 text-right font-medium'>Status</th>
                <th className='py-3 text-left font-medium'>Contato</th>
                <th className='py-3 text-right font-medium'>Ação</th>
              </tr>
            </thead>
            <tbody className='text-zinc-300'>
              {filteredPlayersForSession.map((player) => (
                <RegisteredPlayerRow
                  key={player.id}
                  player={player}
                  sessionDate={sessionDate}
                  sessionPlayers={playersForSession}
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
                  <td colSpan={8} className='py-6 text-center text-zinc-500'>
                    Nenhum jogador com este meio de pagamento no histórico.
                  </td>
                </tr>
              )}
              {!loading && playersForSession.length === 0 && (
                <tr>
                  <td colSpan={8} className='py-6 text-center text-zinc-500'>
                    Nenhum cadastro para esta data de sessão.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className='py-6 text-center text-zinc-500'>
                    Carregando registros...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              Isso grava as métricas de <span className='font-medium text-zinc-200'>{sessionDate}</span> no banco e atualiza a dashboard.
              A ação não pode ser desfeita automaticamente.
            </p>
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
