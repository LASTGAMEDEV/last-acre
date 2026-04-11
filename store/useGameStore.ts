import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PlantedCrop, SoilType, getSoilModifier, harvestAmount } from '../engine/crops';
import { OwnedAnimal, AnimalGenes, inheritTrait, randomGenes, breedGenes, isAtOptimalWeight } from '../engine/animals';
import { MarketPrice, NewsEvent } from '../engine/market';
import { WeatherDay } from '../engine/climate';
import { Loan, SavingsAccount, TimeDeposit, SaleRecord, LoanRecord,
         loanTotalOwed, calculateRate, accrueInterest } from '../engine/banking';
import { Contract } from '../engine/contracts';
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
import { PROCESSING_RECIPES, PROCESSED_PRODUCTS } from '../data/processingTypes';
import { MILESTONES, checkNewMilestones, MILESTONE_REWARDS } from '../data/milestones';
import { applyDailyFluctuation, sellRevenue, SellPressure, computeSellPressureModifier, sellPressureDuration } from '../engine/market';
import { getSeason, generateForecast } from '../engine/climate';
import { ENCLOSURE_BUILDINGS } from '../constants/enclosures';
import { WorkerRole, WorkerType as WorkerTypeDef } from '../data/workerTypes';
import { GameEventType } from '../data/randomEvents';
import { rollEvent, calcRepairCost, calcRepairDays, getHarvestModifier } from '../engine/events';
import { NPCFarmRuntime, initNpcFarms, npcSellVolume, npcAuctionBid } from '../engine/competitors';
import { ATTACHMENT_TYPES, AttachmentType } from '../data/attachmentTypes';
import { ContractorOperation, calcJobDays, canAssignJob, getTransportCapacityKg } from '../engine/machinery';
import { MapField, MapOwner } from '../types/worldMap';
import { INITIAL_MAP_FIELDS } from '../data/mapFields';
import { MarketId, MARKET_REGIONS } from '../data/marketRegions';
import { NPC_FARM_GROUP } from '../data/npcFarmGroups';

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
  fertility: number;
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
  diseased?: boolean;   // crop blight — reduces yield, spreads to neighbors
  diseasedDay?: number; // day disease started; crop dies after 20 days untreated
}

export interface OwnedWorker {
  id: string;
  typeId: WorkerRole;
  hiredDay: number;
}

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
  yield:    number; // multiplies harvest output (0.5–1.5)
  drought:  number; // divides weather penalty severity (0.5–1.5)
  growth:   number; // divides effective growthDays (0.5–1.5)
  quality:  number; // multiplies processed output (0.5–1.5)
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
  affectedIds?: string[]; // parcel IDs, animal ID, crop ID — depends on type
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
  hygiene: number;               // 0–100
  capacity: number;              // daily throughput (animals/day) — copied from BuildingType.dailyCapacity at purchase time
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
  // Payload — only the relevant field is set per category
  parcelId?: string;                 // land
  parcel?: LandParcel;               // land (kept for display, same as AuctionLot)
  animalId?: string;                 // animal (player-listed)
  animalTypeId?: string;             // animal (NPC-generated)
  animalGenes?: AnimalGenes;         // animal
  animalSex?: 'male' | 'female';           // animal — preserved for withdrawal
  animalBornDay?: number;                   // animal — preserved for withdrawal
  machinePurchasedDay?: number;             // machinery — preserved for withdrawal
  cropId?: string;                   // crop
  cropQuantity?: number;             // crop
  machineId?: string;                // machinery (player-listed)
  machineTypeId?: string;            // machinery (NPC-generated)
  conditionScore?: number;           // machinery (0–100)
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

export interface GameState {
  day: number;
  money: number;

  parcels: LandParcel[];
  animals: OwnedAnimal[];
  animalInventory: Record<string, number>;
  machines: OwnedMachine[];

  prices: MarketPrice[];
  newsEvents: NewsEvent[];

  loans: Loan[];
  savings: SavingsAccount;
  timeDeposits: TimeDeposit[];
  contracts: Contract[];

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

  processedInventory: Record<string, number>;
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
  reputation: number;
  autoSell: Record<string, { enabled: boolean; minPrice: number }>;
  prestige: number;
  workers: OwnedWorker[];
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
  animalWelfareScores: Record<string, number>;   // animalTypeId → 0–100
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
  grainMissedDays: number;   // 0–7 rolling: how many of last 7 days grain was short
  hayMissedDays: number;     // 0–7 rolling: how many of last 7 days hay was short
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
  plantCropBatch: (cropId: string, fertilized: boolean) => void;
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
  buyParcel: (parcelId: string) => void;
  plantCrop: (parcelId: string, cropId: string, hectares: number, fertilized: boolean) => void;
  harvestCrop: (parcelId: string) => void;
  sellCrop: (cropId: string, units: number, marketId?: MarketId) => void;
  buyAnimal: (typeId: string, sex: 'male' | 'female') => void;
  addToHenil: () => void;
  feedAnimals: () => void;
  sellAnimal: (animalId: string) => void;
  collectAnimalProduction: (animalId: string) => void;
  sellAnimalProduct: (productType: string, units: number) => void;
  breedAnimal: (animalId: string) => void;
  treatAnimal: (animalId: string) => void;
  buyMachine: (typeId: string) => void;
  requestLoan: (principal: number, termDays: number, label: string) => void;
  repayLoan: (loanId: string) => void;
  depositSavings: (amount: number) => void;
  withdrawSavings: (amount: number) => void;
  acceptContract: (templateId: string) => void;
  declineContract: (templateId: string) => void;
  deliverCrop: (contractId: string, amount: number) => void;
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
  harvestAllReady: () => void;
  collectAllProduction: () => void;
  setAutoSell: (cropId: string, settings: { enabled: boolean; minPrice: number } | null) => void;
  startNewSeason: () => void;
  hireWorker: (typeId: WorkerRole) => void;
  fireWorker: (workerId: string) => void;
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
  return CROP_TYPES.map(c => ({ cropId: c.id, price: c.basePrice, basePrice: c.basePrice }));
}

