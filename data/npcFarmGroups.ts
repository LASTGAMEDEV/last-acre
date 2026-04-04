// data/npcFarmGroups.ts
import { MapOwner } from '../types/worldMap';

/** Maps each NPC farm id to its map-owner group. */
export const NPC_FARM_GROUP: Record<string, 'rivalA' | 'rivalB'> = {
  npc_rivera:    'rivalA',
  npc_verde:     'rivalA',
  npc_sierra:    'rivalA',
  npc_golden:    'rivalB',
  npc_altavista: 'rivalB',
};

/** Human-readable display name for each rival group. */
export const RIVAL_GROUP_NAME: Record<'rivalA' | 'rivalB', string> = {
  rivalA: 'Hacienda Rivera',
  rivalB: 'Granja del Norte',
};
