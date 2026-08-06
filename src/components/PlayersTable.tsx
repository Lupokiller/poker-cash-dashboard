'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { currency } from '@/lib/data';
import { PlayerSummary, PaymentStatus } from '@/lib/types';
import { AggregatedSessionPlayer } from '@/lib/playerSessionModel';
import { GamificationBadge } from '@/lib/playerGamificationModel';
import { PaymentStatusMenu } from '@/components/PaymentStatusMenu';
import { PlayerGamificationBadges } from '@/components/PlayerGamificationBadge';
import { PayoutCloseModal, WhatsAppGlyph } from '@/components/PayoutCloseModal';
import { buildWhatsAppChargeLink, buildWhatsAppSessionReceiptLink } from '@/lib/whatsapp';
import { nowHHMM } from '@/lib/time';

const STATUS_STORAGE_KEY = 'payment-status-overrides';

interface TableRow {
  key: string;
  name: string;
  buyIn: number;
  cashOut: number;
  net: number;
  sessions: number;
  paymentStatus: PaymentStatus;
  phone: string;
  isLive: boolean;
  livePlayer?: AggregatedSessionPlayer;
  avgRebuysPerSession?: number;
  profitableSessionRate?: number;
  avgNetPerSession?: number;
}

function loadStatusOverrides(): Record<string, PaymentStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PaymentStatus>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStatusOverride(key: string, status: PaymentStatus) {
  const current = loadStatusOverrides();
  current[key] = status;
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(current));
}

