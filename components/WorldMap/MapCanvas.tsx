import React from 'react';
import { Svg, Path, Rect, Ellipse, Circle, Text } from 'react-native-svg';
import MapPatterns from './mapPatterns';
import MapFieldComponent from './MapField';
import { MapField } from '../../types/worldMap';
import { LandParcel } from '../../store/useGameStore';

export const CANVAS_W = 1400;
export const CANVAS_H = 1800;

interface Props {
  fields: MapField[];
  parcels: LandParcel[];
  selectedId: string | null;
  zoom: number;
  onFieldPress: (id: string) => void;
}

export default function MapCanvas({ fields, parcels, selectedId, zoom, onFieldPress }: Props) {
  const parcelMap = React.useMemo(() => {
    const m: Record<string, LandParcel> = {};
    parcels.forEach(p => { m[p.id] = p; });
    return m;
  }, [parcels]);

  return (
    <Svg width={CANVAS_W} height={CANVAS_H}>
      <MapPatterns />

      {/* Ground base */}
      <Rect width={CANVAS_W} height={CANVAS_H} fill="url(#soil)"/>

      {/* ── Fields ── */}
      {fields.map(field => (
        <MapFieldComponent
          key={field.id}
          field={field}
          parcel={field.parcelId ? parcelMap[field.parcelId] : undefined}
          isSelected={selectedId === field.id}
          zoom={zoom}
          onPress={onFieldPress}
        />
      ))}

      {/* ── River ── */}
      <Path
        d="M 1060,0 Q 1020,400 980,800 Q 940,1100 880,1400 Q 820,1620 640,1800"
        fill="none" stroke="#030c16" strokeWidth={32} strokeLinecap="round"/>
      <Path
        d="M 1060,0 Q 1020,400 980,800 Q 940,1100 880,1400 Q 820,1620 640,1800"
        fill="none" stroke="#09355a" strokeWidth={20} strokeLinecap="round"/>
      <Path
        d="M 1060,0 Q 1020,400 980,800 Q 940,1100 880,1400 Q 820,1620 640,1800"
        fill="none" stroke="#0c4a78" strokeWidth={11} strokeLinecap="round"/>
      <Path
        d="M 1059,0 Q 1019,400 979,800 Q 939,1100 879,1400 Q 819,1620 639,1800"
        fill="none" stroke="#1260a0" strokeWidth={5} strokeLinecap="round" opacity={0.7}/>
      {/* River label */}
      <Text
        x={1020} y={600}
        fontSize={14}
        fill="#0c4a78"
        fontStyle="italic"
        opacity={0.9}
        rotation={-72}
        origin="1020,600"
      >
        Río Grande
      </Text>


      {/* ── Route 1 (N-S) ── */}
      <Path
        d="M 352,0 Q 356,460 350,920 Q 346,1210 352,1480 Q 355,1640 352,1800"
        fill="none" stroke="#111820" strokeWidth={9} strokeLinecap="round"/>
      <Path
        d="M 352,0 Q 356,460 350,920 Q 346,1210 352,1480 Q 355,1640 352,1800"
        fill="none" stroke="#1c2430" strokeWidth={2.5} strokeDasharray="16,10" opacity={0.4}/>

      {/* ── Route 2 (E-W) ── */}
      <Path
        d="M 0,918 Q 180,922 352,918 Q 600,912 800,918 Q 1000,924 1200,918 L 1400,920"
        fill="none" stroke="#111820" strokeWidth={9} strokeLinecap="round"/>
      <Path
        d="M 0,918 Q 180,922 352,918 Q 600,912 800,918 Q 1000,924 1200,918 L 1400,920"
        fill="none" stroke="#1c2430" strokeWidth={2.5} strokeDasharray="16,10" opacity={0.4}/>

      {/* ── Route 3 (E-W) ── */}
      <Path
        d="M 0,1478 Q 200,1482 352,1478 Q 600,1474 800,1480 Q 1000,1484 1200,1479 L 1400,1480"
        fill="none" stroke="#111820" strokeWidth={8} strokeLinecap="round"/>
      <Path
        d="M 0,1478 Q 200,1482 352,1478 Q 600,1474 800,1480 Q 1000,1484 1200,1479 L 1400,1480"
        fill="none" stroke="#1c2430" strokeWidth={2} strokeDasharray="14,9" opacity={0.4}/>

      {/* ── Bridge at Route 2 × River ── */}
      <Rect x={966} y={911} width={34} height={12} rx={2} fill="#1c2632" stroke="#283444" strokeWidth={1.5}/>
      <Rect x={968} y={908} width={4} height={7} fill="#1e2838"/>
      <Rect x={994} y={908} width={4} height={7} fill="#1e2838"/>

      {/* ── Main Town ── */}
      {/* Town roads */}
      <Path d="M 600,1002 Q 608,1060 612,1120 Q 618,1180 614,1240 Q 610,1300 608,1360 Q 606,1410 605,1480"
        fill="none" stroke="#131c24" strokeWidth={8}/>
      <Path d="M 780,1002 Q 784,1060 786,1130 Q 788,1200 784,1270 Q 780,1340 778,1410 Q 776,1448 776,1480"
        fill="none" stroke="#131c24" strokeWidth={7}/>
      <Path d="M 480,1150 Q 560,1148 612,1152 Q 700,1155 780,1150 Q 850,1146 960,1150"
        fill="none" stroke="#131c24" strokeWidth={7}/>
      <Path d="M 480,1320 Q 560,1318 612,1322 Q 700,1325 780,1320 Q 850,1316 960,1320"
        fill="none" stroke="#131c24" strokeWidth={6}/>

      {/* Town buildings */}
      {/* Market */}
      <Rect x={488} y={1010} width={50} height={36} rx={2} fill="#0e1a28" stroke="#1a2e44" strokeWidth={1}/>
      <Text x={513} y={1031} fontSize={9} fill="#2a5068" textAnchor="middle" fontWeight="600">MARKET</Text>
      {/* Grain silos (tall thin rects) */}
      <Rect x={548} y={1006} width={12} height={38} rx={2} fill="#0d1c10" stroke="#182e18" strokeWidth={1}/>
      <Rect x={562} y={1008} width={11} height={36} rx={2} fill="#0d1c10" stroke="#182e18" strokeWidth={1}/>
      <Rect x={575} y={1010} width={10} height={34} rx={2} fill="#0d1c10" stroke="#182e18" strokeWidth={1}/>
      <Text x={563} y={1050} fontSize={8} fill="#1e4020" textAnchor="middle">SILOS</Text>
      {/* Bank */}
      <Rect x={622} y={1010} width={44} height={32} rx={2} fill="#181028" stroke="#241840" strokeWidth={1}/>
      <Text x={644} y={1029} fontSize={9} fill="#3a2870" textAnchor="middle">BANK</Text>
      {/* Church */}
      <Rect x={680} y={1014} width={28} height={30} rx={1} fill="#10101e" stroke="#1c1c2e" strokeWidth={1}/>
      <Path d="M 680,1014 L 694,1002 L 708,1014" fill="#10101e" stroke="#1c1c2e" strokeWidth={1}/>
      <Text x={694} y={1052} fontSize={7} fill="#2a2a50" textAnchor="middle">CHURCH</Text>
      {/* Dealer */}
      <Rect x={490} y={1160} width={42} height={26} rx={2} fill="#1e1008" stroke="#2e1810" strokeWidth={1}/>
      <Text x={511} y={1176} fontSize={8} fill="#503820" textAnchor="middle">DEALER</Text>
      {/* Repair */}
      <Rect x={540} y={1162} width={32} height={24} rx={2} fill="#141414" stroke="#202020" strokeWidth={1}/>
      <Text x={556} y={1177} fontSize={7} fill="#404040" textAnchor="middle">REPAIR</Text>
      {/* Agro Supply */}
      <Rect x={630} y={1160} width={50} height={26} rx={2} fill="#0e1e10" stroke="#182e18" strokeWidth={1}/>
      <Text x={655} y={1176} fontSize={8} fill="#2a5028" textAnchor="middle">AGRO SUPPLY</Text>
      {/* Residential rows */}
      {[0,1,2,3].map(i => (
        <Rect key={`rh1-${i}`} x={490+i*22} y={1330} width={18} height={14} rx={1} fill="#0e0e18" stroke="#161620" strokeWidth={0.8}/>
      ))}
      {[0,1,2,3,4].map(i => (
        <Rect key={`rh2-${i}`} x={640+i*22} y={1330} width={18} height={14} rx={1} fill="#0e0e18" stroke="#161620" strokeWidth={0.8}/>
      ))}
      {[0,1,2,3].map(i => (
        <Rect key={`rh3-${i}`} x={790+i*22} y={1330} width={18} height={14} rx={1} fill="#0e0e18" stroke="#161620" strokeWidth={0.8}/>
      ))}
      {/* Town trees */}
      {([[625,1120],[760,1120],[870,1120],[625,1295],[760,1295],[870,1295]] as [number,number][]).map(([cx,cy],i) => (
        <Circle key={`tree-${i}`} cx={cx} cy={cy} r={8} fill="#0b180a" stroke="#122010" strokeWidth={1}/>
      ))}
      {/* Town name */}
      <Text x={720} y={992} fontSize={13} fill="#1a2c3e" textAnchor="middle" fontWeight="700" letterSpacing={2}>
        MARKET TOWN
      </Text>

      {/* ── Village (NW area) ── */}
      <Path d="M 62,580 Q 80,582 130,580 Q 180,578 230,580 Q 265,582 290,582"
        fill="none" stroke="#111820" strokeWidth={5}/>
      <Path d="M 176,580 Q 178,620 176,660 Q 174,700 176,760"
        fill="none" stroke="#111820" strokeWidth={5}/>
      {/* Village buildings */}
      <Rect x={70} y={588} width={28} height={20} rx={1} fill="#0e1820" stroke="#1a2838" strokeWidth={0.9}/>
      <Text x={84} y={601} fontSize={7} fill="#2a4060" textAnchor="middle">MARKET</Text>
      <Rect x={108} y={590} width={24} height={18} rx={1} fill="#141014" stroke="#201820" strokeWidth={0.9}/>
      <Text x={120} y={601} fontSize={6} fill="#382030" textAnchor="middle">INN</Text>
      <Rect x={140} y={592} width={20} height={16} rx={1} fill="#10101e" stroke="#1a1a2e" strokeWidth={0.9}/>
      <Path d="M 140,592 L 150,585 L 160,592" fill="#10101e" stroke="#1a1a2e" strokeWidth={0.9}/>
      {[0,1,2].map(i => (
        <Rect key={`vh-${i}`} x={186} y={590+i*28} width={16} height={20} rx={1} fill="#0e100e" stroke="#161816" strokeWidth={0.8}/>
      ))}
      {[0,1].map(i => (
        <Rect key={`vh2-${i}`} x={230} y={596+i*30} width={14} height={18} rx={1} fill="#0e100e" stroke="#161816" strokeWidth={0.8}/>
      ))}
      <Text x={176} y={577} fontSize={8} fill="#182430" textAnchor="middle" fontWeight="600" letterSpacing={1}>
        ALDEA
      </Text>

      {/* ── Compass ── */}
      <Text x={1382} y={20} fontSize={11} fill="#182030" textAnchor="middle" fontWeight="700">N</Text>
      <Path d="M 1382,22 L 1378,34 L 1382,32 L 1386,34 Z" fill="#182030"/>
    </Svg>
  );
}
