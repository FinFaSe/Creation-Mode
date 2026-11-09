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
      .map(id => [id, $(id).value]))
  });
  if (assets) CardRenderer.render(canvas, data, assets);
  canvas.setAttribute('aria-label', `${data.home} contra ${data.away}. ${data.market}: ${data.selection}. Cuota ${data.odds}. ${data.time}`);
  const stake = Number($('stake').value);
  const odds = Number($('odds').value);
  $('return').textContent = stake > 0 && data.odds !== '—'
    ? (stake * odds).toLocaleString('es-CO', { style: 'currency', currency: $('currency').value }) : '—';
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
  const basketball = value === 'Básquet';
  $('home').value = basketball ? 'Phoenix Suns' : 'CD Tecnico Universitario';
  $('away').value = basketball ? 'San Antonio Spurs' : 'Manta FC';
  $('odds').value = basketball ? '1.83' : '2.02';
  $('time').value = basketball ? 'Esta noche 21:00' : 'Hoy 15:30';
  $('player').value = 'Victor Wembanyama';
  $('stat').value = 'Puntos';
  $('line').value = basketball ? '28.5' : '2.5';
  setSport(value);
  $('market').value = basketball ? 'Jugador · Más/Menos' : 'Ambos equipos anotan';
  refreshSelection();
  $('selection').value = basketball ? 'Más de' : 'Sí';
  $('status').textContent = '';
  draw();
}

document.querySelectorAll('[data-sport]').forEach(button => button.addEventListener('click', () => {
  setSport(button.dataset.sport); draw();
}));
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => example(button.dataset.example)));
$('market').addEventListener('change', () => { refreshSelection(); draw(); });
['home', 'away'].forEach(id => $(id).addEventListener('input', () => { refreshSelection(); draw(); }));
$('editor').addEventListener('input', () => { $('status').textContent = ''; draw(); });
$('editor').addEventListener('submit', event => event.preventDefault());
$('download').addEventListener('click', () => {
  if (!assets || !$('editor').reportValidity()) return;
  if (!$('player-fields').hidden && !$('player').value.trim()) {
    $('player').focus(); $('status').textContent = 'Escribe el nombre del jugador.'; return;
  }
  draw();
  canvas.toBlob(blob => {
    if (!blob) { $('status').textContent = 'No se pudo generar la imagen. Inténtalo otra vez.'; return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'mi-jugada.png'; link.href = url; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    $('status').textContent = 'Tarjeta descargada · 450 × 338 px.';
  }, 'image/png');
});

example('Fútbol');
$('download').disabled = true;
$('status').textContent = 'Cargando diseño…';
CardRenderer.loadAssets().then(result => {
  assets = result;
  draw();
  $('download').disabled = false;
  $('status').textContent = '';
}).catch(error => {
  $('status').textContent = 'No se pudo cargar el diseño. Recarga la página para intentarlo otra vez.';
  console.error(error);
});
