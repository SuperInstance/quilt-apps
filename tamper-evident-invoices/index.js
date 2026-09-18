"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLedger = createLedger;
exports.createInvoiceCell = createInvoiceCell;
exports.seal = seal;
exports.parseToCSV = parseToCSV;
exports.validateTaxID = validateTaxID;
exports.transformCurrency = transformCurrency;
exports.transmit = transmit;
exports.openDispute = openDispute;
exports.replay = replay;
exports.getCell = getCell;
exports.cellCount = cellCount;
exports.lineageOf = lineageOf;
const crypto_1 = require("crypto");
function hashData(data) {
    const json = JSON.stringify(data);
    return (0, crypto_1.createHash)('sha256').update(json).digest('hex').slice(0, 16);
}
function createLedger() {
    return {
        cells: new Map(),
        cellOrder: [],
        tickCount: 0
    };
}
function createInvoiceCell(ledger, payload, parentCellId) {
    const payloadHash = hashData(payload);
    const cell = {
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
        if (parent)
            parent.children.push(cell.id);
    }
    return cell;
}
function seal(cell) {
    cell.sealed = true;
}
function parseToCSV(ledger, parentCellId) {
    const parent = ledger.cells.get(parentCellId);
    if (!parent || parent.sealed)
        return null;
    const csv = [
        'sku,description,quantity,unitPrice',
        ...parent.payload.lineItems.map(li => `${li.sku},"${li.description}",${li.quantity},${li.unitPrice}`)
    ].join('\n');
    const newPayload = {
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
function validateTaxID(ledger, parentCellId, taxIdPattern) {
    const parent = ledger.cells.get(parentCellId);
    if (!parent || parent.sealed)
        return null;
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
function transformCurrency(ledger, parentCellId, fromCurrency, toCurrency, rate) {
    const parent = ledger.cells.get(parentCellId);
    if (!parent || parent.sealed)
        return null;
    const newPayload = {
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
function transmit(ledger, parentCellId, channel) {
    const parent = ledger.cells.get(parentCellId);
    if (!parent || parent.sealed)
        return null;
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
function openDispute(ledger, cellId, reason) {
    const cell = ledger.cells.get(cellId);
    if (!cell)
        return null;
    cell.witnesses.push({
        opcode: 'DISPUTE',
        cellId,
        t: ledger.tickCount++,
        dataHash: cell.payloadHash,
        data: { reason }
    });
    return { cellId, reason, openedAt: Date.now() };
}
function replay(ledger, cellId) {
    const cell = ledger.cells.get(cellId);
    if (!cell)
        return null;
    const lineage = [];
    let current = cell;
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
function getCell(ledger, id) {
    return ledger.cells.get(id);
}
function cellCount(ledger) {
    return ledger.cells.size;
}
function lineageOf(ledger, cellId) {
    const cell = ledger.cells.get(cellId);
    if (!cell)
        return [];
    const lineage = [];
    let current = cell;
    while (current) {
        lineage.unshift(current.id);
        current = current.parentCellId ? ledger.cells.get(current.parentCellId) : undefined;
    }
    return lineage;
}
