import React, { useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../store/useGameStore';
import MapCanvas from './MapCanvas';
import FieldPanel from './FieldPanel';
import MiniMap from './MiniMap';
import { useMapGestures } from './useMapGestures';
import MapLegend from './MapLegend';

export default function WorldMap() {
  const { width: W, height: H } = useWindowDimensions();
  const router = useRouter();

  const {
    mapFields, parcels, day, money,
    selectedMapFieldId, mapPanX, mapPanY, mapZoom,
    selectMapField, buyMapField, scoutMapField, savePanZoom,
  } = useGameStore();

  const { translateX, translateY, scale, composed, animStyle, jumpTo } =
    useMapGestures({
      screenW: W,
      screenH: H,
      initialX: mapPanX,
      initialY: mapPanY,
      initialZoom: mapZoom,
      onSave: savePanZoom,
    });

  const selectedField = selectedMapFieldId
    ? mapFields.find(f => f.id === selectedMapFieldId) ?? null
    : null;

  const selectedParcel = selectedField?.parcelId
    ? parcels.find(p => p.id === selectedField.parcelId)
    : undefined;

  const handleFieldPress = useCallback((id: string) => {
    selectMapField(id);
  }, [selectMapField]);

  const handleBuy = useCallback((id: string) => {
    buyMapField(id);
    selectMapField(null);
  }, [buyMapField, selectMapField]);

  const handleManage = useCallback((_parcelId: string) => {
    selectMapField(null);
    router.push('/(tabs)/tierras');
  }, [router, selectMapField]);

  const handleMiniMapTap = useCallback((canvasX: number, canvasY: number) => {
    jumpTo(canvasX, canvasY);
  }, [jumpTo]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.canvas, animStyle]}>
            <MapCanvas
              fields={mapFields}
              parcels={parcels}
              selectedId={selectedMapFieldId}
              zoom={mapZoom}
              onFieldPress={handleFieldPress}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Mini-map top-right */}
      <View style={styles.miniMapWrap} pointerEvents="box-none">
        <MiniMap
          fields={mapFields}
          translateX={mapPanX}
          translateY={mapPanY}
          zoom={mapZoom}
          screenW={W}
          screenH={H}
          onTap={handleMiniMapTap}
        />
      </View>

      {/* Legend bottom-right */}
      <View style={styles.legendWrap} pointerEvents="none">
        <MapLegend />
      </View>

      {/* Detail panel */}
      <FieldPanel
        field={selectedField}
        parcel={selectedParcel}
        day={day}
        money={money}
        onClose={() => selectMapField(null)}
        onBuy={handleBuy}
        onScout={scoutMapField}
        onManage={handleManage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#050709' },
  viewport:    { flex: 1, overflow: 'hidden' },
  canvas:      { position: 'absolute', top: 0, left: 0 },
  miniMapWrap: { position: 'absolute', top: 54, right: 12 },
  legendWrap:  { position: 'absolute', bottom: 16, right: 12 },
});
