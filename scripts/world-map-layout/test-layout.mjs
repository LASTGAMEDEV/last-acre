import assert from 'node:assert/strict';
import { generateWorldMapLayout, polygonArea } from './generate-layout.mjs';

const layout = generateWorldMapLayout();

assert.ok(layout.fields.length > 200, `expected more than 200 fields, got ${layout.fields.length}`);

const farmIds = new Set(layout.farms.map((farm) => farm.id));
assert.equal(farmIds.size, 8, `expected 8 farms, got ${farmIds.size}`);

for (const field of layout.fields) {
  assert.ok(farmIds.has(field.farmId), `field ${field.id} has unknown farm ${field.farmId}`);
  assert.ok(field.hectares >= 2.5, `field ${field.id} is too small: ${field.hectares} ha`);
  assert.ok(field.hectares <= 40, `field ${field.id} is too large: ${field.hectares} ha`);

  const computed = polygonArea(field.points) / layout.squarePixelsPerHectare;
  assert.ok(
    Math.abs(computed - field.hectares) < 0.01,
    `field ${field.id} hectares ${field.hectares} does not match geometry ${computed.toFixed(2)}`,
  );
}

const smallest = layout.fields.reduce((min, field) => field.hectares < min.hectares ? field : min);
const largest = layout.fields.reduce((max, field) => field.hectares > max.hectares ? field : max);

assert.ok(largest.hectares > smallest.hectares * 4, 'layout should visibly vary field sizes');

console.log(`PASS ${layout.fields.length} fields across ${farmIds.size} farms`);
