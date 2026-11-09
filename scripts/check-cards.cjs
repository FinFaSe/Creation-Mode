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

    for (const [example, fixture] of [['Básquet', 'source-basketball.png'], ['Ganada', 'source-won.png']]) {
      await page.locator(`[data-example="${example}"]`).click();
      await ready();
      const reference = await fs.readFile(path.join(project, 'tests/fixtures', fixture));
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
      assert.ok(diff.rmse < 3 && diff.significant < 0.001, `${example} differs from the original CSS reference: ${JSON.stringify(diff)}`);
      const preview = await png();
      const download = page.waitForEvent('download'); await page.click('#download');
      const file = await (await download).path();
      assert.deepEqual(await fs.readFile(file), Buffer.from(preview.split(',')[1], 'base64'));
      assert.deepEqual(await page.locator('#card').evaluate(c => [c.width, c.height]), [450, 338]);
      console.log(`${example}: original visual reference and PNG download passed (RMSE ${diff.rmse.toFixed(3)})`);
    }

    await page.fill('#home-score', '0');
    assert.match(await page.locator('#card').getAttribute('aria-label'), /Marcador 0-2/);
    await page.fill('#home-score', ''); await page.click('#download');
    assert.equal(await page.locator('#home-score').evaluate(e => e.validity.valid), false);
    await page.selectOption('#result', 'pending');
    assert.equal(await page.locator('#home-score').isDisabled(), true);
    assert.equal(await page.locator('#time').isDisabled(), false);

    await page.locator('[data-example="Básquet"]').click(); await ready();
    const before = await png(); await page.fill('#stake', '100'); await ready();
    assert.match(await page.locator('#return').innerText(), /183/); assert.equal(await png(), before);
    const renders = new Set();
    for (const sport of ['Fútbol', 'Básquet', 'Béisbol']) {
      await page.locator(`[data-sport="${sport}"]`).click();
      for (const market of await page.locator('#market option').evaluateAll(options => options.map(o => o.value))) {
        await page.selectOption('#market', market);
        for (const state of ['pending', 'won']) {
          await page.selectOption('#result', state); await ready();
          renders.add(createHash('sha256').update(await png()).digest('hex'));
        }
      }
    }
    assert.equal(renders.size, 36, 'All 18 markets must render in both states');
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
    console.log('36 card variants, form validation, render ordering, escaped text, mobile layout and missing font handling passed');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
