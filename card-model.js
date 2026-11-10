(function (root) {
  const marketLabels = {
    'Goles totales Más/Menos': 'Goles Totales',
    'Ambos equipos anotan primer tiempo': 'Ambos equipos anotan - 1.er tiempo',
    'Más/Menos corners': 'Total de Córners',
    'Total de tarjetas': 'Total de Tarjetas',
    'Tiros al arco': 'Tiros al Arco',
    'Remates totales': 'Remates totales',
    'Corners en primer tiempo Más/Menos': 'Córners en Primer Tiempo',
    'Hándicap de corners': 'Hándicap de Córners - (2 bandas)',
    'Hándicap de Córners': 'Hándicap de Córners - (2 bandas)',
    'Total de puntos': 'Total de Puntos',
    'Primer tiempo Hándicap': 'Primer Tiempo - Hándicap',
    'Primer tiempo Total de puntos': 'Primer Tiempo - Total de Puntos',
    'Total': 'Total de Carreras'
  };
  const firstHalfLabels = {
    'Total de Córners': 'Córners en Primer Tiempo',
    'Total de Puntos': 'Primer Tiempo - Total de Puntos',
    'Hándicap': 'Primer Tiempo - Hándicap'
  };

  function marketLabel(market) {
    const firstHalf = /^(.+) - 1\.er tiempo$/.exec(market);
    if (firstHalf) return firstHalfLabels[firstHalf[1]] || market;
    return marketLabels[market] || market;
  }

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
      : marketLabel(values.market);
    const odds = Number(values.odds);
    const result = ['won', 'live'].includes(values.result) ? values.result : 'pending';
    const score = value => /^\d{1,3}$/.test(String(value)) ? String(Number(value)) : '—';
    const card = {
      sport: values.sport, home, away, selection, market,
      time: values.time.trim(),
      result,
      score: result !== 'pending' ? `${score(values.homeScore)}-${score(values.awayScore)}` : '',
      odds: Number.isFinite(odds) && odds >= 1.01 && odds <= 9999 ? odds.toFixed(2) : '—'
    };
    if (result === 'live') {
      const extra = String(values.liveExtraTime ?? '').trim();
      card.live = {
        period: String(values.livePeriod ?? '').trim().slice(0, 12),
        clock: String(values.liveClock ?? '').trim().slice(0, 16) || '—',
        extraTime: /^[1-9]\d?$/.test(extra) ? extra : '',
        homeScore: score(values.homeScore), awayScore: score(values.awayScore)
      };
    }
    return card;
  }

  const api = { marketType, makeCardData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
