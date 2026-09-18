"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGrid = createGrid;
exports.setPixel = setPixel;
exports.fillRect = fillRect;
exports.clearGrid = clearGrid;
exports.drawText = drawText;
exports.saveTemplate = saveTemplate;
exports.loadTemplate = loadTemplate;
exports.listTemplates = listTemplates;
exports.setLabel = setLabel;
exports.render = render;
exports.pixelWitnessCount = pixelWitnessCount;
exports.totalWitnesses = totalWitnesses;
function createGrid(width = 16, height = 16) {
    const pixels = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const p = {
                x, y, state: 0, rgb: [0, 0, 0],
                witnessLog: [{ type: 'BIND', pixel: `${x},${y}`, t: 0 }]
            };
            row.push(p);
        }
        pixels.push(row);
    }
    return { width, height, pixels, labels: [], templates: new Map(), tickCount: 0 };
}
function setPixel(grid, x, y, state, rgb) {
    if (x < 0 || x >= grid.width || y < 0 || y >= grid.height)
        return false;
    const p = grid.pixels[y][x];
    const oldState = p.state;
    p.state = state;
    if (rgb)
        p.rgb = rgb;
    if (oldState !== state) {
        p.witnessLog.push({ type: 'EFFECT', pixel: `${x},${y}`, t: grid.tickCount, data: { old: oldState, new: state, rgb: p.rgb } });
        grid.tickCount++;
    }
    return true;
}
function fillRect(grid, x0, y0, w, h, state, rgb) {
    let n = 0;
    for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
            if (setPixel(grid, x, y, state, rgb))
                n++;
        }
    }
    return n;
}
function clearGrid(grid) {
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            setPixel(grid, x, y, 0);
        }
    }
}
const FONT_5x7 = {
    'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
    'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
    'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    'I': ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
    'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    'W': ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    'Y': ['10001', '10001', '10001', '01010', '00100', '00100', '00100'],
    'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
    '.': ['00000', '00000', '00000', '00000', '00000', '00000', '00100'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000']
};
function drawText(grid, text, x, y) {
    let cursorX = x;
    const COLOR = [255, 80, 80];
    for (const ch of text.toUpperCase()) {
        const glyph = FONT_5x7[ch];
        if (!glyph) {
            cursorX += 6;
            continue;
        }
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 5; col++) {
                if (glyph[row][col] === '1') {
                    setPixel(grid, cursorX + col, y + row, 1, COLOR);
                }
            }
        }
        cursorX += 6;
    }
    return true;
}
function saveTemplate(grid, name) {
    const pixels = [];
    for (let y = 0; y < grid.height; y++) {
        const row = [];
        for (let x = 0; x < grid.width; x++) {
            row.push(grid.pixels[y][x].state);
        }
        pixels.push(row);
    }
    const snap = { name, width: grid.width, height: grid.height, pixels, createdAt: Date.now() };
    grid.templates.set(name, snap);
    return snap;
}
function loadTemplate(grid, name) {
    const t = grid.templates.get(name);
    if (!t)
        return false;
    clearGrid(grid);
    for (let y = 0; y < t.height && y < grid.height; y++) {
        for (let x = 0; x < t.width && x < grid.width; x++) {
            setPixel(grid, x, y, t.pixels[y][x]);
        }
    }
    return true;
}
function listTemplates(grid) {
    return Array.from(grid.templates.keys());
}
function setLabel(grid, label) {
    grid.labels.push(label);
    if (grid.labels.length > 100)
        grid.labels = grid.labels.slice(-100);
}
function render(grid) {
    const chars = [' ', '█', '▓', '░'];
    let out = '';
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            out += chars[grid.pixels[y][x].state];
        }
        out += '\n';
    }
    return out;
}
function pixelWitnessCount(grid, x, y) {
    if (x < 0 || x >= grid.width || y < 0 || y >= grid.height)
        return 0;
    return grid.pixels[y][x].witnessLog.length;
}
function totalWitnesses(grid) {
    let n = 0;
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            n += grid.pixels[y][x].witnessLog.length;
        }
    }
    return n;
}
