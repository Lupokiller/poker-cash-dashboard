'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  Trophy,
  Save,
  BarChart3,
  ClipboardList,
  StickyNote,
  Hash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerNetLine } from '@/components/Charts';
import { HistoricalPlayerBadges } from '@/components/HistoricalPlayerBadges';
import { PlayerDirectoryAvatar } from '@/components/PlayerDirectoryAvatar';
import { PlayerGamificationBadges } from '@/components/PlayerGamificationBadge';
import { PlayerStatusBadge } from '@/components/PlayerStatusBadge';
import { currency, prettyDate } from '@/lib/data';
import { formatSessionsPerMonth, PlayerDetail } from '@/lib/playerDirectoryModel';
import { ClubPlayerStatus, PLAYER_ORIGIN_OPTIONS, PlayerOrigin } from '@/lib/types';
import { formatBrazilPhoneInput } from '@/lib/phoneMask';

const TAG_SUGGESTIONS = ['agressivo', 'regular', 'plo', 'cash', 'vip-mesa', 'noite', 'tarde'];

const STATUS_OPTIONS: { value: ClubPlayerStatus; label: string; description: string }[] = [
  { value: 'ativo', label: 'Ativo', description: 'Participação normal no clube' },
  { value: 'vip', label: 'VIP', description: 'Jogador prioritário / especial' },
  { value: 'inativo', label: 'Inativo', description: 'Não convidar por enquanto' },
  { value: 'bloqueado', label: 'Bloqueado', description: 'Não deve jogar' },
];

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof BarChart3;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className='mb-3 flex items-start gap-2.5'>
      <div className='rounded-lg border border-zinc-800 bg-zinc-900/60 p-2'>
        <Icon className='h-4 w-4 text-emerald-400/80' />
      </div>
      <div>
        <h3 className='text-sm font-semibold text-zinc-100'>{title}</h3>
        {subtitle && <p className='text-xs text-zinc-500'>{subtitle}</p>}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-400'
      : tone === 'negative'
        ? 'text-rose-400'
        : 'text-zinc-100';

  return (
    <div className='rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-3.5'>
      <p className='text-[10px] font-semibold uppercase tracking-wider text-zinc-500'>{label}</p>
      <p className={`mt-1.5 text-lg font-semibold tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export function PlayerDetailPanel({
  nameKey,
  onClose,
  onUpdated,
}: {
  nameKey: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [clubStatus, setClubStatus] = useState<ClubPlayerStatus>('ativo');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [origin, setOrigin] = useState<PlayerOrigin>('');

  const isDirty = useMemo(() => {
    if (!detail) return false;
    const tagsChanged =
      tags.length !== detail.profile.tags.length ||
      tags.some((t, i) => t !== detail.profile.tags[i]);
    return (
      notes !== detail.profile.notes ||
      clubStatus !== detail.profile.clubStatus ||
      origin !== detail.profile.origin ||
      tagsChanged
    );
  }, [detail, notes, clubStatus, tags, origin]);

  useEffect(() => {
    if (!nameKey) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/players/${encodeURIComponent(nameKey)}`);
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body && typeof body === 'object' && 'message' in body
              ? String((body as { message: string }).message)
              : 'Nao foi possivel carregar a ficha.'
          );
        }
        if (!cancelled) {
          const data = body as PlayerDetail;
          setDetail(data);
          setNotes(data.profile.notes);
          setClubStatus(data.profile.clubStatus);
          setTags(data.profile.tags ?? []);
          setOrigin(data.profile.origin ?? '');
          setTagsInput('');
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Erro ao carregar ficha.');
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [nameKey]);

  const handleSave = async () => {
    if (!nameKey) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/players/${encodeURIComponent(nameKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, clubStatus, tags, origin }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message: string }).message)
            : 'Nao foi possivel salvar.'
        );
      }
      const data = body as PlayerDetail;
      setDetail(data);
      setTags(data.profile.tags ?? []);
      setOrigin(data.profile.origin ?? '');
      onUpdated?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {nameKey && (
        <>
          <motion.button
            type='button'
            aria-label='Fechar ficha'
            className='fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className='fixed inset-y-0 right-0 z-[100] flex w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl'
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          >
            {/* Header */}
            <div className='relative border-b border-zinc-800 bg-gradient-to-br from-emerald-500/[0.06] via-zinc-950 to-zinc-950 px-5 pb-5 pt-4'>
              <button
                type='button'
                onClick={onClose}
                className='absolute right-4 top-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 transition hover:text-zinc-100'
              >
                <X className='h-4 w-4' />
              </button>

              {loading ? (
                <div className='flex items-center gap-4 pr-12'>
                  <div className='h-14 w-14 animate-pulse rounded-full bg-zinc-800' />
                  <div className='space-y-2'>
                    <div className='h-5 w-40 animate-pulse rounded bg-zinc-800' />
                    <div className='h-3 w-24 animate-pulse rounded bg-zinc-800/70' />
                  </div>
                </div>
              ) : detail ? (
                <div className='flex gap-4 pr-12'>
                  <PlayerDirectoryAvatar
                    name={detail.profile.displayName}
                    status={detail.displayStatus}
                    size='lg'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/70'>
                      Ficha do jogador
                    </p>
                    <h2 className='mt-0.5 truncate text-xl font-semibold tracking-tight text-zinc-50'>
                      {detail.profile.displayName}
                    </h2>
                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                      <PlayerStatusBadge status={detail.displayStatus} />
                      <HistoricalPlayerBadges badges={detail.historicalBadges} />
                    </div>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      {detail.profile.phone && (
                        <span className='inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-400'>
                          <Phone className='h-3 w-3 shrink-0' />
                          {formatBrazilPhoneInput(detail.profile.phone.replace(/\D/g, ''))}
                        </span>
                      )}
                      {detail.lastPlayedDate && (
                        <span className='inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-400'>
                          <Calendar className='h-3 w-3 shrink-0' />
                          Última: {prettyDate(detail.lastPlayedDate)}
                        </span>
                      )}
                      {detail.rankingRank != null && (
                        <span className='inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200/90'>
                          <Trophy className='h-3 w-3 shrink-0' />
                          #{detail.rankingRank} · {detail.rankingPoints} pts
                        </span>
                      )}
                      {detail.profile.firstSeenAt && (
                        <span className='inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-500'>
                          <Hash className='h-3 w-3 shrink-0' />
                          Desde {prettyDate(detail.profile.firstSeenAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className='pr-12 text-sm text-rose-300'>{error || 'Jogador nao encontrado.'}</p>
              )}
            </div>

            {detail && !loading && (
              <div className='flex min-h-0 flex-1 flex-col'>
                <div className='flex-1 space-y-6 overflow-y-auto px-5 py-5'>
                  {/* Stats */}
                  <section>
                    <SectionTitle icon={BarChart3} title='Desempenho' subtitle='Totais em sessões finalizadas' />
                    <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3'>
                      <StatCard label='Sessões' value={String(detail.sessionsPlayed)} />
                      <StatCard
                        label='Frequência'
                        value={
                          detail.sessionsPlayed > 0
                            ? formatSessionsPerMonth(detail.sessionsPerMonth)
                            : '—'
                        }
                      />
                      <StatCard
                        label='Últimos 30 dias'
                        value={
                          detail.sessionsPlayed > 0
                            ? `${detail.sessionsLast30Days} ${detail.sessionsLast30Days === 1 ? 'sessão' : 'sessões'}`
                            : '—'
                        }
                      />
                      <StatCard label='LTV clube' value={currency(detail.totalRakeGenerated)} />
                      <StatCard label='Buy-in total' value={currency(detail.totalBuyIn)} />
                      <StatCard
                        label='Resultado'
                        value={currency(detail.totalNet)}
                        tone={detail.totalNet >= 0 ? 'positive' : 'negative'}
                      />
                      <StatCard
                        label='Média / sessão'
                        value={currency(detail.avgNetPerSession)}
                        tone={detail.avgNetPerSession >= 0 ? 'positive' : 'negative'}
                      />
                      <StatCard
                        label='% lucrativas'
                        value={`${detail.profitableSessionRate.toFixed(0)}%`}
                        tone='neutral'
                      />
                      <StatCard
                        label='Buy-in médio'
                        value={detail.sessionsPlayed > 0 ? currency(detail.avgBuyIn) : '—'}
                      />
                    </div>
                  </section>

                  {/* Chart */}
                  <section className='rounded-xl border border-zinc-800/90 bg-zinc-900/30 p-4'>
                    <SectionTitle
                      icon={BarChart3}
                      title='Evolução do resultado'
                      subtitle='Acumulado sessão a sessão'
                    />
                    <PlayerNetLine data={detail.netChartData} />
                  </section>

                  {/* Notes */}
                  <section className='rounded-xl border border-zinc-800/90 bg-zinc-900/30 p-4'>
                    <SectionTitle
                      icon={StickyNote}
                      title='Gestão do jogador'
                      subtitle='Status manual e anotações internas'
                    />
                    <div className='space-y-3'>
                      <label className='block'>
                        <span className='mb-1.5 block text-xs font-medium text-zinc-400'>Status no clube</span>
                        <select
                          value={clubStatus}
                          onChange={(e) => setClubStatus(e.target.value as ClubPlayerStatus)}
                          className='w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20'
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label} — {opt.description}
                            </option>
                          ))}
                        </select>
                        <p className='mt-1.5 text-[11px] text-zinc-600'>
                          O status &quot;Sumido&quot; é automático após 30 dias sem jogar (quando o status manual é Ativo).
                        </p>
                      </label>

                      <label className='block'>
                        <span className='mb-1.5 block text-xs font-medium text-zinc-400'>Origem</span>
                        <select
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value as PlayerOrigin)}
                          className='w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20'
                        >
                          {PLAYER_ORIGIN_OPTIONS.map((opt) => (
                            <option key={opt.value || 'none'} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div>
                        <span className='mb-1.5 block text-xs font-medium text-zinc-400'>Tags</span>
                        <div className='mb-2 flex flex-wrap gap-1.5'>
                          {tags.map((tag) => (
                            <button
                              key={tag}
                              type='button'
                              onClick={() => setTags((current) => current.filter((t) => t !== tag))}
                              className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200'
                              title='Remover tag'
                            >
                              {tag} ×
                            </button>
                          ))}
                          {tags.length === 0 && (
                            <span className='text-[11px] text-zinc-600'>Nenhuma tag ainda</span>
                          )}
                        </div>
                        <div className='flex gap-2'>
                          <input
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              const next = tagsInput.trim().toLowerCase();
                              if (!next || tags.includes(next)) return;
                              setTags((current) => [...current, next].slice(0, 12));
                              setTagsInput('');
                            }}
                            placeholder='Digite e Enter'
                            className='flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/40'
                          />
                        </div>
                        <div className='mt-2 flex flex-wrap gap-1'>
                          {TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).map((tag) => (
                            <button
                              key={tag}
                              type='button'
                              onClick={() => setTags((current) => [...current, tag].slice(0, 12))}
                              className='rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300'
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className='block'>
                        <span className='mb-1.5 block text-xs font-medium text-zinc-400'>Notas internas</span>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                          placeholder='Preferências de mesa, horários, observações de comportamento...'
                          className='w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20'
                        />
                      </label>
                    </div>
                  </section>

                  {/* History */}
                  <section>
                    <SectionTitle
                      icon={ClipboardList}
                      title='Histórico de sessões'
                      subtitle={`${detail.sessionHistory.length} sessão(ões) registrada(s)`}
                    />
                    <div className='overflow-hidden rounded-xl border border-zinc-800/90'>
                      <div className='overflow-x-auto'>
                        <table className='min-w-full text-xs'>
                          <thead>
                            <tr className='border-b border-zinc-800 bg-zinc-900/70 text-[10px] uppercase tracking-wider text-zinc-500'>
                              <th className='px-3 py-2.5 text-left font-medium'>Data</th>
                              <th className='px-3 py-2.5 text-right font-medium'>Buy-in</th>
                              <th className='px-3 py-2.5 text-right font-medium'>Cash-out</th>
                              <th className='px-3 py-2.5 text-right font-medium'>Net</th>
                              <th className='px-3 py-2.5 text-left font-medium'>Noite</th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-zinc-800/60 text-zinc-300'>
                            {[...detail.sessionHistory].reverse().map((row) => (
                              <tr key={`${row.sessionId}-${row.date}`} className='hover:bg-white/[0.02]'>
                                <td className='whitespace-nowrap px-3 py-2.5 font-medium text-zinc-200'>
                                  {prettyDate(row.date)}
                                </td>
                                <td className='px-3 py-2.5 text-right tabular-nums'>{currency(row.buyIn)}</td>
                                <td className='px-3 py-2.5 text-right tabular-nums'>{currency(row.cashOut)}</td>
                                <td className='px-3 py-2.5 text-right'>
                                  <span
                                    className={`inline-block rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${
                                      row.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {currency(row.net)}
                                  </span>
                                </td>
                                <td className='px-3 py-2.5'>
                                  <PlayerGamificationBadges badges={row.sessionBadges} />
                                </td>
                              </tr>
                            ))}
                            {detail.sessionHistory.length === 0 && (
                              <tr>
                                <td colSpan={5} className='px-3 py-10 text-center text-zinc-500'>
                                  Nenhuma sessão finalizada ainda.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Sticky save bar */}
                <AnimatePresence>
                  {isDirty && (
                    <motion.div
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                      className='border-t border-zinc-800 bg-zinc-950/95 px-5 py-3 backdrop-blur-md'
                    >
                      {error && <p className='mb-2 text-xs text-rose-300'>{error}</p>}
                      <div className='flex items-center justify-between gap-3'>
                        <p className='text-xs text-zinc-500'>Alterações não salvas</p>
                        <button
                          type='button'
                          disabled={saving}
                          onClick={() => void handleSave()}
                          className='inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-500 disabled:opacity-60'
                        >
                          <Save className='h-4 w-4' />
                          {saving ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
