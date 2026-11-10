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

test('first-half basketball references match the supplied point and handicap cards', () => {
  const values = { ...base, sport: 'Básquet', home: 'Phoenix Suns', away: 'San Antonio Spurs', time: 'Esta noche 21:00' };
  const total = makeCardData({ ...values, market: 'Primer Tiempo - Total de Puntos', selection: 'Más de', line: '117.5', odds: '1.87' });
  assert.equal(total.market, 'Primer Tiempo - Total de Puntos');
  assert.equal(total.selection, 'Más de 117.5');
  assert.equal(total.odds, '1.87');
  const handicap = makeCardData({ ...values, market: 'Primer Tiempo - Hándicap', selection: 'home', line: '3.5', odds: '2.12' });
  assert.equal(handicap.market, 'Primer Tiempo - Hándicap');
  assert.equal(handicap.selection, 'Phoenix Suns +3.5');
  assert.equal(handicap.odds, '2.12');
  assert.equal(makeCardData({ ...values, market: 'Primer Tiempo - Hándicap', selection: 'away', line: '-3.5' }).selection, 'San Antonio Spurs -3.5');
});

test('legacy first-half market names use the exact first-half labels', () => {
  assert.equal(makeCardData({ ...base, market: 'Primer tiempo Hándicap' }).market, 'Primer Tiempo - Hándicap');
  assert.equal(makeCardData({ ...base, market: 'Primer tiempo Total de puntos' }).market, 'Primer Tiempo - Total de Puntos');
  assert.equal(makeCardData({ ...base, market: 'Hándicap - 1.er tiempo' }).market, 'Primer Tiempo - Hándicap');
  assert.equal(makeCardData({ ...base, market: 'Total de Puntos - 1.er tiempo' }).market, 'Primer Tiempo - Total de Puntos');
});

test('old corner card labels render the supplied labels with manually entered teams', () => {
  const total = makeCardData({ ...base, market: 'Total de Córners - 1.er tiempo', selection: 'Más de' });
  assert.equal(total.market, 'Córners en Primer Tiempo');
  assert.equal(total.selection, 'Más de 2.5');
  assert.equal(total.home, 'CD Tecnico Universitario');
  assert.equal(total.away, 'Manta FC');
  const handicap = makeCardData({ ...base, market: 'Hándicap de Córners', selection: 'away', line: '-2.5' });
  assert.equal(handicap.market, 'Hándicap de Córners - (2 bandas)');
  assert.equal(handicap.selection, 'Manta FC -2.5');
});

test('football corner references match the supplied total and negative handicap', () => {
  const values = { ...base, home: 'Club Atlético Junior', away: 'Cúcuta Deportivo', time: 'Hoy 19:00' };
  const handicap = makeCardData({ ...values, market: 'Hándicap de Córners - (2 bandas)', selection: 'home', line: '-2.5', odds: '1.83' });
  assert.equal(handicap.market, 'Hándicap de Córners - (2 bandas)');
  assert.equal(handicap.selection, 'Club Atlético Junior -2.5');
  assert.equal(handicap.odds, '1.83');
  const total = makeCardData({ ...values, market: 'Córners en Primer Tiempo', selection: 'Más de', line: '4.5', odds: '1.90' });
  assert.equal(total.market, 'Córners en Primer Tiempo');
  assert.equal(total.selection, 'Más de 4.5');
  assert.equal(total.odds, '1.90');
  assert.equal(total.time, 'Hoy 19:00');
  assert.equal(makeCardData({ ...values, market: 'Hándicap de corners' }).market, handicap.market);
  assert.equal(makeCardData({ ...values, market: 'Corners en primer tiempo Más/Menos' }).market, total.market);
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

test('live cards retain editable period, clock, added time and separate team scores', () => {
  const card = makeCardData({ ...base, result: 'live', homeScore: '0', awayScore: '02',
    livePeriod: ' 2.º T ', liveClock: ' 67:24 ', liveExtraTime: ' 3 ' });
  assert.equal(card.result, 'live');
  assert.equal(card.score, '0-2');
  assert.deepEqual(card.live, { period: '2.º T', clock: '67:24', extraTime: '3', homeScore: '0', awayScore: '2' });
});

test('live fields allow empty periods and do not invent scores, clocks or added time', () => {
  const values = { ...base, result: 'live', homeScore: '', awayScore: '-1', livePeriod: '', liveClock: '' };
  for (const liveExtraTime of ['', '0', '-1', '1.5', '100']) {
    const card = makeCardData({ ...values, liveExtraTime });
    assert.equal(card.score, '—-—');
    assert.deepEqual(card.live, { period: '', clock: '—', extraTime: '', homeScore: '—', awayScore: '—' });
  }
  for (const result of ['pending', 'won']) assert.equal('live' in makeCardData({ ...values, result }), false);
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
