'use client';

import {
  HISTORICAL_BADGES,
  HistoricalGamificationBadge,
} from '@/lib/playerDirectoryModel';

export function HistoricalPlayerBadge({
  badge,
  compact,
}: {
  badge: HistoricalGamificationBadge;
  compact?: boolean;
}) {
  const meta = HISTORICAL_BADGES[badge];
  if (compact) {
    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-sm ${meta.className}`}
        title={`${meta.label} — ${meta.description}`}
      >
        <span aria-hidden>{meta.emoji}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
      title={meta.description}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export function HistoricalPlayerBadges({
  badges,
  compact,
}: {
  badges: HistoricalGamificationBadge[];
  compact?: boolean;
}) {
  if (badges.length === 0) {
    return compact ? (
      <span className='text-[10px] text-zinc-600'>—</span>
    ) : null;
  }
  return (
    <span className={`inline-flex flex-wrap items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
      {badges.map((badge) => (
        <HistoricalPlayerBadge key={badge} badge={badge} compact={compact} />
      ))}
    </span>
  );
}
