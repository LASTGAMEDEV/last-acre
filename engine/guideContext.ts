import { gameDayToCalendarYear } from './calendarUtils';
import { CROP_TYPES } from '../data/cropTypes';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { ANIMAL_TYPES } from '../data/animalTypes';
import type {
  GuideContext,
  GuideContextInput,
  GuideEntry,
  GuideEraSection,
  GuideFarmStatePanel,
  GuideRelatedAction,
} from '../types/guide';

export function buildGuideContext(input: GuideContextInput): GuideContext {
  const calendarYear = gameDayToCalendarYear(input.day);
  const decade = Math.floor(calendarYear / 10) * 10;
  return {
    ...input,
    calendarYear,
    decade,
    eraLabel: `${decade}s`,
    ownedCropSeedIds: input.ownedCropSeedIds ?? [],
    ownedAnimalTypeIds: input.ownedAnimalTypeIds ?? [],
    loansTotalOwed: input.loansTotalOwed ?? 0,
    activeContractCount: input.activeContractCount ?? 0,
  };
}

export function getEraSection(entry: GuideEntry, context: GuideContext): GuideEraSection | null {
  const sections = entry.eraSections ?? [];
  return sections.find(section => {
    if (context.calendarYear < section.fromYear) return false;
    return section.toYear === undefined || context.calendarYear <= section.toYear;
  }) ?? null;
}

