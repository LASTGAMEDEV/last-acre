import { CROP_TYPES } from '../data/cropTypes';
import { ANIMAL_PRODUCTS } from '../data/animalProducts';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { GENERATOR_CONFIG } from '../data/electricityTypes';
import { INITIAL_MAP_FIELDS } from '../data/mapFields';
import type { MarketId } from '../data/marketRegions';
import { COMMODITY_BASELINES } from '../data/prices';
import { PROCESSED_PRODUCTS } from '../data/processingTypes';
import { INITIAL_BUYERS } from '../engine/contracts';
import { defaultCommitment } from '../engine/csa';
import { INITIAL_DYNASTY_STATE } from '../engine/dynasty';
import { generateForecast } from '../engine/climate';
import { initNpcFarms } from '../engine/competitors';
import { makeInitialCoopState } from '../engine/cooperativeData';
import { SOIL_DEFAULTS, SoilType } from '../engine/crops';
import { INITIAL_TIMELINE_STATE } from '../engine/timeline';
import { createDefaultConsultant } from '../engine/workers';
import type { MarketPrice, NewsEvent } from '../engine/market';
import type { Loan, LoanRecord, SaleRecord, SavingsAccount, TimeDeposit } from '../engine/banking';
import type { Contract, Buyer, RecurringContract } from '../engine/contracts';
import type { StoredBatch } from '../engine/storageQuality';
import type { Hedgerow } from '../engine/hedgerows';
import type { AESEnrollment, SubsidyPayment } from '../engine/subsidies';
import type { LeaseAgreement, AvailableLease, TenantImprovement } from '../engine/leases';
import type { CSASubscriber, CSAWeekLog } from '../engine/csa';
import type { Worker, WorkerRequest, WorkerJobPosting, Consultant } from '../data/workerTypes';
import type { ActiveShock } from '../engine/priceEngine';
import type { CoopId, CoopMembership, CoopState } from '../engine/cooperativeTypes';
import type { DynastyState } from '../engine/dynasty';
import type { TimelineState } from '../engine/timeline';
import type { Well } from '../engine/water';
import type { ProcessingBuilding } from '../engine/processing';
import type { GeneratorModel, GridTier, PendingGrant } from '../data/electricityTypes';
import type { WeatherDay } from '../engine/climate';
import type { OwnedAnimal } from '../engine/animals';
import type { ProcessingBatch, ProcessedItem } from '../data/processingTypes';
import type { ShowEntry, ShowResult } from '../types/domain/animals';
import type { LandParcel } from '../types/domain/land';
import type { AuctionCategory, AuctionListing } from '../types/domain/auctions';
import type { ElectricityState } from '../types/domain/electricity';
import type { FuturesPosition, InsuranceClaim, InsurancePolicy, MarketOrder, PriceAlert, RivalNewsItem, SeasonGoal } from '../types/domain/economy';
import type { DeliveryJob, HarvestJob, MachineRepair, OwnedAttachment, OwnedMachine, OwnedTrailer, TractorJob } from '../types/domain/machinery';
import type { HenilBatch, IncubationBatch, ProductionBuildingState } from '../types/domain/processing';
import type { DaySummaryEvent, FairEvent, FieldEvent, GameEvent } from '../types/domain/uiEvents';
import type { HybridJob, SeedEntry } from '../types/domain/crops';
import { INITIAL_FAMILY_STATE } from '../features/family/familyTypes';
import { INITIAL_REPUTATION_STATE } from '../features/reputation/reputationTypes';
import { INITIAL_NEIGHBOR_STATE } from '../features/neighbors/neighborEngine';
import { createInitialAnnualPlanningState } from '../engine/annualPlanning';
const FIELD_NAMES: string[] = [
  'North Meadow',   'South Ridge',    'East Valley',    'West Creek',     'Upper Hill',
  'Lower Hollow',   'Far Acre',       'Near Grove',     'Back Pasture',   'Long Field',
  'Broad Lea',      'Round Hill',     'Dark Copse',     'Green Bottom',   'Old Moor',
  'New Dell',       'Big Flat',       'Little Knoll',   'High Heath',     'Low Fen',
  'Wild Run',       'Bare Plain',     'Deep Brook',     'Bright Plot',    'Quiet Patch',
  'River Bend',     'Stone Acre',     'Clay Bottom',    'Sandy Lea',      'Chalk Ridge',
  'Elm Grove',      'Oak Dell',       'Birch Hollow',   'Willow Creek',   'Ash Meadow',
  'Pine Heath',     'Cedar Flat',     'Maple Run',      'Hazel Knoll',    'Cherry Hill',
  'Sunrise Field',  'Sunset Pasture', 'Morning Lea',    'Evening Ridge',  'Midday Plain',
  'Spring Bottom',  'Summer Hollow',  'Autumn Grove',   'Winter Dell',    'Harvest Acre',
  'Fallow Moor',    'Plough Flat',    'Sown Field',     'Ripe Knoll',     'Lush Heath',
  'Dry Ridge',      'Wet Bottom',     'Frost Vale',     'Warm Lea',       'Cool Brook',
  'Silver Creek',   'Golden Meadow',  'Iron Hill',      'Copper Grove',   'Bronze Plain',
  'Fox Run',        'Hare Field',     'Deer Hollow',    'Crow Dell',      'Hawk Ridge',
  'Thistle Lea',    'Clover Plain',   'Nettle Bottom',  'Heather Moor',   'Fern Hollow',
  'Miller\'s Acre', 'Baker\'s Lea',   'Cooper\'s Field','Thatcher\'s Run', 'Smith\'s Ridge',
];

