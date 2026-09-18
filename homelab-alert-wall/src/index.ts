/**
 * Homelab Sensor Fusion Alert Wall
 *
 * P2P sensor cells fuse temp/ping/power readings into prioritized alerts.
 * Each sensor = a cell. Wall node subscribes to alerts.
 * Zero-infrastructure: no MQTT broker, no cloud, no Home Assistant.
 *
 * Use case: data-hoarder homelabber with 5-20 mixed sensors
 * (Zigbee, ESP32, SBC stats) wanting one wall-mounted status board.
 *
 * Deployment: Raspberry Pi Zero 2W + USB buzzer + 16x2 LCD
 */

export type SensorType = 'temp' | 'ping' | 'power' | 'humidity' | 'cpu' | 'motion';

export interface SensorReading {
  sensorId: string;
  type: SensorType;
  value: number;
  unit: string;
  timestamp: number;
}

export interface SensorCell {
  id: string;
  type: SensorType;
  host: string;
  location: string;
  threshold: { warn: number; crit: number };
  current: SensorReading | null;
  history: SensorReading[];
  witnesses: Witness[];
}

export interface Witness {
  type: 'BIND' | 'EFFECT' | 'LINK';
  cellId: string;
  t: number;
  data?: any;
}

export type AlertLevel = 'ok' | 'warn' | 'crit';

export interface Alert {
  level: AlertLevel;
  sensorId: string;
  type: SensorType;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  correlation: string[];  // IDs of correlated sensors
}

export interface AlertWallCell {
  id: string;
  sensors: Map<string, SensorCell>;
  correlations: Map<string, string[]>;  // sensorId → list of correlated sensorIds
  alerts: Alert[];
  tickCount: number;
}

export function createAlertWall(id: string = 'wall'): AlertWallCell {
  return {
    id,
    sensors: new Map(),
    correlations: new Map(),
    alerts: [],
    tickCount: 0
  };
}

export function addSensor(
  wall: AlertWallCell,
  id: string,
  type: SensorType,
  host: string,
  location: string,
  warnThreshold: number,
  critThreshold: number
): SensorCell {
  const cell: SensorCell = {
    id,
    type,
    host,
    location,
    threshold: { warn: warnThreshold, crit: critThreshold },
    current: null,
    history: [],
    witnesses: [{
      type: 'BIND',
      cellId: id,
      t: wall.tickCount++,
      data: { type, host, location, warnThreshold, critThreshold }
    }]
  };
  wall.sensors.set(id, cell);
  return cell;
}

export function ingestReading(wall: AlertWallCell, sensorId: string, value: number, unit: string = ''): SensorCell | null {
  const s = wall.sensors.get(sensorId);
  if (!s) return null;
  const reading: SensorReading = { sensorId, type: s.type, value, unit, timestamp: Date.now() };
  s.current = reading;
  s.history.push(reading);
  if (s.history.length > 1000) s.history = s.history.slice(-1000);
  s.witnesses.push({
    type: 'EFFECT',
    cellId: s.id,
    t: wall.tickCount++,
    data: { value, unit }
  });
  return s;
}

export function classifyReading(s: SensorCell, value: number): AlertLevel {
  if (s.type === 'ping') {
    // ping = latency in ms — low is good
    if (value > s.threshold.crit) return 'crit';
    if (value > s.threshold.warn) return 'warn';
    return 'ok';
  }
  // For other metrics, high = bad
  if (value > s.threshold.crit) return 'crit';
  if (value > s.threshold.warn) return 'warn';
  return 'ok';
}

export function setCorrelation(wall: AlertWallCell, sensorA: string, sensorB: string): void {
  if (!wall.correlations.has(sensorA)) wall.correlations.set(sensorA, []);
  if (!wall.correlations.has(sensorB)) wall.correlations.set(sensorB, []);
  const a = wall.correlations.get(sensorA)!;
  const b = wall.correlations.get(sensorB)!;
  if (!a.includes(sensorB)) a.push(sensorB);
  if (!b.includes(sensorA)) b.push(sensorA);
}

