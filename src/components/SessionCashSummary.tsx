'use client';

import { useEffect, useRef, useState } from 'react';
import { Banknote, HandCoins, Info, Smartphone } from 'lucide-react';
import { currency } from '@/lib/data';
import { buildPaymentMethodBreakdown } from '@/lib/buyInLogsModel';
import { PaymentMethod, RegisteredPlayer } from '@/lib/types';

type CashCardMethod = 'pix' | 'dinheiro' | 'fiado';

const CARD_CONFIG: Record<
  CashCardMethod,
  {
    label: string;
    icon: typeof Smartphone;
    border: string;
    bg: string;
    ring: string;
    hoverRing: string;
    text: string;
    subtext: string;
  }
> = {
  pix: {
    label: 'Total a conferir no banco (Pix)',
    icon: Smartphone,
    border: 'border-sky-500/25',
    bg: 'from-sky-500/10',
    ring: 'ring-sky-500/15',
    hoverRing: 'hover:ring-sky-400/35',
    text: 'text-sky-200',
    subtext: 'text-sky-400',
  },
  dinheiro: {
    label: 'Total em espécie na gaveta (Dinheiro)',
    icon: Banknote,
    border: 'border-emerald-500/25',
    bg: 'from-emerald-500/10',
    ring: 'ring-emerald-500/15',
    hoverRing: 'hover:ring-emerald-400/35',
    text: 'text-emerald-200',
    subtext: 'text-emerald-400',
  },
  fiado: {
    label: 'Total a Receber (Fiado)',
    icon: HandCoins,
    border: 'border-violet-500/25',
    bg: 'from-violet-500/10',
    ring: 'ring-violet-500/15',
    hoverRing: 'hover:ring-violet-400/35',
    text: 'text-violet-200',
    subtext: 'text-violet-400',
  },
};

function CashBreakdownCard({
  method,
  total,
  players,
  className = '',
}: {
  method: CashCardMethod;
  total: number;
  players?: RegisteredPlayer[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = CARD_CONFIG[method];
  const Icon = config.icon;
  const breakdown = players ? buildPaymentMethodBreakdown(players, method as PaymentMethod) : [];
  const hasBreakdown = breakdown.length > 0;

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

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type='button'
        onClick={() => hasBreakdown && setOpen((current) => !current)}
        className={`w-full rounded-xl border ${config.border} bg-gradient-to-br ${config.bg} via-transparent to-transparent p-5 text-left ring-1 ${config.ring} transition-all duration-300 ${hasBreakdown ? `${config.hoverRing} cursor-pointer` : 'cursor-default opacity-95'}`}
      >
        <div className={`flex items-center justify-between gap-2 ${config.subtext}`}>
          <div className='flex items-center gap-2'>
            <Icon className='h-4 w-4 shrink-0' aria-hidden />
            <span className='text-[10px] font-semibold uppercase tracking-wide'>{config.label}</span>
          </div>
          {hasBreakdown && (
            <span title='Ver detalhamento'>
              <Info className='h-3.5 w-3.5 shrink-0 opacity-70' aria-hidden />
            </span>
          )}
        </div>
        <p className={`mt-3 text-2xl font-semibold tabular-nums tracking-tight ${config.text}`}>
          {currency(total)}
        </p>
        {hasBreakdown && (
          <p className='mt-1 text-[10px] text-zinc-600'>Clique para conferir por jogador</p>
        )}
      </button>

      {open && hasBreakdown && (
        <div className='absolute left-0 top-full z-50 mt-2 w-full min-w-[16rem] rounded-xl border border-zinc-700/90 bg-zinc-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md'>
          <p className='text-[10px] font-semibold uppercase tracking-wide text-zinc-500'>
            Conferência — {method === 'pix' ? 'Pix' : method === 'dinheiro' ? 'Dinheiro' : 'Fiado'}
          </p>
          <ul className='mt-2 max-h-48 space-y-1 overflow-y-auto'>
            {breakdown.map((entry) => (
              <li
                key={entry.playerName}
                className='flex items-center justify-between gap-2 rounded-lg bg-zinc-950/50 px-2.5 py-1.5 text-xs'
              >
                <span className='truncate font-medium text-zinc-200'>{entry.playerName}</span>
                <span className='shrink-0 font-semibold tabular-nums text-zinc-100'>
                  {currency(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className='mt-2 border-t border-zinc-800 pt-2 text-[10px] text-zinc-600'>
            {breakdown.map((e) => `${e.playerName}: ${currency(e.amount)}`).join(' · ')}
          </p>
        </div>
      )}
    </div>
  );
}

export function SessionCashSummary({
  totalPix,
  totalDinheiro,
  totalFiado,
  label,
  players,
}: {
  totalPix: number;
  totalDinheiro: number;
  totalFiado: number;
  label?: string;
  /** Jogadores da sessão para detalhamento por meio de pagamento. */
  players?: RegisteredPlayer[];
}) {
  return (
    <section className='glass-card p-4'>
      <div className='mb-4'>
        <h3 className='text-lg font-semibold text-zinc-100'>Fechamento de caixa</h3>
        <p className='mt-1 text-xs text-zinc-500'>
          {label ?? 'Conferência automática por meio de pagamento dos buy-ins.'}
          {players && players.length > 0 && ' Clique nos cards para ver quem contribuiu.'}
        </p>
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <CashBreakdownCard method='pix' total={totalPix} players={players} />
        <CashBreakdownCard method='dinheiro' total={totalDinheiro} players={players} />
        <CashBreakdownCard method='fiado' total={totalFiado} players={players} className='sm:col-span-2 lg:col-span-1' />
      </div>
      <p className='mt-4 text-xs text-zinc-600'>
        Valores somados a partir dos buy-ins registrados. Re-finalize a sessão para atualizar o histórico na dashboard.
      </p>
    </section>
  );
}
