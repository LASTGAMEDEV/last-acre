import { CROP_TYPES } from '../../data/cropTypes';
import { PRODUCT_TYPES, ProductType } from '../../data/productTypes';
import { PlantedCrop, SOIL_DEFAULTS, SoilStats } from '../../engine/crops';
import {
  AESEnrollment,
  AES_SCHEMES,
} from '../../engine/subsidies';
import {
  Hedgerow,
  HedgerowType,
  HEDGEROW_COST,
} from '../../engine/hedgerows';
import {
  OrganicStatus,
  canReapplyAfterDecertification,
  isOrganicEnrolled,
  organicApplicationFee,
} from '../../engine/organicCert';
import {
  LeaseAgreement,
  NPC_LANDOWNERS,
  calculateCashRent,
} from '../../engine/leases';
import { CompostBatch, computeCompostQuality, getCompostGrade } from '../../engine/composting';
import { PUMP_SPECS, PumpTier, Well, pipeCost } from '../../engine/water';
import type { LandParcel } from '../../types/domain/land';
import type { MapOwner } from '../../types/worldMap';
import type { ActionFactory } from './types';

type Amendment = 'lime' | 'sulfur' | 'subsoiler';
type TillageSystem = 'conventional' | 'reduced' | 'notill';
type HedgerowEdge = 'north' | 'south' | 'east' | 'west';

export interface LandActions {
  buyParcel: (parcelId: string) => void;
  installIrrigation: (parcelId: string) => void;
  applySoilAmendment: (parcelId: string, amendment: Amendment) => void;
  applySoilNPK: (parcelId: string, productId: string) => void;
  plantCoverCrop: (parcelId: string, coverCropId: string) => void;
  clearWeeds: (parcelId: string) => void;
  linkParcelToColmena: (parcelId: string, colmenaId: string | null) => void;
  orderSoilAnalysis: (parcelId: string) => void;
  applyPrecisionInputs: (parcelId: string) => void;
  applyCompost: (parcelId: string, kg: number) => void;
  fertilizeCrop: (parcelId: string, productId: string) => void;
  applyLime: (parcelId: string, type: 'agricultural' | 'dolomitic') => void;
  applyGypsum: (parcelId: string) => void;
  applyLeachingFlush: (parcelId: string) => void;
  applySubsoiling: (parcelId: string) => void;
  setTillageSystem: (parcelId: string, system: TillageSystem) => void;
  installHedgerow: (parcelId: string, edge: HedgerowEdge, type: HedgerowType) => void;
  enrollAES: (schemeId: string, parcelIds: string[]) => void;
  startOrganicTransition: (parcelId: string) => void;
  fileContaminationAppeal: (parcelId: string) => void;
  signLease: (availableLeaseIndex: number, acceptImprovementClause: boolean) => void;
  cancelLease: (leaseId: string) => void;
  assignHydrogeologist: (parcelId: string) => void;
  startDrilling: (wellId: string, spotId: string, targetFlowRate: number) => void;
  installPump: (wellId: string, pumpTier: PumpTier) => void;
  connectParcel: (wellId: string, parcelId: string) => void;
  disconnectParcel: (wellId: string, parcelId: string) => void;
  setGridWater: (active: boolean) => void;
}

