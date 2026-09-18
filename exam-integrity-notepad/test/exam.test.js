const test = require('node:test');
const assert = require('node:assert');
const { createSession, createInitialCell, save, seal, exportBundle, verify, detectAnomalies, hashString, hashPayload } = require('../dist/index.js');

test('exam: createSession is empty', () => {
  const s = createSession('E1', 'S1');
  assert.equal(s.cells.length, 0);
  assert.equal(s.rootHash, '0000000000000000');
});

test('exam: createInitialCell binds with root hash as parent', () => {
  const s = createSession('E1', 'S1');
  const c = createInitialCell(s, 'E1', 'S1');
  assert.equal(c.payload.text, '');
  assert.equal(c.parentHash, '0000000000000000');
  assert.ok(c.hash.length === 16);
  assert.equal(s.rootHash, c.hash);
});

test('exam: save appends new cell', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  const c = save(s, 'hello world');
  assert.equal(c.payload.text, 'hello world');
  assert.equal(c.parentCellId, s.cells[s.cells.length - 2].id);
  assert.equal(s.cells.length, 2);
});

test('exam: hash chains correctly', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  const a = save(s, 'one');
  const b = save(s, 'one two');
  assert.equal(b.parentHash, a.hash);
});

test('exam: seal marks all cells sealed', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  save(s, 'draft');
  seal(s);
  assert.ok(s.cells.every(c => c.sealed));
});

test('exam: exportBundle produces verifiable chain', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  save(s, 'draft 1');
  save(s, 'draft 2');
  const bundle = exportBundle(s);
  assert.equal(bundle.examId, 'E1');
  assert.equal(bundle.studentId, 'S1');
  assert.equal(bundle.cellCount, 3);
});

test('exam: verify accepts valid chain', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  save(s, 'a');
  save(s, 'ab');
  const bundle = exportBundle(s);
  const r = verify(bundle);
  assert.equal(r.valid, true);
});

test('exam: verify rejects tampered text', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  save(s, 'a');
  save(s, 'ab');
  const bundle = exportBundle(s);
  // Tamper with one cell's text
  bundle.chain[1].text = 'TAMPERED';
  const r = verify(bundle);
  assert.equal(r.valid, false);
});

test('exam: detectAnomalies flags paste-burst', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  save(s, 'short');
  save(s, 'short ' + 'x'.repeat(100)); // burst of 100 chars
  const anomalies = detectAnomalies(s);
  assert.ok(anomalies.some(a => a.type === 'paste-burst'));
});

test('exam: detectAnomalies flags long-pause', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  save(s, 'a');
  // Manually set interval to simulate
  s.cells[1].payload.typingIntervalMs = 60000;
  const anomalies = detectAnomalies(s);
  assert.ok(anomalies.some(a => a.type === 'long-pause'));
});

test('exam: detectAnomalies flags deletion', () => {
  const s = createSession('E1', 'S1');
  createInitialCell(s, 'E1', 'S1');
  save(s, 'long text here');
  save(s, 'short');  // deletion
  const anomalies = detectAnomalies(s);
  assert.ok(anomalies.some(a => a.type === 'deletion'));
});

test('exam: hashString is deterministic', () => {
  assert.equal(hashString('hello'), hashString('hello'));
  assert.notEqual(hashString('hello'), hashString('world'));
});
