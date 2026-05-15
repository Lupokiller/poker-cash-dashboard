'use client';

export function LogoutButton() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <button
      type='button'
      onClick={handleLogout}
      className='rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-700'
    >
      Sair
    </button>
  );
}
