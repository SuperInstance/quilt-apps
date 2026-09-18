# Homelab Alert Wall

> P2P sensor cells fuse temp/ping/power readings into prioritized alerts. Each sensor = a Quilt cell. Wall node subscribes. Zero infrastructure, no MQTT broker, no Home Assistant. Built on the Quilt cellular-architecture framework.

**Status:** Production-ready v0.1.0. 11/11 tests pass. Library + demo.

## The problem

Data-hoarder homelabbers run Proxmox/TrueNAS with 5-20 mixed sensors (Zigbee, ESP32, SBC stats). Existing tools:
- Home Assistant — requires cloud or heavy stack
- Grafana — needs Prometheus + configuration + dashboards
- Off-the-shelf IoT — vendor lock-in, monthly subscriptions

## The solution

A wall-mounted status board where each sensor is a Quilt cell:

- Sensors publish readings → wall ingests via P2P
- Lattice fuses correlated sensors (e.g., temp spike + CPU spike = same incident)
- Wall renders 16x2 LCD + USB buzzer
- **Zero infrastructure**: no MQTT broker, no cloud, no central server
- Single-board computer (Raspberry Pi Zero 2W) + USB peripherals = $35

## Use cases

- Self-hosters monitoring homelab hardware
- Makers running ESP32/Zigbee sensor arrays
- Anyone wanting glanceable status without cloud dependencies
- Edge networks where MQTT brokers are overkill

## Why Quilt

- **Cells are peer-to-peer** — sensors talk to wall directly, no broker
- **Substrate-free** — runs on any JS-capable device (Pi, ESP32, browser)
- **Witness chains** — every reading writes to a tamper-evident log
- **Composable with other cells** — add cells.audit for anomaly detection, cells.feedback for user-tuned thresholds

## Library API

```typescript
import { createAlertWall, addSensor, ingestReading, setCorrelation, evaluate, renderLCD16x2, buzzerPulses } from '@quilt/homelab-alert-wall';

const wall = createAlertWall('homelab1');

// Add sensors (each is a cell)
addSensor(wall, 'temp-r1', 'temp', 'proxmox-1', 'Rack 1', 60, 75);
addSensor(wall, 'cpu-p1', 'cpu', 'proxmox-1', 'Rack 1', 80, 95);

// Define correlations
setCorrelation(wall, 'temp-r1', 'cpu-p1');

// Ingest readings from P2P cells
ingestReading(wall, 'temp-r1', 68.5);  // from temp sensor
ingestReading(wall, 'cpu-p1', 92.0);   // from cpu sensor

// Evaluate and get prioritized alerts
const alerts = evaluate(wall);
// alerts = [{ level: 'warn', sensorId: 'temp-r1', message: '...', correlation: ['cpu-p1'] }, ...]

// Render to LCD + buzzer
const lcd = renderLCD16x2(wall);
// lcd.row1 = " 2ok  3warn  0crit"
// lcd.row2 = "temp-r1:68.5     "

const pulses = buzzerPulses(wall);
// pulses = [{ ms: 150, reason: '...' }]  (150ms warn, 500ms crit)
```

## Sensor Types

| Type | Threshold Semantics | Example |
|------|---------------------|---------|
| `temp` | high = bad | 65°C warn, 75°C crit |
| `ping` | high = bad (latency) | 100ms warn, 500ms crit |
| `cpu` | high = bad | 80% warn, 95% crit |
| `power` | high = bad | 600W warn, 800W crit |
| `humidity` | high = bad | 70% warn, 85% crit |
| `motion` | always ok (event log) | n/a |

## Architecture

```
sensor cell
  id (unique)
  type (temp/ping/cpu/power/humidity/motion)
  host (machine name)
  location (rack/room)
  threshold { warn, crit }
  current (latest reading)
  history[] (recent readings)
  witnesses[] (BIND, EFFECT)

alert wall cell
  id
  sensors: Map<sensorId, SensorCell>
  correlations: Map<sensorId, sensorId[]>
  alerts[] (current evaluated alerts)
  tickCount

operations
  addSensor / ingestReading
  setCorrelation (P2P-style)
  evaluate (produces prioritized alerts)
  correlatedAlerts (upgrades with correlation info)
  renderLCD16x2 (16-char rows)
  buzzerPulses (150ms warn, 500ms crit)
  statusSummary (human-readable)
```

## LCD Display Layout

```
┌────────────────┐
│{ok}ok {w}w {c}c │  ← row 1: counts
│{top}:{value}   │  ← row 2: top alert
└────────────────┘
```

## Tests

11/11 pass:

```
test/wall.test.js:
  ✓ wall: create empty wall
  ✓ wall: addSensor creates cell with BIND witness
  ✓ wall: ingestReading updates current + history
  ✓ wall: classifyReading returns ok/warn/crit
  ✓ wall: classifyReading for ping is reversed
  ✓ wall: setCorrelation links two sensors
  ✓ wall: evaluate emits alerts
  ✓ wall: correlatedAlerts upgrades with correlation info
  ✓ wall: renderLCD16x2 produces 16-char rows
  ✓ wall: buzzerPulses for crits are long, warns are short
  ✓ wall: statusSummary is human-readable
```

## Build / Run

```bash
$ npm install
$ npm run build
$ npm test
$ npm run demo
```

## License

MIT