const SOIL_DISTRIBUTION: SoilType[] = [
  'loamy','loamy','loamy','loamy','loamy','loamy','loamy', // 35%
  'sandy','sandy','sandy','sandy','sandy',                 // 25%
  'clay','clay','clay','clay','clay',                      // 25%
  'chalky','chalky','chalky',                              // 15%
];

function randomSoilType(): SoilType {
  return SOIL_DISTRIBUTION[Math.floor(Math.random() * SOIL_DISTRIBUTION.length)];
}
function generateParcelsFromMap(): LandParcel[] {
  const result: LandParcel[] = [];
  for (const field of INITIAL_MAP_FIELDS) {
    if (field.owner === 'player' && field.parcelId) {
      result.push({
        id: field.parcelId,
        name: field.name,
        fertility: Math.max(1, Math.round((field.fertility ?? 70) / 4)),
        soil: { ...SOIL_DEFAULTS },
        cropHistory: [],
        hectares: field.approximateHa,
        pricePerHa: 0,
        owned: true,
        hasWeeds: false,
        plantedCrop: null,
        greenhouse: false,
        irrigated: false,
        tilled: false,
        precisionApplied: false,
        yieldHistory: [],
        soilWetUntilDay: 0,
        bareDayCtr: 0,
        recentIrrigationDays: [],
        soilSalinity: 0,
        topsoilErosion: 0,
        tillageSystem: 'conventional',
        tillageSystemSince: 1,
        notillSeasons: 0,
        residueCoverage: false,
        weedFlushSeason: false,
        waterwayAdjacent: false,
        organicStatus: 'conventional',
      });
    } else if (field.owner === 'forsale') {
      result.push({
        id: `p-${field.id}`,
        name: field.name,
        fertility: Math.max(1, Math.round((field.fertility ?? 65) / 4)),
        soil: { ...SOIL_DEFAULTS },
        cropHistory: [],
        hectares: field.approximateHa,
        pricePerHa: Math.round((field.askingPrice ?? 20000) / field.approximateHa),
        owned: false,
        hasWeeds: false,
        plantedCrop: null,
        greenhouse: false,
        irrigated: false,
        tilled: false,
        precisionApplied: false,
        yieldHistory: [],
        soilWetUntilDay: 0,
        bareDayCtr: 0,
        recentIrrigationDays: [],
        soilSalinity: 0,
        topsoilErosion: 0,
        tillageSystem: 'conventional',
        tillageSystemSince: 1,
        notillSeasons: 0,
        residueCoverage: false,
        weedFlushSeason: false,
        waterwayAdjacent: false,
        organicStatus: 'conventional',
      });
    }
  }
  return result;
}

