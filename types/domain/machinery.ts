export interface MachineRepair {
  id: string;
  machineId: string;
  startDay: number | null;
  readyDay: number | null;
  cost: number;
  insurancePaid: number;
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
  hitchedTo: string | null;
}

export interface DeliveryCargo {
  itemId: string;
  quantity: number;
  category: 'crop' | 'animal_product' | 'animal';
}

export interface ReturnOrder {
  itemId: string;
  quantity: number;
  costPerUnit: number;
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

export interface TractorJob {
  id: string;
  tractorId: string;
  attachmentId: string;
  operation: 'till' | 'plant' | 'spray' | 'spread_slurry';
  parcelIds: string[];
  cropId?: string;
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
