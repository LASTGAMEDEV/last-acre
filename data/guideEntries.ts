import { ANIMAL_TYPES } from './animalTypes';
import { BUILDING_CATEGORY_LABELS, BUILDING_TYPES } from './buildingTypes';
import { CROP_TYPES } from './cropTypes';
import { MACHINE_TYPES } from './machineTypes';
import type { GuideCategory, GuideEntry } from '../types/guide';

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  getting_started: 'Getting Started',
  crops_fields: 'Crops & Fields',
  soil_water: 'Soil & Water',
  animals_welfare: 'Animals & Welfare',
  buildings_infrastructure: 'Buildings & Infrastructure',
  machinery_transport: 'Machinery & Transport',
  workers: 'Workers',
  processing_storage: 'Processing & Storage',
  market_contracts: 'Market & Contracts',
  banking_risk: 'Banking & Risk',
  community_reputation: 'Co-ops, CSA & Reputation',
  neighbours_auctions: 'Neighbours & Auctions',
  timeline_history: 'Timeline & Historical Events',
  certifications_subsidies: 'Certifications & Subsidies',
  electricity_utilities: 'Electricity & Utilities',
  common_problems: 'Common Problems',
};

export const GUIDE_CATEGORY_ORDER: GuideCategory[] = [
  'getting_started',
  'crops_fields',
  'soil_water',
  'animals_welfare',
  'processing_storage',
  'market_contracts',
  'machinery_transport',
  'workers',
  'banking_risk',
  'community_reputation',
  'neighbours_auctions',
  'timeline_history',
  'certifications_subsidies',
  'electricity_utilities',
  'common_problems',
];

