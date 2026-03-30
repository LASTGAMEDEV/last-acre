import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { MapField } from '../../types/worldMap';
import { CANVAS_W, CANVAS_H } from './MapCanvas';

const MINI_W = 88;
const MINI_H = 112;
const SX = MINI_W / CANVAS_W;   // 0.0629
const SY = MINI_H / CANVAS_H;   // 0.0622

const OWNER_COLOR: Record<string, string> = {
  player:  '#3a8a28',
  rivalA:  '#8a1818',
  rivalB:  '#281878',
  forsale: '#8a6010',
  unowned: '#2a2818',
};

interface Props {
  fields: MapField[];
  translateX: number;   // current animated pan X (screen coords)
  translateY: number;
  zoom: number;
  screenW: number;
  screenH: number;
  onTap: (canvasX: number, canvasY: number) => void;
}

export default function MiniMap({ fields, translateX, translateY, zoom, screenW, screenH, onTap }: Props) {
  // Viewport rectangle in canvas space
  const vpLeft   = -translateX / zoom;
  const vpTop    = -translateY / zoom;
  const vpRight  = vpLeft + screenW / zoom;
  const vpBottom = vpTop  + screenH / zoom;

  // In mini-map space
  const vx = Math.max(0, vpLeft * SX);
  const vy = Math.max(0, vpTop  * SY);
  const vw = Math.min(MINI_W, (vpRight  - vpLeft) * SX);
  const vh = Math.min(MINI_H, (vpBottom - vpTop)  * SY);

  const handleTap = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    const canvasX = locationX / SX;
    const canvasY = locationY / SY;
    onTap(canvasX, canvasY);
  };

  return (
    <TouchableOpacity style={styles.wrapper} onPress={handleTap} activeOpacity={0.9}>
      <Svg width={MINI_W} height={MINI_H}>
        {/* Background */}
        <Rect width={MINI_W} height={MINI_H} fill="#080c10" rx={3}/>

        {/* Field dots */}
        {fields.map(f => (
          <Circle
            key={f.id}
            cx={f.labelX * SX}
            cy={f.labelY * SY}
            r={Math.max(1.5, f.approximateHa * 0.05)}
            fill={OWNER_COLOR[f.owner] ?? '#2a2818'}
            opacity={0.85}
          />
        ))}

        {/* Viewport rectangle */}
        <Rect
          x={vx} y={vy} width={Math.max(4, vw)} height={Math.max(4, vh)}
          fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1}
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1c2a3a',
    overflow: 'hidden',
    backgroundColor: '#080c10',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
});
