import { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { CANVAS_W, CANVAS_H } from './MapCanvas';

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2.5;

function clamp(val: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

function clampTranslate(
  tx: number, ty: number, s: number, W: number, H: number
): { x: number; y: number } {
  'worklet';
  const cw = CANVAS_W * s;
  const ch = CANVAS_H * s;
  const minX = cw > W ? -(cw - W) : (W - cw) / 2;
  const maxX = cw > W ? 0          : (W - cw) / 2;
  const minY = ch > H ? -(ch - H) : (H - ch) / 2;
  const maxY = ch > H ? 0          : (H - ch) / 2;
  return { x: clamp(tx, minX, maxX), y: clamp(ty, minY, maxY) };
}

interface Options {
  screenW: number;
  screenH: number;
  initialX?: number;
  initialY?: number;
  initialZoom?: number;
  onSave?: (x: number, y: number, zoom: number) => void;
}

export function useMapGestures({ screenW, screenH, initialX = 0, initialY = 0, initialZoom = 1, onSave }: Options) {
  const translateX   = useSharedValue(initialX);
  const translateY   = useSharedValue(initialY);
  const scale        = useSharedValue(initialZoom);

  // Saved values at gesture start
  const savedX       = useSharedValue(initialX);
  const savedY       = useSharedValue(initialY);
  const savedScale   = useSharedValue(initialZoom);

  const pan = Gesture.Pan()
    .minDistance(8)
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      const nx = savedX.value + e.translationX;
      const ny = savedY.value + e.translationY;
      const clamped = clampTranslate(nx, ny, scale.value, screenW, screenH);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      if (onSave) runOnJS(onSave)(translateX.value, translateY.value, scale.value);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
      savedX.value     = translateX.value;
      savedY.value     = translateY.value;
    })
    .onUpdate((e) => {
      const newScale = clamp(savedScale.value * e.scale, MIN_ZOOM, MAX_ZOOM);
      const fx = e.focalX;
      const fy = e.focalY;
      const nx = fx - (fx - savedX.value) * (newScale / savedScale.value);
      const ny = fy - (fy - savedY.value) * (newScale / savedScale.value);
      const clamped = clampTranslate(nx, ny, newScale, screenW, screenH);
      scale.value      = newScale;
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      if (onSave) runOnJS(onSave)(translateX.value, translateY.value, scale.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      // Toggle: if zoomed out, zoom into tapped point; if zoomed in, fit screen
      if (scale.value < 0.9) {
        const targetScale = 1.2;
        const fx = e.x;
        const fy = e.y;
        const nx = fx - (fx - translateX.value) * (targetScale / scale.value);
        const ny = fy - (fy - translateY.value) * (targetScale / scale.value);
        const clamped = clampTranslate(nx, ny, targetScale, screenW, screenH);
        scale.value      = withTiming(targetScale, { duration: 300 }) as any;
        translateX.value = withTiming(clamped.x,   { duration: 300 }) as any;
        translateY.value = withTiming(clamped.y,   { duration: 300 }) as any;
      } else {
        const fitScale = Math.min(screenW / CANVAS_W, screenH / CANVAS_H, MIN_ZOOM + 0.2);
        const clamped = clampTranslate(0, 0, fitScale, screenW, screenH);
        scale.value      = withTiming(fitScale,   { duration: 350 }) as any;
        translateX.value = withTiming(clamped.x,  { duration: 350 }) as any;
        translateY.value = withTiming(clamped.y,  { duration: 350 }) as any;
      }
    });

  const composed = Gesture.Simultaneous(
    Gesture.Race(doubleTap, pan),
    pinch
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale:      scale.value      },
    ],
  }));

  // Jump to a canvas point (from mini-map tap)
  function jumpTo(canvasX: number, canvasY: number) {
    const s = scale.value;
    const nx = screenW / 2 - canvasX * s;
    const ny = screenH / 2 - canvasY * s;
    const clamped = clampTranslate(nx, ny, s, screenW, screenH);
    translateX.value = withTiming(clamped.x, { duration: 300 }) as any;
    translateY.value = withTiming(clamped.y, { duration: 300 }) as any;
    if (onSave) onSave(clamped.x, clamped.y, s);
  }

  return { translateX, translateY, scale, composed, animStyle, jumpTo };
}