const BASE_GUIDE_ENTRIES: GuideEntry[] = [
  {
    id: 'first_year',
    title: 'Your First Year',
    category: 'getting_started',
    tags: ['start', 'beginner', 'money', 'fields'],
    summary: 'A safe first year is about one reliable crop, controlled spending, and learning what each screen does.',
    whyItMatters: 'The early farm is fragile. A few readable choices beat trying every system at once.',
    howToUse: [
      'Plant a cheap crop on owned land before chasing expensive buildings.',
      'Sell enough harvest to keep cash moving, but keep an eye on contracts and seed costs.',
      'Use the guide whenever a card mentions a system you do not understand yet.',
    ],
    mistakesToAvoid: [
      'Spending all cash on animals before building enough feed and enclosure capacity.',
      'Buying land before you can plant, harvest, and sell what you already own.',
      'Ignoring storage and market timing once harvests get larger.',
    ],
    relatedEntryIds: ['crop_wheat', 'system_soil_health', 'problem_no_money'],
    visual: { kind: 'diagram', title: 'Early farm loop', nodes: ['Plant', 'Harvest', 'Sell', 'Reinvest'] },
    farmStateRules: [{ kind: 'finance' }, { kind: 'generic' }],
  },
  {
    id: 'crop_wheat',
    title: 'Wheat',
    category: 'crops_fields',
    tags: ['crop', 'grain', 'spring', 'autumn', 'contracts'],
    summary: 'Wheat is a reliable grain crop with moderate water needs and strong use in contracts, storage, and processing.',
    whyItMatters: 'Wheat is rarely the flashiest crop, but it is one of the best crops for learning market timing and storage quality.',
    howToUse: [
      'Plant wheat in spring or autumn when you want a predictable grain harvest.',
      'Watch summer prices because harvest gluts can push grain prices down.',
      'Use dry storage or processing to protect value if prices are weak.',
    ],
    mistakesToAvoid: [
      'Selling a huge harvest all at once when sell pressure is already active.',
      'Planting wheat repeatedly on the same fields without watching soil nutrients.',
      'Opening delivery commitments without enough stock or growing time.',
    ],
    relatedEntryIds: ['system_market_prices', 'system_storage_quality', 'system_soil_health'],
    visual: { kind: 'diagram', title: 'Wheat value chain', nodes: ['Field', 'Storage', 'Market', 'Contracts'] },
    eraSections: [
      { fromYear: 1970, toYear: 1979, title: '1970s note', body: 'In the 1970s, wheat is a steady backbone crop, but fuel and global grain shocks can change margins quickly.' },
      { fromYear: 1980, toYear: 1989, title: '1980s note', body: 'In the 1980s, debt and price volatility make reliable crops like wheat useful, but storing grain through bad prices can matter more.' },
      { fromYear: 1990, title: 'Modern note', body: 'Later eras reward better storage, contracts, processing, and market timing more than simply growing more tonnes.' },
    ],
    farmStateRules: [{ kind: 'crop', targetId: 'wheat' }],
  },
  {
    id: 'system_crop_seasons',
    title: 'Crop Seasons',
    category: 'crops_fields',
    tags: ['planting', 'season', 'calendar', 'crops'],
    summary: 'Each crop has seasons when it can be planted. Greenhouses and later technology can soften those limits.',
    whyItMatters: 'Planting windows are one of the main reasons planning ahead beats reacting late.',
    howToUse: [
      'Check a crop card before buying seed for a season.',
      'Use the calendar to avoid missing planting windows.',
      'Keep backup crops in mind when weather or cash changes your plan.',
    ],
    mistakesToAvoid: [
      'Buying expensive seed that cannot be planted this season.',
      'Waiting until the last day of a season to make planting decisions.',
      'Treating every crop as interchangeable just because the price is high.',
    ],
    relatedEntryIds: ['crop_wheat', 'system_soil_health', 'problem_cannot_plant'],
    visual: { kind: 'diagram', title: 'Planting decision', nodes: ['Season', 'Seed', 'Soil', 'Water', 'Plant'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'system_soil_health',
    title: 'Soil Health',
    category: 'soil_water',
    tags: ['soil', 'npk', 'compaction', 'organic matter', 'yield'],
    summary: 'Soil health controls how much of a crop potential actually turns into harvest.',
    whyItMatters: 'A high-value crop on damaged soil can perform worse than a modest crop on healthy land.',
    howToUse: [
      'Watch nitrogen, phosphorus, potassium, organic matter, pH, compaction, microbial life, and drainage.',
      'Rotate crops and use cover crops to avoid exhausting the same fields.',
      'Use compost, tillage choices, drainage, and hedgerows to recover long-term productivity.',
    ],
    mistakesToAvoid: [
      'Chasing yield with fertilizer while ignoring compaction or drainage.',
      'Leaving land bare long enough to increase erosion risk.',
      'Repeating heavy-feeding crops without a recovery plan.',
    ],
    relatedEntryIds: ['system_crop_seasons', 'system_water_irrigation', 'problem_bad_yield'],
    visual: { kind: 'before_after', title: 'Soil recovery', before: 'Compacted, low organic matter', after: 'Rotated, covered, biologically active' },
    farmStateRules: [{ kind: 'soil' }],
  },
  {
    id: 'system_water_irrigation',
    title: 'Water, Wells & Irrigation',
    category: 'soil_water',
    tags: ['water', 'well', 'irrigation', 'drainage', 'drought'],
    summary: 'Water systems protect crops from drought, but pumping, wells, drainage, and electricity all affect the final cost.',
    whyItMatters: 'A thirsty crop without water planning can lose profit before it ever reaches harvest.',
    howToUse: [
      'Match crop water need to rainfall, wells, irrigation, and drainage.',
      'Use surveys and well placement to avoid weak water infrastructure.',
      'Watch electricity demand when irrigation expands.',
    ],
    mistakesToAvoid: [
      'Planting high-water crops with no pump or well plan.',
      'Fixing drought risk while ignoring waterlogging and drainage.',
      'Expanding irrigation without checking energy costs.',
    ],
    relatedEntryIds: ['system_soil_health', 'system_electricity', 'problem_bad_yield'],
    visual: { kind: 'diagram', title: 'Water chain', nodes: ['Rain', 'Well', 'Pump', 'Field', 'Drainage'] },
    farmStateRules: [{ kind: 'building', targetId: 'bld_water_tower' }],
  },
  {
    id: 'system_animals_welfare',
    title: 'Animal Welfare & Production',
    category: 'animals_welfare',
    tags: ['animals', 'welfare', 'feed', 'production', 'milk', 'eggs'],
    summary: 'Animals produce best when they are mature, fed, housed, and supported by the right production buildings.',
    whyItMatters: 'Livestock can produce every day, but weak feed and welfare quietly turn animals into expensive decorations.',
    howToUse: [
      'Check feed type and daily feed needs before buying animals.',
      'Build the right enclosure and production building for the species.',
      'Use nutrition and hygiene systems to protect output quality.',
    ],
    mistakesToAvoid: [
      'Buying animals before feed reserves exist.',
      'Expecting young animals to produce before maturity.',
      'Ignoring production building capacity once the herd grows.',
    ],
    relatedEntryIds: ['animal_cow', 'system_processing', 'problem_animals_not_producing'],
    visual: { kind: 'diagram', title: 'Livestock loop', nodes: ['Feed', 'Welfare', 'Production', 'Quality', 'Market'] },
    farmStateRules: [{ kind: 'animal' }],
  },
  {
    id: 'animal_cow',
    title: 'Cow',
    category: 'animals_welfare',
    tags: ['cow', 'milk', 'hay', 'dairy'],
    summary: 'Cows are high-cost dairy animals that need hay, housing, maturity time, and dairy infrastructure.',
    whyItMatters: 'A dairy herd can become a strong daily income engine, but it ties up cash and feed capacity early.',
    howToUse: [
      'Secure hay and enclosure capacity before expanding the herd.',
      'Plan for the maturity delay before milk starts flowing.',
      'Use dairy production buildings and hygiene upgrades to protect milk value.',
    ],
    mistakesToAvoid: [
      'Buying cows with no hay reserve.',
      'Ignoring milk processing or storage quality.',
      'Expanding faster than workers and buildings can handle.',
    ],
    relatedEntryIds: ['system_animals_welfare', 'system_processing', 'problem_animals_not_producing'],
    visual: { kind: 'diagram', title: 'Dairy chain', nodes: ['Hay', 'Cow', 'Milk', 'Dairy', 'Buyer'] },
    farmStateRules: [{ kind: 'animal', targetId: 'vaca' }],
  },
  {
    id: 'system_storage_quality',
    title: 'Storage Quality',
    category: 'processing_storage',
    tags: ['storage', 'quality', 'moisture', 'decay', 'silo'],
    summary: 'Stored goods keep quantity, but quality can rise, fall, or decay depending on moisture, storage, and product type.',
    whyItMatters: 'Good storage turns waiting into strategy. Bad storage turns waiting into loss.',
    howToUse: [
      'Store grain carefully when market prices are weak.',
      'Use drying and better storage to reduce decay risk.',
      'Watch perishables and processed products because some expire faster than raw grain.',
    ],
    mistakesToAvoid: [
      'Assuming stored inventory always keeps full value.',
      'Ignoring wet harvest conditions.',
      'Processing goods with no plan to sell before quality drops.',
    ],
    relatedEntryIds: ['system_market_prices', 'system_processing', 'problem_storage_quality'],
    visual: { kind: 'before_after', title: 'Storage outcome', before: 'Wet batch, falling grade', after: 'Dry batch, protected sale value' },
    farmStateRules: [{ kind: 'inventory' }],
  },
  {
    id: 'system_processing',
    title: 'Processing',
    category: 'processing_storage',
    tags: ['processing', 'recipes', 'quality', 'buildings', 'value'],
    summary: 'Processing converts raw farm goods into higher-value products, usually with time, worker, building, and quality constraints.',
    whyItMatters: 'Processing can protect the farm from weak commodity prices, but it creates bottlenecks and storage risk.',
    howToUse: [
      'Build the right processing building for the recipe.',
      'Check input inventory and expected output quality.',
      'Sell or store finished goods before decay eats the margin.',
    ],
    mistakesToAvoid: [
      'Processing everything without checking demand or expiry.',
      'Building processing capacity before raw supply is steady.',
      'Forgetting that workers and electricity can limit throughput.',
    ],
    relatedEntryIds: ['system_storage_quality', 'system_market_prices', 'problem_no_money'],
    visual: { kind: 'diagram', title: 'Processing margin', nodes: ['Raw crop', 'Recipe', 'Building', 'Quality', 'Premium sale'] },
    farmStateRules: [{ kind: 'building', targetId: 'processing' }],
  },
  {
    id: 'system_market_prices',
    title: 'Market Prices',
    category: 'market_contracts',
    tags: ['market', 'prices', 'sell pressure', 'history', 'revenue'],
    summary: 'Prices move with daily fluctuation, supply pressure, market events, historical era, and selling channels.',
    whyItMatters: 'The same harvest can be a rescue or a regret depending on when and where it is sold.',
    howToUse: [
      'Watch price history instead of only today’s price.',
      'Use storage, contracts, futures, and selling channels to reduce bad timing.',
      'Avoid dumping huge quantities unless cash pressure makes it necessary.',
    ],
    mistakesToAvoid: [
      'Selling everything on the first profitable day.',
      'Ignoring sell pressure after large sales.',
      'Opening futures or contracts without enough inventory or growing time.',
    ],
    relatedEntryIds: ['system_contracts', 'system_storage_quality', 'problem_prices_bad'],
    visual: { kind: 'diagram', title: 'Price decision', nodes: ['Price trend', 'Inventory', 'Cash need', 'Channel', 'Sell'] },
    eraSections: [
      { fromYear: 1970, toYear: 1989, title: 'Volatile early decades', body: 'Earlier decades can swing hard with oil shocks, debt pressure, and export disruptions. Cash safety matters.' },
      { fromYear: 1990, title: 'Modern market depth', body: 'Later eras reward channel choice, contracts, processing, and price alerts more than simply waiting.' },
    ],
    farmStateRules: [{ kind: 'market' }],
  },
  {
    id: 'system_contracts',
    title: 'Contracts',
    category: 'market_contracts',
    tags: ['contracts', 'buyers', 'deadline', 'delivery'],
    summary: 'Contracts offer structured demand, deadlines, and relationship gains in exchange for delivery obligations.',
    whyItMatters: 'Contracts can stabilize revenue, but overcommitting can trap a farm that lacks stock, transport, or time.',
    howToUse: [
      'Check stock, growing crops, and deadline before accepting.',
      'Use recurring buyers when your production is predictable.',
      'Keep disaster grace and transport requirements in mind.',
    ],
    mistakesToAvoid: [
      'Accepting a contract because the price looks good while ignoring the deadline.',
      'Using all inventory for spot sales before contract delivery.',
      'Forgetting that transport and storage can block fulfillment.',
    ],
    relatedEntryIds: ['system_market_prices', 'system_machinery_transport', 'problem_missed_contract'],
    visual: { kind: 'diagram', title: 'Contract flow', nodes: ['Accept', 'Produce', 'Store', 'Deliver', 'Relationship'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'system_machinery_transport',
    title: 'Machinery & Transport',
    category: 'machinery_transport',
    tags: ['machines', 'attachments', 'transport', 'contractor', 'fuel'],
    summary: 'Machines and trailers turn plans into work. Missing equipment can be solved with contractors, but at a cost.',
    whyItMatters: 'A profitable crop can still fail if the farm cannot plant, harvest, move, or deliver it in time.',
    howToUse: [
      'Match tractors, attachments, trailers, and jobs before peak season.',
      'Use contractors when equipment gaps would cost more than the fee.',
      'Watch repair, fuel, and trailer type for long-distance selling.',
    ],
    mistakesToAvoid: [
      'Buying a machine without the attachment it needs.',
      'Ignoring fuel cost in high-workload seasons.',
      'Expanding land faster than machines can service it.',
    ],
    relatedEntryIds: ['system_contracts', 'system_market_prices', 'problem_machines_break'],
    visual: { kind: 'diagram', title: 'Work chain', nodes: ['Machine', 'Attachment', 'Worker', 'Fuel', 'Job'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'system_workers',
    title: 'Workers',
    category: 'workers',
    tags: ['workers', 'payroll', 'fatigue', 'skills', 'injuries'],
    summary: 'Workers add capacity, skills, and resilience, but wages and satisfaction make them an ongoing commitment.',
    whyItMatters: 'Workers are how a farm grows beyond what one owner and a few machines can handle.',
    howToUse: [
      'Hire for the bottleneck you actually have.',
      'Watch payroll before permanent contracts.',
      'Use skilled roles to protect machinery, animals, processing, and office work.',
    ],
    mistakesToAvoid: [
      'Hiring permanent staff before revenue can support payroll.',
      'Ignoring injuries, fatigue, and satisfaction.',
      'Using workers as generic bonuses instead of solving specific bottlenecks.',
    ],
    relatedEntryIds: ['system_machinery_transport', 'system_animals_welfare', 'problem_no_money'],
    visual: { kind: 'diagram', title: 'Labour pressure', nodes: ['Workload', 'Skills', 'Payroll', 'Satisfaction'] },
    eraSections: [
      { fromYear: 1970, toYear: 1989, title: 'Early labour market', body: 'Earlier decades often make labour more available, but debt crises can make payroll riskier.' },
      { fromYear: 2000, title: 'Modern labour pressure', body: 'Later eras make skilled labour and automation decisions more important.' },
    ],
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'system_banking_credit',
    title: 'Banking & Credit',
    category: 'banking_risk',
    tags: ['loans', 'credit', 'debt', 'savings', 'risk'],
    summary: 'Loans accelerate growth, but repayments and credit history shape what the farm can survive later.',
    whyItMatters: 'Debt can buy opportunity or remove flexibility when prices, weather, or history turn against you.',
    howToUse: [
      'Borrow for assets that improve production or resilience.',
      'Keep savings for shocks and contract shortfalls.',
      'Watch debt-to-income before expanding again.',
    ],
    mistakesToAvoid: [
      'Borrowing because cash is low without a recovery plan.',
      'Using long-term debt to cover repeated daily losses.',
      'Ignoring how missed payments affect future rates.',
    ],
    relatedEntryIds: ['problem_no_money', 'system_market_prices', 'system_workers'],
    visual: { kind: 'diagram', title: 'Debt decision', nodes: ['Loan', 'Asset', 'Income', 'Repayment', 'Credit'] },
    farmStateRules: [{ kind: 'finance' }],
  },
  {
    id: 'system_neighbours_auctions',
    title: 'Neighbours & Auctions',
    category: 'neighbours_auctions',
    tags: ['neighbours', 'rivals', 'auction', 'land', 'competition'],
    summary: 'Neighbour farms compete for land and shape the world around your farm.',
    whyItMatters: 'Land is not just a shop item. Rival pressure can change when expansion is safe or urgent.',
    howToUse: [
      'Check rival strength before bidding aggressively.',
      'Treat good nearby parcels as strategic opportunities.',
      'Use co-ops, reputation, and cash reserves to stay flexible.',
    ],
    mistakesToAvoid: [
      'Spending all cash to win land you cannot work yet.',
      'Ignoring neighbour pressure until the auction timer is already moving.',
      'Overbidding when debt is already tight.',
    ],
    relatedEntryIds: ['system_banking_credit', 'system_machinery_transport', 'problem_expanded_too_fast'],
    visual: { kind: 'diagram', title: 'Land pressure', nodes: ['Parcel', 'Rivals', 'Cash', 'Bid', 'Workload'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'system_timeline_history',
    title: 'Timeline & Historical Events',
    category: 'timeline_history',
    tags: ['history', 'timeline', 'events', 'era', 'unlock'],
    summary: 'The farm moves through real historical eras that affect prices, technology, labour, costs, and risk.',
    whyItMatters: 'A good decision in one decade can be risky in another. History changes the farm’s context.',
    howToUse: [
      'Read major event cards before making big purchases.',
      'Watch unlocks because technology and regulations change what is possible.',
      'Use storage, debt control, and diversification to survive volatile periods.',
    ],
    mistakesToAvoid: [
      'Treating the economy as static.',
      'Ignoring input cost shocks.',
      'Expanding aggressively during a period of high debt pressure without cash reserves.',
    ],
    relatedEntryIds: ['system_market_prices', 'system_banking_credit', 'system_workers'],
    visual: { kind: 'diagram', title: 'History effect chain', nodes: ['Event', 'Costs', 'Prices', 'Strategy'] },
    eraSections: [
      { fromYear: 1970, toYear: 1979, title: '1970s', body: 'The 1970s are about fuel shocks, export uncertainty, and building a resilient base.' },
      { fromYear: 1980, toYear: 1989, title: '1980s', body: 'The 1980s make debt management and reliable cashflow especially important.' },
      { fromYear: 1990, title: '1990s and beyond', body: 'Later decades add more technology, market channels, labour pressure, and specialization choices.' },
    ],
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'system_electricity',
    title: 'Electricity & Utilities',
    category: 'electricity_utilities',
    tags: ['electricity', 'solar', 'wind', 'grid', 'processing', 'irrigation'],
    summary: 'Electricity powers irrigation, processing, lighting, and modern infrastructure.',
    whyItMatters: 'As the farm industrializes, power shortages can turn good facilities into idle buildings.',
    howToUse: [
      'Check demand before expanding processing or irrigation.',
      'Use generation, batteries, and grid upgrades to reduce outage risk.',
      'Treat energy as part of production cost, not just background flavour.',
    ],
    mistakesToAvoid: [
      'Building power-hungry systems without checking demand.',
      'Ignoring outages and backup generation.',
      'Expanding renewables without maintenance planning.',
    ],
    relatedEntryIds: ['system_water_irrigation', 'system_processing', 'system_machinery_transport'],
    visual: { kind: 'diagram', title: 'Power use', nodes: ['Generation', 'Battery', 'Demand', 'Fallback'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_no_money',
    title: 'I Have No Money',
    category: 'common_problems',
    tags: ['stuck', 'cash', 'money', 'recovery'],
    summary: 'Cash problems usually come from overexpansion, weak sales timing, payroll, debt, or inventory trapped in the wrong form.',
    whyItMatters: 'A farm can recover from low cash if it still has assets, inventory, or a simple production loop.',
    howToUse: [
      'Sell small amounts of inventory first to avoid unnecessary price pressure.',
      'Pause new construction and focus on crops or products you can finish soon.',
      'Check loans only after you know how the loan will create income.',
      'Use cheaper contractors instead of buying machines when the job is occasional.',
    ],
    mistakesToAvoid: [
      'Taking another loan to cover daily losses without changing the farm plan.',
      'Selling breeding animals or key machines before checking stored goods.',
      'Buying expensive seed while still lacking water, labour, or machinery.',
    ],
    relatedEntryIds: ['system_banking_credit', 'system_market_prices', 'system_processing'],
    visual: { kind: 'diagram', title: 'Cash recovery', nodes: ['Inventory', 'Quick sale', 'Stop spending', 'Small crop', 'Recover'] },
    farmStateRules: [{ kind: 'finance' }, { kind: 'inventory' }],
  },
  {
    id: 'problem_bad_yield',
    title: 'My Crop Yield Is Bad',
    category: 'common_problems',
    tags: ['yield', 'soil', 'water', 'fertility', 'crop'],
    summary: 'Bad yield is usually a stack of small penalties: soil, water, pests, weeds, climate, crop choice, or machinery.',
    whyItMatters: 'Fixing the biggest limiting factor often beats spending blindly on every input.',
    howToUse: [
      'Check soil stats first, especially nutrients, compaction, pH, and drainage.',
      'Check whether the crop matches the season, water supply, and soil type.',
      'Look for field events, pests, weeds, and drought stress.',
    ],
    mistakesToAvoid: [
      'Assuming fertilizer fixes all yield problems.',
      'Repeating the same crop on damaged soil.',
      'Ignoring water and drainage because the crop survived.',
    ],
    relatedEntryIds: ['system_soil_health', 'system_water_irrigation', 'system_crop_seasons'],
    visual: { kind: 'diagram', title: 'Yield stack', nodes: ['Soil', 'Water', 'Weather', 'Pests', 'Harvest'] },
    farmStateRules: [{ kind: 'soil' }],
  },
  {
    id: 'problem_cannot_plant',
    title: 'I Cannot Plant This Crop',
    category: 'common_problems',
    tags: ['planting', 'seed', 'season', 'locked'],
    summary: 'Planting is blocked when the season, seed, land, crop unlock, or field state does not line up.',
    whyItMatters: 'A blocked planting window can waste a whole season if the player does not know what is missing.',
    howToUse: [
      'Check whether the current season allows the crop.',
      'Confirm you own enough seed and an empty owned parcel.',
      'Check historical unlocks and greenhouse options for advanced crops.',
    ],
    mistakesToAvoid: [
      'Buying seed without checking the crop season.',
      'Trying to plant on leased or unowned land without permission.',
      'Ignoring an active crop or unresolved field event on the parcel.',
    ],
    relatedEntryIds: ['system_crop_seasons', 'crop_wheat', 'system_timeline_history'],
    visual: { kind: 'diagram', title: 'Planting checklist', nodes: ['Season', 'Seed', 'Owned land', 'Empty field'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_animals_not_producing',
    title: 'My Animals Are Not Producing Enough',
    category: 'common_problems',
    tags: ['animals', 'feed', 'welfare', 'production'],
    summary: 'Animal production depends on maturity, feed, welfare, season, genetics, and production buildings.',
    whyItMatters: 'Livestock expenses continue even when production is weak, so diagnosing the cause matters quickly.',
    howToUse: [
      'Check whether the animal is mature.',
      'Check feed reserves and ration quality.',
      'Check whether the correct production building is manned and hygienic.',
    ],
    mistakesToAvoid: [
      'Buying more animals before fixing feed or building capacity.',
      'Ignoring welfare and hygiene penalties.',
      'Expecting meat animals to produce daily goods.',
    ],
    relatedEntryIds: ['system_animals_welfare', 'animal_cow', 'system_processing'],
    visual: { kind: 'diagram', title: 'Production check', nodes: ['Maturity', 'Feed', 'Welfare', 'Building', 'Output'] },
    farmStateRules: [{ kind: 'animal' }],
  },
  {
    id: 'problem_storage_quality',
    title: 'My Storage Quality Is Dropping',
    category: 'common_problems',
    tags: ['storage', 'quality', 'decay', 'moisture'],
    summary: 'Storage quality drops when goods are wet, perishable, poorly stored, contaminated, or kept too long.',
    whyItMatters: 'Inventory quantity can look fine while sale value quietly falls.',
    howToUse: [
      'Sell or process batches at risk before they lose more value.',
      'Use drying and better storage where available.',
      'Separate risky products and watch perishable timers.',
    ],
    mistakesToAvoid: [
      'Waiting for perfect prices while quality collapses.',
      'Mixing storage strategy for grain and perishables.',
      'Ignoring quality warnings after wet harvests.',
    ],
    relatedEntryIds: ['system_storage_quality', 'system_market_prices', 'system_processing'],
    visual: { kind: 'before_after', title: 'Quality decay', before: 'Stored too wet', after: 'Dried and sold before decay' },
    farmStateRules: [{ kind: 'inventory' }],
  },
  {
    id: 'problem_missed_contract',
    title: 'I Missed A Contract',
    category: 'common_problems',
    tags: ['contract', 'deadline', 'buyer', 'recovery'],
    summary: 'A missed contract hurts momentum, but the recovery is usually inventory planning and safer deadlines.',
    whyItMatters: 'Contracts are useful only when the farm can reliably deliver.',
    howToUse: [
      'Check why the shortfall happened: stock, crop timing, transport, or storage.',
      'Use smaller contracts until production becomes predictable.',
      'Keep contract inventory separate from speculative market sales.',
    ],
    mistakesToAvoid: [
      'Accepting a replacement contract immediately without fixing the bottleneck.',
      'Selling reserved stock because the spot price looks tempting.',
      'Ignoring transport requirements until the deadline arrives.',
    ],
    relatedEntryIds: ['system_contracts', 'system_market_prices', 'system_machinery_transport'],
    visual: { kind: 'diagram', title: 'Safer contract loop', nodes: ['Stock', 'Deadline', 'Transport', 'Deliver'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_prices_bad',
    title: 'Prices Are Terrible',
    category: 'common_problems',
    tags: ['prices', 'market', 'storage', 'sell pressure'],
    summary: 'Bad prices are not always a sell signal. They can be a storage, processing, contract, or diversification signal.',
    whyItMatters: 'Reacting badly to a low price can lock in losses that patience or another channel would avoid.',
    howToUse: [
      'Check whether the price drop is temporary, seasonal, or event-driven.',
      'Use storage only if quality can survive the wait.',
      'Consider contracts, processing, or alternate markets if spot price is weak.',
    ],
    mistakesToAvoid: [
      'Panic-selling all inventory into a glut.',
      'Holding perishable goods too long.',
      'Ignoring cash needs while waiting for a perfect market.',
    ],
    relatedEntryIds: ['system_market_prices', 'system_storage_quality', 'system_processing'],
    visual: { kind: 'diagram', title: 'Bad price choices', nodes: ['Wait', 'Process', 'Contract', 'Sell small'] },
    farmStateRules: [{ kind: 'market' }, { kind: 'inventory' }],
  },
  {
    id: 'problem_machines_break',
    title: 'My Machines Keep Breaking',
    category: 'common_problems',
    tags: ['machines', 'repair', 'maintenance', 'contractor'],
    summary: 'Breakdowns usually mean the farm is leaning too hard on worn equipment or lacks maintenance support.',
    whyItMatters: 'Broken machinery turns seasonal timing into emergency spending.',
    howToUse: [
      'Repair before peak planting and harvest windows.',
      'Use contractors when a machine gap is temporary.',
      'Hire or train maintenance support when the fleet grows.',
    ],
    mistakesToAvoid: [
      'Waiting for a breakdown before budgeting repair.',
      'Buying more land while machinery is already the bottleneck.',
      'Ignoring attachment compatibility.',
    ],
    relatedEntryIds: ['system_machinery_transport', 'system_workers', 'problem_expanded_too_fast'],
    visual: { kind: 'diagram', title: 'Maintenance loop', nodes: ['Inspect', 'Repair', 'Workload', 'Contractor backup'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_expanded_too_fast',
    title: 'I Expanded Too Fast',
    category: 'common_problems',
    tags: ['expansion', 'debt', 'land', 'workers', 'machines'],
    summary: 'Overexpansion happens when land, debt, labour, machinery, and cash no longer match each other.',
    whyItMatters: 'The farm can own more land than it can profitably operate.',
    howToUse: [
      'Stop buying land until existing fields are profitable.',
      'Use contractors or leases to bridge temporary gaps.',
      'Focus on one bottleneck: cash, machines, labour, storage, or water.',
    ],
    mistakesToAvoid: [
      'Trying to fix every bottleneck with more debt.',
      'Planting all land with high-input crops in the same season.',
      'Ignoring smaller reliable income while chasing scale.',
    ],
    relatedEntryIds: ['system_banking_credit', 'system_machinery_transport', 'system_workers'],
    visual: { kind: 'diagram', title: 'Scale balance', nodes: ['Land', 'Machines', 'Workers', 'Cash', 'Storage'] },
    farmStateRules: [{ kind: 'finance' }, { kind: 'generic' }],
  },
  {
    id: 'problem_dont_know_next',
    title: 'I Do Not Know What To Do Next',
    category: 'common_problems',
    tags: ['lost', 'next step', 'priority', 'planning'],
    summary: 'When the farm feels too open-ended, choose the nearest bottleneck and solve one thing instead of trying to optimize everything.',
    whyItMatters: 'The game has many systems, but progress usually comes from a short chain: plant, grow, harvest, sell or process, then reinvest.',
    howToUse: [
      'Check fields first: empty owned land is usually the simplest missed opportunity.',
      'Check cash second: if money is tight, sell inventory or accept a reachable contract.',
      'Check bottlenecks third: storage, machinery, water, feed, or buildings may be blocking the next expansion.',
    ],
    mistakesToAvoid: [
      'Buying a new system before the current farm loop is stable.',
      'Advancing days repeatedly without checking fields, animals, and contracts.',
      'Treating the biggest purchase as automatically the best next step.',
    ],
    relatedEntryIds: ['first_year', 'system_market_prices', 'system_storage_quality'],
    visual: { kind: 'diagram', title: 'Find the next move', nodes: ['Fields', 'Cash', 'Contracts', 'Bottleneck', 'One upgrade'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_cash_crunch',
    title: 'Running Out Of Money',
    category: 'common_problems',
    tags: ['money', 'cash', 'loan', 'sell', 'debt'],
    summary: 'A cash crunch means the farm needs liquidity before expansion: sell what is not strategic, delay upgrades, and borrow only against a clear payoff.',
    whyItMatters: 'Low cash makes good decisions harder because seed, fuel, feed, maintenance, and emergency repairs all compete for the same money.',
    howToUse: [
      'Sell inventory that is not needed for contracts or near-term processing.',
      'Use loans for productive assets, not to cover random spending.',
      'Avoid buying new buildings until seed, fuel, feed, and maintenance are funded.',
    ],
    mistakesToAvoid: [
      'Taking a large loan without a harvest, contract, or production plan.',
      'Selling all stock and then missing a contract delivery.',
      'Buying more animals while feed or cash is already unstable.',
    ],
    relatedEntryIds: ['system_banking_credit', 'system_market_prices', 'system_contracts'],
    visual: { kind: 'diagram', title: 'Cash recovery', nodes: ['Sell surplus', 'Fund essentials', 'Delay upgrades', 'Borrow carefully', 'Rebuild reserves'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_water_shortage',
    title: 'Water Shortage',
    category: 'common_problems',
    tags: ['water', 'drought', 'irrigation', 'crops'],
    summary: 'Water problems are solved by matching thirsty crops to the right season, keeping irrigation capacity ahead of land expansion, and reacting before drought damage lands.',
    whyItMatters: 'High-value crops can become bad bets if the farm cannot support their water demand.',
    howToUse: [
      'Favor lower water-need crops when irrigation is weak.',
      'Buy irrigation or water infrastructure before expanding thirsty crop acreage.',
      'Use the weather forecast before planting large fields.',
    ],
    mistakesToAvoid: [
      'Planting thirsty crops across every parcel at once.',
      'Waiting until drought damage appears before investing in water.',
      'Ignoring soil recovery after weather stress.',
    ],
    relatedEntryIds: ['system_water_irrigation', 'system_crop_seasons', 'system_soil_health'],
    visual: { kind: 'diagram', title: 'Water decision', nodes: ['Forecast', 'Crop water need', 'Irrigation', 'Field size', 'Risk'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_feed_shortage',
    title: 'Feed Shortage',
    category: 'common_problems',
    tags: ['feed', 'animals', 'welfare', 'production'],
    summary: 'Feed shortages mean the animal side of the farm is larger than the crop, inventory, or cash base supporting it.',
    whyItMatters: 'Livestock can produce steady value, but poor feed planning lowers welfare and blocks reliable production.',
    howToUse: [
      'Slow animal purchases until feed inventory is stable.',
      'Use crops, market buys, or processing chains that support the species you own.',
      'Keep a reserve before winter or any major livestock expansion.',
    ],
    mistakesToAvoid: [
      'Buying animals because housing exists, even when feed does not.',
      'Spending feed money on buildings that do not solve the shortage.',
      'Ignoring welfare until production has already dropped.',
    ],
    relatedEntryIds: ['system_animals_welfare', 'problem_animals_not_producing', 'system_processing'],
    visual: { kind: 'diagram', title: 'Feed stability', nodes: ['Count animals', 'Check feed', 'Secure source', 'Build reserve', 'Expand slowly'] },
    farmStateRules: [{ kind: 'generic' }],
  },
  {
    id: 'problem_overwhelmed',
    title: 'The Farm Feels Overwhelming',
    category: 'common_problems',
    tags: ['overwhelmed', 'focus', 'systems', 'beginner'],
    summary: 'When there are too many choices, run the farm in layers: fields first, animals second, contracts third, upgrades last.',
    whyItMatters: 'A readable routine lets the player enjoy depth without feeling like every screen demands attention every day.',
    howToUse: [
      'Start each session by checking fields and urgent deadlines.',
      'Only visit specialist screens when a problem points there.',
      'Pick one goal for the season and let other systems wait.',
    ],
    mistakesToAvoid: [
      'Opening every tab every day with no priority.',
      'Trying to learn all late-game systems at once.',
      'Confusing optional optimization with required survival.',
    ],
    relatedEntryIds: ['first_year', 'problem_dont_know_next', 'system_contracts'],
    visual: { kind: 'diagram', title: 'Simple routine', nodes: ['Fields', 'Animals', 'Deadlines', 'Cash', 'One improvement'] },
    farmStateRules: [{ kind: 'generic' }],
  },
];

const BASE_IDS = new Set(BASE_GUIDE_ENTRIES.map(entry => entry.id));

function cropGuideId(cropId: string) {
  return `crop_${cropId}`;
}

function animalGuideId(animalId: string) {
  return `animal_${animalId}`;
}

function buildingGuideId(buildingId: string) {
  return `building_${buildingId}`;
}

function machineGuideId(machineId: string) {
  return `machine_${machineId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

const GENERATED_CROP_ENTRIES: GuideEntry[] = CROP_TYPES
  .filter(crop => !BASE_IDS.has(cropGuideId(crop.id)))
  .map(crop => ({
    id: cropGuideId(crop.id),
    title: crop.name,
    category: 'crops_fields',
    tags: ['crop', crop.tier.toLowerCase(), crop.unit, ...crop.seasons],
    summary: `${crop.name} is a tier ${crop.tier} crop planted in ${crop.seasons.join(', ')} with ${crop.waterNeed}/5 water need.`,
    whyItMatters: crop.coverCrop
      ? 'Cover crops are not grown for direct revenue; they protect and restore the field for better future harvests.'
      : `This crop turns land, seed cost, water, and timing into ${crop.unit} inventory that can be sold, stored, contracted, or processed.`,
    howToUse: [
      `Plant during ${crop.seasons.join(', ')} unless protected by special infrastructure.`,
      `Budget about $${crop.seedCost.toLocaleString()} per hectare for seed before planting.`,
      crop.coverCrop ? 'Use it when soil recovery matters more than immediate revenue.' : `Compare today’s price against the base price of $${crop.basePrice.toFixed(2)}/${crop.unit} before selling.`,
    ],
    mistakesToAvoid: [
      `Planting outside its season or without enough cash for seed.`,
      crop.waterNeed >= 4 ? 'Ignoring irrigation and drought risk for a thirsty crop.' : 'Ignoring soil and rotation just because the crop is reliable.',
      crop.fertilityDrain >= 2 ? 'Repeating it too often without soil recovery.' : 'Forgetting that even low-drain crops still need market timing.',
    ],
    relatedEntryIds: ['system_crop_seasons', 'system_soil_health', 'system_market_prices'],
    visual: { kind: 'diagram', title: `${crop.name} decision`, nodes: ['Season', 'Soil', 'Water', 'Seed', 'Market'] },
    farmStateRules: [{ kind: 'crop', targetId: crop.id }],
  }));

const GENERATED_ANIMAL_ENTRIES: GuideEntry[] = ANIMAL_TYPES
  .filter(animal => !BASE_IDS.has(animalGuideId(animal.id)))
  .map(animal => ({
    id: animalGuideId(animal.id),
    title: animal.name,
    category: 'animals_welfare',
    tags: ['animal', animal.enclosureType, animal.feedType ?? 'self-sufficient', animal.productionType ?? 'breeding'],
    summary: `${animal.name} ${animal.productionType ? `produces ${animal.productionType}` : 'is managed for breeding or sale'} after ${animal.maturityDays} days.`,
    whyItMatters: 'Animals can create recurring value, but they also create daily feed, housing, welfare, and production-building pressure.',
    howToUse: [
      animal.feedType ? `Secure ${animal.feedType} before expanding this species.` : 'This species is mostly self-sufficient but still benefits from proper habitat and management.',
      `Wait for maturity before expecting full production.`,
      'Use genetics, welfare, and the right building chain to improve long-term value.',
    ],
    mistakesToAvoid: [
      'Buying too many animals before feed and housing are ready.',
      'Ignoring maturity time and expecting immediate output.',
      'Treating every species like it has the same production loop.',
    ],
    relatedEntryIds: ['system_animals_welfare', 'system_processing', 'problem_animals_not_producing'],
    visual: { kind: 'diagram', title: `${animal.name} loop`, nodes: ['Housing', 'Feed', 'Maturity', 'Production', 'Sale'] },
    farmStateRules: [{ kind: 'animal', targetId: animal.id }],
  }));

const GENERATED_BUILDING_ENTRIES: GuideEntry[] = BUILDING_TYPES
  .filter(building => !BASE_IDS.has(buildingGuideId(building.id)))
  .map(building => ({
    id: buildingGuideId(building.id),
    title: building.name,
    category: building.category === 'processing'
      ? 'processing_storage'
      : building.category === 'animal' || building.category === 'production'
        ? 'animals_welfare'
        : 'buildings_infrastructure',
    tags: ['building', building.category, building.buildingTier ?? 'standard'],
    summary: `${building.name} is a ${BUILDING_CATEGORY_LABELS[building.category].toLowerCase()} building that costs $${building.cost.toLocaleString()}.`,
    whyItMatters: building.effectLabel || 'Buildings unlock capacity, resilience, or new farm systems that pure cash cannot replace.',
    howToUse: [
      'Buy it when this building solves a current bottleneck, not just because it is available.',
      building.capacity ? `Use its capacity carefully: ${building.capacity.toLocaleString()} units/slots.` : 'Check whether it unlocks a system, upgrade path, or production chain.',
      building.maintenancePerDay > 0 ? `Budget $${building.maintenancePerDay.toLocaleString()} per day for maintenance.` : 'Check whether it creates passive benefit or income.',
    ],
    mistakesToAvoid: [
      'Spending cash on infrastructure before the farm can use it.',
      'Forgetting maintenance and worker requirements.',
      'Buying the building without checking related systems.',
    ],
    relatedEntryIds: building.category === 'processing'
      ? ['system_processing', 'system_storage_quality', 'system_electricity']
      : building.category === 'animal' || building.category === 'production'
        ? ['system_animals_welfare', 'animal_cow', 'system_processing']
        : ['system_water_irrigation', 'system_electricity', 'system_machinery_transport'],
    visual: { kind: 'diagram', title: `${building.name} role`, nodes: ['Cost', 'Capacity', 'Operation', 'Payoff'] },
    farmStateRules: [{ kind: 'building', targetId: building.id }],
  }));

const GENERATED_MACHINE_ENTRIES: GuideEntry[] = MACHINE_TYPES
  .filter(machine => !BASE_IDS.has(machineGuideId(machine.id)))
  .map(machine => ({
    id: machineGuideId(machine.id),
    title: machine.name,
    category: 'machinery_transport',
    tags: ['machine', machine.category, machine.size],
    summary: `${machine.name} is a ${machine.size} ${machine.category} with $${machine.maintenancePerDay.toLocaleString()}/day maintenance.`,
    whyItMatters: 'Machinery controls whether the farm can complete fieldwork, hauling, irrigation, and delivery on time.',
    howToUse: [
      'Buy machinery when it removes a repeated bottleneck.',
      machine.fuelPerDay ? `Budget fuel for active work: about ${machine.fuelPerDay} L per job-day.` : 'Check compatibility and capacity before buying.',
      machine.capacityKg ? `Use its capacity: ${machine.capacityKg.toLocaleString()} ${machine.category === 'trailer' && machine.id.includes('livestock') ? 'head' : 'kg'}.` : 'Pair it with compatible attachments or trailers where needed.',
    ],
    mistakesToAvoid: [
      'Buying equipment without the compatible attachment, trailer, or truck.',
      'Ignoring maintenance and repair timing before peak season.',
      'Expanding land faster than machinery capacity.',
    ],
    relatedEntryIds: ['system_machinery_transport', 'system_workers', 'problem_machines_break'],
    visual: { kind: 'diagram', title: `${machine.name} fit`, nodes: ['Job', 'Compatibility', 'Fuel', 'Capacity', 'Timing'] },
    farmStateRules: [{ kind: 'generic' }],
  }));

export const GUIDE_ENTRIES: GuideEntry[] = [
  ...BASE_GUIDE_ENTRIES,
  ...GENERATED_CROP_ENTRIES,
  ...GENERATED_ANIMAL_ENTRIES,
  ...GENERATED_BUILDING_ENTRIES,
  ...GENERATED_MACHINE_ENTRIES,
];

export const GUIDE_ENTRY_IDS = {
  crop: cropGuideId,
  animal: animalGuideId,
  building: buildingGuideId,
  machine: machineGuideId,
};

export function getGuideEntry(id: string): GuideEntry | undefined {
  return GUIDE_ENTRIES.find(entry => entry.id === id);
}

export function searchGuideEntries(query: string, category?: GuideCategory): GuideEntry[] {
  const normalized = query.trim().toLowerCase();
  return GUIDE_ENTRIES.filter(entry => {
    if (category && entry.category !== category) return false;
    if (!normalized) return true;
    const haystack = [
      entry.title,
      entry.summary,
      entry.whyItMatters,
      entry.category,
      ...entry.tags,
    ].join(' ').toLowerCase();
    return haystack.includes(normalized);
  });
}
