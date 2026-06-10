import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
import { makeInitialState } from './initialState';
import { gamePersistConfig } from './persistConfig';
import { createSettingsActions } from './actions/settingsActions';
import { createBankingActions } from './actions/bankingActions';
import { createWorkerActions } from './actions/workerActions';
import { createMapActions } from './actions/mapActions';
import { createLandActions } from './actions/landActions';
import { createCropActions } from './actions/cropActions';
import { createAnimalActions } from './actions/animalActions';
import { createMachineryActions } from './actions/machineryActions';
import { createProcessingActions } from './actions/processingActions';
import { createAuctionActions } from './actions/auctionActions';
import { createElectricityActions } from './actions/electricityActions';
import { createFamilyActions } from '../features/family/familyActions';
import { advanceGameDay } from '../simulation/advanceDay';
import {
  adjustAnnualPlanGoalTarget,
  approveAnnualPlanDraft,
  generateAnnualPlanDraft,
  recommendAdvisor,
  replaceAnnualPlanGoal as replaceAnnualPlanGoalInDraft,
  updateAnnualPlanProgress,
} from '../engine/annualPlanning';
import { buildAnnualPlanningInput } from './annualPlanningInput';
export { DELIVERY_DURATION, TRUCK_FUEL_LITRES } from './actions/machineryActions';

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

