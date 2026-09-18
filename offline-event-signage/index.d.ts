/**
 * Modular Offline Event Signage Grid
 *
 * Each LED pixel in the grid = a cell in the Quilt lattice.
 * Users update via Bluetooth (no Wi-Fi/cloud required).
 * Lattice runs entirely offline.
 *
 * Use case: small venue signage (church halls, community book fairs,
 * local concert series, basement meetups)
 *
 * Deployment: 16x16 LED panel + ESP32 + Bluetooth HID
 */
export type PixelState = 0 | 1 | 2 | 3;
export interface Pixel {
    x: number;
    y: number;
    state: PixelState;
    rgb: [number, number, number];
    witnessLog: Witness[];
}
export interface Witness {
    type: 'BIND' | 'EFFECT' | 'DEATH';
    pixel: string;
    t: number;
    data?: any;
}
export interface SignageGrid {
    width: number;
    height: number;
    pixels: Pixel[][];
    labels: string[];
    templates: Map<string, GridSnapshot>;
    tickCount: number;
}
export interface GridSnapshot {
    name: string;
    width: number;
    height: number;
    pixels: PixelState[][];
    createdAt: number;
}
export declare function createGrid(width?: number, height?: number): SignageGrid;
export declare function setPixel(grid: SignageGrid, x: number, y: number, state: PixelState, rgb?: [number, number, number]): boolean;
export declare function fillRect(grid: SignageGrid, x0: number, y0: number, w: number, h: number, state: PixelState, rgb: [number, number, number]): number;
export declare function clearGrid(grid: SignageGrid): void;
export declare function drawText(grid: SignageGrid, text: string, x: number, y: number): boolean;
export declare function saveTemplate(grid: SignageGrid, name: string): GridSnapshot;
export declare function loadTemplate(grid: SignageGrid, name: string): boolean;
export declare function listTemplates(grid: SignageGrid): string[];
export declare function setLabel(grid: SignageGrid, label: string): void;
export declare function render(grid: SignageGrid): string;
export declare function pixelWitnessCount(grid: SignageGrid, x: number, y: number): number;
export declare function totalWitnesses(grid: SignageGrid): number;
