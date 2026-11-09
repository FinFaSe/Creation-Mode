(function (root) {
  const marketLabels = {
    'Goles totales Más/Menos': 'Goles Totales',
    'Ambos equipos anotan primer tiempo': 'Ambos equipos anotan - 1.er tiempo',
    'Más/Menos corners': 'Total de Córners',
    'Total de tarjetas': 'Total de Tarjetas',
    'Tiros al arco': 'Tiros al Arco',
    'Remates totales': 'Remates Totales',
    'Corners en primer tiempo Más/Menos': 'Total de Córners - 1.er tiempo',
    'Hándicap de corners': 'Hándicap de Córners',
    'Total de puntos': 'Total de Puntos',
    'Primer tiempo Hándicap': 'Hándicap - 1.er tiempo',
    'Primer tiempo Total de puntos': 'Total de Puntos - 1.er tiempo',
    'Total': 'Total de Carreras'
  };

  function marketType(market) {
    if (market.startsWith('Ambos')) return 'yes-no';
    if (market === 'Ganador') return 'winner';
    if (/hándicap/i.test(market)) return 'handicap';
    return 'total';
  }

  function makeCardData(values) {
    const home = values.home.trim() || 'Equipo local';
    const away = values.away.trim() || 'Equipo visitante';
    const type = marketType(values.market);
    let selection = values.selection;
    if (type === 'winner' || type === 'handicap') {
      selection = values.selection === 'away' ? away : home;
    }
    if (type === 'total' || type === 'handicap') {
      const line = Number(values.line);
      const valid = String(values.line).trim() !== '' && Number.isFinite(line);
      const lineText = valid ? `${type === 'handicap' && line > 0 ? '+' : ''}${line}` : '—';
      selection += ` ${lineText}`;
    }
    const playerMarket = values.market.startsWith('Jugador');
    const market = playerMarket
      ? `Total de ${values.stat} [${values.player.trim() || 'Jugador'}]`
      : marketLabels[values.market] || values.market;
    const odds = Number(values.odds);
    return {
      sport: values.sport, home, away, selection, market,
      time: values.time.trim(),
      odds: Number.isFinite(odds) && odds >= 1.01 && odds <= 9999 ? odds.toFixed(2) : '—'
    };
  }

  const api = { marketType, makeCardData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
