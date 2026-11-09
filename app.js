const $ = id => document.getElementById(id);
let sport = 'Fútbol';
let assets;
const canvas = $('card');

function options(id, values) {
  $(id).replaceChildren(...values.map(value => {
    const option = document.createElement('option');
    option.value = typeof value === 'string' ? value : value.value;
    option.textContent = typeof value === 'string' ? value : value.label;
    return option;
  }));
}

function refreshSelection() {
  const market = $('market').value;
  const type = CardModel.marketType(market);
  const previous = $('selection').value;
  options('selection', type === 'yes-no' ? ['Sí', 'No']
    : ['winner', 'handicap'].includes(type)
      ? [{ value: 'home', label: $('home').value || 'Local' }, { value: 'away', label: $('away').value || 'Visitante' }]
      : ['Más de', 'Menos de']);
  if ([...$('selection').options].some(option => option.value === previous)) $('selection').value = previous;
  $('line-label').hidden = type === 'yes-no' || type === 'winner';
  $('line').required = !$('line-label').hidden;
  $('line').disabled = $('line-label').hidden;
  $('line').min = type === 'handicap' ? '-999' : '0';
  const playerMarket = market.startsWith('Jugador');
  $('player-fields').hidden = !playerMarket;
  $('player').required = playerMarket;
}

function draw() {
  const data = CardModel.makeCardData({
    sport, ...Object.fromEntries(['home', 'away', 'market', 'selection', 'line', 'player', 'stat', 'odds', 'time']
      .map(id => [id, $(id).value])),
    result: $('result').value, homeScore: $('home-score').value, awayScore: $('away-score').value,
    livePeriod: $('live-period').value, liveClock: $('live-clock').value, liveExtraTime: $('live-extra').value
  });
  const scale = Number($('quality').value);
  $('export-size').textContent = `PNG · ${CardRenderer.WIDTH * scale} × ${CardRenderer.HEIGHT * scale}`;
  const painting = assets ? CardRenderer.render(canvas, data, assets, scale) : Promise.resolve(false);
  const outcome = data.result === 'live'
    ? `En vivo. ${data.live.period} ${data.live.clock}${data.live.extraTime ? ' +' + data.live.extraTime : ''}. Marcador ${data.score}`
    : data.result === 'won' ? `Ganada. Marcador ${data.score}` : data.time;
  canvas.setAttribute('aria-label', `${data.home} contra ${data.away}. ${data.market}: ${data.selection}. Cuota ${data.odds}. ${outcome}`);
  const stake = Number($('stake').value);
  const odds = Number($('odds').value);
  $('return').textContent = stake > 0 && data.odds !== '—'
    ? (stake * odds).toLocaleString('es-CO', { style: 'currency', currency: $('currency').value }) : '—';
  return painting.then(rendered => {
    if (rendered) $('download').disabled = false;
    return rendered;
  }).catch(error => {
    $('download').disabled = true;
    $('status').textContent = 'No se pudo generar la tarjeta. Recarga la página para intentarlo otra vez.';
    console.error(error);
    return false;
  });
}

function refreshResult() {
  const result = $('result').value;
  const hasScore = result !== 'pending';
  const live = result === 'live';
  $('score-fields').hidden = !hasScore;
  for (const id of ['home-score', 'away-score']) {
    $(id).required = hasScore;
    $(id).disabled = !hasScore;
  }
  $('live-fields').hidden = !live;
  for (const id of ['live-period', 'live-clock', 'live-extra']) $(id).disabled = !live;
  $('live-clock').required = live;
  $('time-label').hidden = hasScore;
  $('time').disabled = hasScore;
}

function setSport(value) {
  sport = value;
  document.querySelectorAll('[data-sport]').forEach(button => {
    button.classList.toggle('active', button.dataset.sport === sport);
    button.setAttribute('aria-pressed', String(button.dataset.sport === sport));
  });
  options('market', markets[sport]);
  refreshSelection();
}

