/* Isolated card templates and resolved visual rules from the user-supplied HAR.
 * The HAR itself, request headers and account responses are never published.
 */
(function (root) {
  const WIDTH = 450;
  const HEIGHT = 338;
  const jobs = new WeakMap();

  async function loadAssets() {
    async function resource(path, type) {
      const response = await fetch(new URL(path, document.baseURI));
      if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
      return response[type]();
    }
    const [design, font] = await Promise.all([
      resource('./assets/card-design.json', 'json'),
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

  function svg(data, assets) {
    const { design, fontUrl } = assets;
    const won = data.result === 'won';
    const wrapper = document.createElement('div');
    wrapper.className = 'capture-root';
    const styles = document.createElement('style');
    styles.textContent = `
      @font-face{font-family:'Ubuntu Sans';src:url('${fontUrl}') format('woff2');font-weight:100 800;font-stretch:75% 100%}
      .capture-root{width:450px;height:338px;overflow:hidden;${Object.entries(design.variables).map(([name, value]) => `${name}:${value};`).join('')}}
      ${design.css}
      .capture-root .kaizen-betting{width:360px;zoom:1.25;font:450 14px/1 'Ubuntu Sans',sans-serif}
      .capture-root .share-bet-modal__body{min-height:270.4px}
    `;
    wrapper.append(styles);
    const context = document.createElement('div');
    context.className = 'kaizen-betting share-bet-modal';
    // Only a local, sanitized static template is parsed; editable values use textContent.
    context.innerHTML = design.templates[won ? 'won' : 'pending'];
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
    if (won) set('[data-qa="final-score"] span', `Marcador ${data.score}`);
    else set('[data-qa="bet-event-date-time"]', data.time);
    const sport = document.createElement('template');
    sport.innerHTML = design.icons[data.sport];
    context.querySelector('[data-qa="sport-icon"]').replaceWith(sport.content.cloneNode(true));
    const html = new XMLSerializer().serializeToString(wrapper);
    return `<svg xmlns="http://www.w3.org/2000/svg" style="font-size:14px" width="${WIDTH}" height="${HEIGHT}"><foreignObject width="${WIDTH}" height="${HEIGHT}">${html}</foreignObject></svg>`;
  }

  function render(canvas, data, assets) {
    const revision = (jobs.get(canvas)?.revision || 0) + 1;
    const image = new Image();
    const promise = new Promise((resolve, reject) => {
      image.onload = () => {
        if (jobs.get(canvas)?.revision !== revision) { resolve(false); return; }
        try {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, WIDTH, HEIGHT);
          ctx.drawImage(image, 0, 0);
          resolve(true);
        } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error('No se pudo generar la tarjeta.'));
    });
    jobs.set(canvas, { revision, promise });
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(data, assets))}`;
    return promise;
  }

  async function ready(canvas) {
    let job;
    do { job = jobs.get(canvas); await job?.promise; } while (job !== jobs.get(canvas));
  }

  root.CardRenderer = { WIDTH, HEIGHT, loadAssets, render, ready };
})(window);
