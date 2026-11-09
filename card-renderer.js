/* Isolated card templates and resolved visual rules from the user-supplied HAR.
 * The HAR itself, request headers and account responses are never published.
 */
(function (root) {
  const WIDTH = 450;
  const HEIGHT = 338;
  const DEFAULT_SCALE = 4;
  const jobs = new WeakMap();

  async function loadAssets() {
    async function resource(path, type) {
      const response = await fetch(new URL(path, document.baseURI));
      if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
      return response[type]();
    }
    const [design, font] = await Promise.all([
      resource('./assets/card-design.json?v=corners-1', 'json'),
      resource('./assets/fonts/UbuntuSans-variable.woff2', 'blob')
    ]);
    const fontUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer la fuente de la tarjeta.'));
      reader.readAsDataURL(font);
    });
    return { design, fontUrl };
  }

  function svg(data, assets, scale) {
    const { design, fontUrl } = assets;
    const won = data.result === 'won';
    const live = data.result === 'live';
    const wrapper = document.createElement('div');
    wrapper.className = 'capture-root';
    const styles = document.createElement('style');
    // The source site's rem unit is 14px. Resolve it before embedding, since an
    // SVG image can otherwise inherit the browser's default root font size.
    const css = design.css.replace(/(\d*\.?\d+)rem\b/g,
      (_match, value) => `${Math.round(Number(value) * 14 * 10000) / 10000}px`);
    styles.textContent = `
      @font-face{font-family:'Ubuntu Sans';src:url('${fontUrl}') format('woff2');font-weight:100 800;font-stretch:75% 100%}
      .capture-root{width:450px;height:338px;overflow:hidden;${Object.entries(design.variables).map(([name, value]) => `${name}:${value};`).join('')}}
      ${css}
      .capture-root .kaizen-betting{width:360px;zoom:1.25;font:450 14px/1 'Ubuntu Sans',sans-serif}
      .capture-root .share-bet-modal__body{min-height:270.4px}
    `;
    wrapper.append(styles);
    const context = document.createElement('div');
    context.className = 'kaizen-betting share-bet-modal';
    // Only a local, sanitized static template is parsed; editable values use textContent.
    context.innerHTML = design.templates[live ? 'live' : won ? 'won' : 'pending'];
    wrapper.append(context);
    const set = (selector, value) => {
      context.querySelectorAll(selector).forEach(element => { element.textContent = value; });
    };
    set('[data-qa="selection-label"]', data.selection);
    set('[data-qa="market-label"]', data.market);
    set('[data-qa="bet-odds"]', data.odds);
    const teams = context.querySelectorAll('.participants__participant-name');
    teams[0].textContent = data.home;
    teams[1].textContent = data.away;
    if (data.sport === 'Básquet' && data.market.startsWith('Primer Tiempo - ')) {
      const badges = [data.home, data.away].map(name => design.teamLogos?.[name.trim().toLowerCase().replace(/\s+/g, ' ')]);
      if (badges.every(Boolean)) {
        teams.forEach((team, index) => {
          const image = document.createElement('img');
          image.src = badges[index]; image.width = 16; image.height = 16;
          image.alt = index === 0 ? data.home : data.away;
          image.setAttribute('data-team-logo', '');
          team.parentElement.prepend(image);
        });
      }
    }
    if (won) set('[data-qa="final-score"] span', `Marcador ${data.score}`);
    else if (live) {
      set('[data-qa="live-home-score"]', data.live.homeScore);
      set('[data-qa="live-away-score"]', data.live.awayScore);
      set('[data-qa="live-clock"]', data.live.clock);
      for (const [selector, value] of [
        ['[data-qa="live-period"]', data.live.period],
        ['[data-qa="live-extra-time"]', data.live.extraTime ? ` +${data.live.extraTime}` : '']
      ]) {
        if (value) set(selector, value);
        else context.querySelector(selector)?.remove();
      }
    }
    else set('[data-qa="bet-event-date-time"]', data.time);
    const sport = document.createElement('template');
    sport.innerHTML = design.icons[data.sport];
    context.querySelector('[data-qa="sport-icon"]').replaceWith(sport.content.cloneNode(true));
    const html = new XMLSerializer().serializeToString(wrapper);
    return `<svg xmlns="http://www.w3.org/2000/svg" style="font-size:14px" width="${WIDTH * scale}" height="${HEIGHT * scale}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><foreignObject width="${WIDTH}" height="${HEIGHT}">${html}</foreignObject></svg>`;
  }

  function render(canvas, data, assets, scale = DEFAULT_SCALE) {
    scale = [1, 2, 4].includes(Number(scale)) ? Number(scale) : DEFAULT_SCALE;
    const revision = (jobs.get(canvas)?.revision || 0) + 1;
    const image = new Image();
    const promise = new Promise((resolve, reject) => {
      image.onload = () => {
        if (jobs.get(canvas)?.revision !== revision) { resolve(false); return; }
        try {
          canvas.width = WIDTH * scale;
          canvas.height = HEIGHT * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0);
          resolve(true);
        } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error('No se pudo generar la tarjeta.'));
    });
    jobs.set(canvas, { revision, promise });
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(data, assets, scale))}`;
    return promise;
  }

  async function ready(canvas) {
    let job;
    do { job = jobs.get(canvas); await job?.promise; } while (job !== jobs.get(canvas));
  }

  root.CardRenderer = { WIDTH, HEIGHT, DEFAULT_SCALE, loadAssets, render, ready };
})(window);
