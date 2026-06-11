import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANVAS_W = 1400;
export const CANVAS_H = 1800;
export const SQUARE_PIXELS_PER_HECTARE = 240;

const FARM_DEFS = [
  { id: 'npc_rivera', name: 'Rivera Ranch', region: 'northwest', color: '#bf6a5c', rows: 4, cols: 7, skip: new Set(['0,0', '0,1', '1,0']) },
  { id: 'npc_verde', name: 'Verde Fields', region: 'north', color: '#6fac58', rows: 4, cols: 7, skip: new Set(['0,5', '0,6']) },
  { id: 'npc_sierra', name: 'Sierra Agro', region: 'northeast', color: '#8e76c9', rows: 5, cols: 6, skip: new Set(['0,0', '4,5']) },
  { id: 'npc_golden', name: 'Golden Valley Co.', region: 'west', color: '#d6aa48', rows: 5, cols: 6, skip: new Set(['1,5', '2,5']) },
  { id: 'npc_altavista', name: 'Altavista Farms', region: 'central', color: '#6fa3c9', rows: 5, cols: 6, skip: new Set(['0,2', '0,3', '4,2', '4,3']) },
  { id: 'npc_millbrook', name: 'Millbrook Organics', region: 'east', color: '#72a06a', rows: 5, cols: 6, skip: new Set(['2,0']) },
  { id: 'npc_suncrest', name: 'Suncrest Orchards', region: 'southwest', color: '#c79840', rows: 5, cols: 6, skip: new Set(['4,0']) },
  { id: 'npc_las_lomas', name: 'Las Lomas Estate', region: 'southeast', color: '#78b8a0', rows: 5, cols: 7, skip: new Set(['0,0', '4,6']) },
];

const REGION_BOUNDS = {
  northwest: { x: 60, y: 120, w: 360, h: 500 },
  north: { x: 430, y: 80, w: 460, h: 520 },
  northeast: { x: 920, y: 100, w: 330, h: 640 },
  west: { x: 60, y: 650, w: 410, h: 570 },
  central: { x: 500, y: 640, w: 390, h: 610 },
  east: { x: 910, y: 760, w: 360, h: 560 },
  southwest: { x: 120, y: 1230, w: 440, h: 520 },
  southeast: { x: 610, y: 1270, w: 610, h: 470 },
};

const REGION_PREFIX = {
  northwest: 'Ridge',
  north: 'Highroad',
  northeast: 'Riverbend',
  west: 'Goldbank',
  central: 'Market',
  east: 'Millrace',
  southwest: 'Suncrest',
  southeast: 'Lomas',
};

const FIELD_NOUNS = [
  'Meadow', 'Pasture', 'Orchard', 'Bottom', 'Terrace', 'Croft', 'Paddock', 'Field',
  'Vega', 'Slope', 'Hollow', 'Close', 'Grove', 'Strip', 'Fold', 'Ridge',
];

const CROP_HINTS = [
  'wheat', 'corn', 'barley', 'oats', 'soy', 'sunflower', 'potatoes', 'rapeseed',
  'tomatoes', 'lettuce', 'alfalfa', 'grapes', 'apples', 'cotton', 'rice',
];

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function jitter(seed, amount) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * amount;
}

export function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function pointsToPath(points) {
  return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z';
}

function centroid(points) {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: Math.round(sum.x / points.length), y: Math.round(sum.y / points.length) };
}

function makeCell(bounds, rows, cols, r, c, farmIndex) {
  const x0 = bounds.x + (bounds.w * c) / cols;
  const x1 = bounds.x + (bounds.w * (c + 1)) / cols;
  const y0 = bounds.y + (bounds.h * r) / rows;
  const y1 = bounds.y + (bounds.h * (r + 1)) / rows;
  const maxJitter = Math.min((x1 - x0), (y1 - y0)) * 0.18;
  const seed = farmIndex * 1000 + r * 37 + c * 53;

  return [
    { x: Math.round(x0 + jitter(seed + 1, maxJitter)), y: Math.round(y0 + jitter(seed + 2, maxJitter)) },
    { x: Math.round(x1 + jitter(seed + 3, maxJitter)), y: Math.round(y0 + jitter(seed + 4, maxJitter)) },
    { x: Math.round(x1 + jitter(seed + 5, maxJitter)), y: Math.round(y1 + jitter(seed + 6, maxJitter)) },
    { x: Math.round(x0 + jitter(seed + 7, maxJitter)), y: Math.round(y1 + jitter(seed + 8, maxJitter)) },
  ];
}

