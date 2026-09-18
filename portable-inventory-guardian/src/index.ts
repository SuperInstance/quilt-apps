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

export interface InventoryBin {
  id: number;
  name: string;
  count: number;
  expiryMs: number;
  addedAt: number;
  witnessLog: Witness[];
}

export interface Witness {
  type: 'BIND' | 'LINK' | 'EFFECT' | 'TICK' | 'DEATH';
  cellId: number;
  t: number;
  data?: any;
}

export interface InventoryCell {
  bins: InventoryBin[];
  threshold: number;
  expiryWarnMs: number;
  tickCount: number;
}

export function createInventoryGuardian(
  initialBins: Omit<InventoryBin, 'id' | 'witnessLog'>[] = [],
  threshold: number = 5,
  expiryWarnMs: number = 24 * 60 * 60 * 1000
): InventoryCell {
  const bins = initialBins.map((b, i) => ({ ...b, id: i, witnessLog: [] }));
  const cell: InventoryCell = { bins, threshold, expiryWarnMs, tickCount: 0 };
  for (const bin of bins) {
    bin.witnessLog.push({ type: 'BIND', cellId: bin.id, t: 0, data: { count: bin.count } });
  }
  return cell;
}

export function restock(cell: InventoryCell, binId: number, count: number): boolean {
  const bin = cell.bins.find(b => b.id === binId);
  if (!bin) return false;
  bin.count += count;
  bin.witnessLog.push({ type: 'EFFECT', cellId: binId, t: cell.tickCount, data: { count, newTotal: bin.count } });
  cell.tickCount++;
  return true;
}

export function sell(cell: InventoryCell, binId: number, count: number): boolean {
  const bin = cell.bins.find(b => b.id === binId);
  if (!bin || bin.count < count) return false;
  bin.count -= count;
  bin.witnessLog.push({ type: 'EFFECT', cellId: binId, t: cell.tickCount, data: { count: -count, newTotal: bin.count } });
  cell.tickCount++;
  return true;
}

export function lowStock(cell: InventoryCell): InventoryBin[] {
  return cell.bins.filter(b => b.count < cell.threshold);
}

export function expiringSoon(cell: InventoryCell, nowMs: number = Date.now()): InventoryBin[] {
  return cell.bins.filter(b => (b.expiryMs - nowMs) < cell.expiryWarnMs && (b.expiryMs - nowMs) > 0 && b.count > 0);
}

export function expired(cell: InventoryCell, nowMs: number = Date.now()): InventoryBin[] {
  return cell.bins.filter(b => (b.expiryMs - nowMs) < 0 && b.count > 0);
}

export interface Alert {
  type: 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED';
  binId: number;
  binName: string;
  message: string;
}

export function alerts(cell: InventoryCell, nowMs: number = Date.now()): Alert[] {
  const out: Alert[] = [];
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

export function summary(cell: InventoryCell, nowMs: number = Date.now()): string {
  const totalBins = cell.bins.length;
  const totalUnits = cell.bins.reduce((s, b) => s + b.count, 0);
  const low = lowStock(cell).length;
  const expSoon = expiringSoon(cell, nowMs).length;
  const exp = expired(cell, nowMs).length;
  return `Inventory Guardian: ${totalBins} bins, ${totalUnits} units. Low: ${low}, Expiring: ${expSoon}, Expired: ${exp}`;
}

export function witnessLog(cell: InventoryCell, binId: number): Witness[] {
  return cell.bins.find(b => b.id === binId)?.witnessLog ?? [];
}
