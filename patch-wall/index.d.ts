/**
 * PatchWall — Industrial I/O Lineage Viewer
 *
 * Each PLC tag/I/O point = a Quilt cell.
 * Relationships (sensor→tag→alarm→SCADA) = LINK edges between cells.
 * Static CSV import of point lists; renders lineage as a graph.
 *
 * Use case: Controls engineers at mid-size plants (50-500 I/O points)
 * needing to trace "what else breaks if I touch this point?"
 */
export interface PointCell {
    id: string;
    tag: string;
    type: 'sensor' | 'tag' | 'alarm' | 'consumer' | 'controller';
    location: string;
    description: string;
    witnesses: Witness[];
}
export interface Witness {
    type: 'BIND' | 'LINK' | 'EFFECT';
    cellId: string;
    t: number;
    data?: any;
}
export interface LineageLink {
    from: string;
    to: string;
    type: 'feeds' | 'alarms' | 'consumes' | 'controls';
}
export interface PatchWallCell {
    id: string;
    points: Map<string, PointCell>;
    links: LineageLink[];
    tickCount: number;
}
export declare function createPatchWall(id?: string): PatchWallCell;
export declare function addPoint(cell: PatchWallCell, tag: string, type: PointCell['type'], location: string, description?: string): PointCell;
export declare function linkPoints(cell: PatchWallCell, fromTag: string, toTag: string, linkType: LineageLink['type']): boolean;
export declare function upstream(cell: PatchWallCell, tag: string): PointCell[];
export declare function downstream(cell: PatchWallCell, tag: string): PointCell[];
export declare function impact(cell: PatchWallCell, tag: string): {
    direct: PointCell[];
    cascade: PointCell[];
};
export declare function importCSV(cell: PatchWallCell, csv: string): number;
export declare function toJSON(cell: PatchWallCell): {
    points: any[];
    links: any[];
};
export declare function renderGraph(cell: PatchWallCell): string;
export declare function pointCount(cell: PatchWallCell): number;
export declare function linkCount(cell: PatchWallCell): number;
export declare function blastRadius(cell: PatchWallCell, tag: string): PointCell[];
export declare function rootPoints(cell: PatchWallCell): PointCell[];
export declare function leafPoints(cell: PatchWallCell): PointCell[];
