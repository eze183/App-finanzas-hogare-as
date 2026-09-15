const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8').replace(/\ninit\(\);\s*$/, '\n');
const clone = value => JSON.parse(JSON.stringify(value));
const expense = (id, overrides = {}) => ({ id, date: '2026-09-14', payer: 'Eze', category: 'Otros', amount: 100, createdAt: 1, updatedAt: 1, ...overrides });
const empty = () => ({ people: ['Eze', 'Tami'], peopleUpdatedAt: 0, deviceOwner: 'Tami', expenses: [], personalExpenses: [], recurringExpenses: [], settlements: [], budgets: {}, personalBudgets: {}, budgetsUpdatedAt: 0, personalBudgetsUpdatedAt: 0 });

function app(initial = empty()) {
  const storage = new Map([['home-expenses-v1', JSON.stringify(initial)]]);
  const nodes = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const alerts = [];
  const context = vm.createContext({
    console: { error() {} }, structuredClone, Intl, Date, Math, Map, Set, Blob, URL, AbortController,
    crypto: require('node:crypto').webcrypto,
    fetch() { throw new Error('NETWORK FORBIDDEN'); },
    window: { SUPABASE_CONFIG: { url: 'https://mock.invalid', anonKey: 'fake', stateId: 'test' } },
    document: { querySelectorAll() { return []; }, querySelector(id) {
      if (!nodes.has(id)) nodes.set(id, { value: '', textContent: '', className: '', classList: { toggle() {}, add() {}, remove() {} }, reset() {}, focus() {}, set innerHTML(v) { this.html = v; this.value = ''; }, get innerHTML() { return this.html || ''; } });
      return nodes.get(id);
    } },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id), setInterval() {}, clearInterval() {},
    alert: message => alerts.push(message), confirm: () => true,
  });
  vm.runInContext(source, context);
  // No init(), SDK, HTML, service worker, browser profile, or production config is loaded.
  vm.runInContext('render = () => {}; setAppView = () => {}; closeSettings = () => {}; showExpenseToast = () => {};', context);
  return { context, storage, nodes, timers, alerts,
    run: code => vm.runInContext(code, context),
    state: () => clone(vm.runInContext('state', context)),
    set(value) { context.input = clone(value); vm.runInContext('state = normalizeState(input)', context); },
  };
}

function mockServer(initial) {
  let row = initial ? { data: clone(initial), updated_at: '2026-09-01T00:00:00.000Z' } : null;
  let reads = 0, writes = 0, failures = 0, beforeWrite;
  return {
    get row() { return clone(row); }, get reads() { return reads; }, get writes() { return writes; },
    fail(count) { failures = count; }, onWrite(fn) { beforeWrite = fn; },
    client: { from(table) {
      assert.equal(table, 'app_state');
      const filters = {}; let operation = 'read', payload;
      const query = {
        abortSignal() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        update(value) { operation = 'update'; payload = value; return query; },
        insert(value) { operation = 'insert'; payload = value; return query; },
        async maybeSingle() { reads++; if (failures-- > 0) return { error: new Error('offline') }; return { data: row && clone(row) }; },
        select() {
          if (operation === 'read') return query;
          return (async () => {
            if (beforeWrite) { const fn = beforeWrite; beforeWrite = null; await fn(); }
            if (operation === 'insert' && row) return { error: { code: '23505' } };
            if (operation === 'update' && (!row || filters.updated_at !== row.updated_at)) return { data: [] };
            row = clone(payload); writes++;
            return { data: [{ updated_at: row.updated_at }] };
          })();
        },
      };
      return query;
    } },
  };
}
function connect(a, server) { a.context.client = server.client; a.run('supabaseClient = client'); }

test('two devices racing preserve both expenses (conditional write conflict)', async () => {
  const server = mockServer(empty()); const a = app(), b = app();
  a.set({ ...empty(), expenses: [expense('a')] }); b.set({ ...empty(), expenses: [expense('b')] });
  connect(a, server); connect(b, server);
  await Promise.all([a.run('pushStateToSupabase()'), b.run('pushStateToSupabase()')]);
  assert.deepEqual(server.row.data.expenses.map(e => e.id).sort(), ['a', 'b']);
  await a.run('pullStateFromSupabase()');
  assert.equal(a.state().expenses.length, 2);
});

