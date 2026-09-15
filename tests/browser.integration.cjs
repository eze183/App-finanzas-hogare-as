const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { SDK_VERSION, SDK_SHA256, destination } = require('./download-test-sdk.cjs');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://household-browser-test.invalid';
const API = 'https://supabase-browser-test.invalid';
const copy = value => structuredClone(value);
const empty = () => ({ people: ['Eze', 'Tami'], deviceOwner: 'Tami', expenses: [], personalExpenses: [], recurringExpenses: [], settlements: [], budgets: {}, personalBudgets: {} });
const expense = (id, amount = 100, payer = 'Eze') => ({ id, amount, payer, date: '2026-09-14', category: 'Otros', note: 'Compra de ensayo', createdAt: 1, updatedAt: 1 });
let browser;
let sdk;

before(async () => {
  sdk = fs.readFileSync(destination);
  assert.equal(crypto.createHash('sha256').update(sdk).digest('hex'), SDK_SHA256);
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'chrome', headless: true });
  console.log(`Browser ${browser.version()} / Supabase SDK ${SDK_VERSION}; all page requests intercepted.`);
});
after(async () => { await browser?.close(); });

function apiFixture() {
  let row = null;
  let fail = false;
  let pausedReads = [];
  let barrierRemaining = 0;
  const requests = [];
  const json = (route, value, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS' }, body: JSON.stringify(value) });
  return {
    requests,
    get data() { return copy(row?.data); },
    offline(value) { fail = value; },
    raceNextTwoReads() { barrierRemaining = 2; },
    async handle(route) {
      const request = route.request(); const url = new URL(request.url()); const method = request.method();
      assert.equal(url.pathname, '/rest/v1/app_state');
      if (method === 'OPTIONS') return json(route, {});
      requests.push({ method, filter: url.searchParams.get('updated_at'), prefer: request.headers().prefer });
      if (fail) return json(route, { message: 'simulated offline' }, 503);
      if (method === 'GET') {
        const snapshot = row ? [copy(row)] : [];
        if (barrierRemaining > 0) {
          barrierRemaining--;
          await new Promise(resolve => { pausedReads.push(resolve); if (!barrierRemaining) { const release = pausedReads; pausedReads = []; release.forEach(fn => fn()); } });
        }
        return json(route, snapshot);
      }
      const incoming = request.postDataJSON();
      assert.equal(incoming.id, 'browser-fixture');
      if (method === 'POST') {
        assert.ok(!request.headers().prefer?.includes('resolution=merge-duplicates'), 'upsert is forbidden');
        if (row) return json(route, { code: '23505', message: 'duplicate key' }, 409);
      } else if (method === 'PATCH') {
        assert.ok(url.searchParams.has('updated_at'), 'unconditional write is forbidden');
        if (!row || url.searchParams.get('updated_at') !== `eq.${row.updated_at}`) return json(route, []);
      } else throw new Error(`Unexpected method: ${method}`);
      row = copy(incoming);
      return json(route, [{ updated_at: row.updated_at }], method === 'POST' ? 201 : 200);
    },
  };
}

async function device(t, fixture, initial = empty(), width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block', locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
  const errors = [], blocked = [];
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*href="https:[^"]*"[^>]*>/gi, '')
    .replace('</body>', '<script src="/sdk.js"></script><script src="/test-config.js"></script><script src="/app.js"></script></body>');
  const assets = {
    '/': ['text/html', html], '/index.html': ['text/html', html],
    '/sdk.js': ['text/javascript', sdk],
    '/test-config.js': ['text/javascript', `window.SUPABASE_CONFIG = ${JSON.stringify({ url: API, anonKey: 'test-only-public-key', stateId: 'browser-fixture' })}`],
    ...Object.fromEntries(['app.js', 'styles.css', 'icon.svg', 'manifest.json'].map(file => [`/${file}`, [file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/json', fs.readFileSync(path.join(ROOT, file))]])),
  };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === API) return fixture.handle(route);
    if (url.origin === ORIGIN && assets[url.pathname]) {
      const [contentType, body] = assets[url.pathname];
      return route.fulfill({ contentType, body });
    }
    blocked.push(url.origin + url.pathname);
    return route.abort('blockedbyclient'); // There is deliberately no route.continue().
  });
  await context.addInitScript(({ initial, origin }) => {
    if (location.origin === origin && localStorage.getItem('home-expenses-v1') === null) localStorage.setItem('home-expenses-v1', JSON.stringify(initial));
  }, { initial, origin: ORIGIN });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  page.setDefaultTimeout(8000);
  t.after(async () => {
    try { assert.deepEqual(errors, [], 'unhandled browser errors'); assert.deepEqual(blocked, [], 'unexpected outbound requests'); }
    finally { await context.close(); }
  });
  await page.goto(ORIGIN);
  await page.waitForFunction(() => document.querySelector('#syncStatus').textContent.includes('Sincronizado'));
  return page;
}
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('home-expenses-v1')));
async function period(page) { await page.locator('#periodStart').fill('2026-09-14'); await page.locator('#periodEnd').fill('2026-09-20'); await page.locator('#periodEnd').press('Tab'); }
async function sync(page) { await page.evaluate(() => pushStateToSupabase()); }
async function add(page, amount, payer = 'Eze') {
  await page.locator('#loadViewButton').click();
  await page.locator('#expenseAmount').fill(String(amount));
  await page.locator('#expenseDate').fill('2026-09-14');
  await page.locator('#expensePayer').selectOption(payer);
  await page.locator('#expenseNote').fill('Compra de ensayo');
  await page.locator('#commonSubmitButton').click();
}

