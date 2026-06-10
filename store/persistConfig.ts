import { createJSONStorage } from 'zustand/middleware';
import { defaultCommitment } from '../engine/csa';
import { SOIL_DEFAULTS } from '../engine/crops';
import { INITIAL_DYNASTY_STATE } from '../engine/dynasty';
import { INITIAL_FAMILY_STATE } from '../features/family/familyTypes';
import { INITIAL_REPUTATION_STATE } from '../features/reputation/reputationTypes';
import { INITIAL_NEIGHBOR_STATE } from '../features/neighbors/neighborEngine';
import { createInitialAnnualPlanningState } from '../engine/annualPlanning';
import type { GameState } from '../types/domain/gameState';

export const SAVE_STORAGE_KEY = 'granja-tycoon-save-v14';
export const SAVE_VERSION = 10;

export function migrateGameState(persistedState: unknown): unknown {
  const s = persistedState as Record<string, unknown>;
  if (!s) return persistedState;
  // v12 → v13: add Phase 3 state slices; rename reputation number → legacyReputation
  if (s.legacyReputation === undefined && typeof s.reputation === 'number') {
    s.legacyReputation = s.reputation;
  }
  if (!s.family)                   s.family = INITIAL_FAMILY_STATE;
  if (!s.neighbors)                s.neighbors = INITIAL_NEIGHBOR_STATE;
  if (!s.pendingLandOpportunities) s.pendingLandOpportunities = [];
  if (s.gameSetupComplete === undefined) s.gameSetupComplete = true; // existing saves already set up
  if (!s.annualPlanning) s.annualPlanning = createInitialAnnualPlanningState(typeof s.day === 'number' ? 1970 + Math.floor((s.day - 1) / 365) : 1970);
  // reputation field is now ReputationState — init fresh if it was a number
  if (typeof s.reputation === 'number' || !s.reputation) {
    s.reputation = INITIAL_REPUTATION_STATE;
  }
  return persistedState;
}

export const gameStorage = createJSONStorage(() => {
  try {
    return localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
});

export function partializeGameState(state: GameState) {

        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          advanceDay, buyParcel, plantCrop, harvestCrop, sellCrop,
          buyAnimal, sellAnimal, collectAnimalProduction, sellAnimalProduct, breedAnimal, cullAnimal, treatAnimal,
          buyMachine, requestLoan, repayLoan, depositSavings, withdrawSavings,
          acceptContract, declineContract, deliverCrop, buyProduct, buyBuilding,
          resolveFieldEvent, clearWeeds, fertilizeCrop, applyLime, applyGypsum, applyLeachingFlush, applySubsoiling, listItem, withdrawListing, placeBid, clearDaySummary,
          buyInsurance, cancelInsurance,
          processProduct, sellProcessed,
          buyProcessingBuilding, upgradeProcessingBuilding,
          assignWorkerToProcessingBuilding, unassignWorkerFromProcessingBuilding,
          installColdStorage,
          openTimeDeposit, closeTimeDeposit, resetGame, markTutorialSeen, markDayOneStep, markYearEndShown,
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
          treatPest, buyBeneficialInsects, assignCropConsultant, setTillageSystem, installHedgerow, enrollAES, startOrganicTransition, fileContaminationAppeal, signLease, cancelLease, toggleCSA, setCSACommitment, setWorkerShiftPreference,
          buyFarmShopUpgrade, setShopHours, assignShopWorker, unassignShopWorker,
          toggleOnlineShop, setOnlineAllocation, toggleFarmCafe,
          assignCafeWorker, unassignCafeWorker, enterAgriculturalShow,
          performHandoff, earnKnowledge, triggerVoluntaryHandoff,
          makeLifeEventChoice, setFamilyMemberRole, initiateCoOwnershipAction,
          applyFrictionChoiceAction, resolveBuyoutAction, completeGameSetup,
          generateAnnualPlan, replaceAnnualPlanGoal, removeAnnualPlanGoal, adjustAnnualPlanGoal,
          approveAnnualPlan, dismissAnnualPlanRecommendation, completeAnnualPlanReview,
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

}

export function repairHydratedState(state: GameState | undefined): void {

        if (!state) return;
        const b = state.buildings ?? [];
        state.vetRoomOwned         = b.includes('bld_vet_room');
        state.medicineCabinetOwned = b.includes('bld_medicine_cabinet');
        state.hasCCTV              = b.includes('bld_cctv_monitor');
        state.sickBayCapacity      = (b.includes('bld_isolation_sick_bay_s') ? 5 : 0) +
                                      (b.includes('bld_isolation_sick_bay_m') ? 15 : 0);
        state.sirePenAnimalIds     = state.sirePenAnimalIds ?? [];
        state.dynasty              = state.dynasty ?? INITIAL_DYNASTY_STATE;
        state.dynastyAuctionWins   = state.dynastyAuctionWins ?? 0;
        state.family               = state.family ?? INITIAL_FAMILY_STATE;
        state.neighbors            = state.neighbors ?? INITIAL_NEIGHBOR_STATE;
        state.pendingLandOpportunities = state.pendingLandOpportunities ?? [];
        if (state.gameSetupComplete === undefined) state.gameSetupComplete = true;
        state.annualPlanning = state.annualPlanning ?? createInitialAnnualPlanningState(1970 + Math.floor(((state.day ?? 1) - 1) / 365));
        if (!state.reputation || typeof (state.reputation as unknown) === 'number') {
          state.reputation = INITIAL_REPUTATION_STATE;
        }
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
        state.inventoryBatches = state.inventoryBatches ?? [];
        state.hedgerows = state.hedgerows ?? [];
        state.cropsGrownThisYear = state.cropsGrownThisYear ?? [];
        state.strawBurnedThisYear = state.strawBurnedThisYear ?? false;
        state.aesEnrollments = state.aesEnrollments ?? [];
        state.subsidyLog = state.subsidyLog ?? [];
        state.activeLeases = state.activeLeases ?? [];
        state.availableLeases = state.availableLeases ?? [];
        state.tenantImprovements = state.tenantImprovements ?? [];
        state.csaSubscribers = state.csaSubscribers ?? [];
        state.csaActive = state.csaActive ?? false;
        state.csaCommitment = state.csaCommitment ?? defaultCommitment();
        state.csaWeeklyLog = state.csaWeeklyLog ?? [];
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
          // Soil degradation & tillage defaults
          soilSalinity: p.soilSalinity ?? 0,
          topsoilErosion: p.topsoilErosion ?? 0,
          soilWetUntilDay: p.soilWetUntilDay ?? 0,
          bareDayCtr: p.bareDayCtr ?? 0,
          recentIrrigationDays: p.recentIrrigationDays ?? [],
          tillageSystem: p.tillageSystem ?? 'conventional',
          tillageSystemSince: p.tillageSystemSince ?? 1,
          notillSeasons: p.notillSeasons ?? 0,
          residueCoverage: p.residueCoverage ?? false,
          waterwayAdjacent: p.waterwayAdjacent ?? false,
          organicStatus: p.organicStatus ?? 'conventional',
          organicTransitionStartDay: p.organicTransitionStartDay ?? undefined,
          lastDecertifiedDay: p.lastDecertifiedDay ?? undefined,
        }));

}

export const gamePersistConfig = {
  name: SAVE_STORAGE_KEY,
  version: SAVE_VERSION,
  migrate: migrateGameState,
  storage: gameStorage,
  partialize: partializeGameState,
  onRehydrateStorage: () => repairHydratedState,
};
