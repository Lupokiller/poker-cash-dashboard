/** Login fixo do dono do sistema — nao pode ser excluido. */
export const BOSS_LOGIN = 'caio lupo';

export type AppUserRole = 'administrador' | 'gerente' | 'floor';

export function normalizeLogin(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isBossLogin(login: string): boolean {
  return normalizeLogin(login) === BOSS_LOGIN;
}

/** Cargos convidáveis (o Chefe não é um cargo selecionável). */
export const APP_USER_ROLE_OPTIONS: { value: AppUserRole; label: string; description: string }[] = [
  { value: 'administrador', label: 'Administrador', description: 'Gestão completa, inclusive usuários' },
  { value: 'gerente', label: 'Gerente', description: 'Mesa, staff e operação' },
  { value: 'floor', label: 'Floor', description: 'Cadastro e operação do dia a dia' },
];

export function roleLabel(role: AppUserRole, isBoss = false): string {
  if (isBoss) return 'Chefe';
  const found = APP_USER_ROLE_OPTIONS.find((o) => o.value === role);
  return found?.label ?? role;
}

export function parseAppUserRole(value: unknown): AppUserRole | null {
  if (value === 'administrador' || value === 'gerente' || value === 'floor') return value;
  // legado
  if (value === 'admin') return 'administrador';
  if (value === 'user') return 'floor';
  return null;
}

export function canManageUsers(role: AppUserRole, login?: string): boolean {
  if (login && isBossLogin(login)) return true;
  return role === 'administrador';
}

export function canControlTable(role: AppUserRole, login?: string): boolean {
  if (login && isBossLogin(login)) return true;
  return role === 'administrador' || role === 'gerente';
}

export function canEditStaffCost(role: AppUserRole, login?: string): boolean {
  return canControlTable(role, login);
}
