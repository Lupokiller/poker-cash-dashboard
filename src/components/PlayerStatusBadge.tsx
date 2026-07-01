'use client';

import { PlayerDisplayStatus } from '@/lib/playerDirectoryModel';

const STATUS_META: Record<
  PlayerDisplayStatus,
  { label: string; dot: string; className: string }
> = {
  ativo: {
    label: 'Ativo',
    dot: 'bg-emerald-400',
    className: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200',
  },
  sumido: {
    label: 'Sumido',
    dot: 'bg-zinc-400',
    className: 'border-zinc-500/35 bg-zinc-600/15 text-zinc-300',
  },
  vip: {
    label: 'VIP',
    dot: 'bg-amber-400',
    className: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  },
  inativo: {
    label: 'Inativo',
    dot: 'bg-zinc-500',
    className: 'border-zinc-600/40 bg-zinc-700/25 text-zinc-400',
  },
  bloqueado: {
    label: 'Bloqueado',
    dot: 'bg-rose-400',
    className: 'border-rose-400/40 bg-rose-500/12 text-rose-200',
  },
};

export function PlayerStatusBadge({ status }: { status: PlayerDisplayStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}
