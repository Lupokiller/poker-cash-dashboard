'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PaymentStatus } from '@/lib/types';

const statusOptions: PaymentStatus[] = ['a receber', 'a pagar', 'quitado'];

function chipClasses(status: PaymentStatus) {
  if (status === 'a receber') {
    return 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20';
  }
  if (status === 'a pagar') {
    return 'border-rose-500/35 bg-rose-500/15 text-rose-300 hover:bg-rose-500/20';
  }
  return 'border-zinc-600/80 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/50';
}

export function PaymentStatusMenu({
  value,
  onChange,
  disabled,
  align = 'right',
}: {
  value: PaymentStatus;
  onChange: (s: PaymentStatus) => void;
  disabled?: boolean;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className={`relative inline-flex ${align === 'right' ? 'justify-end' : 'justify-start'}`} ref={ref}>
      <button
        type='button'
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${chipClasses(value)} disabled:cursor-not-allowed disabled:opacity-50`}
        aria-expanded={open}
        aria-haspopup='listbox'
      >
        <span>{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-70 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role='listbox'
          className={`absolute top-full z-50 mt-1.5 min-w-[11rem] rounded-xl border border-zinc-700/90 bg-zinc-900/95 py-1 shadow-2xl shadow-black/50 backdrop-blur-md ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {statusOptions.map((opt) => (
            <li key={opt} role='option' aria-selected={opt === value}>
              <button
                type='button'
                className={`w-full px-3 py-2 text-left text-xs transition hover:bg-zinc-800/90 ${opt === value ? 'bg-zinc-800/70 text-sky-300' : 'text-zinc-200'}`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
