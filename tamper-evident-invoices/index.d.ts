/**
 * Tamper-Evident Invoice Pipeline
 *
 * Each invoice = a cell whose payload is the document hash.
 * Every transformation (parse, validate, transform, transmit) spawns
 * a child cell holding an input→output diff.
 *
 * The lineage IS the audit trail. Disputes resolve by replaying the
 * chain rather than archaeology through email folders.
 *
 * Use case: small manufacturers emailing PDFs/CSVs between ERPs.
 * "The price was different on my copy" disputes.
 */
export interface InvoicePayload {
    invoiceId: string;
    amount: number;
    currency: string;
    vendor: string;
    buyer: string;
    lineItems: LineItem[];
    issuedAt: number;
}
export interface LineItem {
    sku: string;
    description: string;
    quantity: number;
    unitPrice: number;
}
export type Opcode = 'BIND' | 'PARSE' | 'VALIDATE' | 'TRANSFORM' | 'TRANSMIT' | 'DISPUTE' | 'RESOLVE';
export interface Witness {
    opcode: Opcode;
    cellId: string;
    parentCellId?: string;
    t: number;
    dataHash: string;
    data?: any;
}
export interface InvoiceCell {
    id: string;
    payload: InvoicePayload;
    payloadHash: string;
    parentCellId?: string;
    children: string[];
    witnesses: Witness[];
    sealed: boolean;
}
export interface InvoiceLedger {
    cells: Map<string, InvoiceCell>;
    cellOrder: string[];
    tickCount: number;
}
export declare function createLedger(): InvoiceLedger;
export declare function createInvoiceCell(ledger: InvoiceLedger, payload: InvoicePayload, parentCellId?: string): InvoiceCell;
export declare function seal(cell: InvoiceCell): void;
export declare function parseToCSV(ledger: InvoiceLedger, parentCellId: string): InvoiceCell | null;
export declare function validateTaxID(ledger: InvoiceLedger, parentCellId: string, taxIdPattern: RegExp): InvoiceCell | null;
export declare function transformCurrency(ledger: InvoiceLedger, parentCellId: string, fromCurrency: string, toCurrency: string, rate: number): InvoiceCell | null;
export declare function transmit(ledger: InvoiceLedger, parentCellId: string, channel: string): InvoiceCell | null;
export interface Dispute {
    cellId: string;
    reason: string;
    openedAt: number;
}
export declare function openDispute(ledger: InvoiceLedger, cellId: string, reason: string): Dispute | null;
export interface Replay {
    cellId: string;
    fromOrigin: boolean;
    lineage: string[];
    transformations: Array<{
        opcode: Opcode;
        data: any;
        t: number;
    }>;
}
export declare function replay(ledger: InvoiceLedger, cellId: string): Replay | null;
export declare function getCell(ledger: InvoiceLedger, id: string): InvoiceCell | undefined;
export declare function cellCount(ledger: InvoiceLedger): number;
export declare function lineageOf(ledger: InvoiceLedger, cellId: string): string[];
