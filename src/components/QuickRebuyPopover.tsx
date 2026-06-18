'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { PaymentMethod, PaymentStatus, RegisteredPlayer } from '@/lib/types';
import { currency } from '@/lib/data';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { sumFiadoAccumulatedForPlayer } from '@/lib/playerSessionModel';

const DEFAULT_REBUY_AMOUNT = 100;

function apiMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

export function QuickRebuyPopover({
  player,
  sessionDate,
  sessionPlayers,
  onSaved,
  onError,
}: {
  player: RegisteredPlayer;
  sessionDate: string;
  sessionPlayers: RegisteredPlayer[];
  onSaved: (saved: RegisteredPlayer) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [buyIn, setBuyIn] = useState(String(DEFAULT_REBUY_AMOUNT));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(player.paymentMethod);
  const [fiadoLimit, setFiadoLimit] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fiadoBlocked, setFiadoBlocked] = useState(false);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [fiadoAlert, setFiadoAlert] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setForceSubmit(false);
        setFiadoAlert('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setBuyIn(String(DEFAULT_REBUY_AMOUNT));
    setPaymentMethod(player.paymentMethod);
    setForceSubmit(false);
    setFiadoAlert('');

    void (async () => {
      try {
        const response = await fetch(`/api/player-profiles?name=${encodeURIComponent(player.name.trim())}`);
        if (!response.ok) return;
        const data = (await response.json()) as { fiadoLimit?: number };
        setFiadoLimit(Number(data.fiadoLimit ?? 0));
      } catch {
        setFiadoLimit(0);
      }
    })();
  }, [open, player.name, player.paymentMethod]);

  const evaluateFiado = (amount: number, method: PaymentMethod) => {
    if (method !== 'fiado') {
      setFiadoBlocked(false);
      setFiadoAlert('');
      return false;
    }
    const accumulated = sumFiadoAccumulatedForPlayer(
      sessionPlayers,
      player.name,
      sessionDate,
      amount,
      true
    );
    if (accumulated > fiadoLimit) {
      setFiadoBlocked(true);
      setFiadoAlert(
        `Limite de fiado excedido (limite ${currency(fiadoLimit)} / acumulado ${currency(accumulated)}).`
      );
      return true;
    }
    setFiadoBlocked(false);
    setFiadoAlert('');
    return false;
  };

  useEffect(() => {
    if (!open || paymentMethod !== 'fiado') {
      setFiadoBlocked(false);
      setFiadoAlert('');
      return;
    }
    const amount = Number(buyIn || '0');
    evaluateFiado(amount, paymentMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, buyIn, paymentMethod, fiadoLimit, sessionPlayers]);

  const handleConfirm = async () => {
    const amount = Number(buyIn || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      onError('Informe um valor de buy-in válido.');
      return;
    }

    const blocked = evaluateFiado(amount, paymentMethod);
    if (blocked && !forceSubmit) {
      setForceSubmit(true);
      return;
    }

    setSaving(true);
    onError('');
    try {
      const response = await fetch('/api/registered-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: player.name.trim(),
          date: sessionDate,
          buyIn: amount,
          cashOut: player.cashOut,
          paymentStatus: player.paymentStatus as PaymentStatus,
          phone: player.phone,
          notes: player.notes,
          paymentMethod,
          fiadoLimit,
        }),
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        onError(apiMessageFromBody(body, 'Nao foi possivel registrar a recompra.'));
        return;
      }

      onSaved(body as RegisteredPlayer);
      setOpen(false);
      setForceSubmit(false);
      setFiadoAlert('');
    } catch {
      onError('Nao foi possivel registrar a recompra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='relative inline-flex' ref={ref}>
      <button
        type='button'
        onClick={() => setOpen((current) => !current)}
        title='Recompra rápida'
        className='inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20'
      >
        <Plus className='h-3.5 w-3.5' />
        Recomprar
      </button>

      {open && (
        <div className='absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-zinc-700/90 bg-zinc-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md'>
          <p className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>Recompra rápida</p>
          <p className='mt-0.5 truncate text-sm font-medium text-zinc-100'>{player.name}</p>

          <label className='mt-3 flex flex-col gap-1 text-xs text-zinc-500'>
            Valor do buy-in
            <input
              type='number'
              min='1'
              step='1'
              value={buyIn}
              onChange={(event) => {
                setBuyIn(event.target.value);
                setForceSubmit(false);
              }}
              className='rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500/50'
            />
          </label>

          <div className='mt-3'>
            <p className='mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500'>Pagamento</p>
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={(method) => {
                setPaymentMethod(method);
                setForceSubmit(false);
              }}
            />
          </div>

          {fiadoAlert && (
            <p className='mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200'>
              {fiadoAlert}
            </p>
          )}

          <div className='mt-3 flex justify-end gap-2'>
            <button
              type='button'
              disabled={saving}
              onClick={() => {
                setOpen(false);
                setForceSubmit(false);
                setFiadoAlert('');
              }}
              className='rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800/80'
            >
              Cancelar
            </button>
            <button
              type='button'
              disabled={saving}
              onClick={() => void handleConfirm()}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${
                fiadoBlocked
                  ? 'border-rose-500/50 bg-rose-600 hover:bg-rose-500'
                  : 'border-sky-500/40 bg-sky-600 hover:bg-sky-500'
              }`}
            >
              {saving
                ? 'Salvando…'
                : fiadoBlocked && forceSubmit
                  ? 'Forçar recompra'
                  : fiadoBlocked
                    ? 'Confirmar'
                    : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
