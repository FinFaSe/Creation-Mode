const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeCardData, marketType } = require('../card-model');
const markets = require('../markets');

const base = {
  sport: 'Fútbol', home: 'CD Tecnico Universitario', away: 'Manta FC',
  market: 'Ambos equipos anotan', selection: 'Sí', line: '2.5',
  player: 'Victor Wembanyama', stat: 'Puntos', odds: '2.02', time: 'Hoy 15:30'
};

test('football reference has no total line on the yes/no selection', () => {
  assert.deepEqual(makeCardData(base), {
    sport: 'Fútbol', home: 'CD Tecnico Universitario', away: 'Manta FC',
    selection: 'Sí', market: 'Ambos equipos anotan', odds: '2.02', time: 'Hoy 15:30', result: 'pending', score: ''
  });
});

test('basketball reference places the player in brackets in the market only', () => {
  const card = makeCardData({ ...base, sport: 'Básquet', home: 'Phoenix Suns', away: 'San Antonio Spurs',
    market: 'Jugador · Más/Menos', selection: 'Más de', line: '28.5', odds: '1.83', time: 'Esta noche 21:00' });
  assert.equal(card.selection, 'Más de 28.5');
  assert.equal(card.market, 'Total de Puntos [Victor Wembanyama]');
  assert.equal(card.odds, '1.83');
});

test('winning reference keeps the odds, a manual result and the final score', () => {
  const card = makeCardData({ ...base, home: 'RB Leipzig', away: 'FC Augsburg', market: 'Remates totales',
    selection: 'Menos de', line: '33.5', odds: '1.72', result: 'won', homeScore: '5', awayScore: '2' });
  assert.equal(card.selection, 'Menos de 33.5');
  assert.equal(card.market, 'Remates totales');
  assert.equal(card.result, 'won');
  assert.equal(card.odds, '1.72');
  assert.equal(card.score, '5-2');
});

test('scores accept zero and reject invalid inputs without inventing a result', () => {
  assert.equal(makeCardData({ ...base, result: 'won', homeScore: '0', awayScore: '02' }).score, '0-2');
  for (const homeScore of ['', '-1', '1.5', '1000', 'NaN']) {
    assert.equal(makeCardData({ ...base, result: 'won', homeScore, awayScore: '2' }).score, '—-2');
  }
  assert.equal(makeCardData({ ...base, homeScore: '5', awayScore: '2' }).result, 'pending');
});

test('handicap preserves the selected team after a rename and formats the sign', () => {
  for (const [line, expected] of [['1.5', '+1.5'], ['-1.5', '-1.5'], ['0', '0']]) {
    const card = makeCardData({ ...base, away: 'Nuevo visitante', market: 'Hándicap', selection: 'away', line });
    assert.equal(card.selection, `Nuevo visitante ${expected}`);
  }
});

test('invalid or empty decimal odds and lines do not become valid-looking values', () => {
  for (const odds of ['', '0', '1', 'NaN', '10000']) assert.equal(makeCardData({ ...base, odds }).odds, '—');
  assert.equal(makeCardData({ ...base, odds: '2' }).odds, '2.00');
  assert.equal(makeCardData({ ...base, market: 'Total de puntos', selection: 'Menos de', line: '' }).selection, 'Menos de —');
});

test('all 18 requested markets produce selections appropriate to their type', () => {
  let count = 0;
  for (const [sport, names] of Object.entries(markets)) {
    for (const market of names) {
      const type = marketType(market);
      const selection = type === 'yes-no' ? 'No' : ['winner', 'handicap'].includes(type) ? 'away' : 'Menos de';
      const card = makeCardData({ ...base, sport, market, selection });
      assert.ok(card.market);
      assert.equal(card.selection, type === 'yes-no' ? 'No' : type === 'winner' ? 'Manta FC'
        : type === 'handicap' ? 'Manta FC +2.5' : 'Menos de 2.5');
      count++;
    }
  }
  assert.equal(count, 18);
});
