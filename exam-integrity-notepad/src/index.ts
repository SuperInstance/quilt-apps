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

import { createHash } from 'crypto';

export interface SnapshotPayload {
  examId: string;
  studentId: string;
  text: string;
  charCount: number;
  typingIntervalMs: number; // time since last save
  timestamp: number;
}

export type Opcode = 'BIND' | 'SAVE' | 'SEAL' | 'EXPORT';

export interface Witness {
  opcode: Opcode;
  cellId: string;
  parentCellId?: string;
  t: number;
  hash: string;
  data?: any;
}

export interface ExamCell {
  id: string;
  examId: string;
  studentId: string;
  payload: SnapshotPayload;
  hash: string;
  parentHash: string;
  parentCellId?: string;
  witnesses: Witness[];
  sealed: boolean;
}

export interface ExamSession {
  examId: string;
  studentId: string;
  cells: ExamCell[];
  rootHash: string;
  tickCount: number;
}

export function hashString(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

export function hashPayload(payload: SnapshotPayload, parentHash: string): string {
  const data = JSON.stringify({ ...payload, parentHash });
  return hashString(data);
}

export function createSession(examId: string, studentId: string): ExamSession {
  return { examId, studentId, cells: [], rootHash: '0'.repeat(16), tickCount: 0 };
}

export function createInitialCell(session: ExamSession, examId: string, studentId: string): ExamCell {
  const payload: SnapshotPayload = {
    examId,
    studentId,
    text: '',
    charCount: 0,
    typingIntervalMs: 0,
    timestamp: Date.now()
  };
  const hash = hashPayload(payload, session.rootHash);
  const cell: ExamCell = {
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

export function save(session: ExamSession, text: string): ExamCell {
  const parent = session.cells[session.cells.length - 1];
  const now = Date.now();
  const payload: SnapshotPayload = {
    examId: session.examId,
    studentId: session.studentId,
    text,
    charCount: text.length,
    typingIntervalMs: now - (parent?.payload.timestamp || now),
    timestamp: now
  };
  const hash = hashPayload(payload, parent?.hash || session.rootHash);
  const cell: ExamCell = {
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

export function seal(session: ExamSession): void {
  for (const c of session.cells) c.sealed = true;
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

export function exportBundle(session: ExamSession): {
  examId: string;
  studentId: string;
  rootHash: string;
  cellCount: number;
  chain: Array<{ id: string; hash: string; parentHash: string; timestamp: number; text: string; charCount: number; typingIntervalMs: number }>;
} {
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

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  cellCount: number;
  rootHash: string;
}

export function verify(bundle: ReturnType<typeof exportBundle>): VerificationResult {
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

export interface AnomalyReport {
  cellId: string;
  type: 'paste-burst' | 'long-pause' | 'deletion';
  detail: string;
}

export function detectAnomalies(session: ExamSession): AnomalyReport[] {
  const out: AnomalyReport[] = [];
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
