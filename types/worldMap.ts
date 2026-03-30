export type MapOwner = 'player' | 'rivalA' | 'rivalB' | 'forsale' | 'unowned';

export interface MapField {
  id: string;            // e.g. 'mf-nw1'
  name: string;          // e.g. 'North Meadow'
  svgPath: string;       // SVG path d= string
  approximateHa: number; // rounded, never exact
  labelX: number;        // centroid x for label placement
  labelY: number;        // centroid y for label placement
  owner: MapOwner;
  parcelId?: string;     // set when owner === 'player', links to LandParcel.id
  fertility?: number;    // 0–100
  askingPrice?: number;  // set when owner === 'forsale'
  knownCrop?: string;    // cropType id; undefined for rivals unless scouted
  scouted: boolean;
  scoutExpiresDay?: number;
}