function example(value) {
  const firstHalf = {
    '1T Puntos': { market: 'Primer Tiempo - Total de Puntos', line: '117.5', odds: '1.87', selection: 'Más de' },
    '1T Hándicap': { market: 'Primer Tiempo - Hándicap', line: '3.5', odds: '2.12', selection: 'home' }
  }[value];
  const corners = {
    'Córners Hándicap': { market: 'Hándicap de Córners - (2 bandas)', line: '-2.5', odds: '1.83', selection: 'home' },
    'Córners 1T': { market: 'Córners en Primer Tiempo', line: '4.5', odds: '1.90', selection: 'Más de' }
  }[value];
  const basketball = value === 'Básquet' || value === 'En vivo' || !!firstHalf;
  $('home').value = basketball ? 'Phoenix Suns' : 'CD Tecnico Universitario';
  $('away').value = basketball ? 'San Antonio Spurs' : 'Manta FC';
  $('odds').value = basketball ? '1.83' : '2.02';
  $('time').value = basketball ? 'Esta noche 21:00' : 'Hoy 15:30';
  $('player').value = 'Victor Wembanyama';
  $('stat').value = 'Puntos';
  $('line').value = basketball ? '28.5' : '2.5';
  setSport(basketball ? 'Básquet' : 'Fútbol');
  $('market').value = basketball ? 'Jugador · Más/Menos' : 'Ambos equipos anotan';
  refreshSelection();
  $('selection').value = basketball ? 'Más de' : 'Sí';
  $('result').value = value === 'Ganada' ? 'won' : value === 'En vivo' ? 'live' : 'pending';
  if (firstHalf) {
    $('market').value = firstHalf.market;
    $('line').value = firstHalf.line;
    $('odds').value = firstHalf.odds;
    refreshSelection();
    $('selection').value = firstHalf.selection;
  }
  if (corners) {
    $('home').value = 'Club Atlético Junior';
    $('away').value = 'Cúcuta Deportivo';
    $('time').value = 'Hoy 19:00';
    $('market').value = corners.market;
    $('line').value = corners.line;
    $('odds').value = corners.odds;
    refreshSelection();
    $('selection').value = corners.selection;
  }
  if (value === 'En vivo') {
    $('home-score').value = '98';
    $('away-score').value = '95';
    $('live-period').value = '4.º C';
    $('live-clock').value = '03:24';
    $('live-extra').value = '';
  }
  if (value === 'Ganada') {
    $('home').value = 'RB Leipzig';
    $('away').value = 'FC Augsburg';
    $('odds').value = '1.72';
    $('market').value = 'Remates totales';
    $('line').value = '33.5';
    refreshSelection();
    $('selection').value = 'Menos de';
    $('home-score').value = '5';
    $('away-score').value = '2';
  }
  refreshResult();
  $('status').textContent = '';
  draw();
}

document.querySelectorAll('[data-sport]').forEach(button => button.addEventListener('click', () => {
  setSport(button.dataset.sport); draw();
}));
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => example(button.dataset.example)));
$('market').addEventListener('change', () => { refreshSelection(); draw(); });
$('result').addEventListener('change', () => { refreshResult(); draw(); });
$('quality').addEventListener('change', () => { $('status').textContent = ''; draw(); });
['home', 'away'].forEach(id => $(id).addEventListener('input', () => { refreshSelection(); draw(); }));
$('editor').addEventListener('input', () => { $('status').textContent = ''; draw(); });
$('editor').addEventListener('submit', event => event.preventDefault());
$('download').addEventListener('click', async () => {
  if (!assets || !$('editor').reportValidity()) return;
  if (!$('player-fields').hidden && !$('player').value.trim()) {
    $('player').focus(); $('status').textContent = 'Escribe el nombre del jugador.'; return;
  }
  try {
    if (!await draw()) return;
    await CardRenderer.ready(canvas);
    const { width, height } = canvas;
    canvas.toBlob(blob => {
      if (!blob) { $('status').textContent = 'No se pudo generar la imagen. Inténtalo otra vez.'; return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'mi-jugada.png'; link.href = url; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      $('status').textContent = `Tarjeta descargada · ${width} × ${height} px.`;
    }, 'image/png');
  } catch (error) {
    $('status').textContent = 'No se pudo descargar la tarjeta. Inténtalo otra vez.';
    console.error(error);
  }
});

example('Fútbol');
$('download').disabled = true;
$('status').textContent = 'Cargando diseño…';
CardRenderer.loadAssets().then(result => {
  assets = result;
  draw();
  $('status').textContent = '';
}).catch(error => {
  $('status').textContent = 'No se pudo cargar el diseño. Recarga la página para intentarlo otra vez.';
  console.error(error);
});
