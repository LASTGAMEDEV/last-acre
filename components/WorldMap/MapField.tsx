import React from 'react';
import { G, Path, Text } from 'react-native-svg';
import { MapField as MapFieldType } from '../../types/worldMap';
import { LandParcel } from '../../store/useGameStore';

interface Props {
  field: MapFieldType;
  parcel?: LandParcel;           // linked parcel if player-owned
  isSelected: boolean;
  zoom: number;
  onPress: (id: string) => void;
}

const LABEL_MIN_ZOOM = 0.55; // hide labels when zoomed out too far
const LABEL_MIN_HA   = 18;   // hide labels on tiny fields

function getPatternId(field: MapFieldType, parcel?: LandParcel): string {
  if (field.owner === 'forsale')  return 'p-forsale';
  if (field.owner === 'unowned')  return 'p-unowned';
  if (field.owner === 'rivalA')   return field.labelX % 2 === 0 ? 'p-rivalA' : 'p-rivalA2';
  if (field.owner === 'rivalB')   return field.labelX % 3 === 0 ? 'p-rivalB' : 'p-rivalB2';
  // player
  if (!parcel?.plantedCrop)       return 'p-bare';
  // ready to harvest: planted + growthDays elapsed (passed in from parent or compute here)
  return 'p-player';
}

function getStroke(field: MapFieldType, parcel?: LandParcel): string {
  if (field.owner === 'forsale')  return '#906010';
  if (field.owner === 'unowned')  return '#1a1810';
  if (field.owner === 'rivalA')   return '#6a1818';
  if (field.owner === 'rivalB')   return '#281858';
  if (!parcel?.plantedCrop)       return '#264818';
  return '#286020';
}

function getStrokeDash(field: MapFieldType, parcel?: LandParcel): string | undefined {
  if (field.owner === 'player' && !parcel?.plantedCrop) return '12,6';
  return undefined;
}

export default function MapFieldComponent({ field, parcel, isSelected, zoom, onPress }: Props) {
  const fill   = `url(#${getPatternId(field, parcel)})`;
  const stroke = isSelected ? '#ffe066' : getStroke(field, parcel);
  const strokeW = isSelected ? 2.5 : 1.2;
  const dash   = getStrokeDash(field, parcel);

  const showLabel = zoom >= LABEL_MIN_ZOOM && field.approximateHa >= LABEL_MIN_HA;

  return (
    <G onPress={() => onPress(field.id)}>
      <Path
        d={field.svgPath}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeW / zoom}   // keep visual stroke width constant as zoom changes
        strokeDasharray={dash}
      />
      {showLabel && (
        <Text
          x={field.labelX}
          y={field.labelY}
          fontSize={11 / zoom}
          fill={field.owner === 'player' ? '#4a8a38' : field.owner === 'forsale' ? '#906010' : '#3a3030'}
          textAnchor="middle"
          fontWeight="600"
        >
          {`~${field.approximateHa}ha`}
        </Text>
      )}
    </G>
  );
}
