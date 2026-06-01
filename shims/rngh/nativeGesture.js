"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.NativeGesture = void 0;

const { BaseGesture } = require("../../node_modules/react-native-gesture-handler/lib/commonjs/handlers/gestures/gesture");

class NativeGesture extends BaseGesture {
  constructor() {
    super();
    this.handlerName = "NativeViewGestureHandler";
  }

  shouldActivateOnStart(value) {
    this.config.shouldActivateOnStart = value;
    return this;
  }

  disallowInterruption(value) {
    this.config.disallowInterruption = value;
    return this;
  }
}

exports.NativeGesture = NativeGesture;