function splitLargeField(points, seed) {
  const [a, b, c, d] = points;
  const vertical = Math.abs(b.x - a.x) >= Math.abs(d.y - a.y);
  const ratio = 0.42 + ((hash(String(seed)) % 17) / 100);

  if (vertical) {
    const top = { x: Math.round(a.x + (b.x - a.x) * ratio), y: Math.round(a.y + (b.y - a.y) * ratio) };
    const bottom = { x: Math.round(d.x + (c.x - d.x) * ratio), y: Math.round(d.y + (c.y - d.y) * ratio) };
    return [[a, top, bottom, d], [top, b, c, bottom]];
  }

  const left = { x: Math.round(a.x + (d.x - a.x) * ratio), y: Math.round(a.y + (d.y - a.y) * ratio) };
  const right = { x: Math.round(b.x + (c.x - b.x) * ratio), y: Math.round(b.y + (c.y - b.y) * ratio) };
  return [[a, b, right, left], [left, right, c, d]];
}

function splitCellForVariety(points, seed) {
  const [a, b, c, d] = points;
  const area = polygonArea(points);
  const hectares = area / SQUARE_PIXELS_PER_HECTARE;
  if (hectares < 14) return [points];

  const h = hash(String(seed));
  if (hectares >= 18 && h % 9 === 0) {
    const topMid = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
    const rightMid = { x: Math.round((b.x + c.x) / 2), y: Math.round((b.y + c.y) / 2) };
    const bottomMid = { x: Math.round((d.x + c.x) / 2), y: Math.round((d.y + c.y) / 2) };
    const leftMid = { x: Math.round((a.x + d.x) / 2), y: Math.round((a.y + d.y) / 2) };
    const middle = {
      x: Math.round((a.x + b.x + c.x + d.x) / 4),
      y: Math.round((a.y + b.y + c.y + d.y) / 4),
    };
    return [
      [a, topMid, middle, leftMid],
      [topMid, b, rightMid, middle],
      [middle, rightMid, c, bottomMid],
      [leftMid, middle, bottomMid, d],
    ].filter((part) => polygonArea(part) / SQUARE_PIXELS_PER_HECTARE >= 2.5);
  }

  const shouldSplit = h % 4 === 0;
  if (!shouldSplit) return [points];

  const vertical = Math.abs(b.x - a.x) >= Math.abs(d.y - a.y);
  const ratio = h % 3 === 0 ? 0.34 : h % 3 === 1 ? 0.42 : 0.55;
  let parts;

  if (vertical) {
    const top = { x: Math.round(a.x + (b.x - a.x) * ratio), y: Math.round(a.y + (b.y - a.y) * ratio) };
    const bottom = { x: Math.round(d.x + (c.x - d.x) * ratio), y: Math.round(d.y + (c.y - d.y) * ratio) };
    parts = [[a, top, bottom, d], [top, b, c, bottom]];
  } else {
    const left = { x: Math.round(a.x + (d.x - a.x) * ratio), y: Math.round(a.y + (d.y - a.y) * ratio) };
    const right = { x: Math.round(b.x + (c.x - b.x) * ratio), y: Math.round(b.y + (c.y - b.y) * ratio) };
    parts = [[a, b, right, left], [left, right, c, d]];
  }

  return parts.filter((part) => polygonArea(part) / SQUARE_PIXELS_PER_HECTARE >= 2.5);
}

function normalizeToBounds(points, bounds) {
  return points.map((p) => ({
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.w, p.x)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.h, p.y)),
  }));
}

function makeName(farm, fieldNumber) {
  const region = REGION_PREFIX[farm.region];
  const noun = FIELD_NOUNS[(fieldNumber + hash(farm.id)) % FIELD_NOUNS.length];
  return `${region} ${noun} ${fieldNumber}`;
}

function makeField(farm, farmIndex, fieldNumber, points) {
  const area = polygonArea(points);
  const hectares = Number((area / SQUARE_PIXELS_PER_HECTARE).toFixed(2));
  const center = centroid(points);
  const key = `${farm.id}-${fieldNumber}`;
  const h = hash(key);

  return {
    id: `mf-${farm.id.replace('npc_', '')}-${String(fieldNumber).padStart(2, '0')}`,
    name: makeName(farm, fieldNumber),
    farmId: farm.id,
    owner: farm.id,
    region: farm.region,
    points,
    svgPath: pointsToPath(points),
    approximateHa: hectares,
    hectares,
    labelX: center.x,
    labelY: center.y,
    fertility: 55 + (h % 31),
    askingPrice: Math.round(hectares * (5200 + (h % 2600))),
    knownCrop: CROP_HINTS[h % CROP_HINTS.length],
    scouted: false,
  };
}