test('concurrent first insert never upserts over another device', async () => {
  const server = mockServer(null); const a = app(), b = app();
  a.set({ ...empty(), expenses: [expense('a')] }); b.set({ ...empty(), expenses: [expense('b')] });
  connect(a, server); connect(b, server);
  await Promise.all([a.run('pushStateToSupabase()'), b.run('pushStateToSupabase()')]);
  assert.equal(server.row.data.expenses.length, 2);
});

test('save and pull during a write are serialized and latest edit is sent', async () => {
  const a = app({ ...empty(), expenses: [expense('a')] }); const server = mockServer(empty()); connect(a, server);
  server.onWrite(async () => { a.run('state.expenses.push({ ...state.expenses[0], id: "during" }); saveState()'); await a.run('pullStateFromSupabase()'); });
  await a.run('pushStateToSupabase()');
  assert.equal(server.row.data.expenses.length, 2);
  assert.equal(a.state().expenses.length, 2);
});

test('network failure schedules increasing retries and restart resends local data', async () => {
  const a = app({ ...empty(), expenses: [expense('offline')] }); const server = mockServer(empty()); connect(a, server); server.fail(2);
  await a.run('pushStateToSupabase()');
  assert.equal([...a.timers.values()].at(-1).delay, 1000);
  await [...a.timers.values()].at(-1).fn();
  assert.equal([...a.timers.values()].at(-1).delay, 2000);
  const restarted = app(JSON.parse(a.storage.get('home-expenses-v1'))); connect(restarted, server);
  await restarted.run('pullStateFromSupabase()');
  assert.equal(server.row.data.expenses[0].id, 'offline');
});

test('invalid remote snapshot never overwrites local or remote state', async () => {
  const a = app({ ...empty(), expenses: [expense('local')] }); const server = mockServer({ expenses: 'bad' }); connect(a, server);
  await a.run('pushStateToSupabase()');
  assert.equal(server.writes, 0); assert.equal(a.state().expenses[0].id, 'local');
  assert.equal(a.run('cloudDirty'), true);
});

test('old tombstone survives sync with an offline copy', () => {
  const a = app({ ...empty(), expenses: [expense('deleted', { deletedAt: 1 })] });
  a.context.remote = { ...empty(), expenses: [expense('deleted', { updatedAt: Date.now() })] };
  const merged = a.run('mergeCloudState(remote)');
  assert.equal(merged.expenses[0].deletedAt, 1);
});

test('backup validation rejects corrupt records without silent filtering', () => {
  const a = app();
  const variants = [null, {}, { ...empty(), expenses: 'bad' }, { ...empty(), people: ['Eze', 'Eze'] },
    ...[{ date: '2026-02-30' }, { amount: Infinity }, { amount: '100' }, { id: '<script>' }, { note: {} }, { installments: 1.5 }, { firstInstallmentMonth: '2026-13' }].map(change => ({ ...empty(), expenses: [expense('bad', change)] })),
    { ...empty(), expenses: [expense('dup'), expense('dup')] }, { ...empty(), budgets: { Otros: -1 } },
    { version: 2, app: 'gastos-del-hogar', data: empty() }, { version: 1, app: 'other', data: empty() }];
  for (const data of variants) { a.context.input = data; assert.throws(() => a.run('parseBackup(input)')); }
  a.context.input = { version: 1, app: 'gastos-del-hogar', data: { ...empty(), expenses: [expense('ok')] } };
  assert.equal(a.run('parseBackup(input).expenses.length'), 1);
});

test('backup combines records, preserves local owner, and saves pre-import snapshot', async () => {
  const a = app({ ...empty(), expenses: [expense('local')] });
  const imported = { ...empty(), deviceOwner: 'Eze', expenses: [expense('imported')] };
  a.context.event = { target: { files: [{ size: 100, text: async () => JSON.stringify({ version: 1, app: 'gastos-del-hogar', data: imported }) }] } };
  await a.run('handleImportBackup(event)');
  assert.equal(a.state().expenses.length, 2); assert.equal(a.state().deviceOwner, 'Tami');
  assert.equal([...a.storage.keys()].filter(k => k.includes('before-import')).length, 1);
});

