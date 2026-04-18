export interface AnimalProductInfo {
  productType: string;
  name: string;
  unit: string;
  basePrice: number;
}

export const ANIMAL_PRODUCTS: AnimalProductInfo[] = [
  { productType: 'eggs', name: 'Eggs',        unit: 'ud', basePrice: 0.18 },
  { productType: 'milk',  name: 'Milk',   unit: 'L',  basePrice: 0.45 },
  { productType: 'honey', name: 'Honey',  unit: 'kg', basePrice: 8.50 },
  { productType: 'wool', name: 'Wool',         unit: 'kg', basePrice: 3.20 },
  { productType: 'meat', name: 'Meat',         unit: 'kg', basePrice: 4.50 },
  { productType: 'cream', name: 'Cream', unit: 'L',  basePrice: 2.80 },
];
