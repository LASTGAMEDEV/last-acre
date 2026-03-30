export interface AttachmentType {
  id: string;
  name: string;
  cost: number;
  operation: 'till' | 'plant' | 'spray';
  size: 'small' | 'medium' | 'large';
  haPerDay: number;
  compatibleTractorSizes: ('small' | 'medium' | 'large')[];
}

export const ATTACHMENT_TYPES: AttachmentType[] = [
  // Cultivators (Till)
  { id: 'cultivator-small',  name: 'Small Cultivator',  cost: 5000,  operation: 'till',  size: 'small',  haPerDay: 2,  compatibleTractorSizes: ['small', 'medium'] },
  { id: 'cultivator-medium', name: 'Medium Cultivator', cost: 11000, operation: 'till',  size: 'medium', haPerDay: 5,  compatibleTractorSizes: ['medium', 'large'] },
  { id: 'cultivator-large',  name: 'Large Cultivator',  cost: 25000, operation: 'till',  size: 'large',  haPerDay: 12, compatibleTractorSizes: ['large'] },
  // Planters
  { id: 'planter-small',     name: 'Small Planter',     cost: 6500,  operation: 'plant', size: 'small',  haPerDay: 4,  compatibleTractorSizes: ['small', 'medium'] },
  { id: 'planter-medium',    name: 'Medium Planter',    cost: 15000, operation: 'plant', size: 'medium', haPerDay: 10, compatibleTractorSizes: ['medium', 'large'] },
  { id: 'planter-large',     name: 'Large Planter',     cost: 32000, operation: 'plant', size: 'large',  haPerDay: 22, compatibleTractorSizes: ['large'] },
  // Sprayers
  { id: 'sprayer-small',     name: 'Small Sprayer',     cost: 4000,  operation: 'spray', size: 'small',  haPerDay: 6,  compatibleTractorSizes: ['small', 'medium'] },
  { id: 'sprayer-medium',    name: 'Medium Sprayer',    cost: 9500,  operation: 'spray', size: 'medium', haPerDay: 15, compatibleTractorSizes: ['medium', 'large'] },
  { id: 'sprayer-large',     name: 'Large Sprayer',     cost: 22000, operation: 'spray', size: 'large',  haPerDay: 35, compatibleTractorSizes: ['large'] },
];
