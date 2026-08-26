'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Plus, Shield, Trash2, UserCircle, Users } from 'lucide-react';
import type { AppUser } from '@/lib/usersStore';
import {
  APP_USER_ROLE_OPTIONS,
  AppUserRole,
  roleLabel,
} from '@/lib/userRoles';

function apiMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

function roleBadgeClass(user: AppUser): string {
  if (user.isBoss) return 'border-amber-400/50 bg-amber-500/15 text-amber-100';
  if (user.role === 'administrador') return 'border-violet-500/40 bg-violet-500/10 text-violet-200';
  if (user.role === 'gerente') return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  return 'border-zinc-600 bg-zinc-800/60 text-zinc-300';
}

export function UsersManagementTab() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    login: '',
    password: '',
    role: 'floor' as AppUserRole,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiMessageFromBody(body, 'Nao foi possivel carregar a equipe.'));
        setUsers([]);
        return;
      }
      if (!Array.isArray(body)) {
        setError('Resposta invalida do servidor.');
        setUsers([]);
        return;
      }
      setUsers(body as AppUser[]);
    } catch {
      setError('Nao foi possivel carregar a equipe.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.isBoss !== b.isBoss) return a.isBoss ? -1 : 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [users]
  );

  const submitInvite = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          login: form.login.trim(),
          password: form.password,
          role: form.role,
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiMessageFromBody(body, 'Nao foi possivel criar o usuario.'));
        return;
      }
      const created = body as AppUser;
      setUsers((current) => [...current, created]);
      setSuccess(`${created.name} foi adicionado à equipe.`);
      setForm({ name: '', login: '', password: '', role: 'floor' });
      setInviteOpen(false);
    } catch {
      setError('Nao foi possivel criar o usuario.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: AppUser) => {
    if (user.isBoss) return;
    const confirmed = window.confirm(
      `Excluir ${user.name}?\nLogin: ${user.login}\nEssa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiMessageFromBody(body, 'Nao foi possivel excluir o usuario.'));
        return;
      }
      setUsers((current) => current.filter((u) => u.id !== user.id));
      setSuccess(`${user.name} foi removido da equipe.`);
    } catch {
      setError('Nao foi possivel excluir o usuario.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className='space-y-4'>
      <div className='glass-card p-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h2 className='text-xl font-semibold tracking-tight text-zinc-100'>Gestão de equipe</h2>
            <p className='mt-1 max-w-2xl text-sm text-zinc-500'>
              Cargos: Administrador, Gerente e Floor. O Caio é o Chefe e não pode ser excluído.
            </p>
          </div>
          <button
            type='button'
            onClick={() => {
              setInviteOpen(true);
              setError('');
              setSuccess('');
            }}
            className='inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 transition hover:bg-violet-500'
          >
            <Plus className='h-4 w-4' />
            Convidar membro
          </button>
        </div>

        {error && <p className='mt-4 text-sm text-rose-300'>{error}</p>}
        {success && <p className='mt-4 text-sm text-emerald-400'>{success}</p>}

        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='text-xs uppercase tracking-wide text-zinc-500'>
              <tr>
                <th className='py-3 text-left font-medium'>Nome</th>
                <th className='py-3 text-left font-medium'>Login</th>
                <th className='py-3 text-left font-medium'>Cargo</th>
                <th className='py-3 text-left font-medium'>Status</th>
                <th className='py-3 text-right font-medium'>Ações</th>
              </tr>
            </thead>
            <tbody className='text-zinc-300'>
              {loading && (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-zinc-500'>
                    Carregando equipe...
                  </td>
                </tr>
              )}
              {!loading &&
                sortedUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.22 }}
                    className='border-t border-zinc-800/80'
                  >
                    <td className='py-2.5 font-medium text-zinc-100'>{user.name}</td>
                    <td className='py-2.5 text-zinc-400'>{user.login}</td>
                    <td className='py-2.5'>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(user)}`}
                      >
                        {user.isBoss ? (
                          <Crown className='h-3.5 w-3.5 text-amber-300' aria-hidden />
                        ) : user.role === 'administrador' ? (
                          <Shield className='h-3.5 w-3.5 text-violet-300' aria-hidden />
                        ) : user.role === 'gerente' ? (
                          <Users className='h-3.5 w-3.5 text-sky-300' aria-hidden />
                        ) : (
                          <UserCircle className='h-3.5 w-3.5 text-zinc-400' aria-hidden />
                        )}
                        {roleLabel(user.role, user.isBoss)}
                      </span>
                    </td>
                    <td className='py-2.5'>
                      <span className='inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300'>
                        Ativo
                      </span>
                    </td>
                    <td className='py-2.5 text-right'>
                      {user.isBoss ? (
                        <span className='text-xs text-zinc-600'>Protegido</span>
                      ) : (
                        <button
                          type='button'
                          disabled={deletingId === user.id}
                          onClick={() => void deleteUser(user)}
                          className='inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60'
                          aria-label={`Excluir ${user.name}`}
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                          {deletingId === user.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              {!loading && sortedUsers.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-zinc-500'>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inviteOpen && (
        <div
          className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
          role='dialog'
          aria-modal='true'
          aria-labelledby='invite-modal-title'
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className='glass-card w-full max-w-md border-zinc-700/90 p-5 shadow-2xl'
          >
            <h2 id='invite-modal-title' className='text-lg font-semibold text-zinc-100'>
              Convidar membro
            </h2>
            <p className='mt-1 text-sm text-zinc-500'>
              Escolha Administrador, Gerente ou Floor. O cargo de Chefe é exclusivo do Caio.
            </p>

            <form onSubmit={submitInvite} className='mt-4 space-y-3'>
              <div>
                <label className='text-xs font-medium text-zinc-500'>Nome</label>
                <input
                  required
                  value={form.name}
                  onChange={(ev) => setForm((f) => ({ ...f, name: ev.target.value }))}
                  className='mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-zinc-500'>Login</label>
                <input
                  required
                  type='text'
                  autoComplete='username'
                  value={form.login}
                  onChange={(ev) => setForm((f) => ({ ...f, login: ev.target.value }))}
                  className='mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-zinc-500'>Senha provisória</label>
                <input
                  required
                  type='password'
                  autoComplete='new-password'
                  minLength={4}
                  value={form.password}
                  onChange={(ev) => setForm((f) => ({ ...f, password: ev.target.value }))}
                  className='mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-zinc-500'>Cargo</label>
                <select
                  value={form.role}
                  onChange={(ev) =>
                    setForm((f) => ({ ...f, role: ev.target.value as AppUserRole }))
                  }
                  className='mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50'
                >
                  {APP_USER_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className='flex flex-wrap justify-end gap-2 pt-2'>
                <button
                  type='button'
                  disabled={saving}
                  onClick={() => setInviteOpen(false)}
                  className='rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800/80'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='rounded-xl border border-violet-500/40 bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60'
                >
                  {saving ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </section>
  );
}

