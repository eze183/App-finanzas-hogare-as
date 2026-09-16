const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = process.env.PROTOTYPE_URL || 'http://127.0.0.1:8765/prototipo-analisis/';
let browser;

before(async () => { browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'chrome', headless: true }); });
after(async () => { await browser?.close(); });

test('separa comunes y cuotas personales al importar', async () => {
  const page = await browser.newPage();
  const fixture = path.join(os.tmpdir(), `prototipo-finanzas-${process.pid}.json`);
  fs.writeFileSync(fixture, JSON.stringify({ data: {
    people: ['Eze', 'Tami'],
    expenses: [{ id: 'c1', date: '2026-08-10', payer: 'Eze', category: 'Supermercado', amount: 100000 }],
    personalExpenses: [{ id: 'p1', date: '2026-08-10', owner: 'Eze', category: 'Otros', amount: 120000, note: 'Zapatillas', installments: 3, firstInstallmentMonth: '2026-08' }],
  } }));
  try {
    await page.goto(URL);
    await page.locator('#backupInput').setInputFiles(fixture);
    await assert.doesNotReject(() => page.getByText('$\u00a0100.000').first().waitFor());
    assert.doesNotMatch(await page.locator('#commonView').innerText(), /Ingreso disponible|Resto estimado|Zapatillas/);
    await page.locator('#personalTab').click();
    const ezeCard = page.locator('#personalHeadline');
    assert.match(await ezeCard.innerText(), /\$\s*50\.000/);
    assert.match(await ezeCard.innerText(), /\$\s*40\.000/);
    assert.match(await page.locator('#comparisonRows').innerText(), /\$\s*90\.000/);
    assert.match(await page.locator('#personalColumns').innerText(), /Zapatillas[\s\S]*cuota de 3[\s\S]*\$\s*40\.000/);
    assert.doesNotMatch(await page.locator('#categoryTable').innerText(), /Zapatillas|Otros/);
  } finally {
    await page.close();
    fs.rmSync(fixture, { force: true });
  }
});

test('el respaldo real reproduce los totales auditados de agosto', { skip: !process.env.BACKUP_PATH }, async () => {
  const page = await browser.newPage();
  try {
    await page.goto(URL);
    await page.locator('#backupInput').setInputFiles(process.env.BACKUP_PATH);
    await page.locator('#monthSelect').selectOption('2026-08');
    const headline = await page.locator('#headlineCards').innerText();
    assert.match(headline, /Gasto común total[\s\S]*\$\s*1\.829\.593/);
    assert.doesNotMatch(headline, /Ingreso|Resto|personales/);
    await page.locator('#personalTab').click();
    // Además de los $460.850 comprados en agosto, el flujo personal incluye
    // $66.582 de cuotas iniciadas en meses anteriores y pagaderas en agosto.
    const privateHeadline = await page.locator('#personalHeadline').innerText();
    assert.match(privateHeadline, /Parte de gastos comunes[\s\S]*\$\s*914\.796/);
    assert.match(privateHeadline, /Gastos personales del mes[\s\S]*\$\s*527\.432/);
  } finally {
    await page.close();
  }
});

test('la maqueta completa conserva privacidad y navegación móvil', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(URL);
    assert.equal(await page.locator('#historyTab').isVisible(), true);
    assert.equal(await page.locator('#installmentsTab').isVisible(), false);
    await page.locator('#personalTab').click();
    assert.equal(await page.locator('#historyTab').isVisible(), false);
    assert.equal(await page.locator('#installmentsTab').isVisible(), true);
    await page.locator('[data-section="load"]').click();
    assert.match(await page.locator('#entryTitle').innerText(), /Cargar gasto personal/);
    assert.equal(await page.locator('#personalView').isVisible(), false);
    await page.locator('#installmentToggle').check();
    assert.equal(await page.locator('#installmentFields').isVisible(), true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    assert.equal(overflow, false);
  } finally {
    await page.close();
  }
});

test('movimientos filtra y ordena por importe o fecha', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(URL);
    await page.locator('[data-section="movements"]').click();
    await page.locator('#movementSort').selectOption('amount-asc');
    assert.match(await page.locator('.movement-item .movement-amount').first().innerText(), /29\.300/);
    await page.locator('#movementSort').selectOption('amount-desc');
    assert.match(await page.locator('.movement-item .movement-amount').first().innerText(), /546\.917/);
    await page.locator('#movementCategoryFilter').selectOption({ label: 'Servicios' });
    assert.match(await page.locator('#movementSummary').innerText(), /1 de 11/);
    await page.locator('#clearMovementFilters').click();
    assert.equal(await page.locator('#movementSort').inputValue(), 'date-desc');
  } finally {
    await page.close();
  }
});
