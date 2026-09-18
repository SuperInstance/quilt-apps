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

import { createHash } from 'crypto';

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

function hashData(data: any): string {
  const json = JSON.stringify(data);
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

export function createLedger(): InvoiceLedger {
  return {
    cells: new Map(),
    cellOrder: [],
    tickCount: 0
  };
}

export function createInvoiceCell(ledger: InvoiceLedger, payload: InvoicePayload, parentCellId?: string): InvoiceCell {
  const payloadHash = hashData(payload);
  const cell: InvoiceCell = {
    id: `inv-${ledger.cellOrder.length}-${Date.now()}`,
    payload,
    payloadHash,
    parentCellId,
    children: [],
    witnesses: [{
      opcode: 'BIND',
      cellId: '',
      parentCellId,
      t: ledger.tickCount++,
      dataHash: payloadHash,
      data: { invoiceId: payload.invoiceId }
    }],
    sealed: false
  };
  cell.witnesses[0].cellId = cell.id;
  ledger.cells.set(cell.id, cell);
  ledger.cellOrder.push(cell.id);
  if (parentCellId) {
    const parent = ledger.cells.get(parentCellId);
    if (parent) parent.children.push(cell.id);
  }
  return cell;
}

export function seal(cell: InvoiceCell): void {
  cell.sealed = true;
}

export function parseToCSV(ledger: InvoiceLedger, parentCellId: string): InvoiceCell | null {
  const parent = ledger.cells.get(parentCellId);
  if (!parent || parent.sealed) return null;
  const csv = [
    'sku,description,quantity,unitPrice',
    ...parent.payload.lineItems.map(li =>
      `${li.sku},"${li.description}",${li.quantity},${li.unitPrice}`
    )
  ].join('\n');
  const newPayload: InvoicePayload = {
    ...parent.payload,
    lineItems: [{ sku: '__CSV__', description: csv, quantity: 0, unitPrice: 0 }]
  };
  const child = createInvoiceCell(ledger, newPayload, parentCellId);
  child.witnesses.push({
    opcode: 'PARSE',
    cellId: child.id,
    parentCellId,
    t: ledger.tickCount++,
    dataHash: child.payloadHash,
    data: { format: 'csv', lineCount: parent.payload.lineItems.length }
  });
  return child;
}

export function validateTaxID(ledger: InvoiceLedger, parentCellId: string, taxIdPattern: RegExp): InvoiceCell | null {
  const parent = ledger.cells.get(parentCellId);
  if (!parent || parent.sealed) return null;
  const valid = taxIdPattern.test(parent.payload.vendor);
  const newPayload = { ...parent.payload, vendor: valid ? parent.payload.vendor : '__INVALID__' };
  const child = createInvoiceCell(ledger, newPayload, parentCellId);
  child.witnesses.push({
    opcode: 'VALIDATE',
    cellId: child.id,
    parentCellId,
    t: ledger.tickCount++,
    dataHash: child.payloadHash,
    data: { valid, rule: taxIdPattern.source }
  });
  return child;
}

export function transformCurrency(ledger: InvoiceLedger, parentCellId: string, fromCurrency: string, toCurrency: string, rate: number): InvoiceCell | null {
  const parent = ledger.cells.get(parentCellId);
  if (!parent || parent.sealed) return null;
  const newPayload: InvoicePayload = {
    ...parent.payload,
    amount: parent.payload.amount * rate,
    currency: toCurrency
  };
  const child = createInvoiceCell(ledger, newPayload, parentCellId);
  child.witnesses.push({
    opcode: 'TRANSFORM',
    cellId: child.id,
    parentCellId,
    t: ledger.tickCount++,
    dataHash: child.payloadHash,
    data: { from: fromCurrency, to: toCurrency, rate }
  });
  return child;
}

export function transmit(ledger: InvoiceLedger, parentCellId: string, channel: string): InvoiceCell | null {
  const parent = ledger.cells.get(parentCellId);
  if (!parent || parent.sealed) return null;
  const child = createInvoiceCell(ledger, parent.payload, parentCellId);
  seal(parent);
  child.witnesses.push({
    opcode: 'TRANSMIT',
    cellId: child.id,
    parentCellId,
    t: ledger.tickCount++,
    dataHash: child.payloadHash,
    data: { channel, recipient: child.payload.buyer }
  });
  return child;
}

export interface Dispute {
  cellId: string;
  reason: string;
  openedAt: number;
}

export function openDispute(ledger: InvoiceLedger, cellId: string, reason: string): Dispute | null {
  const cell = ledger.cells.get(cellId);
  if (!cell) return null;
  cell.witnesses.push({
    opcode: 'DISPUTE',
    cellId,
    t: ledger.tickCount++,
    dataHash: cell.payloadHash,
    data: { reason }
  });
  return { cellId, reason, openedAt: Date.now() };
}

export interface Replay {
  cellId: string;
  fromOrigin: boolean;
  lineage: string[];
  transformations: Array<{ opcode: Opcode; data: any; t: number }>;
}

export function replay(ledger: InvoiceLedger, cellId: string): Replay | null {
  const cell = ledger.cells.get(cellId);
  if (!cell) return null;
  const lineage: string[] = [];
  let current: InvoiceCell | undefined = cell;
  while (current) {
    lineage.unshift(current.id);
    current = current.parentCellId ? ledger.cells.get(current.parentCellId) : undefined;
  }
  return {
    cellId,
    fromOrigin: cell.parentCellId === undefined,
    lineage,
    transformations: cell.witnesses
      .filter(w => w.opcode !== 'BIND')
      .map(w => ({ opcode: w.opcode, data: w.data, t: w.t }))
  };
}

export function getCell(ledger: InvoiceLedger, id: string): InvoiceCell | undefined {
  return ledger.cells.get(id);
}

export function cellCount(ledger: InvoiceLedger): number {
  return ledger.cells.size;
}

export function lineageOf(ledger: InvoiceLedger, cellId: string): string[] {
  const cell = ledger.cells.get(cellId);
  if (!cell) return [];
  const lineage: string[] = [];
  let current: InvoiceCell | undefined = cell;
  while (current) {
    lineage.unshift(current.id);
    current = current.parentCellId ? ledger.cells.get(current.parentCellId) : undefined;
  }
  return lineage;
}
