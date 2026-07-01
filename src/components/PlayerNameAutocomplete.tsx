'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import { ClubPlayerProfile } from '@/lib/types';

export function PlayerNameAutocomplete({
  value,
  onChange,
  onSelectProfile,
  placeholder = 'Nome do jogador',
  required,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelectProfile: (profile: ClubPlayerProfile | { displayName: string; phone: string }) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ClubPlayerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/player-profiles');
        if (!response.ok) return;
        const data = (await response.json()) as ClubPlayerProfile[];
        if (!cancelled && Array.isArray(data)) {
          setProfiles(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return profiles.slice(0, 8);
    return profiles
      .filter(
        (profile) =>
          profile.displayName.toLowerCase().includes(q) ||
          profile.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      )
      .slice(0, 8);
  }, [profiles, value]);

  const pick = (profile: ClubPlayerProfile) => {
    onChange(profile.displayName);
    onSelectProfile(profile);
    setOpen(false);
  };

  return (
    <div className='relative' ref={containerRef}>
      <div className='relative'>
        <UserRound className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600' />
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete='off'
          className='w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-2 pl-9 pr-9 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20'
        />
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600 transition ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className='absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-700/90 bg-zinc-900/95 py-1 shadow-2xl shadow-black/50 backdrop-blur-md'>
          {suggestions.map((profile) => (
            <li key={profile.nameKey}>
              <button
                type='button'
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(profile)}
                className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-zinc-800/90'
              >
                <span className='font-medium text-zinc-100'>{profile.displayName}</span>
                {profile.phone ? (
                  <span className='shrink-0 text-xs tabular-nums text-zinc-500'>{profile.phone}</span>
                ) : (
                  <span className='text-xs text-zinc-600'>sem telefone</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && suggestions.length === 0 && value.trim() && (
        <div className='absolute z-50 mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-500'>
          Jogador novo — telefone será salvo no clube após o cadastro.
        </div>
      )}
    </div>
  );
}
