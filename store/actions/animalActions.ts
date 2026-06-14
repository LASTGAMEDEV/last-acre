import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { BREED_TYPES } from '../../data/breedTypes';
import { BUILDING_TYPES } from '../../data/buildingTypes';
import { ENCLOSURE_BUILDINGS } from '../../constants/enclosures';
import {
  AnimalGenes,
  AnimalTrait,
  OwnedAnimal,
  breedAnimalGenes,
  canBreed,
  collectProduction,
  getBreedPurebredMultiplier,
  inheritTrait,
  isMature,
  randomGenes,
  sellValue,
} from '../../engine/animals';
import type { FeedRation } from '../../engine/nutrition';
import { sellRevenue } from '../../engine/market';
import { getSeason } from '../../engine/climate';
import { consumeFromBatches } from '../../engine/storageQuality';
import type { HenilBatch, IncubationBatch } from '../../types/domain/processing';
import type { LandParcel } from '../../types/domain/land';
import type { OwnedAttachment } from '../../types/domain/machinery';
import type { ActionFactory } from './types';

function getEnclosureCapacity(buildings: string[], enclosureType: string): number {
  const ids = ENCLOSURE_BUILDINGS[enclosureType] ?? [];
  return buildings.reduce((s, bId) => {
    if (!ids.includes(bId)) return s;
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.capacity ?? 0);
  }, 0);
}

function hasGranero(buildings: string[]): boolean {
  return buildings.includes('bld_granero');
}

export interface AnimalActions {
  buyAnimal: (typeId: string, sex: 'male' | 'female') => void;
  addToHenil: () => void;
  feedAnimals: () => void;
  saveRation: (animalTypeId: string, ration: FeedRation) => void;
  sellAnimal: (animalId: string) => void;
  collectAnimalProduction: (animalId: string) => void;
  collectAllProduction: () => void;
  sellAnimalProduct: (productType: string, units: number) => void;
  breedAnimal: (animalId: string) => void;
  cullAnimal: (animalId: string) => void;
  treatAnimal: (animalId: string) => void;
  setBreedingPair: (femaleId: string, maleId: string) => void;
  clearBreedingPair: (femaleId: string) => void;
  designateAsSire: (animalId: string) => void;
  removeFromSirePen: (animalId: string) => void;
  spreadSlurry: () => void;
  fillSilagePit: (kgGrass: number) => void;
  setBiogasMode: (mode: 'income' | 'fuel') => void;
  queueEggsForIncubation: (typeId: string, quantity: number) => void;
  enterAnimalShow: (animalId: string) => void;
  withdrawAnimalShow: (animalId: string) => void;
  upgradeAnimalGene: (animalId: string, gene: keyof AnimalGenes) => void;
  cureDisease: (parcelId: string) => void;
  scheduleVetRound: () => void;
  quarantineAnimal: (animalId: string) => void;
}

