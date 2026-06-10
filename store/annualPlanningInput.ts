import { BUILDING_TYPES } from '../data/buildingTypes';
import { CROP_TYPES } from '../data/cropTypes';
import { gameDayToCalendarYear } from '../engine/calendarUtils';
import type { AnnualPlanningInput } from '../engine/annualPlanning';
import type { GameState } from '../types/domain/gameState';

export function buildAnnualPlanningInput(state: GameState): AnnualPlanningInput {
  const ownedParcels = (state.parcels ?? []).filter(parcel => parcel.owned);
  const plantedHectares = ownedParcels.reduce((sum, parcel) => sum + (parcel.plantedCrop ? parcel.hectares : 0), 0);
  const idleHectares = ownedParcels.reduce((sum, parcel) => sum + (!parcel.plantedCrop && !parcel.hasWeeds ? parcel.hectares : 0), 0);
  const soilParcels = ownedParcels.filter(parcel => parcel.soil);
  const averageOrganicMatter = soilParcels.length === 0
    ? 0
    : soilParcels.reduce((sum, parcel) => sum + (parcel.soil?.organicMatter ?? 0), 0) / soilParcels.length;
  const averageCompaction = soilParcels.length === 0
    ? 0
    : soilParcels.reduce((sum, parcel) => sum + (parcel.soil?.compaction ?? 0), 0) / soilParcels.length;
  const inventoryValue = Object.entries(state.inventory ?? {}).reduce((sum, [itemId, qty]) => {
    const crop = CROP_TYPES.find(candidate => candidate.id === itemId);
    const price = state.prices.find(candidate => candidate.cropId === itemId)?.price ?? crop?.basePrice ?? 0;
    return sum + qty * price;
  }, 0);
  const debtOwed = (state.loans ?? [])
    .filter(loan => !loan.paid && !loan.defaulted)
    .reduce((sum, loan) => sum + loan.totalOwed, 0);
  const activeContracts = (state.contracts ?? []).filter(contract => !contract.completed && !contract.failed);
  const urgentContractCount = activeContracts.filter(contract => contract.deadlineDay - state.day <= 7 && contract.deadlineDay >= state.day).length;
  const workerSatisfactionValues = (state.workers ?? []).map(worker => worker.satisfaction ?? 0);
  const processingBuildingCount = (state.buildings ?? []).filter(buildingId => {
    const building = BUILDING_TYPES.find(candidate => candidate.id === buildingId);
    return building?.category === 'processing';
  }).length + (state.processingBuildings ?? []).length;
  const neighbourPressure = Math.min(100, Math.round(
    ((state.pendingLandOpportunities ?? []).length * 20) +
    ((state.npcFarms ?? []).length > 0 ? 15 : 0) +
    ((state.listings ?? []).filter(listing => !listing.resolved && listing.category === 'land').length * 10),
  ));
  const recentRevenue = (state.salesLog ?? [])
    .filter(sale => sale.day >= state.day - 30)
    .reduce((sum, sale) => sum + sale.amount, 0);

  return {
    day: state.day,
    calendarYear: gameDayToCalendarYear(state.day),
    money: state.money,
    savingsBalance: state.savings?.balance ?? 0,
    debtOwed,
    ownedHectares: ownedParcels.reduce((sum, parcel) => sum + parcel.hectares, 0),
    idleHectares,
    plantedHectares,
    averageOrganicMatter,
    averageCompaction,
    inventoryValue,
    storageRiskCount: (state.inventoryBatches ?? []).filter(batch =>
      batch.infested || batch.quality === 'low' || batch.quality === 'damaged' || batch.quality === 'condemned'
    ).length,
    animalCount: (state.animals ?? []).length,
    lowWelfareAnimalCount: Object.values(state.animalWelfareScores ?? {}).filter(score => score < 55).length,
    machineCount: (state.machines ?? []).length,
    activeRepairCount: (state.machineRepairs ?? []).filter(repair => repair.readyDay === null || repair.readyDay >= state.day).length,
    activeContractCount: activeContracts.length,
    urgentContractCount,
    workerCount: (state.workers ?? []).length,
    averageWorkerSatisfaction: workerSatisfactionValues.length === 0
      ? 0
      : workerSatisfactionValues.reduce((sum, value) => sum + value, 0) / workerSatisfactionValues.length,
    buildingCount: (state.buildings ?? []).length,
    processingBuildingCount,
    csaActive: state.csaActive ?? false,
    coopMember: Object.values(state.coopMemberships ?? {}).some(membership => (membership?.shares ?? 0) > 0),
    neighbourPressure,
    recentRevenue,
    completedContracts: (state.contracts ?? []).filter(contract => contract.completed).length,
  };
}