function generateFarmFields(farm, farmIndex) {
  const bounds = REGION_BOUNDS[farm.region];
  const rawFields = [];

  for (let r = 0; r < farm.rows; r += 1) {
    for (let c = 0; c < farm.cols; c += 1) {
      if (farm.skip.has(`${r},${c}`)) continue;
      const cell = normalizeToBounds(makeCell(bounds, farm.rows, farm.cols, r, c, farmIndex), bounds);
      const hectares = polygonArea(cell) / SQUARE_PIXELS_PER_HECTARE;
      if (hectares > 40) {
        rawFields.push(...splitLargeField(cell, farmIndex * 100 + r * 10 + c));
      } else {
        rawFields.push(...splitCellForVariety(cell, farmIndex * 100 + r * 10 + c));
      }
    }
  }

  return rawFields
    .filter((points) => polygonArea(points) / SQUARE_PIXELS_PER_HECTARE >= 2.5)
    .map((points, index) => makeField(farm, farmIndex, index + 1, points));
}

function makePoi() {
  return [
    { id: 'poi-market-town', name: 'Market Town', type: 'town', x: 720, y: 1120, radius: 115 },
    { id: 'poi-north-village', name: 'Northwest Village', type: 'village', x: 250, y: 315, radius: 70 },
    { id: 'poi-auction-yard', name: 'Auction Yard', type: 'auction', x: 280, y: 1400, radius: 46 },
    { id: 'poi-grain-depot', name: 'Grain Depot', type: 'depot', x: 530, y: 1520, radius: 42 },
    { id: 'poi-old-mill', name: 'Old River Mill', type: 'mill', x: 930, y: 1040, radius: 42 },
    { id: 'poi-east-bridge', name: 'East Bridge', type: 'bridge', x: 1040, y: 980, radius: 30 },
  ];
}

export function generateWorldMapLayout() {
  const farms = FARM_DEFS.map(({ skip, rows, cols, ...farm }) => ({
    ...farm,
    fieldTarget: rows * cols - skip.size,
  }));
  const fields = FARM_DEFS.flatMap((farm, index) => generateFarmFields(farm, index));

  return {
    canvas: { width: CANVAS_W, height: CANVAS_H },
    squarePixelsPerHectare: SQUARE_PIXELS_PER_HECTARE,
    farms,
    fields,
    pointsOfInterest: makePoi(),
  };
}

function svgForLayout(layout) {
  const fields = layout.fields.map((field) => {
    const farm = FARM_DEFS.find((item) => item.id === field.farmId);
    return [
      `<path d="${field.svgPath}" fill="${farm.color}" fill-opacity="0.32" stroke="#f4e8b8" stroke-width="2"/>`,
      `<text x="${field.labelX}" y="${field.labelY}" font-size="10" text-anchor="middle" fill="#f7efd0">${field.hectares.toFixed(1)}ha</text>`,
    ].join('\n');
  }).join('\n');

  const pois = layout.pointsOfInterest.map((poi) => (
    `<circle cx="${poi.x}" cy="${poi.y}" r="${poi.radius}" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-width="3"/>`
  )).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#263f24"/>
      <stop offset="0.55" stop-color="#516b35"/>
      <stop offset="1" stop-color="#283a24"/>
    </linearGradient>
  </defs>
  <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#ground)"/>
  <path d="M 1055 0 C 1010 280 980 470 1010 690 C 1040 900 930 1080 840 1230 C 760 1370 700 1530 650 1800" fill="none" stroke="#164f73" stroke-width="42" stroke-linecap="round"/>
  <path d="M 350 0 C 330 370 420 650 560 890 C 680 1100 650 1370 500 1800" fill="none" stroke="#51483c" stroke-width="18" stroke-linecap="round"/>
  <path d="M 0 1080 C 270 1040 500 1040 720 1110 C 980 1190 1180 1100 1400 1080" fill="none" stroke="#51483c" stroke-width="18" stroke-linecap="round"/>
  ${fields}
  ${pois}
</svg>`;
}

export async function writeWorldMapLayoutArtifacts(rootDir = process.cwd()) {
  const layout = generateWorldMapLayout();
  const dataDir = join(rootDir, 'data', 'generated');
  const assetDir = join(rootDir, 'assets', 'images', 'world-map');
  await mkdir(dataDir, { recursive: true });
  await mkdir(assetDir, { recursive: true });
  await writeFile(join(dataDir, 'world-map-layout-v1.json'), JSON.stringify(layout, null, 2));
  await writeFile(join(assetDir, 'world-map-layout-v1.svg'), svgForLayout(layout));
  return layout;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const layout = await writeWorldMapLayoutArtifacts(rootDir);
  console.log(`Generated ${layout.fields.length} fields across ${layout.farms.length} farms.`);
}