function generateInitialPrices(): MarketPrice[] {
  const bases = COMMODITY_BASELINES as Record<string, number>;
  const result: MarketPrice[] = [];
  for (const c of CROP_TYPES) {
    if ((c as any).coverCrop) continue;
    const base = bases[c.id] ?? c.basePrice;
    result.push({ cropId: c.id, price: base, basePrice: base });
  }
  for (const ap of ANIMAL_PRODUCTS as { productType: string; basePrice: number }[]) {
    const base = bases[ap.productType] ?? ap.basePrice;
    result.push({ cropId: ap.productType, price: base, basePrice: base });
  }
  for (const pp of PROCESSED_PRODUCTS as { id: string; basePrice: number }[]) {
    const base = bases[pp.id] ?? pp.basePrice;
    result.push({ cropId: pp.id, price: base, basePrice: base });
  }
  return result;
}

function generateInitialListings(): AuctionListing[] {
  const premiumParcels: LandParcel[] = [
    { id: 'auction_p0', name: 'Gold Acre',   fertility: 22, soil: { ...SOIL_DEFAULTS }, cropHistory: [], hectares: 5,  pricePerHa: 550000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false, precisionApplied: false, yieldHistory: [], soilWetUntilDay: 0, bareDayCtr: 0, recentIrrigationDays: [], soilSalinity: 0, topsoilErosion: 0, tillageSystem: 'conventional', tillageSystemSince: 1, notillSeasons: 0, residueCoverage: false, weedFlushSeason: false, waterwayAdjacent: false, organicStatus: 'conventional' },
    { id: 'auction_p1', name: 'Prime Ridge', fertility: 25, soil: { ...SOIL_DEFAULTS }, cropHistory: [], hectares: 2,  pricePerHa: 600000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false, precisionApplied: false, yieldHistory: [], soilWetUntilDay: 0, bareDayCtr: 0, recentIrrigationDays: [], soilSalinity: 0, topsoilErosion: 0, tillageSystem: 'conventional', tillageSystemSince: 1, notillSeasons: 0, residueCoverage: false, weedFlushSeason: false, waterwayAdjacent: false, organicStatus: 'conventional' },
  ];
  return premiumParcels.map((parcel, i) => ({
    id: `lot_init_${i}`,
    category: 'land' as AuctionCategory,
    sellerId: 'npc',
    parcel,
    startingBid: Math.round(parcel.pricePerHa * parcel.hectares * 0.7),
    reservePrice: 0,
    currentBid: Math.round(parcel.pricePerHa * parcel.hectares * 0.7),
    bids: [],
    playerBid: null,
    createdDay: 1,
    expiresDay: 10 + i * 5,
    resolved: false,
    playerWon: null,
  }));
}

