import { GUIDE_ENTRIES, getGuideEntry } from '../data/guideEntries';
import { buildGuideContext, getEraSection, getFarmStatePanel } from '../engine/guideContext';

const context = buildGuideContext({
  day: 365 * 15,
  money: 2500,
  inventory: { wheat: 120 },
  buildings: ['bld_water_tower'],
  ownedCropSeedIds: ['wheat'],
  ownedAnimalTypeIds: ['vaca'],
});

const cropEntry = getGuideEntry('crop_wheat');
if (!cropEntry) {
  throw new Error('Expected wheat guide entry');
}

const eraSection = getEraSection(cropEntry, context);
if (!eraSection || !eraSection.body.includes('198')) {
  throw new Error('Expected era-aware wheat guide section for the 1980s');
}

const farmPanel = getFarmStatePanel(cropEntry, context);
if (!farmPanel || farmPanel.rows.length === 0) {
  throw new Error('Expected farm-state panel for wheat');
}

if (!farmPanel.nextActions.some(action => action.toLowerCase().includes('plant'))) {
  throw new Error('Expected wheat panel to suggest planting when seed is owned');
}

if (GUIDE_ENTRIES.length < 12) {
  throw new Error('Expected first guide content pass to include at least 12 entries');
}

console.log('guide context check passed');