function generateInitialListings(): AuctionListing[] {
  const premiumParcels: LandParcel[] = [
    { id: 'auction_p0', name: 'Gold Acre',   fertility: 22, hectares: 5,  pricePerHa: 55000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false },
    { id: 'auction_p1', name: 'Prime Ridge', fertility: 25, hectares: 2,  pricePerHa: 60000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false },
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
    salesLog: [] as SaleRecord[],
    loanHistory: [] as LoanRecord[],
    forecast: generateForecast('spring'),
    todayWeather: null as WeatherDay | null,
    inventory: {} as Record<string, number>,
    priceHistory: Object.fromEntries(CROP_TYPES.map(c => [c.id, [c.basePrice]])) as Record<string, number[]>,
    productInventory: {} as Record<string, number>,
    buildings: [] as string[],
    declinedTemplates: [] as string[],
    fieldEvents: [] as FieldEvent[],
    listings: generateInitialListings(),
    nextAnimalAuctionDay: 8,
    daySummary: null as DaySummaryEvent[] | null,
    insurances: [] as InsurancePolicy[],
    insuranceClaims: [] as InsuranceClaim[],
    processedInventory: {} as Record<string, number>,
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
    reputation: 50,
    autoSell: {} as Record<string, { enabled: boolean; minPrice: number }>,
    prestige: 0,
    workers: [] as OwnedWorker[],
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
    animalPrices: { eggs: 3.50, milk: 0.90, honey: 25.0, wool: 42.0, meat: 14.0 },
    personalRecords: { peakMoney: 1_000_000, totalHarvests: 0, bestSeasonRevenue: 0, longestDay: 1 },
    seasonalEvent: null as { type: 'heat_wave' | 'flood' | 'frost'; startDay: number; endsDay: number; severity: number } | null,
    farmName: 'My Farm',
    fuel: 200,
    fuelPrice: 1.20,
    deliveryJobs: [],
    productionBuildings: [],
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
    pendingPickup: [],
    priceAlerts: [] as PriceAlert[],
    showEntries: [] as ShowEntry[],
    showResults: [] as ShowResult[],
    showWindowOpen: false,
    marketOrders: [] as MarketOrder[],
    selectedMarket: 'local' as MarketId,
  };
}

