const test = require('node:test');
const assert = require('node:assert');
const { createInventoryGuardian, restock, sell, lowStock, expiringSoon, expired, alerts, summary, witnessLog } = require('../dist/index.js');

test('inventory: create with bins and witness logs', () => {
  const cell = createInventoryGuardian([
    { name: 'tomatoes', count: 10, expiryMs: Date.now() + 24 * 3600 * 1000, addedAt: Date.now() },
    { name: 'lettuce', count: 3, expiryMs: Date.now() + 48 * 3600 * 1000, addedAt: Date.now() }
  ]);
  assert.equal(cell.bins.length, 2);
  assert.equal(witnessLog(cell, 0).length, 1);
});

test('inventory: restock increments count + witness', () => {
  const cell = createInventoryGuardian([{ name: 'apples', count: 5, expiryMs: Date.now() + 86400000, addedAt: Date.now() }]);
  restock(cell, 0, 3);
  assert.equal(cell.bins[0].count, 8);
  assert.equal(witnessLog(cell, 0).length, 2);
});

test('inventory: sell decrements, fails when count < n', () => {
  const cell = createInventoryGuardian([{ name: 'bananas', count: 2, expiryMs: Date.now() + 86400000, addedAt: Date.now() }]);
  assert.equal(sell(cell, 0, 1), true);
  assert.equal(cell.bins[0].count, 1);
  assert.equal(sell(cell, 0, 5), false);
  assert.equal(cell.bins[0].count, 1);
});

test('inventory: lowStock returns below-threshold bins', () => {
  const cell = createInventoryGuardian([
    { name: 'a', count: 10, expiryMs: Date.now() + 86400000, addedAt: Date.now() },
    { name: 'b', count: 2, expiryMs: Date.now() + 86400000, addedAt: Date.now() }
  ], 5);
  const low = lowStock(cell);
  assert.equal(low.length, 1);
  assert.equal(low[0].name, 'b');
});

test('inventory: alerts cover all 3 categories', () => {
  const now = Date.now();
  const cell = createInventoryGuardian([
    { name: 'low', count: 1, expiryMs: now + 86400000, addedAt: now },
    { name: 'expiring', count: 10, expiryMs: now + 2 * 3600 * 1000, addedAt: now },
    { name: 'expired', count: 5, expiryMs: now - 86400000, addedAt: now },
    { name: 'ok', count: 10, expiryMs: now + 86400000, addedAt: now }
  ], 5, 24 * 3600 * 1000);
  const a = alerts(cell, now);
  assert.equal(a.length, 3);
  assert.ok(a.some(x => x.type === 'LOW_STOCK'));
  assert.ok(a.some(x => x.type === 'EXPIRING'));
  assert.ok(a.some(x => x.type === 'EXPIRED'));
});

test('inventory: summary is human-readable', () => {
  const cell = createInventoryGuardian();
  const s = summary(cell);
  assert.match(s, /Inventory Guardian:/);
  assert.match(s, /bins/);
});
