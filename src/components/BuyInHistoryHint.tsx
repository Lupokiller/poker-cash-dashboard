'use client';

import { useEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import { currency } from '@/lib/data';
import { resolveBuyInLogs } from '@/lib/buyInLogsModel';
import { RegisteredPlayer } from '@/lib/types';
import { PaymentMethodBadge } from '@/components/PaymentMethodSelector';

export function BuyInHistoryHint({ player }: { player: RegisteredPlayer }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logs = resolveBuyInLogs(player);
  const count = logs.length;

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
    <div className='relative inline-flex flex-col items-end gap-0.5' ref={ref}>
      <div className='inline-flex items-center gap-1.5'>
        <span className='font-medium tabular-nums text-zinc-300'>{currency(player.buyIn)}</span>
        {count > 1 && (
          <button
            type='button'
            onClick={() => setOpen((current) => !current)}
            className='inline-flex items-center gap-0.5 rounded-md border border-zinc-700/80 bg-zinc-900/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300 transition hover:border-sky-500/40 hover:bg-sky-500/10'
            title='Ver histórico de buy-ins'
          >
            <History className='h-3 w-3' />
            {count}x
          </button>
        )}
      </div>

      {count > 1 && (
        <p className='max-w-[14rem] truncate text-[10px] tabular-nums text-zinc-600'>
          {logs.map((log) => `[${log.time}] ${currency(log.amount)}`).join(' | ')}
        </p>
      )}

      {open && count > 0 && (
        <div className='absolute z-50 mt-8 w-64 rounded-xl border border-zinc-700/90 bg-zinc-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md'>
          <p className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500'>
            Histórico de buy-ins
          </p>
          <ul className='space-y-1.5'>
            {logs.map((log, index) => (
              <li
                key={`${log.time}-${log.amount}-${index}`}
                className='flex items-center justify-between gap-2 rounded-lg bg-zinc-950/50 px-2 py-1.5 text-xs'
              >
                <span className='tabular-nums text-zinc-400'>[{log.time}]</span>
                <span className='font-semibold tabular-nums text-zinc-100'>{currency(log.amount)}</span>
                <PaymentMethodBadge method={log.paymentMethod} compact />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
