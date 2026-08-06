'use client';

import {
  filterPlayersByPaymentMethod,
  PaymentMethodFilter,
} from '@/lib/buyInLogsModel';
import { RegisteredPlayer } from '@/lib/types';

const FILTERS: Array<{ id: PaymentMethodFilter; label: string; activeClass: string }> = [
  { id: 'all', label: 'Todos', activeClass: 'border-zinc-500/45 bg-zinc-500/15 text-zinc-100' },
  { id: 'pix', label: 'Pix', activeClass: 'border-sky-500/45 bg-sky-500/15 text-sky-100' },
  { id: 'dinheiro', label: 'Dinheiro', activeClass: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100' },
  { id: 'fiado', label: 'Crédito', activeClass: 'border-violet-500/45 bg-violet-500/15 text-violet-100' },
];

export function countPlayersByPaymentFilter(
  players: RegisteredPlayer[]
): Record<PaymentMethodFilter, number> {
  return {
    all: players.length,
    pix: filterPlayersByPaymentMethod(players, 'pix').length,
    dinheiro: filterPlayersByPaymentMethod(players, 'dinheiro').length,
    fiado: filterPlayersByPaymentMethod(players, 'fiado').length,
  };
}

export function PaymentMethodFilterBar({
  value,
  onChange,
  counts,
}: {
  value: PaymentMethodFilter;
  onChange: (filter: PaymentMethodFilter) => void;
  counts: Record<PaymentMethodFilter, number>;
}) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-[10px] font-semibold uppercase tracking-wide text-zinc-600'>Filtrar</span>
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type='button'
          onClick={() => onChange(filter.id)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
            value === filter.id
              ? filter.activeClass
              : 'border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
          }`}
        >
          {filter.label}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              value === filter.id ? 'bg-black/20' : 'bg-zinc-800/80'
            }`}
          >
            {counts[filter.id]}
          </span>
        </button>
      ))}
    </div>
  );
}
