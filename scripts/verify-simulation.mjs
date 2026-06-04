import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const initialState = read('store/initialState.ts');
const gameState = read('types/domain/gameState.ts');
const store = read('store/useGameStore.ts');

[
  'day: 1',
  'money:',
  'parcels:',
  'prices:',
  'animals:',
  'buildings:',
  'electricity:',
].forEach((needle) => assertIncludes(initialState, needle, `initial state field`));

[
  'advanceDay: () => void',
  'advanceDays: (n: number) => void',
  'buyAnimal:',
  'processProduct:',
  'upgradeGridTier:',
].forEach((needle) => assertIncludes(gameState, needle, `GameState action contract`));

assertIncludes(store, 'advanceDay:', 'store advanceDay action');
assertIncludes(store, 'createAnimalActions(set, get)', 'animal action factory wiring');
assertIncludes(store, 'createMachineryActions(set, get)', 'machinery action factory wiring');
assertIncludes(store, 'createProcessingActions(set, get)', 'processing action factory wiring');
assertIncludes(store, 'createAuctionActions(set, get)', 'auction action factory wiring');
assertIncludes(store, 'createElectricityActions(set, get)', 'electricity action factory wiring');

console.log('Simulation architecture verification passed.');
