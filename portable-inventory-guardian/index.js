"use strict";
/**
 * Portable Offline Inventory Guardian
 *
 * Each cell in the lattice = one inventory bin.
 * The lattice runs entirely offline.
 * Subleq substrate enforces expiration rules.
 *
 * Use case: mobile food vendors, farmers market stalls
 * Deployment: 12V battery-powered single-board computer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInventoryGuardian = createInventoryGuardian;
exports.restock = restock;
exports.sell = sell;
exports.lowStock = lowStock;
exports.expiringSoon = expiringSoon;
exports.expired = expired;
exports.alerts = alerts;
exports.summary = summary;
exports.witnessLog = witnessLog;
function createInventoryGuardian(initialBins = [], threshold = 5, expiryWarnMs = 24 * 60 * 60 * 1000) {
    const bins = initialBins.map((b, i) => ({ ...b, id: i, witnessLog: [] }));
    const cell = { bins, threshold, expiryWarnMs, tickCount: 0 };
    for (const bin of bins) {
        bin.witnessLog.push({ type: 'BIND', cellId: bin.id, t: 0, data: { count: bin.count } });
    }
    return cell;
}
function restock(cell, binId, count) {
    const bin = cell.bins.find(b => b.id === binId);
    if (!bin)
        return false;
    bin.count += count;
    bin.witnessLog.push({ type: 'EFFECT', cellId: binId, t: cell.tickCount, data: { count, newTotal: bin.count } });
    cell.tickCount++;
    return true;
}
function sell(cell, binId, count) {
    const bin = cell.bins.find(b => b.id === binId);
    if (!bin || bin.count < count)
        return false;
    bin.count -= count;
    bin.witnessLog.push({ type: 'EFFECT', cellId: binId, t: cell.tickCount, data: { count: -count, newTotal: bin.count } });
    cell.tickCount++;
    return true;
}
function lowStock(cell) {
    return cell.bins.filter(b => b.count < cell.threshold);
}
function expiringSoon(cell, nowMs = Date.now()) {
    return cell.bins.filter(b => (b.expiryMs - nowMs) < cell.expiryWarnMs && (b.expiryMs - nowMs) > 0 && b.count > 0);
}
function expired(cell, nowMs = Date.now()) {
    return cell.bins.filter(b => (b.expiryMs - nowMs) < 0 && b.count > 0);
}
function alerts(cell, nowMs = Date.now()) {
    const out = [];
    for (const b of lowStock(cell)) {
        out.push({ type: 'LOW_STOCK', binId: b.id, binName: b.name, message: `${b.name}: ${b.count} units (below ${cell.threshold})` });
    }
    for (const b of expiringSoon(cell, nowMs)) {
        const hours = Math.max(0, Math.round((b.expiryMs - nowMs) / 3600000));
        out.push({ type: 'EXPIRING', binId: b.id, binName: b.name, message: `${b.name}: ${hours}h until expiry` });
    }
    for (const b of expired(cell, nowMs)) {
        out.push({ type: 'EXPIRED', binId: b.id, binName: b.name, message: `${b.name}: EXPIRED, ${b.count} units to discard` });
    }
    return out;
}
function summary(cell, nowMs = Date.now()) {
    const totalBins = cell.bins.length;
    const totalUnits = cell.bins.reduce((s, b) => s + b.count, 0);
    const low = lowStock(cell).length;
    const expSoon = expiringSoon(cell, nowMs).length;
    const exp = expired(cell, nowMs).length;
    return `Inventory Guardian: ${totalBins} bins, ${totalUnits} units. Low: ${low}, Expiring: ${expSoon}, Expired: ${exp}`;
}
function witnessLog(cell, binId) {
    return cell.bins.find(b => b.id === binId)?.witnessLog ?? [];
}
