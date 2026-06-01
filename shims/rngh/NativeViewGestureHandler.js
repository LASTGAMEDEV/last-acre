"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.nativeViewProps = exports.nativeViewGestureHandlerProps = exports.nativeViewHandlerName = exports.NativeViewGestureHandler = void 0;

const createHandler = require("../../node_modules/react-native-gesture-handler/lib/commonjs/handlers/createHandler").default;
const { baseGestureHandlerProps } = require("../../node_modules/react-native-gesture-handler/lib/commonjs/handlers/gestureHandlerCommon");

const nativeViewGestureHandlerProps = exports.nativeViewGestureHandlerProps = [
  "shouldActivateOnStart",
  "disallowInterruption",
];
const nativeViewProps = exports.nativeViewProps = [
  ...baseGestureHandlerProps,
  ...nativeViewGestureHandlerProps,
];
const nativeViewHandlerName = exports.nativeViewHandlerName = "NativeViewGestureHandler";

const NativeViewGestureHandler = exports.NativeViewGestureHandler = createHandler({
  name: nativeViewHandlerName,
  allowedProps: nativeViewProps,
});

exports.default = NativeViewGestureHandler;
