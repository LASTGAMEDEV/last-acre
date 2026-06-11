import type { GameGet, GameSet } from '../store/actions/types';
import { getDifficultyConfig } from '../engine/difficulty';
import {
  PlantedCrop, SoilType, getSoilModifier, harvestAmount,
  SoilStats, SOIL_DEFAULTS, advanceSoilStats, SoilTickParams,
} from '../engine/crops';
import { OwnedAnimal, AnimalGenes, inheritTrait, randomGenes, isAtOptimalWeight } from '../engine/animals';
import { MarketPrice, NewsEvent } from '../engine/market';
import { WeatherDay } from '../engine/climate';
import { Loan, SavingsAccount, TimeDeposit, SaleRecord, LoanRecord,
         loanTotalOwed, calculateRate, accrueInterest, timeDepositPayout } from '../engine/banking';
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
import { BUILDING_TYPES } from '../data/buildingTypes';
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
import { PROCESSED_ITEM_DEFS, ProcessingBatch, ProcessedItem } from '../data/processingTypes';
import { tickProcessedInventory } from '../engine/processing';
import { MILESTONES, checkNewMilestones, MILESTONE_REWARDS } from '../data/milestones';
import { sellRevenue, SellPressure, computeSellPressureModifier, sellPressureDuration } from '../engine/market';
import { getSeason, generateForecast, applyDailyWeather } from '../engine/climate';
import {
  StoredBatch,
  determineMoisture,
  determineHarvestQuality,
  deriveInventory,
  consumeFromBatches,
  addBatch,
  weightedQualityMultiplier,
  advanceStorageQuality,
  syncBatchesWithInventory,
  createBatchId,
} from '../engine/storageQuality';
import {
  wetDuration,
  applyWetTillageCompaction,
  checkSalinization,
  applySalinization,
  checkErosion,
  applyNaturalRecovery,
  degradationYieldModifier,
  isSoilWet,
  updateBareDayCtr,
  pruneIrrigationDays,
} from '../engine/soilDegradation';
import {
  TILLAGE_FUEL_MULT,
  TILLAGE_OM_DELTA,
  getYieldTransitionMod,
  getWeedMult,
  hasMachineryForTillage,
  fallbackTillage,
} from '../engine/tillage';
import {
  Hedgerow,
  HedgerowType,
  HEDGEROW_COST,
  HEDGEROW_WIDTH,
  HEDGEROW_MAINTENANCE,
  isMature,
  pestControlForParcel,
  isWindProtected,
  pollinatorStripCount,
  hasBufferStrip,
  annualMaintenanceCost,
  getEFACount,
  hedgerowAreaHa,
} from '../engine/hedgerows';
import {
  AESEnrollment,
  SubsidyPayment,
  AES_SCHEMES,
  calculateAnnualSubsidy,
  calculateAESPayments,
  checkAESViolation,
} from '../engine/subsidies';
import {
  OrganicStatus,
  ContaminationAppeal,
  ORGANIC_YIELD_MOD,
  organicApplicationFee,
  getOrganicPracticeBonus,
  getOrganicYieldMod,
  isOrganicEnrolled,
  advanceTransition,
  canReapplyAfterDecertification,
  isAppealExpired,
  createContaminationAppeal,
  organicPriceMultiplier,
  getParcelOrganicYieldMod,
} from '../engine/organicCert';
import {
  LeaseAgreement,
  AvailableLease,
  TenantImprovement,
  NPC_LANDOWNERS,
  calculateCashRent,
  generateAvailableLeases,
  isLeasedParcel,
  getActiveLeaseForParcel,
} from '../engine/leases';
import {
  haySilageQualityBonus,
  computeFatigue,
  isForcedRest,
  workerProductivityMod,
  fatigueProductivityMod,
  wageMultiplier,
  irrigationElectricityCost,
} from '../engine/nightOps';
import type { TimeWindow } from '../engine/nightOps';
import {
  CSASubscriber,
  CSACommitment,
  CSAWeekLog,
  evaluateBoxFulfillment,
  satisfactionDelta,
  renewalProbability,
  computeNewSubscribers,
  seasonRevenue,
  defaultCommitment,
  CSA_WEEKS_PER_SEASON,
} from '../engine/csa';
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
import { rollEvent, calcRepairCost, getHarvestModifier } from '../engine/events';
import { NPCFarmRuntime, initNpcFarms, npcSellVolume, npcAuctionBid } from '../engine/competitors';
import { tickAllPrices, updateNpcProductionMultipliers, ActiveShock } from '../engine/priceEngine';
import { advanceTimeline, clearPendingDisplayEvent, getTimelineMultiplier, INITIAL_TIMELINE_STATE, TimelineState } from '../engine/timeline';
import {
  DynastyState,
  INITIAL_DYNASTY_STATE,
  KNOWLEDGE_CATALOGUE,
  KnowledgeEntry,
  advanceDynastyYear,
  farmerAge,
} from '../engine/dynasty';
import { buildAncestorRecord, buildNextFarmer } from '../engine/inheritance';
import { annualLegacyDelta, handoffLegacyContribution } from '../engine/legacyScore';
import { HISTORICAL_EVENTS } from '../data/historicalEvents';
import { getHistoricalBaseline } from '../data/historicalPrices';
import { gameDayToCalendarYear } from '../engine/calendarUtils';
import { MapField, MapOwner } from '../types/worldMap';
import { INITIAL_MAP_FIELDS } from '../data/mapFields';
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
import {
  BATTERY_KWH_PER_BANK,
  GRID_TIER_CONFIG,
} from '../data/electricityTypes';
import {
  calcSolarOutput, calcWindOutput, calcBiogasOutput, calcBiomassOutput,
  calcGeneratorOutput, calcGeneratorFuelBurn, calcTotalDemand,
  dischargeForDeficit, chargeFromSurplus, calcGridRateForSeason,
  solarDegradationPerDay, windDegradationPerDay,
  rollOutage, rollOutageDuration, rollLightningDamage,
  prevGridTier,
} from '../engine/electricity';
import type { LandParcel } from '../types/domain/land';
import type { ShowEntry, ShowResult } from '../types/domain/animals';
import type { SeedGenes, SeedEntry, HybridJob } from '../types/domain/crops';
import type { OwnedMachine, OwnedAttachment, OwnedTrailer, DeliveryCargo, ReturnOrder, DeliveryJob, TractorJob, HarvestJob, MachineRepair } from '../types/domain/machinery';
import type { AuctionPickup, AuctionBid, AuctionLot, AuctionCategory, AuctionListing } from '../types/domain/auctions';
import type { FuturesPosition, MarketOrder, SeasonGoal, InsurancePolicy, InsuranceClaim, RivalNewsItem, PriceAlert } from '../types/domain/economy';
import type { ProductionBuildingState, HenilBatch, IncubationBatch } from '../types/domain/processing';
import type { ElectricityState } from '../types/domain/electricity';
import type { GameEvent, FairEvent, FieldEvent, DaySummaryEvent } from '../types/domain/uiEvents';
import type { GameState } from '../types/domain/gameState';
import type { TickContext } from './tickContext';
import { getTickState, patchTickState } from './tickContext';
import { familyTick }     from '../features/family/familyTick';
import { reputationTick } from '../features/reputation/reputationTick';
import { neighborTick }   from '../features/neighbors/neighborTick';
import { advanceAnnualPlanningForDay } from '../engine/annualPlanning';
import { buildAnnualPlanningInput } from '../store/annualPlanningInput';
import { CHOICE_EVENT_TEMPLATES } from '../data/choiceEvents';

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

const BREAKDOWN_CHANCE: Record<string, number> = { local: 0.01, city: 0.03, export: 0.05 };

const REPAIR_FEE: Record<string, number> = {
  'truck-pickup': 200,
  'truck-dump':   350,
  'truck-semi':   600,
};

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

type NPCFarm = NPCFarmRuntime;

