// import-historico.js
// Rode na raiz do projeto: node import-historico.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const sessoes = [
  { data: '2026-03-03', jogadores: [
    { nome: 'Caio Lupo', buy_in: 100, cash_out: 1100 },
    { nome: 'Caio Vale', buy_in: 450, cash_out: 0 },
    { nome: 'Kaua', buy_in: 700, cash_out: 525 },
    { nome: 'Kaua Jogador', buy_in: 700, cash_out: 0 },
    { nome: 'Marquinhos', buy_in: 200, cash_out: 0 },
    { nome: 'Matheus Lacerda', buy_in: 200, cash_out: 0 },
    { nome: 'Menor', buy_in: 900, cash_out: 1425 },
    { nome: 'Pedrinho', buy_in: 350, cash_out: 0 },
    { nome: 'Pivas', buy_in: 600, cash_out: 750 },
    { nome: 'Tota', buy_in: 2150, cash_out: 0 },
    { nome: 'Vicente', buy_in: 300, cash_out: 1260 },
    { nome: 'Vitor Math', buy_in: 200, cash_out: 0 },
  ]},
  { data: '2026-03-10', jogadores: [
    { nome: 'Caio Lupo', buy_in: 800, cash_out: 725 },
    { nome: 'Caio Vale', buy_in: 300, cash_out: 880 },
    { nome: 'Felipe Jogador', buy_in: 700, cash_out: 0 },
    { nome: 'Kaua', buy_in: 200, cash_out: 0 },
    { nome: 'Kaua Jogador', buy_in: 200, cash_out: 0 },
    { nome: 'Menor', buy_in: 300, cash_out: 550 },
    { nome: 'Pivas', buy_in: 600, cash_out: 0 },
    { nome: 'Tota', buy_in: 2200, cash_out: 0 },
    { nome: 'Vicente', buy_in: 700, cash_out: 270 },
  ]},
  { data: '2026-03-17', jogadores: [
    { nome: 'Kaua', buy_in: 900, cash_out: 0 },
    { nome: 'Kaua Jogador', buy_in: 300, cash_out: 0 },
    { nome: 'Luque', buy_in: 400, cash_out: 1900 },
    { nome: 'Menor', buy_in: 800, cash_out: 0 },
    { nome: 'Pedrinho', buy_in: 250, cash_out: 0 },
    { nome: 'Ph', buy_in: 400, cash_out: 0 },
    { nome: 'Pivas', buy_in: 400, cash_out: 1400 },
    { nome: 'Tota', buy_in: 700, cash_out: 0 },
  ]},
  { data: '2026-03-24', jogadores: [
    { nome: 'Caio Lupo', buy_in: 100, cash_out: 170 },
    { nome: 'Gustavo', buy_in: 300, cash_out: 0 },
    { nome: 'Jhonathan', buy_in: 300, cash_out: 0 },
    { nome: 'Jonis', buy_in: 100, cash_out: 240 },
    { nome: 'Kaua', buy_in: 800, cash_out: 1100 },
    { nome: 'Kaua Jogador', buy_in: 700, cash_out: 1000 },
    { nome: 'Marcell', buy_in: 1500, cash_out: 925 },
    { nome: 'Menor', buy_in: 900, cash_out: 2150 },
    { nome: 'Pivas', buy_in: 600, cash_out: 1100 },
    { nome: 'Tota', buy_in: 1200, cash_out: 0 },
    { nome: 'Vicente', buy_in: 100, cash_out: 300 },
    { nome: 'Vinicius', buy_in: 3850, cash_out: 0 },
    { nome: 'Vitor', buy_in: 700, cash_out: 1070 },
  ]},
  { data: '2026-03-31', jogadores: [
    { nome: 'Caio Vale', buy_in: 1000, cash_out: 600 },
    { nome: 'Danone', buy_in: 500, cash_out: 0 },
    { nome: 'Felipe Jogador', buy_in: 1400, cash_out: 200 },
    { nome: 'Jonis', buy_in: 100, cash_out: 145 },
    { nome: 'Kaua', buy_in: 1000, cash_out: 0 },
    { nome: 'Kaua Jogador', buy_in: 1100, cash_out: 1400 },
    { nome: 'Menor', buy_in: 600, cash_out: 0 },
    { nome: 'Miguel', buy_in: 250, cash_out: 730 },
    { nome: 'Pivas', buy_in: 1200, cash_out: 0 },
    { nome: 'Rafael', buy_in: 500, cash_out: 0 },
    { nome: 'Tota', buy_in: 1500, cash_out: 1300 },
    { nome: 'Vicente', buy_in: 300, cash_out: 975 },
  ]},
  { data: '2026-04-08', jogadores: [
    { nome: 'Balde', buy_in: 200, cash_out: 0 },
    { nome: 'Caio Lupo', buy_in: 300, cash_out: 300 },
    { nome: 'Caio Vale', buy_in: 1600, cash_out: 0 },
    { nome: 'Danone', buy_in: 100, cash_out: 1900 },
    { nome: 'Kaua', buy_in: 500, cash_out: 0 },
    { nome: 'Kaua Jogador', buy_in: 900, cash_out: 0 },
    { nome: 'Menor', buy_in: 700, cash_out: 0 },
    { nome: 'Pepeu', buy_in: 500, cash_out: 0 },
    { nome: 'Pitoco', buy_in: 400, cash_out: 0 },
    { nome: 'Pivas', buy_in: 600, cash_out: 0 },
    { nome: 'Tota', buy_in: 900, cash_out: 1130 },
    { nome: 'Vicente', buy_in: 300, cash_out: 400 },
  ]},
  { data: '2026-04-14', jogadores: [
    { nome: 'Caio Vale', buy_in: 400, cash_out: 1050 },
    { nome: 'Danone', buy_in: 1000, cash_out: 0 },
    { nome: 'Felipe Jogador', buy_in: 1300, cash_out: 0 },
    { nome: 'Greg', buy_in: 300, cash_out: 1035 },
    { nome: 'Kaua', buy_in: 2000, cash_out: 1700 },
    { nome: 'Kaua Jogador', buy_in: 300, cash_out: 0 },
    { nome: 'Menor', buy_in: 500, cash_out: 0 },
    { nome: 'Miguel', buy_in: 600, cash_out: 0 },
    { nome: 'Pitoco', buy_in: 500, cash_out: 0 },
    { nome: 'Pivas', buy_in: 400, cash_out: 0 },
    { nome: 'Tota', buy_in: 1700, cash_out: 170 },
    { nome: 'Vicente', buy_in: 1000, cash_out: 0 },
  ]},
  { data: '2026-04-29', jogadores: [
    { nome: 'Caio Lupo', buy_in: 200, cash_out: 0 },
    { nome: 'Caio Vale', buy_in: 600, cash_out: 250 },
    { nome: 'Felipe Jogador', buy_in: 1000, cash_out: 650 },
    { nome: 'Kaua', buy_in: 900, cash_out: 675 },
    { nome: 'Kaua Jogador', buy_in: 500, cash_out: 0 },
    { nome: 'Lads', buy_in: 200, cash_out: 0 },
    { nome: 'Mauricio', buy_in: 300, cash_out: 750 },
    { nome: 'Menor', buy_in: 600, cash_out: 0 },
    { nome: 'Pivas', buy_in: 300, cash_out: 0 },
    { nome: 'Tomaz', buy_in: 400, cash_out: 1380 },
    { nome: 'Tota', buy_in: 1200, cash_out: 0 },
    { nome: 'Vicente', buy_in: 600, cash_out: 150 },
  ]},
  { data: '2026-05-05', jogadores: [
    { nome: 'Balde', buy_in: 100, cash_out: 175 },
    { nome: 'Caio Lupo', buy_in: 200, cash_out: 225 },
    { nome: 'Caio Vale', buy_in: 750, cash_out: 0 },
    { nome: 'Caue', buy_in: 200, cash_out: 0 },
    { nome: 'Danilo danex', buy_in: 450, cash_out: 870 },
    { nome: 'Felipe Jogador', buy_in: 100, cash_out: 0 },
    { nome: 'Gordinho', buy_in: 200, cash_out: 0 },
    { nome: 'Julia Padilha', buy_in: 450, cash_out: 0 },
    { nome: 'Kaua Jogador', buy_in: 100, cash_out: 150 },
    { nome: 'Lavinia', buy_in: 250, cash_out: 0 },
    { nome: 'Matheus Buhrer', buy_in: 300, cash_out: 450 },
    { nome: 'Matheus Lacerda', buy_in: 150, cash_out: 0 },
    { nome: 'Menor', buy_in: 300, cash_out: 675 },
    { nome: 'Pivas', buy_in: 200, cash_out: 0 },
    { nome: 'Tota', buy_in: 400, cash_out: 0 },
  ]},
  { data: '2026-05-13', jogadores: [
    { nome: 'Vicente', buy_in: 100, cash_out: 400 },
    { nome: 'Pitoco', buy_in: 500, cash_out: 800 },
    { nome: 'Danone', buy_in: 100, cash_out: 1000 },
    { nome: 'Pivas', buy_in: 300, cash_out: 0 },
    { nome: 'Pedra Scandalo', buy_in: 500, cash_out: 0 },
    { nome: 'Caio Lupo', buy_in: 300, cash_out: 250 },
    { nome: 'Matheus Buhrer', buy_in: 500, cash_out: 0 },
    { nome: 'Ito', buy_in: 200, cash_out: 0 },
    { nome: 'Caio Vale', buy_in: 1000, cash_out: 680 },
    { nome: 'Tomaz', buy_in: 600, cash_out: 450 },
    { nome: 'Tota', buy_in: 950, cash_out: 0 },
    { nome: 'Mauricio', buy_in: 500, cash_out: 0 },
  ]},
];