export const createLandActions: ActionFactory<LandActions> = (set, get) => ({
  buyParcel: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || parcel.owned) return;
    const cost = parcel.pricePerHa * parcel.hectares;
    if (state.money < cost) return;
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
        newSoil.nitrogen = Math.min(100, current.nitrogen + 10);
        newSoil.phosphorus = Math.min(100, (current.phosphorus ?? 60) + 12);
        newSoil.potassium = Math.min(100, (current.potassium ?? 60) + 12);
        cropUpdate = {
          appliedN: Math.max(parcel.plantedCrop?.appliedN ?? 1.0, 1.08),
          appliedP: Math.max(parcel.plantedCrop?.appliedP ?? 1.0, 1.10),
          appliedK: Math.max(parcel.plantedCrop?.appliedK ?? 1.0, 1.10),
        };
      } else if (productId === 'drainage_tile') {
        newSoil.drainage = Math.min(100, (current.drainage ?? 65) + 15);
      }
      if (newSoil.pH < 6.0 && productId !== 'drainage_tile') {
        newSoil.pH = Math.max(4.0, newSoil.pH - 0.15);
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

  clearWeeds: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.hasWeeds) return;
    const herbicideId = Object.keys(state.productInventory).find(id => {
      const p = PRODUCT_TYPES.find((pt) => pt.id === id);
      return p?.category === 'herbicide' && (state.productInventory[id] ?? 0) > 0;
    });
    if (!herbicideId) return;
    if (isOrganicEnrolled(parcel.organicStatus ?? 'conventional')) {
      set({
        parcels: state.parcels.map(p =>
          p.id === parcelId
            ? { ...p, hasWeeds: false, organicStatus: 'decertified' as OrganicStatus, lastDecertifiedDay: state.day, pendingContaminationAppeal: undefined }
            : p
        ),
        productInventory: { ...state.productInventory, [herbicideId]: state.productInventory[herbicideId] - 1 },
      });
      return;
    }
    const updatedParcel: LandParcel = { ...parcel, hasWeeds: false };
    if (parcel.linkedColmenaId) {
      updatedParcel.pesticideSprayedDay = state.day;
    }
    set({
      parcels: state.parcels.map(p => p.id === parcelId ? updatedParcel : p),
      productInventory: { ...state.productInventory, [herbicideId]: state.productInventory[herbicideId] - 1 },
    });
  },

  linkParcelToColmena: (parcelId, colmenaId) => {
    const state = get();
    const negligence = { ...state.colmenaNegligenceStartDay };
    if (colmenaId) {
      delete negligence[colmenaId];
    }
    const prev = state.parcels.find(p => p.id === parcelId)?.linkedColmenaId;
    if (prev && prev !== colmenaId) {
      const remaining = state.parcels.filter(p => p.id !== parcelId && p.linkedColmenaId === prev).length;
      if (remaining === 0) {
        negligence[prev] = state.day;
      }
    }
    set({
      parcels: state.parcels.map(p => p.id === parcelId ? { ...p, linkedColmenaId: colmenaId ?? undefined } : p),
      colmenaNegligenceStartDay: negligence,
    });
  },

  orderSoilAnalysis: (parcelId) => {
    const state = get();
    if (state.legacyReputation < 65) return;
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    const delay = state.soilLabBuilt ? 1 : 3;
    const cost = state.soilLabBuilt ? 150 : Math.min(800, Math.round(200 + parcel.hectares * 60));
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      pendingAnalyses: [...state.pendingAnalyses, { parcelId, arrivesDay: state.day + delay }],
    });
  },

  applyPrecisionInputs: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned || !parcel.soilAnalysis) return;
    const analysis = parcel.soilAnalysis;
    const nProd = PRODUCT_TYPES.find((p) => p.id === 'fertilizer_n');
    const pProd = PRODUCT_TYPES.find((p) => p.id === 'fertilizer_p');
    const kProd = PRODUCT_TYPES.find((p) => p.id === 'fertilizer_k');
    const limeProd = PRODUCT_TYPES.find((p) => p.id === 'lime');
    const needs: Record<string, { product: ProductType; deficit: number; kgPerHa: number }> = {};
    if (analysis.deficitN > 2 && nProd) needs.n = { product: nProd, deficit: analysis.deficitN, kgPerHa: analysis.deficitN };
    if (analysis.deficitP > 2 && pProd) needs.p = { product: pProd, deficit: analysis.deficitP, kgPerHa: analysis.deficitP };
    if (analysis.deficitK > 2 && kProd) needs.k = { product: kProd, deficit: analysis.deficitK, kgPerHa: analysis.deficitK };
    if (analysis.deficitPh > 0.2 && limeProd) needs.lime = { product: limeProd, deficit: analysis.deficitPh, kgPerHa: 100 };
    const newProductInventory = { ...state.productInventory };
    const newSoil = { ...parcel.soil };
    let canApply = true;
    for (const key of Object.keys(needs)) {
      const need = needs[key];
      const reqUnits = Math.ceil(need.kgPerHa * parcel.hectares / 50);
      const inStock = newProductInventory[need.product.id] ?? 0;
      if (inStock < reqUnits) { canApply = false; break; }
      newProductInventory[need.product.id] = inStock - reqUnits;
      if (key === 'n') newSoil.nitrogen = Math.min(100, newSoil.nitrogen + need.deficit);
      if (key === 'p') newSoil.phosphorus = Math.min(100, newSoil.phosphorus + need.deficit);
      if (key === 'k') newSoil.potassium = Math.min(100, newSoil.potassium + need.deficit);
      if (key === 'lime') newSoil.pH = Math.min(8.5, newSoil.pH + 0.4);
    }
    if (!canApply) return;
    set({
      parcels: state.parcels.map(p => p.id === parcelId ? { ...p, soil: newSoil, precisionApplied: true, soilAnalysis: { ...analysis, analyzedDay: state.day } } : p),
      productInventory: newProductInventory,
    });
  },

  applyCompost: (parcelId, kg) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned || kg <= 0 || kg > state.compostInventoryKg) return;
    const readyBatch = state.compostBatches.find((b) => b.status === 'ready') as CompostBatch | undefined;
    if (!readyBatch) return;
    const quality = computeCompostQuality(readyBatch);
    const grade = getCompostGrade(quality);
    const nAdd = (grade.nPer1000kg * kg) / 1000;
    const pAdd = (grade.pPer1000kg * kg) / 1000;
    const kAdd = (grade.kPer1000kg * kg) / 1000;
    const oldSoil = parcel.soil ?? { nitrogen: 50, phosphorus: 30, potassium: 30, pH: 6.0, organicMatter: 2, compaction: 0, microbialLife: 50, drainage: 50 };
    set({
      compostInventoryKg: Math.max(0, state.compostInventoryKg - kg),
      parcels: state.parcels.map(p =>
        p.id === parcelId
          ? {
              ...p,
              soil: {
                ...oldSoil,
                nitrogen: Math.min(100, oldSoil.nitrogen + nAdd * 0.5),
                phosphorus: Math.min(100, oldSoil.phosphorus + pAdd * 0.5),
                potassium: Math.min(100, oldSoil.potassium + kAdd * 0.5),
                organicMatter: Math.min(10, oldSoil.organicMatter + grade.organicMatter),
              },
              compostNPKReleaseRemaining: {
                nitrogen: nAdd * 0.5,
                phosphorus: pAdd * 0.5,
                potassium: kAdd * 0.5,
                daysLeft: 30,
              },
            }
          : p
      ),
    });
  },

  fertilizeCrop: (parcelId, productId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.plantedCrop) return;
    const product = PRODUCT_TYPES.find((p) => p.id === productId);
    if (!product || product.category !== 'fertilizer_solid' && product.category !== 'fertilizer_liquid') return;
    const inStock = state.productInventory[productId] ?? 0;
    if (inStock <= 0) return;
    if (isOrganicEnrolled(parcel.organicStatus ?? 'conventional')) {
      set({
        parcels: state.parcels.map(p =>
          p.id === parcelId
            ? { ...p, organicStatus: 'decertified' as OrganicStatus, lastDecertifiedDay: state.day, pendingContaminationAppeal: undefined }
            : p
        ),
        productInventory: { ...state.productInventory, [productId]: inStock - 1 },
      });
      return;
    }
    const bonus = product.fertilizerBonus ?? 1.3;
    set({
      parcels: state.parcels.map(p => {
        if (p.id !== parcelId) return p;
        const newSoil = { ...p.soil };
        if (newSoil.pH < 6.0) {
          newSoil.pH = Math.max(4.0, newSoil.pH - 0.15);
        }
        return {
          ...p,
          soil: newSoil,
          fertility: Math.min(25, p.fertility + 2),
          plantedCrop: {
            ...p.plantedCrop!,
            appliedN: Math.max(p.plantedCrop!.appliedN ?? 1.0, bonus),
          },
        };
      }),
      productInventory: { ...state.productInventory, [productId]: inStock - 1 },
    });
  },

  applyLime: (parcelId, type) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    const costPerHa = type === 'agricultural' ? 120 : 180;
    const cost = costPerHa * parcel.hectares;
    if (state.money < cost) return;
    const newSoil = { ...parcel.soil };
    newSoil.pH = Math.min(8.5, newSoil.pH + 0.3);
    if (type === 'dolomitic') {
      newSoil.organicMatter = Math.min(10, newSoil.organicMatter + 0.05);
    }
    set({
      money: state.money - cost,
      parcels: state.parcels.map(p => p.id === parcelId ? { ...p, soil: newSoil } : p),
    });
  },

  applyGypsum: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    const cost = 150 * parcel.hectares;
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      parcels: state.parcels.map(p =>
        p.id === parcelId ? { ...p, soilSalinity: Math.max(0, (p.soilSalinity ?? 0) - 50) } : p,
      ),
    });
  },

  applyLeachingFlush: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    const cost = 80 * parcel.hectares;
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      parcels: state.parcels.map(p =>
        p.id === parcelId ? { ...p, soilSalinity: Math.max(0, (p.soilSalinity ?? 0) - 30) } : p,
      ),
    });
  },

  applySubsoiling: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    const cost = 200 * parcel.hectares;
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      parcels: state.parcels.map(p => {
        if (p.id !== parcelId) return p;
        return {
          ...p,
          soil: {
            ...p.soil,
            compaction: Math.max(0, p.soil.compaction - 40),
          },
        };
      }),
    });
  },

  setTillageSystem: (parcelId, system) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    const COST = 500;
    if (state.money < COST) return;
    set({
      money: state.money - COST,
      parcels: state.parcels.map(p =>
        p.id === parcelId
          ? { ...p, tillageSystem: system, tillageSystemSince: state.day, notillSeasons: 0 }
          : p
      ),
    });
  },

  installHedgerow: (parcelId, edge, type) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    const existing = (state.hedgerows ?? []).find(h => h.parcelId === parcelId && h.edge === edge);
    if (existing) return;
    const lengthM = 100;
    const cost = Math.round(HEDGEROW_COST[type] * (lengthM / 100));
    if (state.money < cost) return;
    const newHedgerow: Hedgerow = {
      id: `hdg_${parcelId}_${edge}_${state.day}`,
      type,
      parcelId,
      edge,
      lengthM,
      plantedDay: state.day,
      mature: false,
    };
    set({
      money: state.money - cost,
      hedgerows: [...(state.hedgerows ?? []), newHedgerow],
    });
  },

  enrollAES: (schemeId, parcelIds) => {
    const state = get();
    const scheme = AES_SCHEMES.find(s => s.id === schemeId);
    if (!scheme) return;
    const enrolledHa = state.parcels
      .filter(p => parcelIds.includes(p.id) && p.owned)
      .reduce((s, p) => s + p.hectares, 0);
    if (enrolledHa <= 0) return;
    const newEnrollment: AESEnrollment = {
      id: `aes_${schemeId}_${state.day}`,
      schemeId,
      enrolledDay: state.day,
      enrolledParcels: parcelIds,
      enrolledHa,
      endDay: state.day + 1825,
      totalPaidSoFar: 0,
      status: 'active',
    };
    set({
      aesEnrollments: [...(state.aesEnrollments ?? []), newEnrollment],
    });
  },

  startOrganicTransition: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned) return;
    if (parcel.organicStatus && parcel.organicStatus !== 'conventional') return;
    if (!canReapplyAfterDecertification(parcel.lastDecertifiedDay, state.day)) return;
    const fee = organicApplicationFee(parcel.hectares);
    if (state.money < fee) return;
    set({
      money: state.money - fee,
      parcels: state.parcels.map(p =>
        p.id === parcelId
          ? { ...p, organicStatus: 'transition_1' as OrganicStatus, organicTransitionStartDay: state.day }
          : p
      ),
    });
  },

  fileContaminationAppeal: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel?.pendingContaminationAppeal) return;
    if (parcel.pendingContaminationAppeal.filed) return;
    if (state.day > parcel.pendingContaminationAppeal.appealDeadlineDay) return;
    set({
      parcels: state.parcels.map(p =>
        p.id === parcelId
          ? { ...p, pendingContaminationAppeal: { ...p.pendingContaminationAppeal!, filed: true } }
          : p
      ),
    });
  },

  signLease: (availableLeaseIndex, acceptImprovementClause) => {
    const state = get();
    const offer = state.availableLeases[availableLeaseIndex];
    if (!offer) return;
    const npc = NPC_LANDOWNERS.find(n => n.id === offer.npcId);
    if (!npc) return;
    const hectares = 2 + Math.floor(Math.random() * 4);
    const seasons = offer.leaseType === 'short_term' ? 1 : 4;
    const cashRent = offer.leaseType === 'sharecrop' ? undefined : calculateCashRent(hectares, offer.leaseType === 'short_term');
    const totalUpfront = cashRent ?? 0;
    if (state.money < totalUpfront) return;
    const leaseId = `lease_${offer.parcelId}_${state.day}`;
    const newLease: LeaseAgreement = {
      id: leaseId,
      parcelId: offer.parcelId,
      npcId: offer.npcId,
      npcName: offer.npcName,
      leaseType: offer.leaseType,
      startDay: state.day,
      endDay: state.day + seasons * 90,
      cashRentPerSeason: cashRent,
      landOwnerSharePct: offer.landOwnerSharePct,
      autoRenew: offer.leaseType !== 'short_term',
      improvementClause: acceptImprovementClause && offer.improvementClauseAvailable
        ? { guaranteedCompensationPct: 0.70, additionalRentPct: 0.10 }
        : undefined,
      status: 'active',
    };
    const leasedParcel: LandParcel = {
      id: offer.parcelId,
      name: `${npc.name} ${offer.leaseType === 'sharecrop' ? 'Share' : 'Lease'}`,
      fertility: 15 + Math.floor(Math.random() * 10),
      soil: { ...SOIL_DEFAULTS },
      cropHistory: [],
      hectares,
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
    };
    set({
      money: state.money - totalUpfront,
      activeLeases: [...(state.activeLeases ?? []), newLease],
      availableLeases: (state.availableLeases ?? []).filter((_, i) => i !== availableLeaseIndex),
      parcels: [...state.parcels, leasedParcel],
    });
  },

  cancelLease: (leaseId) => {
    const state = get();
    const lease = (state.activeLeases ?? []).find(l => l.id === leaseId);
    if (!lease || lease.status !== 'active') return;
    const penalty = lease.leaseType === 'cash_rent' && lease.cashRentPerSeason ? lease.cashRentPerSeason : 0;
    set({
      money: state.money - penalty,
      activeLeases: (state.activeLeases ?? []).map(l =>
        l.id === leaseId ? { ...l, status: 'terminated' as const, autoRenew: false } : l
      ),
      parcels: (state.parcels ?? []).map(p =>
        p.id === lease.parcelId ? { ...p, owned: false, plantedCrop: null } : p
      ),
    });
  },

  assignHydrogeologist: (parcelId) => {
    const state = get();
    const hasHydro = (state.workers ?? []).some(w => w.role === 'hydrogeologist');
    if (!hasHydro) return;
    const busySurvey = (state.wells ?? []).some(w => w.status === 'surveying');
    if (busySurvey) return;
    const surveyDays = 5 + Math.floor(Math.random() * 6);
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
    const estCost = (spot.estimatedCostMin + spot.estimatedCostMax) / 2;
    if (state.money < estCost) return;
    const drillingDays = 5 + Math.floor(Math.random() * 3);
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
    if (well.pumpTier) return;
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
    const targetIdx = (state.parcels ?? []).findIndex(p => p.id === parcelId);
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
});
