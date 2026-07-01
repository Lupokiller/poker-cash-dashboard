'use client';

const RING_BY_STATUS: Record<string, string> = {
  ativo: 'ring-emerald-500/35',
  sumido: 'ring-zinc-500/30',
  vip: 'ring-amber-400/45',
  inativo: 'ring-zinc-600/40',
  bloqueado: 'ring-rose-500/35',
};

export function PlayerDirectoryAvatar({
  name,
  status = 'ativo',
  size = 'md',
}: {
  name: string;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';

  const sizeClass =
    size === 'lg'
      ? 'h-14 w-14 text-base'
      : size === 'sm'
        ? 'h-8 w-8 text-[10px]'
        : 'h-10 w-10 text-xs';

  const ring = RING_BY_STATUS[status] ?? RING_BY_STATUS.ativo;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-900 font-bold tracking-tight text-zinc-100 shadow-md ring-2 ${sizeClass} ${ring}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
