import { MapField } from '../types/worldMap';

// Canvas: 1400×1800. River cuts diagonally top-right→bottom-center.
// Route 1 (N-S) at x≈352. Route 2 (E-W) at y≈920. Route 3 (E-W) at y≈1480.
// Fields share borders; river/road strokes (±15px) cover edge tolerance.
// Asking prices: linear scale fertility 58→$15k, 82→$25k (±$500 increments).

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
  { id:'mf-nw9',  name:'Parcela Suroeste B',svgPath:'M 172,760 L 352,760 L 352,922 L 170,922 Z',    approximateHa:30,  labelX:262, labelY:841, owner:'forsale', fertility:71, askingPrice:20500, scouted:false },

  // ── N-CENTRAL — main farming corridor ─────────────────────────────────
  // Row 1 (y: 0–182)
  { id:'mf-nc1',  name:'Camino Norte A',    svgPath:'M 352,0 L 530,0 L 528,182 L 352,180 Z',        approximateHa:32,  labelX:441, labelY:91,  owner:'rivalA',  fertility:63, scouted:false },
  { id:'mf-nc2',  name:'Camino Norte B',    svgPath:'M 530,0 L 702,0 L 700,182 L 528,182 Z',        approximateHa:31,  labelX:615, labelY:91,  owner:'forsale', fertility:70, askingPrice:20000, scouted:false },
  { id:'mf-nc3',  name:'El Trigal Alto',    svgPath:'M 702,0 L 872,0 L 870,182 L 700,182 Z',        approximateHa:30,  labelX:786, labelY:91,  owner:'forsale', fertility:75, askingPrice:22000, scouted:false },
  { id:'mf-nc4',  name:'Colina del Este A', svgPath:'M 872,0 L 1060,0 L 1043,182 L 870,182 Z',      approximateHa:34,  labelX:961, labelY:91,  owner:'rivalB',  fertility:69, scouted:false },

  // Row 2 (y: 182–362)
  { id:'mf-nc5',  name:'Parcela Rivera I',  svgPath:'M 352,180 L 520,180 L 518,362 L 352,360 Z',    approximateHa:30,  labelX:436, labelY:271, owner:'rivalA',  fertility:67, scouted:false },
  { id:'mf-nc6',  name:'Maizal Central',    svgPath:'M 520,182 L 692,182 L 690,362 L 518,362 Z',    approximateHa:31,  labelX:605, labelY:272, owner:'player',  fertility:78, parcelId:'p-nc6', knownCrop:'corn',  scouted:false },
  { id:'mf-nc7',  name:'Trigo del Valle',   svgPath:'M 692,182 L 862,182 L 860,362 L 690,362 Z',    approximateHa:30,  labelX:776, labelY:272, owner:'player',  fertility:65, parcelId:'p-nc7', knownCrop:'wheat', scouted:false },
  { id:'mf-nc8',  name:'Colina del Este B', svgPath:'M 862,182 L 1043,182 L 1025,362 L 860,362 Z',  approximateHa:32,  labelX:948, labelY:272, owner:'rivalB',  fertility:72, scouted:false },

  // Row 3 (y: 362–542)
  { id:'mf-nc9',  name:'Lote Sur A',        svgPath:'M 352,360 L 512,360 L 510,542 L 352,540 Z',    approximateHa:29,  labelX:432, labelY:451, owner:'forsale', fertility:68, askingPrice:19000, scouted:false },
  { id:'mf-nc10', name:'Girasoles',         svgPath:'M 512,362 L 682,362 L 680,542 L 510,542 Z',    approximateHa:31,  labelX:596, labelY:452, owner:'forsale', fertility:70, askingPrice:20000, scouted:false },
  { id:'mf-nc11', name:'Parcela Central',   svgPath:'M 682,362 L 852,362 L 850,542 L 680,542 Z',    approximateHa:31,  labelX:766, labelY:452, owner:'forsale', fertility:62, askingPrice:16500, scouted:false },
  { id:'mf-nc12', name:'Ladera Norte',      svgPath:'M 852,362 L 1025,362 L 1005,542 L 850,542 Z',  approximateHa:30,  labelX:933, labelY:452, owner:'rivalB',  fertility:74, scouted:false },

  // Row 4 (y: 542–722)
  { id:'mf-nc13', name:'Vega Baja A',       svgPath:'M 352,540 L 502,540 L 500,722 L 352,720 Z',    approximateHa:27,  labelX:427, labelY:631, owner:'forsale', fertility:80, askingPrice:24000, scouted:false },
  { id:'mf-nc14', name:'Vega Baja B',       svgPath:'M 502,542 L 672,542 L 670,722 L 500,722 Z',    approximateHa:30,  labelX:586, labelY:632, owner:'forsale', fertility:58, askingPrice:15000, scouted:false },
  { id:'mf-nc15', name:'Vega Baja C',       svgPath:'M 672,542 L 842,542 L 840,722 L 670,722 Z',    approximateHa:30,  labelX:756, labelY:632, owner:'forsale', fertility:71, askingPrice:20500, scouted:false },
  { id:'mf-nc16', name:'Loma del Río I',    svgPath:'M 842,542 L 1005,542 L 987,722 L 840,722 Z',   approximateHa:29,  labelX:919, labelY:632, owner:'rivalB',  fertility:66, scouted:false },

  // Row 5 (y: 722–922)
  { id:'mf-nc17', name:'Sur de la Vía A',   svgPath:'M 352,720 L 490,720 L 488,922 L 352,920 Z',    approximateHa:26,  labelX:421, labelY:821, owner:'forsale', fertility:76, askingPrice:22500, scouted:false },
  { id:'mf-nc18', name:'Sur de la Vía B',   svgPath:'M 490,722 L 660,722 L 658,922 L 488,922 Z',    approximateHa:33,  labelX:574, labelY:822, owner:'forsale', fertility:69, askingPrice:19500, scouted:false },
  { id:'mf-nc19', name:'Sur de la Vía C',   svgPath:'M 660,722 L 830,722 L 828,922 L 658,922 Z',    approximateHa:33,  labelX:744, labelY:822, owner:'forsale', fertility:63, askingPrice:17000, scouted:false },
  { id:'mf-nc20', name:'Margen del Río I',  svgPath:'M 830,722 L 987,722 L 963,922 L 828,922 Z',    approximateHa:30,  labelX:902, labelY:822, owner:'rivalB',  fertility:70, scouted:false },

  // ── NE REGION — Granja del Norte territory (right of river) ───────────
  { id:'mf-ne1',  name:'Campo Norte A',     svgPath:'M 1060,0 L 1222,0 L 1220,202 L 1043,202 Z',    approximateHa:32,  labelX:1136,labelY:101, owner:'rivalB',  fertility:68, scouted:false },
  { id:'mf-ne2',  name:'Campo Norte B',     svgPath:'M 1222,0 L 1400,0 L 1400,202 L 1220,202 Z',    approximateHa:36,  labelX:1311,labelY:101, owner:'rivalB',  fertility:72, scouted:false },
  { id:'mf-ne3',  name:'Llanura Este A',    svgPath:'M 1043,202 L 1202,202 L 1200,402 L 1022,402 Z', approximateHa:31,  labelX:1117,labelY:302, owner:'rivalB',  fertility:65, scouted:false },
  { id:'mf-ne4',  name:'Llanura Este B',    svgPath:'M 1202,202 L 1400,202 L 1400,402 L 1200,402 Z', approximateHa:40,  labelX:1301,labelY:302, owner:'rivalB',  fertility:70, scouted:false },
  { id:'mf-ne5',  name:'Pradera Este A',    svgPath:'M 1022,402 L 1182,402 L 1180,602 L 1002,602 Z', approximateHa:32,  labelX:1097,labelY:502, owner:'forsale', fertility:74, askingPrice:21500, scouted:false },
  { id:'mf-ne6',  name:'Pradera Este B',    svgPath:'M 1182,402 L 1400,402 L 1400,602 L 1180,602 Z', approximateHa:44,  labelX:1291,labelY:502, owner:'rivalB',  fertility:67, scouted:false },
  { id:'mf-ne7',  name:'Terreno Este A',    svgPath:'M 1002,602 L 1162,602 L 1160,802 L 982,802 Z',  approximateHa:32,  labelX:1077,labelY:702, owner:'rivalB',  fertility:62, scouted:false },
  { id:'mf-ne8',  name:'Terreno Este B',    svgPath:'M 1162,602 L 1400,602 L 1400,802 L 1160,802 Z', approximateHa:48,  labelX:1281,labelY:702, owner:'rivalB',  fertility:69, scouted:false },
  { id:'mf-ne9',  name:'Borde Sur NE A',    svgPath:'M 982,802 L 1162,802 L 1160,922 L 963,922 Z',   approximateHa:23,  labelX:1067,labelY:862, owner:'rivalB',  fertility:71, scouted:false },
  { id:'mf-ne10', name:'Borde Sur NE B',    svgPath:'M 1162,802 L 1400,802 L 1400,922 L 1160,922 Z', approximateHa:28,  labelX:1281,labelY:862, owner:'forsale', fertility:66, askingPrice:18500, scouted:false },

  // ── SW REGION — unowned wilderness, left of Route 1 ───────────────────
  { id:'mf-sw1',  name:'Pampa Oeste A',     svgPath:'M 0,920 L 182,920 L 180,1082 L 0,1080 Z',      approximateHa:29,  labelX:91,  labelY:1001,owner:'unowned', scouted:false },
  { id:'mf-sw2',  name:'Pampa Oeste B',     svgPath:'M 182,920 L 352,920 L 352,1082 L 180,1082 Z',  approximateHa:30,  labelX:267, labelY:1001,owner:'unowned', scouted:false },
  { id:'mf-sw3',  name:'Ribera del Lago A', svgPath:'M 0,1080 L 182,1080 L 180,1262 L 0,1260 Z',    approximateHa:33,  labelX:91,  labelY:1171,owner:'unowned', scouted:false },
  { id:'mf-sw4',  name:'Ribera del Lago B', svgPath:'M 182,1082 L 352,1082 L 352,1262 L 180,1262 Z',approximateHa:31,  labelX:267, labelY:1172,owner:'unowned', scouted:false },
  { id:'mf-sw5',  name:'Huerta Sur A',      svgPath:'M 0,1260 L 182,1260 L 180,1482 L 0,1480 Z',    approximateHa:40,  labelX:91,  labelY:1371,owner:'unowned', scouted:false },
  { id:'mf-sw6',  name:'Huerta Sur B',      svgPath:'M 182,1262 L 352,1262 L 352,1482 L 180,1482 Z',approximateHa:38,  labelX:267, labelY:1372,owner:'forsale', fertility:79, askingPrice:23500, scouted:false },
  { id:'mf-sw7',  name:'Finca Baja A',      svgPath:'M 0,1480 L 182,1480 L 180,1642 L 0,1640 Z',    approximateHa:29,  labelX:91,  labelY:1561,owner:'unowned', scouted:false },
  { id:'mf-sw8',  name:'Finca Baja B',      svgPath:'M 182,1482 L 352,1482 L 352,1642 L 180,1642 Z',approximateHa:29,  labelX:267, labelY:1562,owner:'unowned', scouted:false },
  { id:'mf-sw9',  name:'Llano Sur A',       svgPath:'M 0,1640 L 182,1640 L 180,1800 L 0,1800 Z',    approximateHa:29,  labelX:91,  labelY:1720,owner:'unowned', scouted:false },
  { id:'mf-sw10', name:'Llano Sur B',       svgPath:'M 182,1642 L 352,1642 L 352,1800 L 180,1800 Z',approximateHa:29,  labelX:267, labelY:1721,owner:'unowned', scouted:false },

  // ── AROUND TOWN (y: 920–1480, flanking the market town) ───────────────
  { id:'mf-st1',  name:'Acceso Norte A',    svgPath:'M 352,920 L 482,920 L 480,1002 L 352,1000 Z',  approximateHa:10,  labelX:417, labelY:961, owner:'forsale', fertility:76, askingPrice:22500, scouted:false },
  { id:'mf-st2',  name:'Acceso Norte B',    svgPath:'M 482,920 L 722,920 L 720,1002 L 480,1002 Z',  approximateHa:20,  labelX:601, labelY:961, owner:'forsale', fertility:71, askingPrice:20500, scouted:false },
  { id:'mf-st3',  name:'Borde Río Norte',   svgPath:'M 722,920 L 963,920 L 959,1002 L 720,1002 Z',  approximateHa:20,  labelX:841, labelY:961, owner:'rivalB',  fertility:64, scouted:false },
  { id:'mf-st4',  name:'Banda Oeste Town',  svgPath:'M 352,1000 L 482,1000 L 480,1482 L 352,1480 Z',approximateHa:60,  labelX:417, labelY:1241,owner:'forsale', fertility:74, askingPrice:21500, scouted:false },

  // ── SOUTH OF TOWN (y: 1480–1800, between Route 1 and river) ───────────
  { id:'mf-sc1',  name:'Vega Sur A',        svgPath:'M 352,1480 L 562,1480 L 557,1642 L 352,1640 Z',approximateHa:33,  labelX:456, labelY:1561,owner:'unowned', scouted:false },
  { id:'mf-sc2',  name:'Vega Sur B',        svgPath:'M 562,1482 L 722,1482 L 718,1642 L 557,1642 Z',approximateHa:25,  labelX:640, labelY:1562,owner:'unowned', scouted:false },
  { id:'mf-sc3',  name:'Margen del Río II', svgPath:'M 722,1482 L 862,1482 L 792,1642 L 718,1642 Z',approximateHa:20,  labelX:774, labelY:1562,owner:'forsale', fertility:67, askingPrice:18500, scouted:false },
  { id:'mf-sc4',  name:'Llano Profundo A',  svgPath:'M 352,1640 L 557,1640 L 550,1800 L 352,1800 Z',approximateHa:30,  labelX:453, labelY:1720,owner:'unowned', scouted:false },
  { id:'mf-sc5',  name:'Llano Profundo B',  svgPath:'M 557,1642 L 718,1642 L 682,1800 L 550,1800 Z',approximateHa:25,  labelX:627, labelY:1721,owner:'unowned', scouted:false },
  { id:'mf-sc6',  name:'Punta del Río',     svgPath:'M 718,1642 L 792,1642 L 640,1800 L 682,1800 Z',approximateHa:18,  labelX:708, labelY:1721,owner:'forsale', fertility:62, askingPrice:16500, scouted:false },

  // ── SE REGION — Granja del Norte south, right of river ─────────────────
  { id:'mf-se1',  name:'Campiña SE A',      svgPath:'M 963,920 L 1162,920 L 1158,1082 L 945,1082 Z', approximateHa:31,  labelX:1057,labelY:1001,owner:'rivalB',  fertility:69, scouted:false },
  { id:'mf-se2',  name:'Campiña SE B',      svgPath:'M 1162,920 L 1400,920 L 1400,1082 L 1158,1082 Z',approximateHa:42, labelX:1280,labelY:1001,owner:'rivalB',  fertility:65, scouted:false },
  { id:'mf-se3',  name:'Llanura SE A',      svgPath:'M 945,1082 L 1122,1082 L 1118,1262 L 925,1262 Z',approximateHa:31, labelX:1028,labelY:1172,owner:'rivalB',  fertility:72, scouted:false },
  { id:'mf-se4',  name:'Llanura SE B',      svgPath:'M 1122,1082 L 1400,1082 L 1400,1262 L 1118,1262 Z',approximateHa:50,labelX:1260,labelY:1172,owner:'forsale', fertility:70, askingPrice:20000, scouted:false },
  { id:'mf-se5',  name:'Terreno SE A',      svgPath:'M 925,1262 L 1092,1262 L 1088,1482 L 882,1482 Z', approximateHa:32, labelX:997, labelY:1372,owner:'rivalB',  fertility:67, scouted:false },
  { id:'mf-se6',  name:'Terreno SE B',      svgPath:'M 1092,1262 L 1242,1262 L 1238,1482 L 1088,1482 Z',approximateHa:30,labelX:1165,labelY:1372,owner:'rivalB',  fertility:63, scouted:false },
  { id:'mf-se7',  name:'Terreno SE C',      svgPath:'M 1242,1262 L 1400,1262 L 1400,1482 L 1238,1482 Z',approximateHa:30,labelX:1320,labelY:1372,owner:'forsale', fertility:71, askingPrice:20500, scouted:false },
  { id:'mf-se8',  name:'Sur Profundo A',    svgPath:'M 882,1482 L 1062,1482 L 1058,1642 L 802,1642 Z', approximateHa:32, labelX:951, labelY:1562,owner:'rivalB',  fertility:68, scouted:false },
  { id:'mf-se9',  name:'Sur Profundo B',    svgPath:'M 1062,1482 L 1400,1482 L 1400,1642 L 1058,1642 Z',approximateHa:36,labelX:1230,labelY:1562,owner:'rivalB',  fertility:64, scouted:false },
  { id:'mf-se10', name:'Extremo Sur A',     svgPath:'M 802,1642 L 1058,1642 L 1052,1800 L 640,1800 Z', approximateHa:42, labelX:888, labelY:1721,owner:'unowned', scouted:false },
  { id:'mf-se11', name:'Extremo Sur B',     svgPath:'M 1058,1642 L 1400,1642 L 1400,1800 L 1052,1800 Z',approximateHa:38,labelX:1228,labelY:1721,owner:'rivalB',  fertility:60, scouted:false },
];
