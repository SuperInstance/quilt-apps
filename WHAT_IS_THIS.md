# What-is-this? Overlay System

A drop-in, self-contained help overlay for any Quilt app. Adds a pink `?` badge in the bottom-right corner of every page. Click it → modal with plain-English definitions of every Quilt term.

## Why this exists

From `/workspace/repos/playtest-harness/PLAYTEST_REPORT.md`, the #1 suggestion across 48 essays was:

> **Add a "What is this?" button on every app** (6 mentions)

Newcomers land on a Quilt app, see technical terms (`Q1.15`, `FNV-1a`, `polyformalism`, `L1-L8`), and bounce. This overlay explains everything in plain English — without forcing the user to read the full docs.

## Install (5 minutes)

Add **one line** before `</body>` in any HTML page:

```html
<script src="https://cdn.jsdelivr.net/gh/SuperInstance/quilt-apps/what-is-this.js"></script>
```

Or copy `what-is-this.js` (7.5 KB, no deps) into your project and reference locally:

```html
<script src="path/to/what-is-this.js"></script>
```

That's it. No build step. No initialization code. The script adds itself:
- Pink `?` button (bottom-right)
- Modal overlay with 12 term definitions
- Copy-to-clipboard embed snippet so other apps can adopt it
- Esc key closes
- Click outside closes

## What it explains

| Term | Plain-English definition |
|------|--------------------------|
| Quilt | A spreadsheet that thinks. Every cell is a live, addressable capability. |
| Cell | The smallest unit. A 16-dial vector, addressable by path. |
| 16-dial vector | Each cell carries 16 signed 16-bit integers (Q1.15 fixed point). |
| FNV-1a hash | The state hash. The constant `0xbf27a3631cdee337` is what every port agrees on across 13 languages. |
| Polyformalism | The same cell model expressed in many languages, byte-exact via the FNV-1a hash. |
| L1–L8 architecture | The 8-layer stack of the Quilt repo ecosystem. |
| JEV | Joint Embedding Validator. Picks the best of N candidates per prompt moment. |
| Pincher | A tiered cache. Frequently-seen prompts skip the LLM. |
| F-number | Lab-notebook shorthand. F161 = Conservation Laws. F170 = Federated TinyML Vessel. |
| Tile | A compiled reflex. Cached response replayed without reasoning. |
| Deadband | The waterline between reflex (under 16ms) and reason (over 100ms). |

## Demo

Open `what-is-this-demo.html` in any browser. Click the pink `?` button (bottom-right).

## Files

- `what-is-this.js` — 7.5 KB, no deps, self-installing
- `what-is-this-demo.html` — Live demo page with a working Quilt formula cell

## Cross-project applicability

This pattern (single-file, no-dep, drop-in help overlay) works for any project with technical jargon newcomers struggle with. Drop it in, customize the term list, ship.

## License

MIT — same as the rest of the Quilt fleet.