export function advanceGameDay(set: GameSet, get: GameGet): void {
        const state = get();
        const diff = getDifficultyConfig(state.difficulty ?? 'standard');
        const newDay = state.day + 1;

        // ── Historical Timeline ───────────────────────────────────────────────
        const newTimeline = advanceTimeline(state.timeline, newDay, HISTORICAL_EVENTS);
        const calYear = gameDayToCalendarYear(newDay);
        const prevCalYear = gameDayToCalendarYear(state.day);
        const isNewYear = calYear > prevCalYear;

        let newDynasty = state.dynasty ?? INITIAL_DYNASTY_STATE;
        if (isNewYear) {
          const ownedHectares = state.parcels
            .filter(p => p.owned)
            .reduce((sum, parcel) => sum + parcel.hectares, 0);
          const hasDebt = state.loans.some(loan => !loan.paid && !loan.defaulted);
          const { dynasty: advanced, triggerHandoff, handoffCause } = advanceDynastyYear(
            newDynasty,
            calYear,
            {
              hasPlantedCrops: state.parcels.some(p => p.owned && p.plantedCrop !== null),
              hasAnimals: state.animals.length > 0,
              hasMachines: state.machines.length > 0,
              hasLoans: hasDebt,
            }
          );

          newDynasty = {
            ...advanced,
            legacyScore: advanced.legacyScore + annualLegacyDelta({
              ownedHectares,
              hasDebt,
              knowledgeBankSize: advanced.knowledgeBank.length,
            }),
            pendingHandoff: triggerHandoff ? true : advanced.pendingHandoff,
            pendingHandoffCause: triggerHandoff ? handoffCause : advanced.pendingHandoffCause,
          };

          const alreadyEarned = (id: string) => newDynasty.knowledgeBank.some(entry => entry.id === id);
          const idsToEarn: string[] = [];
          if (!alreadyEarned('land-builder') && ownedHectares >= 100) idsToEarn.push('land-builder');
          if (!alreadyEarned('organic-mastery') && state.parcels.some(p => p.owned && p.organicStatus === 'organic')) {
            idsToEarn.push('organic-mastery');
          }
          if (!alreadyEarned('auction-eye') && (state.dynastyAuctionWins ?? 0) >= 5) idsToEarn.push('auction-eye');

          if (idsToEarn.length > 0) {
            const newEntries: KnowledgeEntry[] = idsToEarn
              .map(id => KNOWLEDGE_CATALOGUE.find(entry => entry.id === id))
              .filter((entry): entry is KnowledgeEntry => entry !== undefined);

            newDynasty = {
              ...newDynasty,
              currentFarmer: {
                ...newDynasty.currentFarmer,
                unlockedKnowledge: [...newDynasty.currentFarmer.unlockedKnowledge, ...idsToEarn],
              },
              knowledgeBank: [...newDynasty.knowledgeBank, ...newEntries],
            };
          }
        }

        // ── Phase 3 Ticks ─────────────────────────────────────────────────────
        // Build a TickContext seeded with already-computed values, run Phase 3 ticks,
        // then extract their state patches for inclusion in the final set() call.
        let phase3Ctx: TickContext = {
          previousState: state,
          pendingState: {
            day:      newDay,
            timeline: newTimeline,
            dynasty:  newDynasty,
          },
          newDay,
          summary: [],
        };
        phase3Ctx = familyTick(phase3Ctx);
        phase3Ctx = reputationTick(phase3Ctx);
        phase3Ctx = neighborTick(phase3Ctx);
        const phase3Patch = phase3Ctx.pendingState;

        const season = getSeason(newDay);
        const rawWorkerBonuses = getWorkerBonuses(state.workers ?? []);
        const nightOpsFieldWorkers = (state.workers ?? []).filter(
          w => !w.isInjured && !w.isOnLeave && (w.department === 'fields' || w.department === 'machinery')
        );
        const nightOpsProductivityMod = nightOpsFieldWorkers.length > 0
          ? nightOpsFieldWorkers.reduce((sum, w) => {
              const pref = ((w.shiftPreference === 'any' ? 'day' : w.shiftPreference) ?? 'day') as TimeWindow;
              return sum + fatigueProductivityMod(w.fatigueLevel ?? 0) * workerProductivityMod(season, pref);
            }, 0) / nightOpsFieldWorkers.length
          : 1.0;
        const workerBonuses = nightOpsProductivityMod < 1.0
          ? { ...rawWorkerBonuses, cropYieldMultiplier: rawWorkerBonuses.cropYieldMultiplier * nightOpsProductivityMod, animalProductionMult: rawWorkerBonuses.animalProductionMult * nightOpsProductivityMod }
          : rawWorkerBonuses;

        // Fuel price fluctuation (·$0.04/day, clamped $0.90·$1.80)
        const fuelDelta = (Math.random() - 0.5) * 0.08;
        const baseFuelPrice = Math.min(1.80, Math.max(0.90, (state.fuelPrice ?? 1.20) + fuelDelta));
        const fuelCostMult = getTimelineMultiplier(newTimeline, 'fuel_cost');
        const newFuelPrice = baseFuelPrice * fuelCostMult;
        const prevSeason = getSeason(state.day);
        const summary: DaySummaryEvent[] = [];
        let colmenaNegligenceStartDay = { ...state.colmenaNegligenceStartDay };
        let newCropResidueKg = state.cropResidueKg ?? 0;

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
          calendarYear: calYear,
          timelineMultipliers: newTimeline.effectMultipliers,
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
              summary.push({ id: `show_win_${result.id}`, icon: '🏆', title: `1st place at the County Show! +€${result.prize.toLocaleString()}`, detail: '', severity: 'good' });
            } else if (result.placement <= 3) {
              summary.push({ id: `show_place_${result.id}`, icon: '🎖️', title: `${result.placement === 2 ? '2nd' : '3rd'} place at the County Show! +€${result.prize.toLocaleString()}`, detail: '', severity: 'good' });
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
        if (!seasonalEvent && Math.random() < 0.03 * diff.disasterFreqMult) {
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
                  precisionApplied: false,
                  yieldHistory: [],
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
          const nightPremium = Math.round(
            afterPoachingWorkers.reduce((sum, w) => {
              const pref = ((w.shiftPreference === 'any' ? 'day' : w.shiftPreference) ?? 'day') as TimeWindow;
              return sum + (wageMultiplier(pref) - 1.0) * w.wagePerDay * 7;
            }, 0)
          );
          workerPayrollDeducted += nightPremium;
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
              message: `${w.name} is asking for a pay rise from €${w.wagePerDay}/day.`,
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

        // ── Night ops: fatigue & heat ────────────────────────────────────────
        finalWorkers = finalWorkers.map(w => {
          const pref = (w.shiftPreference === 'any' ? 'day' : w.shiftPreference) ?? (w.nightShift ? 'night' : 'day');
          const { fatigue, consecutiveNights } = computeFatigue(
            w.fatigueLevel ?? 0,
            pref,
            w.consecutiveNightShifts ?? 0,
          );
          // Summer heat warning
          if (season === 'summer' && pref === 'day' && (w.department === 'fields' || w.department === 'machinery')) {
            if (newDay % 7 === 0) {
              summary.push({
                id: `heat_warning_${w.id}_${newDay}`,
                icon: '☀️',
                title: `${w.name} affected by summer heat`,
                detail: 'Outdoor workers are 30% less productive during day shifts in summer. Consider twilight scheduling.',
                severity: 'info' as const,
              });
            }
          }
          // Forced rest
          if (isForcedRest(consecutiveNights, fatigue)) {
            summary.push({
              id: `forced_rest_${w.id}_${newDay}`,
              icon: '😴',
              title: `${w.name} on mandatory rest`,
              detail: fatigue >= 1.0 ? 'Worker called in sick due to exhaustion.' : 'Mandatory 2-day rest after 5 consecutive night shifts.',
              severity: 'warning' as const,
            });
            return { ...w, fatigueLevel: Math.max(0, fatigue - 0.15), consecutiveNightShifts: 0, isOnLeave: true, leaveReturnDay: newDay + 2 };
          }
          return { ...w, fatigueLevel: fatigue, consecutiveNightShifts: consecutiveNights };
        });

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
            insurancePremium > 0 && `${activePolicies.length} active policy${activePolicies.length !== 1 ? 'ies' : ''} (-€${insurancePremium}/day)`,
            workerWages > 0 && `${finalWorkers.length} worker${finalWorkers.length !== 1 ? 's' : ''} -€${workerWages}/week`,
          ].filter(Boolean).join(' · ');
          summary.push({
            id: 'maintenance',
            icon: '🔧',
            title: `-€${totalFixed.toLocaleString()} fixed costs`,
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

        // Weed spread (with 2-day early warning for precision ag)
        let parcels = fallowParcels.map(p => {
          if (p.owned && !p.plantedCrop && !p.hasWeeds && !p.weedDetectedDay) {
            const weedChance = 0.05 * diff.weedChanceMult * getWeedMult(p.tillageSystem ?? 'conventional', p.notillSeasons ?? 0, p.weedFlushSeason ?? false);
            if (Math.random() < weedChance) {
              return { ...p, weedDetectedDay: newDay };
            }
          }
          // If weed was detected 2+ days ago, flip hasWeeds
          if (p.weedDetectedDay && newDay - p.weedDetectedDay >= 2 && !p.hasWeeds) {
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
            if (p.plantedCrop && !p.greenhouse && Math.random() < 0.12 * diff.weatherDamageMult) {
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
          if (p.owned && p.plantedCrop && !p.greenhouse && Math.random() < 0.003 * diff.fireChanceMult) {
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
            let chance = baseOutbreakChance(
              cropType,
              season,
              resolvedWeather?.event ?? 'sunny',
              p.cropHistory ?? [],
              state.beneficialInsectsActive,
            );
            // Hedgerow pest control
            chance *= (1 - pestControlForParcel(p.id, state.hedgerows ?? [], newDay));
            chance *= diff.pestChanceMult;
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
          // Swarming check for neglected colmenas (season change)
          if (currSeasonApiary !== prevSeasonApiary) {
            const colmenaIds = state.buildings.filter((b: string) => b.startsWith('bld_colmena'));
            for (const colmenaId of colmenaIds) {
              const linkedCount = state.parcels.filter((p: LandParcel) => p.linkedColmenaId === colmenaId).length;
              if (linkedCount === 0) {
                if (!colmenaNegligenceStartDay[colmenaId]) {
                  colmenaNegligenceStartDay[colmenaId] = newDay;
                } else if (newDay - colmenaNegligenceStartDay[colmenaId] >= 30) {
                  if (Math.random() < 0.25) {
                    const beesInColmena = animals.filter((a: OwnedAnimal) => a.typeId === 'abeja' && !a.sick && !diedIds.includes(a.id));
                    const swarmCount = Math.max(1, Math.round(beesInColmena.length * 0.25));
                    const toRemove = beesInColmena.slice(0, swarmCount);
                    for (const bee of toRemove) {
                      diedIds.push(bee.id);
                      animals = animals.filter((a: OwnedAnimal) => a.id !== bee.id);
                    }
                    summary.push({
                      id: `swarm_${colmenaId}_${newDay}`,
                      icon: '🐝',
                      title: 'Swarm!',
                      detail: `${swarmCount} bee colonies left due to neglect. Link apiary to fields to prevent future swarms.`,
                      severity: 'warning' as const,
                    });
                  }
                }
              } else {
                delete colmenaNegligenceStartDay[colmenaId];
              }
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

        // Complete any repairs that are ready and restore condition
        const repairedMachineIds = new Set<string>();
        machineRepairs = machineRepairs.filter(r => {
          if (r.readyDay !== null && newDay >= r.readyDay) {
            repairedMachineIds.add(r.machineId);
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

        // Drain machine condition daily; restore repaired machines to 90
        const activeTractorIds = new Set((state.tractorJobs ?? []).filter(j => j.completesDay > newDay).map(j => j.tractorId));
        const activeCombineIds = new Set((state.harvestJobs ?? []).filter(j => j.completesDay > newDay).map(j => j.combineId));
        const updatedMachines = (state.machines ?? []).map(m => {
          if (repairedMachineIds.has(m.id)) return { ...m, condition: 90 };
          const cur = m.condition ?? 100;
          const drain = activeTractorIds.has(m.id) || activeCombineIds.has(m.id) ? 0.3 : 0.05;
          return { ...m, condition: Math.max(0, parseFloat((cur - drain).toFixed(2))) };
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
        let dynastyAuctionWinsDelta = 0;

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
            dynastyAuctionWinsDelta += 1;
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
            precisionApplied: false, yieldHistory: [],
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

        // ── No-till season counter at season change ─────────────────────────
        if (season !== prevSeason) {
          finalParcels = finalParcels.map((p: LandParcel) => {
            if (!p.owned || p.tillageSystem !== 'notill') return p;
            return { ...p, notillSeasons: (p.notillSeasons ?? 0) + 1 };
          });
        }

        // ── Hedgerow maturity & maintenance ─────────────────────────────────
        let updatedHedgerows = (state.hedgerows ?? []).map(h => ({
          ...h,
          mature: isMature(h, newDay),
        }));
        let updatedAESEnrollments = state.aesEnrollments ?? [];
        let newCropsGrownThisYear = state.cropsGrownThisYear ?? [];
        let newStrawBurnedThisYear = state.strawBurnedThisYear ?? false;
        let newSubsidyLog = state.subsidyLog ?? [];
        // Annual maintenance in spring
        if (season === 'spring' && prevSeason === 'winter') {
          if (calYear >= 1992) {
            const maintenanceCost = annualMaintenanceCost(updatedHedgerows);
            if (maintenanceCost > 0) {
              if (state.money + moneyDelta >= maintenanceCost) {
                moneyDelta -= maintenanceCost;
                // Clear neglected state if paid
                updatedHedgerows = updatedHedgerows.map(h => ({ ...h, neglected: false }));
              } else {
                // Mark all as neglected
                updatedHedgerows = updatedHedgerows.map(h => ({ ...h, neglected: true }));
                summary.push({
                  id: `hedgerow_neglect_${newDay}`,
                  icon: '🌿',
                  title: 'Hedgerows neglected',
                  detail: 'Insufficient funds for annual maintenance. Effects halved until paid.',
                  severity: 'warning' as const,
                });
              }
            }

            // ── CAP Subsidy payment ─────────────────────────────────────────────
            const ownedHa = finalParcels.filter((p: LandParcel) => p.owned).reduce((s, p) => s + p.hectares, 0);
            const leasedHa = (state.activeLeases ?? []).filter(l => l.status === 'active').reduce((sum, l) => {
              const parcel = finalParcels.find((p: LandParcel) => p.id === l.parcelId);
              return sum + (parcel?.hectares ?? 0);
            }, 0);
            const payment = calculateAnnualSubsidy({
              currentDay: newDay,
              ownedHa,
              leasedHa,
              cropsGrownThisYear: state.cropsGrownThisYear ?? [],
              hedgerows: updatedHedgerows,
              strawBurnedThisYear: state.strawBurnedThisYear ?? false,
              aesEnrollments: state.aesEnrollments ?? [],
            });
            moneyDelta += payment.total;
            newSubsidyLog = [...newSubsidyLog, payment];
            summary.push({
              id: `cap_payment_${newDay}`,
              icon: '💶',
              title: `CAP annual payment: €${payment.total.toLocaleString()}`,
              detail: `Basic: €${payment.basic.toLocaleString()} · Greening: €${payment.greening.toLocaleString()} · Young Farmer: €${payment.youngFarmer.toLocaleString()} · AES: €${payment.aes.toLocaleString()}`,
              severity: 'info' as const,
            });
            if (!payment.greeningQualified && payment.greening === 0) {
              summary.push({
                id: `cap_greening_missed_${newDay}`,
                icon: '⚠️',
                title: 'Greening payment withheld',
                detail: `Missing: ${payment.greeningFailReasons.join(', ')}`,
                severity: 'warning' as const,
              });
            }
            // Check AES violations
            updatedAESEnrollments = (state.aesEnrollments ?? []).map((en: AESEnrollment) => {
              if (en.status !== 'active') return en;
              const violated = checkAESViolation(en, finalParcels, newDay);
              if (violated) {
                const scheme = AES_SCHEMES.find(s => s.id === en.schemeId);
                const repayment = Math.round(en.totalPaidSoFar * 1.20);
                moneyDelta -= repayment;
                summary.push({
                  id: `aes_violation_${en.id}_${newDay}`,
                  icon: '⚠️',
                  title: `AES violation: ${scheme?.name ?? en.schemeId}`,
                  detail: `Repaying €${repayment.toLocaleString()} (prior payments + 20% penalty). Scheme terminated.`,
                  severity: 'danger' as const,
                });
                return { ...en, status: 'violated' as const };
              }
              // Add this year's payment to totalPaidSoFar for active schemes
              const scheme = AES_SCHEMES.find(s => s.id === en.schemeId);
              const annualPayment = scheme ? Math.round(scheme.paymentPerHa * en.enrolledHa) : 0;
              return { ...en, totalPaidSoFar: en.totalPaidSoFar + annualPayment };
            });
          }

          if (calYear >= 1990) {
            // ── Organic certification: Spring inspection ────────────────────────
            finalParcels = finalParcels.map((p: LandParcel) => {
              if (!p.owned || !p.organicStatus || p.organicStatus === 'conventional' || p.organicStatus === 'decertified') return p;
              // Check appeal expiry
              if (p.pendingContaminationAppeal && isAppealExpired(p.pendingContaminationAppeal, newDay)) {
                summary.push({
                  id: `organic_appeal_missed_${p.id}_${newDay}`,
                  icon: '🚫',
                  title: `${p.name} decertified`,
                  detail: 'Contamination appeal window expired. Organic certification lost for 3 years.',
                  severity: 'danger' as const,
                });
                return {
                  ...p,
                  organicStatus: 'decertified' as OrganicStatus,
                  lastDecertifiedDay: newDay,
                  pendingContaminationAppeal: undefined,
                };
              }
              // Advance transition if no pending appeal
              const newStatus = advanceTransition(p.organicStatus);
              if (newStatus !== p.organicStatus) {
                summary.push({
                  id: `organic_advance_${p.id}_${newDay}`,
                  icon: newStatus === 'organic' ? '🌿' : '🔄',
                  title: `${p.name}: ${newStatus === 'organic' ? 'Certified Organic!' : 'Transition advanced'}`,
                  detail: newStatus === 'organic' ? 'Full organic certification achieved. Premium prices unlocked.' : `Now in ${newStatus.replace('_', ' ')}.`,
                  severity: 'info' as const,
                });
              }
              return { ...p, organicStatus: newStatus, pendingContaminationAppeal: undefined };
            });
          }

          // Reset annual trackers
          newCropsGrownThisYear = [];
          newStrawBurnedThisYear = false;
        }

        // ── CSA Season start (Spring/Summer/Autumn day 1) ───────────────────
        let updatedCSASubscribers = state.csaSubscribers ?? [];
        let updatedCSAWeeklyLog = state.csaWeeklyLog ?? [];
        const isCSASeasonStart = (season === 'spring' || season === 'summer' || season === 'autumn') && prevSeason !== season;
        if (isCSASeasonStart && state.csaActive && calYear >= 1984) {
          // Season end: renewals + new subscribers
          if (state.csaSeasonStart && updatedCSASubscribers.length > 0) {
            const hasOrganic = finalParcels.some((p: LandParcel) => p.organicStatus === 'organic');
            const avgSat = updatedCSASubscribers.length > 0
              ? updatedCSASubscribers.reduce((s, sub) => s + sub.satisfaction, 0) / updatedCSASubscribers.length
              : 0;
            // Renewals
            const renewed = updatedCSASubscribers.filter(sub => Math.random() < renewalProbability(sub.satisfaction));
            const newSubsCount = computeNewSubscribers(avgSat, state.legacyReputation ?? 50, hasOrganic, renewed.length, state.nearSettlement);
            const newSubs: CSASubscriber[] = Array.from({ length: newSubsCount }).map((_, i) => ({
              id: `csa_sub_${newDay}_${i}`,
              name: `Subscriber ${renewed.length + i + 1}`,
              boxSize: (['small', 'medium', 'large'] as const)[Math.floor(Math.random() * 3)],
              pricePerSeason: Math.round(105 * state.csaCommitment.priceModifier),
              satisfaction: 60,
              seasonsSubscribed: 0,
              joinedDay: newDay,
            }));
            updatedCSASubscribers = [...renewed.map(s => ({ ...s, seasonsSubscribed: s.seasonsSubscribed + 1, satisfaction: Math.min(100, s.satisfaction + 5) })), ...newSubs];
            updatedCSAWeeklyLog = [];
          }
          // Upfront payment
          if (updatedCSASubscribers.length > 0) {
            const revenue = seasonRevenue(updatedCSASubscribers, state.csaCommitment.priceModifier);
            moneyDelta += revenue;
            summary.push({
              id: `csa_season_start_${newDay}`,
              icon: '💶',
              title: `CSA season started: €${revenue.toLocaleString()}`,
              detail: `${updatedCSASubscribers.length} subscribers · Upfront payment received`,
              severity: 'info' as const,
            });
          }
          // Set commitment from subscribers
          const smallCount = updatedCSASubscribers.filter(s => s.boxSize === 'small').length;
          const mediumCount = updatedCSASubscribers.filter(s => s.boxSize === 'medium').length;
          const largeCount = updatedCSASubscribers.filter(s => s.boxSize === 'large').length;
          updatedCSASubscribers = updatedCSASubscribers;
        }

        // ── CSA Weekly fulfillment ──────────────────────────────────────────
        if (state.csaActive && state.csaSeasonStart && updatedCSASubscribers.length > 0 && calYear >= 1984) {
          const weekNumber = Math.floor((newDay - state.csaSeasonStart) / 7) + 1;
          if (weekNumber >= 1 && weekNumber <= CSA_WEEKS_PER_SEASON && newDay % 7 === 0) {
            const inventory = state.inventory ?? {};
            const { fillRate, varietyMet } = evaluateBoxFulfillment(inventory, state.csaCommitment);
            const delta = satisfactionDelta(fillRate, varietyMet);
            updatedCSASubscribers = updatedCSASubscribers.map(sub => ({
              ...sub,
              satisfaction: Math.max(0, Math.min(100, sub.satisfaction + delta)),
            }));
            // Mid-season cancellation
            updatedCSASubscribers = updatedCSASubscribers.filter(sub => {
              if (sub.satisfaction >= 20) return true;
              summary.push({
                id: `csa_cancel_${sub.id}_${newDay}`,
                icon: '❌',
                title: `CSA subscriber cancelled`,
                detail: `${sub.name} left due to poor service.`,
                severity: 'warning' as const,
              });
              return false;
            });
            updatedCSAWeeklyLog = [...updatedCSAWeeklyLog, {
              weekNumber,
              fillRate,
              varietyMet,
              bonusItemAdded: false,
              avgSatisfactionChange: delta,
            }];
          }
        }

        // ── Lease expiry & renewal ──────────────────────────────────────────
        let updatedLeases = (state.activeLeases ?? []).map((l: LeaseAgreement) => {
          if (l.status !== 'active') return l;
          // Expired
          if (newDay >= l.endDay) {
            if (l.autoRenew && l.leaseType === 'cash_rent' && l.cashRentPerSeason) {
              const canPay = state.money + moneyDelta >= l.cashRentPerSeason;
              if (canPay) {
                moneyDelta -= l.cashRentPerSeason;
                return { ...l, endDay: l.endDay + 90 };
              }
            }
            // Terminate: lock parcel
            finalParcels = finalParcels.map((p: LandParcel) =>
              p.id === l.parcelId ? { ...p, owned: false, plantedCrop: null } : p
            );
            return { ...l, status: 'expired' as const };
          }
          // 30-day warning
          if (newDay === l.endDay - 30) {
            summary.push({
              id: `lease_warning_${l.id}_${newDay}`,
              icon: '📋',
              title: `Lease on ${l.npcName} expires in 30 days`,
              detail: 'Renew or harvest remaining crops before expiry.',
              severity: 'info' as const,
            });
          }
          return l;
        });

        // ── Spring lease offer refresh ──────────────────────────────────────
        let updatedAvailableLeases = state.availableLeases ?? [];
        if (season === 'spring' && prevSeason === 'winter') {
          updatedAvailableLeases = generateAvailableLeases(newDay, state.legacyReputation ?? 50);
        }

        // Time deposit maturity payouts
        const maturedDeposits = state.timeDeposits.filter(
          d => newDay >= d.startDay + d.termDays
        );
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
            title: `Time deposit matured · +€${payout.toLocaleString()}`,
            detail: `€${d.amount.toLocaleString()} at ${(d.rate * 100).toFixed(0)}% for ${d.termDays}d`,
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

        // ── Ration analysis (computed before production so modifiers apply today) ──
        const { analyzeRation: analyzeRationAdv, generateDefaultRation: genDefaultRationAdv, getRationProductionModifier: getRationProdModAdv, FEED_NUTRITION: FEED_NUTRITION_ADV } = require('../engine/nutrition');
        const { ANIMAL_TYPES: AT_RATION } = require('../data/animalTypes');
        const hasAnimalWorkerGlobal = (state.workers ?? []).some(
          (w: Worker) => w.role === 'livestock_hand' || w.role === 'veterinarian'
        );
        const hasFeedMillGlobal = (state.buildings ?? []).some((bid: string) =>
          bid === 'bld_feed_mill_s' || bid === 'bld_feed_mill_m' || bid === 'bld_feed_mill_l'
        );
        const feedMillMultGlobal = hasFeedMillGlobal ? 0.65 : 1.0;
        const animalsFedGlobal = hasAnimalWorkerGlobal || state.animalsManuallyFed;
        const rationTierMap: Record<string, import('../engine/nutrition').RationAnalysis['tier']> = {};
        if (animalsFedGlobal) {
          const animalsByType: Record<string, OwnedAnimal[]> = {};
          for (const a of animals) {
            if (!animalsByType[a.typeId]) animalsByType[a.typeId] = [];
            animalsByType[a.typeId].push(a);
          }
          for (const typeId of Object.keys(animalsByType)) {
            const animalType = AT_RATION.find((t: any) => t.id === typeId);
            if (!animalType || !animalType.feedKgPerDay) continue;
            const count = animalsByType[typeId].length;
            const ration = state.savedRations[typeId] ?? genDefaultRationAdv(animalType);
            // Check inventory for shortage
            let shortage = false;
            const totalKg = animalType.feedKgPerDay * count * feedMillMultGlobal;
            for (const ing of ration.ingredients) {
              if (ing.pct <= 0) continue;
              const needed = totalKg * (ing.pct / 100);
              const info = FEED_NUTRITION_ADV[ing.ingredientId];
              if (!info) continue;
              if (ing.ingredientId === 'hay') {
                if ((state.animalInventory['hay'] ?? 0) < needed) shortage = true;
              } else if (ing.ingredientId === 'silage') {
                if ((state.silageLevel ?? 0) < needed) shortage = true;
              } else if (ing.ingredientId === 'protein_meal' || ing.ingredientId === 'mineral_premix') {
                if ((state.animalInventory[ing.ingredientId] ?? 0) < needed) shortage = true;
              } else {
                if ((state.inventory[ing.ingredientId] ?? 0) < needed) shortage = true;
              }
            }
            if (ration.mineralPremixKgPerAnimalPerDay > 0) {
              if ((state.animalInventory['mineral_premix'] ?? 0) < ration.mineralPremixKgPerAnimalPerDay * count) shortage = true;
            }
            // Pasture
            const hasOwnedParcels = state.parcels.some((p: LandParcel) => p.owned && !p.plantedCrop);
            const hasIrrigation = state.parcels.some((p: LandParcel) => p.owned && p.irrigated && !p.plantedCrop);
            let pastureKg = 0;
            if (animalType.enclosureType === 'corral' || animalType.enclosureType === 'caballeriza') {
              pastureKg = hasOwnedParcels ? (hasIrrigation ? 2.0 : 1.0) : 0;
            }
            const seasonPastureMult = season === 'winter' ? 0.15 : season === 'summer' ? 1.2 : 1.0;
            pastureKg *= seasonPastureMult;
            const analysis = analyzeRationAdv(ration, animalType, { ...state.inventory, ...state.animalInventory, silage: state.silageLevel ?? 0 }, pastureKg);
            rationTierMap[typeId] = shortage ? 'deficient' : analysis.tier;
          }
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
            const { getHoneyMultiplier } = require('../engine/pollination');
            const honeyMult = getHoneyMultiplier(newDay, state.todayWeather);
            const graneroBonus = state.buildings.includes('bld_granero') ? 1.2 : 1.0;
            animals = animals.map((a: OwnedAnimal) => {
              if (a.sick) return a;
              const animalType = AT_KEEPER.find((t: any) => t.id === a.typeId);
              if (!animalType?.productionType) return a;
              const { units, nextDay } = collectProd(a, animalType, newDay);
              if (units <= 0) return a;
              const key = animalType.productionType;
              const rationMod = getRationProdModAdv(rationTierMap[a.typeId] ?? 'optimal');
              let finalUnits = units * graneroBonus * workerBonuses.animalProductionMult * rationMod;
              if (animalType.id === 'abeja') {
                finalUnits *= honeyMult;
                if (honeyMult === 0 && getSeason(state.day) !== 'winter' && getSeason(newDay) === 'winter') {
                  summary.push({
                    id: `bee_winter_${newDay}`,
                    icon: '🐝',
                    title: 'Bees entering winter cluster',
                    detail: 'No honey production until spring.',
                    severity: 'info' as const,
                  });
                }
              }
              return { ...a, lastProductionDay: nextDay, _autoCollect: { key, units: Math.round(finalUnits) } };
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
            const workerCropsGrownThisYear = [...(state.cropsGrownThisYear ?? [])];
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
              const rawUnits = harvestAmt(p.plantedCrop, cropType, p.soil ?? SOIL_DEFAULTS, climateModifier, p.hasWeeds, machineYieldWithEngineer, p.plantedCrop.frostDamage ?? 0, p.plantedCrop.droughtStress ?? 0, degradationYieldModifier(p), getYieldTransitionMod(p.tillageSystem ?? 'conventional', p.notillSeasons ?? 0), getParcelOrganicYieldMod(p));
              const { getPollinationMultiplier: getPollMultW } = require('../engine/pollination');
              const { getResiduePct } = require('../engine/composting');
              const pollMultW = getPollMultW(p, finalParcels, newDay, state.hedgerows ?? []);
              const precisionMod = p.precisionApplied ? 1.05 : 1.0;
              const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * irrigationBonus * rotationMod * soilMod * workerBonuses.cropYieldMultiplier * pollMultW * precisionMod), siloCapacity - siloTotal);
              siloTotal += units;
              workerNewInventory[p.plantedCrop.cropId] = (workerNewInventory[p.plantedCrop.cropId] ?? 0) + units;
              if (!newHarvestedIds.includes(p.plantedCrop.cropId)) newHarvestedIds.push(p.plantedCrop.cropId);
              if (!workerCropsGrownThisYear.includes(p.plantedCrop.cropId)) workerCropsGrownThisYear.push(p.plantedCrop.cropId);
              const newFertility = Math.max(1, p.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonuses.fertilityDrainMult));
              // Crop residue
              const residuePct = getResiduePct(p.plantedCrop.cropId);
              newCropResidueKg = Math.min(10000, newCropResidueKg + units * residuePct);
              // Yield history
              const seasonLabel = `${season.charAt(0).toUpperCase() + season.slice(1)} Y${Math.ceil(newDay / 360)}`;
              const newYieldHistory = [...(p.yieldHistory ?? []), { season: seasonLabel, cropId: p.plantedCrop.cropId, kgPerHa: p.hectares > 0 ? units / p.hectares : 0, day: newDay }].slice(-8);
              return { ...p, plantedCrop: null, lastCropId: p.plantedCrop.cropId, fertility: newFertility, cropHistory: [...(p.cropHistory ?? []).slice(-3), p.plantedCrop.cropId], precisionApplied: false, yieldHistory: newYieldHistory };
            });
            (autoSellFinalInventory as any).__workerInventory = workerNewInventory;
            (autoSellFinalInventory as any).__harvestedIds = newHarvestedIds;
            (autoSellFinalInventory as any).__cropsGrownThisYear = workerCropsGrownThisYear;
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
        const workerCropsGrown: string[] | undefined = (autoSellFinalInventory as any).__cropsGrownThisYear;
        const workerInventoryOverride: Record<string, number> | undefined = (autoSellFinalInventory as any).__workerInventory;
        const workerAnimalInventory: Record<string, number> | undefined = (animals as any).__newAnimalInventory;
        const inventoryForSet = workerInventoryOverride ?? autoSellFinalInventory;
        const animalInventoryForSet = workerAnimalInventory ?? state.animalInventory;
        let animalInventory = { ...animalInventoryForSet };
        let newGrainMissed = state.grainMissedDays ?? 0;
        let newHayMissed = state.hayMissedDays ?? 0;
        let newSilageLevel = state.silageLevel ?? 0;
        const harvestedCropIdsForSet = workerHarvestedIds ?? state.harvestedCropIds;
        // Spring reset takes priority over worker harvest accumulation
        const cropsGrownThisYearForSet = (season === 'spring' && prevSeason === 'winter')
          ? (workerCropsGrown ?? [])
          : (workerCropsGrown ?? state.cropsGrownThisYear ?? []);

        // ── Fuel tracking for job day ────────────────────────────────────────
        let currentFuel = state.fuel ?? 200;
        const fuelPausedNames: string[] = [];

        // ── Process TractorJobs ──────────────────────────────────────────────
        let tillCompletedThisDay = false;
        let tractorSlurryDrain = 0;
        const completedTractorJobIds: string[] = [];
        for (const job of (state.tractorJobs ?? [])) {
          if (job.completesDay > newDay) continue;
          // Fuel check (with tillage multiplier)
          const tractorOwned = (state.machines ?? []).find((m: OwnedMachine) => m.id === job.tractorId);
          const tractorMachineType = MACHINE_TYPES.find((mt: MachineType) => mt.id === (tractorOwned?.typeId ?? ''));
          const firstParcel = finalParcels.find((p: LandParcel) => job.parcelIds.includes(p.id));
          const fuelMult = TILLAGE_FUEL_MULT[firstParcel?.tillageSystem ?? 'conventional'];
          const fuelNeeded = Math.round((tractorMachineType?.fuelPerDay ?? 0) * fuelMult);
          if (fuelNeeded > 0 && currentFuel < fuelNeeded) {
            fuelPausedNames.push(tractorMachineType?.name ?? 'Tractor');
            continue;
          }
          currentFuel -= fuelNeeded;
          completedTractorJobIds.push(job.id);
          // Wet-tillage compaction check
          finalParcels = finalParcels.map((p: LandParcel) => {
            if (!job.parcelIds.includes(p.id)) return p;
            if (isSoilWet(p, newDay)) {
              return applyWetTillageCompaction(p);
            }
            return p;
          });
          if (job.operation === 'till') {
            finalParcels = finalParcels.map((p: LandParcel) =>
              job.parcelIds.includes(p.id) ? { ...p, tilled: true } : p
            );
            tillCompletedThisDay = true;
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
              const updated: any = {
                ...p,
                plantedCrop: {
                  ...p.plantedCrop,
                  appliedN: Math.max(p.plantedCrop.appliedN ?? 1.0, 1.10),
                },
              };
              if (p.linkedColmenaId) {
                updated.pesticideSprayedDay = state.day;
              }
              return updated;
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
              Math.round(harvestAmount(parcel.plantedCrop!, cropType, parcel.soil ?? SOIL_DEFAULTS, climateModifier, parcel.hasWeeds, 1.0, parcel.plantedCrop!.frostDamage ?? 0, parcel.plantedCrop!.droughtStress ?? 0, degradationYieldModifier(parcel), getYieldTransitionMod(parcel.tillageSystem ?? 'conventional', parcel.notillSeasons ?? 0), getParcelOrganicYieldMod(parcel)) * pestYieldModifier(parcel.pestState?.severity ?? 0)),
              siloCapForHarvest - currentTotal,
            );
            const newFertility = Math.max(1, parcel.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonuses.fertilityDrainMult));
            finalParcels = finalParcels.map((p: LandParcel) => {
              if (p.id !== pid) return p;
              let updated: LandParcel = { ...p, plantedCrop: null, lastCropId: parcel.plantedCrop!.cropId, fertility: newFertility, tilled: false, cropHistory: [...(parcel.cropHistory ?? []).slice(-3), parcel.plantedCrop!.cropId] };
              if (isSoilWet(updated, newDay)) {
                updated = applyWetTillageCompaction(updated);
              }
              return updated;
            });
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

        // ── Soil degradation tick ────────────────────────────────────────────
        finalParcels = finalParcels.map(p => {
          if (!p.owned) return p;
          let updated = { ...p };

          // 1. Wet soil flag
          if (todayWeather && (todayWeather.event === 'rain' || todayWeather.event === 'heavy_rain')) {
            const wetDays = wetDuration(todayWeather.event, todayWeather.streakDay ?? 1);
            updated.soilWetUntilDay = Math.max(updated.soilWetUntilDay ?? 0, newDay + wetDays);
          }

          // 2. Natural compaction recovery
          updated.soil = {
            ...updated.soil,
            compaction: Math.max(0, updated.soil.compaction - 1),
          };

          // 3. Bare field tracking
          updated = updateBareDayCtr(updated);

          // 4. Erosion check
          const windProtected = isWindProtected(updated.id, state.hedgerows ?? [], newDay);
          updated = checkErosion(updated, todayWeather?.event ?? 'sunny', windProtected);

          // 4b. Runoff fine: heavy rain + waterway + fertilizer + no buffer
          if (todayWeather?.event === 'heavy_rain' && updated.waterwayAdjacent && !hasBufferStrip(updated.id, state.hedgerows ?? [])) {
            const fertilizedRecently = (updated as any).fertilizerAppliedDay && newDay - (updated as any).fertilizerAppliedDay <= 3;
            if (fertilizedRecently) {
              moneyDelta -= 500;
              summary.push({
                id: `runoff_fine_${updated.id}_${newDay}`,
                icon: '💧',
                title: `Environmental fine on ${updated.name}`,
                detail: 'Fertilizer runoff into waterway — €500, −3 reputation. Install a buffer strip to comply.',
                severity: 'warning' as const,
              });
            }
          }

          // 5. Irrigation tracking & salinization
          const isRainDay = todayWeather?.event === 'rain' || todayWeather?.event === 'heavy_rain';
          if (updated.irrigated && !isRainDay) {
            updated = pruneIrrigationDays(updated, newDay, true);
          } else if (isRainDay) {
            updated = pruneIrrigationDays(updated, newDay, false);
            updated.recentIrrigationDays = []; // rain leaches salts
          }
          const season = getSeason(newDay);
          const isDrought = todayWeather?.event === 'drought';
          if (checkSalinization(updated, newDay, season, isDrought)) {
            updated = applySalinization(updated);
          }

          // 6. Tillage OM drift
          const hasCropOrResidue = updated.plantedCrop !== null || updated.residueCoverage;
          if (hasCropOrResidue) {
            const omDelta = TILLAGE_OM_DELTA[updated.tillageSystem ?? 'conventional'];
            updated.soil = {
              ...updated.soil,
              organicMatter: Math.max(0, Math.min(10, updated.soil.organicMatter + omDelta)),
            };
          }

          // 7. Residue coverage protects from bare-day erosion
          if (updated.residueCoverage) {
            updated.bareDayCtr = 0;
          }
          // Reduced tillage: bareDayCtr accumulates at 50% speed
          if ((updated.tillageSystem ?? 'conventional') === 'reduced' && !updated.residueCoverage && updated.plantedCrop === null) {
            updated.bareDayCtr = Math.max(0, (updated.bareDayCtr ?? 0) - 1); // compensate for the +1 in updateBareDayCtr
            updated.bareDayCtr = Math.floor((updated.bareDayCtr ?? 0) * 0.5);
          }

          return updated;
        });

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
              alertSalesEntries.push({ day: newDay, amount: revenue, category: 'crops' as const, cropId: alert.cropId });
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
        let reputation = state.legacyReputation ?? 50;
        if (newDay % 30 === 0) reputation = Math.min(100, reputation + 1);
        // Count runoff fines for reputation penalty
        const runoffFineCount = summary.filter(s => s.id.startsWith('runoff_fine_')).length;
        reputation = Math.max(0, Math.min(100, reputation - newFailures.length * 10 - newDefaults.length * 8 - runoffFineCount * 3));

        const declinedTemplates = newDay % 180 === 0 ? [] : state.declinedTemplates;

        // ── Pest control: feed loss ───────────────────────────────────────────
        const hasPestControl = (state.buildings ?? []).includes('bld_pest_control_station');
        let pestHayLoss = 0;
        if (!hasPestControl) {
          const currentHay = animalInventory['hay'] ?? 0;
          pestHayLoss = Math.floor(currentHay * 0.015);
        }

        // ── Feed deduction (ration-based) ────────────────────────────────────
        {
          const { ANIMAL_TYPES: AT_FEED } = require('../data/animalTypes');
          const { analyzeRation: analyzeRationFeed, generateDefaultRation: genDefaultRationFeed, getRationSickChanceModifier: getRationSickModFeed, FEED_NUTRITION: FEED_NUTRITION_FEED } = require('../engine/nutrition');
          const hasAnimalWorker = (state.workers ?? []).some(
            (w: Worker) => w.role === 'livestock_hand' || w.role === 'veterinarian'
          );
          const hasFeedMill = (state.buildings ?? []).some((bid: string) =>
            bid === 'bld_feed_mill_s' || bid === 'bld_feed_mill_m' || bid === 'bld_feed_mill_l'
          );
          const feedMillMult = hasFeedMill ? 0.65 : 1.0;
          const shouldFeed = hasAnimalWorker || state.animalsManuallyFed;

          if (shouldFeed) {
            const animalsByType: Record<string, OwnedAnimal[]> = {};
            for (const a of animals) {
              if (!animalsByType[a.typeId]) animalsByType[a.typeId] = [];
              animalsByType[a.typeId].push(a);
            }
            let anyDeficient = false;
            let deficiencyMsg = '';

            for (const typeId of Object.keys(animalsByType)) {
              const animalType = AT_FEED.find((t: any) => t.id === typeId);
              if (!animalType || !animalType.feedKgPerDay) continue;
              const count = animalsByType[typeId].length;
              const ration = state.savedRations[typeId] ?? genDefaultRationFeed(animalType);
              const totalKg = animalType.feedKgPerDay * count * feedMillMult;

              // Deduct ingredients
              let shortage = false;
              for (const ing of ration.ingredients) {
                if (ing.pct <= 0) continue;
                const needed = totalKg * (ing.pct / 100);
                if (ing.ingredientId === 'hay') {
                  const hayAvail = Math.max(0, (animalInventory['hay'] ?? 0) - pestHayLoss);
                  if (hayAvail >= needed) {
                    animalInventory = { ...animalInventory, hay: Math.round((hayAvail - needed) * 10) / 10 };
                  } else {
                    const shortfall = needed - hayAvail;
                    animalInventory = { ...animalInventory, hay: 0 };
                    const silageForFeed = Math.min(newSilageLevel, shortfall);
                    newSilageLevel = Math.max(0, newSilageLevel - silageForFeed);
                    if (hayAvail + silageForFeed < needed) shortage = true;
                  }
                } else if (ing.ingredientId === 'silage') {
                  if (newSilageLevel >= needed) {
                    newSilageLevel = Math.max(0, newSilageLevel - needed);
                  } else {
                    shortage = true;
                  }
                } else if (ing.ingredientId === 'protein_meal' || ing.ingredientId === 'mineral_premix') {
                  const avail = animalInventory[ing.ingredientId] ?? 0;
                  if (avail >= needed) {
                    animalInventory = { ...animalInventory, [ing.ingredientId]: avail - needed };
                  } else {
                    shortage = true;
                  }
                } else {
                  const avail = harvestInventory[ing.ingredientId] ?? 0;
                  if (avail >= needed) {
                    harvestInventory = { ...harvestInventory, [ing.ingredientId]: avail - needed };
                  } else {
                    harvestInventory = { ...harvestInventory, [ing.ingredientId]: 0 };
                    shortage = true;
                  }
                }
              }
              if (ration.mineralPremixKgPerAnimalPerDay > 0) {
                const neededMineral = ration.mineralPremixKgPerAnimalPerDay * count;
                const avail = animalInventory['mineral_premix'] ?? 0;
                if (avail >= neededMineral) {
                  animalInventory = { ...animalInventory, mineral_premix: avail - neededMineral };
                } else {
                  shortage = true;
                }
              }

              // Pasture auto-detect
              const hasOwnedParcels = state.parcels.some((p: LandParcel) => p.owned && !p.plantedCrop);
              const hasIrrigation = state.parcels.some((p: LandParcel) => p.owned && p.irrigated && !p.plantedCrop);
              let pastureKg = 0;
              if (animalType.enclosureType === 'corral' || animalType.enclosureType === 'caballeriza') {
                pastureKg = hasOwnedParcels ? (hasIrrigation ? 2.0 : 1.0) : 0;
              }
              const seasonPastureMult = season === 'winter' ? 0.15 : season === 'summer' ? 1.2 : 1.0;
              pastureKg *= seasonPastureMult;

              const analysis = analyzeRationFeed(ration, animalType, { ...harvestInventory, ...animalInventory, silage: newSilageLevel }, pastureKg);
              const tier = shortage ? 'deficient' : analysis.tier;
              const sickMod = getRationSickModFeed(tier);

              // Apply sick chance modifier
              animals = animals.map((a: OwnedAnimal) => {
                if (a.typeId !== typeId || a.sick) return a;
                const baseChance = animalType.sicknessChance ?? 0.002;
                if (Math.random() < baseChance * sickMod) return { ...a, sick: true, sicknessDay: newDay };
                return a;
              });

              if (tier === 'deficient' && !anyDeficient) {
                anyDeficient = true;
                deficiencyMsg = `${animalType.name}s are malnourished — ${analysis.issues[0] ?? 'insufficient feed'}. Production reduced 35%.`;
              }
            }

            if (anyDeficient && newDay % 7 === 0) {
              summary.push({
                id: `feed_deficient_${newDay}`,
                icon: '⚠️',
                title: deficiencyMsg,
                detail: 'Check the Nutrition tab to design a better ration.',
                severity: 'warning',
              });
            }
            newGrainMissed = 0;
            newHayMissed = 0;
          } else {
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
            animals = animals.map((a: OwnedAnimal) => {
              if (a.sick) return a;
              const animalType = AT_FEED.find((t: any) => t.id === a.typeId);
              const baseChance = animalType?.sicknessChance ?? 0.002;
              if (Math.random() < baseChance * 2.5) return { ...a, sick: true, sicknessDay: newDay };
              return a;
            });
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

        // ── Solid manure accumulation ───────────────────────────────────────────
        const { SOLID_MANURE_KG_PER_DAY } = require('../engine/composting');
        let newSolidManureKg = state.solidManureKg ?? 0;
        const hasManureStore = (state.buildings ?? []).some((bid: string) => bid.startsWith('bld_manure_store'));
        const newSolidManureCapacity = (state.buildings ?? []).reduce((cap: number, bid: string) => {
          if (bid === 'bld_manure_store_s') return cap + 2000;
          if (bid === 'bld_manure_store_m') return cap + 8000;
          if (bid === 'bld_manure_store_l') return cap + 25000;
          return cap;
        }, 0);
        const dailySolidManure = animals.reduce((total: number, a: OwnedAnimal) => {
          return total + (SOLID_MANURE_KG_PER_DAY[a.typeId] ?? 0);
        }, 0);
        const solidManureProducers = animals.filter((a: OwnedAnimal) => SOLID_MANURE_KG_PER_DAY[a.typeId] ?? 0 > 0).length;
        if (dailySolidManure > 0) {
          if (hasManureStore) {
            newSolidManureKg = Math.min(newSolidManureCapacity, newSolidManureKg + dailySolidManure);
            if (newSolidManureKg >= newSolidManureCapacity && newSolidManureCapacity > 0 && solidManureProducers > 20) {
              const fine = Math.round(300 + Math.random() * 500);
              summary.push({
                id: `manure_overflow_${newDay}`,
                icon: '⚠️',
                title: 'Manure store full · overflow fine',
                detail: `$${fine} fine. Build a larger Manure Store or start composting.`,
                severity: 'warning',
              });
            }
          } else if (solidManureProducers > 20 && Math.random() < 0.03) {
            summary.push({
              id: `manure_fine_${newDay}`,
              icon: '⚠️',
              title: 'Environmental fine · no manure storage',
              detail: '$400 fine. Build a Manure Store to avoid these.',
              severity: 'warning',
            });
          }
        }

        // ── Digestate from biogas plant ────────────────────────────────────────
        let newDigestateKg = state.digestateKg ?? 0;
        const hasBiogasPlant = (state.buildings ?? []).includes('bld_biogas_upgrader');
        if (hasBiogasPlant) {
          newDigestateKg += dailySlurryProduced * 0.85;
        }

        // ── Compost batch processing ───────────────────────────────────────────
        let newCompostBatches = state.compostBatches.map((batch: import('../engine/composting').CompostBatch) => {
          if (batch.status !== 'active') return batch;
          let moistureLevel = batch.moistureLevel;
          let moistureEvents = batch.moistureEvents;
          // Natural moisture drift
          const isCovered = (state.buildings ?? []).some((bid: string) => bid === 'bld_compost_bay_covered');
          const drift = isCovered ? (Math.random() - 0.5) * 10 : (Math.random() - 0.5) * 20;
          moistureLevel = Math.max(0, Math.min(100, moistureLevel + drift));
          // Rain raises moisture for open bays
          if (!isCovered && (todayWeather?.event === 'rain' || todayWeather?.event === 'heavy_rain')) {
            moistureLevel = Math.min(100, moistureLevel + 5);
          }
          if (moistureLevel < 35 || moistureLevel > 75) {
            moistureEvents += 1;
          }
          // Check maturation
          const { computeMaturationDay } = require('../engine/composting');
          const matDay = computeMaturationDay(batch.startDay, batch.turnings, moistureEvents);
          const status = newDay >= matDay ? 'ready' as const : 'active' as const;
          return { ...batch, moistureLevel, moistureEvents, maturationDay: matDay, status };
        });
        // Ready batch notifications
        const newlyReady = newCompostBatches.filter((b: import('../engine/composting').CompostBatch) => b.status === 'ready' && state.compostBatches.find((ob: any) => ob.id === b.id)?.status === 'active');
        for (const rb of newlyReady) {
          const { computeCompostQuality, getCompostGrade } = require('../engine/composting');
          const quality = computeCompostQuality(rb);
          const grade = getCompostGrade(quality);
          summary.push({
            id: `compost_ready_${rb.id}`,
            icon: '🍂',
            title: `Compost batch ready — ${grade.grade} quality`,
            detail: `${Math.round((rb.manureKg + rb.residueKg) * 0.40)} kg of compost available to collect.`,
            severity: 'good',
          });
        }

        // ── Precision Agriculture: resolve pending analyses ─────────────────────
        let newPendingAnalyses = [...state.pendingAnalyses];
        let precisionParcels = finalParcels;
        const resolvedAnalyses = newPendingAnalyses.filter((pa: any) => pa.arrivesDay <= newDay);
        newPendingAnalyses = newPendingAnalyses.filter((pa: any) => pa.arrivesDay > newDay);
        if (resolvedAnalyses.length > 0) {
          const { generateSoilAnalysis } = require('../engine/precision');
          for (const pa of resolvedAnalyses) {
            const parcel = precisionParcels.find((p: LandParcel) => p.id === pa.parcelId);
            if (parcel) {
              const analysis = generateSoilAnalysis(parcel);
              analysis.analyzedDay = newDay;
              precisionParcels = precisionParcels.map((p: LandParcel) =>
                p.id === pa.parcelId ? { ...p, soilAnalysis: analysis } : p
              );
              summary.push({
                id: `soil_analysis_${pa.parcelId}_${newDay}`,
                icon: '🧪',
                title: `Soil report ready for ${parcel.name}`,
                detail: `Score: ${analysis.score}/100 — ${analysis.recommendation}`,
                severity: analysis.score >= 80 ? 'good' : analysis.score >= 50 ? 'warning' : 'danger',
              });
            }
          }
        }
        finalParcels = precisionParcels;

        // ── Compost NPK slow release ───────────────────────────────────────────
        let compostNPKParcels = finalParcels;
        for (const p of compostNPKParcels) {
          if (p.compostNPKReleaseRemaining && p.compostNPKReleaseRemaining.daysLeft > 0) {
            const release = p.compostNPKReleaseRemaining;
            const dayReleaseN = release.nitrogen / release.daysLeft;
            const dayReleaseP = release.phosphorus / release.daysLeft;
            const dayReleaseK = release.potassium / release.daysLeft;
            const newSoil = {
              ...p.soil,
              nitrogen: Math.min(100, p.soil.nitrogen + dayReleaseN),
              phosphorus: Math.min(100, p.soil.phosphorus + dayReleaseP),
              potassium: Math.min(100, p.soil.potassium + dayReleaseK),
            };
            compostNPKParcels = compostNPKParcels.map((lp: LandParcel) =>
              lp.id === p.id
                ? {
                    ...lp,
                    soil: newSoil,
                    compostNPKReleaseRemaining: {
                      ...release,
                      daysLeft: release.daysLeft - 1,
                    },
                  }
                : lp
            );
          }
        }
        finalParcels = compostNPKParcels;

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
        const hasIrrigationSystem = (state.buildings ?? []).some((b: string) =>
          b === 'bld_irrigation_drip' || b === 'bld_irrigation_sprinkler'
        );
        const irrigationCostMult = hasIrrigationSystem ? irrigationElectricityCost('night') : 1.0;
        const gridWaterCost = (state.gridWaterActive ?? false)
          ? Math.round(irrigatedHa * (state.gridWaterDailyRate ?? 1.20) * irrigationCostMult)
          : 0;
        if (gridWaterCost > 0) moneyAfterDrilling -= gridWaterCost;

        const autoSellSalesEntries = autoSellLog.map(s => ({ day: newDay, amount: Math.round(s.revenue), category: 'crops' as const, cropId: s.cropId }));
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
        let newReputation = state.legacyReputation ?? 0;
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
          timeline: newTimeline,
          dynasty: newDynasty,
          ...(phase3Patch.family               !== undefined ? { family:                    phase3Patch.family }               : {}),
          ...(phase3Patch.reputation           !== undefined ? { reputation:                phase3Patch.reputation }           : {}),
          ...(phase3Patch.neighbors            !== undefined ? { neighbors:                 phase3Patch.neighbors }            : {}),
          ...(phase3Patch.pendingLandOpportunities !== undefined ? { pendingLandOpportunities: phase3Patch.pendingLandOpportunities } : {}),
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
          dynastyAuctionWins: (state.dynastyAuctionWins ?? 0) + dynastyAuctionWinsDelta,
          nextAnimalAuctionDay,
          animals: [...animals, ...auctionAnimalAdditions],
          machines: [...updatedMachines, ...auctionMachineAdditions],
          daySummary: summary,
          prevDayMoney: state.money,
          prevDayReputationScore: state.reputation?.score,
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
          inventoryBatches: (() => {
            const newInventory = Object.fromEntries(
              Object.keys({ ...harvestInventory, ...auctionInventoryDelta }).map(k => [
                k, Math.max(0, (harvestInventory[k] ?? 0) + (auctionInventoryDelta[k] ?? 0)),
              ])
            );
            const syncedBatches = syncBatchesWithInventory(
              state.inventoryBatches ?? [],
              state.inventory,
              newInventory,
              newDay,
              state.todayWeather,
            );
            const hasColdStorage = state.buildings.includes('bld_cold_storage');
            const { batches: decayedBatches, disposalCost: storageDisposalCost, notifications: storageNotifications } = advanceStorageQuality(syncedBatches, newDay, season, hasColdStorage);
            disposalFee += storageDisposalCost;
            for (const msg of storageNotifications) {
              summary.push({ id: `storage_${msg.slice(0, 20)}_${newDay}`, icon: '⚠️', title: msg, severity: 'warning' });
            }
            return decayedBatches;
          })(),
          inventory: deriveInventory((() => {
            const newInventory = Object.fromEntries(
              Object.keys({ ...harvestInventory, ...auctionInventoryDelta }).map(k => [
                k, Math.max(0, (harvestInventory[k] ?? 0) + (auctionInventoryDelta[k] ?? 0)),
              ])
            );
            const syncedBatches = syncBatchesWithInventory(
              state.inventoryBatches ?? [],
              state.inventory,
              newInventory,
              newDay,
              state.todayWeather,
            );
            const hasColdStorage = state.buildings.includes('bld_cold_storage');
            const { batches: decayedBatches } = advanceStorageQuality(syncedBatches, newDay, season, hasColdStorage);
            return decayedBatches;
          })()),
          hedgerows: updatedHedgerows,
          strawBurnedThisYear: newStrawBurnedThisYear,
          aesEnrollments: updatedAESEnrollments,
          subsidyLog: newSubsidyLog,
          activeLeases: updatedLeases,
          availableLeases: updatedAvailableLeases,
          csaSubscribers: updatedCSASubscribers,
          csaSeasonStart: isCSASeasonStart ? newDay : state.csaSeasonStart,
          csaWeeklyLog: updatedCSAWeeklyLog,
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
          cropsGrownThisYear: cropsGrownThisYearForSet,
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
          legacyReputation: newReputation,
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
          solidManureKg: newSolidManureKg,
          cropResidueKg: newCropResidueKg,
          compostInventoryKg: state.compostInventoryKg,
          compostBatches: newCompostBatches,
          digestateKg: newDigestateKg,
          pendingAnalyses: newPendingAnalyses,
          colmenaNegligenceStartDay,
        });

        // ── Choice events: fire one periodically ─────────────────────────────
        const afterState = get();
        if (!afterState.pendingChoiceEvent && newDay >= 14 && Math.random() < 0.055) {
          const fired = afterState.firedChoiceEventIds ?? [];
          const eligible = CHOICE_EVENT_TEMPLATES.filter(e =>
            (!e.minDay || newDay >= e.minDay) &&
            (!e.maxDay || newDay <= e.maxDay) &&
            !fired.includes(e.id)
          );
          const pool = eligible.length > 0 ? eligible : CHOICE_EVENT_TEMPLATES.filter(e =>
            (!e.minDay || newDay >= e.minDay) && (!e.maxDay || newDay <= e.maxDay)
          );
          if (pool.length > 0) {
            const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
            let r = Math.random() * totalWeight;
            const chosen = pool.find(e => { r -= e.weight; return r <= 0; }) ?? pool[pool.length - 1];
            set({ pendingChoiceEvent: chosen });
          }
        }

        const newDayAfterSet = get().day;
        if (newDayAfterSet >= 5 && !get().dayOneChecklist.advanced5) {
          get().markDayOneStep('advanced5');
        }
        if (tillCompletedThisDay && !get().dayOneChecklist.tilled) {
          get().markDayOneStep('tilled');
        }
        const afterPlanningState = get();
        const planningTick = advanceAnnualPlanningForDay(
          buildAnnualPlanningInput(afterPlanningState),
          afterPlanningState.annualPlanning,
        );
        const annualPlanningPatch = planningTick.next && !('goals' in planningTick.next)
          ? planningTick.next
          : afterPlanningState.annualPlanning;
        const annualReward = planningTick.reward;
        const hasAnnualReward = annualReward.legacyReputation > 0 || annualReward.workerMorale > 0;
        if (annualPlanningPatch !== afterPlanningState.annualPlanning || hasAnnualReward) {
          set({
            annualPlanning: annualPlanningPatch,
            legacyReputation: hasAnnualReward
              ? Math.min(100, (afterPlanningState.legacyReputation ?? 0) + annualReward.legacyReputation)
              : afterPlanningState.legacyReputation,
            workers: hasAnnualReward && annualReward.workerMorale > 0
              ? (afterPlanningState.workers ?? []).map(worker => ({
                  ...worker,
                  satisfaction: Math.min(100, (worker.satisfaction ?? 0) + annualReward.workerMorale),
                }))
              : afterPlanningState.workers,
            daySummary: planningTick.review
              ? [
                  ...(afterPlanningState.daySummary ?? []),
                  {
                    id: `annual_plan_review_${planningTick.review.year}`,
                    icon: '📋',
                    title: `Annual plan review ready: ${planningTick.review.completedGoals.length} goals completed`,
                    severity: 'info',
                  },
                ]
              : afterPlanningState.daySummary,
          });
        }
}
