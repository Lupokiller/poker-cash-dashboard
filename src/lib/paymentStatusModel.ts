import { PaymentStatus } from './types';

/** Status automático após cash-out: lucro → a pagar, prejuízo → a receber, zero → quitado. */
export function paymentStatusFromNet(net: number): PaymentStatus {
  if (net > 0) return 'a pagar';
  if (net < 0) return 'a receber';
  return 'quitado';
}

export function netFromCashOut(cashOut: number, totalBuyIn: number): number {
  return cashOut - totalBuyIn;
}
