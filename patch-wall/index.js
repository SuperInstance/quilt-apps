"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPatchWall = createPatchWall;
exports.addPoint = addPoint;
exports.linkPoints = linkPoints;
exports.upstream = upstream;
exports.downstream = downstream;
exports.impact = impact;
exports.importCSV = importCSV;
exports.toJSON = toJSON;
exports.renderGraph = renderGraph;
exports.pointCount = pointCount;
exports.linkCount = linkCount;
exports.blastRadius = blastRadius;
exports.rootPoints = rootPoints;
exports.leafPoints = leafPoints;
function createPatchWall(id = 'patchwall') {
    return { id, points: new Map(), links: [], tickCount: 0 };
}
function addPoint(cell, tag, type, location, description = '') {
    const p = {
        id: `pt-${cell.points.size}-${Date.now()}`,
        tag,
        type,
        location,
        description,
        witnesses: [{
                type: 'BIND',
                cellId: '',
                t: cell.tickCount++,
                data: { tag, type, location }
            }]
    };
    p.witnesses[0].cellId = p.id;
    cell.points.set(tag, p);
    return p;
}
function linkPoints(cell, fromTag, toTag, linkType) {
    const from = cell.points.get(fromTag);
    const to = cell.points.get(toTag);
    if (!from || !to)
        return false;
    cell.links.push({ from: from.id, to: to.id, type: linkType });
    from.witnesses.push({
        type: 'LINK',
        cellId: from.id,
        t: cell.tickCount++,
        data: { to: to.tag, linkType }
    });
    to.witnesses.push({
        type: 'LINK',
        cellId: to.id,
        t: cell.tickCount++,
        data: { from: from.tag, linkType }
    });
    return true;
}
function upstream(cell, tag) {
    const p = cell.points.get(tag);
    if (!p)
        return [];
    const incoming = cell.links.filter(l => l.to === p.id);
    const upstreamTags = [];
    for (const l of incoming) {
        const source = Array.from(cell.points.values()).find(x => x.id === l.from);
        if (source && !upstreamTags.includes(source.tag)) {
            upstreamTags.push(source.tag);
        }
    }
    const visited = new Set();
    const out = [];
    function walk(t) {
        if (visited.has(t))
            return;
        visited.add(t);
        const upstreamOf = upstream(cell, t);
        for (const u of upstreamOf)
            walk(u.tag);
        const pt = cell.points.get(t);
        if (pt && t !== tag)
            out.push(pt);
    }
    for (const t of upstreamTags)
        walk(t);
    return out;
}
function downstream(cell, tag) {
    const p = cell.points.get(tag);
    if (!p)
        return [];
    const outgoing = cell.links.filter(l => l.from === p.id);
    const downstreamIds = new Set();
    for (const l of outgoing)
        downstreamIds.add(l.to);
    const visited = new Set();
    const out = [];
    function walk(id) {
        if (visited.has(id))
            return;
        visited.add(id);
        const pt = Array.from(cell.points.values()).find(x => x.id === id);
        if (pt)
            out.push(pt);
        const subLinks = cell.links.filter(l => l.from === id);
        for (const sl of subLinks)
            walk(sl.to);
    }
    for (const id of downstreamIds)
        walk(id);
    return out;
}
function impact(cell, tag) {
    const ds = downstream(cell, tag);
    return {
        direct: ds.filter(p => {
            const sourceLinks = cell.links.filter(l => l.to === p.id);
            return sourceLinks.length === 1 && sourceLinks[0].from === cell.points.get(tag)?.id;
        }),
        cascade: ds.filter(p => {
            const sourceLinks = cell.links.filter(l => l.to === p.id);
            return sourceLinks.length > 1;
        })
    };
}
function importCSV(cell, csv) {
    // Format: tag,type,location,description,links
    // links = pipe-separated: target1:feeds|target2:alarms
    const lines = csv.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('#'));
    let added = 0;
    // First pass: add points
    for (const line of lines) {
        const [tag, type, location, description] = line.split(',').map(s => s.trim());
        if (!tag || !type)
            continue;
        if (!['sensor', 'tag', 'alarm', 'consumer', 'controller'].includes(type))
            continue;
        addPoint(cell, tag, type, location || '', description || '');
        added++;
    }
    // Second pass: add links
    for (const line of lines) {
        const [tag, , , , linksStr] = line.split(',').map(s => s.trim());
        if (!tag || !linksStr)
            continue;
        for (const linkSpec of linksStr.split('|')) {
            const [target, ltype] = linkSpec.split(':');
            if (target && ltype) {
                linkPoints(cell, tag, target, ltype);
            }
        }
    }
    return added;
}
function toJSON(cell) {
    return {
        points: Array.from(cell.points.values()).map(p => ({
            id: p.id, tag: p.tag, type: p.type, location: p.location, description: p.description
        })),
        links: cell.links.map(l => ({ from: l.from, to: l.to, type: l.type }))
    };
}
function renderGraph(cell) {
    // ASCII rendering of the graph
    const lines = [];
    for (const tag of Array.from(cell.points.keys())) {
        const p = cell.points.get(tag);
        const downstreamTags = downstream(cell, tag).map(d => d.tag).slice(0, 5);
        const upstreamTags = upstream(cell, tag).map(u => u.tag).slice(0, 5);
        lines.push(`[${p.type.toUpperCase()}] ${p.tag} @ ${p.location}`);
        if (upstreamTags.length > 0) {
            lines.push(`  ← ${upstreamTags.join(', ')}`);
        }
        if (downstreamTags.length > 0) {
            lines.push(`  → ${downstreamTags.join(', ')}`);
        }
    }
    return lines.join('\n');
}
function pointCount(cell) {
    return cell.points.size;
}
function linkCount(cell) {
    return cell.links.length;
}
function blastRadius(cell, tag) {
    return downstream(cell, tag);
}
function rootPoints(cell) {
    // Points with no upstream — these are the "sensors" or top of chain
    const hasUpstream = new Set();
    for (const link of cell.links) {
        hasUpstream.add(link.to);
    }
    return Array.from(cell.points.values()).filter(p => !hasUpstream.has(p.id));
}
function leafPoints(cell) {
    // Points with no downstream
    const hasDownstream = new Set();
    for (const link of cell.links) {
        hasDownstream.add(link.from);
    }
    return Array.from(cell.points.values()).filter(p => !hasDownstream.has(p.id));
}
