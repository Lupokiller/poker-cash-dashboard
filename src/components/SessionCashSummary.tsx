'use client';

import { Banknote, HandCoins, Smartphone } from 'lucide-react';
import { currency } from '@/lib/data';

export function SessionCashSummary({
  totalPix,
  totalDinheiro,
  totalFiado,
  label,
}: {
  totalPix: number;
  totalDinheiro: number;
  totalFiado: number;
  label?: string;
}) {
  return (
    <section className='glass-card p-4'>
      <div className='mb-4'>
        <h3 className='text-lg font-semibold text-zinc-100'>Fechamento de caixa</h3>
        <p className='mt-1 text-xs text-zinc-500'>
          {label ?? 'Conferência automática por meio de pagamento dos buy-ins.'}
        </p>
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <div className='rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-transparent to-transparent p-5 ring-1 ring-sky-500/15 transition-all duration-300 hover:ring-sky-400/35'>
          <div className='flex items-center gap-2 text-sky-400'>
            <Smartphone className='h-4 w-4 shrink-0' aria-hidden />
            <span className='text-[10px] font-semibold uppercase tracking-wide text-sky-400/90'>
              Total a conferir no banco (Pix)
            </span>
          </div>
          <p className='mt-3 text-2xl font-semibold tabular-nums tracking-tight text-sky-200'>{currency(totalPix)}</p>
        </div>
        <div className='rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-5 ring-1 ring-emerald-500/15 transition-all duration-300 hover:ring-emerald-400/35'>
          <div className='flex items-center gap-2 text-emerald-400'>
            <Banknote className='h-4 w-4 shrink-0' aria-hidden />
            <span className='text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90'>
              Total em espécie na gaveta (Dinheiro)
            </span>
          </div>
          <p className='mt-3 text-2xl font-semibold tabular-nums tracking-tight text-emerald-200'>
            {currency(totalDinheiro)}
          </p>
        </div>
        <div className='rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-5 ring-1 ring-violet-500/15 transition-all duration-300 hover:ring-violet-400/35 sm:col-span-2 lg:col-span-1'>
          <div className='flex items-center gap-2 text-violet-400'>
            <HandCoins className='h-4 w-4 shrink-0' aria-hidden />
            <span className='text-[10px] font-semibold uppercase tracking-wide text-violet-400/90'>
              Total a Receber (Fiado)
            </span>
          </div>
          <p className='mt-3 text-2xl font-semibold tabular-nums tracking-tight text-violet-200'>
            {currency(totalFiado)}
          </p>
        </div>
      </div>
      <p className='mt-4 text-xs text-zinc-600'>
        Valores somados a partir dos buy-ins registrados. Re-finalize a sessão para atualizar o histórico na dashboard.
      </p>
    </section>
  );
}
