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
export declare function createInventoryGuardian(initialBins?: Omit<InventoryBin, 'id' | 'witnessLog'>[], threshold?: number, expiryWarnMs?: number): InventoryCell;
export declare function restock(cell: InventoryCell, binId: number, count: number): boolean;
export declare function sell(cell: InventoryCell, binId: number, count: number): boolean;
export declare function lowStock(cell: InventoryCell): InventoryBin[];
export declare function expiringSoon(cell: InventoryCell, nowMs?: number): InventoryBin[];
export declare function expired(cell: InventoryCell, nowMs?: number): InventoryBin[];
export interface Alert {
    type: 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED';
    binId: number;
    binName: string;
    message: string;
}
export declare function alerts(cell: InventoryCell, nowMs?: number): Alert[];
export declare function summary(cell: InventoryCell, nowMs?: number): string;
export declare function witnessLog(cell: InventoryCell, binId: number): Witness[];
