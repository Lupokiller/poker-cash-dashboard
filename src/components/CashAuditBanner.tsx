'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { currency } from '@/lib/data';
import type { ScopedCashAudit } from '@/lib/rakeModel';

export function CashAuditBanner({
  audit,
  hasSessions,
  rakePeriodLabel = 'nesta sessão',
}: {
  audit: ScopedCashAudit;
  hasSessions: boolean;
  rakePeriodLabel?: string;
}) {
  if (!hasSessions) {
    return null;
  }

  if (audit.reconciled) {
    return (
      <div className='flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100'>
        <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-emerald-400' aria-hidden />
        <div>
          <p className='font-medium text-emerald-100'>
            ✓ Caixa Auditado e Conciliado perfeitamente. Rake retido {rakePeriodLabel}: {currency(audit.rake)}
          </p>
          <p className='mt-0.5 text-xs text-emerald-100/80'>
            Entradas {currency(audit.totalEntradas)} · Saídas {currency(audit.totalSaidas)} — diferença registrada como lucro da casa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
      <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-400' aria-hidden />
      <div>
        <p className='font-medium text-amber-100'>Auditoria de caixa — inconsistência nos dados</p>
        <p className='mt-0.5 text-xs text-amber-100/85'>
          {audit.inconsistentSessions} sessão(ões) com totais que não fecham com os jogadores. Rake esperado do período:{' '}
          {currency(audit.rake)} (Entradas {currency(audit.totalEntradas)} − Saídas {currency(audit.totalSaidas)}). Revise os
          cadastros antes de confiar nos números.
        </p>
      </div>
    </div>
  );
}
