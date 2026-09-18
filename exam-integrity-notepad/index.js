"use strict";
/**
 * Exam-Integrity Notepad
 *
 * A scratchpad where every save is a new sealed cell.
 * The student can edit freely but the proctor's verifier replays
 * the full write history with per-save intervals.
 *
 * Strokes/typing rate metadata lands in cells, letting proctors
 * spot paste-events vs. organic writing.
 *
 * The substrate never sees keystrokes — only sealed snapshots.
 * Privacy-preserving: integrity through lineage, not surveillance.
 *
 * Use case: proctored certification exams on shared tablets
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashString = hashString;
exports.hashPayload = hashPayload;
exports.createSession = createSession;
exports.createInitialCell = createInitialCell;
exports.save = save;
exports.seal = seal;
exports.exportBundle = exportBundle;
exports.verify = verify;
exports.detectAnomalies = detectAnomalies;
const crypto_1 = require("crypto");
function hashString(s) {
    return (0, crypto_1.createHash)('sha256').update(s).digest('hex').slice(0, 16);
}
function hashPayload(payload, parentHash) {
    const data = JSON.stringify({ ...payload, parentHash });
    return hashString(data);
}
function createSession(examId, studentId) {
    return { examId, studentId, cells: [], rootHash: '0'.repeat(16), tickCount: 0 };
}
function createInitialCell(session, examId, studentId) {
    const payload = {
        examId,
        studentId,
        text: '',
        charCount: 0,
        typingIntervalMs: 0,
        timestamp: Date.now()
    };
    const hash = hashPayload(payload, session.rootHash);
    const cell = {
        id: `exam-${session.cells.length}-${Date.now()}`,
        examId,
        studentId,
        payload,
        hash,
        parentHash: session.rootHash,
        witnesses: [{
                opcode: 'BIND',
                cellId: '',
                t: session.tickCount++,
                hash,
                data: { examId, studentId }
            }],
        sealed: false
    };
    cell.witnesses[0].cellId = cell.id;
    session.cells.push(cell);
    session.rootHash = hash;
    return cell;
}
function save(session, text) {
    const parent = session.cells[session.cells.length - 1];
    const now = Date.now();
    const payload = {
        examId: session.examId,
        studentId: session.studentId,
        text,
        charCount: text.length,
        typingIntervalMs: now - (parent?.payload.timestamp || now),
        timestamp: now
    };
    const hash = hashPayload(payload, parent?.hash || session.rootHash);
    const cell = {
        id: `exam-${session.cells.length}-${now}`,
        examId: session.examId,
        studentId: session.studentId,
        payload,
        hash,
        parentHash: parent?.hash || session.rootHash,
        parentCellId: parent?.id,
        witnesses: [{
                opcode: 'SAVE',
                cellId: '',
                parentCellId: parent?.id,
                t: session.tickCount++,
                hash,
                data: { charCount: text.length, intervalMs: payload.typingIntervalMs }
            }],
        sealed: false
    };
    cell.witnesses[0].cellId = cell.id;
    session.cells.push(cell);
    session.rootHash = hash;
    return cell;
}
function seal(session) {
    for (const c of session.cells)
        c.sealed = true;
    const last = session.cells[session.cells.length - 1];
    if (last) {
        last.witnesses.push({
            opcode: 'SEAL',
            cellId: last.id,
            t: session.tickCount++,
            hash: last.hash,
            data: { sealedCount: session.cells.length }
        });
    }
}
function exportBundle(session) {
    seal(session);
    return {
        examId: session.examId,
        studentId: session.studentId,
        rootHash: session.rootHash,
        cellCount: session.cells.length,
        chain: session.cells.map(c => ({
            id: c.id,
            hash: c.hash,
            parentHash: c.parentHash,
            timestamp: c.payload.timestamp,
            text: c.payload.text,
            charCount: c.payload.charCount,
            typingIntervalMs: c.payload.typingIntervalMs
        }))
    };
}
function verify(bundle) {
    let prev = '0'.repeat(16);
    for (const cell of bundle.chain) {
        if (cell.parentHash !== prev) {
            return { valid: false, reason: `Chain break at cell ${cell.id}: expected parentHash ${prev}, got ${cell.parentHash}`, cellCount: bundle.chain.length, rootHash: bundle.rootHash };
        }
        const expected = hashPayload({
            examId: bundle.examId,
            studentId: bundle.studentId,
            text: cell.text,
            charCount: cell.charCount,
            typingIntervalMs: cell.typingIntervalMs,
            timestamp: cell.timestamp
        }, cell.parentHash);
        if (expected !== cell.hash) {
            return { valid: false, reason: `Hash mismatch at cell ${cell.id}: expected ${expected}, got ${cell.hash}`, cellCount: bundle.chain.length, rootHash: bundle.rootHash };
        }
        prev = cell.hash;
    }
    if (prev !== bundle.rootHash) {
        return { valid: false, reason: `Root hash mismatch: chain ends at ${prev}, bundle claims ${bundle.rootHash}`, cellCount: bundle.chain.length, rootHash: bundle.rootHash };
    }
    return { valid: true, cellCount: bundle.chain.length, rootHash: bundle.rootHash };
}
function detectAnomalies(session) {
    const out = [];
    let prevText = '';
    for (const c of session.cells) {
        if (c.payload.typingIntervalMs > 30000 && c.payload.charCount > 0) {
            out.push({ cellId: c.id, type: 'long-pause', detail: `${c.payload.typingIntervalMs}ms between saves (cell ${c.id})` });
        }
        if (c.payload.text.length - prevText.length > 50 && c.payload.typingIntervalMs < 1000) {
            out.push({ cellId: c.id, type: 'paste-burst', detail: `${c.payload.text.length - prevText.length} chars added in ${c.payload.typingIntervalMs}ms` });
        }
        if (c.payload.text.length < prevText.length && prevText.length > 0) {
            out.push({ cellId: c.id, type: 'deletion', detail: `text shortened from ${prevText.length} to ${c.payload.text.length}` });
        }
        prevText = c.payload.text;
    }
    return out;
}
