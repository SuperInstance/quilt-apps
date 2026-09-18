# Quilt Apps — Six Production Tools Built on the Lattice

> Six independent applications, each built on the Quilt cellular-architecture framework. Each app treats every entity as a cell in a lattice. Each witness is a record of intent.

## The Six Apps

| App | Cells | Domain | Tests |
|-----|-------|--------|-------|
| [Portable Inventory Guardian](./portable-inventory-guardian) | bin | mobile food vendors | 6/6 |
| [Offline Event Signage Grid](./offline-event-signage) | LED pixel | small venues | 10/10 |
| [Tamper-Evident Invoice Pipeline](./tamper-evident-invoices) | invoice + transformation | manufacturers → buyers | 10/10 |
| [Exam-Integrity Notepad](./exam-integrity-notepad) | exam snapshot | proctored exams | 12/12 |
| [PatchWall — Industrial I/O Lineage](./patch-wall) | PLC tag | controls engineering | 13/13 |
| [Homelab Alert Wall](./homelab-alert-wall) | sensor | self-hosting | 11/11 |

**Total: 62/62 tests pass.**

## The Substrate

All 6 apps share the same Quilt cell model:

- **BIND** — cell creation
- **LINK** — relationship between cells
- **EFFECT** — state change in a cell
- **VIEW** — read of a cell
- **TICK** — monotonic timestamp advance
- **+6 extensions:** FORGET, PROOF, ROUTE, CRDT, WORLD, TIME

Plus the canonical witness log: every cell carries an append-only history of events that created or modified it.

## The Process

Generated from a 4-round ideation pipeline across 6 LLMs in parallel:
- **Round 1**: 15 ideas from 5 LLMs
- **Round 2**: 4 critics killed the weak ones
- **Round 3**: 4 refiners cut scope to 24h builds
- **Round 4**: 6 rankers picked the top 3 with consensus

Models used: ZAI glm-4.5 (3 calls), DeepSeek v3 (2 calls), DeepSeek v4-Flash (1 call), Qwen3-235B (1 call).

Cost: ~$0.10 in API calls.

## Running Tests

Each app has its own tests:

```bash
cd portable-inventory-guardian && npm install && npm test
cd offline-event-signage && npm install && npm test
# ... etc.
```

## License

MIT (each app independent)
