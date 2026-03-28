import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PlantedCrop, SoilType, getSoilModifier } from '../engine/crops';
import { OwnedAnimal, inheritTrait, randomGenes, breedGenes } from '../engine/animals';
import { MarketPrice, NewsEvent } from '../engine/market';
import { WeatherDay } from '../engine/climate';
import { Loan, SavingsAccount, TimeDeposit, SaleRecord, LoanRecord,
         loanTotalOwed, calculateRate, accrueInterest } from '../engine/banking';
import { Contract } from '../engine/contracts';
import { CROP_TYPES } from '../data/cropTypes';
import { MACHINE_TYPES } from '../data/machineTypes';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { INSURANCE_PLANS, InsuranceType } from '../data/insuranceTypes';
import { PROCESSING_RECIPES, PROCESSED_PRODUCTS } from '../data/processingTypes';
import { MILESTONES, checkNewMilestones } from '../data/milestones';
import { applyDailyFluctuation, sellRevenue, SellPressure, computeSellPressureModifier, sellPressureDuration } from '../engine/market';
import { getSeason, generateForecast } from '../engine/climate';
import { ENCLOSURE_BUILDINGS } from '../constants/enclosures';
import { WorkerRole } from '../data/workerTypes';

// ── Machine / building helpers ───────────────────────────────────────────────
function getMachineYieldBonus(machines: OwnedMachine[]): number {
  return machines.reduce((bonus, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    return t ? bonus * t.yieldBonus : bonus;
  }, 1.0);
}

function getMachineSpeedBonus(machines: OwnedMachine[]): number {
  return machines.reduce((best, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    return t && t.speedBonus < 1 ? Math.min(best, t.speedBonus) : best;
  }, 1.0);
}

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
  soilType?: SoilType; // undefined on old saves → treated as 'loamy'
}

export interface OwnedWorker {
  id: string;
  typeId: WorkerRole;
  hiredDay: number;
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

export interface GameState {
  day: number;
  money: number;
  farmName: string;

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
  auctionLots: AuctionLot[];
  daySummary: DaySummaryEvent[] | null;

  insurances: InsurancePolicy[];
  insuranceClaims: InsuranceClaim[];

  processedInventory: Record<string, number>;
  harvestedCropIds: string[];
  completedMilestones: string[];
  tutorialSeen: boolean;
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