function getWorkerBonuses(workers: OwnedWorker[]) {
  const fieldWorkerCount = workers.filter(w => w.typeId === 'field_worker').length;
  const agronomistCount  = workers.filter(w => w.typeId === 'agronomist').length;
  const botanistCount    = workers.filter(w => w.typeId === 'botanist').length;
  const keeperCount      = workers.filter(w => w.typeId === 'animal_keeper').length;
  const zootechCount     = workers.filter(w => w.typeId === 'zootechnician').length;
  const mechanicCount    = workers.filter(w => w.typeId === 'mechanic').length;
  const engineerCount    = workers.filter(w => w.typeId === 'engineer').length;
  const processorCount   = workers.filter(w => w.typeId === 'processor').length;
  const supervisorCount  = workers.filter(w => w.typeId === 'supervisor').length;

  return {
    // Fields
    cropYieldMultiplier:    1 + (fieldWorkerCount * 0.05) + (agronomistCount * 0.15),
    cropGrowthReduction:    agronomistCount > 0 ? 1 : 0,
    fertilityDrainMult:     botanistCount > 0 ? 0.5 : 1.0,      // Botanist: −50% fertility drain
    fallowRestoreInterval:  botanistCount > 0 ? 15 : 30,         // Botanist: fallow recovers 2× faster
    // Animals
    animalProductionMult:   1 + (keeperCount * 0.08) + (zootechCount * 0.25),
    sicknessBonusReduction: zootechCount > 0 ? 0.3 : 0,
    // Machinery
    maintenanceMult:        engineerCount > 0 ? 0.6 : Math.max(0.6, 1 - mechanicCount * 0.2),
    machineYieldBonus:      engineerCount > 0 ? 0.1 : 0,
    // Processing
    processingOutputMult:   1 + (processorCount * 0.10) + (supervisorCount * 0.25),
    autoProcessEnabled:     supervisorCount > 0,
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...makeInitialState(),

      advanceDay: () => {
        const state = get();
        const newDay = state.day + 1;
        const workerBonuses = getWorkerBonuses(state.workers ?? []);
        const season = getSeason(newDay);

        // Fuel price fluctuation (±$0.04/day, clamped $0.90–$1.80)
        const fuelDelta = (Math.random() - 0.5) * 0.08;
        const newFuelPrice = Math.min(1.80, Math.max(0.90, (state.fuelPrice ?? 1.20) + fuelDelta));
        const prevSeason = getSeason(state.day);
        const summary: DaySummaryEvent[] = [];

        // Weather
        const forecast = state.forecast.length > 1 ? state.forecast.slice(1) : generateForecast(season);
        const todayWeather = state.forecast[0] ?? generateForecast(season)[0];
        if (forecast.length < 3) forecast.push(...generateForecast(season, 4));

        // Weather summary
        const WEATHER_INFO: Record<string, { icon: string; name: string; severity: DaySummaryEvent['severity'] }> = {
          perfect:    { icon: '✨', name: 'Perfect day — ideal conditions',       severity: 'good' },
          sunny:      { icon: '☀️', name: 'Sunny',                                severity: 'info' },
          cloudy:     { icon: '☁️', name: 'Cloudy',                               severity: 'info' },
          rain:       { icon: '🌧️', name: 'Rain — good for crops',               severity: 'info' },
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

        // Prices + daily fluctuation + seasonal nudge
        let prices = state.prices.map(p => {
          const fluctuated = applyDailyFluctuation(p.price);
          const crop = CROP_TYPES.find(c => c.id === p.cropId);
          if (!crop) return { ...p, price: fluctuated };
          // Nudge toward seasonal target: peak = 80% of base (harvest glut), off-peak = 120%
          const isPeak = season === crop.peakSeason;
          const target = isPeak ? p.basePrice * 0.80 : p.basePrice * 1.20;
          const nudged = fluctuated + (target - fluctuated) * 0.05;
          return { ...p, price: Math.max(1, nudged) };
        });

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

        // ── Animal Show: open entry window at days 83–89 of each season quarter ──
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
          const severity = 0.5 + Math.random() * 0.5; // 0.5–1.0
          const durationDays = Math.round(5 + Math.random() * 10); // 5–15 days
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

        // ── Animal product price fluctuation ────────────────────────────────
        const { ANIMAL_PRODUCTS: AP_DATA } = require('../data/animalProducts');
        const ANIMAL_PEAK_SEASON: Record<string, string> = {
          eggs: 'spring', milk: 'summer', honey: 'summer', wool: 'winter', meat: 'autumn',
        };
        let animalPrices = { ...(state.animalPrices ?? { eggs: 3.50, milk: 0.90, honey: 25.0, wool: 42.0, meat: 14.0 }) };
        for (const product of AP_DATA) {
          const base = product.basePrice as number;
          const current = animalPrices[product.productType] ?? base;
          const peakBonus = ANIMAL_PEAK_SEASON[product.productType] === season ? 0.12 : -0.04;
          const randomDelta = (Math.random() - 0.5) * 0.08;
          const meanRevert = (base - current) / base * 0.05;
          const newPrice = Math.max(base * 0.4, Math.min(base * 2.5, current * (1 + peakBonus / 90 + randomDelta * 0.1 + meanRevert)));
          animalPrices[product.productType] = Math.round(newPrice * 100) / 100;
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
              mapFields = mapFields.map(f => f.id === lost.id ? { ...f, owner: 'forsale', askingPrice: Math.round(lost.approximateHa * 1400) } : f);
              // Add a discounted foreclosure parcel to the player's buy list (if not already there)
              const foreId = `foreclosure_${farm.id}`;
              if (!state.parcels.some(p => p.id === foreId)) {
                foreclosureParcels.push({
                  id: foreId,
                  name: `${farm.name}'s Holding`,
                  fertility: 8 + (farm.tier * 3),
                  hectares: farm.tier * 2,
                  pricePerHa: 1200 + (farm.tier * 300), // ~40% below market
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
                detail: `Foreclosure sale — ${farm.tier * 2}ha parcel available at 40% off`,
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

        // Price history
        const priceHistory: Record<string, number[]> = {};
        for (const p of prices) {
          const prev = state.priceHistory[p.cropId] ?? [];
          priceHistory[p.cropId] = [...prev, p.price].slice(-90);
        }

        // Machine + building maintenance
        const maintenanceCost = Math.round(getDailyMaintenance(state.machines, state.buildings) * workerBonuses.maintenanceMult);
        // Insurance premiums
        const activePolicies = state.insurances.filter(p => p.active);
        const insurancePremium = activePolicies.reduce((s, p) => {
          const plan = INSURANCE_PLANS.find(pl => pl.type === p.type);
          return s + (plan?.premiumPerDay ?? 0);
        }, 0);
        // Cooperative dues: $400 every 30 days
        const cooperativeDues = (state.cooperative?.member && newDay % 30 === 0) ? 400 : 0;
        // Worker wages
        const { WORKER_TYPES } = require('../data/workerTypes');
        const workerWages = (state.workers ?? []).reduce((s: number, w: OwnedWorker) => {
          const wt = WORKER_TYPES.find((t: any) => t.id === w.typeId);
          return s + (wt?.dailyWage ?? 0);
        }, 0);
        const totalFixed = maintenanceCost + insurancePremium + cooperativeDues + workerWages;
        const moneyAfterMaintenance = state.money - totalFixed;
        if (maintenanceCost > 0 || insurancePremium > 0 || cooperativeDues > 0 || workerWages > 0) {
          const detail = [
            maintenanceCost > 0 && `${state.machines.length} machine${state.machines.length !== 1 ? 's' : ''} · ${state.buildings.length} building${state.buildings.length !== 1 ? 's' : ''}`,
            insurancePremium > 0 && `${activePolicies.length} active policy${activePolicies.length !== 1 ? 'ies' : ''} (-$${insurancePremium}/day)`,
            cooperativeDues > 0 && `Cooperative monthly dues -$${cooperativeDues}`,
            workerWages > 0 && `${(state.workers ?? []).length} worker${(state.workers ?? []).length !== 1 ? 's' : ''} -$${workerWages}/day`,
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
            title: 'Loan defaulted — funds seized',
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
            title: `Contract failed — ${crop?.name ?? c.cropId}`,
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

        // Weather crop destruction + insurance payouts
        let destroyedCount = 0;
        let weatherInsurancePayout = 0;
        const newClaims: InsuranceClaim[] = [];

        if (todayWeather && ['frost', 'hail', 'drought'].includes(todayWeather.event)) {
          const climaPlan = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
          const insured = hasActiveInsurance(state.insurances, 'clima');

          parcels = parcels.map(p => {
            const destructChance = p.irrigated ? 0.05 : 0.15; // irrigation cuts drought/frost risk by 67%
            if (p.plantedCrop && !p.greenhouse && Math.random() < destructChance) {
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
                  description: `${p.hectares}ha plot destroyed by ${todayWeather.event === 'drought' ? 'drought' : todayWeather.event === 'hail' ? 'hail' : 'frost'}`,
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
            detail: `By ${w?.name.split('—')[0].trim() ?? 'extreme weather'}${weatherInsurancePayout > 0 ? ` — insurance covers $${weatherInsurancePayout.toLocaleString()}` : ''}`,
            severity: 'danger',
          });
          if (weatherInsurancePayout > 0) {
            summary.push({
              id: 'insurance_weather',
              icon: '🛡️',
              title: `+$${weatherInsurancePayout.toLocaleString()} — insurance payout`,
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
              title: `+$${fireInsurancePayout.toLocaleString()} — fire insurance payout`,
              severity: 'good',
            });
          }
        }

        const totalInsurancePayout = weatherInsurancePayout + fireInsurancePayout;

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
        // Disease spread: unresolved disease events can infect same-crop neighbors (±1 index)
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
            title: `+$${plagaPayout.toLocaleString()} — pest insurance payout`,
            severity: 'good',
          });
        }
        const totalInsurancePayoutAll = totalInsurancePayout + plagaPayout;

        // TODO: apply doubled sick chance for underfed animals using state.grainMissedDays / state.hayMissedDays
        // Veterinary events: 1.5% chance per animal to get sick; untreated for 14d → death
        let animals = state.animals;
        const newSickIds: string[] = [];
        const diedIds: string[] = [];

        // ── Quarantine graduation ─────────────────────────────────────────────
        animals = animals.map((a: OwnedAnimal) => {
          if (!a.quarantineUntilDay) return a;
          if (newDay < a.quarantineUntilDay) return a;
          // Period over — 2% residual disease risk even with pen
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
        const hasVetWorker = (state.workers ?? []).some((w: OwnedWorker) => w.typeId === 'vet');
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

        // Sickness spread — must run BEFORE death filter
        animals = animals.map((a: OwnedAnimal) => {
          if (a.inIsolation) return a; // isolated — cannot contract illness from spread
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

        // Death filter — runs AFTER sickness spread
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

        // ── Weaner accommodation: post-weaning pig mortality ─────────────────────
        const hasWeanerAccom = (state.buildings ?? []).some(bid =>
          bid === 'bld_weaner_accommodation_s' || bid === 'bld_weaner_accommodation_m' || bid === 'bld_weaner_accommodation_l'
        );
        animals = animals.filter((a: OwnedAnimal) => {
          if (a.typeId !== 'cerdo') return true;
          const agedays = newDay - a.bornDay;
          if (agedays < 28 || agedays > 56) return true; // only weaners (28–56 days)
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
            title: `${diedIds.length} animal${diedIds.length > 1 ? 's' : ''} died — disposal fee`,
            detail: `$${disposalFee} callout fee. Build a Rendering Unit to avoid this.`,
            severity: 'warning',
          });
        }

        // ── Sheep dip: autumn lameness event ──────────────────────────────────────
        {
          const prevSeason = seasonKey(newDay - 1);
          const currentSeason = seasonKey(newDay);
          if (currentSeason === 'autumn' && prevSeason !== 'autumn') {
            // Season just changed to autumn — run annual sheep dip check
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
                  description: `Pest outbreak — ${affectedHa}ha of ${affectedIds[0]} affected`,
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

          // Push timed events to activeEvents (skip equipment_failure — handled above)
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
        const { geneScore, randomGenes } = require('../engine/animals');
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
            // Simulate 2–4 NPC bids up to a valuation based on gene score
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
            // Reserve not met — return item to player
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
              title: `Auction won — ${labelMap[listing.category]}`,
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
              title: 'Reserve not met — item returned',
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
            // Genes weighted toward A/B (score ~1.1–1.3)
            const genes: AnimalGenes = {
              production: 0.9 + Math.random() * 0.5,
              hardiness:  0.9 + Math.random() * 0.5,
              growth:     0.9 + Math.random() * 0.5,
              value:      0.9 + Math.random() * 0.5,
            };
            const score = geneScore(genes);
            const startingBid = Math.round(animalType.buyCost * score * 0.6);
            updatedListings.push({
              id: `listing_animal_${newDay}_${i}`,
              category: 'animal',
              sellerId: 'npc',
              animalTypeId: animalType.id,
              animalGenes: genes,
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

        // Trim resolved listings — keep 20 most recent resolved
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
            title: `Time deposit matured — +$${payout.toLocaleString()}`,
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
            title: `Futures contract settled — ${crop?.name ?? f.cropId}`,
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
              title: `Market order expired — ${CROP_TYPES.find(c => c.id === o.cropId)?.name ?? o.cropId}`,
              detail: `${o.quantity.toLocaleString()} units returned to inventory`,
              severity: 'warning',
            });
            return { ...o, status: 'expired' as const };
          }
          const currentPrice = prices.find(p => p.cropId === o.cropId)?.price ?? 0;
          if (currentPrice >= o.targetPrice) {
            const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
            const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
            const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
            const revenue = Math.round(sellRevenue(o.quantity, currentPrice) * secaderoBonus * coopBonus * prestigeBonus);
            marketOrderIncome += revenue;
            const crop = CROP_TYPES.find(c => c.id === o.cropId);
            summary.push({
              id: `order_executed_${o.id}`,
              icon: '✅',
              title: `Market order filled — ${crop?.name ?? o.cropId} · +$${revenue.toLocaleString()}`,
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
          const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
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
        const activeWorkers = state.workers ?? [];
        if (activeWorkers.length > 0) {
          const hasVet = activeWorkers.some((w: OwnedWorker) => w.typeId === 'vet');
          const hasAnimalKeeper = activeWorkers.some((w: OwnedWorker) => w.typeId === 'animal_keeper');
          const hasFieldWorker = activeWorkers.some((w: OwnedWorker) => w.typeId === 'field_worker');

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
            // We store this as a side effect — will be used in set() below
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
              const rawUnits = harvestAmt(p.plantedCrop, cropType, p.fertility, climateModifier, p.hasWeeds, machineYieldWithEngineer);
              const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * irrigationBonus * rotationMod * soilMod * workerBonuses.cropYieldMultiplier), siloCapacity - siloTotal);
              siloTotal += units;
              workerNewInventory[p.plantedCrop.cropId] = (workerNewInventory[p.plantedCrop.cropId] ?? 0) + units;
              if (!newHarvestedIds.includes(p.plantedCrop.cropId)) newHarvestedIds.push(p.plantedCrop.cropId);
              const newFertility = Math.max(1, p.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonuses.fertilityDrainMult));
              return { ...p, plantedCrop: null, lastCropId: p.plantedCrop.cropId, fertility: newFertility };
            });
            (autoSellFinalInventory as any).__workerInventory = workerNewInventory;
            (autoSellFinalInventory as any).__harvestedIds = newHarvestedIds;
          }

          // Supervisor auto-process: 1 batch of highest-stock recipe per day
          if (workerBonuses.autoProcessEnabled) {
            const { PROCESSING_RECIPES: AUTO_RECIPES } = require('../data/processingTypes');
            const currentInventory = (autoSellFinalInventory as any).__workerInventory ?? autoSellFinalInventory;
            const currentAnimalInv = (animals as any).__newAnimalInventory ?? state.animalInventory;

            // Find eligible recipes (building owned, at least 1 batch available)
            const eligible = AUTO_RECIPES.filter((r: any) => {
              if (!state.buildings.includes(r.requiredBuilding)) return false;
              const stock = r.input.source === 'crop'
                ? (currentInventory[r.input.itemId] ?? 0)
                : (currentAnimalInv[r.input.itemId] ?? 0);
              return stock >= r.input.amount;
            });

            if (eligible.length > 0) {
              // Pick the recipe with the most input stock
              const best = eligible.reduce((prev: any, cur: any) => {
                const prevStock = prev.input.source === 'crop'
                  ? (currentInventory[prev.input.itemId] ?? 0)
                  : (currentAnimalInv[prev.input.itemId] ?? 0);
                const curStock = cur.input.source === 'crop'
                  ? (currentInventory[cur.input.itemId] ?? 0)
                  : (currentAnimalInv[cur.input.itemId] ?? 0);
                return curStock > prevStock ? cur : prev;
              });

              const outputAmount = Math.round(best.outputAmount * workerBonuses.processingOutputMult);

              if (best.input.source === 'crop') {
                (autoSellFinalInventory as any).__workerInventory = {
                  ...currentInventory,
                  [best.input.itemId]: (currentInventory[best.input.itemId] ?? 0) - best.input.amount,
                };
              } else {
                (animals as any).__newAnimalInventory = {
                  ...currentAnimalInv,
                  [best.input.itemId]: (currentAnimalInv[best.input.itemId] ?? 0) - best.input.amount,
                };
              }

              (autoSellFinalInventory as any).__supervisorProcess = {
                productId: best.outputProductId,
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
                  appliedFertilizerBonus: Math.max(p.plantedCrop.appliedFertilizerBonus ?? 1.0, 1.10),
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
            // No parcel state change needed here — just record in summary
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
            // Drain the whole tank — tractor job empties it in one pass
            tractorSlurryDrain += state.slurryLevel ?? 0;
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

        // ── Process HarvestJobs (incremental — combine harvests N ha/day) ────
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
            const currentTotal = Object.values(harvestInventory).reduce((a: number, b) => a + (b as number), 0);
            if (currentTotal >= siloCapForHarvest) break;
            const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
            const waterScale = (cropType.waterNeed ?? 3) / 5;
            const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
            const units = Math.min(
              Math.round(harvestAmount(parcel.plantedCrop!, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, 1.0)),
              siloCapForHarvest - currentTotal,
            );
            const newFertility = Math.max(1, parcel.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonuses.fertilityDrainMult));
            finalParcels = finalParcels.map((p: LandParcel) =>
              p.id === pid
                ? { ...p, plantedCrop: null, lastCropId: parcel.plantedCrop!.cropId, fertility: newFertility, tilled: false }
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
          (w: OwnedWorker) => w.typeId === 'mechanic' || w.typeId === 'engineer'
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
                msg: `🔧 Truck broke down on the way to ${job.marketId} — delayed ${delay}d`,
                jobId: job.id,
              });
            } else {
              updatedDeliveryJobs.push(job);
            }
            continue;
          }

          // returnDay reached — process completion
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
            msg: `🚛 Truck returned from ${job.marketId} — $${job.expectedRevenue.toLocaleString()}`,
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
            title: `Fuel too low — ${uniqueNames.join(', ')} idle`,
            detail: `Refuel in the Machinery tab to resume jobs`,
            severity: 'danger',
          });
        }

        // ── Crop disease spread ──────────────────────────────────────────────
        const hasShelter = state.buildings.includes('bld_shelter');
        const anyDisease = finalParcels.some(p => p.owned && p.diseased);
        const fieldWorkerCount = (state.workers ?? []).filter(w => w.typeId === 'field_worker').length;
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
            (w: OwnedWorker) => w.typeId === 'animal_keeper' || w.typeId === 'zootechnician'
          );
          const { grainKg, hayKg, pigGrainKg } = computeFeedNeeded(animals, AT_FEED, newDay);
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
                animalInventory = { ...animalInventory, hay: 0 };
                newHayMissed = Math.min(7, newHayMissed + 1);
                summary.push({
                  id: 'feed_hay_empty',
                  icon: '🌾',
                  title: 'Hay stock depleted',
                  detail: 'Hay-eating animals are underfed — grow grass and process it in the Henil',
                  severity: 'warning',
                });
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
                title: `Contractor processing ${bt.name} — $${fee}`,
                detail: manned ? 'Building at capacity — upgrade to process full herd' : 'Building unmanned — assign a farmhand',
                severity: 'warning',
              });
            }
          }

          // Hygiene decay
          const hasCleanerWorker = pb.assignedWorkerIds.some(wid =>
            ((state.workers ?? []).find((w: OwnedWorker) => w.id === wid)?.typeId as string) === 'farmhand'
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
                title: `Inspector failed ${bt.name} — $${fine} fine`,
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
              detail: 'Assign a farmhand or pay a contractor ($150–$400) in the Management tab',
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

        // Welfare scores — recalculate per species
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
              title: 'Environmental fine — no slurry storage',
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
                title: 'Slurry tank full — overflow fine',
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
        const processedInventoryForSet = supervisorProcess
          ? {
              ...state.processedInventory,
              [supervisorProcess.productId]: (state.processedInventory[supervisorProcess.productId] ?? 0) + supervisorProcess.amount,
            }
          : state.processedInventory;

        // ── Biogas upgrader income ────────────────────────────────────────────
        const hasBiogasUpgrader = (state.buildings ?? []).includes('bld_biogas_upgrader');
        let biogasIncome = 0;
        if (hasBiogasUpgrader) {
          const biogasAnimalCount = animals.filter((a: OwnedAnimal) =>
            ['vaca', 'bufalo', 'cabra', 'cerdo', 'oveja'].includes(a.typeId)
          ).length;
          biogasIncome = Math.round(biogasAnimalCount * 0.8);
          if (biogasIncome > 0) {
            summary.push({
              id: `biogas_income_${newDay}`,
              icon: '⚡',
              title: `Biogas income +$${biogasIncome}`,
              detail: `${biogasAnimalCount} animals producing biogas`,
              severity: 'info',
            });
          }
        }

        const autoSellSalesEntries = autoSellLog.map(s => ({ day: newDay, amount: Math.round(s.revenue), category: 'crops' as const }));
        const deliverySalesEntries = deliveryRevenue > 0
          ? [{ day: newDay, amount: deliveryRevenue, category: 'crops' as const }]
          : [];
        set({
          day: newDay,
          money: finalMoney + showPrizeMoney + deliveryRevenue - deliveryRepairCost - productionBuildingContractorFees - slurryFine - disposalFee + biogasIncome,
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
          slurryLevel: newSlurryLevel,
          slurryCapacity: newSlurryCapacity,
          productionBuildings: newProductionBuildings,
          animalWelfareScores: newWelfareScores,
          milkGrades: newMilkGrades,
          animalsManuallyFed: false,
          henilQueue: updatedHenilQueue,
          harvestedCropIds: harvestedCropIdsForSet,
          reputation,
          bankrupt: isBankrupt || state.bankrupt,
          sellPressures,
          processedInventory: processedInventoryForSet,
          seedVault: nextSeedVault,
          hybridJobs: nextHybridJobs,
          activeEvents,
          machineRepairs,
          npcFarms,
          mapFields,
          rivalNews: [...rivalNewsItems, ...(state.rivalNews ?? [])].slice(0, 30),
          seasonalEvent,
          animalPrices,
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

      plantCrop: (parcelId, cropId, hectares, fertilized) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.owned || parcel.plantedCrop) return;
        if (!parcel.tilled) return; // must till first
        const cropType = CROP_TYPES.find(c => c.id === cropId);
        if (!cropType) return;
        // Seasonal planting gate — greenhouses bypass season restrictions
        const currentSeason = getSeason(state.day);
        if (!cropType.seasons.includes(currentSeason) && !parcel.greenhouse) return;
        // Biodigestor: free fertilizer (no cost premium)
        const fertCostMult = fertilized && !hasBiodigestor(state.buildings) ? 1.3 : 1.0;
        // Cooperative: -10% seed cost discount
        const coopSeedDiscount = state.cooperative?.member ? 0.90 : 1.0;
        const seedCost = cropType.seedCost * hectares * fertCostMult * coopSeedDiscount;
        if (state.money < seedCost) return;
        const plantedCrop: PlantedCrop = { cropId, parcelId, plantedDay: state.day, hectares, fertilized };
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
        const rawUnits = harvestAmount(crop, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, 1.0);
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
        set({
          parcels: state.parcels.map(p => p.id === parcelId
            ? { ...p, plantedCrop: null, lastCropId: crop.cropId, fertility: newFertility, seedEntryId: undefined, diseased: false, diseasedDay: undefined }
            : p
          ),
          inventory: { ...state.inventory, [crop.cropId]: (state.inventory[crop.cropId] ?? 0) + units },
          harvestedCropIds,
          cropQualityMap: nextCropQualityMap,
          seedVault: nextSeedVaultAfterHarvest,
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
        const coopBonus      = state.cooperative?.member ? 1.12 : 1.0;
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
        // Dairy animals (cows & goats) arrive already freshened — mid-lactation adult
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
        // Manual feeding button — only available when no animal worker.
        // Sets flag so advanceDay knows animals were fed today.
        const state = get();
        const hasAnimalWorker = (state.workers ?? []).some(
          (w: OwnedWorker) => w.typeId === 'animal_keeper' || w.typeId === 'zootechnician'
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
        const { sellValue } = require('../engine/animals');
        const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const baseValue = sellValue(animal, animalType, state.day) * coopBonus * prestigeBonus;
        const weighCrateFunctional = (state.buildings ?? []).includes('bld_weigh_crate') &&
          (state.buildings ?? []).includes('bld_cattle_crush');
        const optimalBonus = weighCrateFunctional && (animal.optimalWeightReached ?? false) ? 1.05 : 1.0;
        const hasFinishingUnit = (state.buildings ?? []).some(bid =>
          bid === 'bld_finishing_unit_s' || bid === 'bld_finishing_unit_m' || bid === 'bld_finishing_unit_l'
        );
        const finishingBonus = hasFinishingUnit && animal.typeId === 'cerdo' ? 1.10 : 1.0;
        const value = Math.round(baseValue * optimalBonus * finishingBonus);
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
        const { canBreed, isMature, inheritTrait } = require('../engine/animals');
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
        // Partial lineage (one side unknown) is intentionally omitted — simplifies UI display.
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
        const fatherGenes = hasSirePen && sirePenMale
          ? sirePenMale.genes
          : father?.genes;

        const offspring: OwnedAnimal = {
          id: `animal_${Date.now()}`,
          typeId: animal.typeId,
          sex: offspringSex,
          bornDay: state.day,
          lastProductionDay: state.day,
          lastBreedDay: state.day,
          sick: false,
          traits: offspringTraits.length > 0 ? offspringTraits : undefined,
          genes: breedGenes(animal.genes, fatherGenes),
          parentIds: [animalId, father.id],
          grandparentIds,
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
            // Offspring did not survive — abort
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
        set({
          animals: state.animals.map(a => a.id === animalId ? { ...a, lastProductionDay: nextDay } : a),
          animalInventory: {
            ...state.animalInventory,
            [animalType.productionType]: (state.animalInventory[animalType.productionType] ?? 0) + Math.round(units * graneroBonus),
          },
        });
      },

      sellAnimalProduct: (productType, units) => {
        const state = get();
        // Milk grade multiplier — dairy products only
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
        const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const livePrice = (state.animalPrices ?? {})[productType] ?? product.basePrice;
        const revenue = Math.round(sellRevenue(toSell, livePrice) * coopBonus * prestigeBonus * gradeMultiplier);
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
          const coopSeedDiscount = state.cooperative?.member ? 0.90 : 1.0;
          const seedCost = cropType.seedCost * totalHa * coopSeedDiscount;
          if (state.money < seedCost) return;
          const { getSeason } = require('../engine/climate');
          const currentSeason = getSeason(state.day);
          const updatedParcels = state.parcels.map((p: LandParcel) => {
            if (!parcelIds.includes(p.id)) return p;
            if (!cropType.seasons.includes(currentSeason) && !p.greenhouse) return p;
            const plantedCrop: PlantedCrop = {
              cropId, parcelId: p.id, plantedDay: completesDay, hectares: p.hectares, fertilized: false,
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
          const coopSeedDiscount = state.cooperative?.member ? 0.90 : 1.0;
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
                cropId, parcelId: p.id, plantedDay: state.day, hectares: p.hectares, fertilized: false,
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
                  appliedFertilizerBonus: Math.max(p.plantedCrop.appliedFertilizerBonus ?? 1.0, 1.10),
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

        // Lock in expected revenue — matches sellCrop formula exactly
        const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
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

      plantCropBatch: (cropId, fertilized) => {
        const state = get();
        const crop = CROP_TYPES.find(c => c.id === cropId);
        if (!crop) return;
        const idleParcels = state.parcels.filter(p => p.owned && !p.plantedCrop && !p.hasWeeds);
        if (idleParcels.length === 0) return;
        const fertilizerCostPerHa = fertilized ? 50 : 0;
        const totalCost = idleParcels.reduce((sum, p) => sum + Math.round((crop.seedCost + fertilizerCostPerHa) * p.hectares), 0);
        if (state.money < totalCost) return;
        const plantDay = state.day;
        const idleIds = new Set(idleParcels.map(p => p.id));
        set({
          parcels: state.parcels.map(p => {
            if (!idleIds.has(p.id)) return p;
            return { ...p, plantedCrop: { cropId, parcelId: p.id, plantedDay: plantDay, hectares: p.hectares, fertilized }, tilled: false };
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
        const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
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
        set({
          money: state.money - building.cost,
          buildings: newBuildings,
          vetRoomOwned:         newBuildings.includes('bld_vet_room'),
          medicineCabinetOwned: newBuildings.includes('bld_medicine_cabinet'),
          hasCCTV:              newBuildings.includes('bld_cctv_monitor'),
          sickBayCapacity,
          slurryCapacity,
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
        if (!parcel || !parcel.plantedCrop || parcel.plantedCrop.fertilized) return;
        const { PRODUCT_TYPES } = require('../data/productTypes');
        const product = PRODUCT_TYPES.find((p: any) => p.id === productId);
        if (!product || product.category !== 'fertilizer_solid' && product.category !== 'fertilizer_liquid') return;
        const inStock = state.productInventory[productId] ?? 0;
        if (inStock <= 0) return;
        set({
          parcels: state.parcels.map(p =>
            p.id === parcelId ? {
              ...p,
              fertility: Math.min(25, p.fertility + 2),
              plantedCrop: {
                ...p.plantedCrop!,
                fertilized: true,
                appliedFertilizerBonus: product.fertilizerBonus,
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
        const wBonuses = getWorkerBonuses(state.workers ?? []);
        const recipe = PROCESSING_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return;
        if (!state.buildings.includes(recipe.requiredBuilding)) return;
        const needed = recipe.input.amount * batches;
        if (recipe.input.source === 'crop') {
          const inStock = state.inventory[recipe.input.itemId] ?? 0;
          if (inStock < needed) return;
          set({
            inventory: { ...state.inventory, [recipe.input.itemId]: inStock - needed },
            processedInventory: {
              ...state.processedInventory,
              [recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + Math.round(recipe.outputAmount * batches * wBonuses.processingOutputMult * (state.cropQualityMap[recipe.input.itemId] ?? 1.0)),
            },
          });
        } else {
          const inStock = state.animalInventory[recipe.input.itemId] ?? 0;
          if (inStock < needed) return;
          set({
            animalInventory: { ...state.animalInventory, [recipe.input.itemId]: inStock - needed },
            processedInventory: {
              ...state.processedInventory,
              [recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + Math.round(recipe.outputAmount * batches * wBonuses.processingOutputMult),
            },
          });
        }
      },

      sellProcessed: (productId, units) => {
        const state = get();
        const inStock = state.processedInventory[productId] ?? 0;
        const toSell = Math.min(units, inStock);
        if (toSell <= 0) return;
        const product = PROCESSED_PRODUCTS.find(p => p.id === productId);
        if (!product) return;
        const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const revenue = Math.round(toSell * product.basePrice * coopBonus * prestigeBonus);
        set({
          money: state.money + revenue,
          processedInventory: { ...state.processedInventory, [productId]: inStock - toSell },
          salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'processed' }],
          totalRevenue: state.totalRevenue + revenue,
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
          const rawUnits = harvestAmount(p.plantedCrop, cropType, p.fertility, climateModifier, p.hasWeeds, yieldBonus);
          const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationMod * soilMod), siloCapacity - totalInventory);
          totalInventory += units;
          newInventory[p.plantedCrop.cropId] = (newInventory[p.plantedCrop.cropId] ?? 0) + units;
          if (!newHarvestedCropIds.includes(p.plantedCrop.cropId)) newHarvestedCropIds.push(p.plantedCrop.cropId);
          const newFertility = Math.max(1, p.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonusesAll.fertilityDrainMult));
          return { ...p, plantedCrop: null, lastCropId: p.plantedCrop.cropId, fertility: newFertility };
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
        const { WORKER_TYPES: WT } = require('../data/workerTypes');
        const workerType = WT.find((t: WorkerTypeDef) => t.id === typeId);
        if (!workerType) return;

        // Specialist unlock check
        if (workerType.requiresBasicId) {
          const hasBasic = (state.workers ?? []).some((w: OwnedWorker) => w.typeId === workerType.requiresBasicId);
          if (!hasBasic) return;
        }

        const currentCount = (state.workers ?? []).filter((w: OwnedWorker) => w.typeId === typeId).length;
        if (currentCount >= workerType.maxCount) return;
        if (state.money < workerType.dailyWage) return;

        const worker: OwnedWorker = { id: `worker_${Date.now()}`, typeId, hiredDay: state.day };
        set({
          money: state.money - workerType.dailyWage,
          workers: [...(state.workers ?? []), worker],
          firstMissionStep: state.firstMissionStep === 3 ? 4 : state.firstMissionStep,
        });
      },

      fireWorker: (workerId) => {
        const state = get();
        set({ workers: (state.workers ?? []).filter((w: OwnedWorker) => w.id !== workerId) });
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
    }),
    {
      name: 'last-acre-save-v3',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
      // Only persist data — never persist action functions (Zustand v5 requirement)
      partialize: (state: GameState) => {
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          advanceDay, buyParcel, plantCrop, harvestCrop, sellCrop,
          buyAnimal, sellAnimal, collectAnimalProduction, sellAnimalProduct, breedAnimal, treatAnimal,
          buyMachine, requestLoan, repayLoan, depositSavings, withdrawSavings,
          acceptContract, declineContract, deliverCrop, buyProduct, buyBuilding,
          resolveFieldEvent, clearWeeds, fertilizeCrop, listItem, withdrawListing, placeBid, clearDaySummary,
          buyInsurance, cancelInsurance,
          processProduct, sellProcessed,
          openTimeDeposit, closeTimeDeposit, resetGame, markTutorialSeen, markYearEndShown,
          installGreenhouse, removeGreenhouse, openFuture, joinCooperative, leaveCooperative,
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
          designateAsSire, removeFromSirePen, spreadSlurry,
          ...dataState
        } = state;
        return dataState;
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
      },
    }
  )
);
