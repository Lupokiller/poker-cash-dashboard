'use client';
import { useMemo, useState } from 'react';
import { currency } from '@/lib/data';
import { PlayerSummary, PaymentStatus } from '@/lib/types';

export function PlayersTable({ players }: { players: PlayerSummary[] }) {
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

  const statusOptions: PaymentStatus[] = ['a receber', 'a pagar', 'quitado'];

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
          className='rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
        />
      </div>
      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm'>
          <thead className='text-slate-400'>
            <tr>
              <th className='py-2 text-left'>Jogador</th>
              <th className='text-right'>Buy-in</th>
              <th className='text-right'>Cash-out</th>
              <th className='text-right'>Resultado</th>
              <th className='text-right'>Sessoes</th>
              <th className='text-right'>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.key} className='border-t border-white/10'>
                <td className='py-2'>{p.name}</td>
                <td className='text-right'>{currency(p.buyIn)}</td>
                <td className='text-right'>{currency(p.cashOut)}</td>
                <td className={`text-right font-semibold ${p.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{currency(p.net)}</td>
                <td className='text-right text-slate-400'>{p.sessions}</td>
                <td className='text-right'>
                  <select
                    value={p.paymentStatus}
                    onChange={(e) => saveStatus(p.key, e.target.value as PaymentStatus)}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      p.paymentStatus === 'a receber'
                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                        : p.paymentStatus === 'a pagar'
                          ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                          : 'border-slate-500/40 bg-slate-500/20 text-slate-300'
                    }`}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status} className='bg-slate-900 text-slate-100'>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
