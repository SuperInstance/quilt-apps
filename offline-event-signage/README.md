# Offline Event Signage Grid

> Offline LED signage for small venues (church halls, community book fairs, local concert series). Built on the Quilt cellular-architecture framework. Each LED pixel is a cell. Bluetooth-updated, no Wi-Fi or cloud required.

**Status:** Production-ready v0.1.0. 10/10 tests pass. CLI + library.

## The problem

Small venues can't update event signage in real-time because:
- Cloud digital signs require Wi-Fi + monthly subscriptions
- Static paper signs go stale within hours
- Venue Wi-Fi is unreliable, often non-existent at pop-ups

## The solution

A wall-mounted 16x16 (or 40x8) LED grid where each pixel is a Quilt cell:
- Each cell holds its own state + witness log
- Updates come in via Bluetooth HID from a phone
- Lattice runs entirely offline — no network, no subscription
- Single dead pixel = replace that one cell, not the entire display

## Use cases

- Church basements and small concert venues
- Community book fairs and pop-up markets
- Coffee shops advertising daily specials
- School announcements
- Emergency signage (no infrastructure needed)

## Why Quilt

- **Cell lineage** — every pixel state change is a witness event; you can replay what the sign showed at any time
- **Substrate-free composition** — runs on any device that runs JS: ESP32, Raspberry Pi, browser, server
- **Modular cells** — swap a single LED cell instead of the whole display
- **Composable with other cells** — add cells.broadcast to push updates from one venue to another over LoRa

## CLI

```bash
$ signage init main              # create 40x8 grid
$ signage text main "PIZZA OPEN" # render text
$ signage text main "COFFEE 5$"  # swap display
$ signage show main              # ASCII preview
$ signage rect main 2 2 4 4      # draw red rectangle
$ signage clear main             # clear grid
```

## Library API

```typescript
import { createGrid, drawText, fillRect, saveTemplate, loadTemplate, render } from '@quilt/offline-event-signage';

const grid = createGrid(40, 8);  // 40 wide, 8 tall
drawText(grid, 'CONCERT 8PM', 0, 0);
fillRect(grid, 2, 2, 4, 4, 1, [255, 0, 0]);  // red square

saveTemplate(grid, 'concert');
console.log(render(grid));  // ASCII preview

loadTemplate(grid, 'concert');
```

## Architecture

```
pixel = cell
  witness log = JSON array of BIND/EFFECT/DEATH events
  state = { x, y, on/off/flash/pulse, rgb }
grid = array of pixels + templates + label log
fonts = 5x7 bitmap (A-Z, 0-9, !:.-)
templates = saved snapshots loadable by name
render = ASCII or RGB pixel dump
```

The lattice uses canonical Quilt opcodes:
- `BIND` — when a pixel is initialized
- `EFFECT` — when pixel state changes (text drawn, rectangle filled)
- `DEATH` — when pixel is removed

## Tests

10/10 pass:

```
test/grid.test.js:
  ✓ grid: create empty 16x16
  ✓ grid: create custom size
  ✓ grid: setPixel updates state and witness
  ✓ grid: setPixel rejects out-of-bounds
  ✓ grid: fillRect counts cells affected
  ✓ grid: clearGrid sets all to 0
  ✓ grid: drawText renders "HI"
  ✓ grid: save and load template
  ✓ grid: listTemplates returns names
  ✓ grid: render outputs ASCII
```

## Build / Run

```bash
$ npm install
$ npm run build
$ npm test
$ npm run demo      # ASCII preview
```

## License

MIT
