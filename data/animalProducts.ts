export interface AnimalProductInfo {
  productType: string;
  name: string;
  unit: string;
  basePrice: number;
}

export const ANIMAL_PRODUCTS: AnimalProductInfo[] = [
  { productType: 'eggs', name: 'Eggs',        unit: 'ud', basePrice: 3.50 },
  { productType: 'milk',  name: 'Milk',   unit: 'L',  basePrice: 0.90 },
  { productType: 'honey', name: 'Honey',  unit: 'kg', basePrice: 25.0 },
  { productType: 'wool', name: 'Wool',         unit: 'kg', basePrice: 42.0 },
  { productType: 'meat', name: 'Meat',         unit: 'kg', basePrice: 14.0 },
];
