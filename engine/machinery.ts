import { MachineType } from '../data/machineTypes';
import { AttachmentType } from '../data/attachmentTypes';

export type ContractorOperation = 'till' | 'plant' | 'spray' | 'harvest' | 'irrigate' | 'transport';

const CONTRACTOR_RATES: Record<ContractorOperation, number> = {
  till:      180,  // per ha
  plant:     130,  // per ha
  spray:     85,   // per ha
  harvest:   280,  // per ha
  irrigate:  300,  // per parcel
  transport: 0.12, // fraction of sale value (handled separately)
};

export interface OwnedMachineRef {
  id: string;
  typeId: string;
}

export interface OwnedAttachmentRef {
  id: string;
  typeId: string;
}

export interface ActiveJobRef {
  tractorId: string;
}

export function calcJobDays(totalHa: number, haPerDay: number): number {
  return Math.ceil(totalHa / haPerDay);
}

/**
 * Returns flat contractor cost for the given operation.
 * For 'transport', pass saleValue as totalHa (it returns 12% of it).
 */
export function getContractorCost(
  operation: ContractorOperation,
  totalHa: number,
): number {
  if (operation === 'transport') {
    return Math.round(totalHa * CONTRACTOR_RATES.transport);
  }
  return Math.round(totalHa * CONTRACTOR_RATES[operation]);
}

export interface CanAssignResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validates whether a tractor+attachment can be assigned a job.
 * Checks: tractor not already busy, attachment compatible with tractor size,
 * parcels in correct state for the operation.
 */
export function canAssignJob(
  tractor: OwnedMachineRef,
  tractorType: MachineType,
  attachment: OwnedAttachmentRef,
  attachmentType: AttachmentType,
  operation: 'till' | 'plant' | 'spray' | 'spread_slurry',
  parcelsTilled: boolean[],
  activeJobs: ActiveJobRef[],
): CanAssignResult {
  const isBusy = activeJobs.some(j => j.tractorId === tractor.id);
  if (isBusy) {
    return { ok: false, reason: 'Tractor is already working on a job' };
  }
  if (!attachmentType.compatibleTractorSizes.includes(tractorType.size)) {
    return { ok: false, reason: `${attachmentType.name} is not compatible with ${tractorType.name}` };
  }
  if (attachmentType.operation !== operation) {
    return { ok: false, reason: `${attachmentType.name} cannot perform ${operation}` };
  }
  if (operation === 'plant') {
    const allTilled = parcelsTilled.every(t => t);
    if (!allTilled) {
      return { ok: false, reason: 'All selected parcels must be tilled before planting' };
    }
  }
  return { ok: true };
}

/**
 * Returns total transport capacity in kg from owned trucks + hitched trailers.
 * Dump truck has standalone capacity. Pickup/Semi contribute 0 without a trailer.
 */
export function getTransportCapacityKg(
  machines: OwnedMachineRef[],
  machineTypes: MachineType[],
  trailers: Array<{ id: string; typeId: string; hitchedTo: string | null }>,
  trailerTypes: MachineType[],
): number {
  let total = 0;
  for (const m of machines) {
    const mt = machineTypes.find(t => t.id === m.typeId);
    if (!mt || mt.category !== 'truck') continue;
    if (mt.capacityKg !== undefined && mt.capacityKg > 0) {
      // Standalone truck (dump truck)
      total += mt.capacityKg;
    } else {
      // Needs trailer — find hitched trailer
      const trailer = trailers.find(tr => tr.hitchedTo === m.id);
      if (trailer) {
        const tt = trailerTypes.find(t => t.id === trailer.typeId);
        total += tt?.capacityKg ?? 0;
      }
    }
  }
  return total;
}