test('backup aborts without mutation if recovery storage is full or household differs', async () => {
  for (const full of [true, false]) {
    const a = app({ ...empty(), expenses: [expense('local')] }); const before = a.state();
    const imported = full ? empty() : { ...empty(), people: ['Ana', 'Luis'] };
    if (full) a.context.localStorage.setItem = () => { throw new Error('quota'); };
    a.context.event = { target: { files: [{ text: async () => JSON.stringify(imported) }] } };
    await a.run('handleImportBackup(event)'); assert.deepEqual(a.state(), before);
  }
});

test('render preserves payer and recurring payer including edit exceptions', () => {
  const a = app(); a.run('elements.expensePayer.value = "Eze"; elements.recurringPayer.value = "Tami"; renderPeople(); renderPeople()');
  assert.equal(a.run('elements.expensePayer.value'), 'Eze'); assert.equal(a.run('elements.recurringPayer.value'), 'Tami');
});

test('owner can change Tami to Eze, including a simultaneous rename', () => {
  const a = app(); a.run('elements.personAInput.value="Eze"; elements.personBInput.value="Tami"; elements.deviceOwnerSelect.value="Eze"; handlePeopleSubmit({preventDefault(){}})');
  assert.equal(a.state().deviceOwner, 'Eze');
  a.run('elements.personAInput.value="Eze nuevo"; elements.personBInput.value="Tami nueva"; elements.deviceOwnerSelect.value="Tami"; handlePeopleSubmit({preventDefault(){}})');
  assert.equal(a.state().deviceOwner, 'Tami nueva');
});

test('remote rename keeps device owner in their original slot', () => {
  const a = app(); a.context.remote = { ...empty(), people: ['Eze nuevo', 'Tami nueva'], peopleUpdatedAt: 100 };
  assert.equal(a.run('mergeCloudState(remote).deviceOwner'), 'Tami nueva');
});

test('future installments are debt but are not due this month', () => {
  const a = app({ ...empty(), personalExpenses: [{ ...expense('future'), owner: 'Tami', amount: 1200, installments: 12, firstInstallmentMonth: '2026-11' }] });
  const snapshot = a.run('getInstallmentsSnapshot(new Date(2026, 8, 14))');
  assert.equal(snapshot.monthTotal, 0); assert.equal(snapshot.debtTotal, 1200);
  assert.equal(snapshot.lastMonthWithDebt, a.run('monthIndexFromKey("2027-10")'));
});

test('monthly and weekly recurring occurrences are idempotent across overlapping ranges', () => {
  const a = app({ ...empty(), recurringExpenses: [expense('weekly', { note: 'test', frequency: 'weekly' }), expense('monthly', { note: 'test', frequency: 'monthly' })] });
  a.run('setSelectedPeriod(parseISODate("2026-09-01"), parseISODate("2026-10-31")); handleApplyRecurring()');
  const original = a.state().expenses;
  assert.equal(original.filter(e => e.recurringId === 'weekly').length, 8);
  assert.deepEqual(original.filter(e => e.recurringId === 'monthly').map(e => e.date), ['2026-09-01', '2026-10-01']);
  a.run('setSelectedPeriod(parseISODate("2026-09-14"), parseISODate("2026-09-20")); handleApplyRecurring()');
  assert.equal(a.state().expenses.length, 10);
  a.run('state.expenses[0].deletedAt = 1; handleApplyRecurring()');
  assert.equal(a.state().expenses.length, 10);
});

test('weekly budget prorates by inclusive calendar days and preserves saved limits', () => {
  const a = app({ ...empty(), budgets: { Otros: 700 } });
  a.run('setSelectedPeriod(parseISODate("2026-09-01"), parseISODate("2026-09-30")); renderBudgets([], false)');
  assert.equal(a.run('getPeriodDayCount()'), 30); assert.equal(a.state().budgets.Otros, 700);
  assert.match(a.run('elements.budgetList.innerHTML'), /3\.000/);
  a.run('setSelectedPeriod(parseISODate("2026-09-14"), parseISODate("2026-09-20"))');
  assert.equal(a.run('getPeriodDayCount()'), 7);
});

