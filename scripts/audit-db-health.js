require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const dupes = await c.query(`
    SELECT date::text AS date, LOWER(TRIM(name)) AS k, COUNT(*)::int AS n
    FROM registered_players
    GROUP BY 1, 2
    HAVING COUNT(*) > 1
  `);

  const idx = await c.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'registered_players'
      AND indexname = 'registered_players_date_name_uidx'
  `);

  const counts = await c.query(`
    SELECT
      (SELECT COUNT(*)::int FROM registered_players) AS registered_players,
      (SELECT COUNT(*)::int FROM poker_sessions) AS sessions,
      (SELECT COUNT(*)::int FROM player_profiles) AS profiles,
      (SELECT COUNT(*)::int FROM poker_session_players WHERE payment_status = 'a pagar' AND net > 0) AS a_pagar_positive,
      (SELECT COUNT(*)::int FROM poker_session_players WHERE net > 0) AS net_positive
  `);

  console.log(
    JSON.stringify(
      {
        duplicates: dupes.rows,
        uniqueIndex: idx.rows.length > 0,
        ...counts.rows[0],
      },
      null,
      2
    )
  );

  await c.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
