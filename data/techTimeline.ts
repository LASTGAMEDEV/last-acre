// Era-based technology unlocks, keyed by calendar year.
// Each decade introduces technologies that change farm strategy.

export type TechItem = {
  id: string;
  name: string;
  desc: string;
  effect: string;
  category: 'crops' | 'animals' | 'machinery' | 'market' | 'processing' | 'management';
};

export type TechEra = {
  decade: string;
  startYear: number;
  endYear: number;
  color: string;
  icon: string;
  tagline: string;
  techs: TechItem[];
};

export const TECH_ERAS: TechEra[] = [
  {
    decade: '1970s',
    startYear: 1970,
    endYear: 1979,
    color: '#8d6e63',
    icon: '🚜',
    tagline: 'The Green Revolution era',
    techs: [
      { id: 'chem_fert', name: 'Chemical Fertilizers', desc: 'Synthetic NPK fertilizers boost yields dramatically', effect: '+15% crop yield potential', category: 'crops' },
      { id: 'basic_tractor', name: 'Tractor Farming', desc: 'Diesel tractors replace draft animals for field work', effect: 'Unlock basic machinery', category: 'machinery' },
      { id: 'weed_control', name: 'Herbicide Programs', desc: 'Selective herbicides eliminate manual weeding', effect: 'Reduced labor cost', category: 'crops' },
      { id: 'feedlot', name: 'Intensive Livestock', desc: 'Confinement feeding for faster animal weight gain', effect: 'Faster livestock maturation', category: 'animals' },
    ],
  },
  {
    decade: '1980s',
    startYear: 1980,
    endYear: 1989,
    color: '#546e7a',
    icon: '🏭',
    tagline: 'Farm specialization and scale',
    techs: [
      { id: 'combine_harv', name: 'Combine Harvester', desc: 'Single-pass harvesting dramatically cuts labor hours', effect: 'Batch harvest efficiency', category: 'machinery' },
      { id: 'silo_storage', name: 'Modern Grain Storage', desc: 'Temperature-controlled silos extend post-harvest window', effect: 'Hold crops longer without quality loss', category: 'management' },
      { id: 'milk_bulk', name: 'Bulk Milk Cooling', desc: 'Refrigerated bulk tanks allow daily pick-up contracts', effect: 'Unlock dairy contracts', category: 'animals' },
      { id: 'futures_mkt', name: 'Futures Markets', desc: 'Lock in crop prices months before harvest via futures', effect: 'Unlock futures trading', category: 'market' },
    ],
  },
  {
    decade: '1990s',
    startYear: 1990,
    endYear: 1999,
    color: '#43a047',
    icon: '🌿',
    tagline: 'Environmental awareness rises',
    techs: [
      { id: 'drip_irrig', name: 'Drip Irrigation', desc: 'Targeted water delivery cuts water use by 30–50%', effect: 'Reduced water costs, drought resilience', category: 'crops' },
      { id: 'organic_cert', name: 'Organic Certification', desc: 'USDA Organic standard opens premium market channels', effect: '+25–40% crop price premium', category: 'market' },
      { id: 'gmo_seeds', name: 'Improved Seed Varieties', desc: 'Hybrid and improved varieties with better yield stability', effect: '+10% yield consistency', category: 'crops' },
      { id: 'cool_chain', name: 'Cold-Chain Logistics', desc: 'Refrigerated transport lets you reach urban premium buyers', effect: 'Unlock regional market access', category: 'market' },
    ],
  },
  {
    decade: '2000s',
    startYear: 2000,
    endYear: 2009,
    color: '#1976d2',
    icon: '💻',
    tagline: 'Precision agriculture emerges',
    techs: [
      { id: 'gps_farm', name: 'GPS-Guided Machinery', desc: 'Sub-inch accuracy eliminates overlap and reduces fuel use', effect: 'Lower machinery operating cost', category: 'machinery' },
      { id: 'online_market', name: 'Online Farm Markets', desc: 'Sell directly to consumers via internet platforms', effect: 'Access direct-to-consumer pricing', category: 'market' },
      { id: 'soil_sensors', name: 'Soil Sensor Networks', desc: 'Real-time soil moisture and nutrient monitoring', effect: 'Better yield predictions, lower input cost', category: 'crops' },
      { id: 'biogas', name: 'Biogas Systems', desc: 'Convert animal waste to electricity and digestate fertilizer', effect: 'Reduce energy and fertilizer costs', category: 'processing' },
    ],
  },
  {
    decade: '2010s',
    startYear: 2010,
    endYear: 2019,
    color: '#7b1fa2',
    icon: '🚁',
    tagline: 'Digital farming and sustainability',
    techs: [
      { id: 'drone_survey', name: 'Drone Surveillance', desc: 'Aerial crop scouting detects pest and disease outbreaks early', effect: 'Early disease warning, reduced crop loss', category: 'crops' },
      { id: 'solar_farm', name: 'Solar Energy', desc: 'On-farm solar panels offset electricity costs significantly', effect: 'Reduce processing and storage energy bills', category: 'management' },
      { id: 'direct_sales', name: 'Farm-to-Table Brands', desc: 'Branded local food commands premium loyalty pricing', effect: 'Unlock farm brand premium pricing', category: 'market' },
      { id: 'welfare_cert', name: 'Animal Welfare Certification', desc: 'Third-party welfare audit unlocks humane-label premiums', effect: '+15% animal product price premium', category: 'animals' },
    ],
  },
  {
    decade: '2020s',
    startYear: 2020,
    endYear: 2029,
    color: '#00897b',
    icon: '🌍',
    tagline: 'Regenerative and resilient farming',
    techs: [
      { id: 'carbon_market', name: 'Carbon Credits', desc: 'Regenerative soil practices generate carbon offset revenue', effect: 'New income stream from soil management', category: 'management' },
      { id: 'robot_harvest', name: 'Robotic Harvesting', desc: 'Autonomous picking robots reduce peak labor dependency', effect: 'Harvest without seasonal worker shortage', category: 'machinery' },
      { id: 'regen_ag', name: 'Regenerative Agriculture', desc: 'Cover crops, no-till, and agroforestry restore soil health', effect: 'Long-term soil fertility growth', category: 'crops' },
      { id: 'alt_protein', name: 'Alternative Protein Markets', desc: 'Consumer shift creates demand for insects, legume proteins', effect: 'New specialty crop and animal options', category: 'market' },
    ],
  },
];

export function getUnlockedEras(calYear: number): TechEra[] {
  return TECH_ERAS.filter(e => e.startYear <= calYear);
}

export function getCurrentEra(calYear: number): TechEra {
  const era = [...TECH_ERAS].reverse().find(e => e.startYear <= calYear);
  return era ?? TECH_ERAS[0];
}

export function getNextEra(calYear: number): TechEra | null {
  return TECH_ERAS.find(e => e.startYear > calYear) ?? null;
}