test('real form preserves payer across remote render and owner change survives reload', { timeout: 30000 }, async t => {
  const fixture = apiFixture(); const page = await device(t, fixture);
  await page.locator('#expensePayer').selectOption('Eze');
  await sync(page); await page.setViewportSize({ width: 412, height: 844 });
  assert.equal(await page.locator('#expensePayer').inputValue(), 'Eze');
  await add(page, 100); await sync(page);
  assert.equal((await stored(page)).expenses[0].payer, 'Eze');
  await page.locator('#settingsOpenButton').click();
  const section = page.locator('details').filter({ has: page.locator('#peopleForm') });
  if (!await section.evaluate(el => el.open)) await section.locator('summary').click();
  await page.locator('#deviceOwnerSelect').selectOption('Eze');
  await page.locator('#peopleForm button[type=submit]').click(); await sync(page); await page.reload();
  await page.waitForFunction(() => document.querySelector('#commonPayerLabel').textContent === 'Eze');
  assert.equal((await stored(page)).deviceOwner, 'Eze');
  assert.ok(!Object.hasOwn(fixture.data, 'deviceOwner'));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
});

test('real SDK conditional requests preserve edits from two separate browser devices', { timeout: 30000 }, async t => {
  const fixture = apiFixture(); const a = await device(t, fixture); const b = await device(t, fixture, { ...empty(), deviceOwner: 'Eze' }, 1280);
  fixture.offline(true);
  await add(a, 100, 'Tami'); await add(b, 200, 'Eze');
  await Promise.all([sync(a), sync(b)]);
  assert.match(await a.locator('#syncStatus').textContent(), /Reintentando/);
  fixture.offline(false); fixture.raceNextTwoReads();
  await Promise.all([sync(a), sync(b)]);
  await sync(a); await sync(b);
  assert.deepEqual(fixture.data.expenses.map(e => e.amount).sort((a, b) => a - b), [100, 200]);
  assert.equal((await stored(a)).expenses.length, 2); assert.equal((await stored(b)).expenses.length, 2);
  assert.ok(fixture.requests.some(r => r.method === 'PATCH' && r.filter?.startsWith('eq.')));
});

test('browser backup import rejects malformed file and retains local data when combining', { timeout: 30000 }, async t => {
  const fixture = apiFixture(); const page = await device(t, fixture, { ...empty(), expenses: [expense('original')] });
  const before = await stored(page);
  await page.locator('#importBackupInput').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"data":{}}') });
  await page.waitForFunction(() => document.querySelector('#backupStatus').textContent.includes('No se importó'));
  assert.deepEqual(await stored(page), before);
  await page.locator('#importBackupInput').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, app: 'gastos-del-hogar', data: { ...empty(), expenses: [expense('imported', 200)] } })) });
  await page.waitForFunction(() => document.querySelector('#backupStatus').textContent.includes('Backup combinado'));
  assert.equal((await stored(page)).expenses.length, 2);
  assert.equal(await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('before-import')).length), 1);
  await sync(page);
});