export function makeInitialState() {
  return {
    day: 1,
    money: 1_000_000,
    parcels: generateParcelsFromMap(),
    animals: [] as OwnedAnimal[],
    animalInventory: {} as Record<string, number>,
    machines: [] as OwnedMachine[],
    attachments: [] as OwnedAttachment[],
    trailers: [] as OwnedTrailer[],
    tractorJobs: [] as TractorJob[],
    harvestJobs: [] as HarvestJob[],
    prices: generateInitialPrices(),
    newsEvents: [] as NewsEvent[],
    loans: [] as Loan[],
    savings: { balance: 0, lastInterestDay: 1 } as SavingsAccount,
    timeDeposits: [] as TimeDeposit[],
    contracts: [] as Contract[],
    buyers: INITIAL_BUYERS.map((b) => ({ ...b })),
    recurringContracts: [] as RecurringContract[],
    salesLog: [] as SaleRecord[],
    loanHistory: [] as LoanRecord[],
    forecast: generateForecast('spring'),
    todayWeather: null as WeatherDay | null,
    inventory: {} as Record<string, number>,
    inventoryBatches: [] as StoredBatch[],
    hedgerows: [] as Hedgerow[],
    cropsGrownThisYear: [] as string[],
    strawBurnedThisYear: false,
    aesEnrollments: [] as AESEnrollment[],
    subsidyLog: [] as SubsidyPayment[],
    activeLeases: [] as LeaseAgreement[],
    availableLeases: [] as AvailableLease[],
    tenantImprovements: [] as TenantImprovement[],
    csaSubscribers: [] as CSASubscriber[],
    csaActive: false,
    csaCommitment: defaultCommitment(),
    csaWeeklyLog: [] as CSAWeekLog[],
    priceHistory: Object.fromEntries(generateInitialPrices().map(p => [p.cropId, [p.price]])) as Record<string, number[]>,
    productInventory: {} as Record<string, number>,
    buildings: [] as string[],
    declinedTemplates: [] as string[],
    fieldEvents: [] as FieldEvent[],
    listings: generateInitialListings(),
    nextAnimalAuctionDay: 8,
    daySummary: null as DaySummaryEvent[] | null,
    insurances: [] as InsurancePolicy[],
    insuranceClaims: [] as InsuranceClaim[],
    processedInventory: [] as ProcessedItem[],
    activeBatches: [] as ProcessingBatch[],
    harvestedCropIds: [] as string[],
    completedMilestones: [] as string[],
    milestonePopup: null as { icon: string; title: string; reward: number } | null,
    tutorialSeen: false,
    dayOneChecklist: {
      tilled:    false,
      planted:   false,
      advanced5: false,
      harvested: false,
    },
    firstMissionStep: 0,
    dismissedHints: [] as string[],
    totalRevenue: 0,
    yearEndShown: false,
    activeFair: null as FairEvent | null,
    futures: [] as FuturesPosition[],
    cooperative: null as { member: boolean; joinDay: number } | null,
    coopMemberships: {} as Partial<Record<CoopId, CoopMembership>>,
    coopStates: {
      grain: makeInitialCoopState('grain'),
      horticulture: makeInitialCoopState('horticulture'),
      livestock: makeInitialCoopState('livestock'),
    } as Record<CoopId, CoopState>,
    aquiferLevel: 75,
    wells: [] as Well[],
    gridWaterActive: false,
    gridWaterDailyRate: 1.20,
    legacyReputation: 50,
    nearSettlement: true,
    soundBarriers: false,
    activeSchedule: undefined,
    autoSell: {} as Record<string, { enabled: boolean; minPrice: number }>,
    inventoryReserves: {} as Record<string, number>,
    prestige: 0,
    workers: [] as Worker[],
    consultant: createDefaultConsultant(),
    pendingRequests: [] as WorkerRequest[],
    requestLog: [] as WorkerRequest[],
    jobPostings: [] as WorkerJobPosting[],
    employerReputation: 50,
    bankrupt: false,
    familyLoanUsedDay: null as number | null,
    pendingChoiceEvent: null as import('../data/choiceEvents').ChoiceEventTemplate | null,
    firedChoiceEventIds: [] as string[],
    sellPressures: [] as { cropId: string; modifier: number; expiresDay: number }[],
    breedingPairs: {} as Record<string, string>,
    seedVault: [] as SeedEntry[],
    hybridJobs: [] as HybridJob[],
    cropQualityMap: {} as Record<string, number>,
    activeEvents: [] as GameEvent[],
    timeline: INITIAL_TIMELINE_STATE,
    dynasty: INITIAL_DYNASTY_STATE,
    dynastyAuctionWins: 0,
    family: INITIAL_FAMILY_STATE,
    reputation: INITIAL_REPUTATION_STATE,
    neighbors: INITIAL_NEIGHBOR_STATE,
    pendingLandOpportunities: [],
    neighborActionCooldowns: {} as Record<string, number>,
    gameSetupComplete: false,
    machineRepairs: [] as MachineRepair[],
    npcFarms: initNpcFarms(),
    rivalNews: [] as RivalNewsItem[],
    seasonGoals: [] as SeasonGoal[],
    seasonGoalSeason: '',
    seasonStartMoney: 1_000_000,
    seasonStartRevenue: 0,
    seasonHarvestCount: 0,
    mapFields: INITIAL_MAP_FIELDS,
    mapPanX: 0,
    mapPanY: 0,
    mapZoom: 0, // 0 = sentinel: first open, compute fit-to-screen in WorldMap component
    selectedMapFieldId: null,
    henilQueue: [],
    grainMissedDays: 0,
    hayMissedDays: 0,
    animalsManuallyFed: false,
    savedRations: {},
    solidManureKg: 0,
    cropResidueKg: 0,
    compostInventoryKg: 0,
    compostBatches: [],
    digestateKg: 0,
    soilLabBuilt: false,
    pendingAnalyses: [],
    colmenaNegligenceStartDay: {},
    soundEnabled: true,
    hapticEnabled: true,
    musicEnabled: true,
    animalPrices: { eggs: 0.18, milk: 0.45, honey: 8.50, wool: 3.20, meat: 4.50, cream: 2.80 },
    personalRecords: { peakMoney: 1_000_000, totalHarvests: 0, bestSeasonRevenue: 0, longestDay: 1 },
    seasonalEvent: null as { type: 'heat_wave' | 'flood' | 'frost'; startDay: number; endsDay: number; severity: number } | null,
    farmName: 'My Farm',
    farmStyle: 'balanced' as 'crop_focus' | 'livestock' | 'market_trader' | 'balanced',
    difficulty: 'standard' as import('../engine/difficulty').Difficulty,
    fuel: 200,
    fuelPrice: 1.20,
    fertilizerPrice: 0.35,
    priceMomentum: {} as Record<string, number>,
    priceHistory15d: {} as Record<string, number[]>,
    activeShocks: [] as ActiveShock[],
    npcProductionMultipliers: {} as Record<string, number>,
    npcPriceSignalDays: {} as Record<string, number>,
    deliveryJobs: [],
    productionBuildings: [],
    processingBuildings: [] as import('../engine/processing').ProcessingBuilding[],
    animalWelfareScores: {},
    milkGrades: {},
    lastSyntheticInputDay: -999,
    sirePenAnimalIds: [],
    vetRoomOwned: false,
    medicineCabinetOwned: false,
    hasCCTV: false,
    sickBayCapacity: 0,
    slurryLevel: 0,
    slurryCapacity: 0,
    silageLevel: 0,
    silageCapacity: 0,
    biogasMode: 'income' as const,
    incubationQueue: [] as IncubationBatch[],
    hatcheryCapacity: 0,
    pendingPickup: [],
    priceAlerts: [] as PriceAlert[],
    showEntries: [] as ShowEntry[],
    showResults: [] as ShowResult[],
    showWindowOpen: false,
    marketOrders: [] as MarketOrder[],
    selectedMarket: 'local' as MarketId,
    electricity: {
      gridTier: 'basic' as GridTier,
      gridRateBase: 0.14,
      solarPanelCount: 0,
      solarPanelHealth: 100,
      solarLastServiceDay: 0,
      windTurbineCount: 0,
      windTurbineHealth: 100,
      windLastServiceDay: 0,
      biogasPlantBuilt: false,
      biomassCHPBuilt: false,
      biomassFuelDaysRemaining: 0,
      heatPipeNetworkBuilt: false,
      batteryBankCount: 0,
      batteryChargeKwh: 0,
      batteryHealthPercent: 100,
      batteryLastServiceDay: 0,
      generatorModel: null,
      generatorFuelLitres: 0,
      generatorActive: false,
      currentMonthKwhImported: 0,
      currentMonthBillEstimate: 0,
      lastMonthBill: 0,
      billDueDay: 31,
      billHistory: [],
      outageActive: false,
      outageEndDay: null,
      solarGrantClaimed: false,
      windGrantClaimed: false,
      pendingGrants: [],
      surgeProtectedBuildings: [],
      damagedSources: [],
    },
    beneficialInsectsActive: false,
    cropConsultantParcelIds: [],
    reputationHistory: [],
    farmShop: { tier: 0 as const, openDays: [true, true, true, true, true, true, false], openHours: 8, assignedWorkerIds: [] },
    restaurantContracts: [],
    vegBoxSubscribers: [],
    onlineShopActive: false,
    onlineShopAllocations: {},
    farmCafeOpen: false,
    farmCafeWorkerIds: [],
    awardHistory: [],
    productAwardBonuses: {},
    annualPlanning: createInitialAnnualPlanningState(1970),
  };
}
