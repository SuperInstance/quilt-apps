# Exam-Integrity Notepad

> Hash-chained exam scratchpad with append-only cells. The proctor verifies the chain without screen surveillance. Built on the Quilt cellular-architecture framework.

**Status:** Production-ready v0.1.0. 12/12 tests pass. Library + demo.

## The problem

Remote and proctored exams need verifiable proof that scratch work wasn't retroactively edited. Existing solutions:
- Lockdown browsers (Respondus, Proctorio) — invasive, hated by students, expensive licensing
- Screen recording — privacy-hostile, captures everything including off-topic work
- Cloud-only solutions — fail at offline test centers, rural exam halls

## The solution

A scratchpad where every save is a new sealed cell. Each cell carries:
- The hash of its content
- The hash of its parent cell (forms a Merkle chain)
- Typing interval metadata (time since last save)
- Per-cell character count

The proctor gets a portable bundle (JSON) encoding the cell chain. The verifier:
1. Walks the chain
2. Re-hashes each cell
3. Confirms parent hashes match
4. Confirms root hash matches

If any byte of any cell is modified, verification fails.

## Use cases

- Certification testing centers (CompTIA, Cisco, AWS exam centers)
- Proctored paper exams on shared tablets
- Distance learning integrity verification
- Any scenario requiring tamper-evidence without surveillance

## Why Quilt

- **Append-only cells** — every save creates a new cell; previous cells are immutable
- **Privacy-preserving** — substrate never sees keystrokes, only sealed snapshots
- **Substrate-free** — runs in browser (IndexedDB), Node.js, or any JS runtime
- **Composable with other cells** — add cells.feedback to capture examiner feedback, cells.audit to log verifier attempts
- **Portable verifier** — proctor can verify offline on their laptop without the substrate running

## Library API

```typescript
import { createSession, createInitialCell, save, exportBundle, verify, detectAnomalies } from '@quilt/exam-integrity-notepad';

const session = createSession('CERT-2024-A1', 'student-42');
createInitialCell(session, session.examId, session.studentId);

save(session, 'Working on question 1');
save(session, 'photosynthesis is the process by which plants');
// ... more saves ...

const bundle = exportBundle(session);
// bundle.cellCount, bundle.rootHash, bundle.chain[]

const result = verify(bundle);
// result.valid === true if chain is intact
// result.reason === 'Hash mismatch at cell X' if tampered

const anomalies = detectAnomalies(session);
// anomalies = [{ type: 'paste-burst', detail: '...' }, ...]
```

## Architecture

```
snapshot cell
  id (UUID-ish)
  payload (text + charCount + typingIntervalMs + timestamp)
  hash (SHA-256 of payload + parentHash, truncated)
  parentHash (chain to origin)
  parentCellId (for replay)
  witnesses[] (BIND/SAVE/SEAL/EXPORT)
  sealed (boolean, true after exportBundle)

session
  examId, studentId
  cells[]: lineage in save order
  rootHash: hash of last cell
  tickCount: monotonic timestamp
```

The lattice uses canonical Quilt opcodes:
- `BIND` — session initialized
- `SAVE` — student wrote text
- `SEAL` — exam ended, cells immutable
- `EXPORT` — bundle generated for proctor

## Anomaly Detection

Three patterns flagged in real-time:
- **paste-burst** — >50 chars added in <1 second (suggests paste)
- **long-pause** — >30 seconds between saves (suggests break or external help)
- **deletion** — text shortened (student can't "undo" in the chain — previous version exists)

These flags help proctors target human review without screen-watching.

## Tests

12/12 pass:

```
test/exam.test.js:
  ✓ exam: createSession is empty
  ✓ exam: createInitialCell binds with root hash as parent
  ✓ exam: save appends new cell
  ✓ exam: hash chains correctly
  ✓ exam: seal marks all cells sealed
  ✓ exam: exportBundle produces verifiable chain
  ✓ exam: verify accepts valid chain
  ✓ exam: verify rejects tampered text
  ✓ exam: detectAnomalies flags paste-burst
  ✓ exam: detectAnomalies flags long-pause
  ✓ exam: detectAnomalies flags deletion
  ✓ exam: hashString is deterministic
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
