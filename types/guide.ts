export type GuideCategory =
  | 'getting_started'
  | 'crops_fields'
  | 'soil_water'
  | 'animals_welfare'
  | 'buildings_infrastructure'
  | 'machinery_transport'
  | 'workers'
  | 'processing_storage'
  | 'market_contracts'
  | 'banking_risk'
  | 'community_reputation'
  | 'neighbours_auctions'
  | 'timeline_history'
  | 'certifications_subsidies'
  | 'electricity_utilities'
  | 'common_problems';

export type GuideVisualKind = 'diagram' | 'illustration' | 'before_after';

export interface GuideVisualRef {
  kind: GuideVisualKind;
  title: string;
  nodes?: string[];
  before?: string;
  after?: string;
}

export interface GuideEraSection {
  fromYear: number;
  toYear?: number;
  title: string;
  body: string;
}

export type GuideFarmRuleKind =
  | 'crop'
  | 'animal'
  | 'building'
  | 'inventory'
  | 'finance'
  | 'market'
  | 'soil'
  | 'generic';

export interface GuideFarmStateRule {
  kind: GuideFarmRuleKind;
  targetId?: string;
}

export interface GuideEntry {
  id: string;
  title: string;
  category: GuideCategory;
  tags: string[];
  summary: string;
  whyItMatters: string;
  howToUse: string[];
  mistakesToAvoid: string[];
  relatedEntryIds: string[];
  visual?: GuideVisualRef;
  eraSections?: GuideEraSection[];
  farmStateRules?: GuideFarmStateRule[];
}

export interface GuideContextInput {
  day: number;
  money: number;
  inventory: Record<string, number>;
  buildings: string[];
  ownedCropSeedIds?: string[];
  ownedAnimalTypeIds?: string[];
  loansTotalOwed?: number;
  activeContractCount?: number;
  selectedParcelSoil?: {
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    organicMatter?: number;
    compaction?: number;
    pH?: number;
    drainage?: number;
  } | null;
}

export interface GuideContext extends GuideContextInput {
  calendarYear: number;
  decade: number;
  eraLabel: string;
}

export interface GuideFarmStatePanel {
  title: string;
  rows: { label: string; value: string; tone?: 'good' | 'warning' | 'danger' | 'info' }[];
  nextActions: string[];
}

export interface GuideRelatedAction {
  label: string;
  entryId: string;
}