  // Actions
  advanceDay: () => void;
  buyParcel: (parcelId: string) => void;
  plantCrop: (parcelId: string, cropId: string, hectares: number, fertilized: boolean) => void;
  harvestCrop: (parcelId: string) => void;
  sellCrop: (cropId: string, units: number) => void;
  buyAnimal: (typeId: string, sex: 'male' | 'female') => void;
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
  placeBid: (lotId: string, amount: number) => void;
  clearDaySummary: () => void;
  buyInsurance: (type: InsuranceType) => void;
  cancelInsurance: (policyId: string) => void;
  processProduct: (recipeId: string, batches: number) => void;
  sellProcessed: (productId: string, units: number) => void;
  openTimeDeposit: (amount: number, termDays: number, rate: number) => void;
  closeTimeDeposit: (depositId: string) => void;
  resetGame: () => void;
  markTutorialSeen: () => void;
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

const SOIL_DISTRIBUTION: SoilType[] = [
  'loamy','loamy','loamy','loamy','loamy','loamy','loamy', // 35%
  'sandy','sandy','sandy','sandy','sandy',                 // 25%
  'clay','clay','clay','clay','clay',                      // 25%
  'chalky','chalky','chalky',                              // 15%
];

function randomSoilType(): SoilType {
  return SOIL_DISTRIBUTION[Math.floor(Math.random() * SOIL_DISTRIBUTION.length)];
}

function generateParcels(): LandParcel[] {
  // Shuffle names so each game feels different
  const shuffled = [...FIELD_NAMES].sort(() => Math.random() - 0.5);
  const parcels: LandParcel[] = [];
  for (let i = 0; i < 80; i++) {
    const fertility = Math.floor(Math.random() * 25) + 1;
    const hectares = Math.random() < 0.5 ? 1 : Math.random() < 0.5 ? 2 : 5;
    const pricePerHa = 16000 + (fertility / 25) * 44000;
    parcels.push({
      id: `parcel_${i}`,
      name: shuffled[i] ?? `Plot ${i + 1}`,
      fertility,
      hectares,
      pricePerHa: Math.round(pricePerHa / 1000) * 1000,
      owned: i < 2,
      hasWeeds: false,
      plantedCrop: null,
      greenhouse: false,
      irrigated: false,
      soilType: randomSoilType(),
    });
  }
  return parcels;
}

function generateInitialPrices(): MarketPrice[] {
  return CROP_TYPES.map(c => ({ cropId: c.id, price: c.basePrice, basePrice: c.basePrice }));
}

function generateInitialAuctions(): AuctionLot[] {
  const premiumParcels: LandParcel[] = [
    { id: 'auction_p0', name: 'Gold Acre',     fertility: 22, hectares: 5,  pricePerHa: 55000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false },
    { id: 'auction_p1', name: 'Prime Ridge',   fertility: 25, hectares: 2,  pricePerHa: 60000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false },
    { id: 'auction_p2', name: 'Blessed Bottom',fertility: 20, hectares: 10, pricePerHa: 50000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false },
  ];
  return premiumParcels.map((parcel, i) => {
    const startingBid = Math.round(parcel.pricePerHa * parcel.hectares * 0.75);
    return {
      id: `lot_init_${i}`,
      parcel,
      startDay: 1,
      endDay: 12 + i * 6,
      startingBid,
      currentBid: startingBid,
      bids: [],
      playerBid: null,
      resolved: false,
      playerWon: null,
    };
  });
}

function makeInitialState() {
  return {
    day: 1,
    money: 3500,
    farmName: 'My Farm',
    parcels: generateParcels(),
    animals: [] as OwnedAnimal[],
    animalInventory: {} as Record<string, number>,
    machines: [] as OwnedMachine[],
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
    auctionLots: generateInitialAuctions(),
    daySummary: null as DaySummaryEvent[] | null,
    insurances: [] as InsurancePolicy[],
    insuranceClaims: [] as InsuranceClaim[],
    processedInventory: {} as Record<string, number>,
    harvestedCropIds: [] as string[],
    completedMilestones: [] as string[],
    tutorialSeen: false,
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
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...makeInitialState(),

      advanceDay: () => {
        const state = get();
        const newDay = state.day + 1;
        const season = getSeason(newDay);
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

        // Fallow recovery: owned empty parcels regain +1 fertility every 30 days
        const fallowParcels = newDay % 30 === 0
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

        // Season change announcement
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

        // Sell pressure: apply active modifiers to prices, then expire old ones
        const activePressures = (state.sellPressures ?? []).filter(sp => sp.expiresDay >= newDay);
        prices = prices.map(p => {
          const pressure = activePressures.find(sp => sp.cropId === p.cropId);
          return pressure ? { ...p, price: Math.max(1, p.price * pressure.modifier) } : p;
        });
        const sellPressures = activePressures;

        // Price history
        const priceHistory: Record<string, number[]> = {};
        for (const p of prices) {
          const prev = state.priceHistory[p.cropId] ?? [];
          priceHistory[p.cropId] = [...prev, p.price].slice(-90);
        }

        // Machine + building maintenance
        const maintenanceCost = getDailyMaintenance(state.machines, state.buildings);
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
          const isdrought = todayWeather.event === 'drought';
          const coverType: InsuranceType = isdrought ? 'sequia' : 'helada';
          const plan = INSURANCE_PLANS.find(pl => pl.type === coverType)!;
          const insured = hasActiveInsurance(state.insurances, coverType);

          parcels = parcels.map(p => {
            const destructChance = p.irrigated ? 0.05 : 0.15; // irrigation cuts drought/frost risk by 67%
            if (p.plantedCrop && !p.greenhouse && Math.random() < destructChance) {
              destroyedCount++;
              if (insured) {
                const cropVal = estimateCropValue(p, prices);
                const payout = Math.round(cropVal * plan.coveragePercent);
                weatherInsurancePayout += payout;
                newClaims.push({
                  id: `claim_${newDay}_${p.id}`,
                  day: newDay,
                  type: coverType,
                  payout,
                  description: `${p.hectares}ha plot destroyed by ${isdrought ? 'drought' : todayWeather.event === 'hail' ? 'hail' : 'frost'}`,
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

        // Veterinary events: 1.5% chance per animal to get sick; untreated for 14d → death
        let animals = state.animals;
        const newSickIds: string[] = [];
        const diedIds: string[] = [];
        animals = animals
          .filter((a: OwnedAnimal) => {
            if (a.sick && a.sicknessDay !== undefined && newDay - a.sicknessDay >= 14) {
              diedIds.push(a.id);
              return false;
            }
            return true;
          })
          .map((a: OwnedAnimal) => {
            if (a.sick) return a;
            const sickChance = (a.traits ?? []).includes('hardy') ? 0.006 : 0.015;
            if (Math.random() < sickChance) {
              newSickIds.push(a.id);
              return { ...a, sick: true, sicknessDay: newDay };
            }
            return a;
          });
        if (newSickIds.length > 0) {
          summary.push({ id: 'animals_sick', icon: '🤒', title: `${newSickIds.length} animal${newSickIds.length > 1 ? 's' : ''} fell sick`, detail: 'Treat within 14 days or they will die', severity: 'warning' });
        }
        if (diedIds.length > 0) {
          summary.push({ id: 'animals_died', icon: '💀', title: `${diedIds.length} animal${diedIds.length > 1 ? 's' : ''} died from untreated sickness`, severity: 'danger' });
        }

        // Auction: AI bidding + resolve
        const parcelAdditions: LandParcel[] = [];
        let moneyDelta = 0;

        const auctionLots: AuctionLot[] = state.auctionLots.map(lot => {
          if (lot.resolved) return lot;

          if (newDay >= lot.endDay) {
            const canAfford = lot.playerBid !== null && state.money >= lot.playerBid;
            const playerWon = lot.playerBid !== null && lot.playerBid >= lot.currentBid && canAfford;
            if (playerWon && lot.playerBid !== null) {
              moneyDelta -= lot.playerBid;
              parcelAdditions.push({ ...lot.parcel, owned: true });
            }
            return { ...lot, resolved: true, playerWon: playerWon };
          }

          const daysLeft = lot.endDay - newDay;
          const aiBidChance = daysLeft <= 3 ? 0.5 : daysLeft <= 7 ? 0.25 : 0.1;
          if (Math.random() < aiBidChance) {
            const increment = 1.05 + Math.random() * 0.12;
            const aiBid = Math.ceil(lot.currentBid * increment);
            return {
              ...lot,
              currentBid: aiBid,
              bids: [...lot.bids, { day: newDay, amount: aiBid, isPlayer: false }],
            };
          }
          return lot;
        });

        // Auction resolution summaries
        for (const lot of auctionLots) {
          const wasUnresolved = !state.auctionLots.find(ol => ol.id === lot.id)?.resolved;
          if (lot.resolved && wasUnresolved) {
            if (lot.playerWon) {
              summary.push({
                id: `auction_won_${lot.id}`,
                icon: '🏆',
                title: `Auction won!`,
                detail: `${lot.parcel.hectares} ha, fertility ${lot.parcel.fertility}/25 — $${lot.playerBid?.toLocaleString()}`,
                severity: 'good',
              });
            } else if (lot.playerBid !== null) {
              summary.push({
                id: `auction_lost_${lot.id}`,
                icon: '😔',
                title: 'Auction lost',
                detail: `Your bid: $${lot.playerBid?.toLocaleString()} · Final: $${lot.currentBid.toLocaleString()}`,
                severity: 'warning',
              });
            }
          }
        }

        // Generate new auction lot if fewer than 2 active
        const activeLots = auctionLots.filter(l => !l.resolved);
        if (activeLots.length < 2 && Math.random() < 0.3) {
          const fertility = Math.floor(Math.random() * 10) + 16;
          const hectares = ([2, 5, 10])[Math.floor(Math.random() * 3)];
          const pricePerHa = Math.round((20000 + (fertility / 25) * 50000) / 1000) * 1000;
          const startingBid = Math.round(pricePerHa * hectares * 0.7);
          const auctionNames = [
            'Riverside Lot', 'Hilltop Parcel', 'Valley Premium', 'Lakeside Acre',
            'Woodland Plot', 'Cliffside Field', 'Meadow Estate', 'Ridge Premium',
            'Orchard Lot', 'Vineyard Parcel', 'Sunrise Estate', 'Highfield Lot',
          ];
          const newParcel: LandParcel = {
            id: `auction_p${newDay}`,
            name: auctionNames[newDay % auctionNames.length],
            fertility,
            hectares,
            pricePerHa,
            owned: false,
            hasWeeds: false,
            plantedCrop: null,
            greenhouse: false,
            irrigated: false,
          };
          auctionLots.push({
            id: `lot_${newDay}`,
            parcel: newParcel,
            startDay: newDay,
            endDay: newDay + 10 + Math.floor(Math.random() * 10),
            startingBid,
            currentBid: startingBid,
            bids: [],
            playerBid: null,
            resolved: false,
            playerWon: null,
          });
          summary.push({
            id: `auction_new_${newDay}`,
            icon: '🏷️',
            title: 'New auction lot available',
            detail: `${hectares} ha · fertility ${fertility}/25 · starting bid $${startingBid.toLocaleString()}`,
            severity: 'info',
          });
        }

        // Trim resolved auction lots — keep only the 10 most recent to prevent unbounded growth
        const trimmedAuctionLots = [
          ...auctionLots.filter(l => !l.resolved),
          ...auctionLots.filter(l => l.resolved).slice(-10),
        ];

        let finalParcels = [...parcels, ...parcelAdditions];
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

        // Auto-sell: sell crops automatically when price meets threshold
        let autoSellIncome = 0;
        const autoSellRules = state.autoSell ?? {};
        const autoSellInventoryDelta: Record<string, number> = {};
        const autoSellLog: Array<{ cropId: string; qty: number; revenue: number }> = [];
        for (const [cropId, rule] of Object.entries(autoSellRules)) {
          if (!rule.enabled) continue;
          const currentPrice = prices.find(p => p.cropId === cropId)?.price ?? 0;
          if (currentPrice < rule.minPrice) continue;
          const inStock = Math.max(0, (finalInventory[cropId] ?? 0) + (autoSellInventoryDelta[cropId] ?? 0));
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
          Object.keys({ ...finalInventory, ...autoSellInventoryDelta }).map(k => [
            k, Math.max(0, (finalInventory[k] ?? 0) + (autoSellInventoryDelta[k] ?? 0)),
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
              const treatCost = Math.max(50, Math.round((animalType?.maxSellPrice ?? 1000) * 0.05));
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
              return { ...a, lastProductionDay: nextDay, _autoCollect: { key, units: Math.round(units * graneroBonus) } };
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
            const speedBonusW = getMachineSpeedBonus(state.machines);
            const yieldBonusW = getMachineYieldBonus(state.machines);
            const siloCapacity = getSiloCapacity(state.buildings);
            let siloTotal = Object.values(autoSellFinalInventory).reduce((a: number, b) => a + (b as number), 0);
            const workerNewInventory = { ...autoSellFinalInventory };
            const newHarvestedIds = [...state.harvestedCropIds];
            finalParcels = finalParcels.map(p => {
              if (!p.plantedCrop || !p.owned || siloTotal >= siloCapacity) return p;
              const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
              if (!cropType) return p;
              if (newDay < p.plantedCrop.plantedDay + Math.round(cropType.growthDays * speedBonusW)) return p;
              const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
              const waterScale = (cropType.waterNeed ?? 3) / 5;
              const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
              const unresolvedEvents = state.fieldEvents.filter(e => e.parcelId === p.id && !e.resolved).length;
              const fieldEventMod = Math.pow(0.75, unresolvedEvents);
              const waterBonus = hasWaterTower(state.buildings) ? 1.05 : 1.0;
              const irrigationBonus = p.irrigated ? 1.20 : 1.0;
              const rotationMod = p.lastCropId && p.lastCropId !== p.plantedCrop.cropId ? 1.15 : 1.0;
              const soilMod = getSoilModifier(p.soilType, p.plantedCrop.cropId);
              const rawUnits = harvestAmt(p.plantedCrop, cropType, p.fertility, climateModifier, p.hasWeeds, yieldBonusW);
              const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * irrigationBonus * rotationMod * soilMod), siloCapacity - siloTotal);
              siloTotal += units;
              workerNewInventory[p.plantedCrop.cropId] = (workerNewInventory[p.plantedCrop.cropId] ?? 0) + units;
              if (!newHarvestedIds.includes(p.plantedCrop.cropId)) newHarvestedIds.push(p.plantedCrop.cropId);
              const newFertility = Math.max(1, p.fertility - (cropType.fertilityDrain ?? 0));
              return { ...p, plantedCrop: null, lastCropId: p.plantedCrop.cropId, fertility: newFertility };
            });
            (autoSellFinalInventory as any).__workerInventory = workerNewInventory;
            (autoSellFinalInventory as any).__harvestedIds = newHarvestedIds;
          }
        }
        // Extract worker inventory overrides
        const workerHarvestedIds: string[] | undefined = (autoSellFinalInventory as any).__harvestedIds;
        const workerInventoryOverride: Record<string, number> | undefined = (autoSellFinalInventory as any).__workerInventory;
        const workerAnimalInventory: Record<string, number> | undefined = (animals as any).__newAnimalInventory;
        const inventoryForSet = workerInventoryOverride ?? autoSellFinalInventory;
        const animalInventoryForSet = workerAnimalInventory ?? state.animalInventory;
        const harvestedCropIdsForSet = workerHarvestedIds ?? state.harvestedCropIds;

        const finalMoney = Math.max(0, moneyAfterMaintenance + moneyDelta + totalInsurancePayoutAll - defaultPenalty + depositPayoutTotal - contractPenaltyTotal + futuresIncome - futuresPenalty + autoSellIncome - vetTreatmentCost);

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
          },
          state.completedMilestones
        );
        for (const id of newlyUnlocked) {
          const def = MILESTONES.find(m => m.id === id);
          if (def) {
            summary.push({
              id: `milestone_${id}`,
              icon: def.icon,
              title: `Milestone: ${def.title}`,
              detail: def.description,
              severity: 'good',
            });
          }
        }
        const completedMilestones = [...state.completedMilestones, ...newlyUnlocked];

        // Bankruptcy detection: money=0, at least 1 defaulted loan, no sales in last 14 days
        const recentSales = state.salesLog.filter(s => s.day >= newDay - 14);
        const hasDefaultedLoan = loans.some(l => l.defaulted);
        const isBankrupt = !state.bankrupt && finalMoney <= 0 && hasDefaultedLoan && recentSales.length === 0 && autoSellIncome === 0;

        const autoSellSalesEntries = autoSellLog.map(s => ({ day: newDay, amount: Math.round(s.revenue), category: 'crops' as const }));
        set({
          day: newDay,
          money: finalMoney,
          forecast,
          todayWeather,
          prices,
          priceHistory,
          savings,
          loans,
          loanHistory,
          salesLog: [...salesLog, ...autoSellSalesEntries],
          totalRevenue: state.totalRevenue + autoSellIncome,
          parcels: finalParcels,
          fieldEvents,
          newsEvents,
          activeFair,
          auctionLots: trimmedAuctionLots,
          daySummary: summary,
          timeDeposits,
          insuranceClaims: [...state.insuranceClaims, ...newClaims].slice(-100),
          contracts,
          declinedTemplates,
          completedMilestones,
          animals,
          futures,
          inventory: inventoryForSet,
          animalInventory: animalInventoryForSet,
          harvestedCropIds: harvestedCropIdsForSet,
          reputation,
          bankrupt: isBankrupt || state.bankrupt,
          sellPressures,
        });
      },

      buyParcel: (parcelId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || parcel.owned) return;
        const cost = parcel.pricePerHa * parcel.hectares;
        if (state.money < cost) return;
        set({
          money: state.money - cost,
          parcels: state.parcels.map(p => p.id === parcelId ? { ...p, owned: true } : p),
        });
      },

      plantCrop: (parcelId, cropId, hectares, fertilized) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.owned || parcel.plantedCrop) return;
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
        });
      },