test('browser closes, edits and adjusts without losing history or doubling transfer', { timeout: 30000 }, async t => {
  const fixture = apiFixture(); const page = await device(t, fixture, { ...empty(), expenses: [expense('original')] });
  await period(page); await page.locator('#summaryViewButton').click(); await page.locator('#settleWeekButton').click();
  assert.equal((await stored(page)).settlements.length, 1);
  await page.locator('#movementsViewButton').click();
  await page.locator('[data-edit-id="original"]').click();
  await page.locator('#expenseAmount').fill('140');
  await page.setViewportSize({ width: 412, height: 844 }); await sync(page);
  assert.equal(await page.locator('#expensePayer').inputValue(), 'Eze');
  await page.locator('#commonSubmitButton').click();
  await page.locator('#summaryViewButton').click();
  assert.match(await page.locator('#settlementText').textContent(), /20/);
  assert.match(await page.locator('#settlementBreakdown').textContent(), /solo la diferencia/);
  await page.locator('#settleWeekButton').click();
  assert.equal((await stored(page)).settlements.length, 2);
  assert.equal((await stored(page)).settlements[0].adjustment.amount, 20);
  await page.locator('#periodStart').fill('2026-09-01'); await page.locator('#periodEnd').fill('2026-09-30'); await page.locator('#summaryViewButton').click();
  assert.match(await page.locator('#settlementText').textContent(), /superpuestos/);
  await page.locator('#settleWeekButton').click();
  assert.equal((await stored(page)).settlements.length, 2);
  fs.mkdirSync(path.join(ROOT, '.test-artifacts'), { recursive: true });
  await page.locator('#historyViewButton').click();
  await page.screenshot({ path: path.join(ROOT, '.test-artifacts/history-mobile.png'), fullPage: true });
  await sync(page);
});

test('real full render handles future installments and monthly recurring budgets', { timeout: 30000 }, async t => {
  const future = new Date(); future.setMonth(future.getMonth() + 2, 1);
  const month = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}`;
  const fixture = apiFixture();
  const page = await device(t, fixture, { ...empty(), budgets: { Otros: 700 }, recurringExpenses: [{ ...expense('weekly'), frequency: 'weekly', note: 'Ensayo' }], personalExpenses: [{ ...expense('future', 1200), owner: 'Tami', installments: 12, firstInstallmentMonth: month }] });
  await page.locator('#personalTabButton').click(); await page.locator('#installmentsViewButton').click();
  assert.match(await page.locator('#installmentsDebtTotal').textContent(), /1\.200/);
  assert.match(await page.locator('#installmentsMonthTotal').textContent(), /0/);
  await page.locator('#commonTabButton').click();
  await page.locator('#periodStart').fill('2026-09-01'); await page.locator('#periodEnd').fill('2026-09-30'); await page.locator('#movementsViewButton').click();
  await page.locator('#applyRecurringButton').click(); await page.locator('#applyRecurringButton').click();
  assert.equal((await stored(page)).expenses.length, 4);
  await page.locator('#summaryViewButton').click();
  assert.match(await page.locator('#budgetList').textContent(), /3\.000/);
  await sync(page);
});

test('browser upgrades a valid pre-id local state and synchronizes it without data loss', { timeout: 30000 }, async t => {
  const fixture = apiFixture();
  const legacy = { ...empty(), expenses: [
    { date: '2026-09-14', payer: 'Eze', category: 'Otros', amount: 90, note: 'Registro anterior' },
    { date: '2026-09-15', payer: 'Tami', category: 'Servicios', amount: 110, note: 'Otro registro anterior' },
  ] };
  const page = await device(t, fixture, legacy);
  const active = await page.evaluate(() => structuredClone(state));
  assert.equal(active.expenses.length, 2);
  assert.ok(active.expenses.every(item => item.id.startsWith('legacy:expenses:')));
  assert.deepEqual(fixture.data.expenses.map(item => item.amount).sort((a, b) => a - b), [90, 110]);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#syncStatus').textContent.includes('Sincronizado'));
  const reloaded = await page.evaluate(() => structuredClone(state));
  assert.deepEqual(reloaded.expenses.map(item => item.id), active.expenses.map(item => item.id));
});
