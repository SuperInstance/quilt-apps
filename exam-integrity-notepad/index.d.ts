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
export interface SnapshotPayload {
    examId: string;
    studentId: string;
    text: string;
    charCount: number;
    typingIntervalMs: number;
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
export declare function hashString(s: string): string;
export declare function hashPayload(payload: SnapshotPayload, parentHash: string): string;
export declare function createSession(examId: string, studentId: string): ExamSession;
export declare function createInitialCell(session: ExamSession, examId: string, studentId: string): ExamCell;
export declare function save(session: ExamSession, text: string): ExamCell;
export declare function seal(session: ExamSession): void;
export declare function exportBundle(session: ExamSession): {
    examId: string;
    studentId: string;
    rootHash: string;
    cellCount: number;
    chain: Array<{
        id: string;
        hash: string;
        parentHash: string;
        timestamp: number;
        text: string;
        charCount: number;
        typingIntervalMs: number;
    }>;
};
export interface VerificationResult {
    valid: boolean;
    reason?: string;
    cellCount: number;
    rootHash: string;
}
export declare function verify(bundle: ReturnType<typeof exportBundle>): VerificationResult;
export interface AnomalyReport {
    cellId: string;
    type: 'paste-burst' | 'long-pause' | 'deletion';
    detail: string;
}
export declare function detectAnomalies(session: ExamSession): AnomalyReport[];
