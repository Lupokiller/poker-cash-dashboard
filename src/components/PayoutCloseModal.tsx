'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, X } from 'lucide-react';
import { currency } from '@/lib/data';
import { AggregatedSessionPlayer } from '@/lib/playerSessionModel';
import { SettlementMethod } from '@/lib/types';
import { buildWhatsAppSessionReceiptLink } from '@/lib/whatsapp';
import { nowHHMM } from '@/lib/time';

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='currentColor' aria-hidden>
      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
    </svg>
  );
}

export function PayoutCloseModal({
  player,
  open,
  onClose,
  onConfirmed,
}: {
  player: AggregatedSessionPlayer;
  open: boolean;
  onClose: () => void;
  onConfirmed: (updated: AggregatedSessionPlayer) => void;
}) {
  const [chipsInput, setChipsInput] = useState('');
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>('pix');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setChipsInput(player.cashOut > 0 ? String(player.cashOut) : '');
      setError('');
      setCopied(false);
      setConfirmed(player.paymentStatus === 'quitado');
    }
  }, [open, player]);

  const chips = useMemo(() => {
    const n = Number(chipsInput);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [chipsInput]);

  const cashOut = chips;
  const net = cashOut - player.buyIn;

  const copyCashOut = async () => {
    try {
      await navigator.clipboard.writeText(String(cashOut));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar. Copie manualmente o valor exibido.');
    }
  };

  const confirmPayout = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/registered-players/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: player.name,
          date: player.sessionDate,
          cashOut,
          settlementMethod: net === 0 ? null : settlementMethod,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const msg =
          payload && typeof payload === 'object' && 'message' in payload
            ? String((payload as { message: unknown }).message)
            : 'Não foi possível confirmar o payout.';
        setError(msg);
        return;
      }
      setConfirmed(true);
      onConfirmed(payload as AggregatedSessionPlayer);
    } catch {
      setError('Não foi possível confirmar o payout.');
    } finally {
      setSaving(false);
    }
  };

  const whatsappHref =
    confirmed && player.phone.trim()
      ? buildWhatsAppSessionReceiptLink({
          phone: player.phone,
          playerName: player.name,
          totalBuyIn: player.buyIn,
          cashOut,
          net,
          exitTime: nowHHMM(),
        })
      : null;

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='payout-modal-title'
    >
      <div className='glass-card w-full max-w-md border-zinc-700/90 p-5 shadow-2xl'>
        <div className='mb-4 flex items-start justify-between gap-3'>
          <div>
            <h2 id='payout-modal-title' className='text-lg font-semibold text-zinc-100'>
              Fechar Payout
            </h2>
            <p className='mt-1 text-sm text-zinc-400'>{player.name}</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200'
            aria-label='Fechar'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        <div className='space-y-4'>
          <div className='rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-sm'>
            <div className='flex justify-between text-zinc-400'>
              <span>Total de Buy-ins</span>
              <span className='font-semibold tabular-nums text-zinc-200'>{currency(player.buyIn)}</span>
            </div>
          </div>

          <label className='block'>
            <span className='mb-1.5 block text-xs font-semibold uppercase tracking-wide text-sky-400/90'>
              Fichas atuais na mesa
            </span>
            <input
              type='number'
              min={0}
              step='1'
              value={chipsInput}
              onChange={(e) => setChipsInput(e.target.value)}
              disabled={saving || confirmed}
              placeholder='Digite o valor em fichas'
              className='w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 text-right text-lg font-semibold tabular-nums text-zinc-100 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 disabled:opacity-60'
              autoFocus
            />
          </label>

          <div className='grid grid-cols-2 gap-3'>
            <div className='rounded-xl border border-sky-500/25 bg-sky-500/10 p-3'>
              <p className='text-[10px] font-semibold uppercase tracking-wide text-sky-400/90'>Cash-out</p>
              <p className='mt-1 text-xl font-bold tabular-nums text-sky-200'>{currency(cashOut)}</p>
            </div>
            <div
              className={`rounded-xl border p-3 ${
                net >= 0
                  ? 'border-emerald-500/25 bg-emerald-500/10'
                  : 'border-rose-500/25 bg-rose-500/10'
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  net >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'
                }`}
              >
                Resultado líquido
              </p>
              <p
                className={`mt-1 text-xl font-bold tabular-nums ${
                  net >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {currency(net)}
              </p>
            </div>
          </div>

          {error && <p className='text-sm text-rose-300'>{error}</p>}

          {net !== 0 && !confirmed && (
            <div className='space-y-2'>
              <p className='text-xs text-zinc-500'>
                {net < 0
                  ? `Quitar: jogador paga ${currency(Math.abs(net))}`
                  : `Quitar: casa paga ${currency(net)}`}
              </p>
              <div className='inline-flex w-full rounded-xl border border-zinc-800 bg-zinc-950/50 p-0.5'>
                {(['pix', 'dinheiro'] as SettlementMethod[]).map((method) => (
                  <button
                    key={method}
                    type='button'
                    onClick={() => setSettlementMethod(method)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      settlementMethod === method
                        ? method === 'pix'
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'bg-emerald-500/20 text-emerald-200'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {method === 'pix' ? 'Pix' : 'Dinheiro'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => void copyCashOut()}
              disabled={cashOut <= 0}
              className='inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Copy className='h-4 w-4' />
              {copied ? 'Copiado!' : 'Copiar Valor de Cash-Out'}
            </button>
            {!confirmed ? (
              <button
                type='button'
                disabled={saving || chipsInput === ''}
                onClick={() => void confirmPayout()}
                className='inline-flex flex-1 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-600/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {saving ? 'Salvando…' : 'Quitar e confirmar'}
              </button>
            ) : (
              whatsappHref && (
                <a
                  href={whatsappHref}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25'
                >
                  <WhatsAppGlyph className='h-4 w-4' />
                  Enviar comprovante
                </a>
              )
            )}
          </div>

          {confirmed && (
            <p className='text-center text-xs text-emerald-400'>Payout confirmado — status: quitado</p>
          )}
        </div>
      </div>
    </div>
  );
}

export { WhatsAppGlyph };
