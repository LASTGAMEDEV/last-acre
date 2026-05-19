export interface MachineType {
  id: string;
  name: string;
  cost: number;
  size: 'small' | 'medium' | 'large';
  category: 'tractor' | 'harvester' | 'truck' | 'trailer' | 'irrigation';
  maintenancePerDay: number;
  fuelPerDay?: number;         // litres consumed per active job-day (tractors & harvesters only)
  haPerDay?: number;           // harvesters
  capacityKg?: number;         // trucks (0 = needs trailer) and trailers
  compatibleTrailerSizes?: ('small' | 'medium' | 'large')[];  // trucks only
  compatibleTruckTypeIds?: string[];  // trailers: which truck ids can tow this
  unlockId?: string;           // historical unlock gate
}

export const MACHINE_TYPES: MachineType[] = [
  // ── Tractors ─────────────────────────────────────────────────────────────
  { id: 'tractor-small',  name: 'Small Tractor',  cost: 45000,  size: 'small',  category: 'tractor',    maintenancePerDay: 12, fuelPerDay: 8 },
  { id: 'tractor-medium', name: 'Medium Tractor', cost: 120000, size: 'medium', category: 'tractor',    maintenancePerDay: 28, fuelPerDay: 18 },
  { id: 'tractor-large',  name: 'Large Tractor',  cost: 280000, size: 'large',  category: 'tractor',    maintenancePerDay: 55, fuelPerDay: 40 },
  { id: 'tractor_4wd_t1', name: '4WD Tractor',    cost: 180000, size: 'medium', category: 'tractor',    maintenancePerDay: 38, fuelPerDay: 24, unlockId: 'tractor_4wd_t1' },
  // ── Combine Harvesters ───────────────────────────────────────────────────
  { id: 'combine-small',  name: 'Small Combine',  cost: 250000, size: 'small',  category: 'harvester',  maintenancePerDay: 45, fuelPerDay: 15, haPerDay: 4 },
  { id: 'combine-medium', name: 'Medium Combine', cost: 420000, size: 'medium', category: 'harvester',  maintenancePerDay: 75, fuelPerDay: 30, haPerDay: 10 },
  { id: 'combine-large',  name: 'Large Combine',  cost: 750000, size: 'large',  category: 'harvester',  maintenancePerDay: 130, fuelPerDay: 60, haPerDay: 22 },
  // ── Irrigation Systems ───────────────────────────────────────────────────
  { id: 'irrigation-drip',      name: 'Drip System',      cost: 8000,  size: 'small',  category: 'irrigation', maintenancePerDay: 2,  haPerDay: 1 },
  { id: 'irrigation-sprinkler', name: 'Sprinkler Array',  cost: 30000, size: 'medium', category: 'irrigation', maintenancePerDay: 6,  haPerDay: 3 },
  { id: 'irrigation-pivot',     name: 'Center Pivot',     cost: 180000, size: 'large',  category: 'irrigation', maintenancePerDay: 25, haPerDay: 8 },
  // ── Trucks ───────────────────────────────────────────────────────────────
  { id: 'truck-pickup', name: 'Pickup',     cost: 42000, size: 'small',  category: 'truck', maintenancePerDay: 12, capacityKg: 0,      compatibleTrailerSizes: ['small', 'medium'] },
  { id: 'truck-dump',   name: 'Dump Truck', cost: 85000, size: 'medium', category: 'truck', maintenancePerDay: 22, capacityKg: 10000 },
  { id: 'truck-semi',   name: 'Semi Truck', cost: 150000, size: 'large',  category: 'truck', maintenancePerDay: 35, capacityKg: 0,      compatibleTrailerSizes: ['medium', 'large'] },
  // ── Trailers (catalog entry — owned via OwnedTrailer[] not machines[]) ──
  { id: 'trailer-small',    name: 'Small Trailer',    cost: 10000, size: 'small',  category: 'trailer', maintenancePerDay: 1, capacityKg: 2000,  compatibleTruckTypeIds: ['truck-pickup'] },
  { id: 'trailer-standard', name: 'Standard Trailer', cost: 22000, size: 'medium', category: 'trailer', maintenancePerDay: 2, capacityKg: 6000,  compatibleTruckTypeIds: ['truck-pickup', 'truck-semi'] },
  { id: 'trailer-large',    name: 'Large Trailer',    cost: 38000, size: 'large',  category: 'trailer', maintenancePerDay: 3, capacityKg: 22000, compatibleTruckTypeIds: ['truck-semi'] },
  // ── Specialized trailers ──────────────────────────────────────────────────
  {
    id: 'trailer-refrigerated-s',
    name: 'Refrigerated Trailer (S)',
    cost: 28000,
    size: 'small',
    category: 'trailer',
    maintenancePerDay: 3,
    capacityKg: 3000,
    compatibleTruckTypeIds: ['truck-pickup'],
  },
  {
    id: 'trailer-refrigerated-l',
    name: 'Refrigerated Trailer (L)',
    cost: 48000,
    size: 'large',
    category: 'trailer',
    maintenancePerDay: 5,
    capacityKg: 10000,
    compatibleTruckTypeIds: ['truck-semi'],
  },
  {
    id: 'trailer-livestock-s',
    name: 'Livestock Trailer (S)',
    cost: 22000,
    size: 'small',
    category: 'trailer',
    maintenancePerDay: 2,
    capacityKg: 20,  // head count; UI displays as "head" not kg
    compatibleTruckTypeIds: ['truck-pickup'],
  },
  {
    id: 'trailer-livestock-l',
    name: 'Livestock Trailer (L)',
    cost: 38000,
    size: 'large',
    category: 'trailer',
    maintenancePerDay: 4,
    capacityKg: 60,  // head count; UI displays as "head" not kg
    compatibleTruckTypeIds: ['truck-semi'],
  },
  {
    id: 'trailer-tank-s',
    name: 'Tank Trailer (S)',
    cost: 32000,
    size: 'small',
    category: 'trailer',
    maintenancePerDay: 3,
    capacityKg: 6000,
    compatibleTruckTypeIds: ['truck-pickup'],
  },
  {
    id: 'trailer-tank-l',
    name: 'Tank Trailer (L)',
    cost: 55000,
    size: 'large',
    category: 'trailer',
    maintenancePerDay: 5,
    capacityKg: 18000,
    compatibleTruckTypeIds: ['truck-semi'],
  },
];
