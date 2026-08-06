const CLUB_TIME_ZONE = 'America/Sao_Paulo';

/** Horário atual local no formato HH:MM. */
export function nowHHMM(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Data de hoje no fuso do clube (YYYY-MM-DD). Evita virar o dia às 21h com UTC. */
export function todayLocalISODate(timeZone = CLUB_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Ano-mês atual no fuso do clube (YYYY-MM). */
export function currentLocalYearMonth(timeZone = CLUB_TIME_ZONE): string {
  return todayLocalISODate(timeZone).slice(0, 7);
}