export function correlatedAlerts(wall: AlertWallCell): Alert[] {
  const out: Alert[] = [];
  const seen = new Set<string>();
  for (const alert of wall.alerts) {
    if (alert.level === 'ok' || seen.has(alert.sensorId + alert.timestamp)) continue;
    const correlated = wall.correlations.get(alert.sensorId) || [];
    const related = wall.alerts.filter(a =>
      correlated.includes(a.sensorId) &&
      a.level !== 'ok' &&
      Math.abs(a.timestamp - alert.timestamp) < 5000
    );
    if (related.length > 0) {
      const upgraded: Alert = {
        ...alert,
        level: alert.level === 'crit' ? 'crit' : 'warn',
        correlation: related.map(r => r.sensorId),
        message: alert.message + ` (correlated with ${related.length})`
      };
      out.push(upgraded);
      seen.add(alert.sensorId + alert.timestamp);
    } else if (alert.level !== 'ok') {
      out.push(alert);
      seen.add(alert.sensorId + alert.timestamp);
    }
  }
  return out;
}

export function evaluate(wall: AlertWallCell): Alert[] {
  wall.alerts = [];
  for (const s of wall.sensors.values()) {
    if (!s.current) continue;
    const level = classifyReading(s, s.current.value);
    const threshold = level === 'crit' ? s.threshold.crit : s.threshold.warn;
    if (level === 'ok') continue;
    const unitStr = s.current.unit || s.type;
    wall.alerts.push({
      level,
      sensorId: s.id,
      type: s.type,
      value: s.current.value,
      threshold,
      message: `[${s.host}/${s.location}] ${s.type} = ${s.current.value}${unitStr} (threshold ${threshold})`,
      timestamp: s.current.timestamp,
      correlation: []
    });
  }
  return correlatedAlerts(wall);
}

export function renderLCD16x2(wall: AlertWallCell): { row1: string; row2: string } {
  // 16x2 LCD: top row = summary, bottom row = top alert
  const crit = wall.alerts.filter(a => a.level === 'crit').length;
  const warn = wall.alerts.filter(a => a.level === 'warn').length;
  const ok = Array.from(wall.sensors.values()).filter(s => s.current && classifyReading(s, s.current.value) === 'ok').length;
  const total = wall.sensors.size;
  const row1 = `${ok}ok ${warn}warn ${crit}crit`.slice(0, 16).padEnd(16);
  let row2 = '';
  if (wall.alerts.length > 0) {
    const top = wall.alerts.sort((a, b) => (a.level === 'crit' ? -1 : 1))[0];
    row2 = `${top.sensorId}:${top.value}`.slice(0, 16).padEnd(16);
  } else {
    row2 = ` ${total} sensors OK `.slice(0, 16).padEnd(16);
  }
  return { row1, row2 };
}

export interface BuzzerPulse {
  ms: number;
  reason: string;
}

export function buzzerPulses(wall: AlertWallCell): BuzzerPulse[] {
  const pulses: BuzzerPulse[] = [];
  for (const a of wall.alerts) {
    if (a.level === 'crit') {
      pulses.push({ ms: 500, reason: a.message });
    } else if (a.level === 'warn') {
      pulses.push({ ms: 150, reason: a.message });
    }
  }
  return pulses;
}

export function statusSummary(wall: AlertWallCell): string {
  const total = wall.sensors.size;
  const withData = Array.from(wall.sensors.values()).filter(s => s.current !== null).length;
  const crit = wall.alerts.filter(a => a.level === 'crit').length;
  const warn = wall.alerts.filter(a => a.level === 'warn').length;
  return `Alert Wall: ${withData}/${total} sensors reporting. ${crit} critical, ${warn} warnings.`;
}
