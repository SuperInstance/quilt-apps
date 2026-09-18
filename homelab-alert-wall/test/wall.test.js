const test = require('node:test');
const assert = require('node:assert');
const { createAlertWall, addSensor, ingestReading, classifyReading, setCorrelation, correlatedAlerts, evaluate, renderLCD16x2, buzzerPulses, statusSummary } = require('../dist/index.js');

test('wall: create empty wall', () => {
  const w = createAlertWall();
  assert.equal(w.sensors.size, 0);
  assert.equal(w.alerts.length, 0);
});

test('wall: addSensor creates cell with BIND witness', () => {
  const w = createAlertWall();
  const s = addSensor(w, 'temp-r1', 'temp', 'proxmox-1', 'Rack 1', 60, 75);
  assert.equal(s.witnesses.length, 1);
  assert.equal(s.witnesses[0].type, 'BIND');
  assert.equal(s.threshold.warn, 60);
});

test('wall: ingestReading updates current + history', () => {
  const w = createAlertWall();
  addSensor(w, 'temp-r1', 'temp', 'proxmox-1', 'Rack 1', 60, 75);
  ingestReading(w, 'temp-r1', 55.2, '°C');
  assert.equal(w.sensors.get('temp-r1').current.value, 55.2);
  assert.equal(w.sensors.get('temp-r1').history.length, 1);
});

test('wall: classifyReading returns ok/warn/crit', () => {
  const w = createAlertWall();
  const s = addSensor(w, 'temp-r1', 'temp', 'proxmox-1', 'Rack 1', 60, 75);
  assert.equal(classifyReading(s, 50), 'ok');
  assert.equal(classifyReading(s, 65), 'warn');
  assert.equal(classifyReading(s, 80), 'crit');
});

test('wall: classifyReading for ping is reversed', () => {
  const w = createAlertWall();
  const s = addSensor(w, 'ping-gw', 'ping', 'router', 'gateway', 100, 500);
  assert.equal(classifyReading(s, 50), 'ok');
  assert.equal(classifyReading(s, 200), 'warn');
  assert.equal(classifyReading(s, 1000), 'crit');
});

test('wall: setCorrelation links two sensors', () => {
  const w = createAlertWall();
  addSensor(w, 'temp-r1', 'temp', 'p1', 'rack', 60, 75);
  addSensor(w, 'cpu-r1', 'cpu', 'p1', 'rack', 80, 95);
  setCorrelation(w, 'temp-r1', 'cpu-r1');
  assert.ok(w.correlations.get('temp-r1').includes('cpu-r1'));
  assert.ok(w.correlations.get('cpu-r1').includes('temp-r1'));
});

test('wall: evaluate emits alerts', () => {
  const w = createAlertWall();
  addSensor(w, 'temp-r1', 'temp', 'p1', 'rack', 60, 75);
  addSensor(w, 'cpu-r1', 'cpu', 'p1', 'rack', 80, 95);
  ingestReading(w, 'temp-r1', 65);  // warn
  ingestReading(w, 'cpu-r1', 90);   // warn
  const alerts = evaluate(w);
  assert.ok(alerts.length >= 2);
  assert.ok(alerts.every(a => a.level !== 'ok'));
});

test('wall: correlatedAlerts upgrades with correlation info', () => {
  const w = createAlertWall();
  addSensor(w, 'temp-r1', 'temp', 'p1', 'rack', 60, 75);
  addSensor(w, 'cpu-r1', 'cpu', 'p1', 'rack', 80, 95);
  setCorrelation(w, 'temp-r1', 'cpu-r1');
  ingestReading(w, 'temp-r1', 65);
  ingestReading(w, 'cpu-r1', 90);
  evaluate(w);
  const correlated = correlatedAlerts(w);
  assert.ok(correlated.some(a => a.correlation.length > 0));
});

test('wall: renderLCD16x2 produces 16-char rows', () => {
  const w = createAlertWall();
  addSensor(w, 'temp-r1', 'temp', 'p1', 'rack', 60, 75);
  ingestReading(w, 'temp-r1', 65);
  evaluate(w);
  const lcd = renderLCD16x2(w);
  assert.equal(lcd.row1.length, 16);
  assert.equal(lcd.row2.length, 16);
});

test('wall: buzzerPulses for crits are long, warns are short', () => {
  const w = createAlertWall();
  addSensor(w, 'temp-r1', 'temp', 'p1', 'rack', 60, 75);
  ingestReading(w, 'temp-r1', 80);  // crit
  evaluate(w);
  const pulses = buzzerPulses(w);
  assert.ok(pulses.some(p => p.ms >= 500));
});

test('wall: statusSummary is human-readable', () => {
  const w = createAlertWall();
  addSensor(w, 'temp-r1', 'temp', 'p1', 'rack', 60, 75);
  ingestReading(w, 'temp-r1', 50);
  evaluate(w);
  const s = statusSummary(w);
  assert.match(s, /Alert Wall:/);
});
