'use client';
import { motion } from 'framer-motion';

function PlayerMicroAvatar({ name, kind }: { name: string; kind: 'winner' | 'loser' }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';

  const ring =
    kind === 'winner'
      ? 'ring-emerald-500/35 shadow-emerald-500/10'
      : 'ring-rose-500/30 shadow-rose-500/10';

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-900 text-[11px] font-bold tracking-tight text-zinc-100 shadow-lg ring-2 ${ring}`}
      aria-hidden
    >
      {initials.slice(0, 2)}
    </div>
  );
}

type Tone = 'green' | 'red' | 'amber' | 'blue';

function toneMoneyClass(tone: Tone | undefined) {
  if (tone === 'green') return 'text-emerald-400';
  if (tone === 'red') return 'text-rose-400';
  if (tone === 'amber') return 'text-amber-400';
  return 'text-sky-400';
}

export type KpiCardProps =
  | {
      title: string;
      value: string;
      tone?: Tone;
      playerHighlight?: undefined;
    }
  | {
      title: string;
      tone: 'green' | 'red';
      playerHighlight: { name: string; amount: string; kind: 'winner' | 'loser' };
      value?: undefined;
    };

export function KpiCard(props: KpiCardProps) {
  const tone = props.tone;
  const toneClass = toneMoneyClass(tone);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className='glass-card p-4'
    >
      <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500'>{props.title}</p>

      {'playerHighlight' in props && props.playerHighlight ? (
        <div className='mt-3 flex items-start gap-3'>
          <PlayerMicroAvatar name={props.playerHighlight.name} kind={props.playerHighlight.kind} />
          <div className='min-w-0 flex-1 space-y-1'>
            <p className='truncate text-sm font-medium text-zinc-200'>{props.playerHighlight.name || '—'}</p>
            <p
              className={`font-semibold tracking-tight tabular-nums ${toneClass}`}
              style={{ fontFeatureSettings: '"tnum", "lnum"' }}
            >
              {props.playerHighlight.amount}
            </p>
          </div>
        </div>
      ) : (
        'value' in props && (
          <p
            className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums ${toneClass}`}
            style={{ fontFeatureSettings: '"tnum", "lnum"' }}
          >
            {props.value}
          </p>
        )
      )}
    </motion.div>
  );
}
