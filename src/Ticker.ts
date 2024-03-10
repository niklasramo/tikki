import { Emitter, EventListenerId, EventName, EmitterDedupe, EmitterOptions } from 'eventti';

import { createRequestFrame } from './createRequestFrame.js';

export type Phase = EventName;

export type FrameCallbackId = EventListenerId;

export type FrameCallback = (time: number, ...args: any) => void;

export type DefaultFrameCallback = (time: number) => void;

export type RequestFrame<FC extends FrameCallback = DefaultFrameCallback> = (
  callback: FC,
) => CancelFrame;

export type CancelFrame = () => void;

export type TickerDedupe = EmitterDedupe;

export type TickerPhase<T extends Ticker<Phase>> = Parameters<T['on']>[0];

export type TickerFrameCallback<
  T extends Ticker<Phase, FrameCallback> = Ticker<Phase, DefaultFrameCallback>,
> = Parameters<T['on']>[1];

export type TickerOptions<P extends Phase, FC extends FrameCallback> = {
  phases?: P[];
  paused?: boolean;
  onDemand?: boolean;
  requestFrame?: RequestFrame<FC>;
  dedupe?: EmitterOptions['dedupe'];
  getId?: (frameCallback: FrameCallback) => FrameCallbackId;
};

export class Ticker<P extends Phase, FC extends FrameCallback = DefaultFrameCallback> {
  protected _phases: P[];
  protected _paused: boolean;
  protected _onDemand: boolean;
  protected _requestFrame: RequestFrame<FC>;
  protected _cancelFrame: CancelFrame | null;
  protected _empty: boolean;
  protected _queue: FC[][];
  protected _emitter: Emitter<Record<P, FC>>;
  protected _getListeners: (phase: P) => FC[] | null;

  constructor(options: TickerOptions<P, FC> = {}) {
    const {
      phases = [],
      paused = false,
      onDemand = false,
      requestFrame = createRequestFrame(),
      dedupe,
      getId,
    } = options;

    this._phases = phases;
    this._emitter = new Emitter({ getId, dedupe });
    this._paused = paused;
    this._onDemand = onDemand;
    this._requestFrame = requestFrame;
    this._cancelFrame = null;
    this._empty = true;
    this._queue = [];

    // Bind the tick method to the instance.
    this.tick = this.tick.bind(this);

    // Bind the emitter's _getListener method to the instance for faster access.
    this._getListeners = this._emitter['_getListeners'].bind(this._emitter) as (
      phase: P,
    ) => FC[] | null;
  }

  get phases() {
    return this._phases;
  }

  set phases(phases: P[]) {
    this._phases = phases;
    this._empty = !phases.length;
  }

  get requestFrame() {
    return this._requestFrame;
  }

  set requestFrame(requestFrame: RequestFrame<FC>) {
    this._requestFrame = requestFrame;
    if (this._cancelFrame) {
      this._cancel();
      this._request();
    }
  }

  get paused() {
    return this._paused;
  }

  set paused(paused: boolean) {
    this._paused = paused;
    paused ? this._cancel() : this._request();
  }

  get onDemand() {
    return this._paused;
  }

  set onDemand(onDemand: boolean) {
    this._onDemand = onDemand;
    if (!onDemand) this._request();
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
    const { _queue, _onDemand } = this;
    if (_queue.length) {
      throw new Error(`Ticker: Can't tick before the previous tick has finished!`);
    }

    // Clear the cancel frame reference.
    this._cancelFrame = null;

    // Request the next frame if onDemand is false.
    if (!_onDemand) this._request();

    // Return early if the ticker has no listeners for _active_ phases.
    if (this._empty) return;

    const { phases, _getListeners } = this;

    // Populate the queue.
    let i = 0;
    let phaseCount = phases.length;
    let batch: ReturnType<typeof _getListeners>;
    for (; i < phaseCount; i++) {
      batch = _getListeners(phases[i]);
      if (batch) _queue.push(batch);
    }

    // Get the final phase count.
    phaseCount = _queue.length;

    // Return early if there are no listeners to call.
    if (!phaseCount) {
      this._empty = true;
      return;
    }

    // Request the next frame if onDemand is true.
    if (_onDemand) this._request();

    // Process the queue.
    let j: number;
    let fcCount: number;
    for (i = 0; i < phaseCount; i++) {
      batch = _queue[i];
      for (j = 0, fcCount = batch.length; j < fcCount; j++) {
        batch[j](...(args as Parameters<FrameCallback>));
      }
    }

    // Reset the queue.
    _queue.length = 0;
  }

  on(phase: P, frameCallback: FC, frameCallbackId?: FrameCallbackId): FrameCallbackId {
    const id = this._emitter.on(phase, frameCallback, frameCallbackId);
    this._empty = false;
    this._onDemand && this._request();
    return id;
  }

  once(phase: P, frameCallback: FC, frameCallbackId?: FrameCallbackId): FrameCallbackId {
    const id = this._emitter.once(phase, frameCallback, frameCallbackId);
    this._empty = false;
    this._onDemand && this._request();
    return id;
  }

  off(phase?: P, frameCallbackId?: FrameCallbackId): void {
    return this._emitter.off(phase, frameCallbackId);
  }

  count(phase?: P): number | void {
    return this._emitter.listenerCount(phase);
  }

  protected _request(): void {
    if (this._paused || this._cancelFrame) return;
    this._cancelFrame = this._requestFrame(this.tick as FC);
  }

  protected _cancel(): void {
    if (!this._cancelFrame) return;
    this._cancelFrame();
    this._cancelFrame = null;
  }
}
