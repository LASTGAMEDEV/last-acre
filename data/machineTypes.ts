export interface MachineType {
  id: string;
  name: string;
  cost: number;
  size: 'small' | 'medium' | 'large';
  category: 'tractor' | 'harvester' | 'truck' | 'trailer' | 'irrigation';
  maintenancePerDay: number;
  haPerDay?: number;           // harvesters
  capacityKg?: number;         // trucks (0 = needs trailer) and trailers
  compatibleTrailerSizes?: ('small' | 'medium' | 'large')[];  // trucks only
  compatibleTruckTypeIds?: string[];  // trailers: which truck ids can tow this
}

export const MACHINE_TYPES: MachineType[] = [
  // ── Tractors ─────────────────────────────────────────────────────────────
  { id: 'tractor-small',  name: 'Small Tractor',  cost: 18000,  size: 'small',  category: 'tractor',    maintenancePerDay: 4 },
  { id: 'tractor-medium', name: 'Medium Tractor', cost: 48000,  size: 'medium', category: 'tractor',    maintenancePerDay: 9 },
  { id: 'tractor-large',  name: 'Large Tractor',  cost: 120000, size: 'large',  category: 'tractor',    maintenancePerDay: 20 },
  // ── Combine Harvesters ───────────────────────────────────────────────────
  { id: 'combine-small',  name: 'Small Combine',  cost: 85000,  size: 'small',  category: 'harvester',  maintenancePerDay: 15, haPerDay: 4 },
  { id: 'combine-medium', name: 'Medium Combine', cost: 175000, size: 'medium', category: 'harvester',  maintenancePerDay: 28, haPerDay: 10 },
  { id: 'combine-large',  name: 'Large Combine',  cost: 340000, size: 'large',  category: 'harvester',  maintenancePerDay: 50, haPerDay: 22 },
  // ── Irrigation Systems ───────────────────────────────────────────────────
  { id: 'irrigation-drip',      name: 'Drip System',      cost: 8500,  size: 'small',  category: 'irrigation', maintenancePerDay: 2,  haPerDay: 1 },
  { id: 'irrigation-sprinkler', name: 'Sprinkler Array',  cost: 28000, size: 'medium', category: 'irrigation', maintenancePerDay: 5,  haPerDay: 3 },
  { id: 'irrigation-pivot',     name: 'Center Pivot',     cost: 95000, size: 'large',  category: 'irrigation', maintenancePerDay: 12, haPerDay: 8 },
  // ── Trucks ───────────────────────────────────────────────────────────────
  { id: 'truck-pickup', name: 'Pickup',     cost: 28000, size: 'small',  category: 'truck', maintenancePerDay: 5,  capacityKg: 0,      compatibleTrailerSizes: ['small', 'medium'] },
  { id: 'truck-dump',   name: 'Dump Truck', cost: 43000, size: 'medium', category: 'truck', maintenancePerDay: 10, capacityKg: 10000 },
  { id: 'truck-semi',   name: 'Semi Truck', cost: 72000, size: 'large',  category: 'truck', maintenancePerDay: 18, capacityKg: 0,      compatibleTrailerSizes: ['medium', 'large'] },
  // ── Trailers (catalog entry — owned via OwnedTrailer[] not machines[]) ──
  { id: 'trailer-small',    name: 'Small Trailer',    cost: 10000, size: 'small',  category: 'trailer', maintenancePerDay: 1, capacityKg: 2000,  compatibleTruckTypeIds: ['truck-pickup'] },
  { id: 'trailer-standard', name: 'Standard Trailer', cost: 22000, size: 'medium', category: 'trailer', maintenancePerDay: 2, capacityKg: 6000,  compatibleTruckTypeIds: ['truck-pickup', 'truck-semi'] },
  { id: 'trailer-large',    name: 'Large Trailer',    cost: 38000, size: 'large',  category: 'trailer', maintenancePerDay: 3, capacityKg: 22000, compatibleTruckTypeIds: ['truck-semi'] },
];
