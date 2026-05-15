'use client';
import { motion } from 'framer-motion';

export function KpiCard({ title, value, tone }: { title: string; value: string; tone?: 'green' | 'red' | 'amber' | 'blue' }) {
  const toneClass = tone === 'green' ? 'text-emerald-300' : tone === 'red' ? 'text-rose-300' : tone === 'amber' ? 'text-amber-300' : 'text-sky-300';
  return (
    <motion.div whileHover={{ y: -3 }} className='glass-card p-4'>
      <p className='text-xs uppercase tracking-wide text-slate-400'>{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </motion.div>
  );
}
