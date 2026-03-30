import { MapField } from '../types/worldMap';

// Canvas: 1400×1800. River cuts diagonally top-right→bottom-center.
// Route 1 (N-S) at x≈352. Route 2 (E-W) at y≈920. Route 3 (E-W) at y≈1480.
// Fields share borders; river/road strokes (±15px) cover edge tolerance.

export const INITIAL_MAP_FIELDS: MapField[] = [

  // ── NW REGION — Hacienda Rivera territory ─────────────────────────────
  { id:'mf-nw1',  name:'Prado Norte A',     svgPath:'M 0,0 L 172,0 L 170,222 L 0,220 Z',           approximateHa:38,  labelX:86,  labelY:111, owner:'rivalA',  fertility:72, scouted:false },
  { id:'mf-nw2',  name:'Prado Norte B',     svgPath:'M 172,0 L 352,0 L 352,222 L 170,222 Z',        approximateHa:40,  labelX:262, labelY:111, owner:'rivalA',  fertility:68, scouted:false },
  { id:'mf-nw3',  name:'Loma Noroeste A',   svgPath:'M 0,220 L 170,220 L 172,442 L 0,440 Z',        approximateHa:37,  labelX:86,  labelY:331, owner:'rivalA',  fertility:65, scouted:false },
  { id:'mf-nw4',  name:'Loma Noroeste B',   svgPath:'M 170,222 L 352,222 L 352,442 L 172,442 Z',    approximateHa:40,  labelX:262, labelY:332, owner:'rivalA',  fertility:70, scouted:false },
  { id:'mf-nw5',  name:'Franja del Río A',  svgPath:'M 0,440 L 352,440 L 352,582 L 0,580 Z',        approximateHa:50,  labelX:176, labelY:511, owner:'rivalA',  fertility:74, scouted:false },
  { id:'mf-nw6',  name:'Borde Aldea Oeste', svgPath:'M 0,580 L 62,580 L 60,762 L 0,760 Z',          approximateHa:10,  labelX:31,  labelY:671, owner:'unowned', scouted:false },
  { id:'mf-nw7',  name:'Borde Aldea Este',  svgPath:'M 292,582 L 352,582 L 352,762 L 290,760 Z',    approximateHa:10,  labelX:322, labelY:672, owner:'rivalA',  fertility:60, scouted:false },
  { id:'mf-nw8',  name:'Parcela Suroeste A',svgPath:'M 0,760 L 172,760 L 170,922 L 0,920 Z',        approximateHa:28,  labelX:86,  labelY:841, owner:'rivalA',  fertility:66, scouted:false },
  { id:'mf-nw9',  name:'Parcela Suroeste B',svgPath:'M 172,760 L 352,760 L 352,922 L 170,922 Z',    approximateHa:30,  labelX:262, labelY:841, owner:'forsale', fertility:71, askingPrice:19500, scouted:false },

  // ── N-CENTRAL — main farming corridor ─────────────────────────────────
  // Row 1 (y: 0–182)
  { id:'mf-nc1',  name:'Camino Norte A',    svgPath:'M 352,0 L 530,0 L 528,182 L 352,180 Z',        approximateHa:32,  labelX:441, labelY:91,  owner:'rivalA',  fertility:63, scouted:false },
  { id:'mf-nc2',  name:'Camino Norte B',    svgPath:'M 530,0 L 702,0 L 700,182 L 528,182 Z',        approximateHa:31,  labelX:615, labelY:91,  owner:'forsale', fertility:70, askingPrice:20000, scouted:false },
  { id:'mf-nc3',  name:'El Trigal Alto',    svgPath:'M 702,0 L 872,0 L 870,182 L 700,182 Z',        approximateHa:30,  labelX:786, labelY:91,  owner:'player',  fertility:75, parcelId:'p-nc3', scouted:false },
  { id:'mf-nc4',  name:'Colina del Este A', svgPath:'M 872,0 L 1060,0 L 1043,182 L 870,182 Z',      approximateHa:34,  labelX:961, labelY:91,  owner:'rivalB',  fertility:69, scouted:false },

  // Row 2 (y: 182–362)
  { id:'mf-nc5',  name:'Parcela Rivera I',  svgPath:'M 352,180 L 520,180 L 518,362 L 352,360 Z',    approximateHa:30,  labelX:436, labelY:271, owner:'rivalA',  fertility:67, scouted:false },
  { id:'mf-nc6',  name:'Maizal Central',    svgPath:'M 520,182 L 692,182 L 690,362 L 518,362 Z',    approximateHa:31,  labelX:605, labelY:272, owner:'player',  fertility:78, parcelId:'p-nc6', knownCrop:'corn',  scouted:false },
  { id:'mf-nc7',  name:'Trigo del Valle',   svgPath:'M 692,182 L 862,182 L 860,362 L 690,362 Z',    approximateHa:30,  labelX:776, labelY:272, owner:'player',  fertility:65, parcelId:'p-nc7', knownCrop:'wheat', scouted:false },
  { id:'mf-nc8',  name:'Colina del Este B', svgPath:'M 862,182 L 1043,182 L 1025,362 L 860,362 Z',  approximateHa:32,  labelX:948, labelY:272, owner:'rivalB',  fertility:72, scouted:false },

  // Row 3 (y: 362–542)
  { id:'mf-nc9',  name:'Lote Sur A',        svgPath:'M 352,360 L 512,360 L 510,542 L 352,540 Z',    approximateHa:29,  labelX:432, labelY:451, owner:'forsale', fertility:68, askingPrice:18500, scouted:false },
  { id:'mf-nc10', name:'Girasoles',         svgPath:'M 512,362 L 682,362 L 680,542 L 510,542 Z',    approximateHa:31,  labelX:596, labelY:452, owner:'player',  fertility:70, parcelId:'p-nc10', knownCrop:'sunflower', scouted:false },
  { id:'mf-nc11', name:'Parcela Central',   svgPath:'M 682,362 L 852,362 L 850,542 L 680,542 Z',    approximateHa:31,  labelX:766, labelY:452, owner:'player',  fertility:62, parcelId:'p-nc11', scouted:false },
  { id:'mf-nc12', name:'Ladera Norte',      svgPath:'M 852,362 L 1025,362 L 1005,542 L 850,542 Z',  approximateHa:30,  labelX:933, labelY:452, owner:'rivalB',  fertility:74, scouted:false },

  // Row 4 (y: 542–722)
  { id:'mf-nc13', name:'Vega Baja A',       svgPath:'M 352,540 L 502,540 L 500,722 L 352,720 Z',    approximateHa:27,  labelX:427, labelY:631, owner:'player',  fertility:80, parcelId:'p-nc13', scouted:false },
  { id:'mf-nc14', name:'Vega Baja B',       svgPath:'M 502,542 L 672,542 L 670,722 L 500,722 Z',    approximateHa:30,  labelX:586, labelY:632, owner:'player',  fertility:58, parcelId:'p-nc14', knownCrop:'wheat', scouted:false },
  { id:'mf-nc15', name:'Vega Baja C',       svgPath:'M 672,542 L 842,542 L 840,722 L 670,722 Z',    approximateHa:30,  labelX:756, labelY:632, owner:'player',  fertility:71, parcelId:'p-nc15', scouted:false },
  { id:'mf-nc16', name:'Loma del Río I',    svgPath:'M 842,542 L 1005,542 L 987,722 L 840,722 Z',   approximateHa:29,  labelX:919, labelY:632, owner:'rivalB',  fertility:66, scouted:false },

  // Row 5 (y: 722–922)
  { id:'mf-nc17', name:'Sur de la Vía A',   svgPath:'M 352,720 L 490,720 L 488,922 L 352,920 Z',    approximateHa:26,  labelX:421, labelY:821, owner:'player',  fertility:76, parcelId:'p-nc17', scouted:false },
  { id:'mf-nc18', name:'Sur de la Vía B',   svgPath:'M 490,722 L 660,722 L 658,922 L 488,922 Z',    approximateHa:33,  labelX:574, labelY:822, owner:'player',  fertility:69, parcelId:'p-nc18', scouted:false },
  { id:'mf-nc19', name:'Sur de la Vía C',   svgPath:'M 660,722 L 830,722 L 828,922 L 658,922 Z',    approximateHa:33,  labelX:744, labelY:822, owner:'forsale', fertility:63, askingPrice:21000, scouted:false },
  { id:'mf-nc20', name:'Margen del Río I',  svgPath:'M 830,722 L 987,722 L 963,922 L 828,922 Z',    approximateHa:30,  labelX:902, labelY:822, owner:'rivalB',  fertility:70, scouted:false },

  // ── NE REGION — Granja del Norte territory (right of river) ───────────
  { id:'mf-ne1',  name:'Campo Norte A',     svgPath:'M 1060,0 L 1222,0 L 1220,202 L 1043,202 Z',    approximateHa:32,  labelX:1136,labelY:101, owner:'rivalB',  fertility:68, scouted:false },
  { id:'mf-ne2',  name:'Campo Norte B',     svgPath:'M 1222,0 L 1400,0 L 1400,202 L 1220,202 Z',    approximateHa:36,  labelX:1311,labelY:101, owner:'rivalB',  fertility:72, scouted:false },
  { id:'mf-ne3',  name:'Llanura Este A',    svgPath:'M 1043,202 L 1202,202 L 1200,402 L 1022,402 Z', approximateHa:31,  labelX:1117,labelY:302, owner:'rivalB',  fertility:65, scouted:false },
  { id:'mf-ne4',  name:'Llanura Este B',    svgPath:'M 1202,202 L 1400,202 L 1400,402 L 1200,402 Z', approximateHa:40,  labelX:1301,labelY:302, owner:'rivalB',  fertility:70, scouted:false },
  { id:'mf-ne5',  name:'Pradera Este A',    svgPath:'M 1022,402 L 1182,402 L 1180,602 L 1002,602 Z', approximateHa:32,  labelX:1097,labelY:502, owner:'forsale', fertility:74, askingPrice:21000, scouted:false },
  { id:'mf-ne6',  name:'Pradera Este B',    svgPath:'M 1182,402 L 1400,402 L 1400,602 L 1180,602 Z', approximateHa:44,  labelX:1291,labelY:502, owner:'rivalB',  fertility:67, scouted:false },
  { id:'mf-ne7',  name:'Terreno Este A',    svgPath:'M 1002,602 L 1162,602 L 1160,802 L 982,802 Z',  approximateHa:32,  labelX:1077,labelY:702, owner:'rivalB',  fertility:62, scouted:false },
  { id:'mf-ne8',  name:'Terreno Este B',    svgPath:'M 1162,602 L 1400,602 L 1400,802 L 1160,802 Z', approximateHa:48,  labelX:1281,labelY:702, owner:'rivalB',  fertility:69, scouted:false },
  { id:'mf-ne9',  name:'Borde Sur NE A',    svgPath:'M 982,802 L 1162,802 L 1160,922 L 963,922 Z',   approximateHa:23,  labelX:1067,labelY:862, owner:'rivalB',  fertility:71, scouted:false },
  { id:'mf-ne10', name:'Borde Sur NE B',    svgPath:'M 1162,802 L 1400,802 L 1400,922 L 1160,922 Z', approximateHa:28,  labelX:1281,labelY:862, owner:'forsale', fertility:66, askingPrice:18000, scouted:false },
];