export function getFarmStatePanel(entry: GuideEntry, context: GuideContext): GuideFarmStatePanel | null {
  const rules = entry.farmStateRules ?? [];
  if (rules.length === 0) return null;

  const rows: GuideFarmStatePanel['rows'] = [];
  const nextActions: string[] = [];

  for (const rule of rules) {
    if (rule.kind === 'crop' && rule.targetId) {
      const crop = CROP_TYPES.find(c => c.id === rule.targetId);
      const stock = context.inventory[rule.targetId] ?? 0;
      const hasSeed = (context.ownedCropSeedIds ?? []).includes(rule.targetId);
      rows.push({ label: `${crop?.name ?? rule.targetId} in storage`, value: `${Math.round(stock).toLocaleString()} ${crop?.unit ?? ''}`, tone: stock > 0 ? 'good' : 'info' });
      rows.push({ label: 'Seed available', value: hasSeed ? 'Yes' : 'No', tone: hasSeed ? 'good' : 'warning' });
      if (hasSeed) nextActions.push(`Plant ${crop?.name ?? rule.targetId} on suitable land during its season.`);
      else nextActions.push(`Buy ${crop?.name ?? rule.targetId} seed before planning a planting window.`);
    }

    if (rule.kind === 'animal') {
      const ownedIds = context.ownedAnimalTypeIds ?? [];
      if (rule.targetId) {
        const animal = ANIMAL_TYPES.find(a => a.id === rule.targetId);
        const owned = ownedIds.includes(rule.targetId);
        rows.push({ label: `${animal?.name ?? rule.targetId} owned`, value: owned ? 'Yes' : 'No', tone: owned ? 'good' : 'info' });
        nextActions.push(owned ? `Check feed and housing for ${animal?.name ?? rule.targetId}.` : `Secure feed and housing before buying ${animal?.name ?? rule.targetId}.`);
      } else {
        rows.push({ label: 'Animal types owned', value: String(ownedIds.length), tone: ownedIds.length > 0 ? 'good' : 'info' });
        nextActions.push(ownedIds.length > 0 ? 'Check feed reserves before expanding livestock.' : 'Start small with animals until feed and housing are stable.');
      }
    }

    if (rule.kind === 'building' && rule.targetId) {
      if (rule.targetId === 'processing') {
        const processingOwned = context.buildings.some(id => {
          const building = BUILDING_TYPES.find(b => b.id === id);
          return building?.category === 'processing';
        });
        rows.push({ label: 'Processing building', value: processingOwned ? 'Owned' : 'Missing', tone: processingOwned ? 'good' : 'warning' });
        nextActions.push(processingOwned ? 'Check recipes with ingredients already in storage.' : 'Build a processing facility only when raw supply is steady.');
      } else {
        const building = BUILDING_TYPES.find(b => b.id === rule.targetId);
        const owned = context.buildings.includes(rule.targetId);
        rows.push({ label: building?.name ?? rule.targetId, value: owned ? 'Owned' : 'Missing', tone: owned ? 'good' : 'warning' });
        nextActions.push(owned ? `${building?.name ?? 'This building'} is available for this system.` : `Consider ${building?.name ?? rule.targetId} when this system becomes a bottleneck.`);
      }
    }

    if (rule.kind === 'inventory') {
      const itemCount = Object.values(context.inventory).filter(qty => qty > 0).length;
      const totalQty = Object.values(context.inventory).reduce((sum, qty) => sum + qty, 0);
      rows.push({ label: 'Inventory types held', value: String(itemCount), tone: itemCount > 0 ? 'good' : 'info' });
      rows.push({ label: 'Total stored units', value: Math.round(totalQty).toLocaleString(), tone: totalQty > 0 ? 'good' : 'info' });
      nextActions.push(totalQty > 0 ? 'Check whether stored goods should be sold, processed, or protected from quality loss.' : 'Build a simple production loop before relying on storage strategy.');
    }

    if (rule.kind === 'finance') {
      rows.push({ label: 'Cash', value: `$${Math.round(context.money).toLocaleString()}`, tone: context.money > 5000 ? 'good' : context.money > 1000 ? 'warning' : 'danger' });
      rows.push({ label: 'Loan exposure', value: `$${Math.round(context.loansTotalOwed ?? 0).toLocaleString()}`, tone: (context.loansTotalOwed ?? 0) > 0 ? 'warning' : 'good' });
      nextActions.push(context.money < 1000 ? 'Prioritize quick income and avoid new construction until cash recovers.' : 'Keep enough cash for seed, feed, repairs, and deadlines.');
    }

    if (rule.kind === 'market') {
      rows.push({ label: 'Active contracts', value: String(context.activeContractCount ?? 0), tone: (context.activeContractCount ?? 0) > 0 ? 'warning' : 'info' });
      const storedTypes = Object.values(context.inventory).filter(qty => qty > 0).length;
      rows.push({ label: 'Sellable inventory types', value: String(storedTypes), tone: storedTypes > 0 ? 'good' : 'info' });
      nextActions.push(storedTypes > 0 ? 'Compare today’s price with recent history before selling a large batch.' : 'Grow or process goods before worrying about market timing.');
    }

    if (rule.kind === 'soil') {
      const soil = context.selectedParcelSoil;
      if (soil) {
        if (soil.nitrogen !== undefined) rows.push({ label: 'Nitrogen', value: `${Math.round(soil.nitrogen)}/100`, tone: soil.nitrogen >= 50 ? 'good' : 'warning' });
        if (soil.organicMatter !== undefined) rows.push({ label: 'Organic matter', value: `${soil.organicMatter.toFixed(1)}%`, tone: soil.organicMatter >= 4 ? 'good' : 'warning' });
        if (soil.compaction !== undefined) rows.push({ label: 'Compaction', value: `${Math.round(soil.compaction)}/100`, tone: soil.compaction <= 35 ? 'good' : 'warning' });
        if (soil.drainage !== undefined) rows.push({ label: 'Drainage', value: `${Math.round(soil.drainage)}/100`, tone: soil.drainage >= 55 ? 'good' : 'warning' });
        nextActions.push('Use the weakest soil stat to decide whether to fertilize, rotate, drain, compost, or rest the field.');
      } else {
        rows.push({ label: 'Selected parcel soil', value: 'Open a field to see exact soil stats', tone: 'info' });
        nextActions.push('Select a parcel before diagnosing a field-specific soil problem.');
      }
    }

    if (rule.kind === 'generic') {
      rows.push({ label: 'Current era', value: `${context.calendarYear} (${context.eraLabel})`, tone: 'info' });
      nextActions.push('Use the current year and farm state to decide whether this system matters now or later.');
    }
  }

  const uniqueRows = rows.filter((row, index) => rows.findIndex(other => other.label === row.label) === index);
  const uniqueActions = [...new Set(nextActions)];

  return {
    title: 'Your farm right now',
    rows: uniqueRows,
    nextActions: uniqueActions.slice(0, 4),
  };
}

export function getGuideRelatedActions(entry: GuideEntry): GuideRelatedAction[] {
  return entry.relatedEntryIds.map(entryId => ({
    entryId,
    label: 'Open related entry',
  }));
}
