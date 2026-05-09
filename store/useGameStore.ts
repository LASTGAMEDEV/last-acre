import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  PlantedCrop, SoilType, getSoilModifier, harvestAmount,
  SoilStats, SOIL_DEFAULTS, advanceSoilStats, SoilTickParams,
} from '../engine/crops';
import { OwnedAnimal, AnimalGenes, inheritTrait, randomGenes, isAtOptimalWeight } from '../engine/animals';
import { MarketPrice, NewsEvent } from '../engine/market';
import { WeatherDay } from '../engine/climate';
import { Loan, SavingsAccount, TimeDeposit, SaleRecord, LoanRecord,
         loanTotalOwed, calculateRate, accrueInterest } from '../engine/banking';
import {
  Contract,
  Buyer,
  RecurringContract,
  INITIAL_BUYERS,
  signRecurringContract as buildRecurringContract,
  resolveDelivery,
  checkRecurringDeliveries,
  applyDisasterGrace,
  getBuyerPriceBonus,
  BUYER_TIER_CONFIG,
} from '../engine/contracts';
import { CROP_TYPES } from '../data/cropTypes';
import { MACHINE_TYPES, MachineType } from '../data/machineTypes';
import { BUILDING_TYPES, PRODUCTION_EQUIPMENT, EquipmentItem } from '../data/buildingTypes';
import { ANIMAL_TYPES } from '../data/animalTypes';
import {
  PRODUCTION_BUILDING_PREFIX,
  DAIRY_SPECIES,
  effectiveCapacity,
  isManned,
  contractorFee,
  hygieneDecay,
  welfareScore,
  milkGrade,
  shouldInspect,
  inspectionPassed,
  inspectorFine,
  certificationProgress,
  seasonKey,
} from '../engine/productionBuildings';
import { INSURANCE_PLANS, InsuranceType } from '../data/insuranceTypes';
import { PROCESSING_RECIPES, PROCESSED_PRODUCTS, PROCESSED_ITEM_DEFS, ProcessingBatch, ProcessedItem, getProcessingBuildingConfig } from '../data/processingTypes';
import { tickProcessedInventory, getSellMultiplier, canUpgradeTier, getUpgradeCost } from '../engine/processing';
import { MILESTONES, checkNewMilestones, MILESTONE_REWARDS } from '../data/milestones';
import { sellRevenue, SellPressure, computeSellPressureModifier, sellPressureDuration } from '../engine/market';
import { getSeason, generateForecast, applyDailyWeather } from '../engine/climate';
import type { WeatherEvent } from '../engine/climate';
import {
  baseOutbreakChance,
  tickPestSeverity,
  shouldSpread,
  pestYieldModifier,
  pickPestType,
  PEST_CONFIG,
} from '../engine/pests';
import { ENCLOSURE_BUILDINGS } from '../constants/enclosures';
import {
  Worker, WorkerRole, WorkerRequest, WorkerJobPosting, Consultant,
  ContractType, WORKER_ROLE_CONFIG,
} from '../data/workerTypes';
import {
  getWorkerBonuses, createDefaultConsultant, tickWorker,
  calcWeeklyPayroll, rollInjury, rollPoaching, generateApplicants,
  createWorkerFromApplicant, applyPayRiseApproved, applyPayRiseDenied,
  applyTimeOffApproved, applyExamFeeApproved, applicantCountForSeason,
  calcUnlockedNodes, WorkerBonuses,
} from '../engine/workers';
import { GameEventType } from '../data/randomEvents';
import { rollEvent, calcRepairCost, calcRepairDays, getHarvestModifier } from '../engine/events';
import { NPCFarmRuntime, initNpcFarms, npcSellVolume, npcAuctionBid } from '../engine/competitors';
import { tickAllPrices, updateNpcProductionMultipliers, ActiveShock } from '../engine/priceEngine';
import { ATTACHMENT_TYPES, AttachmentType } from '../data/attachmentTypes';
import { ContractorOperation, calcJobDays, canAssignJob, getTransportCapacityKg } from '../engine/machinery';
import { MapField, MapOwner } from '../types/worldMap';
import { INITIAL_MAP_FIELDS } from '../data/mapFields';
import { MarketId, MARKET_REGIONS } from '../data/marketRegions';
import { NPC_FARM_GROUP } from '../data/npcFarmGroups';
import { Well, DrillSpot, advanceAquifer, generateSurveySpots, wellFlowRate, pipeCost } from '../engine/water';
import type { CoopId, CoopMembership, CoopState } from '../engine/cooperativeTypes';
import { makeInitialCoopState, getCoopForCrop, getCoopForAnimal, COOP_NAMES, INITIAL_SHARE_PRICES, COOP_CROPS, COOP_ANIMALS } from '../engine/cooperativeData';
import {
  calculateRedemptionMultiplier, getSeason as getCoopSeason, getYear,
  isMemberSuspended, isCoopActive, isSlotBooked, nextAvailableDay,
  generateAGMProposal, resolveAGMVote, COOP_DEPOT_FUEL_COST,
  getSeedDiscount, calculateHealthDelta, calculateDividend,
  isStartOfSpring, rollingAvg, calculatePoolPrice, calculateSharePriceDelta,
} from '../engine/cooperatives';
export type { Well, DrillSpot };
import type { GridTier, GeneratorModel, PendingGrant } from '../data/electricityTypes';
import {
  GRID_TIER_CONFIG, GENERATOR_CONFIG,
  BATTERY_KWH_PER_BANK, BATTERY_COST_PER_BANK,
  SOLAR_COST_PER_PANEL, SOLAR_GRANT_PCT, SOLAR_SERVICE_COST,
  WIND_COST_PER_TURBINE, WIND_GRANT_PCT, WIND_SERVICE_COST,
  BIOGAS_BUILD_COST, BIOMASS_BUILD_COST, BIOMASS_FUEL_SEASON_DAYS,
  HEAT_PIPE_BUILD_COST, SURGE_PROTECTOR_COST, BATTERY_SERVICE_COST,
} from '../data/electricityTypes';
import {
  calcSolarOutput, calcWindOutput, calcBiogasOutput, calcBiomassOutput,
  calcGeneratorOutput, calcGeneratorFuelBurn, calcTotalDemand,
  dischargeForDeficit, chargeFromSurplus, calcGridRateForSeason,
  solarDegradationPerDay, windDegradationPerDay,
  rollOutage, rollOutageDuration, rollLightningDamage,
  nextGridTier, prevGridTier,
} from '../engine/electricity';

// ── Machine / building helpers ───────────────────────────────────────────────
function getDailyMaintenance(machines: OwnedMachine[], buildings: string[]): number {
  const hasTaller = buildings.includes('bld_taller');
  const machineDiscount = hasTaller ? 0.75 : 1.0;
  const machineCost = machines.reduce((s, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0);
  const buildingCost = buildings.reduce((s, bId) => {
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0);
  return Math.round(machineCost * machineDiscount + buildingCost);
}

function getSiloCapacity(buildings: string[]): number {
  const BASE = 10_000;
  return buildings.reduce((s, bId) => {
    const t = BUILDING_TYPES.find(bt => bt.id === bId && bt.category === 'silo');
    return s + (t?.capacity ?? 0);
  }, BASE);
}

function getFuelCapacity(buildings: string[]): number {
  let cap = 200; // default tank
  for (const id of buildings) {
    if (id === 'bld_fuel_tank_s') cap += 500;
    else if (id === 'bld_fuel_tank_l') cap += 2000;
  }
  return cap;
}

// ENCLOSURE_BUILDINGS imported from constants/enclosures.ts

function getEnclosureCapacity(buildings: string[], enclosureType: string): number {
  const ids = ENCLOSURE_BUILDINGS[enclosureType] ?? [];
  return buildings.reduce((s, bId) => {
    if (!ids.includes(bId)) return s;
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.capacity ?? 0);
  }, 0);
}


function hasBiodigestor(buildings: string[]): boolean {
  return buildings.includes('bld_biodigestor');
}

function hasSecadero(buildings: string[]): boolean {
  return buildings.includes('bld_secadero');
}

function hasAlmacen(buildings: string[]): boolean {
  return buildings.includes('bld_almacen');
}

function hasWaterTower(buildings: string[]): boolean {
  return buildings.includes('bld_agua');
}

function hasGranero(buildings: string[]): boolean {
  return buildings.includes('bld_granero');
}

function hasOficinaBuilding(buildings: string[]): boolean {
  return buildings.includes('bld_oficina');
}

function hasActiveInsurance(insurances: InsurancePolicy[], type: InsuranceType): boolean {
  return insurances.some(p => p.type === type && p.active);
}

function estimateCropValue(parcel: LandParcel, prices: MarketPrice[]): number {
  if (!parcel.plantedCrop) return 0;
  const cropType = CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId);
  if (!cropType) return 0;
  const fertilityMod = 0.5 + (parcel.fertility / 25) * 0.5;
  const estimatedYield = parcel.plantedCrop.hectares * cropType.baseYield * fertilityMod;
  const price = prices.find(p => p.cropId === cropType.id)?.price ?? cropType.basePrice;
  // Also include seed cost recovery
  const seedCost = cropType.seedCost * parcel.plantedCrop.hectares;
  return Math.round(estimatedYield * price + seedCost);
}

export interface LandParcel {
  id: string;
  name: string;
  /** @deprecated use soil.nitrogen · kept for save migration only */
  fertility: number;
  // ── Soil system ──
  soil: SoilStats;
  cropHistory: string[]; // last 4 harvested cropIds (oldest first)
  hectares: number;
  pricePerHa: number;
  owned: boolean;
  hasWeeds: boolean;
  plantedCrop: PlantedCrop | null;
  lastCropId?: string;
  greenhouse: boolean;
  irrigated: boolean;
  tilled: boolean;
  seedEntryId?: string; // SeedEntry id used when this parcel was planted
  soilType?: SoilType; // undefined on old saves → treated as 'loamy'
  diseased?: boolean;   // crop blight · reduces yield, spreads to neighbors
  diseasedDay?: number; // day disease started; crop dies after 20 days untreated
  pestState?: import('../engine/pests').PestState;
}

export type OwnedWorker = Worker;
export type { Worker };

// ── Animal Shows ─────────────────────────────────────────────────────────────
export interface ShowEntry {
  animalId: string;
  seasonKey: string;
  entryFee: number;
  enteredDay: number;
}

export interface ShowResult {
  id: string;
  seasonKey: string;
  seasonLabel: string;
  animalId: string;
  animalTypeId: string;
  playerScore: number;
  placement: number;
  prize: number;
  npcScores: number[];
  resolvedDay: number;
}

export interface FuturesPosition {
  id: string;
  cropId: string;
  quantity: number;
  lockPrice: number;
  deliveryDay: number;
  createdDay: number;
  settled: boolean;
}

export interface MarketOrder {
  id: string;
  cropId: string;
  quantity: number;
  targetPrice: number;
  createdDay: number;
  expiresDay: number;
  status: 'active' | 'executed' | 'expired' | 'cancelled';
  executedDay?: number;
  executedRevenue?: number;
}

export interface SeedGenes {
  yield:    number; // multiplies harvest output (0.5·1.5)
  drought:  number; // divides weather penalty severity (0.5·1.5)
  growth:   number; // divides effective growthDays (0.5·1.5)
  quality:  number; // multiplies processed output (0.5·1.5)
}

export interface SeedEntry {
  id: string;
  cropId: string;
  generation: number;
  genes: SeedGenes;
  createdDay: number;
  quantity: number; // each unit plants one parcel
}

export interface HybridJob {
  id: string;
  cropId: string;
  parentAId: string;
  parentBId: string;
  startDay: number;
  readyDay: number;
  cost: number;
}

export interface SeasonGoal {
  id: string;
  icon: string;
  label: string;
  type: 'earn' | 'harvest_count' | 'own_ha';
  target: number;
  reward: number;
  claimed?: boolean;
}

export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  description: string;
  icon: string;
  expiresDay: number;    // day this event expires; 0 = already expired/one-shot
  affectedIds?: string[]; // parcel IDs, animal ID, crop ID · depends on type
  modifier?: number;
}

export interface MachineRepair {
  id: string;
  machineId: string;
  startDay: number | null;  // null = broken, player hasn't started repair yet
  readyDay: number | null;  // null until startRepair() is called
  cost: number;
  insurancePaid: number;
}

export type NPCFarm = NPCFarmRuntime;

export interface FairEvent {
  id: string;
  daysRemaining: number;
  discount: number; // e.g. 0.3 = 30% off
}

export interface OwnedMachine {
  id: string;
  typeId: string;
  purchasedDay: number;
}

export interface OwnedAttachment {
  id: string;
  typeId: string;
}

export interface OwnedTrailer {
  id: string;
  typeId: string;
  hitchedTo: string | null; // truckId | null
}

export interface DeliveryCargo {
  itemId: string;       // cropId / productType / animalId
  quantity: number;
  category: 'crop' | 'animal_product' | 'animal';
}

export interface ReturnOrder {
  itemId: string;       // cropId / 'fuel' / animalTypeId won at auction
  quantity: number;
  costPerUnit: number;  // locked in at dispatch
}

export interface DeliveryJob {
  id: string;
  truckId: string;
  trailerId: string;
  driverId: string;
  cargo: DeliveryCargo[];
  marketId: 'local' | 'city' | 'export';
  departDay: number;
  returnDay: number;
  expectedRevenue: number;
  fuelCost: number;
  returnOrders: ReturnOrder[];
  status: 'outbound' | 'returning';
  breakdownDaysAdded: number;
  needsMaintenance: boolean;
}

export interface AuctionPickup {
  listingId: string;
  animalTypeId: string;
  genes: AnimalGenes;
  paidDay: number;
  pickedUpDay: number | null;
}

export interface ProductionBuildingState {
  id: string;                    // unique instance id e.g. 'pb_1711234567'
  buildingTypeId: string;        // e.g. 'bld_milking_parlour_s'
  animalTypeId: string;          // e.g. 'vaca'
  hygiene: number;               // 0·100
  capacity: number;              // daily throughput (animals/day) · copied from BuildingType.dailyCapacity at purchase time
  certificationTier: 'basic' | 'certified' | 'organic';
  certDaysAtThreshold: number;   // consecutive days meeting cert hygiene requirement
  certInspectionsPassed: number; // inspections passed at current tier level
  equipmentSlots: string[];      // installed equipment item ids (max = equipmentSlotCount)
  assignedWorkerIds: string[];   // worker ids assigned to this building
  lastDeepCleanSeason: string | null;   // season key of last deep clean e.g. 'spring_1'; null = never cleaned
}

export interface TractorJob {
  id: string;
  tractorId: string;
  attachmentId: string;
  operation: 'till' | 'plant' | 'spray' | 'spread_slurry';
  parcelIds: string[];
  cropId?: string;       // required when operation === 'plant'
  totalHa: number;
  haPerDay: number;
  startDay: number;
  completesDay: number;
}

export interface HarvestJob {
  id: string;
  combineId: string;
  parcelIds: string[];
  totalHa: number;
  haPerDay: number;
  startDay: number;
  completesDay: number;
  processedHa: number;
}

export interface FieldEvent {
  id: string;
  parcelId: string;
  type: 'disease' | 'pest';
  startDay: number;
  resolved: boolean;
}

export interface AuctionBid {
  day: number;
  amount: number;
  isPlayer: boolean;
}

export interface AuctionLot {
  id: string;
  parcel: LandParcel;
  startDay: number;
  endDay: number;
  startingBid: number;
  currentBid: number;
  bids: AuctionBid[];
  playerBid: number | null;
  resolved: boolean;
  playerWon: boolean | null;
}

// ── Auction House ─────────────────────────────────────────────────────────────
export type AuctionCategory = 'land' | 'animal' | 'crop' | 'machinery';

export interface AuctionListing {
  id: string;
  category: AuctionCategory;
  sellerId: 'player' | string;      // 'player' or NPC farm id
  // Payload · only the relevant field is set per category
  parcelId?: string;                 // land
  parcel?: LandParcel;               // land (kept for display, same as AuctionLot)
  animalId?: string;                 // animal (player-listed)
  animalTypeId?: string;             // animal (NPC-generated)
  animalGenes?: AnimalGenes;         // animal
  animalBreedId?: string;            // animal · breed of the listed animal
  animalBreedCrossParents?: [string, string]; // animal · F1/backcross display
  animalSex?: 'male' | 'female';           // animal · preserved for withdrawal
  animalBornDay?: number;                   // animal · preserved for withdrawal
  machinePurchasedDay?: number;             // machinery · preserved for withdrawal
  cropId?: string;                   // crop
  cropQuantity?: number;             // crop
  machineId?: string;                // machinery (player-listed)
  machineTypeId?: string;            // machinery (NPC-generated)
  conditionScore?: number;           // machinery (0·100)
  // Auction terms
  startingBid: number;
  reservePrice: number;              // 0 = no reserve; hidden from bidders
  currentBid: number;
  bids: AuctionBid[];
  playerBid: number | null;
  createdDay: number;
  expiresDay: number;                // for animal listings: equals nextAnimalAuctionDay at creation
  resolved: boolean;
  playerWon: boolean | null;
}

export interface InsurancePolicy {
  id: string;
  type: InsuranceType;
  startDay: number;
  active: boolean;
}

export interface InsuranceClaim {
  id: string;
  day: number;
  type: InsuranceType;
  payout: number;
  description: string;
}

export interface ElectricityState {
  gridTier: GridTier;
  gridRateBase: number;
  solarPanelCount: number;
  solarPanelHealth: number;
  solarLastServiceDay: number;
  windTurbineCount: number;
  windTurbineHealth: number;
  windLastServiceDay: number;
  biogasPlantBuilt: boolean;
  biomassCHPBuilt: boolean;
  biomassFuelDaysRemaining: number;
  heatPipeNetworkBuilt: boolean;
  batteryBankCount: number;
  batteryChargeKwh: number;
  batteryHealthPercent: number;
  batteryLastServiceDay: number;
  generatorModel: GeneratorModel | null;
  generatorFuelLitres: number;
  generatorActive: boolean;
  currentMonthKwhImported: number;
  currentMonthBillEstimate: number;
  lastMonthBill: number;
  billDueDay: number;
  billHistory: number[];
  outageActive: boolean;
  outageEndDay: number | null;
  solarGrantClaimed: boolean;
  windGrantClaimed: boolean;
  pendingGrants: PendingGrant[];
  surgeProtectedBuildings: string[];
  damagedSources: Array<'solar' | 'wind' | 'battery'>;
}

export interface DaySummaryEvent {
  id: string;
  icon: string;
  title: string;
  detail?: string;
  severity: 'info' | 'good' | 'warning' | 'danger';
}

export interface RivalNewsItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  day: number;
}

export interface PriceAlert {
  id: string;
  cropId: string;
  targetPrice: number;
  direction: 'above' | 'below';
}

export interface HenilBatch {
  batchId: string;
  wetGrassKg: number;
  startDay: number;
  readyDay: number;  // startDay + 3
}

export interface IncubationBatch {
  batchId: string;
  typeId: string;      // 'gallina' | 'pato' | 'codorniz'
  eggCount: number;
  startDay: number;
  readyDay: number;    // startDay + INCUBATION_DAYS[typeId]
}

export interface GameState {
  day: number;
  money: number;

  parcels: LandParcel[];
  animals: OwnedAnimal[];
  animalInventory: Record<string, number>;
  machines: OwnedMachine[];

  prices: MarketPrice[];
  activeShocks: ActiveShock[];
  priceMomentum: Record<string, number>;
  priceHistory15d: Record<string, number[]>;
  npcProductionMultipliers: Record<string, number>;
  npcPriceSignalDays: Record<string, number>;
  fertilizerPrice: number;
  newsEvents: NewsEvent[];

  loans: Loan[];
  savings: SavingsAccount;
  timeDeposits: TimeDeposit[];
  contracts: Contract[];
  buyers: Buyer[];
  recurringContracts: RecurringContract[];

  salesLog: SaleRecord[];
  loanHistory: LoanRecord[];

  forecast: WeatherDay[];
  todayWeather: WeatherDay | null;

  inventory: Record<string, number>;
  priceHistory: Record<string, number[]>;

  productInventory: Record<string, number>;
  buildings: string[];
  declinedTemplates: string[];

  fieldEvents: FieldEvent[];
  listings: AuctionListing[];
  nextAnimalAuctionDay: number;
  pendingPickup: AuctionPickup[];
  daySummary: DaySummaryEvent[] | null;

  insurances: InsurancePolicy[];
  insuranceClaims: InsuranceClaim[];

  processedInventory: ProcessedItem[];
  activeBatches: ProcessingBatch[];
  harvestedCropIds: string[];
  completedMilestones: string[];
  milestonePopup: { icon: string; title: string; reward: number } | null;
  tutorialSeen: boolean;
  firstMissionStep: number; // 0=plant, 1=harvest, 2=sell, 3=hire worker, 4=sign contract, 5=done
  dismissedHints: string[];  // IDs of hints the player has permanently dismissed
  totalRevenue: number;
  yearEndShown: boolean;
  activeFair: FairEvent | null;
  futures: FuturesPosition[];
  cooperative: { member: boolean; joinDay: number } | null;
  coopMemberships: Partial<Record<CoopId, CoopMembership>>;
  coopStates: Record<CoopId, CoopState>;
  aquiferLevel: number;        // 0·100 (% of total capacity)
  wells: Well[];
  gridWaterActive: boolean;
  gridWaterDailyRate: number;  // $ per irrigated hectare per day
  reputation: number;
  autoSell: Record<string, { enabled: boolean; minPrice: number }>;
  prestige: number;
  workers: Worker[];
  consultant: Consultant | null;
  pendingRequests: WorkerRequest[];
  requestLog: WorkerRequest[];
  jobPostings: WorkerJobPosting[];
  employerReputation: number;
  bankrupt: boolean;
  sellPressures: { cropId: string; modifier: number; expiresDay: number }[];
  breedingPairs: Record<string, string>; // femaleId → preferred maleId
  activeEvents: GameEvent[];
  machineRepairs: MachineRepair[];
  attachments: OwnedAttachment[];
  trailers: OwnedTrailer[];
  tractorJobs: TractorJob[];
  deliveryJobs: DeliveryJob[];

  // Production buildings
  productionBuildings: ProductionBuildingState[];

  // Artisan processing buildings (new system)
  processingBuildings: import('../engine/processing').ProcessingBuilding[];
  animalWelfareScores: Record<string, number>;   // animalTypeId → 0·100
  milkGrades: Record<string, 'A' | 'B' | 'C'>;  // animalTypeId → grade (dairy species only)
  // Organic certification tracking (farm-wide)
  lastSyntheticInputDay: number;                  // day last pesticide/chemical fertilizer was used
  // Breeding & Veterinary infrastructure (Plan 2)
  sirePenAnimalIds: string[];         // animals designated as sires
  vetRoomOwned: boolean;              // derived from buildings.includes('bld_vet_room')
  medicineCabinetOwned: boolean;      // derived from buildings.includes('bld_medicine_cabinet')
  hasCCTV: boolean;                   // derived from buildings.includes('bld_cctv_monitor')
  sickBayCapacity: number;            // sum of capacity from owned sick bay buildings

  // Feed & Waste infrastructure (Plan 3)
  slurryLevel: number;          // current litres in slurry tank
  slurryCapacity: number;       // derived: sum of capacity from owned slurry tank buildings

  // Silage pit (Plan 6)
  silageLevel: number;      // current kg of silage stored
  silageCapacity: number;   // derived: sum of silage pit capacities

  // Biogas mode (Plan 6)
  biogasMode: 'income' | 'fuel'; // 'income' = sell to grid; 'fuel' = use on-farm

  // Hatchery (Plan 7)
  incubationQueue: IncubationBatch[];
  hatcheryCapacity: number;   // derived: sum of hatchery building capacities

  harvestJobs: HarvestJob[];
  npcFarms: NPCFarm[];
  rivalNews: RivalNewsItem[];

  // Seasonal goals
  seasonGoals: SeasonGoal[];
  seasonGoalSeason: string;      // which season goals belong to
  seasonStartMoney: number;      // money when season started (for earn goal)
  seasonStartRevenue: number;    // totalRevenue when season started
  seasonHarvestCount: number;    // harvests done this season

  seedVault: SeedEntry[];
  hybridJobs: HybridJob[];
  cropQualityMap: Record<string, number>; // cropId → quality gene from last harvested seed

  // Animal feed tracking
  henilQueue: HenilBatch[];
  grainMissedDays: number;   // 0·7 rolling: how many of last 7 days grain was short
  hayMissedDays: number;     // 0·7 rolling: how many of last 7 days hay was short
  animalsManuallyFed: boolean; // true if player tapped Feed All this day (no-worker path)

  // Settings
  soundEnabled: boolean;
  hapticEnabled: boolean;
  musicEnabled: boolean;

  // Animal product prices (fluctuate like crop prices)
  animalPrices: Record<string, number>;

  // Personal records
  personalRecords: {
    peakMoney: number;
    totalHarvests: number;
    bestSeasonRevenue: number;
    longestDay: number;         // highest day survived across resets
  };

  // Active seasonal weather event
  seasonalEvent: { type: 'heat_wave' | 'flood' | 'frost'; startDay: number; endsDay: number; severity: number } | null;

  farmName: string;
  fuel: number;
  fuelPrice: number;
  priceAlerts: PriceAlert[];
  // Animal Shows
  showEntries: ShowEntry[];
  showResults: ShowResult[];
  showWindowOpen: boolean;

  // Commodity Exchange
  marketOrders: MarketOrder[];

  // Regional Market
  selectedMarket: MarketId;

  electricity: ElectricityState;

  // Actions
  purchaseProductionBuilding: (buildingTypeId: string) => void;
  assignWorkerToBuilding: (buildingId: string, workerId: string) => void;
  unassignWorkerFromBuilding: (buildingId: string, workerId: string) => void;
  installEquipment: (buildingId: string, equipmentItemId: string) => void;
  performDeepClean: (buildingId: string, useContractor: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  performPrestige: () => void;
  counterOfferContract: (templateId: string, mod: 'price' | 'quantity' | 'deadline') => void;
  upgradeAnimalGene: (animalId: string, gene: keyof AnimalGenes) => void;
  sellSeedBatch: (seedEntryId: string) => void;
  buyMarketSeed: (cropId: string) => void;
  cureDisease: (parcelId: string) => void;
  plantCropBatch: (cropId: string) => void;
  setFarmName: (name: string) => void;
  addPriceAlert: (cropId: string, targetPrice: number, direction: 'above' | 'below') => void;
  removePriceAlert: (alertId: string) => void;
  placeMarketOrder: (cropId: string, quantity: number, targetPrice: number, termDays: number) => void;
  cancelMarketOrder: (orderId: string) => void;
  setSelectedMarket: (marketId: MarketId) => void;
  buyFuel: (litres: number) => void;
  enterAnimalShow: (animalId: string) => void;
  withdrawAnimalShow: (animalId: string) => void;
  advanceDay: () => void;
  advanceDays: (n: number) => void;
  assignHydrogeologist: (parcelId: string) => void;
  startDrilling: (wellId: string, spotId: string, targetFlowRate: number) => void;
  installPump: (wellId: string, pumpTier: 1 | 2 | 3) => void;
  connectParcel: (wellId: string, parcelId: string) => void;
  disconnectParcel: (wellId: string, parcelId: string) => void;
  setGridWater: (active: boolean) => void;
  buyParcel: (parcelId: string) => void;
  plantCrop: (parcelId: string, cropId: string, hectares: number) => void;
  harvestCrop: (parcelId: string) => void;
  sellCrop: (cropId: string, units: number, marketId?: MarketId) => void;
  buyAnimal: (typeId: string, sex: 'male' | 'female') => void;
  addToHenil: () => void;
  feedAnimals: () => void;
  sellAnimal: (animalId: string) => void;
  collectAnimalProduction: (animalId: string) => void;
  sellAnimalProduct: (productType: string, units: number) => void;
  breedAnimal: (animalId: string) => void;
  cullAnimal: (animalId: string) => void;
  treatAnimal: (animalId: string) => void;
  buyMachine: (typeId: string) => void;
  requestLoan: (principal: number, termDays: number, label: string) => void;
  repayLoan: (loanId: string) => void;
  depositSavings: (amount: number) => void;
  withdrawSavings: (amount: number) => void;
  acceptContract: (templateId: string) => void;
  declineContract: (templateId: string) => void;
  deliverCrop: (contractId: string, amount: number) => void;
  signRecurringContract: (
    buyerId: string,
    cropId: string,
    amountPerDelivery: number,
    frequencyDays: 7 | 14 | 30,
    durationSeasons: number,
  ) => void;
  deliverToRecurringContract: (contractId: string, amountDelivered: number) => void;
  cancelRecurringContract: (contractId: string) => void;
  applySoilAmendment: (parcelId: string, amendment: 'lime' | 'sulfur' | 'subsoiler') => void;
  applySoilNPK: (parcelId: string, productId: string) => void;
  plantCoverCrop: (parcelId: string, coverCropId: string) => void;
  buyProduct: (productId: string) => void;
  buyBuilding: (buildingId: string) => void;
  resolveFieldEvent: (eventId: string, productId: string) => void;
  clearWeeds: (parcelId: string) => void;
  fertilizeCrop: (parcelId: string, productId: string) => void;
  listItem: (params: {
    category: AuctionCategory;
    animalId?: string;
    cropId?: string;
    cropQuantity?: number;
    machineId?: string;
    startingBid: number;
    reservePrice: number;
    durationDays: 3 | 7 | 14;
  }) => void;
  withdrawListing: (listingId: string) => void;
  placeBid: (listingId: string, amount: number) => void;
  clearDaySummary: () => void;
  buyInsurance: (type: InsuranceType) => void;
  cancelInsurance: (policyId: string) => void;
  processProduct: (recipeId: string, batches: number) => void;
  sellProcessed: (productId: string, units: number) => void;
  openTimeDeposit: (amount: number, termDays: number, rate: number) => void;
  closeTimeDeposit: (depositId: string) => void;
  clearMilestonePopup: () => void;
  claimSeasonGoalReward: (goalId: string) => void;
  resetGame: () => void;
  markTutorialSeen: () => void;
  dismissHint: (id: string) => void;
  markYearEndShown: () => void;
  installGreenhouse: (parcelId: string) => void;
  removeGreenhouse: (parcelId: string) => void;
  openFuture: (cropId: string, quantity: number, termDays: number) => void;
  joinCooperative: () => void;
  leaveCooperative: () => void;
  joinCoop: (coopId: CoopId, sharesToBuy: number) => void;
  leaveCoop: (coopId: CoopId) => void;
  deliverToCoop: (coopId: CoopId, itemId: string, volume: number) => void;
  voteAGM: (coopId: CoopId, vote: 'yes' | 'no') => void;
  submitCounterProposal: (coopId: CoopId, changes: Partial<import('../engine/cooperativeTypes').CoopTerms>) => void;
  bookCoopEquipment: (coopId: CoopId, equipmentId: string, day: number) => void;
  harvestAllReady: () => void;
  collectAllProduction: () => void;
  setAutoSell: (cropId: string, settings: { enabled: boolean; minPrice: number } | null) => void;
  startNewSeason: () => void;
  hireWorker: (typeId: WorkerRole) => void;
  fireWorker: (workerId: string) => void;
  postVacancy: (role: WorkerRole, contractType: ContractType, offeredWage: number) => void;
  closePosting: (postingId: string) => void;
  hireApplicant: (postingId: string, applicantId: string) => void;
  approveRequest: (requestId: string) => void;
  denyRequest: (requestId: string) => void;
  chooseBranch: (workerId: string, branchId: string) => void;
  startCertStudy: (workerId: string, certId: string) => void;
  setWorkerNightShift: (workerId: string, enabled: boolean) => void;
  hireConsultant: () => void;
  installIrrigation: (parcelId: string) => void;
  renegotiateLoan: (loanId: string, extraDays: 30 | 60 | 90) => void;
  takeBankruptcyLoan: () => void;
  clearBankruptcy: () => void;
  setBreedingPair: (femaleId: string, maleId: string) => void;
  clearBreedingPair: (femaleId: string) => void;
  startHybridization: (cropId: string, parentAId: string, parentBId: string) => void;
  selectSeedForParcel: (parcelId: string, seedEntryId: string | null) => void;
  startRepair: (machineId: string) => void;
  buyAttachment: (typeId: string) => void;
  buyTrailer: (typeId: string) => void;
  hitchTrailer: (trailerId: string, truckId: string | null) => void;
  assignJob: (tractorId: string, attachmentId: string, operation: 'till' | 'plant' | 'spray' | 'spread_slurry', parcelIds: string[], cropId?: string) => void;
  assignHarvestJob: (combineId: string, parcelIds: string[]) => void;
  hireContractor: (operation: ContractorOperation, parcelIds: string[], cropId?: string) => void;
  dispatchDelivery: (params: {
    truckId: string;
    trailerId: string;
    driverId: string;
    cargo: DeliveryCargo[];
    marketId: 'local' | 'city' | 'export';
    returnOrders: ReturnOrder[];
  }) => void;

  // Processing building actions
  buyProcessingBuilding: (buildingTypeId: string) => void;
  upgradeProcessingBuilding: (buildingId: string) => void;
  assignWorkerToProcessingBuilding: (buildingId: string, workerId: string) => void;
  unassignWorkerFromProcessingBuilding: (buildingId: string, workerId: string) => void;
  installColdStorage: (buildingId: string) => void;

  // ── World Map ────────────────────────────────────────────────────────────
  mapFields: MapField[];
  mapPanX: number;
  mapPanY: number;
  mapZoom: number;
  selectedMapFieldId: string | null;
  selectMapField: (id: string | null) => void;
  buyMapField: (id: string) => void;
  scoutMapField: (id: string) => void;
  savePanZoom: (x: number, y: number, zoom: number) => void;
  designateAsSire: (animalId: string) => void;
  removeFromSirePen: (animalId: string) => void;
  spreadSlurry: () => void;
  fillSilagePit: (kgGrass: number) => void;
  setBiogasMode: (mode: 'income' | 'fuel') => void;
  queueEggsForIncubation: (typeId: string, quantity: number) => void;
  upgradeGridTier: () => void;
  buySolarPanels: (count: number) => void;
  buyWindTurbines: (count: number) => void;
  buildBiogasPlant: () => void;
  buildBiomassCHP: () => void;
  loadBiomassStraw: () => void;
  buildHeatPipeNetwork: () => void;
  buyBatteryBanks: (count: number) => void;
  buyGenerator: (model: GeneratorModel) => void;
  refuelGenerator: (litres: number) => void;
  toggleGenerator: () => void;
  serviceEquipment: (type: 'solar' | 'wind' | 'battery') => void;
  addSurgeProtector: (buildingId: string) => void;

  // Pest & Disease
  beneficialInsectsActive: boolean;
  cropConsultantParcelIds: string[];
  treatPest: (parcelId: string, productId: string) => void;
  buyBeneficialInsects: () => void;
  assignCropConsultant: (parcelIds: string[]) => void;

  // Selling Channels
  reputationHistory: { day: number; delta: number; reason: string }[];
  farmShop: {
    tier: 0 | 1 | 2 | 3;
    openDays: boolean[];
    openHours: number;
    assignedWorkerIds: string[];
  };
  restaurantContracts: import('../engine/sellingChannels').RestaurantContract[];
  vegBoxSubscribers: import('../engine/sellingChannels').VegBoxSubscriber[];
  onlineShopActive: boolean;
  onlineShopAllocations: Record<string, number>;
  farmCafeOpen: boolean;
  farmCafeWorkerIds: string[];
  awardHistory: import('../engine/sellingChannels').ShowAward[];
  productAwardBonuses: Record<string, number>;

  // Selling channel actions
  buyFarmShopUpgrade: () => void;
  setShopHours: (openDays: boolean[], openHours: number) => void;
  assignShopWorker: (workerId: string) => void;
  unassignShopWorker: (workerId: string) => void;
  toggleOnlineShop: () => void;
  setOnlineAllocation: (productId: string, units: number) => void;
  toggleFarmCafe: () => void;
  assignCafeWorker: (workerId: string) => void;
  unassignCafeWorker: (workerId: string) => void;
  enterAgriculturalShow: (productId: string, batchId: string) => void;
}

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

export const DELIVERY_DURATION: Record<'local' | 'city' | 'export', number> = {
  local: 1,
  city: 2,
  export: 3,
};

export const TRUCK_FUEL_LITRES: Record<string, Record<'local' | 'city' | 'export', number>> = {
  'truck-pickup': { local: 20, city: 60, export: 140 },
  'truck-dump':   { local: 28, city: 80, export: 180 },
  'truck-semi':   { local: 35, city: 100, export: 220 },
};

export const BREAKDOWN_CHANCE: Record<string, number> = { local: 0.01, city: 0.03, export: 0.05 };

export const REPAIR_FEE: Record<string, number> = {
  'truck-pickup': 200,
  'truck-dump':   350,
  'truck-semi':   600,
};

export const COLD_CARGO_IDS = new Set([
  'milk', 'cheese', 'butter', 'cream', 'eggs', 'meat', 'chicken_meat',
  'pork', 'lamb', 'beef', 'buffalo_meat', 'rabbit_meat', 'duck_meat',
  'turkey_meat', 'quail_meat',
]);

export const BULK_LIQUID_IDS = new Set(['milk_bulk', 'oil', 'juice']);

export const REFRIGERATED_TRAILER_IDS = [
  'trailer-refrigerated-s', 'trailer-refrigerated-l',
];
export const TANK_TRAILER_IDS = [
  'trailer-tank-s', 'trailer-tank-l',
];
export const LIVESTOCK_TRAILER_IDS = [
  'trailer-livestock-s', 'trailer-livestock-l',
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
      });
    }
  }
  return result;
}

function generateInitialPrices(): MarketPrice[] {
  const { COMMODITY_BASELINES } = require('../data/prices');
  const { ANIMAL_PRODUCTS } = require('../data/animalProducts');
  const { PROCESSED_PRODUCTS } = require('../data/processingTypes');
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
    { id: 'auction_p0', name: 'Gold Acre',   fertility: 22, soil: { ...SOIL_DEFAULTS }, cropHistory: [], hectares: 5,  pricePerHa: 550000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false },
    { id: 'auction_p1', name: 'Prime Ridge', fertility: 25, soil: { ...SOIL_DEFAULTS }, cropHistory: [], hectares: 2,  pricePerHa: 600000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false },
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

function makeInitialState() {
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
    reputation: 50,
    autoSell: {} as Record<string, { enabled: boolean; minPrice: number }>,
    prestige: 0,
    workers: [] as Worker[],
    consultant: createDefaultConsultant(),
    pendingRequests: [] as WorkerRequest[],
    requestLog: [] as WorkerRequest[],
    jobPostings: [] as WorkerJobPosting[],
    employerReputation: 50,
    bankrupt: false,
    sellPressures: [] as { cropId: string; modifier: number; expiresDay: number }[],
    breedingPairs: {} as Record<string, string>,
    seedVault: [] as SeedEntry[],
    hybridJobs: [] as HybridJob[],
    cropQualityMap: {} as Record<string, number>,
    activeEvents: [] as GameEvent[],
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
    soundEnabled: true,
    hapticEnabled: true,
    musicEnabled: true,
    animalPrices: { eggs: 0.18, milk: 0.45, honey: 8.50, wool: 3.20, meat: 4.50, cream: 2.80 },
    personalRecords: { peakMoney: 1_000_000, totalHarvests: 0, bestSeasonRevenue: 0, longestDay: 1 },
    seasonalEvent: null as { type: 'heat_wave' | 'flood' | 'frost'; startDay: number; endsDay: number; severity: number } | null,
    farmName: 'My Farm',
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
  };
}


const COVER_CROP_BENEFITS: Record<string, {
  nitrogen?: number;
  organicMatter?: number;
  compactionReduction?: number;
  microbialLife?: number;
}> = {
  rye:       { compactionReduction: 8, organicMatter: 0.4 },
  clover:    { nitrogen: 20, organicMatter: 2.0 },
  mustard:   { microbialLife: 10 },
  buckwheat: { microbialLife: 10, organicMatter: 0.5 },
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...makeInitialState(),

      advanceDay: () => {
        const state = get();
        const newDay = state.day + 1;
        const workerBonuses = getWorkerBonuses(state.workers ?? []);
        const season = getSeason(newDay);

        // Fuel price fluctuation (·$0.04/day, clamped $0.90·$1.80)
        const fuelDelta = (Math.random() - 0.5) * 0.08;
        const newFuelPrice = Math.min(1.80, Math.max(0.90, (state.fuelPrice ?? 1.20) + fuelDelta));
        const prevSeason = getSeason(state.day);
        const summary: DaySummaryEvent[] = [];

        // Weather
        const forecast = state.forecast.length > 1 ? state.forecast.slice(1) : generateForecast(season);
        const todayWeather = state.forecast[0] ?? generateForecast(season)[0];
        if (forecast.length < 3) forecast.push(...generateForecast(season, 4));

        // Apply probabilistic forecast deviation: if today's forecast probability < 1.0, re-roll
        let resolvedWeather = todayWeather;
        if (todayWeather && todayWeather.probability < 1.0 && Math.random() > todayWeather.probability) {
          const rerolled = generateForecast(season, 1)[0];
          resolvedWeather = { ...rerolled, probability: 1.0 };
        }

        // Apply daily weather to all planted crops (moisture, frost damage, drought stress)
        const weatherResults = applyDailyWeather(
          state.parcels.map(p => ({
            id: p.id,
            plantedCrop: p.plantedCrop,
            irrigated: p.irrigated,
            greenhouse: p.greenhouse,
          })),
          resolvedWeather ?? todayWeather,
          CROP_TYPES,
        );
        const killedParcelIds = weatherResults.filter(r => r.killed).map(r => r.id);

        // Weather summary
        const WEATHER_INFO: Record<string, { icon: string; name: string; severity: DaySummaryEvent['severity'] }> = {
          perfect:    { icon: '✨', name: 'Perfect day · ideal conditions',       severity: 'good' },
          sunny:      { icon: '☀️', name: 'Sunny',                                severity: 'info' },
          cloudy:     { icon: '☁️', name: 'Cloudy',                               severity: 'info' },
          rain:       { icon: '🌧️', name: 'Rain · good for crops',               severity: 'info' },
          heavy_rain: { icon: '⛈️', name: 'Heavy rain',                           severity: 'warning' },
          drought:    { icon: '🌵', name: 'Drought! Crops at risk',               severity: 'danger' },
          frost:      { icon: '❄️', name: 'Frost! Crops at risk',                 severity: 'danger' },
          hail:       { icon: '🌨️', name: 'Hail! Crops at risk',                  severity: 'danger' },
          wind:       { icon: '💨', name: 'Strong wind',                          severity: 'warning' },
          fog:        { icon: '🌫️', name: 'Fog',                                  severity: 'info' },
        };
        if (todayWeather) {
          const w = WEATHER_INFO[todayWeather.event] ?? { icon: '🌤️', name: todayWeather.event, severity: 'info' as const };
          summary.push({ id: 'weather', icon: w.icon, title: w.name, severity: w.severity });
        }

        // ── Price engine tick (all commodities) ────────────────────────────
        const priceTickResult = tickAllPrices({
          prices: state.prices,
          momentum: state.priceMomentum ?? {},
          priceHistory15d: state.priceHistory15d ?? {},
          activeShocks: state.activeShocks ?? [],
          day: newDay,
          forecast: state.forecast,
          npcProductionMultipliers: state.npcProductionMultipliers ?? {},
        });
        let prices = priceTickResult.prices;
        const newPriceMomentum = priceTickResult.momentum;
        const newPriceHistory15d = priceTickResult.priceHistory15d;
        let activeShocks: ActiveShock[] = priceTickResult.activeShocks;

        // Fallow recovery: owned empty parcels regain +1 fertility (Botanist speeds this up)
        const fallowInterval = workerBonuses.fallowRestoreInterval;
        const fallowParcels = newDay % fallowInterval === 0
          ? state.parcels.map(p =>
              p.owned && !p.plantedCrop && p.fertility < 25
                ? { ...p, fertility: Math.min(25, p.fertility + 1) }
                : p
            )
          : state.parcels;

        // Tick down news events
        let newsEvents: NewsEvent[] = state.newsEvents
          .map(e => ({ ...e, daysRemaining: e.daysRemaining - 1 }))
          .filter(e => e.daysRemaining > 0);

        // 10% chance of new news event
        let newNewsEvent: NewsEvent | null = null;
        if (Math.random() < 0.10) {
          const { NEWS_TEMPLATES } = require('../data/newsEventTemplates');
          const available = NEWS_TEMPLATES.filter(
            (t: any) => !newsEvents.some((e: NewsEvent) => e.description === t.headline)
          );
          if (available.length > 0) {
            const template = available[Math.floor(Math.random() * available.length)];
            newNewsEvent = {
              id: `news_${newDay}_${template.id}`,
              description: template.headline,
              cropId: template.cropId,
              modifier: template.modifier,
              daysRemaining: template.durationDays,
            };
            newsEvents = [...newsEvents, newNewsEvent];
            prices = prices.map(p => {
              if (template.cropId === null || template.cropId === p.cropId) {
                return { ...p, price: Math.max(1, p.price * template.modifier) };
              }
              return p;
            });
            if (template.priceShock) {
              activeShocks = [...activeShocks, {
                ...template.priceShock,
                remainingDays: template.priceShock.durationDays,
              }];
            }
          }
        }
        if (newNewsEvent) {
          const bull = newNewsEvent.modifier >= 1;
          summary.push({
            id: 'news',
            icon: bull ? '📈' : '📉',
            title: newNewsEvent.description,
            severity: bull ? 'good' : 'warning',
          });
        }

        // ── Animal Show: open entry window at days 83·89 of each season quarter ──
        const dayInSeason = (newDay - 1) % 90;
        const showWindowOpen = dayInSeason >= 82 && dayInSeason <= 88;

        // Show resolution state (populated inside season change block if needed)
        let newShowResults: ShowResult[] = [];
        let showPrizeMoney = 0;

        // Season change announcement + goal generation
        let newSeasonGoals: SeasonGoal[] | null = null;
        let newSeasonGoalSeason: string | null = null;
        let newSeasonStartMoney = 0;
        let newSeasonStartRevenue = 0;

        if (season !== prevSeason) {
          const SEASON_ICONS: Record<string, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
          const enteringPeak = CROP_TYPES.filter(c => c.peakSeason === season).map(c => c.name);
          const leavingPeak  = CROP_TYPES.filter(c => c.peakSeason === prevSeason).map(c => c.name);
          summary.push({
            id: 'season_change',
            icon: SEASON_ICONS[season] ?? '🗓️',
            title: `${season.charAt(0).toUpperCase() + season.slice(1)} has arrived`,
            detail: [
              enteringPeak.length ? `📉 Prices falling: ${enteringPeak.slice(0, 3).join(', ')}` : '',
              leavingPeak.length  ? `📈 Prices rising: ${leavingPeak.slice(0, 3).join(', ')}`   : '',
            ].filter(Boolean).join(' · '),
            severity: 'info',
          });

          // Generate fresh seasonal goals
          const ownedHa = state.parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0);
          const earnTarget = Math.round(Math.max(20_000, state.totalRevenue * 0.15) / 5_000) * 5_000;
          const harvestTarget = Math.max(5, Math.min(25, state.parcels.filter(p => p.owned).length * 2));
          const haTarget = Math.round(ownedHa + Math.max(5, Math.floor(ownedHa * 0.2)));
          newSeasonGoals = [
            { id: `earn_${newDay}`, icon: '💰', label: `Earn $${earnTarget.toLocaleString()} this season`, type: 'earn', target: earnTarget, reward: 3000 },
            { id: `harvest_${newDay}`, icon: '🌾', label: `Harvest ${harvestTarget} times`, type: 'harvest_count', target: harvestTarget, reward: 2000 },
            { id: `land_${newDay}`, icon: '🗺️', label: `Own ${haTarget}+ ha`, type: 'own_ha', target: haTarget, reward: 1500 },
          ];
          newSeasonGoalSeason = season;
          newSeasonStartMoney = state.money;
          newSeasonStartRevenue = state.totalRevenue;

          // ── Animal Show: resolve results at season transition ──────────────
          const { geneScore: geneScoreShow } = require('../engine/animals');
          const prevSeasonStart = state.day - ((state.day - 1) % 90);
          const prevSeasonKey = `${prevSeason}_${prevSeasonStart}`;
          const seasonEntries = (state.showEntries ?? []).filter(e => e.seasonKey === prevSeasonKey);
          const PRIZE_TABLE_SHOW = [2500, 1000, 500];
          newShowResults = seasonEntries.map(entry => {
            const animal = state.animals.find(a => a.id === entry.animalId);
            if (!animal) return null as unknown as ShowResult;
            const genes = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
            const traitBonus = (animal.traits ?? []).length * 0.05;
            const playerScore = parseFloat((geneScoreShow(genes) + traitBonus).toFixed(3));
            const npcBase = 0.85 + Math.min(state.day / 3600, 0.35);
            const npcScores = Array.from({ length: 5 }, () =>
              parseFloat((npcBase + (Math.random() - 0.5) * 0.30).toFixed(3))
            );
            const allScores = [...npcScores, playerScore].sort((a, b) => b - a);
            const placement = allScores.indexOf(playerScore) + 1;
            const prize = placement <= 3 ? PRIZE_TABLE_SHOW[placement - 1] : 0;
            showPrizeMoney += prize;
            const seasonLabels: Record<string, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
            const year = Math.ceil(state.day / 360);
            return {
              id: `show_${entry.animalId}_${state.day}`,
              seasonKey: prevSeasonKey,
              seasonLabel: `${seasonLabels[prevSeason] ?? prevSeason} Year ${year}`,
              animalId: entry.animalId,
              animalTypeId: animal.typeId,
              playerScore,
              placement,
              prize,
              npcScores,
              resolvedDay: newDay,
            } as ShowResult;
          }).filter(Boolean);

          for (const result of newShowResults) {
            if (result.placement === 1) {
              summary.push({ id: `show_win_${result.id}`, icon: '🏆', title: `1st place at the County Show! +$${result.prize.toLocaleString()}`, detail: '', severity: 'good' });
            } else if (result.placement <= 3) {
              summary.push({ id: `show_place_${result.id}`, icon: '🎖️', title: `${result.placement === 2 ? '2nd' : '3rd'} place at the County Show! +$${result.prize.toLocaleString()}`, detail: '', severity: 'good' });
            }
          }
        }

        // Farm Fair: tick down or randomly start
        let activeFair: FairEvent | null = state.activeFair
          ? state.activeFair.daysRemaining > 1
            ? { ...state.activeFair, daysRemaining: state.activeFair.daysRemaining - 1 }
            : null
          : null;
        if (!activeFair && !state.activeFair && Math.random() < 0.03) {
          activeFair = { id: `fair_${newDay}`, daysRemaining: 7, discount: 0.30 };
          summary.push({
            id: 'fair',
            icon: '🎪',
            title: 'Farm Fair! Animals -30% for 7 days',
            severity: 'good',
          });
        }

        // ── Seasonal weather events ──────────────────────────────────────────
        const EVENT_BY_SEASON: Record<string, ('heat_wave' | 'flood' | 'frost')[]> = {
          spring: ['flood'],
          summer: ['heat_wave'],
          autumn: ['flood', 'frost'],
          winter: ['frost'],
        };
        let seasonalEvent = state.seasonalEvent ?? null;
        // Expire old event
        if (seasonalEvent && newDay > seasonalEvent.endsDay) {
          summary.push({ id: 'event_end', icon: '✅', title: `${seasonalEvent.type.replace('_', ' ')} has passed`, severity: 'info' });
          seasonalEvent = null;
        }
        // Chance to start new event (3% per day if none active)
        if (!seasonalEvent && Math.random() < 0.03) {
          const possible = EVENT_BY_SEASON[season] ?? ['heat_wave'];
          const type = possible[Math.floor(Math.random() * possible.length)];
          const severity = 0.5 + Math.random() * 0.5; // 0.5·1.0
          const durationDays = Math.round(5 + Math.random() * 10); // 5·15 days
          seasonalEvent = { type, startDay: newDay, endsDay: newDay + durationDays, severity };
          const EVENT_ICONS: Record<string, string> = { heat_wave: '🌡️', flood: '🌊', frost: '❄️' };
          const EVENT_NAMES: Record<string, string> = { heat_wave: 'Heat Wave', flood: 'Flood', frost: 'Early Frost' };
          summary.push({
            id: 'seasonal_event',
            icon: EVENT_ICONS[type],
            title: `${EVENT_NAMES[type]}! (${durationDays}d)`,
            detail: type === 'heat_wave' ? '−15% crop yield while active' : type === 'flood' ? 'Soil fertility draining faster' : 'Crops at risk of damage',
            severity: 'danger',
          });
        }

        // Sell pressure: apply active modifiers to prices, then expire old ones
        const activePressures = (state.sellPressures ?? []).filter(sp => sp.expiresDay >= newDay);
        prices = prices.map(p => {
          const pressure = activePressures.find(sp => sp.cropId === p.cropId);
          return pressure ? { ...p, price: Math.max(1, p.price * pressure.modifier) } : p;
        });
        const sellPressures = [...activePressures];

        // Derive animalPrices from unified prices array (now managed by priceEngine)
        const animalPrices: Record<string, number> = { ...(state.animalPrices ?? {}) };
        const ANIMAL_PRODUCT_IDS = ['eggs', 'milk', 'honey', 'wool', 'meat', 'cream'];
        for (const p of prices) {
          if (ANIMAL_PRODUCT_IDS.includes(p.cropId)) {
            animalPrices[p.cropId] = p.price;
          }
        }

        // ── NPC competitor sells ─────────────────────────────────────────────

        // Map NPC farm IDs to map owner types
        const NPC_MAP_OWNER = NPC_FARM_GROUP;

        let npcFarms: NPCFarm[] = [...(state.npcFarms ?? [])];
        let mapFields = [...state.mapFields];
        const rivalNewsItems: RivalNewsItem[] = [];
        const foreclosureParcels: LandParcel[] = [];

        npcFarms = npcFarms.map(farm => {
          if (farm.nextSellDay > newDay) return farm;
          // Pick a random specialty crop
          const cropId = farm.specialization[Math.floor(Math.random() * farm.specialization.length)];
          const volume = npcSellVolume(farm);
          // Apply sell pressure (uses existing sellPressures mechanism)
          const pressureMod = computeSellPressureModifier(volume);
          const duration = sellPressureDuration(volume);
          if (pressureMod < 1.0) {
            sellPressures.push({
              cropId,
              modifier: pressureMod,
              expiresDay: newDay + duration,
            });
            const { CROP_TYPES: CT } = require('../data/cropTypes');
            const cropName = CT.find((c: any) => c.id === cropId)?.name ?? cropId;
            const sellEvent = {
              id: `npc_sell_${farm.id}_${newDay}`,
              icon: '🏭',
              title: `${farm.name} flooded the market`,
              detail: `Sold ${volume} ${cropName} · prices depressed ${Math.round((1 - pressureMod) * 100)}% for ${duration}d`,
              severity: 'warning' as const,
            };
            summary.push(sellEvent);
            rivalNewsItems.push({ ...sellEvent, day: newDay });
          }
          // Grow NPC wealth slightly each sell cycle
          const newWealth = Math.round(farm.wealth * 1.02 + volume * 0.5);

          // NPC land buying: if wealthy enough, occasionally buy a forsale field
          const mapOwner = NPC_MAP_OWNER[farm.id];
          if (mapOwner && newWealth > 25_000 && Math.random() < 0.04) {
            const forsaleFields = mapFields.filter(f => f.owner === 'forsale');
            if (forsaleFields.length > 0) {
              const target = forsaleFields[Math.floor(Math.random() * forsaleFields.length)];
              mapFields = mapFields.map(f => f.id === target.id ? { ...f, owner: mapOwner } : f);
              const buyEvent = {
                id: `npc_buy_${farm.id}_${newDay}`,
                icon: '🏴',
                title: `${farm.name} acquired new land!`,
                detail: `${target.name} (~${target.approximateHa}ha) is now under rival control`,
                severity: 'warning' as const,
              };
              summary.push(buyEvent);
              rivalNewsItems.push({ ...buyEvent, day: newDay });
            }
          }

          // NPC land losing / bankruptcy: if broke, revert a field + offer discounted parcel
          if (mapOwner && newWealth < 5_000) {
            const ownedFields = mapFields.filter(f => f.owner === mapOwner);
            if (ownedFields.length > 0) {
              const lost = ownedFields[Math.floor(Math.random() * ownedFields.length)];
              mapFields = mapFields.map(f => f.id === lost.id ? { ...f, owner: 'forsale', askingPrice: Math.round(lost.approximateHa * 6500) } : f);
              // Add a discounted foreclosure parcel to the player's buy list (if not already there)
              const foreId = `foreclosure_${farm.id}`;
              if (!state.parcels.some(p => p.id === foreId)) {
                foreclosureParcels.push({
                  id: foreId,
                  name: `${farm.name}'s Holding`,
                  fertility: 8 + (farm.tier * 3),
                  soil: { ...SOIL_DEFAULTS },
                  cropHistory: [],
                  hectares: farm.tier * 2,
                  pricePerHa: 6500 + (farm.tier * 300), // ~40% below market
                  owned: false,
                  hasWeeds: true,
                  plantedCrop: null,
                  greenhouse: false,
                  irrigated: false,
                  tilled: false,
                } as LandParcel);
              }
              const loseEvent = {
                id: `npc_lose_${farm.id}_${newDay}`,
                icon: '📉',
                title: `${farm.name} is going bankrupt!`,
                detail: `Foreclosure sale · ${farm.tier * 2}ha parcel available at 40% off`,
                severity: 'info' as const,
              };
              summary.push(loseEvent);
              rivalNewsItems.push({ ...loseEvent, day: newDay });
            }
          }

          return {
            ...farm,
            nextSellDay: newDay + farm.sellIntervalDays,
            wealth: newWealth,
          };
        });

        // NPC supply response to sustained price signals
        const { multipliers: newNpcProductionMultipliers, signalDays: newNpcPriceSignalDays } =
          updateNpcProductionMultipliers(
            state.npcProductionMultipliers ?? {},
            state.npcPriceSignalDays ?? {},
            prices,
          );

        // Price history
        const priceHistory: Record<string, number[]> = {};
        for (const p of prices) {
          const prev = state.priceHistory[p.cropId] ?? [];
          priceHistory[p.cropId] = [...prev, p.price].slice(-90);
        }

        // ── Workers daily tick ──────────────────────────────────────────────
        const tickedWorkers = (state.workers ?? []).map(w => tickWorker(w, newDay));

        // Weekly satisfaction pressure
        const weeklyPayrollDue = newDay % 7 === 0;
        const weeklyTickedWorkers = weeklyPayrollDue
          ? tickedWorkers.map(w => {
              let sat = w.satisfaction;
              const hist = [...w.satisfactionHistory];
              if (w.nightShift) {
                const seniorWage = WORKER_ROLE_CONFIG[w.role]?.wageRangeSenior[0] ?? 100;
                if (w.wagePerDay < Math.round(seniorWage * 1.25)) {
                  sat -= 5;
                  hist.push({ day: newDay, delta: -5, reason: 'Night shift without premium' });
                }
              }
              if (!w.pinnedAssetId && (w.role === 'tractor_operator' || w.role === 'combine_operator')) {
                sat -= 2;
                hist.push({ day: newDay, delta: -2, reason: 'Underutilized' });
              }
              sat = Math.max(0, Math.min(100, sat));
              return { ...w, satisfaction: sat, satisfactionHistory: hist.slice(-30) };
            })
          : tickedWorkers;

        // Injury rolls
        const injuredWorkers = weeklyTickedWorkers.map(w => {
          if (w.isInjured || w.isOnLeave) return w;
          const hasMechanic = weeklyTickedWorkers.some(x => x.role === 'farm_mechanic' && !x.isInjured);
          if (rollInjury(w, hasMechanic)) {
            const recoveryDays = Math.floor(Math.random() * 18) + 3;
            return { ...w, isInjured: true, injuryRecoveryDay: newDay + recoveryDays, satisfaction: Math.max(0, w.satisfaction - 15) };
          }
          return w;
        });

        // Poaching rolls
        const poachingRequests: WorkerRequest[] = [];
        const employerRep = state.employerReputation ?? 50;
        const afterPoachingWorkers = injuredWorkers.map(w => {
          const { poached, offerWage } = rollPoaching(w, employerRep);
          if (poached) {
            poachingRequests.push({
              id: `req_poach_${w.id}_${newDay}`,
              workerId: w.id,
              workerName: w.name,
              workerIcon: WORKER_ROLE_CONFIG[w.role]?.icon ?? '👷',
              type: 'poaching_alert',
              message: `${w.name} has been approached by a competitor farm offering $${offerWage}/day.`,
              cost: offerWage - w.wagePerDay,
              consequence: `${w.name} may leave if you don't match the offer.`,
              urgency: 'urgent',
              postedDay: newDay,
              timeoutDay: newDay + 3,
              resolved: false,
            });
          }
          return w;
        });

        // Weekly payroll
        let workerPayrollDeducted = 0;
        let finalWorkers = afterPoachingWorkers;
        if (weeklyPayrollDue) {
          workerPayrollDeducted = calcWeeklyPayroll(afterPoachingWorkers, state.consultant ?? null);
          finalWorkers = afterPoachingWorkers.map(w => ({
            ...w,
            satisfaction: Math.min(100, w.satisfaction + 1),
          }));
        }

        // Performance review reminders (every 180 days per worker)
        const reviewRequests: WorkerRequest[] = finalWorkers
          .filter(w => {
            const lastReview = w.lastPerformanceReviewDay ?? w.hireDay;
            return newDay - lastReview >= 180;
          })
          .filter(w => !(state.pendingRequests ?? []).some(r => r.workerId === w.id && r.type === 'performance_review'))
          .map(w => ({
            id: `req_review_${w.id}_${newDay}`,
            workerId: w.id,
            workerName: w.name,
            workerIcon: WORKER_ROLE_CONFIG[w.role]?.icon ?? '👷',
            type: 'performance_review' as const,
            message: `${w.name} is due for a performance review.`,
            urgency: 'routine' as const,
            postedDay: newDay,
            resolved: false,
          }));

        // Personal requests (throttled: 1 per worker at a time)
        const personalRequests: WorkerRequest[] = [];
        const busyWorkerIds = new Set([
          ...(state.pendingRequests ?? []).map(r => r.workerId),
          ...poachingRequests.map(r => r.workerId),
          ...reviewRequests.map(r => r.workerId),
        ]);
        for (const w of finalWorkers) {
          if (busyWorkerIds.has(w.id)) continue;
          const icon = WORKER_ROLE_CONFIG[w.role]?.icon ?? '👷';
          if (w.satisfaction < 60 && Math.random() < 0.01) {
            personalRequests.push({
              id: `req_payrise_${w.id}_${newDay}`,
              workerId: w.id, workerName: w.name, workerIcon: icon,
              type: 'pay_rise',
              message: `${w.name} is asking for a pay rise from $${w.wagePerDay}/day.`,
              cost: Math.round(w.wagePerDay * 0.15),
              consequence: 'Satisfaction will drop if denied.',
              urgency: 'routine',
              postedDay: newDay,
              resolved: false,
            });
            busyWorkerIds.add(w.id);
          } else if (Math.random() < 0.003) {
            personalRequests.push({
              id: `req_timeoff_${w.id}_${newDay}`,
              workerId: w.id, workerName: w.name, workerIcon: icon,
              type: 'time_off',
              message: `${w.name} is asking for 3 days off.`,
              consequence: 'Tasks will be unmanned for 3 days.',
              urgency: 'routine',
              postedDay: newDay,
              resolved: false,
            });
            busyWorkerIds.add(w.id);
          } else if (w.isStudying && w.studyingCertId) {
            const cert = w.certifications.find(c => c.id === w.studyingCertId);
            if (cert && !cert.examFeePaid && Math.random() < 0.01) {
              personalRequests.push({
                id: `req_examfee_${w.id}_${newDay}`,
                workerId: w.id, workerName: w.name, workerIcon: icon,
                type: 'exam_fee',
                message: `${w.name} is asking you to cover the exam fee for ${cert.name}.`,
                cost: 400,
                consequence: 'Certification will stall without the exam fee.',
                urgency: 'routine',
                postedDay: newDay,
                resolved: false,
              });
              busyWorkerIds.add(w.id);
            }
          }
        }

        // Strike check
        const avgSatisfaction = finalWorkers.length > 0
          ? finalWorkers.reduce((s, w) => s + w.satisfaction, 0) / finalWorkers.length
          : 100;
        if (avgSatisfaction < 25 && finalWorkers.length >= 3) {
          const strikeAlreadyPending = (state.pendingRequests ?? []).some(r => r.type === 'disagreement' && r.workerId === 'all');
          if (!strikeAlreadyPending) {
            personalRequests.push({
              id: `req_strike_${newDay}`,
              workerId: 'all',
              workerName: 'All Staff',
              workerIcon: '⚠️',
              type: 'disagreement',
              message: `Charlie: "The whole team is at breaking point · average satisfaction is ${Math.round(avgSatisfaction)}%. You need to act now."`,
              consequence: 'All workers may strike. Farm operations will halt.',
              urgency: 'urgent',
              postedDay: newDay,
              timeoutDay: newDay + 3,
              resolved: false,
            });
          }
        }

        const allNewRequests = [...poachingRequests, ...reviewRequests, ...personalRequests];
        const newPendingRequests = [...(state.pendingRequests ?? []), ...allNewRequests];

        // Machine + building maintenance
        const maintenanceCost = Math.round(getDailyMaintenance(state.machines, state.buildings) * workerBonuses.maintenanceMult);
        // Insurance premiums
        const activePolicies = state.insurances.filter(p => p.active);
        const ownedHa = state.parcels.filter(p => p.owned).reduce((s, p) => s + ((p as any).hectares ?? 1), 0);
        const insurancePremium = activePolicies.reduce((s, pol) => {
          const plan = INSURANCE_PLANS.find(pl => pl.type === pol.type);
          if (!plan) return s;
          if (plan.perHa && plan.ratePerHaPerDay != null) {
            return s + plan.ratePerHaPerDay * ownedHa;
          }
          return s + plan.premiumPerDay;
        }, 0);
        // Worker wages
        const workerWages = weeklyPayrollDue ? workerPayrollDeducted : 0;
        const totalFixed = maintenanceCost + insurancePremium + workerWages;
        const moneyAfterMaintenance = state.money - totalFixed;
        if (maintenanceCost > 0 || insurancePremium > 0 || workerWages > 0) {
          const detail = [
            maintenanceCost > 0 && `${state.machines.length} machine${state.machines.length !== 1 ? 's' : ''} · ${state.buildings.length} building${state.buildings.length !== 1 ? 's' : ''}`,
            insurancePremium > 0 && `${activePolicies.length} active policy${activePolicies.length !== 1 ? 'ies' : ''} (-$${insurancePremium}/day)`,
            workerWages > 0 && `${finalWorkers.length} worker${finalWorkers.length !== 1 ? 's' : ''} -$${workerWages}/week`,
          ].filter(Boolean).join(' · ');
          summary.push({
            id: 'maintenance',
            icon: '🔧',
            title: `-$${totalFixed.toLocaleString()} fixed costs`,
            detail,
            severity: 'info',
          });
        }

        // Savings interest
        const interest = accrueInterest(state.savings, newDay);
        const savings = { balance: state.savings.balance + interest, lastInterestDay: newDay };
        if (interest > 0) {
          summary.push({
            id: 'interest',
            icon: '💰',
            title: `+$${Math.round(interest).toLocaleString()} interest`,
            detail: 'Savings account yield',
            severity: 'good',
          });
        }

        // Loan due-soon warnings
        for (const l of state.loans.filter(lo => !lo.paid && !lo.defaulted)) {
          const daysLeft = l.payoffDay - newDay;
          if (daysLeft === 7 || daysLeft === 1) {
            summary.push({
              id: `loan_warn_${l.id}_${daysLeft}`,
              icon: '⚠️',
              title: `Loan due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
              detail: `$${Math.round(l.totalOwed).toLocaleString()} owed · pay in Office to avoid late fee`,
              severity: 'warning',
            });
          }
        }

        // Loan defaults
        const loans = state.loans.map(l => {
          if (!l.paid && !l.defaulted && newDay > l.payoffDay) {
            return { ...l, defaulted: true };
          }
          return l;
        });
        const newDefaults = loans.filter(
          l => l.defaulted && !state.loans.find(ol => ol.id === l.id)?.defaulted
        );
        const loanHistory = [
          ...state.loanHistory,
          ...newDefaults.map(l => ({ loanId: l.id, paidOnTime: false })),
        ].slice(-50);
        const LATE_FEE_RATE = 0.10;
        const defaultPenalty = newDefaults.reduce((s, l) => s + l.totalOwed * (1 + LATE_FEE_RATE), 0);
        for (const loan of newDefaults) {
          const lateFee = Math.round(loan.totalOwed * LATE_FEE_RATE);
          summary.push({
            id: `default_${loan.id}`,
            icon: '💸',
            title: 'Loan defaulted · funds seized',
            detail: `$${Math.round(loan.totalOwed).toLocaleString()} + $${lateFee.toLocaleString()} late fee · credit score hit`,
            severity: 'danger',
          });
        }

        // Contracts expiring soon
        for (const c of state.contracts) {
          if (!c.completed && !c.failed) {
            const daysLeft = c.deadlineDay - newDay;
            if (daysLeft === 3 || daysLeft === 1) {
              const crop = CROP_TYPES.find(cr => cr.id === c.cropId);
              summary.push({
                id: `contract_warn_${c.id}`,
                icon: '⚠️',
                title: `${crop?.name ?? c.cropId} contract expires in ${daysLeft}d`,
                detail: `Delivered: ${c.delivered}/${c.amount} ${crop?.unit ?? ''}`,
                severity: 'warning',
              });
            }
          }
        }

        // Contract failure + penalty
        const { contractPenalty: calcContractPenalty } = require('../engine/contracts');
        const contracts = state.contracts.map(c => {
          if (!c.completed && !c.failed && newDay > c.deadlineDay) {
            return { ...c, failed: true };
          }
          return c;
        });
        const newFailures = contracts.filter(
          c => c.failed && !state.contracts.find(oc => oc.id === c.id)?.failed
        );
        let contractPenaltyTotal = 0;
        for (const c of newFailures) {
          const penalty = Math.round(calcContractPenalty(c));
          contractPenaltyTotal += penalty;
          const crop = CROP_TYPES.find(cr => cr.id === c.cropId);
          summary.push({
            id: `contract_failed_${c.id}`,
            icon: '💔',
            title: `Contract failed · ${crop?.name ?? c.cropId}`,
            detail: `-$${penalty.toLocaleString()} penalty · ${c.delivered}/${c.amount} ${crop?.unit ?? ''} delivered`,
            severity: 'danger',
          });
        }

        // Sales log trim
        const salesLog = state.salesLog.filter(s => s.day >= newDay - 90);

        // Weed spread
        let parcels = fallowParcels.map(p => {
          if (p.owned && !p.plantedCrop && !p.hasWeeds && Math.random() < 0.05) {
            return { ...p, hasWeeds: true };
          }
          return p;
        });

        // Weather crop damage accumulation (frost kill + drought stress from applyDailyWeather)
        let destroyedCount = 0;
        let weatherInsurancePayout = 0;
        const newClaims: InsuranceClaim[] = [];

        // Merge applyDailyWeather results back into parcels
        parcels = parcels.map(p => {
          const result = weatherResults.find(r => r.id === p.id);
          if (!result) return p;
          return { ...p, plantedCrop: result.plantedCrop };
        });

        // Handle frost-killed parcels: insurance claim + summary
        if (killedParcelIds.length > 0) {
          const climaPlan = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
          const insured = hasActiveInsurance(state.insurances, 'clima');
          for (const parcelId of killedParcelIds) {
            const p = parcels.find(lp => lp.id === parcelId);
            if (!p) continue;
            destroyedCount++;
            if (insured) {
              const cropVal = estimateCropValue(p, prices);
              const payout = Math.round(cropVal * climaPlan.coveragePercent);
              weatherInsurancePayout += payout;
              newClaims.push({
                id: `claim_${newDay}_${p.id}`,
                day: newDay,
                type: 'clima' as InsuranceType,
                payout,
                description: `${p.hectares}ha plot killed by accumulated frost damage`,
              });
            }
          }
        }

        // Hail still uses a one-day random chance (hail is sudden, not accumulated)
        if (resolvedWeather?.event === 'hail') {
          const climaPlan = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
          const insured = hasActiveInsurance(state.insurances, 'clima');
          parcels = parcels.map(p => {
            if (p.plantedCrop && !p.greenhouse && Math.random() < 0.12) {
              destroyedCount++;
              if (insured) {
                const cropVal = estimateCropValue(p, prices);
                const payout = Math.round(cropVal * climaPlan.coveragePercent);
                weatherInsurancePayout += payout;
                newClaims.push({
                  id: `claim_${newDay}_hail_${p.id}`,
                  day: newDay,
                  type: 'clima' as InsuranceType,
                  payout,
                  description: `${p.hectares}ha plot destroyed by hail`,
                });
              }
              return { ...p, plantedCrop: null };
            }
            return p;
          });
        }
        if (destroyedCount > 0) {
          const w = WEATHER_INFO[todayWeather!.event];
          summary.push({
            id: 'crop_destroyed',
            icon: '💀',
            title: `${destroyedCount} plot${destroyedCount > 1 ? 's' : ''} destroyed`,
            detail: `By ${w?.name.split('·')[0].trim() ?? 'extreme weather'}${weatherInsurancePayout > 0 ? ` · insurance covers $${weatherInsurancePayout.toLocaleString()}` : ''}`,
            severity: 'danger',
          });
          if (weatherInsurancePayout > 0) {
            summary.push({
              id: 'insurance_weather',
              icon: '🛡️',
              title: `+$${weatherInsurancePayout.toLocaleString()} · insurance payout`,
              detail: `${destroyedCount} plot${destroyedCount > 1 ? 's' : ''} covered`,
              severity: 'good',
            });
          }
        }

        // Fire event (independent random disaster)
        let fireDestroyedCount = 0;
        let fireInsurancePayout = 0;
        const firePlan = INSURANCE_PLANS.find(pl => pl.type === 'incendio')!;
        const fireInsured = hasActiveInsurance(state.insurances, 'incendio');
        parcels = parcels.map(p => {
          if (p.owned && p.plantedCrop && !p.greenhouse && Math.random() < 0.003) {
            fireDestroyedCount++;
            if (fireInsured) {
              const cropVal = estimateCropValue(p, prices);
              const payout = Math.round(cropVal * firePlan.coveragePercent);
              fireInsurancePayout += payout;
              newClaims.push({
                id: `claim_fire_${newDay}_${p.id}`,
                day: newDay,
                type: 'incendio',
                payout,
                description: `${p.hectares}ha plot destroyed by fire`,
              });
            }
            return { ...p, plantedCrop: null };
          }
          return p;
        });
        if (fireDestroyedCount > 0) {
          summary.push({
            id: 'fire',
            icon: '🔥',
            title: `Fire! ${fireDestroyedCount} plot${fireDestroyedCount > 1 ? 's' : ''} destroyed`,
            detail: fireInsurancePayout > 0 ? `Insurance covers $${fireInsurancePayout.toLocaleString()}` : 'No fire insurance',
            severity: 'danger',
          });
          if (fireInsurancePayout > 0) {
            summary.push({
              id: 'insurance_fire',
              icon: '🛡️',
              title: `+$${fireInsurancePayout.toLocaleString()} · fire insurance payout`,
              severity: 'good',
            });
          }
        }

        const totalInsurancePayout = weatherInsurancePayout + fireInsurancePayout;

        // -- Pest & Disease tick --------------------------------------------------
        parcels = parcels.map(p => {
          if (!p.owned || !p.plantedCrop) return p;

          const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
          if (!cropType) return p;

          let pestState = p.pestState;

          // 1. Chance of new outbreak on clean parcel
          if (!pestState) {
            const chance = baseOutbreakChance(
              cropType,
              season,
              resolvedWeather?.event ?? 'sunny',
              p.cropHistory ?? [],
              state.beneficialInsectsActive,
            );
            if (Math.random() < chance) {
              const pestType = pickPestType(cropType, season);
              pestState = { type: pestType, severity: 0.5 };
            }
          }

          // 2. Grow existing infestation
          if (pestState) {
            const config = PEST_CONFIG[pestState.type];
            const newSeverity = tickPestSeverity(pestState, config, state.beneficialInsectsActive);
            pestState = { ...pestState, severity: newSeverity };

            // Detect if severity = 7 (visible damage) and no consultant already flagged it
            if (newSeverity >= 7 && !pestState.detectedDay) {
              pestState = { ...pestState, detectedDay: newDay };
              summary.push({
                id: `pest_visible_${p.id}_${newDay}`,
                icon: '??',
                title: `Severe ${config.label} on ${p.name}`,
                detail: `Visible crop damage. Apply ${config.treatment} immediately.`,
                severity: 'warning',
              });
            }
          }

          return { ...p, pestState };
        });

        // 3. Spread to adjacent parcels
        const infested = parcels.filter(p => p.pestState && p.pestState.severity >= 3);
        for (const source of infested) {
          const config = PEST_CONFIG[source.pestState!.type];
          if (!shouldSpread(source.pestState!.severity, config.spreadRate, state.beneficialInsectsActive)) continue;

          const sourceIdx = parcels.findIndex(p => p.id === source.id);
          const candidates = parcels.filter((p, idx) =>
            Math.abs(idx - sourceIdx) <= 2 && !p.pestState && p.plantedCrop && p.owned
          );
          if (candidates.length === 0) continue;
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          parcels = parcels.map(p =>
            p.id === target.id ? { ...p, pestState: { type: source.pestState!.type, severity: 0.3 } } : p
          );
        }

        // 4. Crop consultant early detection
        for (const parcelId of (state.cropConsultantParcelIds ?? [])) {
          const p = parcels.find(lp => lp.id === parcelId);
          if (!p?.pestState || p.pestState.detectedDay) continue;
          if (p.pestState.severity >= 1.5) {
            parcels = parcels.map(lp =>
              lp.id === parcelId
                ? { ...lp, pestState: { ...lp.pestState!, detectedDay: newDay } }
                : lp
            );
            const config = PEST_CONFIG[p.pestState.type];
            summary.push({
              id: `pest_scout_${parcelId}_${newDay}`,
              icon: '??',
              title: `Early ${config.label} detected on ${p.name}`,
              detail: `Consultant spotted early signs. Treat now before it spreads.`,
              severity: 'info',
            });
          }
        }

        // Field events
        let fieldEvents = state.fieldEvents.filter(e => !e.resolved || newDay - e.startDay < 30);
        const newFieldEvents: FieldEvent[] = [];
        const plagaPlan = INSURANCE_PLANS.find(pl => pl.type === 'plaga')!;
        const plagaInsured = hasActiveInsurance(state.insurances, 'plaga');
        let plagaPayout = 0;
        for (const p of parcels) {
          if (
            p.plantedCrop &&
            !fieldEvents.some(e => e.parcelId === p.id && !e.resolved) &&
            Math.random() < 0.02
          ) {
            const fe: FieldEvent = {
              id: `event_${newDay}_${p.id}`,
              parcelId: p.id,
              type: Math.random() < 0.5 ? 'disease' : 'pest',
              startDay: newDay,
              resolved: false,
            };
            newFieldEvents.push(fe);
            fieldEvents.push(fe);
            if (plagaInsured) {
              const compensation = Math.round(100 * p.plantedCrop.hectares * plagaPlan.coveragePercent);
              plagaPayout += compensation;
              newClaims.push({
                id: `claim_plaga_${newDay}_${p.id}`,
                day: newDay,
                type: 'plaga',
                payout: compensation,
                description: `${fe.type === 'disease' ? 'Disease' : 'Pest'} on ${p.hectares}ha plot`,
              });
            }
          }
        }
        // Disease spread: unresolved disease events can infect same-crop neighbors (·1 index)
        const spreadEvents: FieldEvent[] = [];
        for (const fe of fieldEvents.filter(e => e.type === 'disease' && !e.resolved)) {
          const infectedParcel = parcels.find(p => p.id === fe.parcelId);
          if (!infectedParcel?.plantedCrop) continue;
          const idx = parseInt(fe.parcelId.replace('parcel_', ''));
          if (isNaN(idx)) continue;
          for (const neighborIdx of [idx - 1, idx + 1]) {
            const neighborId = `parcel_${neighborIdx}`;
            const neighbor = parcels.find(p => p.id === neighborId);
            if (
              neighbor?.owned &&
              neighbor.plantedCrop?.cropId === infectedParcel.plantedCrop.cropId &&
              !fieldEvents.some(e => e.parcelId === neighborId && !e.resolved) &&
              Math.random() < 0.20
            ) {
              const spread: FieldEvent = {
                id: `event_spread_${newDay}_${neighborId}`,
                parcelId: neighborId,
                type: 'disease',
                startDay: newDay,
                resolved: false,
              };
              spreadEvents.push(spread);
              fieldEvents.push(spread);
            }
          }
        }
        if (spreadEvents.length > 0) {
          summary.push({
            id: 'disease_spread',
            icon: '🦠',
            title: `Disease spread to ${spreadEvents.length} neighboring plot${spreadEvents.length > 1 ? 's' : ''}`,
            detail: 'Treat crops quickly to stop further spread',
            severity: 'danger',
          });
        }

        for (const fe of newFieldEvents) {
          summary.push({
            id: fe.id,
            icon: fe.type === 'disease' ? '🦠' : '🐛',
            title: fe.type === 'disease' ? 'Disease detected' : 'Pest detected',
            detail: plagaPayout > 0 ? `Pest insurance covers $${plagaPayout.toLocaleString()}` : 'Go to Fields to treat the crop',
            severity: 'warning',
          });
        }
        if (plagaPayout > 0 && newFieldEvents.length > 0) {
          summary.push({
            id: 'insurance_plaga',
            icon: '🛡️',
            title: `+$${plagaPayout.toLocaleString()} · pest insurance payout`,
            severity: 'good',
          });
        }
        const totalInsurancePayoutAll = totalInsurancePayout + plagaPayout;

        // TODO: apply doubled sick chance for underfed animals using state.grainMissedDays / state.hayMissedDays
        // Veterinary events: 1.5% chance per animal to get sick; untreated for 14d → death
        let animals = state.animals;
        const newSickIds: string[] = [];
        const diedIds: string[] = [];
        // ORDERING NOTE: the livestock disposal fee block (further below) reads
        // diedIds.length BEFORE the apiary colony-collapse block appends to it.
        // This is intentional · bee colony collapse is not a carcass disposal event.
        // If you add new death sources after the disposal fee block, document their
        // fee treatment here.

        // ── Quarantine graduation ─────────────────────────────────────────────
        animals = animals.map((a: OwnedAnimal) => {
          if (!a.quarantineUntilDay) return a;
          if (newDay < a.quarantineUntilDay) return a;
          // Period over · 2% residual disease risk even with pen
          const escaped = Math.random() < 0.02;
          if (escaped) {
            newSickIds.push(a.id);
            return {
              ...a,
              quarantineUntilDay: undefined,
              sick: true,
              sicknessDay: newDay,
            };
          }
          return {
            ...a,
            quarantineUntilDay: undefined,
          };
        });

        // ── Pregnancy scanner: due-date warnings ─────────────────────────────────
        const hasPregScanner = (state.productionBuildings ?? []).some(pb =>
          pb.buildingTypeId.startsWith('bld_calving_pen') &&
          pb.equipmentSlots.includes('eq_pregnancy_scanner')
        );
        if (hasPregScanner) {
          const imminentBirths = animals.filter((a: OwnedAnimal) => {
            if (a.sex !== 'female') return false;
            const animalType = ANIMAL_TYPES.find(t => t.id === a.typeId);
            if (!animalType) return false;
            const gestDays = (animalType as any).gestationDays ?? ((animalType as any).breedingDays ?? 0) * 2;
            if (gestDays === 0) return false;
            const lastBreedDay = a.lastBreedDay;
            if (lastBreedDay === undefined || lastBreedDay === null) return false;
            // Only warn if currently in active gestation window
            if (newDay < lastBreedDay) return false;          // not yet bred (future date)
            if (newDay > lastBreedDay + gestDays) return false; // gestation already over
            const dueDay = lastBreedDay + gestDays;
            return dueDay >= newDay && dueDay <= newDay + 3;
          });
          if (imminentBirths.length > 0) {
            summary.push({
              id: `preg_scanner_warning_${newDay}`,
              icon: '🤰',
              title: `${imminentBirths.length} animal${imminentBirths.length > 1 ? 's' : ''} due to give birth within 3 days`,
              detail: 'Check calving pen capacity in Management',
              severity: 'warning',
            });
          }
        }

        // ── Sick bay auto-isolation ───────────────────────────────────────────
        const hasVetWorker = (state.workers ?? []).some((w: Worker) => w.role === 'veterinarian');
        const sickBayCap = state.sickBayCapacity ?? 0;

        // Always clear isolation on healthy animals (handles case where sick bay is later removed)
        animals = animals.map((a: OwnedAnimal) => {
          if (!a.sick && a.inIsolation) return { ...a, inIsolation: false };
          return a;
        });

        // Fill sick bay when available
        if (sickBayCap > 0 && hasVetWorker) {
          let isolatedCount = animals.filter((a: OwnedAnimal) => a.inIsolation).length;
          animals = animals.map((a: OwnedAnimal) => {
            if (!a.sick) return a;
            if (a.inIsolation) return a;
            if (isolatedCount >= sickBayCap) return a;
            isolatedCount++;
            return { ...a, inIsolation: true };
          });
        }

        // Auto-treat animals in sick bay (vet handles them)
        if (sickBayCap > 0 && hasVetWorker) {
          animals = animals.map((a: OwnedAnimal) => {
            if (a.sick && a.inIsolation) {
              return { ...a, sick: false, sicknessDay: undefined, inIsolation: false };
            }
            return a;
          });
        }

        // Sickness spread · must run BEFORE death filter
        animals = animals.map((a: OwnedAnimal) => {
          if (a.inIsolation) return a; // isolated · cannot contract illness from spread
          if (a.sick) return a;
          const baseSickChance = (a.traits ?? []).includes('hardy') ? 0.006 : 0.015;
          const hardinessDiv = a.genes?.hardiness ?? 1.0;
          const sickChance = baseSickChance * (1 - workerBonuses.sicknessBonusReduction) / hardinessDiv;
          if (Math.random() < sickChance) {
            newSickIds.push(a.id);
            return { ...a, sick: true, sicknessDay: newDay };
          }
          return a;
        });

        // Death filter · runs AFTER sickness spread
        animals = animals.filter((a: OwnedAnimal) => {
          if (a.sick && a.sicknessDay !== undefined && newDay - a.sicknessDay >= 14) {
            diedIds.push(a.id);
            return false;
          }
          return true;
        });

        // ── Brooder house: young poultry mortality ────────────────────────────────
        const BROODER_SPECIES = new Set(['gallina', 'pato', 'codorniz']);
        const hasBrooder = (state.buildings ?? []).some(bid =>
          bid === 'bld_brooder_house_s' || bid === 'bld_brooder_house_m' || bid === 'bld_brooder_house_l'
        );
        animals = animals.filter((a: OwnedAnimal) => {
          if (!BROODER_SPECIES.has(a.typeId)) return true;
          const agedays = newDay - a.bornDay;
          if (agedays > 14) return true; // no longer a chick
          const mortalityRate = hasBrooder ? 0.005 : 0.03; // 0.5% vs 3% per day
          if (Math.random() < mortalityRate) {
            diedIds.push(a.id);
            return false;
          }
          return true;
        });

        // ── Hatchery: incubation queue hatching ───────────────────────────────
        let newIncubationQueue = [...(state.incubationQueue ?? [])];
        {
          const HATCH_RATE = 0.80;
          const readyBatches = newIncubationQueue.filter(
            (b: IncubationBatch) => b.readyDay <= newDay
          );
          newIncubationQueue = newIncubationQueue.filter(
            (b: IncubationBatch) => b.readyDay > newDay
          );
          for (const batch of readyBatches) {
            const chickCount = Math.round(batch.eggCount * HATCH_RATE);
            if (chickCount <= 0) continue;
            const newChicks: OwnedAnimal[] = [];
            for (let i = 0; i < chickCount; i++) {
              newChicks.push({
                id: `animal_hatch_${newDay}_${batch.batchId}_${i}`,
                typeId: batch.typeId,
                sex: Math.random() < 0.5 ? 'male' : 'female',
                bornDay: newDay,
                lastProductionDay: newDay,
                lastBreedDay: newDay,
                sick: false,
                genes: randomGenes(),
              });
            }
            animals = [...animals, ...newChicks];
            summary.push({
              id: `hatch_${newDay}_${batch.batchId}`,
              icon: '🐣',
              title: `${chickCount} ${batch.typeId === 'gallina' ? 'chick' : batch.typeId === 'pato' ? 'duckling' : 'quail chick'}${chickCount > 1 ? 's' : ''} hatched`,
              detail: `from ${batch.eggCount} eggs placed ${newDay - batch.startDay} days ago`,
              severity: 'info' as const,
            });
          }
        }

        // ── Weaner accommodation: post-weaning pig mortality ─────────────────────
        const hasWeanerAccom = (state.buildings ?? []).some(bid =>
          bid === 'bld_weaner_accommodation_s' || bid === 'bld_weaner_accommodation_m' || bid === 'bld_weaner_accommodation_l'
        );
        animals = animals.filter((a: OwnedAnimal) => {
          if (a.typeId !== 'cerdo') return true;
          const agedays = newDay - a.bornDay;
          if (agedays < 28 || agedays > 56) return true; // only weaners (28·56 days)
          const mortalityRate = hasWeanerAccom ? 0.003 : 0.02; // 0.3% vs 2% per day
          if (Math.random() < mortalityRate) {
            diedIds.push(a.id);
            return false;
          }
          return true;
        });

        if (newSickIds.length > 0) {
          summary.push({ id: 'animals_sick', icon: '🤒', title: `${newSickIds.length} animal${newSickIds.length > 1 ? 's' : ''} fell sick`, detail: 'Treat within 14 days or they will die', severity: 'warning' });
        }
        if (diedIds.length > 0) {
          summary.push({ id: 'animals_died', icon: '💀', title: `${diedIds.length} animal${diedIds.length > 1 ? 's' : ''} died from untreated sickness`, severity: 'danger' });
        }

        // ── Animal disposal fee ───────────────────────────────────────────────
        const hasRenderer = (state.buildings ?? []).includes('bld_rendering_incinerator');
        let disposalFee = 0;
        if (diedIds.length > 0 && !hasRenderer) {
          disposalFee = diedIds.length * 80;
          summary.push({
            id: `disposal_fee_${newDay}`,
            icon: '💀',
            title: `${diedIds.length} animal${diedIds.length > 1 ? 's' : ''} died · disposal fee`,
            detail: `$${disposalFee} callout fee. Build a Rendering Unit to avoid this.`,
            severity: 'warning',
          });
        }

        // ── Sheep dip: autumn lameness event ──────────────────────────────────────
        {
          const prevSeason = seasonKey(newDay - 1);
          const currentSeason = seasonKey(newDay);
          if (currentSeason === 'autumn' && prevSeason !== 'autumn') {
            // Season just changed to autumn · run annual sheep dip check
            const hasSheepDip = (state.buildings ?? []).includes('bld_sheep_dip');
            const sheep = animals.filter((a: OwnedAnimal) => a.typeId === 'oveja' && !a.sick);
            sheep.forEach((s: OwnedAnimal) => {
              const lamenessChance = hasSheepDip ? 0.01 : 0.1; // 1% vs 10% per sheep
              if (Math.random() < lamenessChance) {
                animals = animals.map((a: OwnedAnimal) =>
                  a.id === s.id ? { ...a, sick: true, sicknessDay: newDay } : a
                );
                newSickIds.push(s.id);
              }
            });
          }
        }

        // ── Apiary shelter: winter colony collapse ────────────────────────────────
        {
          const prevSeasonApiary = seasonKey(newDay - 1);
          const currSeasonApiary = seasonKey(newDay);
          if (currSeasonApiary === 'winter' && prevSeasonApiary !== 'winter') {
            const hasApiaryShelter = (state.buildings ?? []).includes('bld_apiary_shelter');
            const bees = animals.filter((a: OwnedAnimal) => a.typeId === 'abeja' && !a.sick);
            let collapseCount = 0;
            // Note: collapsed colonies push to diedIds but do NOT incur the livestock
            // disposal fee (computed earlier in this function) · colony collapse is
            // environmental loss, not a carcass disposal event.
            bees.forEach((bee: OwnedAnimal) => {
              const collapseChance = hasApiaryShelter ? 0.04 : 0.20; // 4% vs 20% per colony
              if (Math.random() < collapseChance) {
                diedIds.push(bee.id);
                animals = animals.filter((a: OwnedAnimal) => a.id !== bee.id);
                collapseCount++;
              }
            });
            if (collapseCount > 0) {
              summary.push({
                id: `apiary_collapse_${newDay}`,
                icon: '🐝',
                title: `${collapseCount} bee ${collapseCount > 1 ? 'colonies' : 'colony'} collapsed`,
                detail: hasApiaryShelter
                  ? 'Shelter reduced losses. Consider adding a queen rearing unit.'
                  : 'Build an Apiary Shelter to protect hives from winter.',
                severity: 'warning' as const,
              });
            }
          }
        }

        // Auction: AI bidding + resolve
        const parcelAdditions: LandParcel[] = [];
        let moneyDelta = 0;

        // ── Random events ────────────────────────────────────────────────────

        let activeEvents: GameEvent[] = (state.activeEvents ?? [])
          .filter(e => e.expiresDay > newDay);

        let machineRepairs: MachineRepair[] = [...(state.machineRepairs ?? [])];

        // Complete any repairs that are ready
        machineRepairs = machineRepairs.filter(r => {
          if (r.readyDay !== null && newDay >= r.readyDay) {
            summary.push({
              id: `repair_done_${r.machineId}`,
              icon: '🔧',
              title: 'Machine repair complete',
              detail: 'Machine is back to full capacity',
              severity: 'good',
            });
            return false;
          }
          return true;
        });

        // Roll for a new random event (8% chance)
        const activeEventTypes = activeEvents.map((e: GameEvent) => e.type);
        const newEventTemplate = rollEvent(activeEventTypes);

        if (newEventTemplate) {
          const ownedParcelsWithCrop = state.parcels.filter(p => p.owned && p.plantedCrop);
          const allOwnedParcels = state.parcels.filter(p => p.owned);
          const plantedCropIds = [...new Set(ownedParcelsWithCrop.map(p => p.plantedCrop!.cropId))];

          let affectedIds: string[] = [];

          if (['weather_frost', 'weather_heatwave', 'weather_hailstorm'].includes(newEventTemplate.type)) {
            const shuffled = [...allOwnedParcels].sort(() => Math.random() - 0.5);
            affectedIds = shuffled.slice(0, Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1))).map(p => p.id);
          } else if (newEventTemplate.type === 'pest_outbreak') {
            if (plantedCropIds.length > 0) {
              affectedIds = [plantedCropIds[Math.floor(Math.random() * plantedCropIds.length)]];
            }
          } else if (newEventTemplate.type === 'market_surge') {
            affectedIds = [CROP_TYPES[Math.floor(Math.random() * CROP_TYPES.length)].id];
          } else if (newEventTemplate.type === 'equipment_failure') {
            const healthyMachines = state.machines.filter(
              m => !machineRepairs.some(r => r.machineId === m.id)
            );
            if (healthyMachines.length > 0) {
              const broken = healthyMachines[Math.floor(Math.random() * healthyMachines.length)];
              affectedIds = [broken.id];
              const cost = calcRepairCost(broken);
              const maquinariaPlan = INSURANCE_PLANS.find(pl => pl.type === 'maquinaria')!;
              const insurancePaid = hasActiveInsurance(state.insurances, 'maquinaria')
                ? Math.round(cost * maquinariaPlan.coveragePercent)
                : 0;
              if (insurancePaid > 0) {
                newClaims.push({
                  id: `claim_maquinaria_${newDay}_${broken.id}`,
                  day: newDay,
                  type: 'maquinaria' as InsuranceType,
                  payout: insurancePaid,
                  description: `${MACHINE_TYPES.find(mt => mt.id === broken.typeId)?.name ?? broken.typeId} breakdown`,
                });
              }
              machineRepairs.push({
                id: `repair_${newDay}_${broken.id}`,
                machineId: broken.id,
                startDay: null,
                readyDay: null,
                cost,
                insurancePaid,
              });
              summary.push({
                id: `event_equip_${newDay}`,
                icon: newEventTemplate.icon,
                title: newEventTemplate.title,
                detail: insurancePaid > 0
                  ? `Repair cost: $${cost.toLocaleString()} · Insurance covers $${insurancePaid.toLocaleString()}`
                  : `Repair cost: $${cost.toLocaleString()} · Go to Machinery tab to start repair`,
                severity: 'danger',
              });
            }
          } else if (newEventTemplate.type === 'animal_illness') {
            const healthy = state.animals.filter((a: OwnedAnimal) => !a.sick);
            if (healthy.length > 0) {
              const target = healthy[Math.floor(Math.random() * healthy.length)];
              affectedIds = [target.id];
            }
          } else if (newEventTemplate.type === 'windfall_subsidy') {
            const amount = newEventTemplate.modifier ?? 2500;
            moneyDelta += amount;
            summary.push({
              id: `event_windfall_${newDay}`,
              icon: newEventTemplate.icon,
              title: newEventTemplate.title,
              detail: `+$${amount.toLocaleString()} cash bonus`,
              severity: 'good',
            });
          }

          // Apply immediate price effects for market events
          if (newEventTemplate.type === 'market_surge' && affectedIds.length > 0) {
            prices = prices.map(p =>
              p.cropId === affectedIds[0]
                ? { ...p, price: Math.max(1, p.price * (newEventTemplate.modifier ?? 1.6)) }
                : p
            );
          }
          if (newEventTemplate.type === 'pest_outbreak' && affectedIds.length > 0) {
            prices = prices.map(p =>
              p.cropId === affectedIds[0]
                ? { ...p, price: Math.max(1, p.price * 0.5) }
                : p
            );
            // Plaga insurance check for pest_outbreak event
            if (hasActiveInsurance(state.insurances, 'plaga')) {
              const plagaPlanEvent = INSURANCE_PLANS.find(pl => pl.type === 'plaga')!;
              const affectedHa = ownedParcelsWithCrop
                .filter(p => p.plantedCrop?.cropId === affectedIds[0])
                .reduce((s, p) => s + p.hectares, 0);
              if (affectedHa > 0) {
                const compensation = Math.round(150 * affectedHa * plagaPlanEvent.coveragePercent);
                newClaims.push({
                  id: `claim_plaga_event_${newDay}`,
                  day: newDay,
                  type: 'plaga' as InsuranceType,
                  payout: compensation,
                  description: `Pest outbreak · ${affectedHa}ha of ${affectedIds[0]} affected`,
                });
                moneyDelta += compensation;
              }
            }
          }
          // Clima insurance check for weather extreme events
          if (['weather_frost', 'weather_hailstorm', 'weather_heatwave'].includes(newEventTemplate.type) && affectedIds.length > 0) {
            if (hasActiveInsurance(state.insurances, 'clima')) {
              const climaPlanEvent = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
              for (const parcelId of affectedIds) {
                const p = state.parcels.find(pr => pr.id === parcelId);
                if (p?.plantedCrop) {
                  const cropVal = estimateCropValue(p, prices);
                  const payout = Math.round(cropVal * climaPlanEvent.coveragePercent);
                  if (payout > 0) {
                    newClaims.push({
                      id: `claim_clima_event_${newDay}_${parcelId}`,
                      day: newDay,
                      type: 'clima' as InsuranceType,
                      payout,
                      description: `${newEventTemplate.title} on ${p.name}`,
                    });
                    moneyDelta += payout;
                  }
                }
              }
            }
          }

          // Push timed events to activeEvents (skip equipment_failure · handled above)
          // windfall_subsidy uses durationDays:1 to block a second subsidy the next day
          if (newEventTemplate.type !== 'equipment_failure' && newEventTemplate.durationDays > 0) {
            const newEvent: GameEvent = {
              id: `event_${newEventTemplate.id}_${newDay}`,
              type: newEventTemplate.type,
              title: newEventTemplate.title,
              description: newEventTemplate.description,
              icon: newEventTemplate.icon,
              expiresDay: newDay + newEventTemplate.durationDays,
              affectedIds: affectedIds.length > 0 ? affectedIds : undefined,
              modifier: newEventTemplate.modifier,
            };
            activeEvents = [...activeEvents, newEvent];

            if (newEventTemplate?.priceShock) {
              activeShocks = [...activeShocks, {
                ...newEventTemplate.priceShock,
                remainingDays: newEventTemplate.priceShock.durationDays,
              }];
            }

            if (newEventTemplate.type !== 'windfall_subsidy') {
              summary.push({
                id: `event_summary_${newDay}_${newEventTemplate.id}`,
                icon: newEventTemplate.icon,
                title: newEventTemplate.title,
                detail: newEventTemplate.description,
                severity: ['weather_frost','weather_heatwave','weather_hailstorm','pest_outbreak','animal_illness'].includes(newEventTemplate.type)
                  ? 'danger'
                  : 'good',
              });
            }
          }
        }

        // ── Auction House ────────────────────────────────────────────────────
        const { geneScore } = require('../engine/animals');
        const { ANIMAL_TYPES: AT_AUCTION } = require('../data/animalTypes');

        let auctionMoneyDelta = 0;
        const auctionParcelAdditions: LandParcel[] = [];
        const auctionAnimalAdditions: OwnedAnimal[] = [];
        const auctionInventoryDelta: Record<string, number> = {};
        const auctionMachineAdditions: OwnedMachine[] = [];

        // Animal event: resolve on nextAnimalAuctionDay
        const isAnimalEventDay = newDay >= state.nextAnimalAuctionDay;
        let nextAnimalAuctionDay = state.nextAnimalAuctionDay;

        const updatedListings: AuctionListing[] = (state.listings ?? []).map((listing: AuctionListing) => {
          if (listing.resolved) return listing;

          // ── NPC bidding on crop / machinery listings (daily) ──
          if (listing.category === 'crop' || listing.category === 'machinery') {
            const candidateNpcs = [...(npcFarms ?? [])].sort(() => Math.random() - 0.5).slice(0, 3);
            let updated = { ...listing };
            for (const npc of candidateNpcs) {
              if (Math.random() > 0.15) continue;
              let npcValuation = 0;
              if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
                const cropPrice = prices.find((p: any) => p.cropId === listing.cropId)?.price ?? 0;
                npcValuation = listing.cropQuantity * cropPrice * 0.80;
              } else if (listing.category === 'machinery' && listing.machineTypeId) {
                const mt = MACHINE_TYPES.find(t => t.id === listing.machineTypeId);
                const suggested = mt ? mt.cost * ((listing.conditionScore ?? 70) / 100) * 0.70 : 0;
                npcValuation = suggested * (0.85 + Math.random() * 0.25);
              }
              if (updated.currentBid >= npcValuation) continue;
              const npcBid = Math.min(Math.ceil(updated.currentBid * 1.05), Math.ceil(npcValuation));
              updated = {
                ...updated,
                currentBid: npcBid,
                bids: [...updated.bids, { day: newDay, amount: npcBid, isPlayer: false }],
              };
            }
            listing = updated;
          }

          // ── NPC bidding on land listings (existing logic) ──
          if (listing.category === 'land' && !listing.resolved) {
            const daysLeft = listing.expiresDay - newDay;
            const aiBidChance = daysLeft <= 3 ? 0.5 : daysLeft <= 7 ? 0.25 : 0.1;
            if (Math.random() < aiBidChance) {
              const parcelValue = (listing.parcel?.pricePerHa ?? 0) * (listing.parcel?.hectares ?? 0);
              const npcBids = (npcFarms ?? [])
                .map((farm: any) => npcAuctionBid(farm, parcelValue))
                .filter((bid: number) => bid > listing.currentBid);
              const aiBid = npcBids.length > 0
                ? Math.max(...npcBids)
                : Math.ceil(listing.currentBid * (1.05 + Math.random() * 0.12));
              listing = {
                ...listing,
                currentBid: aiBid,
                bids: [...listing.bids, { day: newDay, amount: aiBid, isPlayer: false }],
              };
            }
          }

          // ── NPC bidding on animal event listings (batch on event day) ──
          if (listing.category === 'animal' && isAnimalEventDay && !listing.resolved) {
            // Simulate 2·4 NPC bids up to a valuation based on gene score
            const score = listing.animalGenes ? geneScore(listing.animalGenes) : 1.0;
            const animalTypeDef = AT_AUCTION.find((a: any) => a.typeId === listing.animalTypeId || a.id === listing.animalTypeId);
            const baseValue = animalTypeDef ? animalTypeDef.buyCost * score : 500;
            const npcBidCount = 2 + Math.floor(Math.random() * 3);
            let currentBid = listing.currentBid;
            const newBids = [...listing.bids];
            for (let i = 0; i < npcBidCount; i++) {
              const npcVal = baseValue * (0.8 + Math.random() * 0.4);
              if (currentBid >= npcVal) continue;
              const npcBid = Math.min(Math.ceil(currentBid * 1.05), Math.ceil(npcVal));
              currentBid = npcBid;
              newBids.push({ day: newDay, amount: npcBid, isPlayer: false });
            }
            listing = { ...listing, currentBid, bids: newBids };
          }

          // ── Resolution: land, crop, machinery (expires), animal (event day) ──
          const shouldResolve =
            (listing.category !== 'animal' && newDay >= listing.expiresDay) ||
            (listing.category === 'animal' && isAnimalEventDay);

          if (!shouldResolve) return listing;

          const reserveMet = listing.reservePrice === 0 || listing.currentBid >= listing.reservePrice;
          const playerWon = reserveMet && listing.playerBid !== null && listing.playerBid >= listing.currentBid;
          const playerSold = reserveMet && listing.sellerId === 'player' && listing.currentBid > listing.startingBid;

          if (playerWon) {
            auctionMoneyDelta -= listing.playerBid!;
            if (listing.category === 'land' && listing.parcel) {
              auctionParcelAdditions.push({ ...listing.parcel, owned: true });
            } else if (listing.category === 'animal' && listing.animalTypeId && listing.animalGenes) {
              const hasQuarantinePenAuction = (state.buildings ?? []).includes('bld_quarantine_pen');
              const arrivedSickAuction = !hasQuarantinePenAuction && Math.random() < 0.15;
              const newAnimal: OwnedAnimal = {
                id: `animal_auction_${listing.id}`,
                typeId: listing.animalTypeId,
                sex: Math.random() < 0.5 ? 'female' : 'male',
                bornDay: newDay - 30,
                genes: listing.animalGenes,
                breedId: listing.animalBreedId,
                sick: arrivedSickAuction,
                sicknessDay: arrivedSickAuction ? newDay : undefined,
                quarantineUntilDay: hasQuarantinePenAuction ? newDay + 14 : undefined,
                lastProductionDay: newDay,
                lastBreedDay: newDay,
              };
              auctionAnimalAdditions.push(newAnimal);
            } else if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
              auctionInventoryDelta[listing.cropId] = (auctionInventoryDelta[listing.cropId] ?? 0) + listing.cropQuantity;
            } else if (listing.category === 'machinery' && listing.machineTypeId) {
              auctionMachineAdditions.push({
                id: `machine_auction_${listing.id}`,
                typeId: listing.machineTypeId,
                purchasedDay: newDay,
              });
            }
          }

          if (playerSold) {
            auctionMoneyDelta += listing.currentBid;
            // Item already removed from inventory/animals/machines when listed
          }

          if (!playerSold && listing.sellerId === 'player') {
            // Reserve not met · return item to player
            if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
              auctionInventoryDelta[listing.cropId] = (auctionInventoryDelta[listing.cropId] ?? 0) + listing.cropQuantity;
            } else if (listing.category === 'machinery' && listing.machineId && listing.machineTypeId) {
              auctionMachineAdditions.push({
                id: listing.machineId,
                typeId: listing.machineTypeId,
                purchasedDay: listing.machinePurchasedDay ?? newDay,
              });
            } else if (listing.category === 'animal' && listing.animalId && listing.animalTypeId && listing.animalGenes) {
              const returnedAnimal: OwnedAnimal = {
                id: listing.animalId,
                typeId: listing.animalTypeId,
                sex: listing.animalSex ?? 'female',
                bornDay: listing.animalBornDay ?? newDay - 30,
                genes: listing.animalGenes,
                sick: false,
                lastProductionDay: newDay,
                lastBreedDay: newDay,
              };
              auctionAnimalAdditions.push(returnedAnimal);
            }
          }

          // Push day summary event
          if (playerWon) {
            const labelMap: Record<AuctionCategory, string> = { land: 'Land', animal: 'Animal', crop: 'Crop lot', machinery: 'Machine' };
            summary.push({
              id: `auction_won_${listing.id}`,
              icon: '🏆',
              title: `Auction won · ${labelMap[listing.category]}`,
              detail: `Paid $${listing.playerBid?.toLocaleString()}`,
              severity: 'good',
            });
          } else if (listing.playerBid !== null && !playerWon) {
            summary.push({
              id: `auction_lost_${listing.id}`,
              icon: '😔',
              title: 'Auction lost',
              detail: `Your bid $${listing.playerBid?.toLocaleString()} · Final $${listing.currentBid.toLocaleString()}`,
              severity: 'warning',
            });
          } else if (playerSold) {
            summary.push({
              id: `auction_sold_${listing.id}`,
              icon: '💰',
              title: 'Your listing sold',
              detail: `+$${listing.currentBid.toLocaleString()}`,
              severity: 'good',
            });
          } else if (listing.sellerId === 'player' && !reserveMet) {
            summary.push({
              id: `auction_unsold_${listing.id}`,
              icon: '📋',
              title: 'Reserve not met · item returned',
              detail: `Highest bid: $${listing.currentBid.toLocaleString()}`,
              severity: 'warning',
            });
          }

          return { ...listing, resolved: true, playerWon };
        });

        // Generate new land listing if fewer than 2 active land listings
        const activeLandListings = updatedListings.filter(l => !l.resolved && l.category === 'land');
        if (activeLandListings.length < 2 && Math.random() < 0.3) {
          const fertility = Math.floor(Math.random() * 10) + 16;
          const hectares = ([2, 5, 10] as const)[Math.floor(Math.random() * 3)];
          const pricePerHa = Math.round((20000 + (fertility / 25) * 50000) / 1000) * 1000;
          const startingBid = Math.round(pricePerHa * hectares * 0.7);
          const auctionNames = ['Riverside Lot','Hilltop Parcel','Valley Premium','Lakeside Acre','Woodland Plot','Cliffside Field','Meadow Estate','Ridge Premium','Orchard Lot','Vineyard Parcel'];
          const newParcel: LandParcel = {
            id: `auction_p${newDay}`,
            name: auctionNames[newDay % auctionNames.length],
            fertility, hectares, pricePerHa,
            soil: { ...SOIL_DEFAULTS },
            cropHistory: [],
            owned: false, hasWeeds: false, plantedCrop: null,
            greenhouse: false, irrigated: false, tilled: false,
          };
          updatedListings.push({
            id: `listing_land_${newDay}`,
            category: 'land',
            sellerId: 'npc',
            parcel: newParcel,
            startingBid,
            reservePrice: 0,
            currentBid: startingBid,
            bids: [],
            playerBid: null,
            createdDay: newDay,
            expiresDay: newDay + 10 + Math.floor(Math.random() * 10),
            resolved: false,
            playerWon: null,
          });
          summary.push({
            id: `auction_new_${newDay}`,
            icon: '🏷️',
            title: 'New land auction available',
            detail: `${hectares} ha · fertility ${fertility}/25 · starting $${startingBid.toLocaleString()}`,
            severity: 'info',
          });
        }

        // Generate NPC animal listings for next event if today is event day
        if (isAnimalEventDay) {
          nextAnimalAuctionDay = newDay + 7;
          const animalCount = 3 + Math.floor(Math.random() * 3);
          const eligibleTypes = AT_AUCTION.filter((a: any) => a.productionType !== null);
          for (let i = 0; i < animalCount; i++) {
            const animalType = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
            const { BREED_TYPES } = require('../data/breedTypes');
            const speciesBreeds = (BREED_TYPES as any[]).filter((b: any) => b.animalTypeId === animalType.id);

            const roll = Math.random();
            const rarityFilter = roll > 0.95 ? 'rare' : roll > 0.70 ? 'uncommon' : 'common';
            const rarityBreeds = speciesBreeds.filter((b: any) => b.rarity === rarityFilter);
            const breedPool = rarityBreeds.length > 0 ? rarityBreeds : speciesBreeds;
            const selectedBreed = breedPool.length > 0
              ? breedPool[Math.floor(Math.random() * breedPool.length)]
              : null;

            let genes: AnimalGenes;
            if (selectedBreed) {
              const { randomGenesForBreed } = require('../engine/animals');
              genes = randomGenesForBreed(selectedBreed);
            } else {
              genes = {
                production: 0.9 + Math.random() * 0.5,
                hardiness:  0.9 + Math.random() * 0.5,
                growth:     0.9 + Math.random() * 0.5,
                value:      0.9 + Math.random() * 0.5,
              };
            }
            const score = geneScore(genes);
            const breedBasePrice = selectedBreed ? selectedBreed.auctionBasePrice : animalType.buyCost;
            const purebredMult = selectedBreed
              ? (selectedBreed.rarity === 'rare' ? 2.75 : selectedBreed.rarity === 'uncommon' ? 1.5 : 1.2)
              : 1.0;
            const startingBid = Math.round(breedBasePrice * score * 0.6 * purebredMult);

            updatedListings.push({
              id: `listing_animal_${newDay}_${i}`,
              category: 'animal',
              sellerId: 'npc',
              animalTypeId: animalType.id,
              animalGenes: genes,
              animalBreedId: selectedBreed?.id,
              startingBid,
              reservePrice: 0,
              currentBid: startingBid,
              bids: [],
              playerBid: null,
              createdDay: newDay,
              expiresDay: nextAnimalAuctionDay,
              resolved: false,
              playerWon: null,
            });
          }
          summary.push({
            id: `animal_auction_event_${newDay}`,
            icon: '🐄',
            title: 'Animal Auction Event',
            detail: `${animalCount} new animals listed · next event Day ${nextAnimalAuctionDay}`,
            severity: 'info',
          });
        }

        // Trim resolved listings · keep 20 most recent resolved
        const resolvedListings = updatedListings.filter(l => l.resolved).slice(-20);
        const activeListings = updatedListings.filter(l => !l.resolved);
        const trimmedListings = [...activeListings, ...resolvedListings];

        // Apply auction money / inventory / asset deltas (merged into advanceDay final set)
        moneyDelta += auctionMoneyDelta;
        let finalParcels = [...parcels, ...parcelAdditions, ...auctionParcelAdditions];
        // Time deposit maturity payouts
        const maturedDeposits = state.timeDeposits.filter(
          d => newDay >= d.startDay + d.termDays
        );
        const { timeDepositPayout } = require('../engine/banking');
        const depositPayoutTotal = maturedDeposits.reduce(
          (s: number, d: any) => s + timeDepositPayout(d), 0
        );
        const timeDeposits = state.timeDeposits.filter(
          d => newDay < d.startDay + d.termDays
        );
        for (const d of maturedDeposits) {
          const payout = Math.round(timeDepositPayout(d));
          summary.push({
            id: `deposit_matured_${d.id}`,
            icon: '🏦',
            title: `Time deposit matured · +$${payout.toLocaleString()}`,
            detail: `$${d.amount.toLocaleString()} at ${(d.rate * 100).toFixed(0)}% for ${d.termDays}d`,
            severity: 'good',
          });
        }

        // Futures settlement: auto-sell at locked price on delivery day
        let futuresIncome = 0;
        let futuresPenalty = 0;
        const futuresInventoryDelta: Record<string, number> = {};
        const futures = (state.futures ?? []).map((f: FuturesPosition) => {
          if (f.settled || newDay < f.deliveryDay) return f;
          const inStock = (state.inventory[f.cropId] ?? 0) + (futuresInventoryDelta[f.cropId] ?? 0);
          const toDeliver = Math.min(inStock, f.quantity);
          const shortfall = f.quantity - toDeliver;
          if (toDeliver > 0) {
            futuresIncome += Math.round(toDeliver * f.lockPrice * 0.85);
            futuresInventoryDelta[f.cropId] = (futuresInventoryDelta[f.cropId] ?? 0) - toDeliver;
          }
          if (shortfall > 0) {
            futuresPenalty += Math.round(shortfall * f.lockPrice * 0.20);
          }
          const crop = CROP_TYPES.find(c => c.id === f.cropId);
          summary.push({
            id: `futures_settled_${f.id}`,
            icon: toDeliver > 0 ? '📊' : '⚠️',
            title: `Futures contract settled · ${crop?.name ?? f.cropId}`,
            detail: toDeliver > 0
              ? `Sold ${toDeliver.toLocaleString()} ${crop?.unit ?? ''} @ $${f.lockPrice.toFixed(2)} · +$${futuresIncome.toLocaleString()}`
              : `Short ${shortfall.toLocaleString()} ${crop?.unit ?? ''} · -$${futuresPenalty.toLocaleString()} penalty`,
            severity: toDeliver >= f.quantity ? 'good' : shortfall > 0 ? 'warning' : 'info',
          });
          return { ...f, settled: true };
        });
        const finalInventory = Object.fromEntries(
          Object.keys({ ...state.inventory, ...futuresInventoryDelta }).map(k => [
            k, Math.max(0, (state.inventory[k] ?? 0) + (futuresInventoryDelta[k] ?? 0))
          ])
        );

        // ── Market Orders: execute if price target met ──────────────────
        let marketOrderIncome = 0;
        const marketOrderInventoryDelta: Record<string, number> = {};
        const updatedMarketOrders = (state.marketOrders ?? []).map((o: MarketOrder) => {
          if (o.status !== 'active') return o;
          if (newDay > o.expiresDay) {
            // Return inventory for expired orders
            marketOrderInventoryDelta[o.cropId] = (marketOrderInventoryDelta[o.cropId] ?? 0) + o.quantity;
            summary.push({
              id: `order_expired_${o.id}`,
              icon: '📋',
              title: `Market order expired · ${CROP_TYPES.find(c => c.id === o.cropId)?.name ?? o.cropId}`,
              detail: `${o.quantity.toLocaleString()} units returned to inventory`,
              severity: 'warning',
            });
            return { ...o, status: 'expired' as const };
          }
          const currentPrice = prices.find(p => p.cropId === o.cropId)?.price ?? 0;
          if (currentPrice >= o.targetPrice) {
            const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
            const coopBonus = 1.0;
            const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
            const revenue = Math.round(sellRevenue(o.quantity, currentPrice) * secaderoBonus * coopBonus * prestigeBonus);
            marketOrderIncome += revenue;
            const crop = CROP_TYPES.find(c => c.id === o.cropId);
            summary.push({
              id: `order_executed_${o.id}`,
              icon: '✅',
              title: `Market order filled · ${crop?.name ?? o.cropId} · +$${revenue.toLocaleString()}`,
              detail: `Sold ${o.quantity.toLocaleString()} ${crop?.unit ?? ''} @ $${currentPrice.toFixed(2)}`,
              severity: 'good',
            });
            return { ...o, status: 'executed' as const, executedDay: newDay, executedRevenue: revenue };
          }
          return o;
        });
        // Merge returned inventory from expired orders back into finalInventory
        const orderAdjustedInventory = Object.fromEntries(
          Object.keys({ ...finalInventory, ...marketOrderInventoryDelta }).map(k => [
            k, Math.max(0, (finalInventory[k] ?? 0) + (marketOrderInventoryDelta[k] ?? 0)),
          ])
        );

        // ── Seed Lab: settle completed hybrid jobs ──────────────────────
        const completedJobs = state.hybridJobs.filter(j => newDay >= j.readyDay);
        let nextSeedVault = [...(state.seedVault ?? [])];
        for (const job of completedJobs) {
          const parentA = state.seedVault.find(s => s.id === job.parentAId) ??
            { genes: { yield: 1, drought: 1, growth: 1, quality: 1 } };
          const parentB = state.seedVault.find(s => s.id === job.parentBId) ??
            { genes: { yield: 1, drought: 1, growth: 1, quality: 1 } };

          const clamp = (v: number) => Math.min(1.5, Math.max(0.5, v));
          const mutate = (a: number, b: number) => clamp((a + b) / 2 + (Math.random() - 0.5) * 0.12);

          const offspringGenes: SeedGenes = {
            yield:   mutate(parentA.genes.yield,   parentB.genes.yield),
            drought: mutate(parentA.genes.drought, parentB.genes.drought),
            growth:  mutate(parentA.genes.growth,  parentB.genes.growth),
            quality: mutate(parentA.genes.quality, parentB.genes.quality),
          };

          const generation = Math.max(
            (state.seedVault.find(s => s.id === job.parentAId)?.generation ?? 1),
            (state.seedVault.find(s => s.id === job.parentBId)?.generation ?? 1),
          ) + 1;

          const newEntry: SeedEntry = {
            id: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            cropId: job.cropId,
            generation,
            genes: offspringGenes,
            createdDay: newDay,
            quantity: 3,
          };
          nextSeedVault.push(newEntry);
        }
        const nextHybridJobs = state.hybridJobs.filter(j => newDay < j.readyDay);

        // Auto-sell: sell crops automatically when price meets threshold
        let autoSellIncome = 0;
        const autoSellRules = state.autoSell ?? {};
        const autoSellInventoryDelta: Record<string, number> = {};
        const autoSellLog: Array<{ cropId: string; qty: number; revenue: number }> = [];
        for (const [cropId, rule] of Object.entries(autoSellRules)) {
          if (!rule.enabled) continue;
          const currentPrice = prices.find(p => p.cropId === cropId)?.price ?? 0;
          if (currentPrice < rule.minPrice) continue;
          const inStock = Math.max(0, (orderAdjustedInventory[cropId] ?? 0) + (autoSellInventoryDelta[cropId] ?? 0));
          if (inStock <= 0) continue;
          const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
          const coopBonus = 1.0;
          const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
          const rev = sellRevenue(inStock, currentPrice) * secaderoBonus * coopBonus * prestigeBonus;
          autoSellIncome += rev;
          autoSellInventoryDelta[cropId] = (autoSellInventoryDelta[cropId] ?? 0) - inStock;
          autoSellLog.push({ cropId, qty: inStock, revenue: rev });
        }
        const autoSellFinalInventory = Object.fromEntries(
          Object.keys({ ...orderAdjustedInventory, ...autoSellInventoryDelta }).map(k => [
            k, Math.max(0, (orderAdjustedInventory[k] ?? 0) + (autoSellInventoryDelta[k] ?? 0)),
          ])
        );
        if (autoSellLog.length > 0) {
          summary.push({
            id: 'auto_sell',
            icon: '🤖',
            title: `Auto-sold ${autoSellLog.length} crop type${autoSellLog.length > 1 ? 's' : ''} · +$${Math.round(autoSellIncome).toLocaleString()}`,
            detail: autoSellLog.slice(0, 3).map(s => {
              const c = CROP_TYPES.find(cr => cr.id === s.cropId);
              return `${c?.name ?? s.cropId}: ${Math.round(s.qty).toLocaleString()} ${c?.unit ?? ''}`;
            }).join(', '),
            severity: 'good',
          });
        }

        // Worker auto-actions
        let vetTreatmentCost = 0;
        const activeWorkers = finalWorkers;
        if (activeWorkers.length > 0) {
          const hasVet = activeWorkers.some((w: Worker) => w.role === 'veterinarian');
          const hasAnimalKeeper = activeWorkers.some((w: Worker) => w.role === 'livestock_hand');
          const hasFieldWorker = activeWorkers.some((w: Worker) => w.role === 'field_hand');

          if (hasVet) {
            const { ANIMAL_TYPES: AT_VET } = require('../data/animalTypes');
            animals = animals.map((a: OwnedAnimal) => {
              if (!a.sick) return a;
              const animalType = AT_VET.find((t: any) => t.id === a.typeId);
              const baseTreatCost = Math.max(50, Math.round((animalType?.maxSellPrice ?? 1000) * 0.05));
              const treatCost = state.vetRoomOwned ? 0 : baseTreatCost;
              vetTreatmentCost += treatCost;
              return { ...a, sick: false, sicknessDay: undefined };
            });
          }

          if (hasAnimalKeeper) {
            const { ANIMAL_TYPES: AT_KEEPER } = require('../data/animalTypes');
            const { collectProduction: collectProd } = require('../engine/animals');
            const graneroBonus = state.buildings.includes('bld_granero') ? 1.2 : 1.0;
            animals = animals.map((a: OwnedAnimal) => {
              if (a.sick) return a;
              const animalType = AT_KEEPER.find((t: any) => t.id === a.typeId);
              if (!animalType?.productionType) return a;
              const { units, nextDay } = collectProd(a, animalType, newDay);
              if (units <= 0) return a;
              const key = animalType.productionType;
              return { ...a, lastProductionDay: nextDay, _autoCollect: { key, units: Math.round(units * graneroBonus * workerBonuses.animalProductionMult) } };
            });
            // Flush auto-collected animal products
            const newAnimalInventory = { ...state.animalInventory };
            animals = animals.map((a: any) => {
              if (!a._autoCollect) return a;
              newAnimalInventory[a._autoCollect.key] = (newAnimalInventory[a._autoCollect.key] ?? 0) + a._autoCollect.units;
              const { _autoCollect: _, ...rest } = a;
              return rest;
            });
            // We store this as a side effect · will be used in set() below
            (animals as any).__newAnimalInventory = newAnimalInventory;
          }

          if (hasFieldWorker) {
            const { harvestAmount: harvestAmt } = require('../engine/crops');
            const yieldBonusW = 1.0;
            const siloCapacity = getSiloCapacity(state.buildings);
            let siloTotal = Object.values(autoSellFinalInventory).reduce((a: number, b) => a + (b as number), 0);
            const workerNewInventory = { ...autoSellFinalInventory };
            const newHarvestedIds = [...state.harvestedCropIds];
            finalParcels = finalParcels.map(p => {
              if (!p.plantedCrop || !p.owned || siloTotal >= siloCapacity) return p;
              const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
              if (!cropType) return p;
              if (newDay < p.plantedCrop.plantedDay + Math.max(1, Math.round(cropType.growthDays) - workerBonuses.cropGrowthReduction)) return p;
              // Cover crop maturation: apply soil benefits, skip normal harvest
              const isCoverCropW = !!(cropType as any)?.coverCrop;
              if (isCoverCropW) {
                const benefits = COVER_CROP_BENEFITS[p.plantedCrop.cropId] ?? {};
                const oldSoil = p.soil ?? SOIL_DEFAULTS;
                return {
                  ...p,
                  plantedCrop: null,
                  cropHistory: [...(p.cropHistory ?? []).slice(-3), p.plantedCrop.cropId],
                  soil: {
                    ...oldSoil,
                    nitrogen:      Math.min(100, oldSoil.nitrogen + (benefits.nitrogen ?? 0)),
                    organicMatter: Math.min(10,  oldSoil.organicMatter + (benefits.organicMatter ?? 0)),
                    compaction:    Math.max(0,   oldSoil.compaction - (benefits.compactionReduction ?? 0)),
                    microbialLife: Math.min(100, oldSoil.microbialLife + (benefits.microbialLife ?? 0)),
                  },
                };
              }
              const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
              const waterScale = (cropType.waterNeed ?? 3) / 5;
              const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
              const unresolvedEvents = state.fieldEvents.filter(e => e.parcelId === p.id && !e.resolved).length;
              const fieldEventMod = Math.pow(0.75, unresolvedEvents);
              const waterBonus = hasWaterTower(state.buildings) ? 1.05 : 1.0;
              const irrigationBonus = p.irrigated ? 1.20 : 1.0;
              const rotationMod = p.lastCropId && p.lastCropId !== p.plantedCrop.cropId ? 1.15 : 1.0;
              const soilMod = getSoilModifier(p.soilType, p.plantedCrop.cropId);
              const machineYieldWithEngineer = yieldBonusW + workerBonuses.machineYieldBonus; // yieldBonusW = 1.0
              const rawUnits = harvestAmt(p.plantedCrop, cropType, p.soil ?? SOIL_DEFAULTS, climateModifier, p.hasWeeds, machineYieldWithEngineer, p.plantedCrop.frostDamage ?? 0, p.plantedCrop.droughtStress ?? 0);
              const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * irrigationBonus * rotationMod * soilMod * workerBonuses.cropYieldMultiplier), siloCapacity - siloTotal);
              siloTotal += units;
              workerNewInventory[p.plantedCrop.cropId] = (workerNewInventory[p.plantedCrop.cropId] ?? 0) + units;
              if (!newHarvestedIds.includes(p.plantedCrop.cropId)) newHarvestedIds.push(p.plantedCrop.cropId);
              const newFertility = Math.max(1, p.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonuses.fertilityDrainMult));
              return { ...p, plantedCrop: null, lastCropId: p.plantedCrop.cropId, fertility: newFertility, cropHistory: [...(p.cropHistory ?? []).slice(-3), p.plantedCrop.cropId] };
            });
            (autoSellFinalInventory as any).__workerInventory = workerNewInventory;
            (autoSellFinalInventory as any).__harvestedIds = newHarvestedIds;
          }

          // Processing min-worker headcount check
          const PROCESSING_BUILDING_IDS = new Set([
            'bld_molino', 'bld_prensa', 'bld_lacteo', 'bld_procesadora', 'bld_bodega',
          ]);
          const activeProcessingBuildings = state.buildings.filter(
            b => PROCESSING_BUILDING_IDS.has(b)
          ).length;
          const hasAnyWorkers = (state.workers ?? []).length > 0;
          let processingEfficiency = 1.0;
          if (activeProcessingBuildings > 0 && hasAnyWorkers) {
            const processingStaff = finalWorkers.filter(
              (w: Worker) => (w.role === 'processing_tech' || w.role === 'quality_controller') && !w.isInjured && !w.isOnLeave
            ).length;
            processingEfficiency = processingStaff === 0
              ? 0
              : Math.min(1, processingStaff / Math.max(1, activeProcessingBuildings));
          }
          const processingUnderManned = hasAnyWorkers && activeProcessingBuildings > 0 && processingEfficiency < 1;

          // Supervisor auto-process: 1 batch of highest-stock recipe per day
          if (workerBonuses.autoProcessEnabled && !processingUnderManned) {
            const { PROCESSING_RECIPES: AUTO_RECIPES } = require('../data/processingTypes');
            const currentInventory = (autoSellFinalInventory as any).__workerInventory ?? autoSellFinalInventory;
            const currentAnimalInv = (animals as any).__newAnimalInventory ?? state.animalInventory;

            // Find eligible recipes (building owned, at least 1 batch available)
            const eligible = AUTO_RECIPES.filter((r: any) => {
              if (!state.buildings.includes(r.buildingTypeId)) return false;
              for (const input of r.inputs ?? []) {
                let stock = 0;
                if (input.source === 'crop') stock = currentInventory[input.itemId] ?? 0;
                else if (input.source === 'animal') stock = currentAnimalInv[input.itemId] ?? 0;
                if (stock < input.quantity) return false;
              }
              return true;
            });

            if (eligible.length > 0) {
              // Pick the recipe with the most total input stock
              const best = eligible.reduce((prev: any, cur: any) => {
                const prevStock = (prev.inputs ?? []).reduce((s: number, inp: any) => {
                  if (inp.source === 'crop') return s + (currentInventory[inp.itemId] ?? 0);
                  if (inp.source === 'animal') return s + (currentAnimalInv[inp.itemId] ?? 0);
                  return s;
                }, 0);
                const curStock = (cur.inputs ?? []).reduce((s: number, inp: any) => {
                  if (inp.source === 'crop') return s + (currentInventory[inp.itemId] ?? 0);
                  if (inp.source === 'animal') return s + (currentAnimalInv[inp.itemId] ?? 0);
                  return s;
                }, 0);
                return curStock > prevStock ? cur : prev;
              });

              const outputAmount = Math.round(best.baseOutputQuantity * workerBonuses.processingOutputMult);

              for (const input of best.inputs ?? []) {
                if (input.source === 'crop') {
                  (autoSellFinalInventory as any).__workerInventory = {
                    ...((autoSellFinalInventory as any).__workerInventory ?? currentInventory),
                    [input.itemId]: (((autoSellFinalInventory as any).__workerInventory ?? currentInventory)[input.itemId] ?? 0) - input.quantity,
                  };
                } else if (input.source === 'animal') {
                  (animals as any).__newAnimalInventory = {
                    ...((animals as any).__newAnimalInventory ?? currentAnimalInv),
                    [input.itemId]: (((animals as any).__newAnimalInventory ?? currentAnimalInv)[input.itemId] ?? 0) - input.quantity,
                  };
                }
              }

              (autoSellFinalInventory as any).__supervisorProcess = {
                productId: best.outputItemId,
                amount: outputAmount,
              };
            }
          }
        }
        // Extract worker inventory overrides
        const workerHarvestedIds: string[] | undefined = (autoSellFinalInventory as any).__harvestedIds;
        const workerInventoryOverride: Record<string, number> | undefined = (autoSellFinalInventory as any).__workerInventory;
        const workerAnimalInventory: Record<string, number> | undefined = (animals as any).__newAnimalInventory;
        const inventoryForSet = workerInventoryOverride ?? autoSellFinalInventory;
        const animalInventoryForSet = workerAnimalInventory ?? state.animalInventory;
        let animalInventory = { ...animalInventoryForSet };
        let newGrainMissed = state.grainMissedDays ?? 0;
        let newHayMissed = state.hayMissedDays ?? 0;
        let newSilageLevel = state.silageLevel ?? 0;
        const harvestedCropIdsForSet = workerHarvestedIds ?? state.harvestedCropIds;

        // ── Fuel tracking for job day ────────────────────────────────────────
        let currentFuel = state.fuel ?? 200;
        const fuelPausedNames: string[] = [];

        // ── Process TractorJobs ──────────────────────────────────────────────
        let tractorSlurryDrain = 0;
        const completedTractorJobIds: string[] = [];
        for (const job of (state.tractorJobs ?? [])) {
          if (job.completesDay > newDay) continue;
          // Fuel check
          const tractorOwned = (state.machines ?? []).find((m: OwnedMachine) => m.id === job.tractorId);
          const tractorMachineType = MACHINE_TYPES.find((mt: MachineType) => mt.id === (tractorOwned?.typeId ?? ''));
          const fuelNeeded = tractorMachineType?.fuelPerDay ?? 0;
          if (fuelNeeded > 0 && currentFuel < fuelNeeded) {
            fuelPausedNames.push(tractorMachineType?.name ?? 'Tractor');
            continue;
          }
          currentFuel -= fuelNeeded;
          completedTractorJobIds.push(job.id);
          if (job.operation === 'till') {
            finalParcels = finalParcels.map((p: LandParcel) =>
              job.parcelIds.includes(p.id) ? { ...p, tilled: true } : p
            );
            summary.push({
              id: `tj_${job.id}`,
              icon: '🚜',
              title: 'Tilling Complete',
              detail: `${job.parcelIds.length} parcel(s) tilled`,
              severity: 'good' as const,
            });
          } else if (job.operation === 'spray') {
            finalParcels = finalParcels.map((p: LandParcel) => {
              if (!job.parcelIds.includes(p.id) || !p.plantedCrop) return p;
              return {
                ...p,
                plantedCrop: {
                  ...p.plantedCrop,
                  appliedN: Math.max(p.plantedCrop.appliedN ?? 1.0, 1.10),
                },
              };
            });
            summary.push({
              id: `tj_${job.id}`,
              icon: '💊',
              title: 'Spraying Complete',
              detail: `${job.parcelIds.length} parcel(s) sprayed`,
              severity: 'good' as const,
            });
          } else if (job.operation === 'plant') {
            // Crop was already set at assignJob time with plantedDay = completesDay
            // No parcel state change needed here · just record in summary
            summary.push({
              id: `tj_${job.id}`,
              icon: '🌱',
              title: 'Planting Complete',
              detail: `${job.parcelIds.length} parcel(s) planted`,
              severity: 'good' as const,
            });
          } else if (job.operation === 'spread_slurry') {
            // Apply +1 fertility to all assigned parcels (clamped at 25)
            finalParcels = finalParcels.map((p: LandParcel) =>
              job.parcelIds.includes(p.id)
                ? { ...p, fertility: Math.min(25, (p.fertility ?? 1) + 1) }
                : p
            );
            // Drain the whole tank · one shared tank, so assign (not +=); Math.max(0,··)
            // at the accumulation block prevents negatives regardless of job count.
            tractorSlurryDrain = state.slurryLevel ?? 0;
            summary.push({
              id: `tj_${job.id}`,
              icon: '💧',
              title: 'Slurry Spread Complete',
              detail: `${job.parcelIds.length} parcel(s) received +1 soil fertility`,
              severity: 'good' as const,
            });
          }
        }
        const remainingTractorJobs = (state.tractorJobs ?? []).filter(
          (j: TractorJob) => !completedTractorJobIds.includes(j.id)
        );

        // ── Process HarvestJobs (incremental · combine harvests N ha/day) ────
        let updatedHarvestJobs = [...(state.harvestJobs ?? [])];
        let harvestInventory = { ...inventoryForSet };
        const siloCapForHarvest = getSiloCapacity(state.buildings);

        for (let hi = 0; hi < updatedHarvestJobs.length; hi++) {
          const hj = updatedHarvestJobs[hi];
          // Fuel check
          const combineOwned = (state.machines ?? []).find((m: OwnedMachine) => m.id === hj.combineId);
          const combineMachineType = MACHINE_TYPES.find((mt: MachineType) => mt.id === (combineOwned?.typeId ?? ''));
          const harvestFuelNeeded = combineMachineType?.fuelPerDay ?? 0;
          if (harvestFuelNeeded > 0 && currentFuel < harvestFuelNeeded) {
            fuelPausedNames.push(combineMachineType?.name ?? 'Combine');
            continue;
          }
          currentFuel -= harvestFuelNeeded;
          const haAvailable = Math.min(hj.haPerDay, hj.totalHa - hj.processedHa);
          let processedHa = 0;

          for (const pid of hj.parcelIds) {
            if (processedHa >= haAvailable) break;
            if (processedHa + (finalParcels.find((p: LandParcel) => p.id === pid)?.hectares ?? 0) > haAvailable) break;
            const parcel = finalParcels.find((p: LandParcel) => p.id === pid);
            if (!parcel || !parcel.plantedCrop) continue;
            const cropType = CROP_TYPES.find((c: { id: string }) => c.id === parcel.plantedCrop!.cropId);
            if (!cropType) continue;
            // Cover crop maturation: apply soil benefits, skip normal harvest
            const isCoverCropHJ = !!(cropType as any)?.coverCrop;
            if (isCoverCropHJ) {
              const benefits = COVER_CROP_BENEFITS[parcel.plantedCrop!.cropId] ?? {};
              const oldSoil = parcel.soil ?? SOIL_DEFAULTS;
              finalParcels = finalParcels.map((p: LandParcel) =>
                p.id === pid
                  ? {
                      ...p,
                      plantedCrop: null,
                      cropHistory: [...(parcel.cropHistory ?? []).slice(-3), parcel.plantedCrop!.cropId],
                      soil: {
                        ...oldSoil,
                        nitrogen:      Math.min(100, oldSoil.nitrogen + (benefits.nitrogen ?? 0)),
                        organicMatter: Math.min(10,  oldSoil.organicMatter + (benefits.organicMatter ?? 0)),
                        compaction:    Math.max(0,   oldSoil.compaction - (benefits.compactionReduction ?? 0)),
                        microbialLife: Math.min(100, oldSoil.microbialLife + (benefits.microbialLife ?? 0)),
                      },
                    }
                  : p
              );
              processedHa += parcel.hectares;
              continue;
            }
            const currentTotal = Object.values(harvestInventory).reduce((a: number, b) => a + (b as number), 0);
            if (currentTotal >= siloCapForHarvest) break;
            const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
            const waterScale = (cropType.waterNeed ?? 3) / 5;
            const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
            const units = Math.min(
              Math.round(harvestAmount(parcel.plantedCrop!, cropType, parcel.soil ?? SOIL_DEFAULTS, climateModifier, parcel.hasWeeds, 1.0, parcel.plantedCrop!.frostDamage ?? 0, parcel.plantedCrop!.droughtStress ?? 0) * pestYieldModifier(parcel.pestState?.severity ?? 0)),
              siloCapForHarvest - currentTotal,
            );
            const newFertility = Math.max(1, parcel.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonuses.fertilityDrainMult));
            finalParcels = finalParcels.map((p: LandParcel) =>
              p.id === pid
                ? { ...p, plantedCrop: null, lastCropId: parcel.plantedCrop!.cropId, fertility: newFertility, tilled: false, cropHistory: [...(parcel.cropHistory ?? []).slice(-3), parcel.plantedCrop!.cropId] }
                : p
            );
            harvestInventory = {
              ...harvestInventory,
              [parcel.plantedCrop!.cropId]: (harvestInventory[parcel.plantedCrop!.cropId] ?? 0) + units,
            };
            processedHa += parcel.hectares;
          }
          updatedHarvestJobs[hi] = { ...hj, processedHa: hj.processedHa + processedHa };
        }
        updatedHarvestJobs = updatedHarvestJobs.filter((hj: HarvestJob) => hj.processedHa < hj.totalHa);

        // ── Delivery job processing ───────────────────────────────────────────
        const hasMechanic = (state.workers ?? []).some(
          (w: Worker) => w.role === 'farm_mechanic'
        );

        let deliveryRevenue = 0;
        let deliveryRepairCost = 0;
        let fuelFromReturnLoads = 0;
        const deliveryEvents: Array<{ msg: string; jobId: string }> = [];
        const updatedDeliveryJobs: DeliveryJob[] = [];
        const newPendingPickup = [...(state.pendingPickup ?? [])];

        for (const job of (state.deliveryJobs ?? [])) {
          // Still in transit: roll for breakdown
          if (newDay < job.returnDay) {
            const baseChance = BREAKDOWN_CHANCE[job.marketId] ?? 0.03;
            const chance = hasMechanic ? baseChance * 0.5 : baseChance;
            if (Math.random() < chance && !job.needsMaintenance) {
              const delay = Math.floor(Math.random() * 2) + 1;
              updatedDeliveryJobs.push({
                ...job,
                returnDay: job.returnDay + delay,
                needsMaintenance: true,
                breakdownDaysAdded: job.breakdownDaysAdded + delay,
              });
              deliveryEvents.push({
                msg: `🔧 Truck broke down on the way to ${job.marketId} · delayed ${delay}d`,
                jobId: job.id,
              });
            } else {
              updatedDeliveryJobs.push(job);
            }
            continue;
          }

          // returnDay reached · process completion
          deliveryRevenue += job.expectedRevenue;

          if (job.needsMaintenance && !hasMechanic) {
            const truck = (state.machines ?? []).find((m: OwnedMachine) => m.id === job.truckId);
            const truckTypeId = truck?.typeId ?? '';
            deliveryRepairCost += REPAIR_FEE[truckTypeId] ?? 350;
          }

          // Return orders: add items to inventory
          for (const r of job.returnOrders) {
            if (r.itemId === 'fuel') {
              fuelFromReturnLoads += r.quantity;
            } else if (r.itemId.startsWith('animal_')) {
              const animalTypeId = r.itemId.replace('animal_', '');
              const pickup = newPendingPickup.find(
                p => p.animalTypeId === animalTypeId && p.pickedUpDay === null
              );
              if (pickup) pickup.pickedUpDay = newDay;
            } else {
              harvestInventory = {
                ...harvestInventory,
                [r.itemId]: (harvestInventory[r.itemId] ?? 0) + r.quantity,
              };
            }
          }

          deliveryEvents.push({
            msg: `🚛 Truck returned from ${job.marketId} · $${job.expectedRevenue.toLocaleString()}`,
            jobId: job.id,
          });
          // Completed job is NOT pushed to updatedDeliveryJobs (removed from queue)
        }

        // Push delivery events into day summary
        for (const { msg, jobId } of deliveryEvents) {
          const isBreakdown = msg.startsWith('🔧');
          summary.push({
            id: `delivery_${jobId}`,
            icon: isBreakdown ? '🔧' : '🚛',
            title: msg,
            severity: isBreakdown ? 'warning' : 'good',
          });
        }

        if (fuelPausedNames.length > 0) {
          const uniqueNames = [...new Set(fuelPausedNames)];
          summary.push({
            id: 'fuel_paused',
            icon: '⛽',
            title: `Fuel too low · ${uniqueNames.join(', ')} idle`,
            detail: `Refuel in the Machinery tab to resume jobs`,
            severity: 'danger',
          });
        }

        // ── Crop disease spread ──────────────────────────────────────────────
        const hasShelter = state.buildings.includes('bld_shelter');
        const anyDisease = finalParcels.some(p => p.owned && p.diseased);
        const fieldWorkerCount = (state.workers ?? []).filter(w => w.role === 'field_hand').length;
        let autoChemistryCures = fieldWorkerCount; // field workers cure 1 diseased parcel/day each
        finalParcels = finalParcels.map(p => {
          if (!p.owned) return p;
          // Auto-cure by field workers
          if (p.diseased && autoChemistryCures > 0) {
            autoChemistryCures--;
            return { ...p, diseased: false, diseasedDay: undefined };
          }
          // Destroy crop if diseased > 20 days untreated
          if (p.diseased && p.diseasedDay && newDay - p.diseasedDay > 20) {
            summary.push({ id: `blight_${p.id}`, icon: '🦠', title: `Blight destroyed crop on ${p.name}`, severity: 'danger' });
            return { ...p, plantedCrop: null, diseased: false, diseasedDay: undefined };
          }
          if (!p.plantedCrop || p.diseased) return p;
          // Spread: 0.4% base + 1.2% extra if any disease present on farm
          const spreadChance = 0.004 + (anyDisease ? 0.012 : 0);
          if (Math.random() < spreadChance) {
            return { ...p, diseased: true, diseasedDay: newDay };
          }
          return p;
        });
        // Announce new outbreaks (parcels that just became diseased this day)
        const newlyDiseased = finalParcels.filter(p => p.diseased && p.diseasedDay === newDay);
        if (newlyDiseased.length > 0) {
          summary.push({ id: 'blight_new', icon: '🦠', title: `Crop blight on ${newlyDiseased.length} plot${newlyDiseased.length > 1 ? 's' : ''}`, detail: 'Treat quickly or lose the crop', severity: 'danger' });
        }

        // ── Soil daily tick ──────────────────────────────────────────────────
        const parcelsWithSoil = finalParcels.map((p) => {
          if (!p.owned) return p;
          const cropType = p.plantedCrop
            ? CROP_TYPES.find(ct => ct.id === p.plantedCrop!.cropId)
            : undefined;
          const tickParams: SoilTickParams = {
            activeCropId: p.plantedCrop?.cropId ?? null,
            harvestedToday: false,
            machineryUsedToday: false,
            heavyRainToday: (todayWeather?.event === 'heavy_rain' || todayWeather?.event === 'rain'),
            droughtToday: (todayWeather?.event === 'drought'),
            pesticideAppliedToday: false,
            manureAppliedToday: false,
            subsoilerUsedToday: false,
          };
          const nitrogenDemand = cropType
            ? (cropType.fertilityDrain ?? 0) * 4
            : 0;
          return {
            ...p,
            soil: advanceSoilStats(p.soil ?? SOIL_DEFAULTS, tickParams, nitrogenDemand),
          };
        });
        finalParcels = parcelsWithSoil;

        // ── Price alert triggers ─────────────────────────────────────────────
        let priceAlerts = [...(state.priceAlerts ?? [])];
        let alertSellIncome = 0;
        const alertSalesEntries: SaleRecord[] = [];
        const triggeredAlertIds: string[] = [];
        for (const alert of priceAlerts) {
          const currentPrice = prices.find(p => p.cropId === alert.cropId)?.price ?? 0;
          const triggered =
            alert.direction === 'below'
              ? currentPrice <= alert.targetPrice
              : currentPrice >= alert.targetPrice;
          if (triggered) {
            const qty = Math.round(harvestInventory[alert.cropId] ?? 0);
            if (qty > 0) {
              const revenue = Math.round(qty * currentPrice);
              alertSellIncome += revenue;
              harvestInventory = { ...harvestInventory, [alert.cropId]: 0 };
              const cropName = CROP_TYPES.find(c => c.id === alert.cropId)?.name ?? alert.cropId;
              alertSalesEntries.push({ day: newDay, amount: revenue, category: 'crops' as const });
              const dirLabel = alert.direction === 'below' ? '≤' : '≥';
              summary.push({ id: `alert_${alert.id}`, icon: '🎯', title: `Price alert: sold ${qty.toLocaleString()} ${cropName}`, detail: `${dirLabel}$${alert.targetPrice.toFixed(2)} hit · $${revenue.toLocaleString()} total`, severity: 'good' });
            }
            triggeredAlertIds.push(alert.id);
          }
        }
        priceAlerts = priceAlerts.filter(a => !triggeredAlertIds.includes(a.id));

        let finalMoney = Math.max(0, moneyAfterMaintenance + moneyDelta + totalInsurancePayoutAll - defaultPenalty + depositPayoutTotal - contractPenaltyTotal + futuresIncome - futuresPenalty + autoSellIncome + alertSellIncome - vetTreatmentCost + marketOrderIncome);
        let electricityBillDeduction = 0;
        let newElectricity: ElectricityState = state.electricity;

        // Crops ready to harvest (after field worker cleared some)
        const cropsReady = finalParcels.filter(p => {
          if (!p.plantedCrop || !p.owned) return false;
          const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
          return cropType && newDay >= p.plantedCrop.plantedDay + cropType.growthDays;
        });
        if (cropsReady.length > 0) {
          summary.push({
            id: 'crops_ready',
            icon: '🌾',
            title: `${cropsReady.length} plot${cropsReady.length > 1 ? 's' : ''} ready to harvest`,
            detail: cropsReady.slice(0, 3).map(p => {
              const c = CROP_TYPES.find(ct => ct.id === p.plantedCrop!.cropId);
              return c?.name ?? '';
            }).filter(Boolean).join(', '),
            severity: 'good',
          });
        }

        // Reputation: passive gain every 30 days, penalties for failures/defaults
        let reputation = state.reputation ?? 50;
        if (newDay % 30 === 0) reputation = Math.min(100, reputation + 1);
        reputation = Math.max(0, Math.min(100, reputation - newFailures.length * 10 - newDefaults.length * 8));

        const declinedTemplates = newDay % 180 === 0 ? [] : state.declinedTemplates;

        // ── Pest control: feed loss ───────────────────────────────────────────
        const hasPestControl = (state.buildings ?? []).includes('bld_pest_control_station');
        let pestHayLoss = 0;
        if (!hasPestControl) {
          const currentHay = animalInventory['hay'] ?? 0;
          pestHayLoss = Math.floor(currentHay * 0.015);
        }

        // ── Feed deduction ────────────────────────────────────────────────────
        {
          const { computeFeedNeeded, GRAIN_CROP_IDS: GRAIN_IDS } = require('../engine/animals');
          const { ANIMAL_TYPES: AT_FEED } = require('../data/animalTypes');
          const hasAnimalWorker = (state.workers ?? []).some(
            (w: Worker) => w.role === 'livestock_hand' || w.role === 'veterinarian'
          );
          const { grainKg: _rawGrainKg, hayKg, pigGrainKg: _rawPigGrainKg } = computeFeedNeeded(animals, AT_FEED, newDay);
          const hasFeedMill = (state.buildings ?? []).some(bid =>
            bid === 'bld_feed_mill_s' || bid === 'bld_feed_mill_m' || bid === 'bld_feed_mill_l'
          );
          const feedMillMult = hasFeedMill ? 0.65 : 1.0; // 35% reduction when milling on-farm
          const grainKg = Math.round(_rawGrainKg * feedMillMult * 10) / 10;
          const pigGrainKg = Math.round(_rawPigGrainKg * feedMillMult * 10) / 10;
          const shouldFeed = hasAnimalWorker || state.animalsManuallyFed;

          if (shouldFeed && (grainKg > 0 || hayKg > 0)) {
            // ── Grain deduction ──
            if (grainKg > 0) {
              const grainAvail = GRAIN_IDS.reduce(
                (s: number, id: string) => s + (harvestInventory[id] ?? 0), 0
              );
              if (grainAvail >= grainKg) {
                let remaining = grainKg;
                for (const id of GRAIN_IDS) {
                  if (remaining <= 0) break;
                  const avail = harvestInventory[id] ?? 0;
                  const take = Math.min(avail, remaining);
                  harvestInventory = { ...harvestInventory, [id]: avail - take };
                  remaining -= take;
                }
                newGrainMissed = Math.max(0, newGrainMissed - 1);
              } else {
                // Consume all available grain first
                for (const id of GRAIN_IDS) {
                  if ((harvestInventory[id] ?? 0) > 0) {
                    harvestInventory = { ...harvestInventory, [id]: 0 };
                  }
                }
                const shortfall = grainKg - grainAvail;
                if (shortfall <= pigGrainKg) {
                  // Pigs can cover their portion from any non-grain, non-grass crops
                  let pigRemaining = shortfall;
                  const fallbackIds = Object.keys(harvestInventory).filter(
                    (id: string) => !GRAIN_IDS.includes(id) && id !== 'grass' && (harvestInventory[id] ?? 0) > 0
                  );
                  for (const id of fallbackIds) {
                    if (pigRemaining <= 0) break;
                    const avail = harvestInventory[id] ?? 0;
                    const take = Math.min(avail, pigRemaining);
                    harvestInventory = { ...harvestInventory, [id]: avail - take };
                    pigRemaining -= take;
                  }
                  if (pigRemaining <= 0) {
                    newGrainMissed = Math.max(0, newGrainMissed - 1);
                  } else {
                    newGrainMissed = Math.min(7, newGrainMissed + 1);
                  }
                } else {
                  newGrainMissed = Math.min(7, newGrainMissed + 1);
                }
              }
            } else {
              newGrainMissed = Math.max(0, newGrainMissed - 1);
            }

            // ── Hay deduction ──
            if (hayKg > 0) {
              const hayAvail = Math.max(0, (animalInventory['hay'] ?? 0) - pestHayLoss);
              if (hayAvail >= hayKg) {
                animalInventory = { ...animalInventory, hay: Math.round((hayAvail - hayKg) * 10) / 10 };
                newHayMissed = Math.max(0, newHayMissed - 1);
              } else {
                // Try silage as a fallback for the shortfall
                const hayShortfall = hayKg - hayAvail;
                const silageForFeed = Math.min(newSilageLevel, hayShortfall);
                const totalFed = hayAvail + silageForFeed;
                animalInventory = { ...animalInventory, hay: 0 };
                newSilageLevel = Math.max(0, newSilageLevel - silageForFeed);
                if (totalFed >= hayKg) {
                  // Silage fully covered the shortfall
                  newHayMissed = Math.max(0, newHayMissed - 1);
                  summary.push({
                    id: 'feed_silage_used',
                    icon: '🌿',
                    title: 'Silage used as hay substitute',
                    detail: `${Math.round(silageForFeed)} kg silage fed to ruminants`,
                    severity: 'info' as const,
                  });
                } else {
                  // Even silage couldn't cover it
                  newHayMissed = Math.min(7, newHayMissed + 1);
                  summary.push({
                    id: 'feed_hay_empty',
                    icon: '🌾',
                    title: 'Hay and silage stock depleted',
                    detail: 'Ruminants are underfed · grow grass and fill the Henil or Silage Pit',
                    severity: 'warning' as const,
                  });
                }
              }
            } else {
              newHayMissed = Math.max(0, newHayMissed - 1);
            }
          } else if (grainKg > 0 || hayKg > 0) {
            // No worker and player didn't manually feed
            newGrainMissed = Math.min(7, newGrainMissed + 1);
            newHayMissed = Math.min(7, newHayMissed + 1);
            if (!hasAnimalWorker) {
              summary.push({
                id: 'feed_not_fed',
                icon: '🐄',
                title: 'Animals not fed today',
                detail: 'Tap "Feed Animals" before advancing day, or hire an animal keeper',
                severity: 'warning',
              });
            }
          }
        }

        // ── Henil: process ready batches ──────────────────────────────────────
        const readyBatches = (state.henilQueue ?? []).filter((b: HenilBatch) => b.readyDay <= newDay);
        if (readyBatches.length > 0) {
          const hayProduced = readyBatches.reduce(
            (sum: number, b: HenilBatch) => sum + Math.floor(b.wetGrassKg * 0.625), 0
          );
          animalInventory = {
            ...animalInventory,
            hay: (animalInventory['hay'] ?? 0) + hayProduced,
          };
          summary.push({
            id: `henil_ready_${newDay}`,
            icon: '🌿',
            title: `Henil: ${hayProduced.toLocaleString()} kg hay ready`,
            detail: `${readyBatches.length} batch${readyBatches.length > 1 ? 'es' : ''} dried`,
            severity: 'good',
          });
        }
        const updatedHenilQueue = (state.henilQueue ?? []).filter((b: HenilBatch) => b.readyDay > newDay);

        // ── Production buildings processing ───────────────────────────────
        const isCoopMember = state.cooperative?.member ?? false;
        let productionBuildingContractorFees = 0;
        const newProductionBuildings = (state.productionBuildings ?? []).map(pb => {
          const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
          if (!bt) return pb;

          const herdSize = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId).length;
          const sickCount = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId && (a as any).sick).length;
          const effCap = effectiveCapacity(pb);
          const manned = isManned(pb, bt.buildingTier ?? 'small', state.hasCCTV ?? false);

          // Contractor fee: unmanned building = full fee; partial coverage = proportional fee
          const unprocessedFraction = !manned
            ? 1.0
            : Math.max(0, (herdSize - effCap) / Math.max(herdSize, 1));

          if (unprocessedFraction > 0 && herdSize > 0) {
            const productPrice = (state.animalPrices ?? {})[pb.animalTypeId] ?? 1;
            let dailyValue = herdSize * productPrice;
            // Poultry lighting: winter production penalty
            const POULTRY_SPECIES = new Set(['gallina', 'pato', 'codorniz']);
            if (POULTRY_SPECIES.has(pb.animalTypeId)) {
              const isWinter = seasonKey(newDay) === 'winter';
              const hasLighting = (state.buildings ?? []).includes('bld_lighting_system');
              if (isWinter && !hasLighting) {
                dailyValue = Math.round(dailyValue * 0.4);
              }
            }
            const fee = contractorFee(unprocessedFraction, dailyValue, isCoopMember);
            if (fee > 0) {
              productionBuildingContractorFees += fee;
              summary.push({
                id: `contractor_fee_${pb.id}`,
                icon: '🚚',
                title: `Contractor processing ${bt.name} · $${fee}`,
                detail: manned ? 'Building at capacity · upgrade to process full herd' : 'Building unmanned · assign a farmhand',
                severity: 'warning',
              });
            }
          }

          // Hygiene decay
          const hasCleanerWorker = pb.assignedWorkerIds.some(wid =>
            ((state.workers ?? []).find((w: Worker) => w.id === wid)?.role as string) === 'field_hand'
          );
          const hasUVSanitiser = pb.equipmentSlots.includes('eq_uv_sanitiser');
          const decay = hygieneDecay(pb.animalTypeId, herdSize, effCap, hasCleanerWorker, hasUVSanitiser);
          let newHygiene = Math.max(0, Math.min(100, pb.hygiene - decay));

          // Inspector event
          let fine = 0;
          let inspectPassed = false;
          let inspectHappened = false;
          if (shouldInspect(newHygiene)) {
            inspectHappened = true;
            inspectPassed = inspectionPassed(newHygiene);
            if (!inspectPassed) {
              fine = inspectorFine(newHygiene);
              productionBuildingContractorFees += fine;
              newHygiene = Math.max(0, newHygiene - 10); // hygiene penalty on failed inspection
              summary.push({
                id: `inspect_fail_${pb.id}`,
                icon: '🔍',
                title: `Inspector failed ${bt.name} · $${fine} fine`,
                detail: 'Hygiene −10. Improve sanitation to avoid repeat visits.',
                severity: 'danger',
              });
            } else {
              summary.push({
                id: `inspect_pass_${pb.id}`,
                icon: '🔍',
                title: `Inspector passed ${bt.name}`,
                severity: 'good',
              });
            }
          }

          // Season end deep clean prompt
          const currentSeason = seasonKey(newDay);
          const prevSeason = seasonKey(newDay - 1);
          if (currentSeason !== prevSeason && pb.lastDeepCleanSeason !== prevSeason) {
            summary.push({
              id: `deep_clean_${pb.id}`,
              icon: '🧹',
              title: `${bt.name} needs a deep clean`,
              detail: 'Assign a farmhand or pay a contractor ($150·$400) in the Management tab',
              severity: 'warning',
            });
            // Hygiene penalty for skipping
            return {
              ...pb,
              hygiene: Math.min(newHygiene, 40),
              ...certificationProgress({ ...pb, hygiene: Math.min(newHygiene, 40) }, newDay, state.lastSyntheticInputDay, false),
            };
          }

          // Certification progress
          const newCert = certificationProgress(
            { ...pb, hygiene: newHygiene },
            newDay,
            state.lastSyntheticInputDay,
            inspectHappened && inspectPassed,
          );

          if (newCert.certificationTier !== pb.certificationTier) {
            const emoji = newCert.certificationTier === 'organic' ? '🌿' : newCert.certificationTier === 'certified' ? '✅' : '⬇️';
            summary.push({
              id: `cert_change_${pb.id}`,
              icon: emoji,
              title: `${bt.name} is now ${newCert.certificationTier} certified`,
              severity: newCert.certificationTier === 'basic' ? 'warning' : 'good',
            });
          }

          return {
            ...pb,
            hygiene: newHygiene,
            ...newCert,
          };
        });

        // Welfare scores · recalculate per species
        const newWelfareScores: Record<string, number> = { ...(state.animalWelfareScores ?? {}) };
        const newMilkGrades: Record<string, 'A' | 'B' | 'C'> = { ...(state.milkGrades ?? {}) };

        for (const pb of newProductionBuildings) {
          const herdSize = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId).length;
          const sickCount = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId && (a as any).sick).length;
          const effCap = effectiveCapacity(pb);
          const animalTypeDef = ANIMAL_TYPES.find((at: any) => at.id === pb.animalTypeId);
          const isHayFed = animalTypeDef?.feedType === 'hay';
          const feedRatio = isHayFed
            ? Math.max(0, 1 - (newHayMissed / 7))
            : Math.max(0, 1 - (newGrainMissed / 7));

          newWelfareScores[pb.animalTypeId] = welfareScore(
            pb.hygiene, feedRatio, herdSize, effCap, sickCount, herdSize
          );

          // Milk grade (dairy only)
          if (DAIRY_SPECIES.has(pb.animalTypeId)) {
            const hasMilkAnalyser = pb.equipmentSlots.includes('eq_milk_analyser');
            newMilkGrades[pb.animalTypeId] = milkGrade(pb.hygiene, hasMilkAnalyser);
          }
        }
        // ── End production buildings processing ───────────────────────────

        // ── Mastitis / low-hygiene warnings (fires at most every 3 days) ─────────
        {
          for (const pb of newProductionBuildings) {
            if (!DAIRY_SPECIES.has(pb.animalTypeId)) continue;
            if (pb.hygiene < 40 && newDay % 3 === 0) {
              const speciesLabel =
                pb.animalTypeId === 'vaca' ? 'cow' :
                pb.animalTypeId === 'cabra' ? 'goat' : 'buffalo';
              summary.push({
                id: `mastitis_${pb.animalTypeId}_${newDay}`,
                icon: '🦠',
                title: `Low hygiene in ${speciesLabel} dairy`,
                detail: `Hygiene ${Math.round(pb.hygiene)}/100 · Grade C milk likely. Clean the parlour and reduce herd density.`,
                severity: 'warning' as const,
              });
            }
          }
        }

        // ── Slurry accumulation ───────────────────────────────────────────────────
        const SLURRY_LITRES_PER_DAY: Partial<Record<string, number>> = {
          vaca: 35, bufalo: 30, cabra: 12, cerdo: 8, oveja: 5,
        };
        const hasSlurryTank = (state.buildings ?? []).some(bid =>
          bid === 'bld_slurry_tank_s' || bid === 'bld_slurry_tank_m' || bid === 'bld_slurry_tank_l'
        );
        const newSlurryCapacity = hasSlurryTank
          ? (state.buildings ?? []).reduce((cap, bid) => {
              if (bid === 'bld_slurry_tank_s') return cap + 5000;
              if (bid === 'bld_slurry_tank_m') return cap + 15000;
              if (bid === 'bld_slurry_tank_l') return cap + 40000;
              return cap;
            }, 0)
          : 0;
        const dailySlurryProduced = animals.reduce((total: number, a: OwnedAnimal) => {
          return total + (SLURRY_LITRES_PER_DAY[a.typeId] ?? 0);
        }, 0);
        const dairyPigCount = animals.filter((a: OwnedAnimal) =>
          ['vaca', 'bufalo', 'cabra', 'cerdo'].includes(a.typeId)
        ).length;
        let newSlurryLevel = Math.max(0, (state.slurryLevel ?? 0) - tractorSlurryDrain);
        let slurryFine = 0;
        if (dailySlurryProduced > 0) {
          if (!hasSlurryTank && dairyPigCount > 15 && Math.random() < 0.03) {
            slurryFine = 400;
            summary.push({
              id: `slurry_fine_${newDay}`,
              icon: '⚠️',
              title: 'Environmental fine · no slurry storage',
              detail: `$${slurryFine} fine. Build a Slurry Tank to avoid these.`,
              severity: 'warning',
            });
          }
          if (hasSlurryTank) {
            newSlurryLevel = Math.min(newSlurryCapacity, newSlurryLevel + dailySlurryProduced);
            if (newSlurryLevel >= newSlurryCapacity && newSlurryCapacity > 0) {
              slurryFine = 300;
              summary.push({
                id: `slurry_overflow_${newDay}`,
                icon: '⚠️',
                title: 'Slurry tank full · overflow fine',
                detail: `$${slurryFine} fine. Spread slurry to free capacity.`,
                severity: 'warning',
              });
            }
          }
        }

        // ── Weigh Crate: flag optimal slaughter weight ────────────────────────────
        const hasWeighCrate = (state.buildings ?? []).includes('bld_weigh_crate') &&
          (state.buildings ?? []).includes('bld_cattle_crush');
        if (hasWeighCrate) {
          animals = animals.map((a: OwnedAnimal) => {
            const animalType = ANIMAL_TYPES.find((t: any) => t.id === a.typeId);
            if (!animalType) return a;
            const atOptimal = isAtOptimalWeight(a, animalType, newDay);
            if (atOptimal === (a.optimalWeightReached ?? false)) return a;
            return { ...a, optimalWeightReached: atOptimal };
          });
        }

        // Milestone checks
        const newlyUnlocked = checkNewMilestones(
          {
            day: newDay,
            money: finalMoney,
            parcels: finalParcels,
            animals: state.animals,
            machines: state.machines,
            contracts,
            insurances: state.insurances,
            savings,
            harvestedCropIds: state.harvestedCropIds,
            seedVault: state.seedVault,
            workers: state.workers,
          },
          state.completedMilestones
        );
        let milestoneBonus = 0;
        let latestMilestonePopup: { icon: string; title: string; reward: number } | null = null;
        for (const id of newlyUnlocked) {
          const def = MILESTONES.find(m => m.id === id);
          const reward = MILESTONE_REWARDS[id] ?? 0;
          milestoneBonus += reward;
          if (def) {
            summary.push({
              id: `milestone_${id}`,
              icon: def.icon,
              title: `Milestone: ${def.title}`,
              detail: reward > 0 ? `${def.description} · +$${reward.toLocaleString()} reward!` : def.description,
              severity: 'good',
            });
            latestMilestonePopup = { icon: def.icon, title: def.title, reward };
          }
        }
        finalMoney += milestoneBonus;
        const completedMilestones = [...state.completedMilestones, ...newlyUnlocked];

        // Bankruptcy detection: money=0, at least 1 defaulted loan, no sales in last 14 days
        const recentSales = state.salesLog.filter(s => s.day >= newDay - 14);
        const hasDefaultedLoan = loans.some(l => l.defaulted);
        const isBankrupt = !state.bankrupt && finalMoney <= 0 && hasDefaultedLoan && recentSales.length === 0 && autoSellIncome === 0;

        const supervisorProcess: { productId: string; amount: number } | undefined =
          (autoSellFinalInventory as any).__supervisorProcess;
        // Supervisor produces a ProcessedItem directly (instant quality 60, full shelf life)
        const supervisorItem: ProcessedItem | null = supervisorProcess
          ? {
              itemId: supervisorProcess.productId,
              quantity: supervisorProcess.amount,
              quality: 60,
              producedDay: newDay,
              expiryDay: newDay + (PROCESSED_ITEM_DEFS.find(d => d.id === supervisorProcess.productId)?.shelfLifeDays ?? 180),
            }
          : null;

        // -- Processing batch tick --
        const outageActive = state.electricity?.outageActive ?? false;
        let batchTickBatches = [...(state.activeBatches ?? [])] as ProcessingBatch[];
        let procBuildings = [...(state.processingBuildings ?? [])] as import('../engine/processing').ProcessingBuilding[];

        // During outages: pause all active batches (extend timer by 1 day)
        if (outageActive) {
          batchTickBatches = batchTickBatches.map(b => ({ ...b, completionDay: b.completionDay + 1 }));
          summary.push({ id: `outage_pause_${newDay}`, icon: '?', title: 'Power outage · processing batches paused.', severity: 'warning' });
        }

        // Complete batches whose timer has expired
        const completedBatches = batchTickBatches.filter(b => b.completionDay <= newDay);
        let remainingActiveBatches = batchTickBatches.filter(b => b.completionDay > newDay);

        // Clear activeBatchId on buildings whose batches completed
        for (const cb of completedBatches) {
          procBuildings = procBuildings.map(pb =>
            pb.activeBatchId === cb.id ? { ...pb, activeBatchId: undefined } : pb
          );
        }

        // Convert completed batches to inventory items with cold storage
        const completedItems: ProcessedItem[] = completedBatches.map(b => {
          const def = PROCESSED_ITEM_DEFS.find(d => d.id === b.outputItemId);
          const building = procBuildings.find(pb => pb.id === b.buildingId);
          const shelfLife = def?.shelfLifeDays ?? 365;
          const csMult = building?.hasColdStorage && def ? def.coldStorageMultiplier : 1;
          return {
            itemId: b.outputItemId,
            quantity: b.outputQuantity,
            quality: b.quality,
            producedDay: b.completionDay,
            expiryDay: b.completionDay + Math.round(shelfLife * csMult),
          };
        });

        // Spoilage, aging & value decay tick
        const { survivingItems, destroyedEvents, warningEvents } = tickProcessedInventory(
          [...(state.processedInventory ?? [])] as ProcessedItem[],
          newDay
        );
        if (destroyedEvents.length > 0) {
          destroyedEvents.forEach(ev => summary.push({ id: `spoil_${newDay}_${ev}`, icon: '???', title: ev, severity: 'danger' }));
        }
        if (warningEvents.length > 0) {
          warningEvents.forEach(ev => summary.push({ id: `warn_${newDay}_${ev}`, icon: '??', title: ev, severity: 'warning' }));
        }

        const finalProcessedInventory: ProcessedItem[] = [
          ...survivingItems,
          ...completedItems,
          ...(supervisorItem ? [supervisorItem] : []),
        ];

        const processedInventoryForSet = finalProcessedInventory;

        // ── Biogas upgrader income ────────────────────────────────────────────
        const hasBiogasUpgrader = (state.buildings ?? []).includes('bld_biogas_upgrader');
        let biogasIncome = 0;
        if (hasBiogasUpgrader) {
          const biogasAnimalCount = animals.filter((a: OwnedAnimal) =>
            ['vaca', 'bufalo', 'cabra', 'cerdo', 'oveja'].includes(a.typeId)
          ).length;
          if (biogasAnimalCount > 0) {
            if ((state.biogasMode ?? 'income') === 'fuel') {
              // Fuel mode: convert biogas to on-farm fuel instead of money
              const biogasFuelLitres = Math.round(biogasAnimalCount * 0.3);
              currentFuel += biogasFuelLitres;
              summary.push({
                id: `biogas_fuel_${newDay}`,
                icon: '⛽',
                title: `Biogas fuel +${biogasFuelLitres} L`,
                detail: `${biogasAnimalCount} animals producing biogas → free fuel`,
                severity: 'info' as const,
              });
            } else {
              // Income mode: sell biogas to grid
              biogasIncome = Math.round(biogasAnimalCount * 0.8);
              if (biogasIncome > 0) {
                summary.push({
                  id: `biogas_income_${newDay}`,
                  icon: '⚡',
                  title: `Biogas income +$${biogasIncome}`,
                  detail: `${biogasAnimalCount} animals producing biogas`,
                  severity: 'info' as const,
                });
              }
            }
          }
        }

        // ── Water system tick ──────────────────────────────────────────────────────

        // 1. Advance survey / drilling timers
        let updatedWells = (state.wells ?? []).map(well => {
          if (well.status === 'surveying' && newDay >= (well.surveyCompletesDay ?? Infinity)) {
            const spots = generateSurveySpots(well.parcelId, newDay);
            summary.push({
              id: `survey_${well.id}`,
              icon: '🔍',
              title: 'Hydrogeologist survey complete',
              detail: `${spots.length} drilling spots found. Check the Water tab.`,
              severity: 'info' as const,
            });
            return { ...well, status: 'survey_ready' as const, surveySpots: spots };
          }
          if (well.status === 'drilling' && newDay >= (well.drillingCompletesDay ?? Infinity)) {
            const spot = well.surveySpots?.find(s => s.id === well.chosenSpotId);
            if (!spot) return well;
            const success = Math.random() < spot.successProbability;
            if (success) {
              const depth = spot.approxDepthMin + Math.floor(Math.random() * (spot.approxDepthMax - spot.approxDepthMin + 1));
              const costPerMetre = 180 + Math.floor(Math.random() * 121);
              const actualCost = depth * costPerMetre;
              summary.push({
                id: `drill_ok_${well.id}`,
                icon: '💧',
                title: 'Well drilled successfully',
                detail: `${depth}m deep. Final cost: $${actualCost.toLocaleString()}. Install a pump to activate.`,
                severity: 'good' as const,
              });
              return { ...well, status: 'active' as const, actualDepth: depth, actualCost };
            } else {
              summary.push({
                id: `drill_fail_${well.id}`,
                icon: '🪨',
                title: 'Drilling failed · dry rock',
                detail: 'The team hit dry rock. Try a different spot or commission a new survey.',
                severity: 'warning' as const,
              });
              return { ...well, status: 'failed' as const };
            }
          }
          return well;
        });

        // Deduct any just-completed drilling costs
        let moneyAfterDrilling = state.money;
        updatedWells = updatedWells.map(well => {
          if (well.status === 'active' && well.actualCost !== undefined && !well.pumpTier) {
            // Only deduct once (if no pumpTier yet, the well just finished drilling this tick)
            const prevWell = (state.wells ?? []).find(w => w.id === well.id);
            if (prevWell?.status === 'drilling') {
              moneyAfterDrilling -= well.actualCost;
            }
          }
          return well;
        });

        // 2. Calculate farm pump demand and NPC draw
        const activePumpDemand = updatedWells
          .filter(w => w.status === 'active' && w.pumpTier)
          .reduce((sum, w) => sum + wellFlowRate(w, state.aquiferLevel), 0);

        const npcDailyDraw = 5 + Math.random() * 15;

        // 3. Advance aquifer
        const newAquifer = advanceAquifer(state.aquiferLevel ?? 75, {
          totalFarmDemandLhr: (state.gridWaterActive ?? false) ? 0 : activePumpDemand,
          npcDailyDraw,
          weatherEvent: todayWeather?.event ?? 'sunny',
          season,
        });

        // 4. Warn when aquifer drops below 20%
        if (newAquifer < 20 && (state.aquiferLevel ?? 75) >= 20) {
          summary.push({
            id: `aquifer_low_${newDay}`,
            icon: '⚠️',
            title: 'Aquifer critically low',
            detail: 'Underground water reserves are running low. Enable grid water in the Water tab.',
            severity: 'warning' as const,
          });
        }

        // 5. Grid water cost
        const irrigatedHa = (state.parcels ?? [])
          .filter(p => p.owned && p.irrigated)
          .reduce((sum, p) => sum + p.hectares, 0);
        const gridWaterCost = (state.gridWaterActive ?? false) ? irrigatedHa * (state.gridWaterDailyRate ?? 12) : 0;
        if (gridWaterCost > 0) moneyAfterDrilling -= gridWaterCost;

        const autoSellSalesEntries = autoSellLog.map(s => ({ day: newDay, amount: Math.round(s.revenue), category: 'crops' as const }));
        const deliverySalesEntries = deliveryRevenue > 0
          ? [{ day: newDay, amount: deliveryRevenue, category: 'crops' as const }]
          : [];

        // ── Co-op season/annual tick variables ────────────────────────────────
        let updatedCoopMemberships = { ...(state.coopMemberships ?? {}) } as typeof state.coopMemberships;
        let updatedCoopStates = { ...state.coopStates };
        let coopMoneyDelta = 0; // net money change from co-op events this tick

        // ── Co-op season-end delivery assessment ─────────────────────────────
        if (newDay % 90 === 0) {
          const coopIds: CoopId[] = ['grain', 'horticulture', 'livestock'];
          const currentSeasonNum = getCoopSeason(newDay);

          coopIds.forEach((coopId) => {
            const membership = updatedCoopMemberships[coopId];
            if (!membership) return;

            const shortfall = Math.max(0, membership.seasonObligation - membership.seasonDelivered);

            if (shortfall > 0) {
              const coopSt = updatedCoopStates[coopId];
              const firstItemPrice = Object.values(coopSt.poolPrices)[0] ?? 0;
              const recentOffences = membership.offenceHistory.filter(d => newDay - d < 3 * 360);

              if (recentOffences.length >= 1) {
                // Second offence within 3 years → expulsion
                const redemptionValue = membership.shares * membership.sharePrice * 0.5;
                coopMoneyDelta += redemptionValue;
                const { [coopId]: _expelled, ...restMemberships } = updatedCoopMemberships;
                updatedCoopMemberships = restMemberships as typeof updatedCoopMemberships;
                summary.push({
                  id: `coop_expelled_${coopId}_${newDay}`,
                  icon: '⚠️',
                  title: `${COOP_NAMES[coopId]}: Expelled for repeated delivery failure`,
                  detail: `Equity redeemed at 50% ($${Math.round(redemptionValue).toLocaleString()})`,
                  severity: 'danger',
                });
              } else {
                // First offence
                const penalty = shortfall * firstItemPrice * 1.20;
                coopMoneyDelta -= penalty;
                summary.push({
                  id: `coop_shortfall_${coopId}_${newDay}`,
                  icon: '⚠️',
                  title: `${COOP_NAMES[coopId]}: Delivery shortfall`,
                  detail: `Penalty $${Math.round(penalty).toLocaleString()}. Benefits suspended next season.`,
                  severity: 'warning',
                });
                updatedCoopMemberships = {
                  ...updatedCoopMemberships,
                  [coopId]: {
                    ...membership,
                    offenceHistory: [...membership.offenceHistory, newDay],
                    suspendedUntilSeason: currentSeasonNum + 1,
                    seasonDelivered: 0,
                    seasonObligation: 0,
                  },
                };
              }
            } else {
              // Met obligation · clear for next season
              updatedCoopMemberships = {
                ...updatedCoopMemberships,
                [coopId]: { ...membership, seasonDelivered: 0, seasonObligation: 0 },
              };
            }

            // Health delta
            const coopSt = updatedCoopStates[coopId];
            const offending = shortfall > 0 ? 1 : 0;
            const delta = calculateHealthDelta({
              totalMembers: coopSt.memberCount,
              membersFullyDelivered: shortfall === 0 ? coopSt.memberCount : coopSt.memberCount - 1,
              poolBelowFloor: false,
              membersLeft: 0,
              membersJoined: 0,
              poolPriceStrongVsSpot: false,
              equipmentVotePassed: false,
              offendingMembers: offending,
            });
            const newHealth = Math.max(0, Math.min(100, coopSt.health + delta));

            // Dissolution check
            const lowHealth = newHealth < 10;
            const consecutiveLow = lowHealth ? coopSt.consecutiveLowHealthSeasons + 1 : 0;
            let dissolvedUntilYear = coopSt.dissolvedUntilYear;
            if (consecutiveLow >= 2) {
              const currentYearNum = getYear(newDay);
              dissolvedUntilYear = currentYearNum + 3;
              const m = updatedCoopMemberships[coopId];
              if (m) {
                const redemption = m.shares * m.sharePrice * 0.4;
                coopMoneyDelta += redemption;
                const { [coopId]: _dissolved, ...restMbrs } = updatedCoopMemberships;
                updatedCoopMemberships = restMbrs as typeof updatedCoopMemberships;
                summary.push({
                  id: `coop_dissolved_${coopId}_${newDay}`,
                  icon: '💥',
                  title: `${COOP_NAMES[coopId]} has dissolved`,
                  detail: `Equity redeemed at 40% ($${Math.round(redemption).toLocaleString()})`,
                  severity: 'danger',
                });
              }
            }

            updatedCoopStates[coopId] = {
              ...coopSt,
              health: newHealth,
              consecutiveLowHealthSeasons: consecutiveLow,
              dissolvedUntilYear,
            };
          });

          // Pool price recalculation for next season
          coopIds.forEach((coopId) => {
            const coopSt = updatedCoopStates[coopId];
            const newPoolPrices: Record<string, number> = {};
            const allItems = [...(COOP_CROPS[coopId] ?? []), ...(COOP_ANIMALS[coopId] ?? [])];
            allItems.forEach((itemId) => {
              const history: number[] = (state.priceHistory as Record<string, number[]>)[itemId] ?? [];
              const avg = rollingAvg(history, 90);
              if (avg > 0) {
                newPoolPrices[itemId] = calculatePoolPrice(avg, coopSt.health, coopSt.terms.floorPct);
              }
            });
            updatedCoopStates[coopId] = { ...updatedCoopStates[coopId], poolPrices: newPoolPrices };
          });
        }

        // ── Co-op annual events ───────────────────────────────────────────────
        if (newDay % 360 === 0) {
          const coopIds: CoopId[] = ['grain', 'horticulture', 'livestock'];
          coopIds.forEach((coopId) => {
            const coopSt = updatedCoopStates[coopId];
            const membership = updatedCoopMemberships[coopId];
            if (!membership) return;

            // Annual fee per share
            const annualFee = membership.shares * coopSt.terms.annualFeePerShare;
            coopMoneyDelta -= annualFee;

            // Share price update
            const pctChange = calculateSharePriceDelta(coopSt.health);
            const newSharePrice = membership.sharePrice * (1 + pctChange);
            updatedCoopMemberships = {
              ...updatedCoopMemberships,
              [coopId]: { ...membership, sharePrice: newSharePrice },
            };

            // Dividend payout
            const estimatedProfit = Object.values(coopSt.poolPrices).reduce((a: number, b) => a + (b as number), 0) * 50;
            const dividend = calculateDividend(
              estimatedProfit,
              membership.seasonDelivered,
              membership.seasonDelivered * coopSt.memberCount,
              coopSt.terms.dividendPct,
              coopSt.health,
            );
            if (dividend > 0) {
              coopMoneyDelta += dividend;
              summary.push({
                id: `coop_dividend_${coopId}_${newDay}`,
                icon: '🌾',
                title: `${COOP_NAMES[coopId]} dividend: +$${Math.round(dividend).toLocaleString()}`,
                severity: 'good',
              });
            }

            // Process pending redemption if 1 full season has passed
            if (membership.pendingRedemption) {
              const seasonsElapsed = getCoopSeason(newDay) - getCoopSeason(membership.pendingRedemption.requestedDay);
              if (seasonsElapsed >= 1) {
                const mult = calculateRedemptionMultiplier(coopSt.health);
                const redemptionAmt = membership.shares * membership.sharePrice * mult;
                coopMoneyDelta += redemptionAmt;
                const { [coopId]: _redeemed, ...restMbrs } = updatedCoopMemberships;
                updatedCoopMemberships = restMbrs as typeof updatedCoopMemberships;
                updatedCoopStates[coopId] = {
                  ...coopSt,
                  memberCount: Math.max(1, coopSt.memberCount - 1),
                };
                summary.push({
                  id: `coop_redeemed_${coopId}_${newDay}`,
                  icon: '💰',
                  title: `${COOP_NAMES[coopId]}: Shares redeemed for $${Math.round(redemptionAmt).toLocaleString()}`,
                  severity: 'good',
                });
              }
            }
          });
        }

        // ── AGM trigger at start of spring (day 1, 361, 721, ··) ──────────────
        if (isStartOfSpring(newDay) && newDay > 1) {
          const coopIds: CoopId[] = ['grain', 'horticulture', 'livestock'];
          coopIds.forEach((coopId) => {
            if (!updatedCoopMemberships[coopId]) return;
            const coopSt = updatedCoopStates[coopId];
            if (coopSt.pendingAGM && !coopSt.pendingAGM.resolved) return;
            const proposal = generateAGMProposal(coopId, getCoopSeason(newDay), coopSt.health, coopSt.terms);
            updatedCoopStates[coopId] = { ...updatedCoopStates[coopId], pendingAGM: proposal };
            summary.push({
              id: `coop_agm_${coopId}_${newDay}`,
              icon: '📋',
              title: `${COOP_NAMES[coopId]} AGM`,
              detail: `Review the board's proposal in the Co-ops tab.`,
              severity: 'info',
            });
          });
        }

        // ── Electricity tick ─────────────────────────────────────────────────
        {
          const el = state.electricity;
          const todayEvent = (todayWeather?.event ?? 'sunny') as WeatherEvent;
          const season = getSeason(newDay);

          // Resolve pending grants
          const resolvedGrants = (el.pendingGrants ?? []).filter(g => g.dueDay <= newDay);
          const remainingGrants = (el.pendingGrants ?? []).filter(g => g.dueDay > newDay);
          for (const g of resolvedGrants) {
            finalMoney += g.amount;
            summary.push({
              id: `grant_${g.dueDay}`,
              icon: '💰',
              title: `${g.label} arrived: +$${g.amount.toLocaleString()}`,
              severity: 'good',
            });
          }

          // Outage: check if current outage has ended
          let outageActive = el.outageActive ?? false;
          let outageEndDay: number | null = el.outageEndDay ?? null;
          if (outageActive && outageEndDay !== null && newDay >= outageEndDay) {
            outageActive = false;
            outageEndDay = null;
            summary.push({ id: `outage_end_${newDay}`, icon: '⚡', title: 'Power restored · grid outage has ended.', severity: 'info' });
          }

          // Roll for new outage (only if not already in outage)
          if (!outageActive && rollOutage(todayEvent)) {
            const duration = rollOutageDuration();
            outageActive = true;
            outageEndDay = newDay + duration;
            summary.push({ id: `outage_start_${newDay}`, icon: '⚡', title: `Grid outage! Power cut for ~${duration} day(s). Activate diesel generator if available.`, severity: 'danger' });
          }

          // Generation sources
          const totalAnimals = (state.animals ?? []).length;
          const solarKw   = calcSolarOutput(el.solarPanelCount ?? 0, el.solarPanelHealth ?? 100, todayEvent, season);
          const windKw    = calcWindOutput(el.windTurbineCount ?? 0, el.windTurbineHealth ?? 100, todayEvent);
          const biogasKw  = calcBiogasOutput(totalAnimals, el.biogasPlantBuilt ?? false);
          const biomassKw = calcBiomassOutput(el.biomassCHPBuilt ?? false, el.biomassFuelDaysRemaining ?? 0);
          const genKw     = calcGeneratorOutput(el.generatorModel ?? null, el.generatorActive ?? false);
          const totalGenKw = solarKw + windKw + biogasKw + biomassKw + genKw;

          // Total demand from owned buildings
          const totalDemandKw = calcTotalDemand(state.buildings ?? []);

          // Battery charge/discharge
          let batteryChargeKwh = el.batteryChargeKwh ?? 0;
          const maxBatteryKwh  = (el.batteryBankCount ?? 0) * BATTERY_KWH_PER_BANK;

          let netKw = totalGenKw - totalDemandKw;
          if (netKw > 0 && maxBatteryKwh > 0) {
            batteryChargeKwh = chargeFromSurplus(netKw, batteryChargeKwh, maxBatteryKwh);
          } else if (netKw < 0 && batteryChargeKwh > 0) {
            const [used, newCharge] = dischargeForDeficit(-netKw, batteryChargeKwh, el.batteryHealthPercent ?? 100);
            batteryChargeKwh = newCharge;
            netKw += used;
          }

          // Grid import (0 if outage, capped by tier)
          const deficitKw      = Math.max(0, -netKw);
          const maxImportKw    = GRID_TIER_CONFIG[el.gridTier ?? 'basic']?.maxImportKw ?? 50;
          const actualImportKw = outageActive ? 0 : Math.min(deficitKw, maxImportKw);

          // Daily kWh accumulated for monthly bill
          const gridRateToday     = calcGridRateForSeason(el.gridRateBase ?? 0.14, season);
          const dailyKwhImported  = actualImportKw;
          const newMonthKwh       = (el.currentMonthKwhImported ?? 0) + dailyKwhImported;
          const newBillEstimate   = newMonthKwh * gridRateToday;

          // Monthly billing every 30 days
          let lastMonthBill         = el.lastMonthBill ?? 0;
          let billDueDay            = el.billDueDay ?? (newDay + 30);
          let billHistory           = [...(el.billHistory ?? [])];
          let gridTier              = el.gridTier ?? 'basic';
          let resetMonthAccumulator = false;

          if (newDay === billDueDay - 3 && newBillEstimate > 1) {
            summary.push({
              id: `elec_warn_${newDay}`,
              icon: '⚡',
              title: `Electricity bill ~$${Math.round(newBillEstimate)} due in 3 days`,
              severity: 'warning',
            });
          }

          if (newDay >= billDueDay) {
            const bill = Math.round(newBillEstimate);
            if (bill > 0) {
              if (finalMoney >= bill) {
                electricityBillDeduction = bill;
                summary.push({ id: `elec_bill_${newDay}`, icon: '⚡', title: `Electricity bill paid: $${bill.toLocaleString()}`, severity: 'info' });
              } else {
                const downgraded = prevGridTier(gridTier);
                if (downgraded) {
                  gridTier = downgraded;
                  summary.push({ id: `elec_nopower_${newDay}`, icon: '⚡', title: `Can't pay electricity bill ($${bill}) · grid downgraded to ${GRID_TIER_CONFIG[gridTier].label}`, severity: 'danger' });
                }
              }
            }
            lastMonthBill         = Math.round(newBillEstimate);
            billHistory           = [...billHistory.slice(-11), lastMonthBill];
            billDueDay            = newDay + 30;
            resetMonthAccumulator = true;
          }

          // Degradation
          let solarPanelHealth  = Math.max(0, (el.solarPanelHealth  ?? 100) - solarDegradationPerDay());
          let windTurbineHealth = Math.max(0, (el.windTurbineHealth ?? 100) - windDegradationPerDay());

          // Grid rate fluctuation: tiny daily drift
          let gridRateBase = (el.gridRateBase ?? 0.14) * (1 + (Math.random() - 0.5) * 0.002);
          gridRateBase = Math.max(0.10, Math.min(0.22, gridRateBase));

          // Lightning damage
          let damagedSources = [...(el.damagedSources ?? [])];
          if (rollLightningDamage(todayEvent, (el.surgeProtectedBuildings ?? []).includes('solar_array'))) {
            if ((el.solarPanelCount ?? 0) > 0 && !damagedSources.includes('solar')) {
              damagedSources.push('solar');
              solarPanelHealth = 0;
              summary.push({ id: `lightning_solar_${newDay}`, icon: '⚡', title: 'Lightning struck the solar array · repairs needed (Electrical Engineer)', severity: 'danger' });
            }
          }
          if (rollLightningDamage(todayEvent, (el.surgeProtectedBuildings ?? []).includes('wind_turbines'))) {
            if ((el.windTurbineCount ?? 0) > 0 && !damagedSources.includes('wind')) {
              damagedSources.push('wind');
              windTurbineHealth = 0;
              summary.push({ id: `lightning_wind_${newDay}`, icon: '⚡', title: 'Lightning struck the wind turbines · repairs needed (Electrical Engineer)', severity: 'danger' });
            }
          }

          // Biomass fuel countdown
          const biomassFuelDaysRemaining = (el.biomassCHPBuilt && (el.biomassFuelDaysRemaining ?? 0) > 0)
            ? (el.biomassFuelDaysRemaining ?? 0) - 1
            : (el.biomassFuelDaysRemaining ?? 0);
          if (el.biomassCHPBuilt && biomassFuelDaysRemaining === 0 && (el.biomassFuelDaysRemaining ?? 0) === 1) {
            summary.push({ id: `biomass_empty_${newDay}`, icon: '⚡', title: 'Biomass CHP fuel exhausted · load straw to resume power', severity: 'warning' });
          }

          // Generator fuel burn
          let generatorFuelLitres = el.generatorFuelLitres ?? 0;
          if ((el.generatorActive ?? false) && el.generatorModel) {
            generatorFuelLitres = Math.max(0, generatorFuelLitres - calcGeneratorFuelBurn(el.generatorModel));
            if (generatorFuelLitres === 0 && (el.generatorFuelLitres ?? 0) > 0) {
              summary.push({ id: `gen_empty_${newDay}`, icon: '⚡', title: 'Generator fuel empty · generator shut down', severity: 'warning' });
            }
          }
          const generatorActive = (el.generatorActive ?? false) && generatorFuelLitres > 0;

          newElectricity = {
            gridTier,
            gridRateBase,
            solarPanelCount:          el.solarPanelCount ?? 0,
            solarPanelHealth,
            solarLastServiceDay:      el.solarLastServiceDay ?? 0,
            windTurbineCount:         el.windTurbineCount ?? 0,
            windTurbineHealth,
            windLastServiceDay:       el.windLastServiceDay ?? 0,
            biogasPlantBuilt:         el.biogasPlantBuilt ?? false,
            biomassCHPBuilt:          el.biomassCHPBuilt ?? false,
            biomassFuelDaysRemaining,
            heatPipeNetworkBuilt:     el.heatPipeNetworkBuilt ?? false,
            batteryBankCount:         el.batteryBankCount ?? 0,
            batteryChargeKwh,
            batteryHealthPercent:     el.batteryHealthPercent ?? 100,
            batteryLastServiceDay:    el.batteryLastServiceDay ?? 0,
            generatorModel:           el.generatorModel ?? null,
            generatorFuelLitres,
            generatorActive,
            currentMonthKwhImported:  resetMonthAccumulator ? 0 : newMonthKwh,
            currentMonthBillEstimate: resetMonthAccumulator ? 0 : newBillEstimate,
            lastMonthBill,
            billDueDay,
            billHistory,
            outageActive,
            outageEndDay,
            solarGrantClaimed:        el.solarGrantClaimed ?? false,
            windGrantClaimed:         el.windGrantClaimed ?? false,
            pendingGrants:            remainingGrants,
            surgeProtectedBuildings:  el.surgeProtectedBuildings ?? [],
            damagedSources,
          };
        }
        // End electricity tick

        // -- Selling Channels tick ------------------------------------------------
        let sellingRevenue = 0;
        let newReputation = state.reputation ?? 0;
        let newReputationHistory = [...(state.reputationHistory ?? [])];
        let newAwardHistory = [...state.awardHistory];
        let newProductAwardBonuses = { ...state.productAwardBonuses };
        let newRestaurantContracts = [...state.restaurantContracts];
        let newVegBoxSubscribers = [...state.vegBoxSubscribers];
        let newOnlineShopAllocations = { ...state.onlineShopAllocations };

        const { calcShopVisitors, calcShopPrice, wholesalePrice, calcOnlineOrders, calcCafeRevenue, VEG_BOX_TIERS } = require('../engine/sellingChannels');
        const dayOfWeek = (newDay - 1) % 7;

        // 1. Farm Shop
        if (state.farmShop.tier > 0) {
          const isOpen = state.farmShop.openDays[dayOfWeek];
          const hasWorker = state.farmShop.assignedWorkerIds.length > 0;
          if (isOpen && hasWorker) {
            const visitors = calcShopVisitors(state.farmShop.tier, season, dayOfWeek, newReputation, state.farmShop.openHours);
            // Sell to visitors from inventory
            const inventoryItems = Object.entries(state.inventory).filter(([_, qty]) => qty > 0);
            if (inventoryItems.length > 0) {
              for (let v = 0; v < visitors; v++) {
                const [itemId, qty] = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
                if ((state.inventory[itemId] ?? 0) > 0) {
                  const crop = CROP_TYPES.find(c => c.id === itemId);
                  const basePrice = state.prices.find(p => p.cropId === itemId)?.price ?? (crop?.basePrice ?? 10);
                  const quality = state.cropQualityMap?.[itemId] ?? 50;
                  const price = calcShopPrice(basePrice, quality, newReputation, newProductAwardBonuses[itemId] ?? 0);
                  newOnlineShopAllocations[itemId] = (newOnlineShopAllocations[itemId] ?? 0) - 1;
                  sellingRevenue += price;
                }
              }
            }
          }
        }

        // 2. Restaurant contracts delivery
        for (const rc of newRestaurantContracts) {
          if (newDay >= rc.nextDeliveryDay) {
            const inStock = state.inventory[rc.productId] ?? 0;
            const delivered = Math.min(inStock, rc.quantityPerCycle);
            if (delivered >= rc.quantityPerCycle) {
              newReputation += 0.5;
              sellingRevenue += delivered * rc.pricePerUnit;
              newOnlineShopAllocations[rc.productId] = (newOnlineShopAllocations[rc.productId] ?? 0) - delivered;
            } else {
              newReputation -= 3;
              summary.push({ id: `rest_fail_${rc.id}`, icon: '???', title: `Restaurant contract failed`, detail: `Short delivery to ${rc.buyerName}`, severity: 'danger' });
            }
            rc.nextDeliveryDay += rc.cycleDays;
          }
        }

        // 3. Veg box weekly delivery (every 7 days)
        if (newDay % 7 === 0 && state.vegBoxSubscribers.length > 0) {
          for (const sub of state.vegBoxSubscribers) {
            const tier = VEG_BOX_TIERS[sub.tier];
            const weeklyRevenue = sub.count * tier.weeklyFee;
            sellingRevenue += weeklyRevenue;
          }
        }

        // 4. Online shop daily orders
        if (state.onlineShopActive && state.farmShop.tier >= 2) {
          const onlineItems = Object.entries(state.onlineShopAllocations).filter(([_, qty]) => qty > 0);
          const orders = calcOnlineOrders(newReputation, onlineItems.length);
          for (let o = 0; o < orders; o++) {
            const [itemId, qty] = onlineItems[Math.floor(Math.random() * onlineItems.length)];
            if ((state.onlineShopAllocations[itemId] ?? 0) > 0) {
              const crop = CROP_TYPES.find(c => c.id === itemId);
              const basePrice = state.prices.find(p => p.cropId === itemId)?.price ?? (crop?.basePrice ?? 10);
              const quality = state.cropQualityMap?.[itemId] ?? 50;
              const price = calcShopPrice(basePrice, quality, newReputation, newProductAwardBonuses[itemId] ?? 0);
              newOnlineShopAllocations[itemId] = (newOnlineShopAllocations[itemId] ?? 0) - 1;
              sellingRevenue += price;
            }
          }
        }

        // 5. Farm caf·
        if (state.farmCafeOpen && state.farmShop.tier >= 3) {
          const hasCafeWorker = state.farmCafeWorkerIds.length > 0;
          if (hasCafeWorker) {
            const visitors = calcShopVisitors(1, season, dayOfWeek, newReputation, 8);
            const cafeRev = calcCafeRevenue(visitors, 12, 60);
            sellingRevenue += cafeRev;
          }
        }

        // 6. Reputation decay (weekly)
        if (newDay % 7 === 0) {
          const eventsThisWeek = newReputationHistory.filter(h => h.day >= newDay - 7).length;
          if (eventsThisWeek === 0) {
            newReputation = Math.max(0, newReputation - 0.05);
          }
        }
        newReputation = Math.min(100, Math.max(0, newReputation));

        set({
          day: newDay,
          wells: updatedWells,
          aquiferLevel: newAquifer,
          showWindowOpen,
          showEntries: season !== prevSeason
            ? (state.showEntries ?? []).filter(e => {
                const prevStart = state.day - ((state.day - 1) % 90);
                return e.seasonKey !== `${prevSeason}_${prevStart}`;
              })
            : (state.showEntries ?? []),
          showResults: season !== prevSeason
            ? [...(state.showResults ?? []), ...newShowResults].slice(-40)
            : (state.showResults ?? []),
          forecast,
          todayWeather,
          prices,
          priceHistory,
          savings,
          loans,
          loanHistory,
          salesLog: [...salesLog, ...autoSellSalesEntries, ...alertSalesEntries, ...deliverySalesEntries],
          pendingPickup: newPendingPickup,
          priceAlerts,
          parcels: foreclosureParcels.length > 0
            ? [...finalParcels, ...foreclosureParcels]
            : finalParcels,
          fieldEvents,
          newsEvents,
          activeFair,
          listings: trimmedListings,
          nextAnimalAuctionDay,
          animals: [...animals, ...auctionAnimalAdditions],
          machines: [...(state.machines ?? []), ...auctionMachineAdditions],
          daySummary: summary,
          timeDeposits,
          insuranceClaims: [...state.insuranceClaims, ...newClaims].slice(-100),
          contracts,
          ...(() => {
            const { contracts: updatedRecurring, buyers: updatedBuyers } =
              checkRecurringDeliveries(get().recurringContracts, get().buyers, newDay);
            return { recurringContracts: updatedRecurring, buyers: updatedBuyers };
          })(),
          declinedTemplates,
          completedMilestones,
          futures,
          inventory: Object.fromEntries(
            Object.keys({ ...harvestInventory, ...auctionInventoryDelta }).map(k => [
              k, Math.max(0, (harvestInventory[k] ?? 0) + (auctionInventoryDelta[k] ?? 0)),
            ])
          ),
          animalInventory,
          grainMissedDays: newGrainMissed,
          hayMissedDays: newHayMissed,
          silageLevel: newSilageLevel,
          incubationQueue: newIncubationQueue,
          slurryLevel: newSlurryLevel,
          slurryCapacity: newSlurryCapacity,
          productionBuildings: newProductionBuildings,
          animalWelfareScores: newWelfareScores,
          milkGrades: newMilkGrades,
          animalsManuallyFed: false,
          henilQueue: updatedHenilQueue,
          harvestedCropIds: harvestedCropIdsForSet,
          bankrupt: isBankrupt || state.bankrupt,
          sellPressures,
          processedInventory: processedInventoryForSet,
          activeBatches: remainingActiveBatches,
          seedVault: nextSeedVault,
          hybridJobs: nextHybridJobs,
          activeEvents,
          machineRepairs,
          npcFarms,
          mapFields,
          rivalNews: [...rivalNewsItems, ...(state.rivalNews ?? [])].slice(0, 30),
          seasonalEvent,
          animalPrices,
          priceMomentum: newPriceMomentum,
          priceHistory15d: newPriceHistory15d,
          activeShocks,
          npcProductionMultipliers: newNpcProductionMultipliers,
          npcPriceSignalDays: newNpcPriceSignalDays,
          tractorJobs: remainingTractorJobs,
          harvestJobs: updatedHarvestJobs,
          deliveryJobs: updatedDeliveryJobs,
          fuel: Math.min(getFuelCapacity(state.buildings), currentFuel + fuelFromReturnLoads),
          fuelPrice: newFuelPrice,
          marketOrders: updatedMarketOrders,
          totalRevenue: (state.totalRevenue ?? 0) + autoSellIncome + alertSellIncome + marketOrderIncome + deliveryRevenue,
          personalRecords: {
            peakMoney: Math.max(state.personalRecords?.peakMoney ?? 0, finalMoney),
            totalHarvests: state.personalRecords?.totalHarvests ?? 0,
            bestSeasonRevenue: state.personalRecords?.bestSeasonRevenue ?? 0,
            longestDay: Math.max(state.personalRecords?.longestDay ?? 0, newDay),
          },
          ...(latestMilestonePopup ? { milestonePopup: latestMilestonePopup } : {}),
          ...(newSeasonGoals ? {
            seasonGoals: newSeasonGoals,
            seasonGoalSeason: newSeasonGoalSeason!,
            seasonStartMoney: newSeasonStartMoney,
            seasonStartRevenue: newSeasonStartRevenue,
            seasonHarvestCount: 0,
          } : {}),
          coopMemberships: updatedCoopMemberships,
          coopStates: updatedCoopStates,
          workers: finalWorkers,
          pendingRequests: newPendingRequests,
          reputation: newReputation,
          reputationHistory: newReputationHistory,
          farmShop: state.farmShop,
          restaurantContracts: newRestaurantContracts,
          vegBoxSubscribers: newVegBoxSubscribers,
          onlineShopActive: state.onlineShopActive,
          onlineShopAllocations: newOnlineShopAllocations,
          farmCafeOpen: state.farmCafeOpen,
          farmCafeWorkerIds: state.farmCafeWorkerIds,
          awardHistory: newAwardHistory,
          productAwardBonuses: newProductAwardBonuses,
          money: state.money + sellingRevenue + showPrizeMoney + deliveryRevenue - deliveryRepairCost - productionBuildingContractorFees - slurryFine - disposalFee + biogasIncome + (moneyAfterDrilling - state.money) + coopMoneyDelta - electricityBillDeduction,
        });
      },

      advanceDays: (n: number) => {
        // Stop early if bankrupt mid-run
        for (let i = 0; i < n; i++) {
          if (get().bankrupt) break;
          // Suppress day summary for all but the last iteration
          get().advanceDay();
          if (i < n - 1) {
            set({ daySummary: null });
          }
        }
      },

      buyParcel: (parcelId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || parcel.owned) return;
        const cost = parcel.pricePerHa * parcel.hectares;
        if (state.money < cost) return;
        // Sync mapFields: parcel IDs for map fields are p-${mapFieldId}
        const mapFieldId = parcelId.startsWith('p-mf-') ? parcelId.slice(2) : null;
        set({
          money: state.money - cost,
          parcels: state.parcels.map(p => p.id === parcelId ? { ...p, owned: true } : p),
          mapFields: mapFieldId
            ? state.mapFields.map(f =>
                f.id === mapFieldId ? { ...f, owner: 'player' as MapOwner, parcelId } : f
              )
            : state.mapFields,
        });
      },

      plantCrop: (parcelId, cropId, hectares) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.owned || parcel.plantedCrop) return;
        if (!parcel.tilled) return;
        const cropType = CROP_TYPES.find(c => c.id === cropId);
        if (!cropType) return;
        const currentSeason = getSeason(state.day);
        if (!cropType.seasons.includes(currentSeason) && !parcel.greenhouse) return;
        const coopSeedDiscount = (() => {
          const coopId = getCoopForCrop(cropId);
          if (!coopId) return 1.0;
          const m = state.coopMemberships[coopId];
          if (!m || isMemberSuspended(m, getCoopSeason(state.day))) return 1.0;
          return 1.0 - getSeedDiscount(coopId);
        })();
        const seedCost = cropType.seedCost * hectares * coopSeedDiscount;
        if (state.money < seedCost) return;
        const plantedCrop: PlantedCrop = { cropId, parcelId, plantedDay: state.day, hectares };
        set({
          money: state.money - seedCost,
          parcels: state.parcels.map(p => p.id === parcelId ? { ...p, plantedCrop } : p),
          firstMissionStep: state.firstMissionStep === 0 ? 1 : state.firstMissionStep,
        });
      },

      harvestCrop: (parcelId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.plantedCrop) return;
        const crop = parcel.plantedCrop;
        const cropType = CROP_TYPES.find(c => c.id === crop.cropId);
        if (!cropType) return;
        // Cover crop guard: apply soil benefits and exit without adding inventory
        const isCoverCrop = !!(cropType as any)?.coverCrop;
        if (isCoverCrop) {
          const benefits = COVER_CROP_BENEFITS[crop.cropId] ?? {};
          const oldSoil = parcel.soil ?? SOIL_DEFAULTS;
          set({
            parcels: state.parcels.map(p => p.id === parcelId
              ? {
                  ...p,
                  plantedCrop: null,
                  cropHistory: [...(parcel.cropHistory ?? []).slice(-3), crop.cropId],
                  soil: {
                    ...oldSoil,
                    nitrogen:      Math.min(100, oldSoil.nitrogen + (benefits.nitrogen ?? 0)),
                    organicMatter: Math.min(10,  oldSoil.organicMatter + (benefits.organicMatter ?? 0)),
                    compaction:    Math.max(0,   oldSoil.compaction - (benefits.compactionReduction ?? 0)),
                    microbialLife: Math.min(100, oldSoil.microbialLife + (benefits.microbialLife ?? 0)),
                  },
                }
              : p
            ),
          });
          return;
        }
        // Seed genes for this parcel
        const seedEntry = parcel.seedEntryId
          ? state.seedVault.find(s => s.id === parcel.seedEntryId)
          : undefined;
        const seedGenes = seedEntry?.genes ?? { yield: 1, drought: 1, growth: 1, quality: 1 };
        const effectiveGrowthDays = Math.round(cropType.growthDays / seedGenes.growth);
        if (state.day < crop.plantedDay + effectiveGrowthDays) return;
        // Worker bonuses apply to manual harvest too
        const workerBonusesManual = getWorkerBonuses(state.workers ?? []);
        // Silo cap
        const siloCapacity = getSiloCapacity(state.buildings);
        const totalInventory = Object.values(state.inventory).reduce((a, b) => a + b, 0);
        if (totalInventory >= siloCapacity) return; // storage full
        const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
        // Water need scales how much weather helps or hurts this crop (1=immune, 5=full effect)
        const waterScale = (cropType.waterNeed ?? 3) / 5;
        const rawClimateDelta = (baseClimate - 1.0) * waterScale;
        // Drought gene reduces penalty when weather is bad (delta < 0); no effect on bonuses
        const droughtScale = rawClimateDelta < 0 ? 1.0 / seedGenes.drought : 1.0;
        const climateModifier = 1.0 + rawClimateDelta * droughtScale;
        const { harvestAmount } = require('../engine/crops');
        const rawUnits = harvestAmount(crop, cropType, parcel.soil ?? SOIL_DEFAULTS, climateModifier, parcel.hasWeeds, 1.0, crop.frostDamage ?? 0, crop.droughtStress ?? 0) * pestYieldModifier(parcel.pestState?.severity ?? 0);
        // Field event penalty: −25% yield per unresolved disease/pest event
        const unresolvedEvents = state.fieldEvents.filter(e => e.parcelId === parcelId && !e.resolved).length;
        const fieldEventMod = Math.pow(0.75, unresolvedEvents);
        // Water Tower: +5% yield (improved irrigation access)
        const waterBonus = hasWaterTower(state.buildings) ? 1.05 : 1.0;
        // Crop rotation bonus: +15% if different crop from last harvest on this parcel
        const rotationMod = parcel.lastCropId && parcel.lastCropId !== crop.cropId ? 1.15 : 1.0;
        // Irrigation: +20% yield
        const irrigationBonus = parcel.irrigated ? 1.20 : 1.0;
        // Soil type affinity
        const soilMod = getSoilModifier(parcel.soilType, crop.cropId);
        const randomEventMod = getHarvestModifier(state.activeEvents ?? [], parcelId, crop.cropId);
        const diseaseMod = parcel.diseased ? 0.80 : 1.0;
        const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationBonus * soilMod * seedGenes.yield * randomEventMod * workerBonusesManual.cropYieldMultiplier * diseaseMod), siloCapacity - totalInventory);
        // Update quality map and consume seed batch
        const nextCropQualityMap = { ...state.cropQualityMap };
        if (seedEntry) {
          nextCropQualityMap[crop.cropId] = seedGenes.quality;
        }
        const nextSeedVaultAfterHarvest = seedEntry
          ? state.seedVault.map(s => s.id === parcel.seedEntryId ? { ...s, quantity: s.quantity - 1 } : s).filter(s => s.quantity > 0)
          : state.seedVault;
        const harvestedCropIds = state.harvestedCropIds.includes(crop.cropId)
          ? state.harvestedCropIds
          : [...state.harvestedCropIds, crop.cropId];
        const newFertility = Math.max(1, parcel.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonusesManual.fertilityDrainMult));
        const oldSoil = parcel.soil ?? SOIL_DEFAULTS;
        const newSoilP = Math.max(0, oldSoil.phosphorus ?? 60) - (cropType.phosphorusDrain ?? 0) * crop.hectares * 0.1;
        const newSoilK = Math.max(0, oldSoil.potassium  ?? 60) - (cropType.potassiumDrain  ?? 0) * crop.hectares * 0.1;
        const soilAfterHarvest: SoilStats = { ...oldSoil, phosphorus: Math.max(0, newSoilP), potassium: Math.max(0, newSoilK) };
        // co-op delivery obligation
        let newCoopMemberships = state.coopMemberships;
        const harvestCoopId = getCoopForCrop(crop.cropId);
        if (harvestCoopId) {
          const coopMembership = state.coopMemberships[harvestCoopId];
          if (coopMembership && !isMemberSuspended(coopMembership, getCoopSeason(state.day))) {
            const coopStateForHarvest = state.coopStates[harvestCoopId];
            const obligation = Math.round(units * (coopStateForHarvest.terms.deliveryPct / 100));
            newCoopMemberships = {
              ...state.coopMemberships,
              [harvestCoopId]: {
                ...coopMembership,
                seasonObligation: coopMembership.seasonObligation + obligation,
              },
            };
          }
        }
        set({
          parcels: state.parcels.map(p => p.id === parcelId
            ? { ...p, plantedCrop: null, lastCropId: crop.cropId, fertility: newFertility, soil: soilAfterHarvest, seedEntryId: undefined, diseased: false, diseasedDay: undefined, cropHistory: [...(parcel.cropHistory ?? []).slice(-3), crop.cropId] }
            : p
          ),
          inventory: { ...state.inventory, [crop.cropId]: (state.inventory[crop.cropId] ?? 0) + units },
          harvestedCropIds,
          cropQualityMap: nextCropQualityMap,
          seedVault: nextSeedVaultAfterHarvest,
          coopMemberships: newCoopMemberships,
          firstMissionStep: state.firstMissionStep === 1 ? 2 : state.firstMissionStep,
          seasonHarvestCount: (state.seasonHarvestCount ?? 0) + 1,
          personalRecords: {
            ...(state.personalRecords ?? {}),
            peakMoney: state.personalRecords?.peakMoney ?? 0,
            totalHarvests: (state.personalRecords?.totalHarvests ?? 0) + 1,
            bestSeasonRevenue: state.personalRecords?.bestSeasonRevenue ?? 0,
            longestDay: state.personalRecords?.longestDay ?? state.day,
          },
        });
      },

      sellCrop: (cropId, units, marketId) => {
        const state = get();
        const inStock = state.inventory[cropId] ?? 0;
        const toSell = Math.min(units, inStock);
        if (toSell <= 0) return;

        // Regional market
        const activeMarketId = marketId ?? state.selectedMarket ?? 'local';
        const region = MARKET_REGIONS.find(r => r.id === activeMarketId) ?? MARKET_REGIONS[0];
        const price = state.prices.find(p => p.cropId === cropId)?.price ?? 0;
        const effectivePrice = price * region.priceMultiplier;
        const transportCost  = Math.round(toSell * region.transportCostPerUnit);

        const secaderoBonus  = hasSecadero(state.buildings) ? 1.05 : 1.0;
        const coopBonus      = 1.0;
        const prestigeBonus  = 1 + 0.05 * (state.prestige ?? 0);
        const grossRevenue   = sellRevenue(toSell, effectivePrice) * secaderoBonus * coopBonus * prestigeBonus;
        const revenue        = Math.max(0, Math.round(grossRevenue - transportCost));

        // Sell pressure: large sales depress price for several days
        const pressureMod = computeSellPressureModifier(toSell);
        const newPressures = pressureMod < 1.0
          ? [
              ...(state.sellPressures ?? []).filter(sp => sp.cropId !== cropId),
              { cropId, modifier: pressureMod, expiresDay: state.day + sellPressureDuration(toSell) },
            ]
          : (state.sellPressures ?? []);

        set({
          money: state.money + revenue,
          inventory: { ...state.inventory, [cropId]: inStock - toSell },
          salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'crops' }],
          totalRevenue: state.totalRevenue + revenue,
          sellPressures: newPressures,
          firstMissionStep: state.firstMissionStep === 2 ? 3 : state.firstMissionStep,
        });
      },

      buyAnimal: (typeId, sex) => {
        const state = get();
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === typeId);
        if (!animalType || state.money < animalType.buyCost) return;
        // Species isolation: only one species per enclosure type
        const enclosureOccupant = state.animals.find((a: OwnedAnimal) => {
          const at = ANIMAL_TYPES.find((t: any) => t.id === a.typeId);
          return at?.enclosureType === animalType.enclosureType;
        });
        if (enclosureOccupant && enclosureOccupant.typeId !== typeId) return;
        // Check building capacity (count only same species)
        const capacity = getEnclosureCapacity(state.buildings, animalType.enclosureType);
        const currentCount = state.animals.filter((a: OwnedAnimal) => a.typeId === typeId).length;
        if (currentCount >= capacity) return; // no room
        const fairMult = state.activeFair ? (1 - state.activeFair.discount) : 1.0;
        // Males are 70% of female price (no production)
        const sexMult = sex === 'male' ? 0.7 : 1.0;
        const cost = Math.round(animalType.buyCost * fairMult * sexMult);
        if (state.money < cost) return;
        // Dairy animals (cows & goats) arrive already freshened · mid-lactation adult
        const isDairy = typeId === 'vaca' || typeId === 'cabra' || typeId === 'bufalo';
        const freshenOffset = isDairy ? Math.floor(Math.random() * 120 + 30) : 0;
        // born far enough in the past to be mature + freshened
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
        if (activeCount >= 2) return; // max 2 concurrent batches
        const grassAvailable = state.inventory['grass'] ?? 0;
        if (grassAvailable <= 0) return;
        const batchKg = Math.min(grassAvailable, 700); // 700 kg batch cap
        const batch: HenilBatch = {
          batchId: `henil_${Date.now()}`,
          wetGrassKg: batchKg,
          startDay: state.day,
          readyDay: state.day + 3,
        };
        set({
          henilQueue: [...(state.henilQueue ?? []), batch],
          inventory: { ...state.inventory, grass: grassAvailable - batchKg },
        });
      },

      feedAnimals: () => {
        // Manual feeding button · only available when no animal worker.
        // Sets flag so advanceDay knows animals were fed today.
        const state = get();
        const hasAnimalWorker = (state.workers ?? []).some(
          (w: Worker) => w.role === 'livestock_hand' || w.role === 'veterinarian'
        );
        if (hasAnimalWorker) return; // worker handles it automatically
        set({ animalsManuallyFed: true });
      },

      sellAnimal: (animalId) => {
        const state = get();
        const animal = state.animals.find(a => a.id === animalId);
        if (!animal) return;
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
        const { sellValue, getBreedPurebredMultiplier } = require('../engine/animals');
        const { BREED_TYPES } = require('../data/breedTypes');
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
        delete nextPairs[animalId]; // in case she was a female with a preferred pair
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

      breedAnimal: (animalId) => {
        const state = get();
        const animal = state.animals.find((a: OwnedAnimal) => a.id === animalId);
        if (!animal || animal.sex !== 'female') return;
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
        if (!animalType) return;
        const { canBreed, isMature, inheritTrait, breedAnimalGenes } = require('../engine/animals');
        const { BREED_TYPES } = require('../data/breedTypes');
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
        const offspringTraits = Array.from(new Set([maternalTrait, paternalTrait].filter(Boolean))) as import('../engine/animals').AnimalTrait[];
        const offspringSex: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';

        const motherParents = animal.parentIds;
        const fatherParents = father?.parentIds;
        // Grandparents recorded only when both parents have known lineage.
        // Partial lineage (one side unknown) is intentionally omitted · simplifies UI display.
        const grandparentIds: [string, string, string, string] | undefined =
          (motherParents && fatherParents)
            ? [motherParents[0], motherParents[1], fatherParents[0], fatherParents[1]]
            : undefined;

        // Prefer sire pen animal of same species
        const hasSirePen = state.buildings.includes('bld_sire_pen');
        const sirePenIds = state.sirePenAnimalIds ?? [];
        const sirePenMale = (state.animals ?? []).find(
          (a: OwnedAnimal) => {
            if (!sirePenIds.includes(a.id)) return false;
            if (a.typeId !== animal.typeId) return false;
            if (a.sex !== 'male') return false;
            // Check maturity using same method as existing father selection
            const sirePenAnimalType = ANIMAL_TYPES.find((t: any) => t.id === a.typeId);
            if (!sirePenAnimalType) return false;
            const matureDays = (sirePenAnimalType as any).maturityDays ?? 0;
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
        // Otherwise offspring is Mixed (no breedId, no crossbreedParents)

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

        // Calving pen mortality reduction
        const CALVING_SPECIES = new Set(['vaca', 'cabra', 'bufalo', 'cerdo']);
        if (CALVING_SPECIES.has(offspring.typeId)) {
          const calvingCap = ['bld_calving_pen_s', 'bld_calving_pen_m', 'bld_calving_pen_l']
            .reduce((cap, bid) => {
              const bt = BUILDING_TYPES.find(b => b.id === bid);
              return state.buildings.includes(bid) ? cap + (bt?.capacity ?? 0) : cap;
            }, 0);
          const mortalityChance = calvingCap > 0 ? 0.05 : 0.25;
          if (Math.random() < mortalityChance) {
            // Offspring did not survive · abort
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
                // Reset lactation: giving birth starts a new lactation window
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
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
        if (!animalType) return {};

        const MEAT_SPECIES = new Set(['cerdo', 'conejo', 'vaca', 'oveja', 'cabra', 'pavo', 'bufalo']);
        let moneyGain = 0;

        if (MEAT_SPECIES.has(animal.typeId)) {
          const DRESS_YIELDS: Record<string, { weightKg: number; dressPercent: number }> = {
            vaca:   { weightKg: 550, dressPercent: 0.60 },
            bufalo: { weightKg: 480, dressPercent: 0.57 },
            cerdo:  { weightKg: 110, dressPercent: 0.75 },
            oveja:  { weightKg: 55,  dressPercent: 0.50 },
            cabra:  { weightKg: 45,  dressPercent: 0.48 },
            conejo: { weightKg: 2.5, dressPercent: 0.55 },
            pavo:   { weightKg: 12,  dressPercent: 0.80 },
          };
          const spec = DRESS_YIELDS[animal.typeId];
          if (spec) {
            const { isMature } = require('../engine/animals');
            const ageFraction = isMature(animal, animalType, state.day)
              ? Math.min(1, (state.day - animal.bornDay) / animalType.maxPriceAge)
              : 0.4;
            const meatKg = spec.weightKg * spec.dressPercent * ageFraction * (animal.genes?.value ?? 1.0);
            const meatPrice = (state.prices ?? []).find((p: any) => p.cropId === 'meat')?.price ?? 4.50;
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

      enterAnimalShow: (animalId) => {
        const state = get();
        if (!state.showWindowOpen) return;
        const { getSeason } = require('../engine/climate');
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
        const { getSeason } = require('../engine/climate');
        const season = getSeason(state.day);
        const seasonKey = `${season}_${state.day - ((state.day - 1) % 90)}`;
        const entry = state.showEntries.find(e => e.seasonKey === seasonKey && e.animalId === animalId);
        const refund = entry ? Math.round(entry.entryFee * 0.5) : 0;
        set({
          money: state.money + refund,
          showEntries: state.showEntries.filter(e => !(e.seasonKey === seasonKey && e.animalId === animalId)),
        });
      },

      startHybridization: (cropId, parentAId, parentBId) => {
        const state = get();

        // Check lab exists
        const labLevel = state.buildings.includes('bld_seed_lab_3') ? 3
          : state.buildings.includes('bld_seed_lab_2') ? 2
          : state.buildings.includes('bld_seed_lab_1') ? 1
          : 0;
        if (labLevel === 0) return;

        // Check slot availability
        const maxSlots = labLevel;
        const activeJobs = state.hybridJobs.length;
        if (activeJobs >= maxSlots) return;

        const parentA = state.seedVault.find(s => s.id === parentAId);
        const parentB = state.seedVault.find(s => s.id === parentBId);
        if (!parentA || !parentB) return;
        if (parentAId === parentBId) return;
        if (parentA.cropId !== cropId || parentB.cropId !== cropId) return;
        if (parentA.quantity < 1 || parentB.quantity < 1) return;

        const generation = Math.max(parentA.generation, parentB.generation) + 1;
        const cost = Math.min(200 * generation, 2000);
        if (state.money < cost) return;

        const durationDays = labLevel === 3 ? 7 : labLevel === 2 ? 10 : 14;

        const job: HybridJob = {
          id: `hybrid_${Date.now()}`,
          cropId,
          parentAId,
          parentBId,
          startDay: state.day,
          readyDay: state.day + durationDays,
          cost,
        };

        // Consume one batch from each parent
        const nextVault = state.seedVault
          .map(s => s.id === parentAId || s.id === parentBId ? { ...s, quantity: s.quantity - 1 } : s)
          .filter(s => s.quantity > 0);

        set({
          money: state.money - cost,
          hybridJobs: [...state.hybridJobs, job],
          seedVault: nextVault,
        });
      },

      selectSeedForParcel: (parcelId, seedEntryId) => {
        set(state => ({
          parcels: state.parcels.map(p =>
            p.id === parcelId ? { ...p, seedEntryId: seedEntryId ?? undefined } : p
          ),
        }));
      },

      startRepair: (machineId) => {
        const state = get();
        const repair = (state.machineRepairs ?? []).find(
          r => r.machineId === machineId && r.startDay === null
        );
        if (!repair) return; // no pending repair for this machine
        const repairDays = calcRepairDays(state.workers ?? []);
        const totalCost = Math.max(0, repair.cost - repair.insurancePaid);
        if (state.money < totalCost) return;
        set({
          money: state.money - totalCost,
          machineRepairs: (state.machineRepairs ?? []).map(r =>
            r.machineId === machineId && r.startDay === null
              ? { ...r, startDay: state.day, readyDay: state.day + repairDays }
              : r
          ),
        });
      },

      collectAnimalProduction: (animalId) => {
        const state = get();
        const animal = state.animals.find(a => a.id === animalId);
        if (!animal) return;
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
        const { collectProduction } = require('../engine/animals');
        const { units, nextDay } = collectProduction(
          animal,
          animalType,
          state.day,
          state.grainMissedDays ?? 0,
          state.hayMissedDays ?? 0,
        );
        if (units <= 0 || !animalType.productionType) return;
        // Granero: +20% animal production (improved feeding and shelter)
        const graneroBonus = hasGranero(state.buildings) ? 1.2 : 1.0;
        const totalUnits = Math.round(units * graneroBonus);

        // Cream separator: 10% of milk output becomes cream (remaining 90% stays as milk)
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

      sellAnimalProduct: (productType, units) => {
        const state = get();
        // Milk grade multiplier · dairy products only
        const DAIRY_PRODUCT_SPECIES: Record<string, string> = {
          milk: 'vaca',
          goat_milk: 'cabra',
          buffalo_milk: 'bufalo',
        };
        const speciesForProduct = DAIRY_PRODUCT_SPECIES[productType];
        const grade = speciesForProduct
          ? ((state.milkGrades ?? {})[speciesForProduct] ?? 'B')
          : null;

        // Grade C milk is rejected by city and export markets
        if (grade === 'C') {
          const activeMarket = state.selectedMarket ?? 'local';
          if (activeMarket === 'city' || activeMarket === 'export') {
            return;
          }
        }

        // Pasteurisation gate: raw milk cannot be sold at city market
        if (productType === 'milk') {
          const activeMarket = state.selectedMarket ?? 'local';
          if (activeMarket === 'city') {
            const hasPasteurisation = (state.buildings ?? []).includes('bld_pasteurisation_unit');
            if (!hasPasteurisation) return;
          }
        }

        const gradeMultiplier = grade === 'A' ? 1.10 : grade === 'C' ? 0.75 : 1.00;
        const { ANIMAL_PRODUCTS } = require('../data/animalProducts');
        const product = ANIMAL_PRODUCTS.find((p: any) => p.productType === productType);
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

      buyMachine: (typeId) => {
        const state = get();
        const { MACHINE_TYPES } = require('../data/machineTypes');
        const machineType = MACHINE_TYPES.find((m: any) => m.id === typeId);
        if (!machineType) return;
        const cost = Math.round(machineType.cost * (hasAlmacen(state.buildings) ? 0.9 : 1.0));
        if (state.money < cost) return;
        // Enforce requirements
        const req = machineType.requires;
        if (req) {
          const ownedHa = state.parcels.filter((p: any) => p.owned).reduce((s: number, p: any) => s + p.hectares, 0);
          if (req.minHa && ownedHa < req.minHa) return;
          if (req.minTier) {
            const TIER_ORDER: Record<string, number> = { D: 0, C: 1, B: 2, A: 3 };
            const requiredLevel = TIER_ORDER[req.minTier] ?? 0;
            const hasLevel = state.harvestedCropIds.some((id: string) => {
              const crop = CROP_TYPES.find(c => c.id === id);
              return crop && (TIER_ORDER[crop.tier] ?? 0) >= requiredLevel;
            });
            if (!hasLevel) return;
          }
        }
        const newMachine: OwnedMachine = { id: `machine_${Date.now()}`, typeId, purchasedDay: state.day };
        set({ money: state.money - cost, machines: [...state.machines, newMachine] });
      },

      buyAttachment: (typeId) => {
        const state = get();
        const attachType = ATTACHMENT_TYPES.find(a => a.id === typeId);
        if (!attachType) return;
        if (state.money < attachType.cost) return;
        const newAttachment: OwnedAttachment = { id: `attachment_${Date.now()}`, typeId };
        set({ money: state.money - attachType.cost, attachments: [...(state.attachments ?? []), newAttachment] });
      },

      buyTrailer: (typeId) => {
        const state = get();
        const trailerType = MACHINE_TYPES.find(m => m.id === typeId && m.category === 'trailer');
        if (!trailerType) return;
        if (state.money < trailerType.cost) return;
        const newTrailer: OwnedTrailer = { id: `trailer_${Date.now()}`, typeId, hitchedTo: null };
        set({ money: state.money - trailerType.cost, trailers: [...(state.trailers ?? []), newTrailer] });
      },

      hitchTrailer: (trailerId, truckId) => {
        const state = get();
        const updatedTrailers = (state.trailers ?? []).map((tr: OwnedTrailer) => {
          if (tr.id === trailerId) return { ...tr, hitchedTo: truckId };
          // Unhitch any other trailer currently hitched to this truck (enforce 1 trailer per truck)
          if (truckId && tr.hitchedTo === truckId) return { ...tr, hitchedTo: null };
          return tr;
        });
        set({ trailers: updatedTrailers });
      },

      assignJob: (tractorId, attachmentId, operation, parcelIds, cropId) => {
        const state = get();
        const tractor = (state.machines ?? []).find((m: OwnedMachine) => m.id === tractorId);
        const attachment = (state.attachments ?? []).find((a: OwnedAttachment) => a.id === attachmentId);
        if (!tractor || !attachment) return;
        const tractorType = MACHINE_TYPES.find(mt => mt.id === tractor.typeId);
        const attachType = ATTACHMENT_TYPES.find(at => at.id === attachment.typeId);
        if (!tractorType || !attachType) return;
        const parcels = parcelIds
          .map((id: string) => state.parcels.find((p: LandParcel) => p.id === id))
          .filter((p): p is LandParcel => p !== undefined);
        if (parcels.length === 0) return;
        const parcelsTilled = parcels.map((p: LandParcel) => p.tilled);
        const check = canAssignJob(
          tractor, tractorType, attachment, attachType,
          operation, parcelsTilled, state.tractorJobs ?? [],
        );
        if (!check.ok) return;
        if (operation === 'plant' && !cropId) return;
        const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
        const haPerDay = attachType.haPerDay;
        const completesDay = state.day + calcJobDays(totalHa, haPerDay);
        const job: TractorJob = {
          id: `job_${Date.now()}`,
          tractorId,
          attachmentId,
          operation,
          parcelIds,
          cropId,
          totalHa,
          haPerDay,
          startDay: state.day,
          completesDay,
        };
        // For plant jobs: set plantedCrop with plantedDay = completesDay (crop grows from when tractor finishes)
        if (operation === 'plant' && cropId) {
          const { CROP_TYPES: CT } = require('../data/cropTypes');
          const cropType = CT.find((c: { id: string }) => c.id === cropId);
          if (!cropType) return;
          const coopSeedDiscount = (() => {
            const coopId = getCoopForCrop(cropId);
            if (!coopId) return 1.0;
            const m = state.coopMemberships[coopId];
            if (!m || isMemberSuspended(m, getCoopSeason(state.day))) return 1.0;
            return 1.0 - getSeedDiscount(coopId);
          })();
          const seedCost = cropType.seedCost * totalHa * coopSeedDiscount;
          if (state.money < seedCost) return;
          const { getSeason } = require('../engine/climate');
          const currentSeason = getSeason(state.day);
          const updatedParcels = state.parcels.map((p: LandParcel) => {
            if (!parcelIds.includes(p.id)) return p;
            if (!cropType.seasons.includes(currentSeason) && !p.greenhouse) return p;
            const plantedCrop: PlantedCrop = {
              cropId, parcelId: p.id, plantedDay: completesDay, hectares: p.hectares,
            };
            return { ...p, plantedCrop };
          });
          set({
            money: state.money - seedCost,
            parcels: updatedParcels,
            tractorJobs: [...(state.tractorJobs ?? []), job],
          });
          return;
        }
        set({ tractorJobs: [...(state.tractorJobs ?? []), job] });
      },

      assignHarvestJob: (combineId, parcelIds) => {
        const state = get();
        const combine = (state.machines ?? []).find((m: OwnedMachine) => m.id === combineId);
        if (!combine) return;
        const combineType = MACHINE_TYPES.find(mt => mt.id === combine.typeId && mt.category === 'harvester');
        if (!combineType) return;
        const alreadyBusy = (state.harvestJobs ?? []).some((j: HarvestJob) => j.combineId === combineId);
        if (alreadyBusy) return;
        const parcels = parcelIds
          .map((id: string) => state.parcels.find((p: LandParcel) => p.id === id))
          .filter((p): p is LandParcel => p !== undefined);
        if (parcels.length === 0) return;
        const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
        const haPerDay = combineType.haPerDay ?? 4;
        const completesDay = state.day + calcJobDays(totalHa, haPerDay);
        const job: HarvestJob = {
          id: `hjob_${Date.now()}`,
          combineId,
          parcelIds,
          totalHa,
          haPerDay,
          startDay: state.day,
          completesDay,
          processedHa: 0,
        };
        set({ harvestJobs: [...(state.harvestJobs ?? []), job] });
      },

      hireContractor: (operation, parcelIds, cropId) => {
        const state = get();
        const parcels = parcelIds
          .map((id: string) => state.parcels.find((p: LandParcel) => p.id === id))
          .filter((p): p is LandParcel => p !== undefined);
        if (parcels.length === 0) return;
        const { getContractorCost } = require('../engine/machinery');
        let cost = 0;

        if (operation === 'till') {
          const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          cost = getContractorCost('till', totalHa);
          if (state.money < cost) return;
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) =>
              parcelIds.includes(p.id) ? { ...p, tilled: true } : p
            ),
          });

        } else if (operation === 'plant') {
          if (!cropId) return;
          const { CROP_TYPES: CT } = require('../data/cropTypes');
          const { getSeason } = require('../engine/climate');
          const cropType = CT.find((c: { id: string }) => c.id === cropId);
          if (!cropType) return;
          const currentSeason = getSeason(state.day);
          const validParcels = parcels.filter((p: LandParcel) =>
            p.tilled && !p.plantedCrop && (cropType.seasons.includes(currentSeason) || p.greenhouse)
          );
          if (validParcels.length === 0) return;
          const totalHa = validParcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          const coopSeedDiscount = (() => {
            const coopId = getCoopForCrop(cropId);
            if (!coopId) return 1.0;
            const m = state.coopMemberships[coopId];
            if (!m || isMemberSuspended(m, getSeason(state.day))) return 1.0;
            return 1.0 - getSeedDiscount(coopId);
          })();
          const seedCost = cropType.seedCost * totalHa * coopSeedDiscount;
          const contractorFee = getContractorCost('plant', totalHa);
          cost = seedCost + contractorFee;
          if (state.money < cost) return;
          const validIds = validParcels.map((p: LandParcel) => p.id);
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) => {
              if (!validIds.includes(p.id)) return p;
              const plantedCrop: PlantedCrop = {
                cropId, parcelId: p.id, plantedDay: state.day, hectares: p.hectares,
              };
              return { ...p, plantedCrop };
            }),
          });

        } else if (operation === 'spray') {
          const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          cost = getContractorCost('spray', totalHa);
          if (state.money < cost) return;
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) => {
              if (!parcelIds.includes(p.id) || !p.plantedCrop) return p;
              return {
                ...p,
                plantedCrop: {
                  ...p.plantedCrop,
                  appliedN: Math.max(p.plantedCrop.appliedN ?? 1.0, 1.10),
                },
              };
            }),
          });

        } else if (operation === 'harvest') {
          const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          cost = getContractorCost('harvest', totalHa);
          if (state.money < cost) return;
          set({ money: state.money - cost });
          parcelIds.forEach((pid: string) => get().harvestCrop(pid));

        } else if (operation === 'irrigate') {
          cost = getContractorCost('irrigate', parcels.length);
          if (state.money < cost) return;
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) =>
              parcelIds.includes(p.id) ? { ...p, irrigated: true } : p
            ),
          });
        }
      },

      dispatchDelivery: ({ truckId, trailerId, driverId, cargo, marketId, returnOrders }) => {
        const state = get();

        const truck = (state.machines ?? []).find((m: OwnedMachine) => m.id === truckId);
        if (!truck) return;

        const truckType = MACHINE_TYPES.find(t => t.id === truck.typeId);
        if (!truckType) return;

        const region = MARKET_REGIONS.find(r => r.id === marketId) ?? MARKET_REGIONS[0];
        const duration = DELIVERY_DURATION[marketId];
        const fuelLitres = TRUCK_FUEL_LITRES[truck.typeId]?.[marketId] ?? 60;
        const fuelCost = Math.round(fuelLitres * (state.fuelPrice ?? 1.20) * 100) / 100;

        if ((state.fuel ?? 0) < fuelLitres) return;

        // Deduct cargo from inventory
        const newInventory = { ...state.inventory };
        const newAnimalInventory = { ...state.animalInventory };
        const newProductInventory = { ...(state.productInventory ?? {}) };
        for (const c of cargo) {
          if (c.category === 'crop') {
            newInventory[c.itemId] = Math.max(0, (newInventory[c.itemId] ?? 0) - c.quantity);
          } else if (c.category === 'animal_product') {
            newAnimalInventory[c.itemId] = Math.max(0, (newAnimalInventory[c.itemId] ?? 0) - c.quantity);
          }
        }

        // Lock in expected revenue · matches sellCrop formula exactly
        const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const coopBonus = 1.0;
        let expectedRevenue = 0;
        for (const c of cargo) {
          const basePrice =
            c.category === 'crop'
              ? (state.prices.find(p => p.cropId === c.itemId)?.price ?? 1)
              : ((state.animalPrices ?? {})[c.itemId] ?? 1);
          const effectivePrice = basePrice * region.priceMultiplier;
          const gross = c.quantity * effectivePrice * secaderoBonus * coopBonus * prestigeBonus;
          const transport = c.quantity * region.transportCostPerUnit;
          expectedRevenue += Math.max(0, gross - transport);
        }
        expectedRevenue = Math.round(expectedRevenue);

        // Deduct return order costs upfront
        let returnCost = 0;
        for (const r of returnOrders) {
          returnCost += r.quantity * r.costPerUnit;
        }
        returnCost = Math.round(returnCost);
        if (state.money < returnCost + fuelCost) return;

        const job: DeliveryJob = {
          id: `dlv_${Date.now()}`,
          truckId,
          trailerId,
          driverId,
          cargo,
          marketId,
          departDay: state.day,
          returnDay: state.day + duration,
          expectedRevenue,
          fuelCost,
          returnOrders,
          status: 'outbound',
          breakdownDaysAdded: 0,
          needsMaintenance: false,
        };

        set({
          deliveryJobs: [...(state.deliveryJobs ?? []), job],
          fuel: (state.fuel ?? 0) - fuelLitres,
          money: state.money - returnCost - fuelCost,
          inventory: newInventory,
          animalInventory: newAnimalInventory,
          productInventory: newProductInventory,
        });
      },

      requestLoan: (principal, termDays, label) => {
        const state = get();
        const { rollingIncome, checkEligibility } = require('../engine/banking');
        const income30d = rollingIncome(state.salesLog, state.day - 30, state.day);
        const income90d = rollingIncome(state.salesLog, state.day - 90, state.day);
        const { computeCreditScore } = require('../engine/banking');
        const creditScore = computeCreditScore(state.loanHistory, state.loans, income30d);
        const activeLoans = state.loans.filter(l => !l.paid && !l.defaulted);
        const eligibility = checkEligibility(principal, termDays, income30d, income90d, creditScore, activeLoans);
        if (!eligibility.eligible) return;
        const rate = calculateRate(termDays, creditScore, principal, income30d);
        const totalOwed = loanTotalOwed(principal, rate, termDays);
        const loan: Loan = {
          id: `loan_${Date.now()}`,
          label,
          principal,
          rate,
          startDay: state.day,
          termDays,
          payoffDay: state.day + termDays,
          totalOwed,
          paid: false,
          defaulted: false,
        };
        set({ money: state.money + principal, loans: [...state.loans, loan] });
      },

      repayLoan: (loanId) => {
        const state = get();
        const loan = state.loans.find(l => l.id === loanId);
        if (!loan || loan.paid || loan.defaulted) return;
        // Early repayment: charge prorated interest for days elapsed only
        const daysElapsed = Math.max(0, state.day - loan.startDay);
        const amountDue = Math.min(
          loan.totalOwed,
          Math.round(loan.principal * (1 + loan.rate * (daysElapsed / 365)))
        );
        if (state.money < amountDue) return;
        const onTime = state.day <= loan.payoffDay;
        set({
          money: state.money - amountDue,
          loans: state.loans.map(l => l.id === loanId ? { ...l, paid: true } : l),
          loanHistory: [...state.loanHistory, { loanId, paidOnTime: onTime }],
        });
      },

      depositSavings: (amount) => {
        const state = get();
        if (state.money < amount) return;
        set({ money: state.money - amount, savings: { ...state.savings, balance: state.savings.balance + amount } });
      },

      withdrawSavings: (amount) => {
        const state = get();
        const toWithdraw = Math.min(amount, state.savings.balance);
        set({ money: state.money + toWithdraw, savings: { ...state.savings, balance: state.savings.balance - toWithdraw } });
      },

      acceptContract: (templateId) => {
        const state = get();
        const { CONTRACT_TEMPLATES } = require('../engine/contracts');
        const template = CONTRACT_TEMPLATES.find((t: any) => t.id === templateId);
        if (!template) return;
        if (template.minReputation && (state.reputation ?? 50) < template.minReputation) return;
        const price = state.prices.find(p => p.cropId === template.cropId);
        if (!price) return;
        const amount = template.amountRange[0] + Math.floor(Math.random() * (template.amountRange[1] - template.amountRange[0]));
        const contract: Contract = {
          id: `contract_${Date.now()}`,
          templateId,
          cropId: template.cropId,
          amount,
          pricePerUnit: price.price * template.priceBonus,
          deadlineDay: state.day + template.termDays,
          acceptedDay: state.day,
          delivered: 0,
          completed: false,
          failed: false,
        };
        set({
          contracts: [...state.contracts, contract],
          firstMissionStep: state.firstMissionStep === 4 ? 5 : state.firstMissionStep,
        });
      },

      declineContract: (templateId) => {
        const state = get();
        set({ declinedTemplates: [...state.declinedTemplates, templateId] });
      },

      signRecurringContract: (buyerId, cropId, amountPerDelivery, frequencyDays, durationSeasons) => {
        set((s) => {
          const buyer = s.buyers.find((b) => b.id === buyerId);
          if (!buyer) return {};
          const alreadyActive = s.recurringContracts.some(
            (c) => c.buyerId === buyerId && c.active,
          );
          if (alreadyActive) return {};
          const cfg = BUYER_TIER_CONFIG[buyer.tier];
          if (cfg.maxOrderKg !== Infinity && amountPerDelivery > cfg.maxOrderKg) return {};
          const newContract = buildRecurringContract(
            buyer, cropId, amountPerDelivery, frequencyDays, durationSeasons, s.day,
          );
          return { recurringContracts: [...s.recurringContracts, newContract] };
        });
      },

      deliverToRecurringContract: (contractId, amountDelivered) => {
        set((s) => {
          const contract = s.recurringContracts.find((c) => c.id === contractId);
          if (!contract || !contract.active) return {};
          const buyer = s.buyers.find((b) => b.id === contract.buyerId);
          if (!buyer) return {};

          const available = s.inventory[contract.cropId] ?? 0;
          const actual = Math.min(amountDelivered, available);
          if (actual <= 0) return {};

          const cropType = CROP_TYPES.find((ct) => ct.id === contract.cropId);
          const basePrice = cropType?.basePrice ?? 1;

          const { contract: updatedContract, buyer: updatedBuyer, revenue } =
            resolveDelivery(contract, buyer, actual, basePrice, s.day);

          return {
            money: s.money + revenue,
            inventory: { ...s.inventory, [contract.cropId]: Math.max(0, available - actual) },
            recurringContracts: s.recurringContracts.map((c) =>
              c.id === contractId ? updatedContract : c,
            ),
            buyers: s.buyers.map((b) => (b.id === buyer.id ? updatedBuyer : b)),
          };
        });
      },

      cancelRecurringContract: (contractId) => {
        set((s) => ({
          recurringContracts: s.recurringContracts.map((c) =>
            c.id === contractId ? { ...c, active: false } : c,
          ),
        }));
      },

      applySoilAmendment: (parcelId, amendment) => {
        set((s) => {
          const parcel = s.parcels.find((p) => p.id === parcelId);
          if (!parcel || !parcel.owned) return {};
          const current = parcel.soil ?? SOIL_DEFAULTS;
          let newSoil: SoilStats;
          let cost = 0;
          if (amendment === 'lime') {
            newSoil = { ...current, pH: Math.min(8.5, current.pH + 0.5) };
            cost = 120;
          } else if (amendment === 'sulfur') {
            newSoil = { ...current, pH: Math.max(4.0, current.pH - 0.5) };
            cost = 100;
          } else {
            newSoil = { ...current, compaction: Math.max(0, current.compaction - 18) };
            cost = 200;
          }
          if (s.money < cost) return {};
          return {
            money: s.money - cost,
            parcels: s.parcels.map((p) =>
              p.id === parcelId ? { ...p, soil: newSoil } : p,
            ),
          };
        });
      },


      applySoilNPK: (parcelId, productId) => {
        set((s) => {
          const parcel = s.parcels.find((p) => p.id === parcelId);
          if (!parcel || !parcel.owned) return {};
          const current = parcel.soil ?? SOIL_DEFAULTS;
          const COSTS: Record<string, number> = {
            npk_nitrogen: 90, npk_phosphorus: 110, npk_potassium: 100, npk_blend: 220, drainage_tile: 400,
          };
          const cost = COSTS[productId] ?? 0;
          if (!cost || s.money < cost) return {};
          let newSoil = { ...current };
          let cropUpdate: Partial<PlantedCrop> = {};
          if (productId === 'npk_nitrogen') {
            newSoil.nitrogen = Math.min(100, current.nitrogen + 20);
            cropUpdate = { appliedN: Math.max(parcel.plantedCrop?.appliedN ?? 1.0, 1.20) };
          } else if (productId === 'npk_phosphorus') {
            newSoil.phosphorus = Math.min(100, (current.phosphorus ?? 60) + 20);
            cropUpdate = { appliedP: Math.max(parcel.plantedCrop?.appliedP ?? 1.0, 1.15) };
          } else if (productId === 'npk_potassium') {
            newSoil.potassium = Math.min(100, (current.potassium ?? 60) + 20);
            cropUpdate = { appliedK: Math.max(parcel.plantedCrop?.appliedK ?? 1.0, 1.15) };
          } else if (productId === 'npk_blend') {
            newSoil.nitrogen    = Math.min(100, current.nitrogen + 10);
            newSoil.phosphorus  = Math.min(100, (current.phosphorus ?? 60) + 12);
            newSoil.potassium   = Math.min(100, (current.potassium  ?? 60) + 12);
            cropUpdate = {
              appliedN: Math.max(parcel.plantedCrop?.appliedN ?? 1.0, 1.08),
              appliedP: Math.max(parcel.plantedCrop?.appliedP ?? 1.0, 1.10),
              appliedK: Math.max(parcel.plantedCrop?.appliedK ?? 1.0, 1.10),
            };
          } else if (productId === 'drainage_tile') {
            newSoil.drainage = Math.min(100, (current.drainage ?? 65) + 15);
          }
          const updatedPlantedCrop = parcel.plantedCrop
            ? { ...parcel.plantedCrop, ...cropUpdate }
            : parcel.plantedCrop;
          return {
            money: s.money - cost,
            parcels: s.parcels.map((p) =>
              p.id === parcelId ? { ...p, soil: newSoil, plantedCrop: updatedPlantedCrop } : p,
            ),
          };
        });
      },
      plantCoverCrop: (parcelId, coverCropId) => {
        set((s) => {
          const parcel = s.parcels.find((p) => p.id === parcelId);
          if (!parcel || !parcel.owned || parcel.plantedCrop) return {};
          const cropType = CROP_TYPES.find((ct) => ct.id === coverCropId);
          if (!cropType) return {};
          if (s.money < cropType.seedCost * parcel.hectares) return {};
          const coverCrop: PlantedCrop = {
            cropId: coverCropId,
            parcelId,
            plantedDay: s.day,
            hectares: parcel.hectares,
          };
          return {
            money: s.money - cropType.seedCost * parcel.hectares,
            parcels: s.parcels.map((p) =>
              p.id === parcelId ? { ...p, plantedCrop: coverCrop } : p,
            ),
          };
        });
      },

      counterOfferContract: (templateId, mod) => {
        const state = get();
        const { CONTRACT_TEMPLATES } = require('../engine/contracts');
        const template = CONTRACT_TEMPLATES.find((t: any) => t.id === templateId);
        if (!template) return;
        const price = state.prices.find(p => p.cropId === template.cropId);
        if (!price) return;
        const priceBonus = mod === 'price' ? template.priceBonus * 1.10 : template.priceBonus;
        const termDays = mod === 'deadline' ? template.termDays + 20 : template.termDays;
        const baseAmount = template.amountRange[0] + Math.floor(Math.random() * (template.amountRange[1] - template.amountRange[0]));
        const amount = mod === 'quantity' ? template.amountRange[0] : baseAmount;
        const contract: Contract = {
          id: `contract_${Date.now()}`,
          templateId,
          cropId: template.cropId,
          amount,
          pricePerUnit: price.price * priceBonus,
          deadlineDay: state.day + termDays,
          acceptedDay: state.day,
          delivered: 0,
          completed: false,
          failed: false,
        };
        set({ contracts: [...state.contracts, contract] });
      },

      upgradeAnimalGene: (animalId, gene) => {
        const state = get();
        const animal = state.animals.find(a => a.id === animalId);
        if (!animal) return;
        const genes = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
        const currentVal = (genes as any)[gene] as number;
        if (currentVal >= 1.5) return;
        const cost = Math.round(800 * currentVal * currentVal);
        if (state.money < cost) return;
        const newGenes = { ...genes, [gene]: Math.min(1.5, parseFloat((currentVal + 0.05).toFixed(2))) };
        set({
          animals: state.animals.map(a => a.id === animalId ? { ...a, genes: newGenes } : a),
          money: state.money - cost,
        });
      },

      sellSeedBatch: (seedEntryId) => {
        const state = get();
        const entry = state.seedVault.find(s => s.id === seedEntryId);
        if (!entry) return;
        const avgGene = (entry.genes.yield + entry.genes.drought + entry.genes.growth + entry.genes.quality) / 4;
        const pricePerSeed = Math.round(30 * avgGene * Math.max(1, entry.generation));
        const revenue = pricePerSeed * entry.quantity;
        set({
          seedVault: state.seedVault.filter(s => s.id !== seedEntryId),
          money: state.money + revenue,
        });
      },

      buyMarketSeed: (cropId) => {
        const state = get();
        const crop = CROP_TYPES.find(c => c.id === cropId);
        if (!crop) return;
        const costPerSeed = Math.round((crop.seedCost ?? 50) * 1.5 + 25);
        const quantity = 5;
        const totalCost = costPerSeed * quantity;
        if (state.money < totalCost) return;
        const existing = state.seedVault.find(s => s.cropId === cropId && s.generation === 1 && s.genes.yield === 1.0 && s.genes.drought === 1.0);
        if (existing) {
          set({
            seedVault: state.seedVault.map(s => s.id === existing.id ? { ...s, quantity: s.quantity + quantity } : s),
            money: state.money - totalCost,
          });
        } else {
          const newEntry: SeedEntry = {
            id: `seed_mkt_${Date.now()}`,
            cropId,
            generation: 1,
            genes: { yield: 1.0, drought: 1.0, growth: 1.0, quality: 1.0 },
            createdDay: state.day,
            quantity,
          };
          set({
            seedVault: [...state.seedVault, newEntry],
            money: state.money - totalCost,
          });
        }
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

      plantCropBatch: (cropId) => {
        const state = get();
        const crop = CROP_TYPES.find(c => c.id === cropId);
        if (!crop) return;
        const idleParcels = state.parcels.filter(p => p.owned && !p.plantedCrop && !p.hasWeeds);
        if (idleParcels.length === 0) return;
        const totalCost = idleParcels.reduce((sum, p) => sum + Math.round(crop.seedCost * p.hectares), 0);
        if (state.money < totalCost) return;
        const plantDay = state.day;
        const idleIds = new Set(idleParcels.map(p => p.id));
        set({
          parcels: state.parcels.map(p => {
            if (!idleIds.has(p.id)) return p;
            return { ...p, plantedCrop: { cropId, parcelId: p.id, plantedDay: plantDay, hectares: p.hectares }, tilled: false };
          }),
          money: state.money - totalCost,
        });
      },

      setFarmName: (name) => set({ farmName: name.trim() || 'My Farm' }),

      buyFuel: (litres) => {
        const state = get();
        const capacity = getFuelCapacity(state.buildings);
        const canAdd = Math.max(0, capacity - state.fuel);
        const actualLitres = Math.min(litres, canAdd);
        if (actualLitres <= 0) return;
        const cost = Math.round(actualLitres * 1.20);
        if (state.money < cost) return;
        set({ fuel: Math.min(capacity, state.fuel + actualLitres), money: state.money - cost });
      },

      addPriceAlert: (cropId, targetPrice, direction) => {
        const state = get();
        if ((state.priceAlerts ?? []).some(a => a.cropId === cropId)) return;
        set({ priceAlerts: [...(state.priceAlerts ?? []), { id: `alert_${Date.now()}`, cropId, targetPrice, direction }] });
      },

      removePriceAlert: (alertId) => {
        const state = get();
        set({ priceAlerts: (state.priceAlerts ?? []).filter(a => a.id !== alertId) });
      },

      placeMarketOrder: (cropId, quantity, targetPrice, termDays) => {
        const state = get();
        const inStock = state.inventory[cropId] ?? 0;
        if (inStock < quantity || quantity <= 0) return;
        // Reserve inventory immediately
        const newInventory = { ...state.inventory, [cropId]: inStock - quantity };
        const order: MarketOrder = {
          id: `order_${Date.now()}`,
          cropId,
          quantity,
          targetPrice,
          createdDay: state.day,
          expiresDay: state.day + termDays,
          status: 'active',
        };
        set({ inventory: newInventory, marketOrders: [...(state.marketOrders ?? []), order] });
      },

      cancelMarketOrder: (orderId) => {
        const state = get();
        const order = (state.marketOrders ?? []).find(o => o.id === orderId && o.status === 'active');
        if (!order) return;
        // Return reserved inventory
        const newInventory = { ...state.inventory, [order.cropId]: (state.inventory[order.cropId] ?? 0) + order.quantity };
        const updatedOrders = (state.marketOrders ?? []).map(o =>
          o.id === orderId ? { ...o, status: 'cancelled' as const } : o
        );
        set({ inventory: newInventory, marketOrders: updatedOrders });
      },

      setSelectedMarket: (marketId) => {
        const state = get();
        const region = MARKET_REGIONS.find(r => r.id === marketId);
        if (!region) return;
        if (state.day < region.unlockDay) return;
        set({ selectedMarket: marketId });
      },

      deliverCrop: (contractId, amount) => {
        const state = get();
        const contract = state.contracts.find(c => c.id === contractId);
        if (!contract || contract.completed || contract.failed) return;
        const inStock = state.inventory[contract.cropId] ?? 0;
        const toDeliver = Math.min(amount, inStock, contract.amount - contract.delivered);
        if (toDeliver <= 0) return;
        // Administrative Office building: +5% contract delivery revenue
        const contractBonus = hasOficinaBuilding(state.buildings) ? 1.05 : 1.0;
        const coopBonus = 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const revenue = toDeliver * contract.pricePerUnit * contractBonus * coopBonus * prestigeBonus;
        const newDelivered = contract.delivered + toDeliver;
        const completed = newDelivered >= contract.amount;
        set({
          inventory: { ...state.inventory, [contract.cropId]: inStock - toDeliver },
          money: state.money + revenue,
          salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'contracts' }],
          totalRevenue: state.totalRevenue + revenue,
          contracts: state.contracts.map(c =>
            c.id === contractId ? { ...c, delivered: newDelivered, completed } : c
          ),
          reputation: completed ? Math.min(100, (state.reputation ?? 50) + 5) : (state.reputation ?? 50),
        });
      },

      buyProduct: (productId) => {
        const state = get();
        const { PRODUCT_TYPES } = require('../data/productTypes');
        const product = PRODUCT_TYPES.find((p: any) => p.id === productId);
        if (!product || state.money < product.packCost) return;
        set({
          money: state.money - product.packCost,
          productInventory: { ...state.productInventory, [productId]: (state.productInventory[productId] ?? 0) + product.packSize },
        });
      },

      buyBuilding: (buildingId) => {
        const state = get();
        const building = BUILDING_TYPES.find((b: any) => b.id === buildingId);
        if (!building || state.money < building.cost) return;
        if (state.buildings.includes(buildingId)) return;
        const newBuildings = [...state.buildings, buildingId];
        const sickBayCapacity = newBuildings.reduce((cap: number, bid: string) => {
          if (bid === 'bld_isolation_sick_bay_s') return cap + 5;
          if (bid === 'bld_isolation_sick_bay_m') return cap + 15;
          return cap;
        }, 0);
        const slurryCapacity = newBuildings.reduce((cap: number, bid: string) => {
          if (bid === 'bld_slurry_tank_s') return cap + 5000;
          if (bid === 'bld_slurry_tank_m') return cap + 15000;
          if (bid === 'bld_slurry_tank_l') return cap + 40000;
          return cap;
        }, 0);
        const silageCapacity = newBuildings.reduce((cap: number, bid: string) => {
          if (bid === 'bld_silage_pit_s') return cap + 5000;
          if (bid === 'bld_silage_pit_m') return cap + 15000;
          if (bid === 'bld_silage_pit_l') return cap + 40000;
          return cap;
        }, 0);
        const hatcheryCapacity = newBuildings.reduce((cap: number, bid: string) => {
          if (bid === 'bld_hatchery_s') return cap + 50;
          if (bid === 'bld_hatchery_m') return cap + 150;
          if (bid === 'bld_hatchery_l') return cap + 400;
          return cap;
        }, 0);
        set({
          money: state.money - building.cost,
          buildings: newBuildings,
          vetRoomOwned:         newBuildings.includes('bld_vet_room'),
          medicineCabinetOwned: newBuildings.includes('bld_medicine_cabinet'),
          hasCCTV:              newBuildings.includes('bld_cctv_monitor'),
          sickBayCapacity,
          slurryCapacity,
          silageCapacity,
          hatcheryCapacity,
        });
      },

      designateAsSire: (animalId) => {
        const state = get();
        const animal = (state.animals ?? []).find((a: OwnedAnimal) => a.id === animalId);
        if (!animal || animal.sex !== 'male') return;
        if (!state.buildings.includes('bld_sire_pen')) return;
        const maxSires = BUILDING_TYPES.find((b: any) => b.id === 'bld_sire_pen')?.capacity ?? 4;
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
        set({
          inventory: { ...state.inventory, grass: Math.max(0, grassAvail - toFill) },
          silageLevel: (state.silageLevel ?? 0) + toFill,
        });
      },

      setBiogasMode: (mode) => {
        set({ biogasMode: mode });
      },

      queueEggsForIncubation: (typeId, quantity) => {
        const state = get();
        const INCUBATION_DAYS: Record<string, number> = { gallina: 21, pato: 28, codorniz: 17 };
        if (!INCUBATION_DAYS[typeId]) return; // unsupported species
        const cap = state.hatcheryCapacity ?? 0;
        if (cap <= 0) return; // no hatchery built
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

      clearWeeds: (parcelId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.hasWeeds) return;
        const { PRODUCT_TYPES } = require('../data/productTypes');
        const herbicideId = Object.keys(state.productInventory).find(id => {
          const p = PRODUCT_TYPES.find((pt: any) => pt.id === id);
          return p?.category === 'herbicide' && (state.productInventory[id] ?? 0) > 0;
        });
        if (!herbicideId) return;
        set({
          parcels: state.parcels.map(p => p.id === parcelId ? { ...p, hasWeeds: false } : p),
          productInventory: { ...state.productInventory, [herbicideId]: state.productInventory[herbicideId] - 1 },
        });
      },

      fertilizeCrop: (parcelId, productId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.plantedCrop) return;
        const { PRODUCT_TYPES } = require('../data/productTypes');
        const product = PRODUCT_TYPES.find((p: any) => p.id === productId);
        if (!product || product.category !== 'fertilizer_solid' && product.category !== 'fertilizer_liquid') return;
        const inStock = state.productInventory[productId] ?? 0;
        if (inStock <= 0) return;
        const bonus = product.fertilizerBonus ?? 1.3;
        set({
          parcels: state.parcels.map(p =>
            p.id === parcelId ? {
              ...p,
              fertility: Math.min(25, p.fertility + 2),
              plantedCrop: {
                ...p.plantedCrop!,
                appliedN: Math.max(p.plantedCrop!.appliedN ?? 1.0, bonus),
              },
            } : p
          ),
          productInventory: { ...state.productInventory, [productId]: inStock - 1 },
        });
      },

      resolveFieldEvent: (eventId, productId) => {
        const state = get();
        const event = state.fieldEvents.find(e => e.id === eventId);
        if (!event || event.resolved) return;
        const { PRODUCT_TYPES } = require('../data/productTypes');
        const product = PRODUCT_TYPES.find((p: any) => p.id === productId);
        const validCategory = event.type === 'disease' ? 'fungicide' : 'insecticide';
        if (!product || product.category !== validCategory) return;
        const inStock = state.productInventory[productId] ?? 0;
        if (inStock <= 0) return;
        set({
          fieldEvents: state.fieldEvents.map(e => e.id === eventId ? { ...e, resolved: true } : e),
          productInventory: { ...state.productInventory, [productId]: inStock - 1 },
        });
      },

      listItem: (params) => {
        const state = get();
        const { category, animalId, cropId, cropQuantity, machineId,
                startingBid, reservePrice, durationDays } = params;
        if (startingBid <= 0 || reservePrice < startingBid) return;

        const listing: AuctionListing = {
          id: `listing_${Date.now()}`,
          category,
          sellerId: 'player',
          startingBid,
          reservePrice,
          currentBid: startingBid,
          bids: [],
          playerBid: null,
          createdDay: state.day,
          expiresDay: state.day + durationDays,
          resolved: false,
          playerWon: null,
        };

        if (category === 'animal') {
          if (!animalId) return;
          const animal = state.animals.find(a => a.id === animalId);
          if (!animal) return;
          listing.animalId = animalId;
          listing.animalGenes = animal.genes;
          listing.animalBreedId = animal.breedId;
          listing.animalTypeId = animal.typeId;
          listing.animalSex = animal.sex;
          listing.animalBornDay = animal.bornDay;
          listing.expiresDay = state.nextAnimalAuctionDay;
          set({
            listings: [...(state.listings ?? []), listing],
            animals: state.animals.filter(a => a.id !== animalId),
          });
        } else if (category === 'crop') {
          if (!cropId || !cropQuantity || cropQuantity <= 0) return;
          const inStock = state.inventory[cropId] ?? 0;
          if (inStock < cropQuantity) return;
          listing.cropId = cropId;
          listing.cropQuantity = cropQuantity;
          set({
            listings: [...(state.listings ?? []), listing],
            inventory: { ...state.inventory, [cropId]: inStock - cropQuantity },
          });
        } else if (category === 'machinery') {
          if (!machineId) return;
          const machine = state.machines.find(m => m.id === machineId);
          if (!machine) return;
          const machineType = MACHINE_TYPES.find(t => t.id === machine.typeId);
          if (!machineType) return;
          const ageDays = state.day - machine.purchasedDay;
          const repairs = (state.machineRepairs ?? []).filter(r => r.machineId === machineId);
          const repairedOnTime = repairs.filter(r => r.readyDay !== null).length;
          const missedRepairs = repairs.filter(r => r.startDay === null).length;
          const conditionScore = Math.min(100, Math.max(0,
            100 - Math.floor(ageDays / 5) + repairedOnTime * 3 - missedRepairs * 8
          ));
          listing.machineId = machineId;
          listing.machineTypeId = machine.typeId;
          listing.conditionScore = conditionScore;
          listing.machinePurchasedDay = machine.purchasedDay;
          set({
            listings: [...(state.listings ?? []), listing],
            machines: state.machines.filter(m => m.id !== machineId),
          });
        }
      },

      withdrawListing: (listingId) => {
        const state = get();
        const listing = (state.listings ?? []).find(l => l.id === listingId && !l.resolved);
        if (!listing || listing.sellerId !== 'player') return;
        if (listing.bids.some(b => b.isPlayer === false)) return; // bids exist, can't withdraw

        let inventoryPatch: Partial<typeof state> = {};
        if (listing.category === 'animal' && listing.animalId && listing.animalGenes && listing.animalTypeId) {
          const returnedAnimal: OwnedAnimal = {
            id: listing.animalId,
            typeId: listing.animalTypeId,
            sex: listing.animalSex ?? 'female',
            bornDay: listing.animalBornDay ?? state.day,
            genes: listing.animalGenes,
            breedId: listing.animalBreedId,
            sick: false,
            lastProductionDay: state.day,
            lastBreedDay: state.day,
          };
          inventoryPatch = { animals: [...state.animals, returnedAnimal] };
        } else if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
          inventoryPatch = {
            inventory: {
              ...state.inventory,
              [listing.cropId]: (state.inventory[listing.cropId] ?? 0) + listing.cropQuantity,
            },
          };
        } else if (listing.category === 'machinery' && listing.machineId && listing.machineTypeId) {
          const restoredMachine: OwnedMachine = {
            id: listing.machineId,
            typeId: listing.machineTypeId,
            purchasedDay: listing.machinePurchasedDay ?? state.day,
          };
          inventoryPatch = { machines: [...state.machines, restoredMachine] };
        }

        set({
          ...inventoryPatch,
          listings: (state.listings ?? []).map(l =>
            l.id === listingId ? { ...l, resolved: true, playerWon: null } : l
          ),
        });
      },

      placeBid: (listingId, amount) => {
        const state = get();
        const listing = (state.listings ?? []).find(l => l.id === listingId && !l.resolved);
        if (!listing) return;
        const minBid = Math.ceil(listing.currentBid * 1.05);
        if (amount < minBid) return;
        if (state.money < amount) return;
        set({
          listings: (state.listings ?? []).map(l => l.id === listingId ? {
            ...l,
            playerBid: amount,
            currentBid: amount,
            bids: [...l.bids, { day: state.day, amount, isPlayer: true }],
          } : l),
        });
      },

      processProduct: (recipeId, batches) => {
        if (batches <= 0) return;
        const state = get();
        const recipe = PROCESSING_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return;

        // Find owned processing building for this recipe
        const procBuildings = state.processingBuildings ?? [];
        const building = procBuildings.find(b => b.buildingTypeId === recipe.buildingTypeId);
        if (!building) return;
        if (building.tier < recipe.minBuildingTier) return;
        if (building.activeBatchId) return; // one batch at a time per building

        // Check inputs
        const maxBatches = (() => {
          let max = Infinity;
          for (const input of recipe.inputs) {
            let stock = 0;
            if (input.source === 'crop') stock = state.inventory[input.itemId] ?? 0;
            else if (input.source === 'animal') stock = state.animalInventory[input.itemId] ?? 0;
            else if (input.source === 'processed') {
              stock = (state.processedInventory ?? []).filter((i: ProcessedItem) => i.itemId === input.itemId).reduce((s: number, i: ProcessedItem) => s + i.quantity, 0);
            }
            max = Math.min(max, Math.floor(stock / input.quantity));
          }
          return max === Infinity ? 0 : max;
        })();
        const actualBatches = Math.min(batches, maxBatches);
        if (actualBatches <= 0) return;

        // Calculate input quality (weighted average)
        let inputQualitySum = 0;
        let inputWeightSum = 0;
        for (const input of recipe.inputs) {
          let q = 50;
          if (input.source === 'crop') q = state.cropQualityMap?.[input.itemId] ?? 50;
          else if (input.source === 'processed') {
            const items = (state.processedInventory ?? []).filter((i: ProcessedItem) => i.itemId === input.itemId);
            if (items.length > 0) {
              const totalQty = items.reduce((s: number, i: ProcessedItem) => s + i.quantity, 0);
              q = items.reduce((s: number, i: ProcessedItem) => s + i.quality * i.quantity, 0) / totalQty;
            }
          }
          inputQualitySum += q * input.quantity;
          inputWeightSum += input.quantity;
        }
        const inputQuality = inputWeightSum > 0 ? inputQualitySum / inputWeightSum : 50;

        // Worker bonus: highest tier among assigned workers * 5 (capped at 20)
        const assignedWorkers = (state.workers ?? []).filter((w: Worker) => building.assignedWorkerIds.includes(w.id));
        const workerBonus = assignedWorkers.length > 0
          ? Math.min(20, Math.max(...assignedWorkers.map((w: Worker) => (w.tier ?? 1) * 5)))
          : 0;

        // Quality formula from spec
        const buildingBonus = { 1: 0, 2: 10, 3: 20 }[building.tier] ?? 0;
        const ceiling = { 1: 70, 2: 85, 3: 100 }[building.tier] ?? 70;
        const rawQuality = inputQuality * 0.6 + buildingBonus + workerBonus;
        const quality = Math.max(0, Math.min(ceiling, Math.round(rawQuality)));

        // Output quantity with tier multiplier
        const tierMult = { 1: 1, 2: 2, 3: 4 }[building.tier] ?? 1;
        const outputQty = Math.round(recipe.baseOutputQuantity * tierMult * actualBatches);

        // Build input snapshot
        const inputSnapshot: Record<string, number> = {};
        for (const input of recipe.inputs) {
          inputSnapshot[input.itemId] = (inputSnapshot[input.itemId] ?? 0) + input.quantity * actualBatches;
        }

        // Deduct inputs
        const newInventory = { ...state.inventory };
        const newAnimalInventory = { ...state.animalInventory };
        let newProcessedInventory = [...(state.processedInventory ?? [])] as ProcessedItem[];

        for (const input of recipe.inputs) {
          const needed = input.quantity * actualBatches;
          if (input.source === 'crop') {
            newInventory[input.itemId] = (newInventory[input.itemId] ?? 0) - needed;
          } else if (input.source === 'animal') {
            newAnimalInventory[input.itemId] = (newAnimalInventory[input.itemId] ?? 0) - needed;
          } else if (input.source === 'processed') {
            let remaining = needed;
            newProcessedInventory = newProcessedInventory.map((item: ProcessedItem) => {
              if (item.itemId !== input.itemId || remaining <= 0) return item;
              const take = Math.min(item.quantity, remaining);
              remaining -= take;
              return { ...item, quantity: item.quantity - take };
            }).filter((item: ProcessedItem) => item.quantity > 0);
          }
        }

        const batch: ProcessingBatch = {
          id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          buildingId: building.id,
          recipeId,
          startDay: state.day,
          completionDay: state.day + recipe.processingDays,
          inputSnapshot,
          outputItemId: recipe.outputItemId,
          outputQuantity: outputQty,
          quality,
        };

        set({
          inventory: newInventory,
          animalInventory: newAnimalInventory,
          processedInventory: newProcessedInventory,
          activeBatches: [...(state.activeBatches ?? []), batch],
          processingBuildings: procBuildings.map((b: import('../engine/processing').ProcessingBuilding) =>
            b.id === building.id ? { ...b, activeBatchId: batch.id } : b
          ),
        });
      },

      sellProcessed: (productId, units) => {
        const state = get();
        const def = PROCESSED_ITEM_DEFS.find(d => d.id === productId);
        if (!def) return;
        const items = (state.processedInventory ?? []).filter(i => i.itemId === productId);
        const totalStock = items.reduce((s, i) => s + i.quantity, 0);
        const toSell = Math.min(units, totalStock);
        if (toSell <= 0) return;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        let remaining = toSell;
        let revenue = 0;
        const updatedInventory = (state.processedInventory ?? []).map(item => {
          if (item.itemId !== productId || remaining <= 0) return item;
          const take = Math.min(item.quantity, remaining);
          remaining -= take;
          const mult = getSellMultiplier(item, state.day) * prestigeBonus;
          revenue += Math.round(take * def.basePrice * mult);
          return { ...item, quantity: item.quantity - take };
        }).filter(item => item.quantity > 0);
        set({
          money: state.money + revenue,
          processedInventory: updatedInventory,
          salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'processed' }],
          totalRevenue: state.totalRevenue + revenue,
        });
      },

      buyProcessingBuilding: (buildingTypeId) => {
        const state = get();
        const config = getProcessingBuildingConfig(buildingTypeId);
        if (!config) return;
        if (state.buildings.includes(buildingTypeId)) return;
        if (state.money < config.baseCost) return;
        const newBuilding: import('../engine/processing').ProcessingBuilding = {
          id: `pb_${buildingTypeId}_${Date.now()}`,
          buildingTypeId,
          tier: 1,
          assignedWorkerIds: [],
          hasColdStorage: false,
        };
        set({
          money: state.money - config.baseCost,
          buildings: [...state.buildings, buildingTypeId],
          processingBuildings: [...(state.processingBuildings ?? []), newBuilding],
        });
      },

      upgradeProcessingBuilding: (buildingId) => {
        const state = get();
        const building = (state.processingBuildings ?? []).find(b => b.id === buildingId);
        if (!building || !canUpgradeTier(building)) return;
        const config = getProcessingBuildingConfig(building.buildingTypeId);
        if (!config) return;
        const cost = getUpgradeCost(building, config);
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          processingBuildings: (state.processingBuildings ?? []).map(b =>
            b.id === buildingId ? { ...b, tier: (b.tier + 1) as 1 | 2 | 3 } : b
          ),
        });
      },

      assignWorkerToProcessingBuilding: (buildingId, workerId) => {
        const state = get();
        const building = (state.processingBuildings ?? []).find(b => b.id === buildingId);
        if (!building) return;
        if (building.assignedWorkerIds.includes(workerId)) return;
        set({
          processingBuildings: (state.processingBuildings ?? []).map(b =>
            b.id === buildingId ? { ...b, assignedWorkerIds: [...b.assignedWorkerIds, workerId] } : b
          ),
        });
      },

      unassignWorkerFromProcessingBuilding: (buildingId, workerId) => {
        const state = get();
        set({
          processingBuildings: (state.processingBuildings ?? []).map(b =>
            b.id === buildingId ? { ...b, assignedWorkerIds: b.assignedWorkerIds.filter(id => id !== workerId) } : b
          ),
        });
      },

      installColdStorage: (buildingId) => {
        const state = get();
        const building = (state.processingBuildings ?? []).find(b => b.id === buildingId);
        if (!building || building.hasColdStorage) return;
        const cost = 8000;
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          processingBuildings: (state.processingBuildings ?? []).map(b =>
            b.id === buildingId ? { ...b, hasColdStorage: true } : b
          ),
        });
      },

      buyInsurance: (type) => {
        const state = get();
        if (state.insurances.some(p => p.type === type && p.active)) return;
        const plan = INSURANCE_PLANS.find(pl => pl.type === type);
        if (!plan) return;
        const policy: InsurancePolicy = {
          id: `ins_${type}_${state.day}`,
          type,
          startDay: state.day,
          active: true,
        };
        set({ insurances: [...state.insurances, policy] });
      },

      cancelInsurance: (policyId) => {
        const state = get();
        set({
          insurances: state.insurances.map(p =>
            p.id === policyId ? { ...p, active: false } : p
          ),
        });
      },

      clearDaySummary: () => set({ daySummary: null }),

      openTimeDeposit: (amount, termDays, rate) => {
        const state = get();
        if (amount <= 0 || state.money < amount) return;
        const deposit: TimeDeposit = {
          id: `td_${Date.now()}`,
          amount,
          startDay: state.day,
          termDays,
          rate,
        };
        set({
          money: state.money - amount,
          timeDeposits: [...state.timeDeposits, deposit],
        });
      },

      closeTimeDeposit: (depositId) => {
        const state = get();
        const deposit = state.timeDeposits.find(d => d.id === depositId);
        if (!deposit) return;
        const { timeDepositMatured, timeDepositPayout } = require('../engine/banking');
        if (!timeDepositMatured(deposit, state.day)) return;
        const payout = Math.round(timeDepositPayout(deposit));
        set({
          money: state.money + payout,
          timeDeposits: state.timeDeposits.filter(d => d.id !== depositId),
        });
      },

      resetGame: () => {
        set(makeInitialState());
      },

      markTutorialSeen: () => {
        set({ tutorialSeen: true });
      },

      dismissHint: (id) => {
        const state = get();
        if ((state.dismissedHints ?? []).includes(id)) return;
        set({ dismissedHints: [...(state.dismissedHints ?? []), id] });
      },

      clearMilestonePopup: () => {
        set({ milestonePopup: null });
      },

      purchaseProductionBuilding: (buildingTypeId) => {
        const state = get();
        const bt = BUILDING_TYPES.find(b => b.id === buildingTypeId);
        if (!bt || bt.category !== 'production' || !bt.animalTypeId) return;
        if (state.money < bt.cost) return;
        // Only one production building per species
        if (state.productionBuildings.some(pb => pb.animalTypeId === bt.animalTypeId)) return;
        const newBuilding: ProductionBuildingState = {
          id: `pb_${Date.now()}`,
          buildingTypeId,
          animalTypeId: bt.animalTypeId,
          hygiene: 100,
          certificationTier: 'basic',
          certDaysAtThreshold: 0,
          certInspectionsPassed: 0,
          equipmentSlots: [],
          assignedWorkerIds: [],
          lastDeepCleanSeason: seasonKey(state.day),
          capacity: bt.dailyCapacity ?? 10,
        };
        set({
          money: state.money - bt.cost,
          productionBuildings: [...state.productionBuildings, newBuilding],
        });
      },

      assignWorkerToBuilding: (buildingId, workerId) => {
        const state = get();
        const pb = state.productionBuildings.find(b => b.id === buildingId);
        if (!pb) return;
        const workerExists = (state.workers ?? []).some(w => w.id === workerId);
        if (!workerExists) return;
        if (pb.assignedWorkerIds.includes(workerId)) return;
        // A worker can only be assigned to one production building
        const alreadyAssigned = state.productionBuildings.some(b =>
          b.id !== buildingId && b.assignedWorkerIds.includes(workerId)
        );
        if (alreadyAssigned) return;
        const bt2 = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
        const maxWorkers = bt2?.buildingTier === 'large' ? 2 : 1;
        if (pb.assignedWorkerIds.length >= maxWorkers) return;
        set({
          productionBuildings: state.productionBuildings.map(b =>
            b.id === buildingId
              ? { ...b, assignedWorkerIds: [...b.assignedWorkerIds, workerId] }
              : b
          ),
        });
      },

      unassignWorkerFromBuilding: (buildingId, workerId) => {
        const state = get();
        set({
          productionBuildings: state.productionBuildings.map(b =>
            b.id === buildingId
              ? { ...b, assignedWorkerIds: b.assignedWorkerIds.filter(id => id !== workerId) }
              : b
          ),
        });
      },

      installEquipment: (buildingId, equipmentItemId) => {
        const state = get();
        const pb = state.productionBuildings.find(b => b.id === buildingId);
        if (!pb) return;
        const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
        if (!bt) return;
        const maxSlots = bt.equipmentSlotCount ?? 2;
        if (pb.equipmentSlots.length >= maxSlots) return;
        if (pb.equipmentSlots.includes(equipmentItemId)) return;
        const eq: EquipmentItem | undefined = PRODUCTION_EQUIPMENT.find(e => e.id === equipmentItemId);
        if (!eq) return;
        // Check this equipment fits this building type
        const fits = eq.applicableBuildingPrefixes.some(prefix =>
          pb.buildingTypeId.startsWith(prefix)
        );
        if (!fits) return;
        if (state.money < eq.cost) return;
        set({
          money: state.money - eq.cost,
          productionBuildings: state.productionBuildings.map(b =>
            b.id === buildingId
              ? { ...b, equipmentSlots: [...b.equipmentSlots, equipmentItemId] }
              : b
          ),
        });
      },

      performDeepClean: (buildingId, useContractor) => {
        const state = get();
        const pb = state.productionBuildings.find(b => b.id === buildingId);
        if (!pb) return;
        const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
        if (!bt) return;
        const contractorCost = bt.buildingTier === 'large' ? 400
          : bt.buildingTier === 'medium' ? 250 : 150;
        if (useContractor) {
          if (state.money < contractorCost) return;
          set({
            money: state.money - contractorCost,
            productionBuildings: state.productionBuildings.map(b =>
              b.id === buildingId
                ? { ...b, hygiene: 85, lastDeepCleanSeason: seasonKey(state.day) }
                : b
            ),
          });
        } else {
          // Worker deep clean
          set({
            productionBuildings: state.productionBuildings.map(b =>
              b.id === buildingId
                ? { ...b, hygiene: 95, lastDeepCleanSeason: seasonKey(state.day) }
                : b
            ),
          });
        }
      },

      setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),
      setHapticEnabled: (enabled: boolean) => set({ hapticEnabled: enabled }),
      setMusicEnabled: (enabled: boolean) => set({ musicEnabled: enabled }),

      performPrestige: () => {
        const state = get();
        if (state.day < 1080) return;
        const newPrestige = (state.prestige ?? 0) + 1;
        const newRecords = {
          peakMoney: Math.max(state.personalRecords?.peakMoney ?? 0, state.money),
          totalHarvests: state.personalRecords?.totalHarvests ?? 0,
          bestSeasonRevenue: state.personalRecords?.bestSeasonRevenue ?? 0,
          longestDay: Math.max(state.personalRecords?.longestDay ?? 0, state.day),
        };
        const fresh = makeInitialState();
        set({
          ...fresh,
          prestige: newPrestige,
          tutorialSeen: true,
          personalRecords: newRecords,
          money: fresh.money + newPrestige * 2000, // $2k bonus per prestige level
          soundEnabled: state.soundEnabled,
          hapticEnabled: state.hapticEnabled,
          musicEnabled: state.musicEnabled,
          sirePenAnimalIds: [],
          vetRoomOwned: false,
          medicineCabinetOwned: false,
          hasCCTV: false,
          sickBayCapacity: 0,
          slurryLevel: 0,
          slurryCapacity: 0,
          silageLevel: 0,
          silageCapacity: 0,
          biogasMode: 'income',
          hatcheryCapacity: 0,
          incubationQueue: [],
        });
      },

      claimSeasonGoalReward: (goalId: string) => {
        const state = get();
        const goal = state.seasonGoals.find(g => g.id === goalId);
        if (!goal || goal.claimed) return;
        set({
          money: state.money + goal.reward,
          seasonGoals: state.seasonGoals.map(g => g.id === goalId ? { ...g, claimed: true } : g),
        });
      },

      markYearEndShown: () => {
        set({ yearEndShown: true });
      },

      treatAnimal: (animalId) => {
        const state = get();
        const animal = state.animals.find(a => a.id === animalId);
        if (!animal || !animal.sick) return;
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
        const cost = Math.max(50, Math.round((animalType?.maxSellPrice ?? 1000) * 0.05));
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          animals: state.animals.map(a => a.id === animalId ? { ...a, sick: false, sicknessDay: undefined } : a),
        });
      },

      installGreenhouse: (parcelId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId && p.owned);
        if (!parcel || parcel.greenhouse) return;
        const totalSlots = state.buildings.reduce((s, bId) => {
          const t = BUILDING_TYPES.find(bt => bt.id === bId);
          if (!bId.startsWith('bld_greenhouse')) return s;
          return s + (t?.capacity ?? 0);
        }, 0);
        const usedSlots = state.parcels.filter(p => p.greenhouse).length;
        if (usedSlots >= totalSlots) return;
        const cost = 2000;
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          parcels: state.parcels.map(p => p.id === parcelId ? { ...p, greenhouse: true } : p),
        });
      },

      removeGreenhouse: (parcelId) => {
        const state = get();
        set({ parcels: state.parcels.map(p => p.id === parcelId ? { ...p, greenhouse: false } : p) });
      },

      openFuture: (cropId, quantity, termDays) => {
        const state = get();
        const price = state.prices.find(p => p.cropId === cropId);
        if (!price || quantity <= 0) return;
        const lockPrice = Math.round(price.price * 100) / 100;
        const future: FuturesPosition = {
          id: `future_${state.day}_${cropId}_${Date.now()}`,
          cropId,
          quantity,
          lockPrice,
          deliveryDay: state.day + termDays,
          createdDay: state.day,
          settled: false,
        };
        set({ futures: [...(state.futures ?? []), future] });
      },

      joinCooperative: () => {
        const state = get();
        if (state.cooperative?.member) return;
        const joinFee = 500;
        if (state.money < joinFee) return;
        set({ money: state.money - joinFee, cooperative: { member: true, joinDay: state.day } });
      },

      leaveCooperative: () => {
        set({ cooperative: null });
      },

      joinCoop: (coopId: CoopId, sharesToBuy: number) =>
        set((state) => {
          const coopState = state.coopStates[coopId];
          if (!isCoopActive(coopState, getYear(state.day))) return state;
          if (state.coopMemberships[coopId]) return state;
          const sharePrice = INITIAL_SHARE_PRICES[coopId] * (0.5 + (coopState.health / 100) * 0.5 + 0.5);
          const cost = sharesToBuy * sharePrice;
          if (state.money < cost) return state;
          if (sharesToBuy < 10) return state;
          const membership: CoopMembership = {
            shares: sharesToBuy,
            sharePrice,
            joinDay: state.day,
            pendingRedemption: null,
            offenceHistory: [],
            seasonDelivered: 0,
            seasonObligation: 0,
            suspendedUntilSeason: null,
          };
          return {
            money: state.money - cost,
            coopMemberships: { ...state.coopMemberships, [coopId]: membership },
            coopStates: {
              ...state.coopStates,
              [coopId]: { ...coopState, memberCount: coopState.memberCount + 1 },
            },
          };
        }),

      leaveCoop: (coopId: CoopId) =>
        set((state) => {
          const membership = state.coopMemberships[coopId];
          if (!membership) return state;
          if (membership.pendingRedemption) return state;
          return {
            coopMemberships: {
              ...state.coopMemberships,
              [coopId]: { ...membership, pendingRedemption: { requestedDay: state.day } },
            },
          };
        }),

      deliverToCoop: (coopId: CoopId, itemId: string, volume: number) =>
        set((state) => {
          const membership = state.coopMemberships[coopId];
          if (!membership) return state;
          const coopState = state.coopStates[coopId];
          const currentSeason = getCoopSeason(state.day);
          if (isMemberSuspended(membership, currentSeason)) return state;
          const availableInProcessed = (state.processedInventory ?? [])
            .filter(i => i.itemId === itemId)
            .reduce((s, i) => s + i.quantity, 0);
          const availableInv =
            (state.inventory[itemId] ?? 0) +
            (state.animalInventory[itemId] ?? 0) +
            availableInProcessed;
          if (availableInv < volume) return state;
          const poolPrice = coopState.poolPrices[itemId] ?? 0;
          const fuelCost = COOP_DEPOT_FUEL_COST[coopId];
          const revenue = volume * poolPrice - fuelCost;
          let remaining = volume;
          const newInventory = { ...state.inventory };
          const newAnimalInventory = { ...state.animalInventory };
          const deductRecord = (inv: Record<string, number>) => {
            const avail = inv[itemId] ?? 0;
            const take = Math.min(avail, remaining);
            inv[itemId] = avail - take;
            remaining -= take;
          };
          deductRecord(newInventory);
          if (remaining > 0) deductRecord(newAnimalInventory);
          let newProcessedInventory = state.processedInventory ?? [];
          if (remaining > 0) {
            newProcessedInventory = newProcessedInventory.map(item => {
              if (item.itemId !== itemId || remaining <= 0) return item;
              const take = Math.min(item.quantity, remaining);
              remaining -= take;
              return { ...item, quantity: item.quantity - take };
            }).filter(item => item.quantity > 0);
          }
          return {
            money: state.money + revenue,
            inventory: newInventory,
            animalInventory: newAnimalInventory,
            processedInventory: newProcessedInventory,
            coopMemberships: {
              ...state.coopMemberships,
              [coopId]: {
                ...membership,
                seasonDelivered: membership.seasonDelivered + volume,
              },
            },
          };
        }),

      voteAGM: (coopId: CoopId, vote: 'yes' | 'no') =>
        set((state) => {
          const coopState = state.coopStates[coopId];
          if (!coopState.pendingAGM || coopState.pendingAGM.resolved) return state;
          const updatedProposal = { ...coopState.pendingAGM, playerVote: vote };
          const passes = resolveAGMVote(updatedProposal, coopState.memberCount);
          const newTerms = passes
            ? { ...coopState.terms, ...updatedProposal.changes }
            : coopState.terms;
          return {
            coopStates: {
              ...state.coopStates,
              [coopId]: {
                ...coopState,
                terms: newTerms,
                pendingAGM: { ...updatedProposal, resolved: true },
              },
            },
          };
        }),

      submitCounterProposal: (coopId: CoopId, changes: Partial<import('../engine/cooperativeTypes').CoopTerms>) =>
        set((state) => {
          const coopState = state.coopStates[coopId];
          if (!coopState.pendingAGM || !coopState.pendingAGM.resolved) return state;
          const currentSeason = getCoopSeason(state.day);
          const counterProposal = generateAGMProposal(coopId, currentSeason, coopState.health, coopState.terms);
          const overridden = { ...counterProposal, changes, playerVote: null as null };
          return {
            coopStates: {
              ...state.coopStates,
              [coopId]: { ...coopState, pendingAGM: overridden },
            },
          };
        }),

      bookCoopEquipment: (coopId: CoopId, equipmentId: string, day: number) =>
        set((state) => {
          const membership = state.coopMemberships[coopId];
          if (!membership) return state;
          const coopState = state.coopStates[coopId];
          const currentSeason = getCoopSeason(state.day);
          if (isMemberSuspended(membership, currentSeason)) return state;
          const equipIdx = coopState.equipment.findIndex(e => e.id === equipmentId);
          if (equipIdx === -1) return state;
          const item = coopState.equipment[equipIdx];
          if (item.unlocksAtHealth > coopState.health) return state;
          if (isSlotBooked(item, day)) return state;
          if (state.money < item.usageFeePerDay) return state;
          const newEquipment = coopState.equipment.map((e, i) =>
            i === equipIdx
              ? { ...e, bookings: [...e.bookings, { memberId: 'player', day }] }
              : e
          );
          return {
            money: state.money - item.usageFeePerDay,
            coopStates: {
              ...state.coopStates,
              [coopId]: { ...coopState, equipment: newEquipment },
            },
          };
        }),

      harvestAllReady: () => {
        const state = get();
        const yieldBonus = 1.0;
        const workerBonusesAll = getWorkerBonuses(state.workers ?? []);
        const siloCapacity = getSiloCapacity(state.buildings);
        const { harvestAmount } = require('../engine/crops');
        let totalInventory = Object.values(state.inventory).reduce((a: number, b) => a + (b as number), 0);
        let newInventory = { ...state.inventory };
        const newHarvestedCropIds = [...state.harvestedCropIds];
        const newParcels = state.parcels.map(p => {
          if (!p.plantedCrop || !p.owned || totalInventory >= siloCapacity) return p;
          const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
          if (!cropType) return p;
          if (state.day < p.plantedCrop.plantedDay + Math.round(cropType.growthDays)) return p;
          const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
          const waterScale = (cropType.waterNeed ?? 3) / 5;
          const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
          const unresolvedEvents = state.fieldEvents.filter(e => e.parcelId === p.id && !e.resolved).length;
          const fieldEventMod = Math.pow(0.75, unresolvedEvents);
          const waterBonus = hasWaterTower(state.buildings) ? 1.05 : 1.0;
          const rotationMod = p.lastCropId && p.lastCropId !== p.plantedCrop.cropId ? 1.15 : 1.0;
          const irrigationMod = p.irrigated ? 1.20 : 1.0;
          const soilMod = getSoilModifier(p.soilType, p.plantedCrop.cropId);
          const rawUnits = harvestAmount(p.plantedCrop, cropType, p.soil ?? SOIL_DEFAULTS, climateModifier, p.hasWeeds, yieldBonus, p.plantedCrop.frostDamage ?? 0, p.plantedCrop.droughtStress ?? 0) * pestYieldModifier(p.pestState?.severity ?? 0);
          const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationMod * soilMod), siloCapacity - totalInventory);
          totalInventory += units;
          newInventory[p.plantedCrop.cropId] = (newInventory[p.plantedCrop.cropId] ?? 0) + units;
          if (!newHarvestedCropIds.includes(p.plantedCrop.cropId)) newHarvestedCropIds.push(p.plantedCrop.cropId);
          const newFertility = Math.max(1, p.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonusesAll.fertilityDrainMult));
          return { ...p, plantedCrop: null, lastCropId: p.plantedCrop.cropId, fertility: newFertility, cropHistory: [...(p.cropHistory ?? []).slice(-3), p.plantedCrop.cropId] };
        });
        set({ parcels: newParcels, inventory: newInventory, harvestedCropIds: newHarvestedCropIds });
      },

      setAutoSell: (cropId, settings) => {
        const state = get();
        if (settings === null) {
          const next = { ...state.autoSell };
          delete next[cropId];
          set({ autoSell: next });
        } else {
          set({ autoSell: { ...state.autoSell, [cropId]: settings } });
        }
      },

      startNewSeason: () => {
        const state = get();
        if (state.day < 365) return;
        // Keep buildings, machines, owned parcels (cleared), animals, savings, money, prestige
        const clearedParcels = state.parcels.map(p =>
          p.owned
            ? { ...p, plantedCrop: null, hasWeeds: false }
            : p
        );
        const clearedAnimals = state.animals.map(a => ({
          ...a,
          sick: false,
          sicknessDay: undefined,
          lastProductionDay: 1,
          lastBreedDay: 1,
        }));
        const initial = makeInitialState();
        set({
          ...initial,
          // Carry over
          money: state.money,
          savings: state.savings,
          timeDeposits: state.timeDeposits,
          buildings: state.buildings,
          machines: state.machines,
          parcels: clearedParcels,
          animals: clearedAnimals,
          animalInventory: {},
          farmName: state.farmName,
          harvestedCropIds: state.harvestedCropIds,
          completedMilestones: state.completedMilestones,
          tutorialSeen: true,
          cooperative: state.cooperative,
          autoSell: state.autoSell,
          prestige: (state.prestige ?? 0) + 1,
          reputation: Math.min(100, (state.reputation ?? 50) + 10),
          yearEndShown: false,
        });
      },

      hireWorker: (typeId) => {
        const state = get();
        const config = WORKER_ROLE_CONFIG[typeId];
        if (!config) return;
        const [wMin, wMax] = config.wageRangeJunior;
        const worker: Worker = {
          id: `worker_${Date.now()}`,
          name: 'Unnamed Worker',
          age: 25,
          nationality: 'Irish',
          role: typeId,
          department: config.department,
          experienceYears: 0,
          tier: 1,
          unlockedNodeIds: [],
          certifications: [],
          contractType: 'permanent',
          wagePerDay: Math.round((wMin + wMax) / 2),
          hireDay: state.day,
          satisfaction: 70,
          satisfactionHistory: [],
          isInjured: false,
          workEthic: 70,
          teamPlayer: 70,
          stressThreshold: 60,
          personalityRevealed: false,
          goodChemistryWith: [],
          badChemistryWith: [],
          chemistryCheckedWith: [],
          isStudying: false,
          isOnLeave: false,
          nightShift: false,
        };
        set({ workers: [...(state.workers ?? []), worker] });
      },

      fireWorker: (workerId) => {
        const state = get();
        set({ workers: (state.workers ?? []).filter((w: Worker) => w.id !== workerId) });
      },

      postVacancy: (role, contractType, offeredWage) => {
        const state = get();
        const season = getSeason(state.day);
        const count = applicantCountForSeason(season);
        const applicants = count > 0 ? generateApplicants(role, season, count) : [];
        const posting: WorkerJobPosting = {
          id: `posting_${Date.now()}`,
          role, contractType,
          offeredWagePerDay: offeredWage,
          postedDay: state.day,
          applicants,
          applicantsGeneratedDay: count > 0 ? state.day + Math.floor(Math.random() * 3) + 1 : undefined,
          closed: false,
        };
        set({ jobPostings: [...(state.jobPostings ?? []), posting] });
      },

      closePosting: (postingId) => {
        const state = get();
        set({ jobPostings: (state.jobPostings ?? []).map(p => p.id === postingId ? { ...p, closed: true } : p) });
      },

      hireApplicant: (postingId, applicantId) => {
        const state = get();
        const posting = (state.jobPostings ?? []).find(p => p.id === postingId);
        if (!posting) return;
        const applicant = posting.applicants.find(a => a.id === applicantId);
        if (!applicant) return;
        const worker = createWorkerFromApplicant(applicant, posting.role, posting.contractType, state.day);
        set({
          workers: [...(state.workers ?? []), worker],
          jobPostings: (state.jobPostings ?? []).map(p => p.id === postingId ? { ...p, closed: true } : p),
          money: state.money - 200,
        });
      },

      approveRequest: (requestId) => {
        const state = get();
        const req = (state.pendingRequests ?? []).find(r => r.id === requestId);
        if (!req) return;
        let workers = state.workers ?? [];
        let money = state.money;
        if (req.type === 'pay_rise') {
          const worker = workers.find(w => w.id === req.workerId);
          if (worker) {
            const newWage = Math.round(worker.wagePerDay * 1.15);
            workers = workers.map(w => w.id === req.workerId ? applyPayRiseApproved(w, newWage) : w);
          }
        } else if (req.type === 'time_off') {
          workers = workers.map(w => w.id === req.workerId ? applyTimeOffApproved(w, state.day, 3) : w);
        } else if (req.type === 'exam_fee') {
          workers = workers.map(w => w.id === req.workerId ? applyExamFeeApproved(w) : w);
          money -= req.cost ?? 400;
        } else if (req.type === 'performance_review') {
          workers = workers.map(w => w.id === req.workerId
            ? { ...w, lastPerformanceReviewDay: state.day, satisfaction: Math.min(100, w.satisfaction + 8) }
            : w);
        }
        const resolved: WorkerRequest = { ...req, resolved: true, resolution: 'approved' };
        set({
          workers,
          money,
          pendingRequests: (state.pendingRequests ?? []).filter(r => r.id !== requestId),
          requestLog: [resolved, ...(state.requestLog ?? [])].slice(0, 50),
        });
      },

      denyRequest: (requestId) => {
        const state = get();
        const req = (state.pendingRequests ?? []).find(r => r.id === requestId);
        if (!req) return;
        let workers = state.workers ?? [];
        if (req.type === 'pay_rise') {
          workers = workers.map(w => w.id === req.workerId ? applyPayRiseDenied(w) : w);
        }
        const resolved: WorkerRequest = { ...req, resolved: true, resolution: 'denied' };
        set({
          workers,
          pendingRequests: (state.pendingRequests ?? []).filter(r => r.id !== requestId),
          requestLog: [resolved, ...(state.requestLog ?? [])].slice(0, 50),
        });
      },

      chooseBranch: (workerId, branchId) => {
        const state = get();
        const worker = (state.workers ?? []).find(w => w.id === workerId);
        if (!worker || worker.tier < 3) return;
        const newNodes = calcUnlockedNodes(worker.role, worker.experienceYears, branchId);
        set({
          workers: (state.workers ?? []).map(w =>
            w.id === workerId ? { ...w, selectedBranch: branchId, unlockedNodeIds: newNodes } : w,
          ),
        });
      },

      startCertStudy: (workerId, certId) => {
        const state = get();
        const worker = (state.workers ?? []).find(w => w.id === workerId);
        if (!worker) return;
        const config = WORKER_ROLE_CONFIG[worker.role];
        const node = config.skillTree.find(n => n.certId === certId);
        if (!node) return;
        const existing = worker.certifications.find(c => c.id === certId);
        const cert = existing ?? {
          id: certId,
          name: node.name.replace('📜 ', ''),
          studyProgressHours: 0,
          totalHours: 60,
          examFeePaid: false,
          passed: false,
        };
        const updatedCerts = existing ? worker.certifications : [...worker.certifications, cert];
        set({
          workers: (state.workers ?? []).map(w =>
            w.id === workerId ? { ...w, isStudying: true, studyingCertId: certId, studyStartDay: state.day, certifications: updatedCerts } : w,
          ),
        });
      },

      setWorkerNightShift: (workerId, enabled) => {
        const state = get();
        set({ workers: (state.workers ?? []).map(w => w.id === workerId ? { ...w, nightShift: enabled } : w) });
      },

      hireConsultant: () => {
        set({ consultant: createDefaultConsultant() });
      },

      upgradeGridTier: () => {
        const state = get();
        const el = state.electricity;
        const next = nextGridTier(el.gridTier);
        if (!next) return;
        const cost = GRID_TIER_CONFIG[next].upgradeCost;
        if (state.money < cost) return;
        set({ money: state.money - cost, electricity: { ...el, gridTier: next } });
      },

      buySolarPanels: (count) => {
        const state = get();
        const el = state.electricity;
        const cost = count * SOLAR_COST_PER_PANEL;
        if (state.money < cost) return;
        const isFirst = el.solarPanelCount === 0 && !el.solarGrantClaimed;
        const grantAmount = isFirst ? Math.round(cost * SOLAR_GRANT_PCT) : 0;
        const pendingGrants: PendingGrant[] = isFirst
          ? [...el.pendingGrants, { amount: grantAmount, dueDay: state.day + 3, label: 'Solar renewable grant' }]
          : el.pendingGrants;
        set({
          money: state.money - cost,
          electricity: {
            ...el,
            solarPanelCount: el.solarPanelCount + count,
            solarGrantClaimed: isFirst ? true : el.solarGrantClaimed,
            pendingGrants,
          },
        });
      },

      buyWindTurbines: (count) => {
        const state = get();
        const el = state.electricity;
        const cost = count * WIND_COST_PER_TURBINE;
        if (state.money < cost) return;
        const isFirst = el.windTurbineCount === 0 && !el.windGrantClaimed;
        const grantAmount = isFirst ? Math.round(cost * WIND_GRANT_PCT) : 0;
        const pendingGrants: PendingGrant[] = isFirst
          ? [...el.pendingGrants, { amount: grantAmount, dueDay: state.day + 3, label: 'Wind renewable grant' }]
          : el.pendingGrants;
        set({
          money: state.money - cost,
          electricity: {
            ...el,
            windTurbineCount: el.windTurbineCount + count,
            windGrantClaimed: isFirst ? true : el.windGrantClaimed,
            pendingGrants,
          },
        });
      },

      buildBiogasPlant: () => {
        const state = get();
        const el = state.electricity;
        if (el.biogasPlantBuilt || state.money < BIOGAS_BUILD_COST) return;
        set({ money: state.money - BIOGAS_BUILD_COST, electricity: { ...el, biogasPlantBuilt: true } });
      },

      buildBiomassCHP: () => {
        const state = get();
        const el = state.electricity;
        if (el.biomassCHPBuilt || state.money < BIOMASS_BUILD_COST) return;
        set({ money: state.money - BIOMASS_BUILD_COST, electricity: { ...el, biomassCHPBuilt: true } });
      },

      loadBiomassStraw: () => {
        const state = get();
        const el = state.electricity;
        if (!el.biomassCHPBuilt) return;
        set({ electricity: { ...el, biomassFuelDaysRemaining: BIOMASS_FUEL_SEASON_DAYS } });
      },

      buildHeatPipeNetwork: () => {
        const state = get();
        const el = state.electricity;
        if (el.heatPipeNetworkBuilt || state.money < HEAT_PIPE_BUILD_COST) return;
        set({ money: state.money - HEAT_PIPE_BUILD_COST, electricity: { ...el, heatPipeNetworkBuilt: true } });
      },

      buyBatteryBanks: (count) => {
        const state = get();
        const el = state.electricity;
        const hasElecCert = (state.workers ?? []).some((w: Worker) =>
          w.role === 'farm_mechanic' &&
          w.certifications.some(c => c.id === 'fm_electrical' && c.passed)
        );
        if (!hasElecCert) return;
        const cost = count * BATTERY_COST_PER_BANK;
        if (state.money < cost) return;
        set({ money: state.money - cost, electricity: { ...el, batteryBankCount: el.batteryBankCount + count } });
      },

      buyGenerator: (model) => {
        const state = get();
        const el = state.electricity;
        if (el.generatorModel) return;
        const cost = GENERATOR_CONFIG[model].purchaseCost;
        if (state.money < cost) return;
        set({ money: state.money - cost, electricity: { ...el, generatorModel: model } });
      },

      refuelGenerator: (litres) => {
        const state = get();
        const el = state.electricity;
        if (!el.generatorModel) return;
        const cap = GENERATOR_CONFIG[el.generatorModel].tankCapacityLitres;
        set({ electricity: { ...el, generatorFuelLitres: Math.min(cap, el.generatorFuelLitres + litres) } });
      },

      toggleGenerator: () => {
        const state = get();
        const el = state.electricity;
        if (!el.generatorModel) return;
        set({ electricity: { ...el, generatorActive: !el.generatorActive } });
      },

      serviceEquipment: (type) => {
        const state = get();
        const el = state.electricity;
        const hasElecCert = (state.workers ?? []).some((w: Worker) =>
          w.role === 'farm_mechanic' &&
          w.certifications.some(c => c.id === 'fm_electrical' && c.passed)
        );
        if (!hasElecCert) return;
        const cost = type === 'solar' ? SOLAR_SERVICE_COST : type === 'wind' ? WIND_SERVICE_COST : BATTERY_SERVICE_COST;
        if (state.money < cost) return;
        const damagedSources = el.damagedSources.filter(s => s !== type);
        const patch =
          type === 'solar'   ? { solarPanelHealth: 95,  solarLastServiceDay: state.day, damagedSources }
        : type === 'wind'    ? { windTurbineHealth: 95,  windLastServiceDay: state.day, damagedSources }
        :                      { batteryHealthPercent: 95, batteryLastServiceDay: state.day, damagedSources };
        set({ money: state.money - cost, electricity: { ...el, ...patch } });
      },

      addSurgeProtector: (buildingId) => {
        const state = get();
        const el = state.electricity;
        if (el.surgeProtectedBuildings.includes(buildingId)) return;
        if (state.money < SURGE_PROTECTOR_COST) return;
        set({
          money: state.money - SURGE_PROTECTOR_COST,
          electricity: { ...el, surgeProtectedBuildings: [...el.surgeProtectedBuildings, buildingId] },
        });
      },

      // -- Pest & Disease actions -----------------------------------------------
      treatPest: (parcelId, productId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel?.pestState) return;

        const config = PEST_CONFIG[parcel.pestState.type];
        const inStock = state.productInventory[productId] ?? 0;
        if (inStock <= 0) return;

        // Check product matches required treatment type
        const TREATMENT_MAP: Record<string, string[]> = {
          fungicide:   ['fungal', 'blight'],
          insecticide: ['insect'],
          nematicide:  ['nematode'],
        };
        const { PRODUCT_TYPES } = require('../data/productTypes');
        const product = PRODUCT_TYPES.find((p: any) => p.id === productId);
        if (!product) return;
        const treatable = TREATMENT_MAP[product.category] ?? [];
        if (!treatable.includes(parcel.pestState.type)) return;

        set({
          parcels: state.parcels.map(p =>
            p.id === parcelId ? { ...p, pestState: undefined } : p
          ),
          productInventory: { ...state.productInventory, [productId]: inStock - 1 },
        });
      },

      buyBeneficialInsects: () => {
        const state = get();
        if (state.beneficialInsectsActive) return;
        const COST = 2400;
        if (state.money < COST) return;
        set({ money: state.money - COST, beneficialInsectsActive: true });
      },

      assignCropConsultant: (parcelIds) => {
        const state = get();
        const hasConsultant = (state.workers ?? []).some(w => w.role === 'crop_consultant');
        if (!hasConsultant) return;
        // Limit to 20 ha total
        const totalHa = state.parcels
          .filter(p => parcelIds.includes(p.id))
          .reduce((s, p) => s + p.hectares, 0);
        if (totalHa > 20) return;
        set({ cropConsultantParcelIds: parcelIds });
      },

      // -- Selling Channels actions -------------------------------------------
      buyFarmShopUpgrade: () => {
        const state = get();
        const nextTier = (state.farmShop.tier + 1) as 1 | 2 | 3;
        if (nextTier > 3) return;
        const costs = [0, 15000, 45000, 120000];
        const cost = costs[nextTier];
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          farmShop: { ...state.farmShop, tier: nextTier },
        });
      },

      setShopHours: (openDays, openHours) => {
        const state = get();
        set({ farmShop: { ...state.farmShop, openDays, openHours } });
      },

      assignShopWorker: (workerId) => {
        const state = get();
        if (state.farmShop.assignedWorkerIds.includes(workerId)) return;
        set({
          farmShop: { ...state.farmShop, assignedWorkerIds: [...state.farmShop.assignedWorkerIds, workerId] },
        });
      },

      unassignShopWorker: (workerId) => {
        const state = get();
        set({
          farmShop: { ...state.farmShop, assignedWorkerIds: state.farmShop.assignedWorkerIds.filter(id => id !== workerId) },
        });
      },

      toggleOnlineShop: () => {
        const state = get();
        if (!state.onlineShopActive && state.farmShop.tier < 2) return;
        set({ onlineShopActive: !state.onlineShopActive });
      },

      setOnlineAllocation: (productId, units) => {
        const state = get();
        set({
          onlineShopAllocations: { ...state.onlineShopAllocations, [productId]: units },
        });
      },

      toggleFarmCafe: () => {
        const state = get();
        if (!state.farmCafeOpen && state.farmShop.tier < 3) return;
        set({ farmCafeOpen: !state.farmCafeOpen });
      },

      assignCafeWorker: (workerId) => {
        const state = get();
        if (state.farmCafeWorkerIds.includes(workerId)) return;
        set({
          farmCafeWorkerIds: [...state.farmCafeWorkerIds, workerId],
        });
      },

      unassignCafeWorker: (workerId) => {
        const state = get();
        set({
          farmCafeWorkerIds: state.farmCafeWorkerIds.filter(id => id !== workerId),
        });
      },

      enterAgriculturalShow: (productId, batchId) => {
        const state = get();
        // Simplified: just award based on quality
        const { judgeAward, awardPriceBonus } = require('../engine/sellingChannels');
        const quality = state.cropQualityMap?.[productId] ?? 50;
        const award = judgeAward(quality);
        if (award) {
          const bonus = awardPriceBonus(award);
          const currentBonus = state.productAwardBonuses[productId] ?? 0;
          const newBonus = Math.min(60, currentBonus + bonus);
          set({
            productAwardBonuses: { ...state.productAwardBonuses, [productId]: newBonus },
            awardHistory: [...state.awardHistory, { day: state.day, productId, showName: 'County Show', award }],
            reputation: Math.min(100, state.reputation + (award === 'gold' ? 5 : award === 'silver' ? 3 : 1)),
          });
        }
      },

      installIrrigation: (parcelId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId && p.owned);
        if (!parcel || parcel.irrigated) return;
        const cost = 3000;
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          parcels: state.parcels.map(p => p.id === parcelId ? { ...p, irrigated: true } : p),
        });
      },

      collectAllProduction: () => {
        const state = get();
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const { collectProduction } = require('../engine/animals');
        const graneroBonus = state.buildings.includes('bld_granero') ? 1.2 : 1.0;
        let newAnimalInventory = { ...state.animalInventory };
        const newAnimals = state.animals.map((animal: OwnedAnimal) => {
          const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
          if (!animalType?.productionType) return animal;
          const { units, nextDay } = collectProduction(animal, animalType, state.day);
          if (units <= 0) return animal;
          newAnimalInventory[animalType.productionType] = (newAnimalInventory[animalType.productionType] ?? 0) + Math.round(units * graneroBonus);
          return { ...animal, lastProductionDay: nextDay };
        });
        set({ animals: newAnimals, animalInventory: newAnimalInventory });
      },

      renegotiateLoan: (loanId, extraDays) => {
        const state = get();
        const loan = state.loans.find(l => l.id === loanId);
        if (!loan || loan.paid || loan.defaulted || loan.renegotiated) return;
        if (loan.payoffDay - state.day <= 7) return; // too close to due date
        const fee = Math.round(loan.principal * 0.02);
        if (state.money < fee) return;
        set({
          money: state.money - fee,
          loans: state.loans.map(l => l.id === loanId
            ? { ...l, payoffDay: l.payoffDay + extraDays, renegotiated: true }
            : l
          ),
        });
      },

      takeBankruptcyLoan: () => {
        const state = get();
        const principal = 2000;
        const rate = 0.20;
        const termDays = 60;
        const totalOwed = Math.round(principal * (1 + rate * termDays / 365));
        const loan: import('../engine/banking').Loan = {
          id: `loan_emergency_${state.day}`,
          label: 'Emergency Loan',
          principal,
          rate,
          startDay: state.day,
          termDays,
          payoffDay: state.day + termDays,
          totalOwed,
          paid: false,
          defaulted: false,
        };
        set({ money: state.money + principal, loans: [...state.loans, loan], bankrupt: false });
      },

      clearBankruptcy: () => {
        set({ bankrupt: false });
      },

      selectMapField: (id) => set({ selectedMapFieldId: id }),

      savePanZoom: (x, y, zoom) => set({ mapPanX: x, mapPanY: y, mapZoom: zoom }),

      buyMapField: (id) => {
        const state = get();
        const field = state.mapFields.find(f => f.id === id);
        if (!field || field.owner !== 'forsale' || !field.askingPrice) return;
        if (state.money < field.askingPrice) return;
        const parcelId = `p-${id}`;
        set({
          money: state.money - field.askingPrice,
          parcels: state.parcels.map(p =>
            p.id === parcelId ? { ...p, owned: true } : p
          ),
          mapFields: state.mapFields.map(f =>
            f.id === id ? { ...f, owner: 'player' as MapOwner, parcelId } : f
          ),
        });
      },

      scoutMapField: (id) => {
        const state = get();
        const field = state.mapFields.find(f => f.id === id);
        if (!field || field.owner === 'player' || field.owner === 'forsale') return;
        if (state.money < 500) return;
        set({
          money: state.money - 500,
          mapFields: state.mapFields.map(f =>
            f.id === id ? { ...f, scouted: true, scoutExpiresDay: state.day + 30 } : f
          ),
        });
      },

      // ── Water system actions (Task 4) ────────────────────────────────────
      assignHydrogeologist: (parcelId) => {
        const state = get();
        // Require hired hydrogeologist
        const hasHydro = (state.workers ?? []).some(w => w.role === 'hydrogeologist');
        if (!hasHydro) return;
        // Only one active survey at a time
        const busySurvey = (state.wells ?? []).some(w => w.status === 'surveying');
        if (busySurvey) return;
        const surveyDays = 5 + Math.floor(Math.random() * 6); // 5·10 days
        const newWell: Well = {
          id: `well_${Date.now()}`,
          parcelId,
          status: 'surveying',
          surveyCompletesDay: state.day + surveyDays,
          flowRateTarget: 0,
          connectedParcelIds: [],
        };
        set({ wells: [...(state.wells ?? []), newWell] });
      },
      startDrilling: (wellId, spotId, targetFlowRate) => {
        const state = get();
        const well = (state.wells ?? []).find(w => w.id === wellId);
        if (!well || well.status !== 'survey_ready') return;
        const spot = well.surveySpots?.find(s => s.id === spotId);
        if (!spot) return;
        // Estimate cost to verify budget (use midpoint estimate)
        const estCost = (spot.estimatedCostMin + spot.estimatedCostMax) / 2;
        if (state.money < estCost) return;
        const drillingDays = 5 + Math.floor(Math.random() * 3); // 5·7 days
        set({
          wells: (state.wells ?? []).map(w =>
            w.id === wellId
              ? { ...w, status: 'drilling', chosenSpotId: spotId, flowRateTarget: targetFlowRate, drillingCompletesDay: state.day + drillingDays }
              : w
          ),
        });
      },
      installPump: (wellId, pumpTier) => {
        const state = get();
        const well = (state.wells ?? []).find(w => w.id === wellId);
        if (!well || well.status !== 'active') return;
        if (well.pumpTier) return; // already installed
        const { PUMP_SPECS } = require('../engine/water');
        const pumpCost = PUMP_SPECS[pumpTier].cost;
        if (state.money < pumpCost) return;
        set({
          money: state.money - pumpCost,
          wells: (state.wells ?? []).map(w =>
            w.id === wellId ? { ...w, pumpTier } : w
          ),
        });
      },
      connectParcel: (wellId, parcelId) => {
        const state = get();
        const well = (state.wells ?? []).find(w => w.id === wellId);
        if (!well || well.status !== 'active' || !well.pumpTier) return;
        if (well.connectedParcelIds.includes(parcelId)) return;
        const wellParcelIdx = (state.parcels ?? []).findIndex(p => p.id === well.parcelId);
        const targetIdx     = (state.parcels ?? []).findIndex(p => p.id === parcelId);
        const cost = pipeCost(wellParcelIdx, targetIdx);
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          wells: (state.wells ?? []).map(w =>
            w.id === wellId
              ? { ...w, connectedParcelIds: [...w.connectedParcelIds, parcelId] }
              : w
          ),
          parcels: (state.parcels ?? []).map(p =>
            p.id === parcelId ? { ...p, irrigated: true } : p
          ),
        });
      },
      disconnectParcel: (wellId, parcelId) => {
        const state = get();
        set({
          wells: (state.wells ?? []).map(w =>
            w.id === wellId
              ? { ...w, connectedParcelIds: w.connectedParcelIds.filter(id => id !== parcelId) }
              : w
          ),
          parcels: (state.parcels ?? []).map(p =>
            p.id === parcelId ? { ...p, irrigated: false } : p
          ),
        });
      },
      setGridWater: (active) => {
        set({ gridWaterActive: active });
      },
    }),
    {
      name: 'granja-tycoon-save-v9',
      version: 7,
      migrate: (persistedState: any, version: number) => {
        if (version < 7) {
          const old = persistedState as any;
          const oldCoop = old.cooperative ?? null;
          let coopMemberships: Partial<Record<CoopId, CoopMembership>> = {};
          if (oldCoop?.member === true) {
            coopMemberships.grain = {
              shares: 10,
              sharePrice: 80,
              joinDay: oldCoop.joinDay ?? 1,
              pendingRedemption: null,
              offenceHistory: [],
              seasonDelivered: 0,
              seasonObligation: 0,
              suspendedUntilSeason: null,
            };
          }
          return {
            ...old,
            cooperative: null,
            coopMemberships,
            coopStates: {
              grain: makeInitialCoopState('grain'),
              horticulture: makeInitialCoopState('horticulture'),
              livestock: makeInitialCoopState('livestock'),
            },
          };
        }
        return persistedState;
      },
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
      // Only persist data · never persist action functions (Zustand v5 requirement)
      partialize: (state: GameState) => {
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          advanceDay, buyParcel, plantCrop, harvestCrop, sellCrop,
          buyAnimal, sellAnimal, collectAnimalProduction, sellAnimalProduct, breedAnimal, cullAnimal, treatAnimal,
          buyMachine, requestLoan, repayLoan, depositSavings, withdrawSavings,
          acceptContract, declineContract, deliverCrop, buyProduct, buyBuilding,
          resolveFieldEvent, clearWeeds, fertilizeCrop, listItem, withdrawListing, placeBid, clearDaySummary,
          buyInsurance, cancelInsurance,
          processProduct, sellProcessed,
          buyProcessingBuilding, upgradeProcessingBuilding,
          assignWorkerToProcessingBuilding, unassignWorkerFromProcessingBuilding,
          installColdStorage,
          openTimeDeposit, closeTimeDeposit, resetGame, markTutorialSeen, markYearEndShown,
          installGreenhouse, removeGreenhouse, openFuture, joinCooperative, leaveCooperative,
          joinCoop, leaveCoop, deliverToCoop, voteAGM, submitCounterProposal, bookCoopEquipment,
          harvestAllReady, collectAllProduction, setAutoSell, startNewSeason,
          hireWorker, fireWorker, installIrrigation,
          renegotiateLoan, takeBankruptcyLoan, clearBankruptcy,
          setBreedingPair, clearBreedingPair,
          enterAnimalShow, withdrawAnimalShow,
          dismissHint,
          counterOfferContract, upgradeAnimalGene, sellSeedBatch, buyMarketSeed,
          cureDisease, plantCropBatch, setFarmName, addPriceAlert, removePriceAlert, placeMarketOrder, cancelMarketOrder, setSelectedMarket,
          startHybridization, selectSeedForParcel, startRepair,
          buyAttachment, buyTrailer, hitchTrailer, assignJob, assignHarvestJob, hireContractor,
          selectMapField, buyMapField, scoutMapField, savePanZoom,
          designateAsSire, removeFromSirePen, spreadSlurry, fillSilagePit, setBiogasMode, queueEggsForIncubation,
          applySoilAmendment, applySoilNPK, plantCoverCrop,
          assignHydrogeologist, startDrilling, installPump, connectParcel, disconnectParcel, setGridWater,
          postVacancy, closePosting, hireApplicant, approveRequest, denyRequest,
          chooseBranch, startCertStudy, setWorkerNightShift, hireConsultant,
          upgradeGridTier, buySolarPanels, buyWindTurbines, buildBiogasPlant, buildBiomassCHP,
          loadBiomassStraw, buildHeatPipeNetwork, buyBatteryBanks, buyGenerator, refuelGenerator,
          toggleGenerator, serviceEquipment, addSurgeProtector,
          treatPest, buyBeneficialInsects, assignCropConsultant,
          buyFarmShopUpgrade, setShopHours, assignShopWorker, unassignShopWorker,
          toggleOnlineShop, setOnlineAllocation, toggleFarmCafe,
          assignCafeWorker, unassignCafeWorker, enterAgriculturalShow,
          ...dataState
        } = state;
        return {
          ...dataState,
          consultant: state.consultant,
          pendingRequests: state.pendingRequests,
          requestLog: state.requestLog,
          jobPostings: state.jobPostings,
          employerReputation: state.employerReputation,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const b = state.buildings ?? [];
        state.vetRoomOwned         = b.includes('bld_vet_room');
        state.medicineCabinetOwned = b.includes('bld_medicine_cabinet');
        state.hasCCTV              = b.includes('bld_cctv_monitor');
        state.sickBayCapacity      = (b.includes('bld_isolation_sick_bay_s') ? 5 : 0) +
                                      (b.includes('bld_isolation_sick_bay_m') ? 15 : 0);
        state.sirePenAnimalIds     = state.sirePenAnimalIds ?? [];
        state.slurryCapacity       = (b.includes('bld_slurry_tank_s') ? 5000 : 0) +
                                      (b.includes('bld_slurry_tank_m') ? 15000 : 0) +
                                      (b.includes('bld_slurry_tank_l') ? 40000 : 0);
        state.slurryLevel          = state.slurryLevel ?? 0;
        state.silageCapacity = (b.includes('bld_silage_pit_s') ? 5000 : 0) +
                                (b.includes('bld_silage_pit_m') ? 15000 : 0) +
                                (b.includes('bld_silage_pit_l') ? 40000 : 0);
        state.silageLevel    = state.silageLevel ?? 0;
        state.biogasMode     = state.biogasMode ?? 'income';
        state.processingBuildings = state.processingBuildings ?? [];
        state.hatcheryCapacity = (b.includes('bld_hatchery_s') ? 50 : 0) +
                                  (b.includes('bld_hatchery_m') ? 150 : 0) +
                                  (b.includes('bld_hatchery_l') ? 400 : 0);
        state.incubationQueue  = state.incubationQueue ?? [];
        state.parcels = state.parcels.map((p) => ({
          ...p,
          soil: {
            ...SOIL_DEFAULTS,
            nitrogen:     (p.soil?.nitrogen ?? Math.round((p.fertility / 25) * 100)),
            organicMatter:(p.soil?.organicMatter ?? SOIL_DEFAULTS.organicMatter),
            compaction:   (p.soil?.compaction ?? SOIL_DEFAULTS.compaction),
            pH:           (p.soil?.pH ?? SOIL_DEFAULTS.pH),
            microbialLife:(p.soil?.microbialLife ?? SOIL_DEFAULTS.microbialLife),
            phosphorus:   (p.soil?.phosphorus ?? SOIL_DEFAULTS.phosphorus),
            potassium:    (p.soil?.potassium  ?? SOIL_DEFAULTS.potassium),
            drainage:     (p.soil?.drainage   ?? SOIL_DEFAULTS.drainage),
          },
          cropHistory: p.cropHistory ?? [],
        }));
      },
    }
  )
);