test('settlement revisions preserve previous transfer and record only the difference', () => {
  const a = app({ ...empty(), expenses: [expense('a')] });
  a.run('setSelectedPeriod(parseISODate("2026-09-14"), parseISODate("2026-09-20")); handleSettleWeek()');
  const original = a.state().settlements[0];
  assert.equal(original.amount, 50); assert.equal(original.weekKey, '2026-09-14');
  a.run('state.expenses[0].amount = 140; renderSettlementDetail(getPeriodExpenses(), false)');
  assert.match(a.run('elements.settlementBreakdown.innerHTML'), /Ajuste pendiente/);
  assert.match(a.run('elements.settlementBreakdown.innerHTML'), /20.*solo la diferencia/);
  a.run('handleSettleWeek()');
  const records = a.state().settlements;
  assert.equal(records.length, 2); assert.deepEqual(records[1], original);
  assert.equal(records[0].adjustment.amount, 20); assert.equal(records[0].supersedes, original.id);
  assert.equal(a.run('getActiveSettlements().length'), 1);
  a.run('state.expenses[0].payer="Tami"; handleSettleWeek()');
  assert.equal(a.state().settlements[0].adjustment.amount, 140);
  a.run('handleUnsettleWeek()'); assert.equal(a.run('getActiveSettlements().length'), 0);
  assert.equal(a.state().settlements.length, 3);
});

test('overlapping week/month closes are rejected and concurrent snapshots remain auditable', () => {
  const a = app({ ...empty(), expenses: [expense('a')] });
  a.run('setSelectedPeriod(parseISODate("2026-09-14"), parseISODate("2026-09-20")); handleSettleWeek(); setSelectedPeriod(parseISODate("2026-09-01"), parseISODate("2026-09-30")); handleSettleWeek()');
  assert.equal(a.state().settlements.length, 1); assert.match(a.alerts[0], /superpone/);
  const record = a.state().settlements[0];
  a.context.remote = { ...empty(), settlements: [{ ...record, id: 'concurrent' }] };
  a.run('applyCloudState(remote); renderSettlementHistory()');
  assert.equal(a.state().settlements.length, 2);
  assert.match(a.run('elements.settlementHistory.innerHTML'), /Revisar superposición/);
});

test('same timestamp conflict converges in either merge direction', () => {
  const a = app();
  a.context.left = [expense('same', { amount: 100 })];
  a.context.right = [expense('same', { amount: 200 })];
  assert.equal(a.run('stableJson(mergeRecordLists(left, right))'), a.run('stableJson(mergeRecordLists(right, left))'));
});

test('invalid local state blocks initialization, saving, and sync without changing storage', async () => {
  const a = app({ ...empty(), expenses: 'corrupt' }); const before = a.storage.get('home-expenses-v1');
  const server = mockServer(empty()); connect(a, server);
  await a.run('init()'); await a.run('pushStateToSupabase()');
  assert.throws(() => a.run('saveState()'));
  assert.equal(server.reads, 0); assert.equal(a.storage.get('home-expenses-v1'), before);
});

test('a stalled request times out and queues a retry', async () => {
  const a = app(); let signal;
  const query = { select() { return this; }, eq() { return this; }, abortSignal(value) { signal = value; return this; },
    maybeSingle() { return new Promise((resolve) => signal.addEventListener('abort', () => resolve({ error: new Error('aborted') }))); } };
  a.context.client = { from: () => query }; a.run('supabaseClient = client');
  const pending = a.run('pushStateToSupabase()');
  const timeout = [...a.timers.values()].find(timer => timer.delay === 20000); assert.ok(timeout);
  timeout.fn(); await pending;
  assert.equal(a.run('cloudBusy'), false); assert.equal(a.run('cloudDirty'), true);
  assert.ok([...a.timers.values()].some(timer => timer.delay === 1000));
});

test('deleting every expense allows an immutable zero-total adjustment', () => {
  const a = app({ ...empty(), expenses: [expense('a')] });
  a.run('setSelectedPeriod(parseISODate("2026-09-14"), parseISODate("2026-09-20")); handleSettleWeek(); state.expenses[0].deletedAt = 10; handleSettleWeek()');
  assert.equal(a.state().settlements.length, 2);
  assert.equal(a.state().settlements[0].total, 0);
  assert.equal(a.state().settlements[0].adjustment.amount, 50);
  assert.equal(a.state().settlements[0].adjustment.debtor, 'Eze');
});

test('invalid settlement revision chains are rejected', () => {
  const a = app({ ...empty(), expenses: [expense('a')] });
  a.run('setSelectedPeriod(parseISODate("2026-09-14"), parseISODate("2026-09-20")); handleSettleWeek()');
  const input = a.state(); input.settlements[0].supersedes = 'missing'; a.context.input = input;
  assert.throws(() => a.run('validateStateData(input)'));
});
