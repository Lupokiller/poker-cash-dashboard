import { currency } from '@/lib/data';
import { nowHHMM } from '@/lib/time';

function normalizeWhatsAppPhone(phoneRaw: string): string | null {
  const digits = phoneRaw.replace(/\D/g, '');
  if (digits.length < 10) {
    return null;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/** Constrói o link wa.me para cobrança; retorna null se o telefone não tiver dígitos suficientes. */
export function buildWhatsAppChargeLink(phoneRaw: string, playerName: string, amountDue: number): string | null {
  const n = normalizeWhatsAppPhone(phoneRaw);
  if (!n) return null;

  const msg = `Olá ${playerName}, tudo bem? Passando para alinhar o pagamento do home game. Valor em aberto: ${currency(amountDue)}. Obrigado!`;
  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(msg)}`;
}

export interface SessionReceiptParams {
  phone: string;
  playerName: string;
  totalBuyIn: number;
  cashOut: number;
  net: number;
  exitTime?: string;
}

/** Comprovante de sessão formatado para WhatsApp. */
export function buildWhatsAppSessionReceiptLink(params: SessionReceiptParams): string | null {
  const n = normalizeWhatsAppPhone(params.phone);
  if (!n) return null;

  const exitTime = params.exitTime ?? nowHHMM();
  const resultLine =
    params.net >= 0
      ? `+${currency(params.net)} (Lucro)`
      : `-${currency(Math.abs(params.net))} (Prejuízo)`;

  const msg = `♣️ *Lupos Poker Club - Resumo da Sessão* 🃏
------------------------------------
👤 *Jogador:* ${params.playerName}
💵 *Total de Buy-ins:* ${currency(params.totalBuyIn)}
💰 *Cash-out:* ${currency(params.cashOut)}
📈 *Resultado Líquido:* ${resultLine}
⏱️ *Horário de Saída:* ${exitTime}
------------------------------------
*Obrigado pelo jogo, nos vemos na próxima tela!* 🔥`;

  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(msg)}`;
}
