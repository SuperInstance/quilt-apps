const test = require('node:test');
const assert = require('node:assert');
const { createGrid, setPixel, fillRect, clearGrid, drawText, saveTemplate, loadTemplate, listTemplates, render, pixelWitnessCount, totalWitnesses } = require('../dist/index.js');

test('grid: create empty 16x16', () => {
  const g = createGrid();
  assert.equal(g.width, 16);
  assert.equal(g.height, 16);
  assert.equal(totalWitnesses(g), 256); // 1 BIND per pixel
});

test('grid: create custom size', () => {
  const g = createGrid(8, 8);
  assert.equal(g.width, 8);
  assert.equal(g.height, 8);
});

test('grid: setPixel updates state and witness', () => {
  const g = createGrid(8, 8);
  setPixel(g, 2, 3, 1, [255, 0, 0]);
  assert.equal(g.pixels[3][2].state, 1);
  assert.equal(pixelWitnessCount(g, 2, 3), 2); // BIND + EFFECT
});

test('grid: setPixel rejects out-of-bounds', () => {
  const g = createGrid(8, 8);
  assert.equal(setPixel(g, 100, 100, 1), false);
  assert.equal(setPixel(g, -1, 0, 1), false);
});

test('grid: fillRect counts cells affected', () => {
  const g = createGrid(16, 16);
  const n = fillRect(g, 0, 0, 4, 4, 1, [0, 255, 0]);
  assert.equal(n, 16);
});

test('grid: clearGrid sets all to 0', () => {
  const g = createGrid(8, 8);
  fillRect(g, 0, 0, 8, 8, 1, [255, 0, 0]);
  clearGrid(g);
  let any = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (g.pixels[y][x].state !== 0) any++;
  assert.equal(any, 0);
});

test('grid: drawText renders "HI"', () => {
  const g = createGrid(32, 8);
  drawText(g, 'HI', 0, 0);
  // Some pixels lit
  let lit = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 32; x++) if (g.pixels[y][x].state === 1) lit++;
  assert.ok(lit > 10);
});

test('grid: save and load template', () => {
  const g = createGrid(8, 8);
  drawText(g, 'A', 0, 0);
  saveTemplate(g, 'greeting');
  clearGrid(g);
  let lit = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (g.pixels[y][x].state === 1) lit++;
  assert.equal(lit, 0);
  loadTemplate(g, 'greeting');
  lit = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (g.pixels[y][x].state === 1) lit++;
  assert.ok(lit > 5);
});

test('grid: listTemplates returns names', () => {
  const g = createGrid();
  saveTemplate(g, 'a');
  saveTemplate(g, 'b');
  const names = listTemplates(g);
  assert.deepEqual(names.sort(), ['a', 'b']);
});

test('grid: render outputs ASCII', () => {
  const g = createGrid(8, 8);
  fillRect(g, 2, 2, 4, 4, 1, [255, 0, 0]);
  const r = render(g);
  const lines = r.split('\n').filter(l => l.length > 0);
  assert.equal(lines.length, 8);
  assert.match(lines[2], /█{4}/);
});
