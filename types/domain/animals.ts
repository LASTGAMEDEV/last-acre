export interface ShowEntry {
  animalId: string;
  seasonKey: string;
  entryFee: number;
  enteredDay: number;
}

export interface ShowResult {
  id: string;
  seasonKey: string;
  seasonLabel: string;
  animalId: string;
  animalTypeId: string;
  playerScore: number;
  placement: number;
  prize: number;
  npcScores: number[];
  resolvedDay: number;
}
