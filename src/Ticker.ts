import { Emitter, EventListenerId, EventName, EmitterDedupe, EmitterOptions } from 'eventti';

import { createRequestFrame } from './createRequestFrame.js';

export type FrameCallback = (time: number, ...args: any) => void;

export type DefaultFrameCallback = (time: number) => void;

export type RequestFrame<FC extends FrameCallback = DefaultFrameCallback> = (
  callback: FC,
) => CancelFrame;

export type CancelFrame = () => void;

export type Phase<T extends Ticker<EventName>> = Parameters<T['on']>[0];

export type PhaseListener<
  T extends Ticker<EventName, FrameCallback> = Ticker<EventName, DefaultFrameCallback>,
> = Parameters<T['on']>[1];

export type PhaseListenerId = EventListenerId;

export enum TickMode {
  PAUSED = 1,
  ON_DEMAND = 2,
  CONTINUOUS = 3,
}

export class Ticker<P extends EventName, FC extends FrameCallback = DefaultFrameCallback> {
  phases: P[];
  protected _tickMode: TickMode;
  protected _requestFrame: RequestFrame<FC> | null;
  protected _cancelFrame: CancelFrame | null;
  protected _queue: FC[][];
  protected _emitter: Emitter<Record<P, FC>>;
  protected _getListeners: Emitter<Record<P, FC>>['_getListeners'];

  constructor(
    options: {
      phases?: P[];
      tickMode?: TickMode;
      requestFrame?: RequestFrame<FC>;
      dedupe?: EmitterOptions['dedupe'];
      getId?: EmitterOptions['getId'];
    } = {},
  ) {
    const {
      phases = [],
      tickMode = TickMode.ON_DEMAND,
      requestFrame = createRequestFrame(),
      dedupe,
      getId,
    } = options;

    this.phases = phases;
    this._emitter = new Emitter({ getId, dedupe });
    this._tickMode = tickMode;
    this._requestFrame = requestFrame;
    this._cancelFrame = null;
    this._queue = [];

    this.tick = this.tick.bind(this);
    this._getListeners = this._emitter['_getListeners'].bind(this._emitter);
  }

  get requestFrame() {
    return this._requestFrame;
  }

  set requestFrame(requestFrame: RequestFrame<FC> | null) {
    this._requestFrame = requestFrame;
    this._kickstart();
  }

  get tickMode() {
    return this._tickMode;
  }

  set tickMode(TickMode: TickMode) {
    this._tickMode = TickMode;
    this._kickstart();
  }

  get dedupe() {
    return this._emitter.dedupe;
  }

  set dedupe(dedupe: EmitterDedupe) {
    this._emitter.dedupe = dedupe;
  }

  get getId() {
    return this._emitter.getId;
  }

  set getId(getId: NonNullable<EmitterOptions['getId']>) {
    this._emitter.getId = getId;
  }

  tick(...args: Parameters<FC>): void {
    // Make sure the previous tick has finished before starting a new one. This
    // will happen if the user calls `tick` manually within a listener.
    const { _queue } = this;
    if (_queue.length) {
      throw new Error(`Ticker: Can't tick before the previous tick has finished!`);
    }

    // Reset the cancel frame and request the next frame.
    this._cancelFrame = null;
    this._request();

    const { phases, _emitter, _getListeners } = this;
    let i: number;
    let j: number;
    let iCount: number;
    let jCount: number;
    let listeners: FC[];
    let maybeListeners: typeof listeners | null;

    // Populate queue.
    for (i = 0, iCount = phases.length; i < iCount; i++) {
      maybeListeners = _getListeners(phases[i]) as FC[] | null;
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
    if (this._tickMode === TickMode.ON_DEMAND && !_emitter.listenerCount()) {
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
    if (this._requestFrame && !this._cancelFrame && this._tickMode !== TickMode.PAUSED) {
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
    if (this._tickMode === TickMode.ON_DEMAND) {
      if (this._emitter.listenerCount()) this._request();
    } else if (this._tickMode === TickMode.CONTINUOUS) {
      this._request();
    } else {
      this._cancel();
    }
  }
}
