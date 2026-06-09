import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GUIDE_ENTRIES, getGuideEntry } from '../data/guideEntries';
import {
  buildGuideContext,
  getEraSection,
  getFarmStatePanel,
  getSuggestedGuideEntries,
} from '../engine/guideContext';

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

const riskPanel = getFarmStatePanel(
  {
    ...cropEntry,
    farmStateRules: [{ kind: 'finance' }, { kind: 'market' }, { kind: 'inventory' }, { kind: 'animal' }, { kind: 'generic' }],
  },
  buildGuideContext({
    day: 40,
    money: 500,
    inventory: { wheat: 40 },
    buildings: [],
    loansTotalOwed: 6000,
    urgentLoanCount: 1,
    activeContractCount: 2,
    urgentContractCount: 1,
    readyCropCount: 3,
    lowAnimalWelfareCount: 2,
    brokenMachineCount: 1,
    expiringStorageBatchCount: 1,
  }),
);

for (const expected of ['Urgent loans', 'Urgent contracts', 'Storage batches at risk', 'Low welfare animals', 'Ready crops', 'Machine repairs']) {
  if (!riskPanel?.rows.some(row => row.label === expected)) {
    throw new Error(`Expected risk farm-state panel row: ${expected}`);
  }
}

if (GUIDE_ENTRIES.length < 12) {
  throw new Error('Expected first guide content pass to include at least 12 entries');
}

const suggested = getSuggestedGuideEntries(
  buildGuideContext({
    day: 35,
    money: 650,
    inventory: { wheat: 30 },
    buildings: [],
    ownedCropSeedIds: ['wheat'],
    ownedAnimalTypeIds: ['vaca'],
    urgentLoanCount: 1,
    readyCropCount: 2,
    lowAnimalWelfareCount: 1,
  }),
  GUIDE_ENTRIES,
).map(entry => entry.id);

for (const expected of ['problem_no_money', 'system_banking_credit', 'system_market_prices', 'system_animals_welfare']) {
  if (!suggested.includes(expected)) {
    throw new Error(`Expected suggested guide entries to include ${expected}; got ${suggested.join(', ')}`);
  }
}

for (const expected of ['system_crop_rotation', 'system_animal_genetics', 'system_seed_lab', 'system_futures_trading']) {
  if (!getGuideEntry(expected)) {
    throw new Error(`Expected guide entry ${expected}`);
  }
}

const knownIds = new Set(GUIDE_ENTRIES.map(entry => entry.id));
const sourceRoots = ['app', 'components'];

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return collectSourceFiles(path);
    return /\.(tsx|ts)$/.test(name) ? [path] : [];
  });
}

for (const file of sourceRoots.flatMap(collectSourceFiles)) {
  const text = readFileSync(file, 'utf8');
  const entryIds = [...text.matchAll(/entryId="([^"]+)"/g)].map(match => match[1]);
  for (const entryId of entryIds) {
    if (!knownIds.has(entryId)) {
      throw new Error(`${file} references missing guide entry ${entryId}`);
    }
  }

  for (const helpMatch of text.matchAll(/<HelpSheet\b([^>]*?)(\/>|>)/gs)) {
    const props = helpMatch[1];
    if (!props.includes('entryId=')) {
      throw new Error(`${file} has a HelpSheet without entryId`);
    }
  }
}

console.log('guide context check passed');
