const test = require('node:test');
const assert = require('node:assert');
const { createPatchWall, addPoint, linkPoints, upstream, downstream, impact, importCSV, toJSON, renderGraph, pointCount, linkCount, blastRadius, rootPoints, leafPoints } = require('../dist/index.js');

test('patchwall: create empty cell', () => {
  const c = createPatchWall();
  assert.equal(pointCount(c), 0);
  assert.equal(linkCount(c), 0);
});

test('patchwall: addPoint stores by tag', () => {
  const c = createPatchWall();
  const p = addPoint(c, 'TI_001', 'sensor', 'Reactor 1', 'Temperature indicator');
  assert.equal(p.tag, 'TI_001');
  assert.equal(p.type, 'sensor');
  assert.equal(c.points.size, 1);
});

test('patchwall: linkPoints creates witness', () => {
  const c = createPatchWall();
  addPoint(c, 'A', 'sensor', 'x');
  addPoint(c, 'B', 'tag', 'y');
  assert.equal(linkPoints(c, 'A', 'B', 'feeds'), true);
  assert.equal(c.links.length, 1);
});

test('patchwall: linkPoints rejects unknown tag', () => {
  const c = createPatchWall();
  addPoint(c, 'A', 'sensor', 'x');
  assert.equal(linkPoints(c, 'A', 'NOTEXIST', 'feeds'), false);
});

test('patchwall: upstream walks back via links', () => {
  const c = createPatchWall();
  addPoint(c, 'SENSOR', 'sensor', 'field');
  addPoint(c, 'TAG', 'tag', 'plc');
  addPoint(c, 'SCADA', 'consumer', 'control room');
  linkPoints(c, 'SENSOR', 'TAG', 'feeds');
  linkPoints(c, 'TAG', 'SCADA', 'feeds');
  const up = upstream(c, 'SCADA');
  assert.ok(up.some(p => p.tag === 'TAG'));
  assert.ok(up.some(p => p.tag === 'SENSOR'));
});

test('patchwall: downstream walks forward via links', () => {
  const c = createPatchWall();
  addPoint(c, 'SENSOR', 'sensor', 'field');
  addPoint(c, 'TAG', 'tag', 'plc');
  addPoint(c, 'SCADA', 'consumer', 'control room');
  linkPoints(c, 'SENSOR', 'TAG', 'feeds');
  linkPoints(c, 'TAG', 'SCADA', 'feeds');
  const ds = downstream(c, 'SENSOR');
  assert.ok(ds.some(p => p.tag === 'TAG'));
  assert.ok(ds.some(p => p.tag === 'SCADA'));
});

test('patchwall: impact identifies direct vs cascade', () => {
  const c = createPatchWall();
  addPoint(c, 'A', 'sensor', 'x');
  addPoint(c, 'B', 'tag', 'y');
  addPoint(c, 'C', 'tag', 'y');
  addPoint(c, 'D', 'consumer', 'z');
  linkPoints(c, 'A', 'B', 'feeds');
  linkPoints(c, 'A', 'C', 'feeds');
  linkPoints(c, 'B', 'D', 'feeds');
  linkPoints(c, 'C', 'D', 'feeds');
  const imp = impact(c, 'A');
  assert.equal(imp.direct.length, 2);  // B and C
  assert.equal(imp.cascade.length, 1); // D (downstream of both B and C)
});

test('patchwall: importCSV adds points and links', () => {
  const c = createPatchWall();
  const csv = `# header
TI_001,sensor,Reactor,Temperature sensor,TI_TAG:feeds
TI_TAG,tag,PLC,Tag for TI_001,TI_ALARM:alarms|HMI:feeds
TI_ALARM,alarm,PLC,High temperature alarm,
HMI,consumer,Control Room,HMI display,`;
  const added = importCSV(c, csv);
  assert.ok(added >= 4);
  assert.ok(linkCount(c) >= 2);
});

test('patchwall: toJSON roundtrips shape', () => {
  const c = createPatchWall();
  addPoint(c, 'A', 'sensor', 'x');
  addPoint(c, 'B', 'tag', 'y');
  linkPoints(c, 'A', 'B', 'feeds');
  const j = toJSON(c);
  assert.equal(j.points.length, 2);
  assert.equal(j.links.length, 1);
});

test('patchwall: renderGraph produces readable output', () => {
  const c = createPatchWall();
  addPoint(c, 'SENSOR_A', 'sensor', 'Field');
  addPoint(c, 'TAG_A', 'tag', 'PLC');
  linkPoints(c, 'SENSOR_A', 'TAG_A', 'feeds');
  const r = renderGraph(c);
  assert.match(r, /SENSOR_A/);
  assert.match(r, /TAG_A/);
});

test('patchwall: blastRadius returns all downstream', () => {
  const c = createPatchWall();
  addPoint(c, 'A', 'sensor', 'x');
  addPoint(c, 'B', 'tag', 'y');
  addPoint(c, 'C', 'consumer', 'z');
  linkPoints(c, 'A', 'B', 'feeds');
  linkPoints(c, 'B', 'C', 'feeds');
  const blast = blastRadius(c, 'A');
  assert.equal(blast.length, 2);
});

test('patchwall: rootPoints finds sensors with no upstream', () => {
  const c = createPatchWall();
  addPoint(c, 'A', 'sensor', 'x');
  addPoint(c, 'B', 'tag', 'y');
  addPoint(c, 'C', 'sensor', 'z');
  linkPoints(c, 'A', 'B', 'feeds');
  const roots = rootPoints(c);
  assert.ok(roots.some(p => p.tag === 'A'));
  assert.ok(roots.some(p => p.tag === 'C'));
  assert.equal(roots.find(p => p.tag === 'B'), undefined);
});

test('patchwall: leafPoints finds consumers with no downstream', () => {
  const c = createPatchWall();
  addPoint(c, 'A', 'sensor', 'x');
  addPoint(c, 'B', 'tag', 'y');
  addPoint(c, 'C', 'consumer', 'z');
  linkPoints(c, 'A', 'B', 'feeds');
  linkPoints(c, 'B', 'C', 'feeds');
  const leaves = leafPoints(c);
  assert.ok(leaves.some(p => p.tag === 'C'));
  assert.equal(leaves.find(p => p.tag === 'A'), undefined);
});