export const createAnimalActions: ActionFactory<AnimalActions> = (set, get) => ({
  buyAnimal: (typeId, sex) => {
    const state = get();
    const animalType = ANIMAL_TYPES.find(a => a.id === typeId);
    if (!animalType || state.money < animalType.buyCost) return;
    const enclosureOccupant = state.animals.find((a: OwnedAnimal) => {
      const at = ANIMAL_TYPES.find(t => t.id === a.typeId);
      return at?.enclosureType === animalType.enclosureType;
    });
    if (enclosureOccupant && enclosureOccupant.typeId !== typeId) return;
    const capacity = getEnclosureCapacity(state.buildings, animalType.enclosureType);
    const currentCount = state.animals.filter((a: OwnedAnimal) => a.typeId === typeId).length;
    if (currentCount >= capacity) return;
    const fairMult = state.activeFair ? (1 - state.activeFair.discount) : 1.0;
    const sexMult = sex === 'male' ? 0.7 : 1.0;
    const cost = Math.round(animalType.buyCost * fairMult * sexMult);
    if (state.money < cost) return;
    const isDairy = typeId === 'vaca' || typeId === 'cabra' || typeId === 'bufalo';
    const freshenOffset = isDairy ? Math.floor(Math.random() * 120 + 30) : 0;
    const newBornDay = isDairy
      ? state.day - animalType.maturityDays - freshenOffset - 10
      : state.day;

    const hasQuarantinePen = state.buildings.includes('bld_quarantine_pen');
    const arrivedSick = !hasQuarantinePen && Math.random() < 0.15;

    const newAnimal: OwnedAnimal = {
      id: `animal_${Date.now()}`,
      typeId,
      sex,
      bornDay: newBornDay,
      lastProductionDay: state.day,
      lastBreedDay: state.day,
      sick: arrivedSick,
      sicknessDay: arrivedSick ? state.day : undefined,
      quarantineUntilDay: hasQuarantinePen ? state.day + 14 : undefined,
      genes: randomGenes(),
      ...(isDairy && sex === 'female' ? { lactationStartDay: state.day - freshenOffset } : {}),
    };
    set({ money: state.money - cost, animals: [...state.animals, newAnimal] });
  },

  addToHenil: () => {
    const state = get();
    if (!state.buildings.includes('bld_henil')) return;
    const activeCount = (state.henilQueue ?? []).filter(b => b.readyDay > state.day).length;
    if (activeCount >= 2) return;
    const grassAvailable = state.inventory['grass'] ?? 0;
    if (grassAvailable <= 0) return;
    const batchKg = Math.min(grassAvailable, 700);
    const { remainingBatches } = consumeFromBatches(state.inventoryBatches ?? [], 'grass', batchKg);
    const batch: HenilBatch = {
      batchId: `henil_${Date.now()}`,
      wetGrassKg: batchKg,
      startDay: state.day,
      readyDay: state.day + 3,
    };
    set({
      henilQueue: [...(state.henilQueue ?? []), batch],
      inventory: { ...state.inventory, grass: grassAvailable - batchKg },
      inventoryBatches: remainingBatches,
    });
  },

  feedAnimals: () => {
    const state = get();
    const hasAnimalWorker = (state.workers ?? []).some(
      (w) => w.role === 'livestock_hand' || w.role === 'veterinarian'
    );
    if (hasAnimalWorker) return;
    set({ animalsManuallyFed: true });
  },

  saveRation: (animalTypeId, ration) => {
    const state = get();
    set({
      savedRations: { ...state.savedRations, [animalTypeId]: ration },
    });
  },

  sellAnimal: (animalId) => {
    const state = get();
    const animal = state.animals.find(a => a.id === animalId);
    if (!animal) return;
    const animalType = ANIMAL_TYPES.find(a => a.id === animal.typeId);
    if (!animalType) return;
    const coopBonus = 1.0;
    const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
    const baseValue = sellValue(animal, animalType, state.day) * coopBonus * prestigeBonus;
    const weighCrateFunctional = (state.buildings ?? []).includes('bld_weigh_crate') &&
      (state.buildings ?? []).includes('bld_cattle_crush');
    const optimalBonus = weighCrateFunctional && (animal.optimalWeightReached ?? false) ? 1.05 : 1.0;
    const hasFinishingUnit = (state.buildings ?? []).some(bid =>
      bid === 'bld_finishing_unit_s' || bid === 'bld_finishing_unit_m' || bid === 'bld_finishing_unit_l'
    );
    const finishingBonus = hasFinishingUnit && animal.typeId === 'cerdo' ? 1.10 : 1.0;
    const breedMult = getBreedPurebredMultiplier(animal, BREED_TYPES);
    const value = Math.round(baseValue * optimalBonus * finishingBonus * breedMult);
    const nextPairs = { ...state.breedingPairs };
    delete nextPairs[animalId];
    for (const [femId, maleId] of Object.entries(nextPairs)) {
      if (maleId === animalId) delete nextPairs[femId];
    }
    set({
      money: state.money + value,
      animals: state.animals.filter(a => a.id !== animalId),
      salesLog: [...state.salesLog, { day: state.day, amount: value, category: 'animals' }],
      totalRevenue: state.totalRevenue + value,
      breedingPairs: nextPairs,
    });
  },

  collectAnimalProduction: (animalId) => {
    const state = get();
    const animal = state.animals.find(a => a.id === animalId);
    if (!animal) return;
    const animalType = ANIMAL_TYPES.find(a => a.id === animal.typeId);
    if (!animalType) return;
    const { units, nextDay } = collectProduction(
      animal,
      animalType,
      state.day,
      state.grainMissedDays ?? 0,
      state.hayMissedDays ?? 0,
    );
    if (units <= 0 || !animalType.productionType) return;
    const graneroBonus = hasGranero(state.buildings) ? 1.2 : 1.0;
    const legacyAnimalMult = (() => {
      const style = (state as any).farmStyle ?? 'balanced';
      const ac = (state as any).animals?.length ?? 0;
      const log = (state as any).salesLog as { day: number; amount: number; category: string }[] ?? [];
      const aRev90 = log.filter(s => s.day >= (state as any).day - 90 && s.category === 'animals').reduce((a, s) => a + s.amount, 0);
      const cRev90 = log.filter(s => s.day >= (state as any).day - 90 && s.category === 'crops').reduce((a, s) => a + s.amount, 0);
      if (style === 'livestock') {
        if (ac >= 25 && aRev90 >= 40000) return 1.20;
        if (ac >= 15 && aRev90 > cRev90) return 1.15;
        if (ac >= 5) return 1.10;
      } else if (style === 'balanced') {
        const pRev90 = log.filter(s => s.day >= (state as any).day - 90 && s.category === 'processed').reduce((a, s) => a + s.amount, 0);
        if (aRev90 >= 15000 && cRev90 >= 15000 && pRev90 >= 15000) return 1.10;
        if (aRev90 >= 5000 && cRev90 >= 5000 && pRev90 >= 5000) return 1.08;
        if (aRev90 > 1000 && cRev90 > 1000 && pRev90 > 1000) return 1.05;
      }
      return 1.0;
    })();
    const totalUnits = Math.round(units * graneroBonus * legacyAnimalMult);

    const hasCreamSeparator = state.buildings.includes('bld_cream_separator');
    const creamUnits = (hasCreamSeparator && animalType.productionType === 'milk')
      ? Math.floor(totalUnits * 0.1)
      : 0;
    const primaryUnits = totalUnits - creamUnits;

    const updatedInventory: Record<string, number> = {
      ...state.animalInventory,
      [animalType.productionType]: (state.animalInventory[animalType.productionType] ?? 0) + primaryUnits,
    };
    if (creamUnits > 0) {
      updatedInventory['cream'] = (state.animalInventory['cream'] ?? 0) + creamUnits;
    }

    set({
      animals: state.animals.map(a => a.id === animalId ? { ...a, lastProductionDay: nextDay } : a),
      animalInventory: updatedInventory,
    });
  },

  collectAllProduction: () => {
    const state = get();
    const graneroBonus = state.buildings.includes('bld_granero') ? 1.2 : 1.0;
    let newAnimalInventory = { ...state.animalInventory };
    const newAnimals = state.animals.map((animal: OwnedAnimal) => {
      const animalType = ANIMAL_TYPES.find(a => a.id === animal.typeId);
      if (!animalType?.productionType) return animal;
      const { units, nextDay } = collectProduction(animal, animalType, state.day);
      if (units <= 0) return animal;
      newAnimalInventory[animalType.productionType] = (newAnimalInventory[animalType.productionType] ?? 0) + Math.round(units * graneroBonus);
      return { ...animal, lastProductionDay: nextDay };
    });
    set({ animals: newAnimals, animalInventory: newAnimalInventory });
  },

  sellAnimalProduct: (productType, units) => {
    const state = get();
    const DAIRY_PRODUCT_SPECIES: Record<string, string> = {
      milk: 'vaca',
      goat_milk: 'cabra',
      buffalo_milk: 'bufalo',
    };
    const speciesForProduct = DAIRY_PRODUCT_SPECIES[productType];
    const grade = speciesForProduct
      ? ((state.milkGrades ?? {})[speciesForProduct] ?? 'B')
      : null;

    if (grade === 'C') {
      const activeMarket = state.selectedMarket ?? 'local';
      if (activeMarket === 'city' || activeMarket === 'export') {
        return;
      }
    }

    if (productType === 'milk') {
      const activeMarket = state.selectedMarket ?? 'local';
      if (activeMarket === 'city') {
        const hasPasteurisation = (state.buildings ?? []).includes('bld_pasteurisation_unit');
        if (!hasPasteurisation) return;
      }
    }

    const gradeMultiplier = grade === 'A' ? 1.10 : grade === 'C' ? 0.75 : 1.00;
    const product = ANIMAL_PRODUCTS.find(p => p.productType === productType);
    if (!product) return;
    const inStock = state.animalInventory[productType] ?? 0;
    const toSell = Math.min(units, inStock);
    if (toSell <= 0) return;
    const coopBonus = 1.0;
    const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
    const livePrice = (state.animalPrices ?? {})[productType] ?? product.basePrice;
    const hasWoolScouring = productType === 'wool' && (state.buildings ?? []).some((bid: string) =>
      bid === 'bld_wool_scouring_s' || bid === 'bld_wool_scouring_m' || bid === 'bld_wool_scouring_l'
    );
    const woolScouringBonus = hasWoolScouring ? 1.30 : 1.0;

    const hasSmokehouse = productType === 'meat' && (state.buildings ?? []).some((bid: string) =>
      bid === 'bld_smokehouse_s' || bid === 'bld_smokehouse_m' || bid === 'bld_smokehouse_l'
    );
    const smokehouseBonus = hasSmokehouse ? 1.40 : 1.0;

    const MEAT_SPECIES_WELFARE = new Set([
      'vaca', 'bufalo', 'cabra', 'oveja', 'cerdo', 'conejo', 'gallina', 'pato', 'codorniz',
    ]);
    const welfareScores = state.animalWelfareScores ?? {};
    let welfareMultiplier = 1.0;
    if (productType === 'meat') {
      const relevantScores = Object.entries(welfareScores)
        .filter(([typeId]) => MEAT_SPECIES_WELFARE.has(typeId))
        .map(([, score]) => score as number);
      if (relevantScores.length > 0) {
        const avgWelfare = relevantScores.reduce((s, v) => s + v, 0) / relevantScores.length;
        welfareMultiplier = avgWelfare >= 80 ? 1.10 : avgWelfare < 60 ? 0.90 : 1.00;
      }
    } else if (productType === 'wool') {
      const sheepWelfare = (welfareScores['oveja'] as number) ?? 60;
      welfareMultiplier = sheepWelfare >= 80 ? 1.10 : sheepWelfare < 60 ? 0.90 : 1.00;
    }

    const revenue = Math.round(sellRevenue(toSell, livePrice) * coopBonus * prestigeBonus * gradeMultiplier * woolScouringBonus * smokehouseBonus * welfareMultiplier);
    set({
      money: state.money + revenue,
      animalInventory: { ...state.animalInventory, [productType]: inStock - toSell },
      salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'animals' }],
      totalRevenue: state.totalRevenue + revenue,
    });
  },

  breedAnimal: (animalId) => {
    const state = get();
    const animal = state.animals.find((a: OwnedAnimal) => a.id === animalId);
    if (!animal || animal.sex !== 'female') return;
    const animalType = ANIMAL_TYPES.find(a => a.id === animal.typeId);
    if (!animalType) return;
    if (!canBreed(animal, animalType, state.day)) return;

    const matureMales = state.animals.filter(
      (a: OwnedAnimal) => a.id !== animalId && a.typeId === animal.typeId && a.sex === 'male' && isMature(a, animalType, state.day)
    );
    if (matureMales.length === 0) return;

    const capacity = getEnclosureCapacity(state.buildings, animalType.enclosureType);
    const currentCount = state.animals.filter((a: OwnedAnimal) => a.typeId === animal.typeId).length;
    if (currentCount >= capacity) return;

    const preferredId = state.breedingPairs[animalId];
    const father =
      (preferredId ? matureMales.find((a: OwnedAnimal) => a.id === preferredId) : undefined)
      ?? matureMales[0]!;

    const maternalTrait = inheritTrait(animal);
    const paternalTrait = father ? inheritTrait(father) : null;
    const offspringTraits = Array.from(new Set([maternalTrait, paternalTrait].filter(Boolean))) as AnimalTrait[];
    const offspringSex: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';

    const motherParents = animal.parentIds;
    const fatherParents = father?.parentIds;
    const grandparentIds: [string, string, string, string] | undefined =
      (motherParents && fatherParents)
        ? [motherParents[0], motherParents[1], fatherParents[0], fatherParents[1]]
        : undefined;

    const hasSirePen = state.buildings.includes('bld_sire_pen');
    const sirePenIds = state.sirePenAnimalIds ?? [];
    const sirePenMale = (state.animals ?? []).find(
      (a: OwnedAnimal) => {
        if (!sirePenIds.includes(a.id)) return false;
        if (a.typeId !== animal.typeId) return false;
        if (a.sex !== 'male') return false;
        const sirePenAnimalType = ANIMAL_TYPES.find(t => t.id === a.typeId);
        if (!sirePenAnimalType) return false;
        const matureDays = sirePenAnimalType.maturityDays ?? 0;
        return (state.day - a.bornDay) >= matureDays;
      }
    );
    const actualFather: OwnedAnimal | undefined = hasSirePen && sirePenMale ? sirePenMale : father;

    const motherBreedId = animal.breedId;
    const fatherBreedId = actualFather?.breedId;
    let offspringBreedId: string | undefined;
    let offspringCrossbreedParents: [string, string] | undefined;

    if (motherBreedId && fatherBreedId) {
      if (motherBreedId === fatherBreedId) {
        offspringBreedId = motherBreedId;
      } else {
        offspringCrossbreedParents = [motherBreedId, fatherBreedId];
      }
    }

    const offspring: OwnedAnimal = {
      id: `animal_${Date.now()}`,
      typeId: animal.typeId,
      sex: offspringSex,
      bornDay: state.day,
      lastProductionDay: state.day,
      lastBreedDay: state.day,
      sick: false,
      traits: offspringTraits.length > 0 ? offspringTraits : undefined,
      genes: breedAnimalGenes(animal, actualFather, BREED_TYPES),
      parentIds: [animalId, actualFather!.id],
      grandparentIds,
      breedId: offspringBreedId,
      crossbreedParents: offspringCrossbreedParents,
    };

    const CALVING_SPECIES = new Set(['vaca', 'cabra', 'bufalo', 'cerdo']);
    if (CALVING_SPECIES.has(offspring.typeId)) {
      const calvingCap = ['bld_calving_pen_s', 'bld_calving_pen_m', 'bld_calving_pen_l']
        .reduce((cap, bid) => {
          const bt = BUILDING_TYPES.find(b => b.id === bid);
          return state.buildings.includes(bid) ? cap + (bt?.capacity ?? 0) : cap;
        }, 0);
      const mortalityChance = calvingCap > 0 ? 0.05 : 0.25;
      if (Math.random() < mortalityChance) {
        return;
      }
    }

    const nextPairs = { ...state.breedingPairs };
    delete nextPairs[animalId];

    const isDairy = animal.typeId === 'vaca' || animal.typeId === 'cabra' || animal.typeId === 'bufalo';
    set({
      breedingPairs: nextPairs,
      animals: [
        ...state.animals.map((a: OwnedAnimal) => {
          if (a.id !== animalId) return a;
          return {
            ...a,
            lastBreedDay: state.day,
            ...(isDairy ? { lactationStartDay: state.day } : {}),
          };
        }),
        offspring,
      ],
    });
  },

  cullAnimal: (animalId) => set(state => {
    const animal = state.animals.find((a: OwnedAnimal) => a.id === animalId);
    if (!animal) return {};
    const animalType = ANIMAL_TYPES.find(a => a.id === animal.typeId);
    if (!animalType) return {};

    const MEAT_SPECIES = new Set(['cerdo', 'conejo', 'vaca', 'oveja', 'cabra', 'pavo', 'bufalo']);
    let moneyGain = 0;

    if (MEAT_SPECIES.has(animal.typeId)) {
      const DRESS_YIELDS: Record<string, { weightKg: number; dressPercent: number }> = {
        vaca: { weightKg: 550, dressPercent: 0.60 },
        bufalo: { weightKg: 480, dressPercent: 0.57 },
        cerdo: { weightKg: 110, dressPercent: 0.75 },
        oveja: { weightKg: 55, dressPercent: 0.50 },
        cabra: { weightKg: 45, dressPercent: 0.48 },
        conejo: { weightKg: 2.5, dressPercent: 0.55 },
        pavo: { weightKg: 12, dressPercent: 0.80 },
      };
      const spec = DRESS_YIELDS[animal.typeId];
      if (spec) {
        const ageFraction = isMature(animal, animalType, state.day)
          ? Math.min(1, (state.day - animal.bornDay) / animalType.maxPriceAge)
          : 0.4;
        const meatKg = spec.weightKg * spec.dressPercent * ageFraction * (animal.genes?.value ?? 1.0);
        const meatPrice = (state.prices ?? []).find((p) => p.cropId === 'meat')?.price ?? 4.50;
        moneyGain = Math.round(meatKg * meatPrice * 0.85);
      }
    }

    return {
      animals: state.animals.filter((a: OwnedAnimal) => a.id !== animalId),
      money: state.money + moneyGain,
      salesLog: moneyGain > 0
        ? [...(state.salesLog ?? []), { day: state.day, amount: moneyGain, category: 'animals' as const }]
        : state.salesLog,
    };
  }),

  treatAnimal: (animalId) => {
    const state = get();
    const animal = state.animals.find(a => a.id === animalId);
    if (!animal || !animal.sick) return;
    const animalType = ANIMAL_TYPES.find(a => a.id === animal.typeId);
    const cost = Math.max(50, Math.round((animalType?.maxSellPrice ?? 1000) * 0.05));
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      animals: state.animals.map(a => a.id === animalId ? { ...a, sick: false, sicknessDay: undefined } : a),
    });
  },

  setBreedingPair: (femaleId, maleId) => {
    set(state => ({
      breedingPairs: { ...state.breedingPairs, [femaleId]: maleId },
    }));
  },

  clearBreedingPair: (femaleId) => {
    set(state => {
      const next = { ...state.breedingPairs };
      delete next[femaleId];
      return { breedingPairs: next };
    });
  },

  designateAsSire: (animalId) => {
    const state = get();
    const animal = (state.animals ?? []).find((a: OwnedAnimal) => a.id === animalId);
    if (!animal || animal.sex !== 'male') return;
    if (!state.buildings.includes('bld_sire_pen')) return;
    const maxSires = BUILDING_TYPES.find(b => b.id === 'bld_sire_pen')?.capacity ?? 4;
    if ((state.sirePenAnimalIds ?? []).length >= maxSires) return;
    if ((state.sirePenAnimalIds ?? []).includes(animalId)) return;
    set({ sirePenAnimalIds: [...(state.sirePenAnimalIds ?? []), animalId] });
  },

  removeFromSirePen: (animalId) => {
    const state = get();
    set({ sirePenAnimalIds: (state.sirePenAnimalIds ?? []).filter((id: string) => id !== animalId) });
  },

  spreadSlurry: () => {
    const state = get();
    if ((state.slurryLevel ?? 0) <= 0) return;
    const hasSlurryTanker = (state.attachments ?? []).some(
      (a: OwnedAttachment) => a.typeId === 'att_slurry_tanker_s' || a.typeId === 'att_slurry_tanker_l'
    );
    if (!hasSlurryTanker) return;
    const newParcels = (state.parcels ?? []).map((p: LandParcel) => {
      if (!p.owned) return p;
      return { ...p, fertility: Math.min(25, p.fertility + 1) };
    });
    set({ parcels: newParcels, slurryLevel: 0 });
  },

  fillSilagePit: (kgGrass) => {
    const state = get();
    if ((state.silageCapacity ?? 0) <= 0) return;
    const grassAvail = state.inventory['grass'] ?? 0;
    const space = (state.silageCapacity ?? 0) - (state.silageLevel ?? 0);
    const toFill = Math.min(kgGrass, grassAvail, space);
    if (toFill <= 0) return;
    const { remainingBatches } = consumeFromBatches(state.inventoryBatches ?? [], 'grass', toFill);
    set({
      inventory: { ...state.inventory, grass: Math.max(0, grassAvail - toFill) },
      inventoryBatches: remainingBatches,
      silageLevel: (state.silageLevel ?? 0) + toFill,
    });
  },

  setBiogasMode: (mode) => {
    set({ biogasMode: mode });
  },

  queueEggsForIncubation: (typeId, quantity) => {
    const state = get();
    const INCUBATION_DAYS: Record<string, number> = { gallina: 21, pato: 28, codorniz: 17 };
    if (!INCUBATION_DAYS[typeId]) return;
    const cap = state.hatcheryCapacity ?? 0;
    if (cap <= 0) return;
    const eggsInQueue = (state.incubationQueue ?? []).reduce(
      (sum: number, b: IncubationBatch) => sum + b.eggCount, 0
    );
    const space = cap - eggsInQueue;
    const eggsAvail = state.animalInventory['eggs'] ?? 0;
    const toQueue = Math.min(quantity, eggsAvail, space);
    if (toQueue <= 0) return;
    const newBatch: IncubationBatch = {
      batchId: `hatch_${state.day}_${typeId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      typeId,
      eggCount: toQueue,
      startDay: state.day,
      readyDay: state.day + INCUBATION_DAYS[typeId],
    };
    set({
      animalInventory: {
        ...state.animalInventory,
        eggs: Math.max(0, eggsAvail - toQueue),
      },
      incubationQueue: [...(state.incubationQueue ?? []), newBatch],
    });
  },

  enterAnimalShow: (animalId) => {
    const state = get();
    if (!state.showWindowOpen) return;
    const season = getSeason(state.day);
    const seasonKey = `${season}_${state.day - ((state.day - 1) % 90)}`;
    if (state.showEntries.some(e => e.seasonKey === seasonKey && e.animalId === animalId)) return;
    const ENTRY_FEE = 250;
    if (state.money < ENTRY_FEE) return;
    set({
      money: state.money - ENTRY_FEE,
      showEntries: [...state.showEntries, { animalId, seasonKey, entryFee: ENTRY_FEE, enteredDay: state.day }],
    });
  },

  withdrawAnimalShow: (animalId) => {
    const state = get();
    const season = getSeason(state.day);
    const seasonKey = `${season}_${state.day - ((state.day - 1) % 90)}`;
    const entry = state.showEntries.find(e => e.seasonKey === seasonKey && e.animalId === animalId);
    const refund = entry ? Math.round(entry.entryFee * 0.5) : 0;
    set({
      money: state.money + refund,
      showEntries: state.showEntries.filter(e => !(e.seasonKey === seasonKey && e.animalId === animalId)),
    });
  },

  upgradeAnimalGene: (animalId, gene) => {
    const state = get();
    const animal = state.animals.find(a => a.id === animalId);
    if (!animal) return;
    const genes = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
    const currentVal = genes[gene];
    if (currentVal >= 1.5) return;
    const cost = Math.round(800 * currentVal * currentVal);
    if (state.money < cost) return;
    const newGenes = { ...genes, [gene]: Math.min(1.5, parseFloat((currentVal + 0.05).toFixed(2))) };
    set({
      animals: state.animals.map(a => a.id === animalId ? { ...a, genes: newGenes } : a),
      money: state.money - cost,
    });
  },

  cureDisease: (parcelId) => {
    const state = get();
    const CURE_COST = 150;
    if (state.money < CURE_COST) return;
    set({
      parcels: state.parcels.map(p => p.id === parcelId ? { ...p, diseased: false, diseasedDay: undefined } : p),
      money: state.money - CURE_COST,
    });
  },

  scheduleVetRound: () => {
    const state = get();
    const animalCount = (state.animals ?? []).length;
    if (animalCount === 0) return;
    const cost = Math.max(80, animalCount * 25);
    if (state.money < cost) return;
    set({ money: state.money - cost, vetRoundDay: state.day } as any);
  },

  quarantineAnimal: (animalId) => {
    const state = get();
    const animal = (state.animals ?? []).find((a: OwnedAnimal) => a.id === animalId);
    if (!animal || !animal.sick) return;
    set({
      animals: state.animals.map(a =>
        a.id === animalId ? { ...a, inIsolation: true, quarantineUntilDay: state.day + 14 } : a
      ),
    });
  },
});
