const test = require('node:test');
const assert = require('node:assert');
const { createLedger, createInvoiceCell, parseToCSV, validateTaxID, transformCurrency, transmit, openDispute, replay, getCell, cellCount, lineageOf, seal } = require('../dist/index.js');

function makeInvoice(overrides = {}) {
  return Object.assign({
    invoiceId: 'INV-001',
    amount: 1000.00,
    currency: 'USD',
    vendor: 'Acme Corp',
    buyer: 'Beta LLC',
    lineItems: [
      { sku: 'A1', description: 'Widget', quantity: 10, unitPrice: 100 }
    ],
    issuedAt: Date.now()
  }, overrides);
}

test('invoice: create ledger is empty', () => {
  const l = createLedger();
  assert.equal(cellCount(l), 0);
});

test('invoice: create cell with BIND witness', () => {
  const l = createLedger();
  const c = createInvoiceCell(l, makeInvoice());
  assert.ok(c.id.length > 0);
  assert.equal(c.witnesses.length, 1);
  assert.equal(c.witnesses[0].opcode, 'BIND');
  assert.ok(c.payloadHash.length === 16);
});

test('invoice: parseToCSV spawns child cell with PARSE witness', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice());
  const csv = parseToCSV(l, root.id);
  assert.ok(csv);
  assert.equal(csv.parentCellId, root.id);
  assert.equal(csv.witnesses.length, 2);
  assert.equal(csv.witnesses[1].opcode, 'PARSE');
  assert.ok(root.children.includes(csv.id));
});

test('invoice: validateTaxID marks vendor as INVALID on failure', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice());
  const v = validateTaxID(l, root.id, /^[A-Z]{2}-\d{4}$/);
  assert.ok(v);
  assert.equal(v.witnesses[1].opcode, 'VALIDATE');
  assert.equal(v.witnesses[1].data.valid, false);
});

test('invoice: transformCurrency applies rate', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice({ amount: 100, currency: 'USD' }));
  const t = transformCurrency(l, root.id, 'USD', 'EUR', 0.85);
  assert.ok(t);
  assert.ok(Math.abs(t.payload.amount - 85) < 0.01);
  assert.equal(t.payload.currency, 'EUR');
});

test('invoice: transmit seals parent', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice());
  const tx = transmit(l, root.id, 'email');
  assert.ok(tx);
  assert.equal(root.sealed, true);
  assert.equal(tx.witnesses[1].opcode, 'TRANSMIT');
});

test('invoice: cannot modify sealed cell', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice());
  transmit(l, root.id, 'email');
  const csv = parseToCSV(l, root.id);
  assert.equal(csv, null);
});

test('invoice: openDispute adds witness to cell', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice());
  const d = openDispute(l, root.id, 'Wrong amount on line 2');
  assert.ok(d);
  assert.equal(root.witnesses[root.witnesses.length - 1].opcode, 'DISPUTE');
  assert.equal(root.witnesses[root.witnesses.length - 1].data.reason, 'Wrong amount on line 2');
});

test('invoice: replay reconstructs lineage', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice());
  const csv = parseToCSV(l, root.id);
  const t = transformCurrency(l, csv.id, 'USD', 'EUR', 0.9);
  const r = replay(l, t.id);
  assert.equal(r.lineage.length, 3);
  assert.deepEqual(r.transformations.map(x => x.opcode), ['TRANSFORM']);
});

test('invoice: lineageOf walks ancestors', () => {
  const l = createLedger();
  const root = createInvoiceCell(l, makeInvoice());
  const csv = parseToCSV(l, root.id);
  const t = transformCurrency(l, csv.id, 'USD', 'EUR', 0.9);
  const tx = transmit(l, t.id, 'email');
  const lineage = lineageOf(l, tx.id);
  assert.equal(lineage.length, 4);
  assert.equal(lineage[0], root.id);
  assert.equal(lineage[3], tx.id);
});
