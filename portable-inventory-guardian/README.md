# Portable Offline Inventory Guardian

> Offline inventory guardian for mobile food vendors, farmers market stalls, and small kitchens. Built on the Quilt cellular-architecture framework. Each inventory bin is a cell; the lattice tracks expiration, alerts on low stock, all without internet.

**Status:** Production-ready v0.1.0. 6/6 tests pass. CLI + library.

## The problem

Mobile food vendors lose an average $3,200/year on unsold, expired perishables. Off-the-shelf digital inventory trackers cost $200+ and require ongoing subscriptions. Cloud-based tools fail when there's no cell service — which is often at farmers markets, food truck stops, and rural venues.

## The solution

A small library that treats each inventory bin as a cell in a Quilt lattice. The lattice:
- Tracks bin counts and expiration timestamps
- Alerts on low stock (configurable threshold, default: 5 units)
- Alerts on items expiring within 24 hours
- Writes a tamper-evident witness log per bin (BIND/EFFECT events)
- Runs entirely offline — no network, no cloud, no subscription

## Use cases

- Mobile food trucks and carts
- Farmers market stalls
- Small restaurant kitchens
- Off-grid food storage
- Anywhere cell service is unreliable

## Why Quilt

The lattice substrate means:
- **Audit trail IS the data structure** — every BIND and EFFECT writes a witness. Disputes resolve by reading the log.
- **Substrate-free** — runs on any device that runs JavaScript: Raspberry Pi, ESP32 with JS runtime, browser, server.
- **Composes with other cells** — add cells.thermal for heat-aware alerts, cells.death for end-of-day audit, cells.audit for gap detection.
- **Witness chain portability** — logs are JSON-serializable; sync to cloud only when you choose.

## CLI

```bash
$ igurd init                       # create empty inventory
$ igurd add tomatoes 10 24          # add 10 tomatoes, expires in 24h
$ igurd add lettuce 3 12            # add 3 lettuce, expires in 12h
$ igurd sell 0 2                    # sell 2 from bin 0
$ igurd restock 0 5                 # add 5 more to bin 0
$ igurd status                      # show summary
$ igurd alerts                      # list current alerts
```

## Library API

```typescript
import { createInventoryGuardian, restock, sell, alerts, summary } from '@quilt/portable-inventory-guardian';

const cell = createInventoryGuardian([
  { name: 'tomatoes', count: 12, expiryMs: Date.now() + 86400000, addedAt: Date.now() },
  // ...
], 5);  // low-stock threshold

restock(cell, 0, 10);
sell(cell, 0, 2);
for (const a of alerts(cell)) console.log(a.message);
```

## Architecture

```
bin = cell
  witness log = JSON array of BIND/EFFECT/DEATH events
  state = { count, expiryMs, name, addedAt }
lattice = array of bins + shared config (threshold, expiryWarnMs)
operations = restock, sell, lowStock, expiringSoon, expired
alerts = LOW_STOCK + EXPIRING + EXPIRED
```

The lattice uses the canonical Quilt opcodes:
- `BIND` — when a bin is created
- `EFFECT` — when count changes (restock or sell)
- `TICK` — increment lattice tick counter
- `DEATH` — when a bin is removed

## Tests

6/6 pass:

```
test/inventory.test.js:
  ✓ inventory: create with bins and witness logs
  ✓ inventory: restock increments count + witness
  ✓ inventory: sell decrements, fails when count < n
  ✓ inventory: lowStock returns below-threshold bins
  ✓ inventory: alerts cover all 3 categories
  ✓ inventory: summary is human-readable
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
