'use client';
import { useMemo, useState } from 'react';
import { currency } from '@/lib/data';
import { PlayerSummary, PaymentStatus } from '@/lib/types';
import { PaymentStatusMenu } from '@/components/PaymentStatusMenu';
import { buildWhatsAppChargeLink } from '@/lib/whatsapp';

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='currentColor' aria-hidden>
      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
    </svg>
  );
}

export function PlayersTable({
  players,
  contactByPlayerName = {},
}: {
  players: PlayerSummary[];
  contactByPlayerName?: Record<string, string>;
}) {
  const [query, setQuery] = useState('');
  const [statusByKey, setStatusByKey] = useState<Record<string, PaymentStatus>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    const raw = window.localStorage.getItem('payment-status-overrides');
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, PaymentStatus>;
    } catch {
      return {};
    }
  });

  const saveStatus = (key: string, status: PaymentStatus) => {
    setStatusByKey((current) => {
      const next = { ...current, [key]: status };
      window.localStorage.setItem('payment-status-overrides', JSON.stringify(next));
      return next;
    });
  };

  const list = useMemo(() => {
    return players
      .map((p) => ({
        key: `global:${p.name}`,
        name: p.name,
        buyIn: p.buyIn,
        cashOut: p.cashOut,
        net: p.net,
        sessions: p.sessions,
        paymentStatus: statusByKey[`global:${p.name}`] ?? p.paymentStatus,
      }))
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  }, [players, query, statusByKey]);

  return (
    <div className='glass-card p-4'>
      <div className='mb-4 flex flex-col gap-3 md:flex-row'>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Buscar jogador...'
          className='max-w-md rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30'
        />
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead className='text-xs uppercase tracking-wide text-zinc-500'>
            <tr>
              <th className='py-3 text-left font-medium'>Jogador</th>
              <th className='py-3 text-right font-medium'>Buy-in</th>
              <th className='py-3 text-right font-medium'>Cash-out</th>
              <th className='py-3 text-right font-medium'>Resultado</th>
              <th className='py-3 text-right font-medium'>Sessoes</th>
              <th className='py-3 text-right font-medium'>Status</th>
            </tr>
          </thead>
          <tbody className='text-zinc-300'>
            {list.map((p) => {
              const phone = contactByPlayerName[p.name.trim().toLowerCase()] ?? '';
              const due = p.net <= 0 ? Math.abs(p.net) : p.net;
              const waHref =
                p.paymentStatus === 'a pagar' && phone.trim()
                  ? buildWhatsAppChargeLink(phone, p.name, due)
                  : null;

              return (
                <tr key={p.key} className='border-t border-zinc-800/80'>
                  <td className='py-2.5 font-medium text-zinc-100'>{p.name}</td>
                  <td className='py-2.5 text-right tabular-nums text-zinc-400'>{currency(p.buyIn)}</td>
                  <td className='py-2.5 text-right tabular-nums text-zinc-400'>{currency(p.cashOut)}</td>
                  <td className='py-2.5 text-right'>
                    <span
                      className={`inline-block rounded-lg px-2 py-1 font-semibold tabular-nums ${
                        p.net >= 0
                          ? 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                          : 'text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20'
                      }`}
                    >
                      {currency(p.net)}
                    </span>
                  </td>
                  <td className='py-2.5 text-right tabular-nums text-zinc-500'>{p.sessions}</td>
                  <td className='py-2.5'>
                    <div className='flex flex-wrap items-center justify-end gap-1.5'>
                      <PaymentStatusMenu value={p.paymentStatus} onChange={(s) => saveStatus(p.key, s)} align='right' />
                      {p.paymentStatus === 'a pagar' && waHref && (
                        <a
                          href={waHref}
                          target='_blank'
                          rel='noopener noreferrer'
                          title='Enviar cobrança via WhatsApp'
                          className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600/40 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20 hover:text-emerald-300'
                        >
                          <WhatsAppGlyph className='h-4 w-4' />
                          <span className='sr-only'>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
