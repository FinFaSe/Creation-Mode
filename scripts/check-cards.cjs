const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function main() {
  const project = path.resolve(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'creation-cards-'));
  const site = path.join(temp, 'Creation-Mode');
  await fs.mkdir(site);
  for (const name of ['index.html', 'styles.css', 'app.js', 'markets.js', 'card-model.js', 'card-renderer.js', 'assets']) {
    await fs.cp(path.join(project, name), path.join(site, name), { recursive: true });
  }
  await fs.cp(path.join(project, 'tests/fixtures'), path.join(site, '_references'), { recursive: true });
  const originalFontHash = (await fs.readFile(path.join(project, 'tests/fixtures/font.sha256'), 'utf8')).trim();
  assert.equal(createHash('sha256').update(await fs.readFile(path.join(site, 'assets/fonts/UbuntuSans-variable.woff2'))).digest('hex'), originalFontHash);
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(temp, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(site + path.sep)) { response.writeHead(404); response.end(); return; }
    try {
      const data = await fs.readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      response.end(data);
    } catch { response.writeHead(404); response.end(); }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/Creation-Mode/`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await page.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
    await page.goto(url);
    await page.waitForFunction(() => !document.getElementById('download').disabled);
    const ready = () => page.evaluate(() => CardRenderer.ready(document.getElementById('card')));
    const png = () => page.locator('#card').evaluate(canvas => canvas.toDataURL('image/png'));
    assert.equal(await page.inputValue('#quality'), '4');
    assert.deepEqual(await page.locator('#card').evaluate(c => [c.width, c.height]), [1800, 1352]);
    const highResolution = await png();
    const previewSize = await page.locator('#card').boundingBox();
    await page.selectOption('#quality', '1'); await ready();
    const lowResolution = await png();
    const detailDifference = await page.evaluate(async ({ high, low }) => {
      const images = await Promise.all([high, low].map(async src => {
        const image = new Image(); image.src = src; await image.decode(); return image;
      }));
      const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1352;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(images[0], 0, 0);
      const native = ctx.getImageData(240, 560, 1200, 240).data;
      ctx.clearRect(0, 0, 1800, 1352);
      ctx.drawImage(images[1], 0, 0, 1800, 1352);
      const enlarged = ctx.getImageData(240, 560, 1200, 240).data;
      let difference = 0;
      for (let i = 0; i < native.length; i += 4) {
        for (let channel = 0; channel < 3; channel++) difference += Math.abs(native[i + channel] - enlarged[i + channel]);
      }
      return difference / (1200 * 240 * 3);
    }, { high: highResolution, low: lowResolution });
    assert.ok(detailDifference > 1, 'High resolution must re-render text rather than enlarge the low-resolution PNG');
    assert.equal((await page.locator('#card').boundingBox()).width, previewSize.width);

    for (const [example, fixture] of [
      ['Básquet', 'original-basketball.html'], ['1T Puntos', 'original-first-half-points.html'],
      ['1T Hándicap', 'original-first-half-handicap.html'], ['Córners Hándicap', 'original-corners-handicap.html'],
      ['Córners 1T', 'original-corners-first-half.html'], ['En vivo', 'original-live.html'], ['Ganada', 'original-won.html']
    ]) {
      await page.selectOption('#quality', '1');
      await page.locator(`[data-example="${example}"]`).click();
      await ready();
      // Render the frozen original HTML/CSS in the same OS and browser. Font
      // hinting differs across systems; the reference must use the same rasterizer.
      const original = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await original.goto(`${url}_references/${fixture}`);
      await original.evaluate(() => document.fonts.ready);
      await original.waitForTimeout(250);
      const reference = await original.locator('.share-bet-modal__body').screenshot();
      await original.close();
      const diff = await page.evaluate(async source => {
        const image = new Image(); image.src = source; await image.decode();
        const reference = document.createElement('canvas'); reference.width = 450; reference.height = 338;
        const ctx = reference.getContext('2d'); ctx.drawImage(image, 0, 0);
        const expected = ctx.getImageData(0, 0, 450, 338).data;
        const actual = document.getElementById('card').getContext('2d').getImageData(0, 0, 450, 338).data;
        let squaredError = 0; let significant = 0;
        for (let pixel = 0; pixel < expected.length; pixel += 4) {
          let error = 0;
          for (let channel = 0; channel < 3; channel++) {
            const delta = actual[pixel + channel] - expected[pixel + channel];
            error += Math.abs(delta); squaredError += delta * delta;
          }
          if (error > 150) significant++;
          if (actual[pixel + 3] !== 255) throw new Error('Unexpected transparent pixels');
        }
        return { rmse: Math.sqrt(squaredError / (450 * 338 * 3)), significant: significant / (450 * 338) };
      }, `data:image/png;base64,${reference.toString('base64')}`);
      // Tolerate rasterizer anti-aliasing, while detecting font, spacing and color regressions.
      if (!(diff.rmse < 3 && diff.significant < 0.001)) {
        const failure = new Error(`${example} differs from the original CSS reference: ${JSON.stringify(diff)}; browser=${browser.version()}`);
        throw failure;
      }
      const preview = await png();
      const download = page.waitForEvent('download'); await page.click('#download');
      const file = await (await download).path();
      assert.deepEqual(await fs.readFile(file), Buffer.from(preview.split(',')[1], 'base64'));
      assert.deepEqual(await page.locator('#card').evaluate(c => [c.width, c.height]), [450, 338]);
      for (const scale of [2, 4]) {
        await page.selectOption('#quality', String(scale)); await ready();
        const preview = await png();
        const download = page.waitForEvent('download'); await page.click('#download');
        const image = await fs.readFile(await (await download).path());
        assert.deepEqual(image, Buffer.from(preview.split(',')[1], 'base64'));
        assert.equal(image.readUInt32BE(16), 450 * scale);
        assert.equal(image.readUInt32BE(20), 338 * scale);
        assert.equal((await page.locator('#card').boundingBox()).width, previewSize.width);
      }
      console.log(`${example}: original visual reference and PNG download passed (RMSE ${diff.rmse.toFixed(3)})`);
    }

    await page.fill('#home-score', '0');
    assert.match(await page.locator('#card').getAttribute('aria-label'), /Marcador 0-2/);
    await page.fill('#home-score', ''); await page.click('#download');
    assert.equal(await page.locator('#home-score').evaluate(e => e.validity.valid), false);
    await page.selectOption('#result', 'pending');
    assert.equal(await page.locator('#home-score').isDisabled(), true);
    assert.equal(await page.locator('#time').isDisabled(), false);

    await page.locator('[data-example="En vivo"]').click(); await ready();
    assert.equal(await page.inputValue('#result'), 'live');
    assert.match(await page.locator('#card').getAttribute('aria-label'), /En vivo.*4.º C 03:24.*98-95/);
    assert.equal(await page.locator('#time').isDisabled(), true);
    assert.equal(await page.locator('#live-clock').isDisabled(), false);
    await page.fill('#home-score', '0'); await page.fill('#live-period', ''); await page.fill('#live-extra', '3'); await ready();
    assert.match(await page.locator('#card').getAttribute('aria-label'), /03:24 \+3.*0-95/);
    await page.fill('#live-clock', ''); await page.click('#download');
    assert.equal(await page.locator('#live-clock').evaluate(e => e.validity.valid), false);
    await page.selectOption('#result', 'won');
    assert.equal(await page.locator('#live-clock').isDisabled(), true);
    assert.equal(await page.locator('#live-extra').isDisabled(), true);
    await page.selectOption('#result', 'pending');
    assert.equal(await page.locator('#home-score').isDisabled(), true);
    assert.doesNotMatch(await page.locator('#card').getAttribute('aria-label'), /En vivo|Ganada|Marcador/);

    await page.locator('[data-example="Básquet"]').click(); await ready();
    const before = await png(); await page.fill('#stake', '100'); await ready();
    assert.match(await page.locator('#return').innerText(), /183/); assert.equal(await png(), before);
    await page.locator('[data-example="En vivo"]').click();
    const renders = new Set();
    for (const sport of ['Fútbol', 'Básquet', 'Béisbol']) {
      await page.locator(`[data-sport="${sport}"]`).click();
      for (const market of await page.locator('#market option').evaluateAll(options => options.map(o => o.value))) {
        await page.selectOption('#market', market);
        for (const state of ['pending', 'live', 'won']) {
          await page.selectOption('#result', state); await ready();
          renders.add(createHash('sha256').update(await png()).digest('hex'));
        }
      }
    }
    assert.equal(renders.size, 54, 'All 18 markets must render in all three states');
    await page.locator('[data-example="Fútbol"]').click();
    await page.fill('#home', 'Primero'); await page.fill('#home', 'Último equipo'); await ready();
    const last = await png(); await page.waitForTimeout(100); assert.equal(await png(), last);
    await page.fill('#home', '<img src=x onerror=alert(1)>'); await ready();
    assert.match(await page.locator('#card').getAttribute('aria-label'), /<img src=x onerror=alert\(1\)>/);
    await png(); // Editable text must remain exportable as literal text.
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(failures, []);
    const broken = await browser.newPage();
    await broken.route('**/UbuntuSans-variable.woff2', route => route.fulfill({ status: 404, body: '' }));
    await broken.goto(url);
    await broken.waitForFunction(() => document.getElementById('status').textContent.includes('No se pudo'));
    assert.equal(await broken.locator('#download').isDisabled(), true);
    console.log('54 card variants, live controls, form validation, render ordering, escaped text, mobile layout and missing font handling passed');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => {
  console.error(error);
  if (process.env.GITHUB_ACTIONS) {
    const message = String(error.message).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    console.error(`::error title=Card browser validation::${message}`);
  }
  process.exitCode = 1;
});
