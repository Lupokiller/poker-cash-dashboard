/**
 * Integration smoke test against live DB (uses a disposable player name).
 * Run: npx tsx scripts/smoke-registration-flow.ts
 */
import 'dotenv/config';
import { closeDbPool } from '../src/lib/db';
import {
  deleteRegisteredPlayerById,
  finalizePlayerPayout,
  registerOrAddBuyIn,
  updateRegisteredPlayerCashAndStatus,
  readRegisteredPlayers,
} from '../src/lib/registeredPlayersStore';
import { todayLocalISODate } from '../src/lib/time';

const TEST_NAME = `__audit_bot_${Date.now()}`;
const date = todayLocalISODate();

async function main() {
  console.log('Using session date', date, 'player', TEST_NAME);

  const first = await registerOrAddBuyIn({
    name: TEST_NAME,
    date,
    buyIn: 100,
    paymentMethod: 'pix',
  });
  assert(first.buyIn === 100, `buyIn after first entry expected 100 got ${first.buyIn}`);
  assert(first.paymentStatus === 'a receber', 'status after entry should be a receber');

  let rejected = false;
  try {
    await registerOrAddBuyIn({ name: TEST_NAME, date, buyIn: 0, paymentMethod: 'pix' });
  } catch {
    rejected = true;
  }
  assert(rejected, 'zero buy-in should be rejected');

  const cashed = await updateRegisteredPlayerCashAndStatus(first.id, 180, 'quitado');
  assert(cashed?.cashOut === 180, 'cash-out should be 180');
  assert(cashed?.paymentStatus === 'quitado', 'should be quitado');

  const rebuy = await registerOrAddBuyIn({
    name: TEST_NAME,
    date,
    buyIn: 50,
    paymentMethod: 'dinheiro',
  });
  assert(rebuy.buyIn === 150, `buyIn after rebuy expected 150 got ${rebuy.buyIn}`);
  assert(rebuy.cashOut === 0, `cashOut after rebuy expected 0 got ${rebuy.cashOut}`);
  assert(
    rebuy.paymentStatus === 'a receber',
    `status after rebuy expected a receber got ${rebuy.paymentStatus}`
  );
  assert(rebuy.buyInLogs.length === 2, `expected 2 entradas got ${rebuy.buyInLogs.length}`);

  const paid = await finalizePlayerPayout(TEST_NAME, date, 140);
  assert(paid?.cashOut === 140, 'payout cashOut');
  assert(paid?.paymentStatus === 'quitado', 'payout quitado');
  assert(paid?.buyIn === 150, 'payout keeps buyIn');

  const all = await readRegisteredPlayers();
  const same = all.filter(
    (p) => p.date === date && p.name.trim().toLowerCase() === TEST_NAME.toLowerCase()
  );
  assert(same.length === 1, `expected 1 row got ${same.length}`);

  const removed = await deleteRegisteredPlayerById(same[0].id);
  assert(removed, 'delete should succeed');
  const after = await readRegisteredPlayers();
  const leftover = after.filter(
    (p) => p.date === date && p.name.trim().toLowerCase() === TEST_NAME.toLowerCase()
  );
  assert(leftover.length === 0, 'no leftover rows after delete');

  console.log('SMOKE OK');
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

main()
  .catch((error) => {
    console.error('SMOKE FAIL', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDbPool().finally(() => {
      process.exit(process.exitCode ?? 0);
    });
    // Safety: pool.end() can hang on idle pooler sockets.
    setTimeout(() => process.exit(process.exitCode ?? 0), 2000).unref();
  });