export function PlayersTable({
  players,
  liveSessionPlayers = [],
  enablePayout = false,
  showPerformanceColumns = false,
  gamificationBadges = {},
  contactByPlayerName = {},
  onPayoutComplete,
}: {
  players: PlayerSummary[];
  liveSessionPlayers?: AggregatedSessionPlayer[];
  enablePayout?: boolean;
  showPerformanceColumns?: boolean;
  gamificationBadges?: Record<string, GamificationBadge[]>;
  contactByPlayerName?: Record<string, string>;
  onPayoutComplete?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [payoutPlayer, setPayoutPlayer] = useState<AggregatedSessionPlayer | null>(null);
  const [liveRows, setLiveRows] = useState<AggregatedSessionPlayer[]>(liveSessionPlayers);
  const [statusByKey, setStatusByKey] = useState<Record<string, PaymentStatus>>({});
  const [statusSaving, setStatusSaving] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');

  const useLive = liveSessionPlayers.length > 0;

  useEffect(() => {
    setStatusByKey(loadStatusOverrides());
  }, []);

  useEffect(() => {
    setLiveRows(liveSessionPlayers);
  }, [liveSessionPlayers]);

  const saveLocalStatus = useCallback((key: string, status: PaymentStatus) => {
    saveStatusOverride(key, status);
    setStatusByKey((current) => ({ ...current, [key]: status }));
  }, []);

  const updateLiveStatus = useCallback(
    async (player: AggregatedSessionPlayer, status: PaymentStatus) => {
      const rowKey = `live:${player.name}`;
      setStatusSaving(rowKey);
      setStatusError('');
      try {
        const response = await fetch(`/api/registered-players/${player.latestRegistrationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cashOut: player.cashOut, paymentStatus: status }),
        });
        if (!response.ok) {
          setStatusError('Não foi possível atualizar o status de pagamento.');
          return;
        }
        setLiveRows((current) =>
          current.map((row) =>
            row.name.trim().toLowerCase() === player.name.trim().toLowerCase()
              ? { ...row, paymentStatus: status }
              : row
          )
        );
        onPayoutComplete?.();
      } catch {
        setStatusError('Não foi possível atualizar o status de pagamento.');
      } finally {
        setStatusSaving(null);
      }
    },
    [onPayoutComplete]
  );

  const list = useMemo((): TableRow[] => {
    if (useLive) {
      return liveRows
        .map((p) => ({
          key: `live:${p.name}`,
          name: p.name,
          buyIn: p.buyIn,
          cashOut: p.cashOut,
          net: p.net,
          sessions: 1,
          paymentStatus: p.paymentStatus,
          phone: p.phone || contactByPlayerName[p.name.trim().toLowerCase()] || '',
          isLive: true,
          livePlayer: p,
        }))
        .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    }

    return players
      .map((p) => ({
        key: `global:${p.name}`,
        name: p.name,
        buyIn: p.buyIn,
        cashOut: p.cashOut,
        net: p.net,
        sessions: p.sessions,
        paymentStatus: statusByKey[`global:${p.name}`] ?? p.paymentStatus,
        phone: contactByPlayerName[p.name.trim().toLowerCase()] ?? '',
        isLive: false,
        avgRebuysPerSession: p.avgRebuysPerSession,
        profitableSessionRate: p.profitableSessionRate,
        avgNetPerSession: p.avgNetPerSession,
      }))
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  }, [useLive, liveRows, players, query, contactByPlayerName, statusByKey]);

  const handlePayoutConfirmed = (updated: AggregatedSessionPlayer) => {
    setLiveRows((current) =>
      current.map((row) => (row.name.trim().toLowerCase() === updated.name.trim().toLowerCase() ? updated : row))
    );
    onPayoutComplete?.();
  };

  const handleStatusChange = (row: TableRow, status: PaymentStatus) => {
    if (row.isLive && row.livePlayer) {
      void updateLiveStatus(row.livePlayer, status);
      return;
    }
    saveLocalStatus(row.key, status);
  };

  return (
    <>
      <div className='glass-card p-4'>
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-zinc-100'>Jogadores</h3>
            {enablePayout && useLive && (
              <p className='mt-0.5 text-xs text-zinc-500'>
                Use <span className='text-sky-400'>Fechar Payout</span> para calcular cash-out pelas fichas na mesa.
              </p>
            )}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Buscar jogador…'
            className='max-w-xs rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20'
          />
        </div>

        {statusError && <p className='mb-3 text-sm text-rose-300'>{statusError}</p>}

        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='text-xs uppercase tracking-wide text-zinc-500'>
              <tr>
                <th className='py-3 text-left font-medium'>Jogador</th>
                <th className='py-3 text-right font-medium'>Buy-in</th>
                <th className='py-3 text-right font-medium'>Cash-out</th>
                <th className='py-3 text-right font-medium'>Resultado</th>
                {!useLive && <th className='py-3 text-right font-medium'>Sessões</th>}
                {showPerformanceColumns && !useLive && (
                  <>
                    <th className='py-3 text-right font-medium'>Re-buys méd.</th>
                    <th className='py-3 text-right font-medium'>% lucrativas</th>
                    <th className='py-3 text-right font-medium'>Média/sessão</th>
                  </>
                )}
                <th className='py-3 text-right font-medium'>Ações</th>
              </tr>
            </thead>
            <tbody className='text-zinc-300'>
              {list.map((p) => {
                const due = p.net <= 0 ? Math.abs(p.net) : p.net;
                const chargeHref =
                  p.paymentStatus === 'a receber' && p.phone.trim()
                    ? buildWhatsAppChargeLink(p.phone, p.name, due)
                    : null;
                const receiptHref =
                  p.paymentStatus === 'quitado' && p.phone.trim()
                    ? buildWhatsAppSessionReceiptLink({
                        phone: p.phone,
                        playerName: p.name,
                        totalBuyIn: p.buyIn,
                        cashOut: p.cashOut,
                        net: p.net,
                        exitTime: nowHHMM(),
                      })
                    : null;
                const badges = gamificationBadges[p.name.trim().toLowerCase()] ?? [];

                return (
                  <tr key={p.key} className='border-t border-zinc-800/80 transition-colors hover:bg-white/[0.02]'>
                    <td className='py-2.5 font-medium text-zinc-100'>
                      <span className='inline-flex flex-wrap items-center'>
                        {p.name}
                        <PlayerGamificationBadges badges={badges} />
                      </span>
                    </td>
                    <td className='py-2.5 text-right tabular-nums text-zinc-400'>{currency(p.buyIn)}</td>
                    <td className='py-2.5 text-right tabular-nums text-zinc-300'>{currency(p.cashOut)}</td>
                    <td className='py-2.5 text-right'>
                      <span
                        className={`inline-block rounded-lg px-2.5 py-1 font-semibold tabular-nums ring-1 backdrop-blur-sm ${
                          p.net >= 0
                            ? 'text-emerald-400 bg-emerald-500/20 ring-emerald-400/40'
                            : 'text-rose-400 bg-rose-500/20 ring-rose-400/40'
                        }`}
                      >
                        {currency(p.net)}
                      </span>
                    </td>
                    {!useLive && (
                      <td className='py-2.5 text-right tabular-nums text-zinc-500'>{p.sessions}</td>
                    )}
                    {showPerformanceColumns && !useLive && (
                      <>
                        <td className='py-2.5 text-right tabular-nums text-zinc-400'>
                          {(p.avgRebuysPerSession ?? 0).toFixed(1)}
                        </td>
                        <td className='py-2.5 text-right tabular-nums text-zinc-400'>
                          {(p.profitableSessionRate ?? 0).toFixed(0)}%
                        </td>
                        <td className='py-2.5 text-right tabular-nums'>
                          <span
                            className={
                              (p.avgNetPerSession ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {currency(p.avgNetPerSession ?? 0)}
                          </span>
                        </td>
                      </>
                    )}
                    <td className='py-2.5'>
                      <div className='flex flex-wrap items-center justify-end gap-1.5'>
                        {enablePayout && p.livePlayer && (
                          <button
                            type='button'
                            onClick={() => setPayoutPlayer(p.livePlayer!)}
                            className='inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20'
                          >
                            <Wallet className='h-3.5 w-3.5' />
                            Fechar Payout
                          </button>
                        )}
                        <PaymentStatusMenu
                          value={p.paymentStatus}
                          onChange={(status) => handleStatusChange(p, status)}
                          align='right'
                          disabled={!p.isLive || statusSaving === p.key}
                        />
                        {p.paymentStatus === 'a receber' && chargeHref && (
                          <a
                            href={chargeHref}
                            target='_blank'
                            rel='noopener noreferrer'
                            title='Cobrança via WhatsApp'
                            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600/40 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20'
                          >
                            <WhatsAppGlyph className='h-4 w-4' />
                          </a>
                        )}
                        {p.paymentStatus === 'quitado' && receiptHref && (
                          <a
                            href={receiptHref}
                            target='_blank'
                            rel='noopener noreferrer'
                            title='Enviar comprovante da sessão'
                            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600/40 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20'
                          >
                            <WhatsAppGlyph className='h-4 w-4' />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className='py-6 text-center text-sm text-zinc-500'>Nenhum jogador encontrado.</p>
          )}
        </div>
      </div>

      {payoutPlayer && (
        <PayoutCloseModal
          player={payoutPlayer}
          open={Boolean(payoutPlayer)}
          onClose={() => setPayoutPlayer(null)}
          onConfirmed={(updated) => {
            handlePayoutConfirmed(updated);
            setPayoutPlayer(updated);
          }}
        />
      )}
    </>
  );
}
