/**
 * Mock for hammerjs touch gesture library
 * Used in tests to avoid native touch event dependencies
 */

class HammerManagerMock {
  options = {};
  handlers: Record<string, (() => void)[]> = {};

  constructor(_element?: HTMLElement, _options?: Record<string, unknown>) {}

  set(_options: Record<string, unknown>) {
    return this;
  }

  on(_events: string, _handler: () => void) {
    return this;
  }

  off(_events: string, _handler?: () => void) {
    return this;
  }

  emit(_event: string, _data?: unknown) {
    return this;
  }

  destroy() {}

  stop(_force?: boolean) {}

  recognize(_inputData: unknown) {}

  get(_recognizer: string | unknown) {
    return new RecognizerMock();
  }

  add(_recognizer: unknown) {
    return this;
  }

  remove(_recognizer: unknown) {
    return this;
  }
}

class RecognizerMock {
  options = {};

  set(_options: Record<string, unknown>) {
    return this;
  }

  recognizeWith(_otherRecognizer: unknown) {
    return this;
  }

  dropRecognizeWith(_otherRecognizer: unknown) {
    return this;
  }

  requireFailure(_otherRecognizer: unknown) {
    return this;
  }

  dropRequireFailure(_otherRecognizer: unknown) {
    return this;
  }
}

const Hammer = Object.assign(HammerManagerMock, {
  Manager: HammerManagerMock,
  Recognizer: RecognizerMock,
  Pan: RecognizerMock,
  Pinch: RecognizerMock,
  Press: RecognizerMock,
  Rotate: RecognizerMock,
  Swipe: RecognizerMock,
  Tap: RecognizerMock,
  INPUT_START: 1,
  INPUT_MOVE: 2,
  INPUT_END: 4,
  INPUT_CANCEL: 8,
  STATE_POSSIBLE: 1,
  STATE_BEGAN: 2,
  STATE_CHANGED: 4,
  STATE_ENDED: 8,
  STATE_RECOGNIZED: 8,
  STATE_CANCELLED: 16,
  STATE_FAILED: 32,
  DIRECTION_NONE: 1,
  DIRECTION_LEFT: 2,
  DIRECTION_RIGHT: 4,
  DIRECTION_UP: 8,
  DIRECTION_DOWN: 16,
  DIRECTION_HORIZONTAL: 6,
  DIRECTION_VERTICAL: 24,
  DIRECTION_ALL: 30,
  defaults: {
    domEvents: false,
    touchAction: 'compute',
    enable: true,
    inputTarget: null,
    inputClass: null,
    preset: [],
    cssProps: {
      userSelect: 'none',
      touchSelect: 'none',
      touchCallout: 'none',
      contentZooming: 'none',
      userDrag: 'none',
      tapHighlightColor: 'rgba(0,0,0,0)',
    },
  },
});

// Assign to global for side-effect imports
if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).Hammer = Hammer;
}
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).Hammer = Hammer;
}

export default Hammer;
export { Hammer };