async function importar() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let sessoesImportadas = 0;
    let jogadoresImportados = 0;

    for (const sessao of sessoes) {
      const resSessao = await client.query(
        'INSERT INTO poker_sessions (session_date) VALUES ($1) RETURNING id',
        [sessao.data]
      );
      const sessionId = resSessao.rows[0].id;
      sessoesImportadas++;

      for (const j of sessao.jogadores) {
        const net = j.cash_out - j.buy_in;
        const status = net >= 0 ? 'a receber' : 'a pagar';

        await client.query(
          'INSERT INTO registered_players (name, date, buy_in, cash_out, payment_status) VALUES ($1, $2, $3, $4, $5)',
          [j.nome, sessao.data, j.buy_in, j.cash_out, status]
        );

        await client.query(
          'INSERT INTO poker_session_players (session_id, name, buy_in, cash_out, net, payment_status) VALUES ($1, $2, $3, $4, $5, $6)',
          [sessionId, j.nome, j.buy_in, j.cash_out, net, status]
        );

        jogadoresImportados++;
      }

      console.log('Sessao ' + sessao.data + ' — ' + sessao.jogadores.length + ' jogadores');
    }

    await client.query('COMMIT');
    console.log('\nImportacao concluida!');
    console.log('   ' + sessoesImportadas + ' sessoes');
    console.log('   ' + jogadoresImportados + ' registros de jogadores');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro na importacao:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importar();
