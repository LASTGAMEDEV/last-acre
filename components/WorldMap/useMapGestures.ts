import { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, PanGestureEventPayload, PinchGestureEventPayload, TapGestureEventPayload } from 'react-native-gesture-handler';
import { CANVAS_W, CANVAS_H } from './MapCanvas';

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2.5;

// Half-dimensions — the transform origin (element center in screen coords
// when the element is at position:absolute top:0 left:0).
const OX = CANVAS_W / 2; // 700
const OY = CANVAS_H / 2; // 900

// Screen position of canvas point (px, py) given current transform:
//   screen_x = OX + tx + s*(px - OX)
//   screen_y = OY + ty + s*(py - OY)
//
// All clamping and focal-point math uses this model.

function clamp(val: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

// Return the translation bounds that keep the scaled canvas covering the
// screen (or centred when the canvas is smaller than the screen).
function clampTranslate(
  tx: number, ty: number, s: number, W: number, H: number
): { x: number; y: number } {
  'worklet';
  const cw = CANVAS_W * s;
  const ch = CANVAS_H * s;

  // Canvas left edge on screen:  OX*(1-s) + tx
  // Canvas right edge on screen: OX*(1+s) + tx
  const x = cw > W
    ? clamp(tx, W - OX * (1 + s), OX * (s - 1))
    : W / 2 - OX;

  // Canvas top edge on screen:    OY*(1-s) + ty
  // Canvas bottom edge on screen: OY*(1+s) + ty
  const y = ch > H
    ? clamp(ty, H - OY * (1 + s), OY * (s - 1))
    : H / 2 - OY;

  return { x, y };
}

// Translate needed to centre canvas point (px, py) at screen centre (W/2, H/2).
// Derived from: W/2 = OX + tx + s*(px - OX)  →  tx = W/2 - OX - s*(px-OX)
export function centreOnPoint(
  px: number, py: number, s: number, W: number, H: number
): { x: number; y: number } {
  const rawX = W / 2 - OX - s * (px - OX);
  const rawY = H / 2 - OY - s * (py - OY);
  return clampTranslate(rawX, rawY, s, W, H);
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
    .onUpdate((e: PanGestureEventPayload) => {
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
    .onUpdate((e: PinchGestureEventPayload) => {
      const newScale = clamp(savedScale.value * e.scale, MIN_ZOOM, MAX_ZOOM);
      const r  = newScale / savedScale.value;
      const fx = e.focalX;
      const fy = e.focalY;
      // Keep the canvas point under the focal pinch position stationary.
      // screen_x = OX + tx + s*(cx-OX)  =>  nx = (fx-OX)*(1-r) + r*savedX
      const nx = (fx - OX) * (1 - r) + r * savedX.value;
      const ny = (fy - OY) * (1 - r) + r * savedY.value;
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
    .onEnd((e: TapGestureEventPayload) => {
      if (scale.value < 0.9) {
        // Zoom in to tapped point
        const targetScale = 1.2;
        const r  = targetScale / scale.value;
        const fx = e.x;
        const fy = e.y;
        const nx = (fx - OX) * (1 - r) + r * translateX.value;
        const ny = (fy - OY) * (1 - r) + r * translateY.value;
        const clamped = clampTranslate(nx, ny, targetScale, screenW, screenH);
        scale.value      = withTiming(targetScale, { duration: 300 }) as any;
        translateX.value = withTiming(clamped.x,   { duration: 300 }) as any;
        translateY.value = withTiming(clamped.y,   { duration: 300 }) as any;
      } else {
        // Reset to fit-screen (centre map)
        const fitScale = clamp(
          Math.min(screenW / CANVAS_W, screenH / CANVAS_H),
          MIN_ZOOM, MAX_ZOOM
        );
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
    const nx = screenW / 2 - OX - s * (canvasX - OX);
    const ny = screenH / 2 - OY - s * (canvasY - OY);
    const clamped = clampTranslate(nx, ny, s, screenW, screenH);
    translateX.value = withTiming(clamped.x, { duration: 300 }) as any;
    translateY.value = withTiming(clamped.y, { duration: 300 }) as any;
    if (onSave) onSave(clamped.x, clamped.y, s);
  }

  return { translateX, translateY, scale, composed, animStyle, jumpTo };
}
