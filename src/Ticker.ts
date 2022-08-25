import { Emitter, EventListenerId, EventName, EventListenerIdDedupeMode } from 'eventti';

import { createRequestFrame } from './createRequestFrame';

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type DefaultFrameCallback = (time: number) => void;

type CancelFrame = () => void;

export type FrameCallback = (time: number, ...args: any) => void;

export type RequestFrame<FC extends FrameCallback = DefaultFrameCallback> = (
  callback: FC
) => CancelFrame;

export type Phase = EventName;

export type PhaseListenerId = EventListenerId;

export enum AutoTickState {
  PAUSED = 1,
  ON_DEMAND = 2,
  CONTINUOUS = 3,
}

export class Ticker<P extends Phase, FC extends FrameCallback = DefaultFrameCallback> {
  phases: P[];
  protected _autoTick: AutoTickState;
  protected _requestFrame: RequestFrame<FC> | null;
  protected _cancelFrame: CancelFrame | null;
  protected _queue: FC[][];
  protected _emitter: Emitter<Record<P, FC>>;

  constructor(
    options: {
      phases?: P[];
      autoTick?: AutoTickState;
      allowDuplicateListeners?: boolean;
      idDedupeMode?: EventListenerIdDedupeMode;
      requestFrame?: RequestFrame<FC>;
    } = {}
  ) {
    const {
      phases = [],
      autoTick = AutoTickState.ON_DEMAND,
      allowDuplicateListeners = true,
      idDedupeMode = 'replace',
      requestFrame = createRequestFrame(),
    } = options;

    this.phases = phases;
    this._autoTick = autoTick;
    this._requestFrame = requestFrame;
    this._cancelFrame = null;
    this._queue = [];
    this._emitter = new Emitter({ allowDuplicateListeners, idDedupeMode });
    this.tick = this.tick.bind(this);
  }

  get requestFrame() {
    return this._requestFrame;
  }

  set requestFrame(requestFrame: RequestFrame<FC> | null) {
    this._requestFrame = requestFrame;
    this._kickstart();
  }

  get autoTick() {
    return this._autoTick;
  }

  set autoTick(autoTickState: AutoTickState) {
    this._autoTick = autoTickState;
    this._kickstart();
  }

  get allowDuplicateListeners() {
    return this._emitter.allowDuplicateListeners;
  }

  set allowDuplicateListeners(allowDuplicateListeners: boolean) {
    (this._emitter as Writeable<Emitter<Record<P, FC>>>).allowDuplicateListeners =
      allowDuplicateListeners;
  }

  get idDedupeMode() {
    return this._emitter.idDedupeMode;
  }

  set idDedupeMode(idDedupeMode: EventListenerIdDedupeMode) {
    this._emitter.idDedupeMode = idDedupeMode;
  }

  tick(...args: Parameters<FC>): void {
    this._cancelFrame = null;

    const { _queue } = this;
    if (_queue.length) {
      throw new Error(`Ticker: Can't tick before the previous tick has finished!`);
    }

    // Queue next tick always before processing the queue in case the
    // auto-ticking method is not using requestAnimationFrame. If we would
    // queue the next frame _after_ processing the queue and the raf
    // implementation used setTimeout for example, the frame time would be
    // stretched unnecessarily.
    this._request();

    const { phases, _emitter } = this;
    let i: number;
    let j: number;
    let iCount: number;
    let jCount: number;
    let listeners: FC[];
    let maybeListeners: typeof listeners | null;

    // Populate queue.
    for (i = 0, iCount = phases.length; i < iCount; i++) {
      maybeListeners = _emitter['_getListeners'](phases[i]) as FC[] | null;
      if (maybeListeners) _queue.push(maybeListeners);
    }

    // Process queue.
    for (i = 0, iCount = _queue.length; i < iCount; i++) {
      listeners = _queue[i];
      for (j = 0, jCount = listeners.length; j < jCount; j++) {
        listeners[j](...(args as Parameters<FrameCallback>));
      }
    }

    // Reset queue.
    _queue.length = 0;

    // Cancel the next frame and stop ticking if there are no listeners left in
    // the ticker.
    if (this._autoTick === AutoTickState.ON_DEMAND && !_emitter.listenerCount()) {
      this._cancel();
    }
  }

  on(phase: P, listener: FC, listenerId?: PhaseListenerId): PhaseListenerId {
    const id = this._emitter.on(phase, listener, listenerId);
    this._request();
    return id;
  }

  once(phase: P, listener: FC, listenerId?: PhaseListenerId): PhaseListenerId {
    const id = this._emitter.once(phase, listener, listenerId);
    this._request();
    return id;
  }

  off(phase?: P, listener?: FC | PhaseListenerId): void {
    return this._emitter.off(phase, listener);
  }

  listenerCount(phase?: P): number | void {
    return this._emitter.listenerCount(phase);
  }

  protected _request(): void {
    if (this._requestFrame && !this._cancelFrame && this._autoTick >= AutoTickState.ON_DEMAND) {
      this._cancelFrame = this._requestFrame(this.tick as FC);
    }
  }

  protected _cancel(): void {
    if (this._cancelFrame) {
      this._cancelFrame();
      this._cancelFrame = null;
    }
  }

  protected _kickstart(): void {
    if (this._autoTick === AutoTickState.ON_DEMAND) {
      if (this._emitter.listenerCount()) this._request();
    } else if (this._autoTick === AutoTickState.CONTINUOUS) {
      this._request();
    } else {
      this._cancel();
    }
  }
}
