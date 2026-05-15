'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PaymentStatus, RegisteredPlayer } from '@/lib/types';
import { currency } from '@/lib/data';

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
}

const defaultForm: PlayerFormState = {
  name: '',
  buyIn: '',
  phone: '',
};

const paymentStatusOptions: PaymentStatus[] = ['a receber', 'a pagar', 'quitado'];

function RegisteredPlayerRow({
  player,
  onUpdated,
  onRemoved,
  onError,
}: {
  player: RegisteredPlayer;
  onUpdated: (p: RegisteredPlayer) => void;
  onRemoved: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [cashOutInput, setCashOutInput] = useState(String(player.cashOut));
  const [saving, setSaving] = useState(false);

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
    <tr className='border-t border-white/10'>
      <td className='py-2'>{player.name}</td>
      <td className='text-right'>{currency(player.buyIn)}</td>
      <td className='text-right'>
        <input
          type='number'
          min='0'
          step='1'
          disabled={saving}
          value={cashOutInput}
          onChange={(e) => setCashOutInput(e.target.value)}
          onBlur={() => handleCashOutBlur()}
          className='w-28 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-right text-sm outline-none focus:border-sky-400 disabled:opacity-50'
        />
      </td>
      <td className={`text-right font-semibold ${player.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{currency(player.net)}</td>
      <td className='text-right'>
        <select
          value={player.paymentStatus}
          disabled={saving}
          onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}
          className={`max-w-[9rem] rounded-full border px-2 py-1 text-xs outline-none disabled:opacity-50 ${
            player.paymentStatus === 'a receber'
              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
              : player.paymentStatus === 'a pagar'
                ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                : 'border-slate-500/40 bg-slate-500/20 text-slate-300'
          }`}
        >
          {paymentStatusOptions.map((status) => (
            <option key={status} value={status} className='bg-slate-900 text-slate-100'>
              {status}
            </option>
          ))}
        </select>
      </td>
      <td>{player.phone || '-'}</td>
      <td className='text-right'>
        <button
          type='button'
          onClick={() => onRemoved(player.id)}
          className='rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/30'
        >
          Excluir
        </button>
      </td>
    </tr>
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

  const playersForSession = useMemo(
    () => players.filter((player) => player.date === sessionDate),
    [players, sessionDate]
  );

  const totalNet = useMemo(() => playersForSession.reduce((acc, player) => acc + player.net, 0), [playersForSession]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const buyIn = Number(form.buyIn || '0');

    if (!form.name.trim()) {
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
        }),
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiMessageFromBody(body, 'Nao foi possivel salvar o cadastro.'));
        return;
      }

      const created = body as RegisteredPlayer;
      setPlayers((current) => [created, ...current]);
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

  return (
    <section className='space-y-4'>
      <div className='glass-card p-4'>
        <h2 className='mb-1 text-xl font-semibold'>Cadastro de jogador</h2>
        <p className='mb-4 text-sm text-slate-400'>
          Defina a data da sessao abaixo. Novos jogadores entram nesse dia. Cash-out e status sao ajustados na lista apos o cadastro.
        </p>
        {error && <p className='mb-3 text-sm text-rose-300'>{error}</p>}
        {finalizeMessage && <p className='mb-3 text-sm text-emerald-300'>{finalizeMessage}</p>}

        <div className='mb-4 rounded-xl border border-sky-500/20 bg-slate-900/40 p-3'>
          <label className='flex flex-col gap-1 text-xs text-slate-400'>
            <span className='font-medium uppercase tracking-wide text-sky-300/90'>Data da sessao</span>
            <span className='font-normal normal-case text-slate-500'>Usada para todos os cadastros desta rodada e para finalizar o dia na dashboard.</span>
            <input
              type='date'
              value={sessionDate}
              onChange={(event) => setSessionDate(event.target.value)}
              className='mt-1 max-w-xs rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
            />
          </label>
        </div>

        <div className='mb-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3 md:flex-row md:items-center md:justify-between'>
          <div className='flex flex-col gap-1'>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-400'>Encerrar dia na dashboard</span>
            <p className='text-xs text-slate-500'>Usa a mesma data da sessao acima para gravar metricas no banco.</p>
          </div>
          <button
            type='button'
            disabled={finalizeLoading}
            onClick={() => void finalizeSession()}
            className='shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {finalizeLoading ? 'Salvando...' : 'Finalizar sessao do dia'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className='grid gap-3 md:grid-cols-2'>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder='Nome do jogador'
            className='rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
            required
          />
          <input
            type='number'
            min='0'
            value={form.buyIn}
            onChange={(event) => setForm((current) => ({ ...current, buyIn: event.target.value }))}
            placeholder='Buy-in pago'
            className='rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder='Telefone / Pix'
            className='md:col-span-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
          />
          <button type='submit' className='rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 md:col-span-2'>
            Salvar cadastro
          </button>
        </form>
      </div>

      <div className='glass-card p-4'>
        <div className='mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>Registros da sessao</h3>
            <p className='text-xs text-slate-500'>Apenas jogadores com a data da sessao selecionada acima.</p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => void loadPlayers()}
              className='rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700'
            >
              Atualizar
            </button>
            <span className='text-sm text-slate-400'>Saldo acumulado: {currency(totalNet)}</span>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='text-slate-400'>
              <tr>
                <th className='py-2 text-left'>Jogador</th>
                <th className='text-right'>Buy-in</th>
                <th className='text-right'>Cash-out</th>
                <th className='text-right'>Resultado</th>
                <th className='text-right'>Status</th>
                <th className='text-left'>Contato</th>
                <th className='text-right'>Acao</th>
              </tr>
            </thead>
            <tbody>
              {playersForSession.map((player) => (
                <RegisteredPlayerRow
                  key={player.id}
                  player={player}
                  onUpdated={updatePlayerInList}
                  onRemoved={removePlayer}
                  onError={setError}
                />
              ))}
              {!loading && playersForSession.length === 0 && (
                <tr>
                  <td colSpan={7} className='py-6 text-center text-slate-400'>
                    Nenhum cadastro para esta data de sessao.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className='py-6 text-center text-slate-400'>
                    Carregando registros...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
