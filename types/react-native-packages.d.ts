declare module 'react-native-gesture-handler' {
  import type { ComponentType, ReactNode } from 'react';
  import type { ViewProps } from 'react-native';

  export type PanGestureEventPayload = {
    translationX: number;
    translationY: number;
  };

  export type PinchGestureEventPayload = {
    scale: number;
    focalX: number;
    focalY: number;
  };

  export type TapGestureEventPayload = {
    x: number;
    y: number;
  };

  type GestureBuilder<TEvent = unknown> = {
    minDistance(distance: number): GestureBuilder<TEvent>;
    numberOfTaps(count: number): GestureBuilder<TEvent>;
    onBegin(callback: () => void): GestureBuilder<TEvent>;
    onUpdate(callback: (event: TEvent) => void): GestureBuilder<TEvent>;
    onEnd(callback: (event: TEvent) => void): GestureBuilder<TEvent>;
  };

  export const Gesture: {
    Pan(): GestureBuilder<PanGestureEventPayload>;
    Pinch(): GestureBuilder<PinchGestureEventPayload>;
    Tap(): GestureBuilder<TapGestureEventPayload>;
    Race(...gestures: GestureBuilder[]): GestureBuilder;
    Simultaneous(...gestures: GestureBuilder[]): GestureBuilder;
  };

  export const GestureDetector: ComponentType<{ gesture: GestureBuilder; children: ReactNode }>;
  export const GestureHandlerRootView: ComponentType<ViewProps>;
}

declare module 'react-native-reanimated' {
  import type { ComponentType, RefObject } from 'react';

  type SharedValue<T> = { value: T };

  const Animated: {
    ScrollView: ComponentType<any>;
    Text: ComponentType<any>;
    View: ComponentType<any>;
  };

  namespace Animated {
    type ScrollView = any;
  }

  export default Animated;
  export function interpolate(value: number, input: number[], output: number[]): number;
  export function runOnJS<T extends (...args: any[]) => unknown>(fn: T): T;
  export function useAnimatedRef<T>(): RefObject<T>;
  export function useAnimatedStyle<T extends object>(updater: () => T): any;
  export function useScrollOffset(ref: RefObject<unknown>): SharedValue<number>;
  export function useSharedValue<T>(value: T): SharedValue<T>;
  export function withTiming<T>(value: T, config?: { duration?: number }): T;
}

declare module 'react-native-svg' {
  import type { ComponentType } from 'react';

  export const Circle: ComponentType<any>;
  export const Defs: ComponentType<any>;
  export const Ellipse: ComponentType<any>;
  export const G: ComponentType<any>;
  export const Line: ComponentType<any>;
  export const Path: ComponentType<any>;
  export const Pattern: ComponentType<any>;
  export const Polygon: ComponentType<any>;
  export const Polyline: ComponentType<any>;
  export const Rect: ComponentType<any>;
  export const Svg: ComponentType<any>;
  export const Text: ComponentType<any>;
  export default Svg;
}
