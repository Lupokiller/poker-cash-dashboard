'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { RegisteredPlayer, PaymentStatus } from '@/lib/types';
import { currency } from '@/lib/data';
import { netFromCashOut, paymentStatusFromNet } from '@/lib/paymentStatusModel';

function apiMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  'a pagar': 'A pagar (casa paga o jogador)',
  'a receber': 'A receber (jogador deve à casa)',
  quitado: 'Quitado',
};

export function QuickCashOutPopover({
  player,
  onUpdated,
  onError,
}: {
  player: RegisteredPlayer;
  onUpdated: (updated: RegisteredPlayer) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cashOutInput, setCashOutInput] = useState(String(player.cashOut || ''));
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCashOutInput(player.cashOut > 0 ? String(player.cashOut) : '');
  }, [open, player.cashOut]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const cashOutDraft = Number(cashOutInput);
  const cashOut = Number.isFinite(cashOutDraft) && cashOutDraft >= 0 ? cashOutDraft : 0;
  const previewNet = netFromCashOut(cashOut, player.buyIn);
  const previewStatus = paymentStatusFromNet(previewNet);

  const handleConfirm = async () => {
    if (!Number.isFinite(cashOutDraft) || cashOutDraft < 0) {
      onError('Informe um valor de cash-out válido.');
      return;
    }

    setSaving(true);
    onError('');
    try {
      const paymentStatus = paymentStatusFromNet(netFromCashOut(cashOutDraft, player.buyIn));
      const response = await fetch(`/api/registered-players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashOut: cashOutDraft, paymentStatus }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        onError(apiMessageFromBody(body, 'Nao foi possivel registrar o cash-out.'));
        return;
      }
      onUpdated(body as RegisteredPlayer);
      setOpen(false);
    } catch {
      onError('Nao foi possivel registrar o cash-out.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='relative inline-flex' ref={ref}>
      <button
        type='button'
        onClick={() => setOpen((current) => !current)}
        title='Cash-out rápido'
        className='inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20'
      >
        <LogOut className='h-3.5 w-3.5' />
        Cash-out
      </button>

      {open && (
        <div className='absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-zinc-700/90 bg-zinc-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md'>
          <p className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>Fechar conta</p>
          <p className='mt-0.5 truncate text-sm font-medium text-zinc-100'>{player.name}</p>
          <p className='mt-1 text-xs text-zinc-500'>
            Buy-ins na sessão: <span className='font-semibold text-zinc-300'>{currency(player.buyIn)}</span>
          </p>

          <label className='mt-3 flex flex-col gap-1 text-xs text-zinc-500'>
            Fichas devolvidas (cash-out)
            <input
              type='number'
              min='0'
              step='1'
              autoFocus
              value={cashOutInput}
              onChange={(event) => setCashOutInput(event.target.value)}
              placeholder='Ex: 150'
              className='rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50'
            />
          </label>

          <div className='mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs'>
            <div className='flex justify-between gap-2 text-zinc-500'>
              <span>Resultado</span>
              <span
                className={`font-bold tabular-nums ${
                  previewNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currency(previewNet)}
              </span>
            </div>
            <div className='mt-1 flex justify-between gap-2 text-zinc-500'>
              <span>Status</span>
              <span className='font-medium text-zinc-300'>{STATUS_LABEL[previewStatus]}</span>
            </div>
          </div>

          <div className='mt-3 flex justify-end gap-2'>
            <button
              type='button'
              disabled={saving}
              onClick={() => setOpen(false)}
              className='rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800/80'
            >
              Cancelar
            </button>
            <button
              type='button'
              disabled={saving}
              onClick={() => void handleConfirm()}
              className='rounded-lg border border-emerald-500/40 bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50'
            >
              {saving ? 'Salvando…' : 'Confirmar saída'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
