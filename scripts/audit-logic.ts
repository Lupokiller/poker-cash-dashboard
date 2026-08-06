import { todayLocalISODate, currentLocalYearMonth } from '../src/lib/time';
import { paymentStatusFromNet } from '../src/lib/paymentStatusModel';
import { computeDashboardMetrics } from '../src/lib/dashboardModel';
import { unifyRegisteredPlayersForSession } from '../src/lib/buyInLogsModel';
import type { RegisteredPlayer, Session } from '../src/lib/types';

const today = todayLocalISODate();
const utc = new Date().toISOString().slice(0, 10);
console.log('dates', { today, utc, month: currentLocalYearMonth() });
console.log('status', {
  profit: paymentStatusFromNet(50),
  loss: paymentStatusFromNet(-30),
  even: paymentStatusFromNet(0),
});

const sessions: Session[] = [
  {
    id: '1',
    date: today,
    staffCost: 0,
    totalPix: 0,
    totalDinheiro: 0,
    totalFiado: 0,
    players: [
      { name: 'A', buyIn: 100, cashOut: 200, net: 100, paymentStatus: 'quitado' },
      { name: 'B', buyIn: 100, cashOut: 250, net: 150, paymentStatus: 'a pagar' },
      { name: 'C', buyIn: 100, cashOut: 50, net: -50, paymentStatus: 'a receber' },
    ],
    totals: { buyIn: 300, cashOut: 500, net: 200, playersCount: 3 },
  },
];

const metrics = computeDashboardMetrics(sessions);
const pendingOk = metrics.pending === 150;
console.log('pending', { got: metrics.pending, expected: 150, ok: pendingOk });

const players: RegisteredPlayer[] = [
  {
    id: '1',
    name: 'Joao',
    date: today,
    buyIn: 100,
    cashOut: 50,
    net: -50,
    paymentStatus: 'a receber',
    phone: '',
    notes: '',
    paymentMethod: 'pix',
    buyInLogs: [{ time: '20:00', amount: 100, paymentMethod: 'pix' }],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Joao',
    date: today,
    buyIn: 100,
    cashOut: 0,
    net: -100,
    paymentStatus: 'a receber',
    phone: '11999999999',
    notes: '',
    paymentMethod: 'dinheiro',
    buyInLogs: [{ time: '21:00', amount: 100, paymentMethod: 'dinheiro' }],
    createdAt: '2026-01-01T01:00:00Z',
  },
];

const unified = unifyRegisteredPlayersForSession(players, today);
const unifyOk =
  unified.length === 1 &&
  unified[0].buyIn === 200 &&
  unified[0].cashOut === 50 &&
  unified[0].buyInLogs.length === 2 &&
  unified[0].phone === '11999999999';

console.log('unified', {
  count: unified.length,
  buyIn: unified[0]?.buyIn,
  cashOut: unified[0]?.cashOut,
  logs: unified[0]?.buyInLogs.length,
  phone: unified[0]?.phone,
  ok: unifyOk,
});

if (!pendingOk || !unifyOk) {
  process.exitCode = 1;
}