export type { LandParcel } from '../types/domain/land';
export type { ShowEntry, ShowResult } from '../types/domain/animals';
export type { SeedGenes, SeedEntry, HybridJob } from '../types/domain/crops';
export type {
  OwnedMachine,
  OwnedAttachment,
  OwnedTrailer,
  DeliveryCargo,
  ReturnOrder,
  DeliveryJob,
  TractorJob,
  HarvestJob,
  MachineRepair,
} from '../types/domain/machinery';
export type { AuctionPickup, AuctionBid, AuctionLot, AuctionCategory, AuctionListing } from '../types/domain/auctions';
export type { FuturesPosition, MarketOrder, SeasonGoal, InsurancePolicy, InsuranceClaim, RivalNewsItem, PriceAlert } from '../types/domain/economy';
export type { ProductionBuildingState, HenilBatch, IncubationBatch } from '../types/domain/processing';
export type { ElectricityState } from '../types/domain/electricity';
export type { GameEvent, FairEvent, FieldEvent, DaySummaryEvent } from '../types/domain/uiEvents';
export type { GameState } from '../types/domain/gameState';
export type OwnedWorker = Worker;
export type { Worker };
export type NPCFarm = NPCFarmRuntime;
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
      ...createSettingsActions(set, get),
      ...createBankingActions(set, get),
      ...createWorkerActions(set, get),
      ...createMapActions(set, get),
      ...createLandActions(set, get),
      ...createCropActions(set, get),
      ...createAnimalActions(set, get),
      ...createMachineryActions(set, get),
      ...createProcessingActions(set, get),
      ...createAuctionActions(set, get),
      ...createElectricityActions(set, get),
      ...createFamilyActions(set, get),

      advanceDay: () => advanceGameDay(set, get),
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

      generateAnnualPlan: (advisor) => {
        const state = get();
        const input = buildAnnualPlanningInput(state);
        const selectedAdvisor = advisor ?? recommendAdvisor(input);
        const draft = generateAnnualPlanDraft(input, selectedAdvisor);
        set({
          annualPlanning: {
            activeYear: input.calendarYear,
            status: 'draft',
            selectedAdvisor,
            draft,
            active: undefined,
            review: undefined,
            dismissedRecommendationIds: [],
          },
        });
      },

      replaceAnnualPlanGoal: (goalId) => {
        const state = get();
        const planning = state.annualPlanning;
        if (!planning?.draft) return;
        const input = buildAnnualPlanningInput(state);
        const draft = replaceAnnualPlanGoalInDraft(input, planning.draft, goalId);
        set({
          annualPlanning: {
            ...planning,
            draft,
          },
        });
      },

      removeAnnualPlanGoal: (goalId) => {
        const planning = get().annualPlanning;
        if (!planning?.draft) return;
        const goal = planning.draft.goals.find(item => item.id === goalId);
        if (!goal || goal.required || planning.draft.goals.length <= 4) return;
        set({
          annualPlanning: {
            ...planning,
            draft: {
              ...planning.draft,
              goals: planning.draft.goals.filter(item => item.id !== goalId),
            },
          },
        });
      },

      adjustAnnualPlanGoal: (goalId, target) => {
        const state = get();
        const planning = state.annualPlanning;
        if (planning?.draft) {
          set({ annualPlanning: { ...planning, draft: adjustAnnualPlanGoalTarget(planning.draft, goalId, target) } });
          return;
        }
        if (planning?.active) {
          const input = buildAnnualPlanningInput(state);
          const active = adjustAnnualPlanGoalTarget(planning.active, goalId, target);
          set({ annualPlanning: { ...planning, active: updateAnnualPlanProgress(input, active) } });
        }
      },

      approveAnnualPlan: () => {
        const state = get();
        const planning = state.annualPlanning;
        if (!planning?.draft) return;
        const input = buildAnnualPlanningInput(state);
        const active = approveAnnualPlanDraft(input, planning.draft);
        set({
          annualPlanning: {
            ...planning,
            activeYear: input.calendarYear,
            status: 'active',
            active,
            draft: undefined,
            review: undefined,
            dismissedRecommendationIds: [],
          },
        });
      },

      dismissAnnualPlanRecommendation: (id) => {
        const planning = get().annualPlanning;
        if (!planning || planning.dismissedRecommendationIds.includes(id)) return;
        set({
          annualPlanning: {
            ...planning,
            dismissedRecommendationIds: [...planning.dismissedRecommendationIds, id],
          },
        });
      },

      completeAnnualPlanReview: () => {
        const state = get();
        const input = buildAnnualPlanningInput(state);
        set({
          annualPlanning: {
            activeYear: input.calendarYear,
            status: 'none',
            selectedAdvisor: recommendAdvisor(input),
            dismissedRecommendationIds: [],
          },
        });
      },

      setTimeline: (tl: TimelineState) => {
        set({ timeline: tl });
      },

      performHandoff: () => {
        const state = get();
        const dynasty = state.dynasty ?? INITIAL_DYNASTY_STATE;
        if (!dynasty.pendingHandoff || !dynasty.pendingHandoffCause) return;

        const calYear = gameDayToCalendarYear(state.day);
        const ownedHectares = state.parcels
          .filter(p => p.owned)
          .reduce((sum, parcel) => sum + parcel.hectares, 0);
        const hasDebt = state.loans.some(loan => !loan.paid && !loan.defaulted);
        const startYear = dynasty.ancestors.length === 0
          ? 1970
          : dynasty.ancestors[dynasty.ancestors.length - 1].endYear;

        const legacyContribution = handoffLegacyContribution(
          dynasty.currentFarmer,
          startYear,
          calYear,
          { ownedHectares, hasDebt }
        );
        const ancestor = buildAncestorRecord(
          dynasty.currentFarmer,
          dynasty.pendingHandoffCause,
          startYear,
          calYear,
          legacyContribution,
          state.timeline.firedEventIds.slice(-10)
        );
        const newFarmer = buildNextFarmer(calYear, dynasty.knowledgeBank, dynasty.currentFarmer);
        const cause = dynasty.pendingHandoffCause;
        const shouldMentor = cause !== 'death' && farmerAge(dynasty.currentFarmer, calYear) < 72;
        const mentorExpiryYears = 3 + Math.floor(Math.random() * 3);

        set({
          dynasty: {
            ...dynasty,
            legacyScore: dynasty.legacyScore + legacyContribution,
            currentFarmer: newFarmer,
            ancestors: [...dynasty.ancestors, ancestor],
            pendingHandoff: false,
            pendingHandoffCause: null,
            mentorFarmer: shouldMentor ? { ...dynasty.currentFarmer, isRetired: true } : null,
            mentorExpiresYear: shouldMentor ? calYear + mentorExpiryYears : null,
          },
        });
      },

      earnKnowledge: (id: string) => {
        const state = get();
        const dynasty = state.dynasty ?? INITIAL_DYNASTY_STATE;
        if (dynasty.knowledgeBank.some(entry => entry.id === id)) return;
        const entry = KNOWLEDGE_CATALOGUE.find(item => item.id === id);
        if (!entry) return;

        set({
          dynasty: {
            ...dynasty,
            currentFarmer: {
              ...dynasty.currentFarmer,
              unlockedKnowledge: [...dynasty.currentFarmer.unlockedKnowledge, id],
            },
            knowledgeBank: [...dynasty.knowledgeBank, entry],
          },
        });
      },

      triggerVoluntaryHandoff: () => {
        set(state => ({
          dynasty: {
            ...(state.dynasty ?? INITIAL_DYNASTY_STATE),
            pendingHandoff: true,
            pendingHandoffCause: 'voluntary_handoff',
          },
        }));
      },





      acceptContract: (templateId) => {
        const state = get();
        const { CONTRACT_TEMPLATES } = require('../engine/contracts');
        const template = CONTRACT_TEMPLATES.find((t: any) => t.id === templateId);
        if (!template) return;
        if (template.minReputation && (state.legacyReputation ?? 50) < template.minReputation) return;
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

          const { remainingBatches } = consumeFromBatches(s.inventoryBatches ?? [], contract.cropId, actual);

          const cropType = CROP_TYPES.find((ct) => ct.id === contract.cropId);
          const basePrice = cropType?.basePrice ?? 1;

          const { contract: updatedContract, buyer: updatedBuyer, revenue } =
            resolveDelivery(contract, buyer, actual, basePrice, s.day);

          return {
            money: s.money + revenue,
            inventory: { ...s.inventory, [contract.cropId]: Math.max(0, available - actual) },
            inventoryBatches: remainingBatches,
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


      deliverCrop: (contractId, amount) => {
        const state = get();
        const contract = state.contracts.find(c => c.id === contractId);
        if (!contract || contract.completed || contract.failed) return;
        const inStock = state.inventory[contract.cropId] ?? 0;
        const toDeliver = Math.min(amount, inStock, contract.amount - contract.delivered);
        if (toDeliver <= 0) return;
        const { remainingBatches } = consumeFromBatches(state.inventoryBatches ?? [], contract.cropId, toDeliver);
        // Administrative Office building: +5% contract delivery revenue
        const contractBonus = hasOficinaBuilding(state.buildings) ? 1.05 : 1.0;
        const coopBonus = 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        const revenue = toDeliver * contract.pricePerUnit * contractBonus * coopBonus * prestigeBonus;
        const newDelivered = contract.delivered + toDeliver;
        const completed = newDelivered >= contract.amount;
        set({
          inventory: { ...state.inventory, [contract.cropId]: inStock - toDeliver },
          inventoryBatches: remainingBatches,
          money: state.money + revenue,
          salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'contracts' }],
          totalRevenue: state.totalRevenue + revenue,
          contracts: state.contracts.map(c =>
            c.id === contractId ? { ...c, delivered: newDelivered, completed } : c
          ),
          legacyReputation: completed ? Math.min(100, (state.legacyReputation ?? 50) + 5) : (state.legacyReputation ?? 50),
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

      resetGame: () => {
        set(makeInitialState());
      },

      markTutorialSeen: () => {
        set({ tutorialSeen: true });
      },

      markDayOneStep: (step: 'tilled' | 'planted' | 'advanced5' | 'harvested') => {
        set(state => ({
          dayOneChecklist: { ...state.dayOneChecklist, [step]: true },
        }));
      },

      dismissHint: (id) => {
        const state = get();
        if ((state.dismissedHints ?? []).includes(id)) return;
        set({ dismissedHints: [...(state.dismissedHints ?? []), id] });
      },

      clearMilestonePopup: () => {
        set({ milestonePopup: null });
      },


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
          legacyReputation: Math.min(100, (state.legacyReputation ?? 50) + 10),
          yearEndShown: false,
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

        // Organic violation check
        if (isOrganicEnrolled(parcel.organicStatus ?? 'conventional')) {
          set({
            parcels: state.parcels.map(p =>
              p.id === parcelId
                ? { ...p, pestState: undefined, organicStatus: 'decertified' as OrganicStatus, lastDecertifiedDay: state.day, pendingContaminationAppeal: undefined }
                : p
            ),
            productInventory: { ...state.productInventory, [productId]: inStock - 1 },
          });
          return;
        }

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


      toggleCSA: () => {
        const state = get();
        set({ csaActive: !state.csaActive });
      },

      setCSACommitment: (commitment) => {
        set({ csaCommitment: commitment });
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
            legacyReputation: Math.min(100, state.legacyReputation + (award === 'gold' ? 5 : award === 'silver' ? 3 : 1)),
          });
        }
      },



    }),
    gamePersistConfig
  )
);



