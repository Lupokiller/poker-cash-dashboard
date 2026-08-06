'use client';

import { PaymentMethod } from '@/lib/types';

const options: { value: PaymentMethod; label: string; hint: string; activeClass: string }[] = [
  {
    value: 'pix',
    label: 'Pix',
    hint: 'Já pagou',
    activeClass: 'border-sky-400/60 bg-sky-500/20 text-sky-200 shadow-sm shadow-sky-500/10',
  },
  {
    value: 'dinheiro',
    label: 'Dinheiro',
    hint: 'Já pagou',
    activeClass: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-sm shadow-emerald-500/10',
  },
  {
    value: 'fiado',
    label: 'Crédito',
    hint: 'Paga no acerto',
    activeClass: 'border-violet-400/60 bg-violet-500/20 text-violet-200 shadow-sm shadow-violet-500/10',
  },
];

export function PaymentMethodSelector({
  value,
  onChange,
  disabled,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className='inline-flex w-full rounded-xl border border-zinc-800 bg-zinc-950/50 p-0.5'
      role='group'
      aria-label='Como entrou o buy-in'
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type='button'
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1.5 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
            value === opt.value
              ? opt.activeClass
              : 'border border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span className='text-xs font-semibold'>{opt.label}</span>
          <span className='text-[9px] opacity-70'>{opt.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function PaymentMethodBadge({
  method,
  compact,
}: {
  method: PaymentMethod | 'misto';
  compact?: boolean;
}) {
  const styles =
    method === 'pix'
      ? 'border-sky-400/40 bg-sky-500/15 text-sky-300'
      : method === 'dinheiro'
        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
        : method === 'fiado'
          ? 'border-violet-400/40 bg-violet-500/15 text-violet-300'
          : 'border-amber-400/40 bg-amber-500/15 text-amber-300';
  const label =
    method === 'pix'
      ? 'Pix'
      : method === 'dinheiro'
        ? 'Dinheiro'
        : method === 'fiado'
          ? 'Crédito'
          : 'Misto';

  return (
    <span
      className={`inline-flex rounded-full border font-semibold uppercase tracking-wide ${compact ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]'} ${styles}`}
    >
      {label}
    </span>
  );
}
