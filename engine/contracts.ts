export interface Contract {
  id: string;
  templateId: string;
  cropId: string;
  amount: number;
  pricePerUnit: number;
  deadlineDay: number;
  acceptedDay: number;
  delivered: number;
  completed: boolean;
  failed: boolean;
}

export interface ContractTemplate {
  id: string;
  name: string;
  cropId: string;
  amountRange: [number, number];
  priceBonus: number;
  termDays: number;
  penaltyRate: number;
  minReputation?: number;  // minimum reputation to accept
  export?: boolean;        // export-tier contract
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: 'ct01', name: 'Northern Dairy Farm',       cropId: 'grass',     amountRange: [5000, 20000],  priceBonus: 1.15, termDays: 20,  penaltyRate: 0.10 },
  { id: 'ct02', name: 'Regional Livestock Co.',    cropId: 'alfalfa',   amountRange: [4000, 15000],  priceBonus: 1.18, termDays: 25,  penaltyRate: 0.12 },
  { id: 'ct03', name: 'Craft Brewing Co.',         cropId: 'barley',    amountRange: [2000,  8000],  priceBonus: 1.22, termDays: 60,  penaltyRate: 0.18 },
  { id: 'ct04', name: 'Flake Factory Ltd.',        cropId: 'oats',      amountRange: [2000,  7000],  priceBonus: 1.20, termDays: 55,  penaltyRate: 0.18 },
  { id: 'ct05', name: 'Industrial Flour Mill',     cropId: 'wheat',     amountRange: [3000, 12000],  priceBonus: 1.22, termDays: 70,  penaltyRate: 0.22 },
  { id: 'ct06', name: 'Southern Foods Inc.',       cropId: 'corn',      amountRange: [3000, 10000],  priceBonus: 1.20, termDays: 65,  penaltyRate: 0.20 },
  { id: 'ct07', name: 'Premier Livestock Feed',    cropId: 'sorghum',   amountRange: [3000, 10000],  priceBonus: 1.18, termDays: 55,  penaltyRate: 0.18 },
  { id: 'ct08', name: 'National Rice Processors',  cropId: 'rice',      amountRange: [2000,  8000],  priceBonus: 1.25, termDays: 70,  penaltyRate: 0.22 },
  { id: 'ct09', name: 'Supermarket Chain Co.',     cropId: 'potatoes',  amountRange: [2000,  8000],  priceBonus: 1.22, termDays: 55,  penaltyRate: 0.20 },
  { id: 'ct10', name: 'Continental Sugar Corp.',   cropId: 'sugarbeet', amountRange: [3000, 12000],  priceBonus: 1.25, termDays: 80,  penaltyRate: 0.25 },
  { id: 'ct11', name: 'Protein Export Group',      cropId: 'soy',       amountRange: [2000,  8000],  priceBonus: 1.28, termDays: 80,  penaltyRate: 0.25 },
  { id: 'ct12', name: 'Cane Sugar Refinery',       cropId: 'sugarcane', amountRange: [4000, 15000],  priceBonus: 1.22, termDays: 90,  penaltyRate: 0.22 },
  { id: 'ct13', name: 'Biofuel Solutions Ltd.',    cropId: 'sunflower', amountRange: [1500,  5000],  priceBonus: 1.30, termDays: 80,  penaltyRate: 0.28 },
  { id: 'ct14', name: 'Veggie Oil Refinery',       cropId: 'rapeseed',  amountRange: [1500,  5000],  priceBonus: 1.32, termDays: 85,  penaltyRate: 0.28 },
  { id: 'ct15', name: 'Canola Food Industries',    cropId: 'canola',    amountRange: [1500,  5000],  priceBonus: 1.30, termDays: 80,  penaltyRate: 0.28 },
  { id: 'ct16', name: 'National Textile Corp.',    cropId: 'cotton',    amountRange: [800,   3000],  priceBonus: 1.35, termDays: 90,  penaltyRate: 0.32 },
  // ── New crop contracts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'ct17', name: 'Regional Winery Co.',       cropId: 'grapes',       amountRange: [500,  2000],  priceBonus: 1.25, termDays: 60,  penaltyRate: 0.22 },
  { id: 'ct18', name: 'Fresh Markets Group',        cropId: 'tomatoes',     amountRange: [1000, 4000],  priceBonus: 1.20, termDays: 45,  penaltyRate: 0.18 },
  { id: 'ct19', name: 'Spring Berry Co.',           cropId: 'strawberries', amountRange: [500,  2000],  priceBonus: 1.22, termDays: 40,  penaltyRate: 0.20 },
  { id: 'ct20', name: 'Mediterranean Foods Inc.',   cropId: 'olives',       amountRange: [400,  1500],  priceBonus: 1.28, termDays: 80,  penaltyRate: 0.25 },
  { id: 'ct21', name: 'Premium Nut Distributors',   cropId: 'almonds',      amountRange: [300,  1200],  priceBonus: 1.30, termDays: 85,  penaltyRate: 0.28 },
  // ── Export contracts (reputation ≥ 70) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'exp01', name: 'EU Premium Wine Export',    cropId: 'grapes',       amountRange: [800,  3000],  priceBonus: 1.60, termDays: 100, penaltyRate: 0.45, minReputation: 70,  export: true },
  { id: 'exp02', name: 'Global Olive Oil Export',   cropId: 'olives',       amountRange: [600,  2000],  priceBonus: 1.65, termDays: 110, penaltyRate: 0.50, minReputation: 70,  export: true },
  { id: 'exp03', name: 'International Almond Trade',cropId: 'almonds',      amountRange: [400,  1500],  priceBonus: 1.70, termDays: 120, penaltyRate: 0.50, minReputation: 75,  export: true },
  { id: 'exp04', name: 'Premium Textile Exporter',  cropId: 'cotton',       amountRange: [600,  2200],  priceBonus: 1.65, termDays: 130, penaltyRate: 0.55, minReputation: 70,  export: true },
  { id: 'exp05', name: 'Luxury Spice Exchange',     cropId: 'saffron',      amountRange: [80,    400],  priceBonus: 1.80, termDays: 180, penaltyRate: 0.60, minReputation: 85,  export: true },
];

export function contractPenalty(contract: Contract): number {
  const template = CONTRACT_TEMPLATES.find(t => t.id === contract.templateId)!;
  const totalValue = contract.amount * contract.pricePerUnit;
  return totalValue * template.penaltyRate;
}
