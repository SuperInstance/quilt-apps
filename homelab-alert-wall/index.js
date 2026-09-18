"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlertWall = createAlertWall;
exports.addSensor = addSensor;
exports.ingestReading = ingestReading;
exports.classifyReading = classifyReading;
exports.setCorrelation = setCorrelation;
exports.correlatedAlerts = correlatedAlerts;
exports.evaluate = evaluate;
exports.renderLCD16x2 = renderLCD16x2;
exports.buzzerPulses = buzzerPulses;
exports.statusSummary = statusSummary;
function createAlertWall(id = 'wall') {
    return {
        id,
        sensors: new Map(),
        correlations: new Map(),
        alerts: [],
        tickCount: 0
    };
}
function addSensor(wall, id, type, host, location, warnThreshold, critThreshold) {
    const cell = {
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
function ingestReading(wall, sensorId, value, unit = '') {
    const s = wall.sensors.get(sensorId);
    if (!s)
        return null;
    const reading = { sensorId, type: s.type, value, unit, timestamp: Date.now() };
    s.current = reading;
    s.history.push(reading);
    if (s.history.length > 1000)
        s.history = s.history.slice(-1000);
    s.witnesses.push({
        type: 'EFFECT',
        cellId: s.id,
        t: wall.tickCount++,
        data: { value, unit }
    });
    return s;
}
function classifyReading(s, value) {
    if (s.type === 'ping') {
        // ping = latency in ms — low is good
        if (value > s.threshold.crit)
            return 'crit';
        if (value > s.threshold.warn)
            return 'warn';
        return 'ok';
    }
    // For other metrics, high = bad
    if (value > s.threshold.crit)
        return 'crit';
    if (value > s.threshold.warn)
        return 'warn';
    return 'ok';
}
function setCorrelation(wall, sensorA, sensorB) {
    if (!wall.correlations.has(sensorA))
        wall.correlations.set(sensorA, []);
    if (!wall.correlations.has(sensorB))
        wall.correlations.set(sensorB, []);
    const a = wall.correlations.get(sensorA);
    const b = wall.correlations.get(sensorB);
    if (!a.includes(sensorB))
        a.push(sensorB);
    if (!b.includes(sensorA))
        b.push(sensorA);
}
function correlatedAlerts(wall) {
    const out = [];
    const seen = new Set();
    for (const alert of wall.alerts) {
        if (alert.level === 'ok' || seen.has(alert.sensorId + alert.timestamp))
            continue;
        const correlated = wall.correlations.get(alert.sensorId) || [];
        const related = wall.alerts.filter(a => correlated.includes(a.sensorId) &&
            a.level !== 'ok' &&
            Math.abs(a.timestamp - alert.timestamp) < 5000);
        if (related.length > 0) {
            const upgraded = {
                ...alert,
                level: alert.level === 'crit' ? 'crit' : 'warn',
                correlation: related.map(r => r.sensorId),
                message: alert.message + ` (correlated with ${related.length})`
            };
            out.push(upgraded);
            seen.add(alert.sensorId + alert.timestamp);
        }
        else if (alert.level !== 'ok') {
            out.push(alert);
            seen.add(alert.sensorId + alert.timestamp);
        }
    }
    return out;
}
function evaluate(wall) {
    wall.alerts = [];
    for (const s of wall.sensors.values()) {
        if (!s.current)
            continue;
        const level = classifyReading(s, s.current.value);
        const threshold = level === 'crit' ? s.threshold.crit : s.threshold.warn;
        if (level === 'ok')
            continue;
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
function renderLCD16x2(wall) {
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
    }
    else {
        row2 = ` ${total} sensors OK `.slice(0, 16).padEnd(16);
    }
    return { row1, row2 };
}
function buzzerPulses(wall) {
    const pulses = [];
    for (const a of wall.alerts) {
        if (a.level === 'crit') {
            pulses.push({ ms: 500, reason: a.message });
        }
        else if (a.level === 'warn') {
            pulses.push({ ms: 150, reason: a.message });
        }
    }
    return pulses;
}
function statusSummary(wall) {
    const total = wall.sensors.size;
    const withData = Array.from(wall.sensors.values()).filter(s => s.current !== null).length;
    const crit = wall.alerts.filter(a => a.level === 'crit').length;
    const warn = wall.alerts.filter(a => a.level === 'warn').length;
    return `Alert Wall: ${withData}/${total} sensors reporting. ${crit} critical, ${warn} warnings.`;
}
