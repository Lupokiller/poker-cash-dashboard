'use client';

import { GAMIFICATION_BADGES, GamificationBadge } from '@/lib/playerGamificationModel';

export function PlayerGamificationBadge({ badge }: { badge: GamificationBadge }) {
  const meta = GAMIFICATION_BADGES[badge];
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm transition-all duration-300 hover:scale-105 ${meta.className}`}
      title={meta.description}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span className='hidden sm:inline'>{meta.label}</span>
    </span>
  );
}

export function PlayerGamificationBadges({ badges }: { badges: GamificationBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <span className='ml-1.5 inline-flex flex-wrap items-center gap-1'>
      {badges.map((badge) => (
        <PlayerGamificationBadge key={badge} badge={badge} />
      ))}
    </span>
  );
}
