import {
  AncestorRecord,
  Farmer,
  FarmerSkills,
  KnowledgeEntry,
  createInitialFarmer,
} from './dynasty';

function knowledgeBonusSkills(_knowledgeBank: KnowledgeEntry[]): Partial<FarmerSkills> {
  return {};
}

export function buildNextFarmer(
  calendarYear: number,
  knowledgeBank: KnowledgeEntry[],
  ancestorFarmer?: Farmer
): Farmer {
  const base = createInitialFarmer(calendarYear);
  const bonusSkills = knowledgeBonusSkills(knowledgeBank);

  return {
    ...base,
    familyName: ancestorFarmer?.familyName ?? base.familyName,
    skills: {
      crops: Math.min(100, base.skills.crops + (bonusSkills.crops ?? 0)),
      livestock: Math.min(100, base.skills.livestock + (bonusSkills.livestock ?? 0)),
      machinery: Math.min(100, base.skills.machinery + (bonusSkills.machinery ?? 0)),
      finance: Math.min(100, base.skills.finance + (bonusSkills.finance ?? 0)),
      technology: Math.min(100, base.skills.technology + (bonusSkills.technology ?? 0)),
    },
    unlockedKnowledge: [],
    isRetired: false,
  };
}

export function buildAncestorRecord(
  farmer: Farmer,
  cause: AncestorRecord['cause'],
  startYear: number,
  endYear: number,
  legacyContribution: number,
  memorableEvents: string[]
): AncestorRecord {
  return {
    farmer: { ...farmer, isRetired: true },
    startYear,
    endYear,
    cause,
    legacyContribution,
    memorableEvents,
  };
}
