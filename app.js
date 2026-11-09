const $ = id => document.getElementById(id);
let sport = 'Fútbol';
const canvas = $('card');
const ctx = canvas.getContext('2d');
function options(id, values) { $(id).replaceChildren(...values.map(value => { const o = document.createElement('option'); o.value = value; o.textContent = value; return o; })); }
function refreshSelection() {
  const market = $('market').value;
  const yesNo = market.startsWith('Ambos');
  const winner = market === 'Ganador';
  const handicap = /hándicap/i.test(market);
  const old = $('selection').value;
  options('selection', yesNo ? ['Sí', 'No'] : winner || handicap ? [$('home').value || 'Local', $('away').value || 'Visitante'] : ['Más de', 'Menos de']);
  if ([...$('selection').options].some(o => o.value === old)) $('selection').value = old;
  $('line-label').hidden = yesNo || winner;
  $('line').required = !yesNo && !winner;
  $('line').min = handicap ? '-999' : '0';
  $('player-fields').hidden = !market.startsWith('Jugador');
}
function rounded(x,y,w,h,r,color) {ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function fit(text,x,y,max,size,color='#1b202b',bold=false) {
  ctx.fillStyle=color; let n=size;
  do {ctx.font=`${bold?'700':'400'} ${n--}px Arial, sans-serif`;} while(ctx.measureText(text).width>max && n>14);
  ctx.fillText(text,x,y);
}
function draw() {
  const market = $('market').value;
  const odds = Number($('odds').value);
  const oddText = Number.isFinite(odds) && odds>=1.01 ? odds.toFixed(2) : '—';
  let selection = $('selection').value;
  if (!$('line-label').hidden) selection += ' ' + ($('line').value || '0');
  if (market.startsWith('Jugador')) selection = `${$('player').value || 'Jugador'} · ${selection}`;
  const marketText = market.startsWith('Jugador') ? $('stat').value + ' · Más/Menos' : market;
  ctx.fillStyle='#ff4500';ctx.fillRect(0,0,1184,870);
  ctx.fillStyle='#ff754d';ctx.beginPath();ctx.moveTo(565,0);ctx.lineTo(1184,0);ctx.lineTo(1184,870);ctx.lineTo(598,870);ctx.lineTo(790,440);ctx.lineTo(480,195);ctx.closePath();ctx.fill();
  ctx.font='italic 900 92px Arial, sans-serif';ctx.fillStyle='white';ctx.fillText('Betano',85,139);
  const hasStake = Number($('stake').value)>0;
  rounded(44,198,1096,hasStake?550:470,40,'#ffffff');
  fit('Simple',74,275,780,43,undefined,true);fit(oddText,1000,279,110,42,undefined,true);
  ctx.strokeStyle='#dce1ec';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(44,330);ctx.lineTo(1140,330);ctx.stroke();
  fit(sport==='Fútbol'?'⚽':sport==='Básquet'?'🏀':'⚾',76,418,65,52);
  fit(selection,158,414,800,46,undefined,true);
  rounded(981,361,131,78,14,'#f5f6fa');fit(oddText,1005,414,100,41,undefined,true);
  fit(marketText,158,497,900,44,'#58719a');
  fit($('home').value || 'Equipo local',162,567,700,39);
  fit($('away').value || 'Equipo visitante',162,628,700,39);
  fit($('time').value,924,598,184,36,'#6b80ad');
  if(hasStake){ctx.strokeStyle='#e7eaf0';ctx.beginPath();ctx.moveTo(74,652);ctx.lineTo(1110,652);ctx.stroke();fit(`Apuesta: ${Number($('stake').value).toLocaleString('es-CO')} ${$('currency').value}`,76,711,510,31);fit(`Retorno: ${Number.isFinite(odds)?(Number($('stake').value)*odds).toLocaleString('es-CO',{maximumFractionDigits:2}):'—'} ${$('currency').value}`,620,711,488,31,undefined,true);}
  fit('DISEÑO DE MUESTRA · NO ES UN COMPROBANTE DE APUESTA',67,835,1050,20,'#ffffff');
  $('return').textContent=hasStake && odds>=1.01 ? (Number($('stake').value)*odds).toLocaleString('es-CO',{style:'currency',currency:$('currency').value}) : '—';
}
document.querySelectorAll('[data-sport]').forEach(button => button.addEventListener('click',()=>{
  sport=button.dataset.sport;
  document.querySelectorAll('[data-sport]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  options('market',markets[sport]);refreshSelection();draw();
}));
$('market').addEventListener('change',()=>{refreshSelection();draw();});
['home','away'].forEach(id=>$(id).addEventListener('input',()=>{refreshSelection();draw();}));
$('editor').addEventListener('input',draw);
$('editor').addEventListener('submit',e=>e.preventDefault());
$('download').addEventListener('click',()=>{
  if(!$('editor').reportValidity()) return;
  if(!$('player-fields').hidden && !$('player').value.trim()){ $('player').focus();$('status').textContent='Escribe el nombre del jugador.';return; }
  const a=document.createElement('a');a.download='mi-jugada.png';a.href=canvas.toDataURL('image/png');a.click();$('status').textContent='Tarjeta descargada.';
});
options('market',markets[sport]);refreshSelection();draw();
document.querySelectorAll('[data-sport]').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('active'))));
