/* The PNG logo, background and basketball SVG were supplied in the reference HTML. */
(function (root) {
  const WIDTH = 450;
  const HEIGHT = 338;
  const FAMILY = '"Card Open Sans"';

  async function loadAssets() {
    function image(path) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`No se pudo cargar ${path}`));
        img.src = new URL(path, document.baseURI).href;
      });
    }
    const [background, logo, football, basketball, baseball] = await Promise.all([
      image('./assets/share-background.png'), image('./assets/betano-logo.png'),
      image('./assets/football.svg'), image('./assets/basketball.svg'), image('./assets/baseball.svg'),
      document.fonts.load(`400 14px ${FAMILY}`), document.fonts.load(`700 17px ${FAMILY}`)
    ]);
    return { background, logo, 'Fútbol': football, 'Básquet': basketball, 'Béisbol': baseball };
  }

  function render(canvas, data, assets) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const font = (size, bold = false) => { ctx.font = `${bold ? 700 : 400} ${size}px ${FAMILY}`; };
    function text(value, x, y, size, color, bold = false, align = 'left') {
      font(size, bold);
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.fillText(value, x, y);
    }
    function box(x, y, w, h, r, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    }
    function wrap(value, maxWidth, size, bold = false) {
      font(size, bold);
      const lines = [''];
      // Wrap words, splitting long words only when they cannot fit on their own.
      for (const word of value.split(/\s+/)) {
        let line = lines[lines.length - 1];
        if (line && ctx.measureText(`${line} ${word}`).width <= maxWidth) {
          lines[lines.length - 1] = `${line} ${word}`;
          continue;
        }
        if (line) lines.push('');
        for (const char of word) {
          line = lines[lines.length - 1];
          if (line && ctx.measureText(line + char).width > maxWidth) lines.push(char);
          else lines[lines.length - 1] += char;
        }
      }
      return lines;
    }
    function layout(value, maxWidth, size, bold, maxLines, minSize) {
      let lines = wrap(value, maxWidth, size, bold);
      while (lines.length > maxLines && size > minSize) {
        size -= 0.5;
        lines = wrap(value, maxWidth, size, bold);
      }
      return { lines, size };
    }
    function drawLines(block, x, y, lineHeight, color, bold = false) {
      block.lines.forEach((line, i) => text(line, x, y + i * lineHeight, block.size, color, bold));
    }

    // Logical dimensions and positions follow the supplied 450 × 338 references.
    font(14, true);
    const oddsWidth = Math.max(49, ctx.measureText(data.odds).width + 20);
    const selection = layout(data.selection, 419 - oddsWidth - 12 - 63, 17, true, 2, 11);
    const market = layout(data.market, 355, 16, false, 2, 12);
    const home = layout(data.home, 226, 14.4, false, 2, 10);
    const away = layout(data.away, 226, 14.4, false, 2, 10);
    const selectionExtra = (selection.lines.length - 1) * 22;
    const marketY = 190 + selectionExtra;
    const homeY = marketY + (market.lines.length - 1) * 21 + 27;
    const awayY = homeY + (home.lines.length - 1) * 18 + 22;
    const lastY = awayY + (away.lines.length - 1) * 18;
    const cardHeight = lastY + 16 - 79;

    ctx.fillStyle = '#ff4000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const backgroundWidth = 329;
    ctx.drawImage(assets.background, WIDTH - backgroundWidth, 0,
      backgroundWidth, assets.background.height * backgroundWidth / assets.background.width);
    ctx.drawImage(assets.logo, 38, 26, 120, 36);

    box(20, 79, 410, cardHeight, 16, '#fff');
    text('Simple', 31, 108, 14, '#1c2026', true);
    text(data.odds, 419, 108, 14, '#1c2026', true, 'right');
    ctx.strokeStyle = '#e0e4ea';
    ctx.lineWidth = 0.7;
    ctx.beginPath();ctx.moveTo(20, 128.5);ctx.lineTo(430, 128.5);ctx.stroke();

    ctx.drawImage(assets[data.sport], 31, 141, 26, 26);
    drawLines(selection, 63, 160, 22, '#1c2026', true);
    box(419 - oddsWidth, 139, oddsWidth, 30, 4, '#f6f8f9');
    text(data.odds, 419 - oddsWidth / 2, 159, 14, '#1c2026', true, 'center');

    drawLines(market, 63, marketY, 21, '#58729e');
    drawLines(home, 63, homeY, 18, '#1c2026');
    drawLines(away, 63, awayY, 18, '#1c2026');
    const time = layout(data.time, 126, 14.4, false, 2, 10);
    const timeY = (homeY + lastY) / 2 - (time.lines.length - 1) * 8;
    time.lines.forEach((line, i) => text(line, 419, timeY + i * 16, time.size, '#657fb0', false, 'right'));
  }

  root.CardRenderer = { WIDTH, HEIGHT, loadAssets, render };
})(window);