      harvestCrop: (parcelId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.plantedCrop) return;
        const crop = parcel.plantedCrop;
        const cropType = CROP_TYPES.find(c => c.id === crop.cropId);
        if (!cropType) return;
        // Speed bonus: faster machines reduce effective growth days
        const speedBonus = getMachineSpeedBonus(state.machines);
        const effectiveGrowthDays = Math.round(cropType.growthDays * speedBonus);
        if (state.day < crop.plantedDay + effectiveGrowthDays) return;
        // Silo cap
        const siloCapacity = getSiloCapacity(state.buildings);
        const totalInventory = Object.values(state.inventory).reduce((a, b) => a + b, 0);
        if (totalInventory >= siloCapacity) return; // storage full
        const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
        // Water need scales how much weather helps or hurts this crop (1=immune, 5=full effect)
        const waterScale = (cropType.waterNeed ?? 3) / 5;
        const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
        const yieldBonus = getMachineYieldBonus(state.machines);
        const { harvestAmount } = require('../engine/crops');
        const rawUnits = harvestAmount(crop, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, yieldBonus);
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
        const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationBonus * soilMod), siloCapacity - totalInventory);
        const harvestedCropIds = state.harvestedCropIds.includes(crop.cropId)
          ? state.harvestedCropIds
          : [...state.harvestedCropIds, crop.cropId];
        const newFertility = Math.max(1, parcel.fertility - (cropType.fertilityDrain ?? 0));
        set({
          parcels: state.parcels.map(p => p.id === parcelId
            ? { ...p, plantedCrop: null, lastCropId: crop.cropId, fertility: newFertility }
            : p
          ),
          inventory: { ...state.inventory, [crop.cropId]: (state.inventory[crop.cropId] ?? 0) + units },
          harvestedCropIds,
        });
      },

      sellCrop: (cropId, units) => {
        const state = get();
        const inStock = state.inventory[cropId] ?? 0;
        const toSell = Math.min(units, inStock);
        if (toSell <= 0) return;
        const price = state.prices.find(p => p.cropId === cropId)?.price ?? 0;
        const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
        const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const revenue = sellRevenue(toSell, price) * secaderoBonus * coopBonus * prestigeBonus;

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
        const newAnimal: OwnedAnimal = {
          id: `animal_${Date.now()}`,
          typeId,
          sex,
          bornDay: state.day,
          lastProductionDay: state.day,
          lastBreedDay: state.day,
          sick: false,
          genes: randomGenes(),
        };
        set({ money: state.money - cost, animals: [...state.animals, newAnimal] });
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
        const value = sellValue(animal, animalType, state.day) * coopBonus * prestigeBonus;
        set({
          money: state.money + value,
          animals: state.animals.filter(a => a.id !== animalId),
          salesLog: [...state.salesLog, { day: state.day, amount: value, category: 'animals' }],
          totalRevenue: state.totalRevenue + value,
        });
      },

      breedAnimal: (animalId) => {
        const state = get();
        const animal = state.animals.find(a => a.id === animalId);
        if (!animal) return;
        // Only females can be the breeding subject
        if (animal.sex !== 'female') return;
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
        if (!animalType) return;
        const { canBreed, isMature } = require('../engine/animals');
        if (!canBreed(animal, animalType, state.day)) return;
        // Require at least one mature male of the same type
        const hasMate = state.animals.some((a: OwnedAnimal) =>
          a.id !== animalId && a.typeId === animal.typeId && a.sex === 'male' &&
          isMature(a, animalType, state.day)
        );
        if (!hasMate) return;
        // Check enclosure capacity (same species only)
        const capacity = getEnclosureCapacity(state.buildings, animalType.enclosureType);
        const currentCount = state.animals.filter((a: OwnedAnimal) => a.typeId === animal.typeId).length;
        if (currentCount >= capacity) return;
        const father = state.animals.find(
          (a: OwnedAnimal) => a.id !== animalId && a.typeId === animal.typeId && a.sex === 'male' &&
          isMature(a, animalType, state.day)
        );
        // Offspring can inherit one trait from mother and one from father (no duplicates)
        const maternalTrait = inheritTrait(animal);
        const paternalTrait = father ? inheritTrait(father) : null;
        const offspringTraits = Array.from(new Set([maternalTrait, paternalTrait].filter(Boolean))) as import('../engine/animals').AnimalTrait[];
        const offspringSex: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
        const offspring: OwnedAnimal = {
          id: `animal_${Date.now()}`,
          typeId: animal.typeId,
          sex: offspringSex,
          bornDay: state.day,
          lastProductionDay: state.day,
          lastBreedDay: state.day,
          sick: false,
          traits: offspringTraits.length > 0 ? offspringTraits : undefined,
          genes: breedGenes(animal.genes, father?.genes),
        };
        set({
          animals: [
            ...state.animals.map(a => a.id === animalId ? { ...a, lastBreedDay: state.day } : a),
            offspring,
          ],
        });
      },

      collectAnimalProduction: (animalId) => {
        const state = get();
        const animal = state.animals.find(a => a.id === animalId);
        if (!animal) return;
        const { ANIMAL_TYPES } = require('../data/animalTypes');
        const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
        const { collectProduction } = require('../engine/animals');
        const { units, nextDay } = collectProduction(animal, animalType, state.day);
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
        const { ANIMAL_PRODUCTS } = require('../data/animalProducts');
        const product = ANIMAL_PRODUCTS.find((p: any) => p.productType === productType);
        if (!product) return;
        const inStock = state.animalInventory[productType] ?? 0;
        const toSell = Math.min(units, inStock);
        if (toSell <= 0) return;
        const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const revenue = sellRevenue(toSell, product.basePrice) * coopBonus * prestigeBonus;
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
        set({ contracts: [...state.contracts, contract] });
      },

      declineContract: (templateId) => {
        const state = get();
        set({ declinedTemplates: [...state.declinedTemplates, templateId] });
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
        const { BUILDING_TYPES } = require('../data/buildingTypes');
        const building = BUILDING_TYPES.find((b: any) => b.id === buildingId);
        if (!building || state.money < building.cost) return;
        // Industrial buildings are singletons — block duplicate purchase
        if (building.category === 'industrial' && state.buildings.includes(buildingId)) return;
        set({ money: state.money - building.cost, buildings: [...state.buildings, buildingId] });
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

      placeBid: (lotId, amount) => {
        const state = get();
        const lot = state.auctionLots.find(l => l.id === lotId);
        if (!lot || lot.resolved) return;
        if (amount <= lot.currentBid) return;
        set({
          auctionLots: state.auctionLots.map(l => l.id === lotId ? {
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
        if (!state.buildings.includes(recipe.requiredBuilding)) return;
        const needed = recipe.input.amount * batches;
        if (recipe.input.source === 'crop') {
          const inStock = state.inventory[recipe.input.itemId] ?? 0;
          if (inStock < needed) return;
          set({
            inventory: { ...state.inventory, [recipe.input.itemId]: inStock - needed },
            processedInventory: {
              ...state.processedInventory,
              [recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + recipe.outputAmount * batches,
            },
          });
        } else {
          const inStock = state.animalInventory[recipe.input.itemId] ?? 0;
          if (inStock < needed) return;
          set({
            animalInventory: { ...state.animalInventory, [recipe.input.itemId]: inStock - needed },
            processedInventory: {
              ...state.processedInventory,
              [recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + recipe.outputAmount * batches,
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
        const speedBonus = getMachineSpeedBonus(state.machines);
        const yieldBonus = getMachineYieldBonus(state.machines);
        const siloCapacity = getSiloCapacity(state.buildings);
        const { harvestAmount } = require('../engine/crops');
        let totalInventory = Object.values(state.inventory).reduce((a: number, b) => a + (b as number), 0);
        let newInventory = { ...state.inventory };
        const newHarvestedCropIds = [...state.harvestedCropIds];
        const newParcels = state.parcels.map(p => {
          if (!p.plantedCrop || !p.owned || totalInventory >= siloCapacity) return p;
          const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
          if (!cropType) return p;
          if (state.day < p.plantedCrop.plantedDay + Math.round(cropType.growthDays * speedBonus)) return p;
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
          const newFertility = Math.max(1, p.fertility - (cropType.fertilityDrain ?? 0));
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
        const workerType = WT.find((t: any) => t.id === typeId);
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
        set({ money: state.money - workerType.dailyWage, workers: [...(state.workers ?? []), worker] });
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
    }),
    {
      name: 'granja-tycoon-save-v5',
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
          resolveFieldEvent, clearWeeds, fertilizeCrop, placeBid, clearDaySummary,
          buyInsurance, cancelInsurance,
          processProduct, sellProcessed,
          openTimeDeposit, closeTimeDeposit, resetGame, markTutorialSeen, markYearEndShown,
          installGreenhouse, removeGreenhouse, openFuture, joinCooperative, leaveCooperative,
          harvestAllReady, collectAllProduction, setAutoSell, startNewSeason,
          hireWorker, fireWorker, installIrrigation,
          renegotiateLoan, takeBankruptcyLoan, clearBankruptcy,
          ...dataState
        } = state;
        return dataState;
      },
    }
  )
);
