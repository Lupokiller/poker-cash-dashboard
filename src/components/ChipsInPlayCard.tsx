'use client';

import { motion } from 'framer-motion';
import { Layers, ShieldCheck } from 'lucide-react';
import { currency } from '@/lib/data';
import { ChipsInPlaySnapshot } from '@/lib/chipsInPlayModel';

export function ChipsInPlayCard({ snapshot }: { snapshot: ChipsInPlaySnapshot }) {
  const balanced = snapshot.chipsInPlay >= 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`glass-card relative overflow-hidden p-4 ring-1 ${
        balanced
          ? 'ring-violet-500/30 shadow-lg shadow-violet-500/5'
          : 'ring-rose-500/35 shadow-lg shadow-rose-500/10'
      }`}
    >
      <div
        className='pointer-events-none absolute inset-0 opacity-60'
        style={{
          background: balanced
            ? 'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(139,92,246,0.14), transparent 55%)'
            : 'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(244,63,94,0.12), transparent 55%)',
        }}
      />
      <div className='relative'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-400/90'>
              Auditoria da mesa
            </p>
            <h3 className='mt-1 text-base font-semibold text-zinc-100'>Fichas em Jogo</h3>
          </div>
          <div
            className={`rounded-lg border p-2 ${
              balanced ? 'border-violet-500/30 bg-violet-500/10' : 'border-rose-500/30 bg-rose-500/10'
            }`}
          >
            {balanced ? (
              <ShieldCheck className='h-4 w-4 text-violet-300' />
            ) : (
              <Layers className='h-4 w-4 text-rose-300' />
            )}
          </div>
        </div>

        <p
          className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${
            balanced ? 'text-violet-300' : 'text-rose-400'
          }`}
        >
          {currency(snapshot.chipsInPlay)}
        </p>

        <p className='mt-2 text-xs leading-relaxed text-zinc-500'>
          Deve estar fisicamente na mesa agora ({snapshot.activePlayersCount} jogador
          {snapshot.activePlayersCount === 1 ? '' : 'es'} ativo
          {snapshot.activePlayersCount === 1 ? '' : 's'}).
        </p>

        <div className='mt-3 space-y-1 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 text-[11px] tabular-nums text-zinc-400'>
          <div className='flex justify-between gap-2'>
            <span>Buy-ins cadastrados</span>
            <span className='text-zinc-200'>{currency(snapshot.totalBuyIns)}</span>
          </div>
          <div className='flex justify-between gap-2'>
            <span>Cash-outs quitados</span>
            <span className='text-emerald-400/90'>− {currency(snapshot.quitadoCashOuts)}</span>
          </div>
          <div className='flex justify-between gap-2 border-t border-zinc-800/80 pt-1 font-medium'>
            <span className='text-zinc-300'>= Fichas em jogo</span>
            <span className={balanced ? 'text-violet-300' : 'text-rose-400'}>
              {currency(snapshot.chipsInPlay)}
            </span>
          </div>
        </div>

        {!balanced && (
          <p className='mt-2 text-xs font-medium text-rose-400'>
            Valor negativo — revise cadastros ou cash-outs quitados.
          </p>
        )}
      </div>
    </motion.div>
  );
}
