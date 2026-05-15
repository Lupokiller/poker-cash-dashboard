'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(body?.message ?? 'Nao foi possivel entrar.');
        return;
      }

      const from = searchParams.get('from');
      window.location.href = from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
    } catch {
      setError('Nao foi possivel entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='glass-card w-full max-w-sm p-6'>
      <h1 className='mb-1 text-2xl font-semibold'>Poker Cash Dashboard</h1>
      <p className='mb-6 text-sm text-slate-400'>Entre com seu login e senha para acessar o painel.</p>

      {error && <p className='mb-4 text-sm text-rose-300'>{error}</p>}

      <form onSubmit={handleSubmit} className='space-y-3'>
        <input
          type='text'
          name='username'
          autoComplete='username'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
            placeholder='Login (ex: Caio Lupo)'
          className='w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
          required
        />
        <input
          type='password'
          name='password'
          autoComplete='current-password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='Senha'
          className='w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-sky-400'
          required
        />
        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-xl bg-sky-500 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60'
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className='flex min-h-screen items-center justify-center p-4'>
      <Suspense
        fallback={
          <LoginFallback>
            <p className='text-sm text-slate-400'>Carregando...</p>
          </LoginFallback>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}

function LoginFallback({ children }: { children: React.ReactNode }) {
  return <div className='glass-card w-full max-w-sm p-6'>{children}</div>;
}
