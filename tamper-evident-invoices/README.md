# Tamper-Evident Invoice Pipeline

> Each invoice is a cell whose payload is the document hash. Every transformation spawns a child cell holding the input→output diff. The lineage IS the audit trail. Built on the Quilt cellular-architecture framework.

**Status:** Production-ready v0.1.0. 10/10 tests pass. Library + demo.

## The problem

Manufacturers emailing PDFs/CSVs between ERPs lose track of who changed what. Disputes over "the price was different on my copy" cost hours weekly. Existing audit systems bolt logs onto pipelines — they aren't part of the data structure.

## The solution

Every invoice, parse, validation, transformation, and transmission is a cell in a Quilt lattice. Each cell:
- Holds the document hash of its payload (SHA-256, truncated)
- Links to its parent cell (full lineage)
- Writes a witness for every opcode (BIND, PARSE, VALIDATE, TRANSFORM, TRANSMIT, DISPUTE, RESOLVE)
- Can be sealed (append-only once transmitted)

The lineage IS the audit trail. Disputes resolve by replaying the chain.

## Use cases

- Manufacturers → buyer invoicing across multiple ERPs
- Multi-vendor AP pipelines (parse → validate → transform → transmit)
- Compliance audits (every step has a hash + witness)
- Tax authority reporting with full chain of custody

## Why Quilt

- **Audit trail IS the data structure** — cells ARE the ledger, not a log bolted on
- **Tamper-evident** — every cell carries the hash of its payload; modification breaks the chain
- **Zero-trust between sender and receiver** — buyer can verify by re-running the lineage
- **Substrate-free** — runs on any device that runs JavaScript

## Library API

```typescript
import {
  createLedger, createInvoiceCell, parseToCSV, validateTaxID,
  transformCurrency, transmit, openDispute, replay, lineageOf
} from '@quilt/tamper-evident-invoices';

const ledger = createLedger();

// Create root invoice cell
const root = createInvoiceCell(ledger, {
  invoiceId: 'INV-001',
  amount: 5000,
  currency: 'USD',
  vendor: 'Acme Corp',
  buyer: 'Beta LLC',
  lineItems: [{ sku: 'A1', description: 'Widget', quantity: 50, unitPrice: 100 }],
  issuedAt: Date.now()
});

// Transformation pipeline spawns child cells
const csv = parseToCSV(ledger, root.id);
const validated = validateTaxID(ledger, csv.id, /^[A-Z][a-z]+ Corp$/);
const eur = transformCurrency(ledger, validated.id, 'USD', 'EUR', 0.85);
const tx = transmit(ledger, eur.id, 'email');

// Dispute? Replay the lineage.
openDispute(ledger, eur.id, 'EUR amount differs');
const r = replay(ledger, eur.id);
// r.lineage = [root.id, csv.id, validated.id, eur.id]
// r.transformations = [{ opcode: 'TRANSFORM', data: {...}, t: 5 }, ...]
```

## Architecture

```
invoice cell
  id (UUID-ish)
  payload (InvoicePayload)
  payloadHash (SHA-256 of payload, truncated)
  parentCellId (chain to origin)
  children[] (forks)
  witnesses[] (BIND/PARSE/VALIDATE/TRANSFORM/TRANSMIT/DISPUTE/RESOLVE)
  sealed (boolean, true once transmitted-from)

ledger
  cells: Map<id, InvoiceCell>
  cellOrder[]: lineage in creation order
  tickCount: monotonic timestamp
```

The lattice uses canonical Quilt opcodes:
- `BIND` — cell created
- `PARSE` — payload transformed (e.g., CSV → JSON)
- `VALIDATE` — payload passed/failed validation rule
- `TRANSFORM` — payload mutated (currency, units, format)
- `TRANSMIT` — payload sent out; parent sealed
- `DISPUTE` — counterparty disagrees
- `RESOLVE` — dispute resolved

## Tests

10/10 pass:

```
test/invoice.test.js:
  ✓ invoice: create ledger is empty
  ✓ invoice: create cell with BIND witness
  ✓ invoice: parseToCSV spawns child cell with PARSE witness
  ✓ invoice: validateTaxID marks vendor as INVALID on failure
  ✓ invoice: transformCurrency applies rate
  ✓ invoice: transmit seals parent
  ✓ invoice: cannot modify sealed cell
  ✓ invoice: openDispute adds witness to cell
  ✓ invoice: replay reconstructs lineage
  ✓ invoice: lineageOf walks ancestors
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
