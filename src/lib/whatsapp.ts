import { currency } from '@/lib/data';

/** Constrói o link wa.me para cobrança; retorna null se o telefone não tiver dígitos suficientes. */
export function buildWhatsAppChargeLink(phoneRaw: string, playerName: string, amountDue: number): string | null {
  const digits = phoneRaw.replace(/\D/g, '');
  if (digits.length < 10) {
    return null;
  }

  let n = digits;
  if (n.length === 10 || n.length === 11) {
    n = `55${n}`;
  }

  const msg = `Olá ${playerName}, tudo bem? Passando para alinhar o pagamento do home game. Valor em aberto: ${currency(amountDue)}. Obrigado!`;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}
