import { Emitter, EventListenerId, EventName, EventListenerIdDedupeMode } from 'eventti';

const { r: DEFAULT_REQUEST_TICK, c: DEFAULT_CANCEL_TICK } = (() => {
  if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
    return {
      r: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
      c: (handle: number) => cancelAnimationFrame(handle),
    };
  } else {
    const frameTime = 1000 / 60;
    const now = typeof performance === 'undefined' ? () => Date.now() : () => performance.now();
    return {
      r: (callback: FrameRequestCallback) => setTimeout(() => callback(now()), frameTime),
      c: (requestId: any) => clearTimeout(requestId),
    };
  }
})();

export enum AutoTickState {
  OFF = 0,
  ON = 1,
  PAUSED = 2,
}

export type TickId = any;

export type RequestTick = (callback: (time: number) => any) => TickId;

export type CancelTick = (requestId: TickId) => any;

export type TickerOptions<P extends Phase> = {
  phases?: P[];
  autoTick?: AutoTickState;
  allowDuplicateListeners?: boolean;
  idDedupeMode?: EventListenerIdDedupeMode;
  requestTick?: RequestTick;
  cancelTick?: CancelTick;
};

export type Phase = EventName;

export type PhaseListener = (time: number) => void;

export type PhaseListenerId = EventListenerId;

export class Ticker<P extends Phase> {
  phases: P[];
  readonly allowDuplicateListeners: boolean;
  protected _autoTick: AutoTickState;
  protected _autoTickId: TickId;
  protected _requestTick: RequestTick;
  protected _cancelTick: CancelTick;
  protected _queue: PhaseListener[][];
  protected _emitter: Emitter<Record<P, PhaseListener>>;

  constructor(options: TickerOptions<P> = {}) {
    const {
      phases = [],
      autoTick = AutoTickState.ON,
      allowDuplicateListeners = true,
      idDedupeMode = 'replace',
      requestTick = DEFAULT_REQUEST_TICK,
      cancelTick = DEFAULT_CANCEL_TICK,
    } = options;

    this.phases = phases;
    this.allowDuplicateListeners = allowDuplicateListeners;
    this._autoTick = autoTick;
    this._autoTickId = null;
    this._requestTick = requestTick;
    this._cancelTick = cancelTick;
    this._emitter = new Emitter({ allowDuplicateListeners, idDedupeMode });
    this._queue = [];

    this.tick = this.tick.bind(this);
  }

  get autoTick() {
    return this._autoTick;
  }

  set autoTick(autoTickState: AutoTickState) {
    if (autoTickState === AutoTickState.ON) {
      if (this._emitter.listenerCount()) {
        this._requestFrame();
      }
    } else {
      this._cancelFrame();
    }
    this._autoTick = autoTickState;
  }

  get idDedupeMode() {
    return this._emitter.idDedupeMode;
  }

  set idDedupeMode(idDedupeMode: EventListenerIdDedupeMode) {
    this._emitter.idDedupeMode = idDedupeMode;
  }

  tick(time: number): void {
    this._autoTickId = null;

    const { _queue } = this;
    if (_queue.length) {
      throw new Error(`Can't tick before the previous tick has finished.`);
    }

    // Queue next tick always before processing the queue in case the
    // auto-ticking method is not using requestAnimationFrame. If we would
    // queue the next frame _after_ processing the queue and the raf
    // implementation used setTimeout for example, the frame time would be
    // stretched unnecessarily.
    this._requestFrame();

    const { phases, _emitter } = this;
    let i: number;
    let j: number;
    let iCount: number;
    let jCount: number;
    let listeners: PhaseListener[];
    let maybeListeners: typeof listeners | null;

    // Populate queue.
    for (i = 0, iCount = phases.length; i < iCount; i++) {
      maybeListeners = _emitter['_getListeners'](phases[i]);
      if (maybeListeners) _queue.push(maybeListeners);
    }

    // Process queue.
    for (i = 0, iCount = _queue.length; i < iCount; i++) {
      listeners = _queue[i];
      for (j = 0, jCount = listeners.length; j < jCount; j++) {
        listeners[j](time);
      }
    }

    // Reset queue.
    _queue.length = 0;

    // Cancel the next frame and stop ticking if there are no listeners left in
    // the ticker.
    if (this._autoTickId !== null && !_emitter.listenerCount()) {
      this._cancelFrame();
    }
  }

  on(phase: P, listener: PhaseListener, listenerId?: PhaseListenerId): PhaseListenerId {
    const id = this._emitter.on(phase, listener, listenerId);
    this._requestFrame();
    return id;
  }

  once(phase: P, listener: PhaseListener, listenerId?: PhaseListenerId): PhaseListenerId {
    const id = this._emitter.once(phase, listener, listenerId);
    this._requestFrame();
    return id;
  }

  off(phase?: P, listener?: PhaseListener | PhaseListenerId): void {
    return this._emitter.off(phase, listener);
  }

  listenerCount(phase?: P): number | void {
    return this._emitter.listenerCount(phase);
  }

  protected _requestFrame(): void {
    if (this._autoTick === AutoTickState.ON && this._autoTickId === null) {
      this._autoTickId = this._requestTick(this.tick);
    }
  }

  protected _cancelFrame(): void {
    if (this._autoTickId !== null) {
      this._cancelTick(this._autoTickId);
      this._autoTickId = null;
    }
  }
}
