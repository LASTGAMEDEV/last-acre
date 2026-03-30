export interface MachineRequirements {
  minHa?: number;       // minimum owned hectares
  minTier?: 'C' | 'B'; // must have harvested at least this crop tier
}

export interface MachineType {
  id: string;
  name: string;
  cost: number;
  yieldBonus: number;       // harvest multiplier (e.g. 1.25)
  speedBonus: number;       // growth time reduction (e.g. 0.9 = 10% faster)
  maintenancePerDay: number;
  category: 'field' | 'irrigation' | 'processing' | 'transport';
  requires?: MachineRequirements;
}

export const MACHINE_TYPES: MachineType[] = [
  // Field
  { id: 'tractor_small',  name: 'Small Tractor',   cost: 5000,   yieldBonus: 1.10, speedBonus: 0.95, maintenancePerDay: 2,  category: 'field' },
  { id: 'tractor_med',    name: 'Medium Tractor',  cost: 15000,  yieldBonus: 1.15, speedBonus: 0.92, maintenancePerDay: 5,  category: 'field',      requires: { minHa: 5 } },
  { id: 'tractor_large',  name: 'Large Tractor',   cost: 40000,  yieldBonus: 1.20, speedBonus: 0.88, maintenancePerDay: 10, category: 'field',      requires: { minHa: 10, minTier: 'C' } },
  { id: 'cosechadora',    name: 'Harvester',        cost: 80000,  yieldBonus: 1.25, speedBonus: 0.85, maintenancePerDay: 18, category: 'field',      requires: { minHa: 15, minTier: 'B' } },
  // Irrigation
  { id: 'riego_goteo',    name: 'Drip Irrigation', cost: 8000,   yieldBonus: 1.10, speedBonus: 0.90, maintenancePerDay: 3,  category: 'irrigation' },
  { id: 'riego_aspersor', name: 'Sprinklers',      cost: 20000,  yieldBonus: 1.15, speedBonus: 0.88, maintenancePerDay: 6,  category: 'irrigation', requires: { minHa: 5 } },
  { id: 'riego_pivot',    name: 'Center Pivot',    cost: 60000,  yieldBonus: 1.20, speedBonus: 0.85, maintenancePerDay: 12, category: 'irrigation', requires: { minHa: 10, minTier: 'B' } },
  // Processing
  { id: 'molino',         name: 'Mill',             cost: 12000,  yieldBonus: 1.12, speedBonus: 1.00, maintenancePerDay: 4,  category: 'processing', requires: { minTier: 'C' } },
  { id: 'silo',           name: 'Silo',             cost: 25000,  yieldBonus: 1.08, speedBonus: 1.00, maintenancePerDay: 3,  category: 'processing', requires: { minHa: 10, minTier: 'B' } },
  // Transport
  { id: 'camion',         name: 'Truck',            cost: 30000,  yieldBonus: 1.05, speedBonus: 1.00, maintenancePerDay: 8,  category: 'transport',  requires: { minHa: 5 } },
];
