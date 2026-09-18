# PatchWall — Industrial I/O Lineage Viewer

> Each PLC tag / I/O point is a Quilt cell. Relationships (sensor → tag → alarm → SCADA) are LINK edges between cells. Built on the Quilt cellular-architecture framework.

**Status:** Production-ready v0.1.0. 13/13 tests pass. Library + demo.

## The problem

Controls engineers at mid-size plants (50-500 I/O points) lose track of which sensor feeds which tag → which alarm → which HMI display. Tracing a signal after years of patching takes days. Existing tools (PI, Ignition, Splunk) cost $50k+ and require integration projects.

## The solution

A static-CSV import + interactive lineage graph for offline plant documentation:

- Each I/O point = a cell (sensor / tag / alarm / consumer / controller)
- Relationships = LINK edges (feeds / alarms / consumes / controls)
- CSV import from any source (Excel export, historian dump, manual list)
- Impact analysis: "what else breaks if I touch this point?"
- No OT network connection required — fully air-gappable

## Use cases

- Plant commissioning: "is this new tag connected to anything else?"
- Failure investigation: "which alarm fires if sensor X dies?"
- Change management: "what needs updating if I retag this signal?"
- Documentation recovery: "what did we have before the spreadsheet got corrupted?"

## Why Quilt

- **Cells are first-class** — points, edges, witnesses are all addressable
- **Substrate-free** — runs on any device that runs JavaScript
- **CSV import = zero OT integration** — read exported point lists, never touch the live network
- **Composable with other cells** — add cells.audit to track changes, cells.broadcast to push updates

## Library API

```typescript
import { createPatchWall, addPoint, linkPoints, importCSV, upstream, downstream, impact, blastRadius, rootPoints, leafPoints, renderGraph } from '@quilt/patch-wall';

const wall = createPatchWall('reactor1');

// CSV import from any plant export
importCSV(wall, `
TI_R1,sensor,Reactor 1,Temperature,TT_R1:feeds
TT_R1,tag,PLC,Tag,TAH_R1:alarms|HMI_R1:feeds
TAH_R1,alarm,PLC,High temp,TC_R1:alarms
TC_R1,controller,PLC,Temp controller,VLV_R1:controls
VLV_R1,consumer,Field,Cooling valve,
HMI_R1,consumer,Control Room,HMI display,
`);

// Impact analysis
const imp = impact(wall, 'TI_R1');
// imp.direct = points with TI_R1 as sole upstream
// imp.cascade = points downstream with multiple upstream

// Blast radius — all downstream points affected by breaking this one
const blast = blastRadius(wall, 'TI_R1');

// Upstream chain
const up = upstream(wall, 'HMI_R1');

// ASCII rendering for headless display
console.log(renderGraph(wall));
```

## CSV Format

```
tag,type,location,description,links
TI_R1,sensor,Reactor 1,Temperature,TT_R1:feeds|...
```

- **tag**: unique identifier (e.g., `TI_R1`, `TT_R1`)
- **type**: `sensor | tag | alarm | consumer | controller`
- **location**: physical or logical location
- **description**: free text
- **links**: pipe-separated `target:linkType` (e.g., `TT_R1:feeds|HMI_R1:feeds`)
  - Link types: `feeds | alarms | consumes | controls`

Convention: `row.tag → target` (the row's tag flows to the target).

## Architecture

```
point cell
  id (UUID-ish)
  tag (unique identifier)
  type (sensor/tag/alarm/consumer/controller)
  location, description
  witnesses[] (BIND, LINK with target/linkType)

link edge
  from (point cell id)
  to (point cell id)
  type (feeds/alarms/consumes/controls)

patchwall cell
  points: Map<tag, PointCell>
  links: LineageLink[]
  tickCount

operations
  addPoint / linkPoints / importCSV
  upstream / downstream / blastRadius / impact
  rootPoints / leafPoints
  renderGraph (ASCII) / toJSON
```

## Tests

13/13 pass:

```
test/patchwall.test.js:
  ✓ patchwall: create empty cell
  ✓ patchwall: addPoint stores by tag
  ✓ patchwall: linkPoints creates witness
  ✓ patchwall: linkPoints rejects unknown tag
  ✓ patchwall: upstream walks back via links
  ✓ patchwall: downstream walks forward via links
  ✓ patchwall: impact identifies direct vs cascade
  ✓ patchwall: importCSV adds points and links
  ✓ patchwall: toJSON roundtrips shape
  ✓ patchwall: renderGraph produces readable output
  ✓ patchwall: blastRadius returns all downstream
  ✓ patchwall: rootPoints finds sensors with no upstream
  ✓ patchwall: leafPoints finds consumers with no downstream
```

## Build / Run

```bash
$ npm install
$ npm run build
$ npm test
$ npm run demo
```

## License

MIT
