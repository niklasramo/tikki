import { Emitter, EventListenerId, EventName, EmitterDedupe } from 'eventti';

import type { UnionToIntersection } from './types.js';

export type Phase = EventName;

export type FrameCallbackId = EventListenerId;

export type FrameCallback = (...args: any) => void;

export type TickerDedupe = EmitterDedupe;

export interface TickerOptions<P extends Phase> {
  phases?: P[];
  dedupe?: TickerDedupe;
  getId?: (frameCallback: FrameCallback) => FrameCallbackId;
}

export const TickerDedupe = EmitterDedupe;

export class Ticker<P extends Phase, FC extends FrameCallback = FrameCallback> {
  protected _phases: P[];
  protected _queue: FC[][];
  protected _emitter: Emitter<Record<P, FC>>;
  protected _getListeners: (phase: P) => FC[] | null;

  constructor(options: TickerOptions<P> = {}) {
    const { phases = [], dedupe, getId } = options;

    this._phases = phases;
    this._emitter = new Emitter({ getId, dedupe });
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
  }

  get dedupe() {
    return this._emitter.dedupe;
  }

  set dedupe(dedupe: TickerDedupe) {
    this._emitter.dedupe = dedupe;
  }

  get getId() {
    return this._emitter.getId;
  }

  set getId(getId: (frameCallback: FrameCallback) => FrameCallbackId) {
    this._emitter.getId = getId;
  }

  tick(...args: Parameters<FC>): void {
    this._assertEmptyQueue();
    this._fillQueue();
    this._processQueue(...args);
  }

  on(
    phase: P,
    frameCallback: UnionToIntersection<FC>,
    frameCallbackId?: FrameCallbackId,
  ): FrameCallbackId {
    return this._emitter.on(phase, frameCallback as FC, frameCallbackId);
  }

  once(
    phase: P,
    frameCallback: UnionToIntersection<FC>,
    frameCallbackId?: FrameCallbackId,
  ): FrameCallbackId {
    return this._emitter.once(phase, frameCallback as FC, frameCallbackId);
  }

  off(phase?: P, frameCallbackId?: FrameCallbackId): void {
    return this._emitter.off(phase, frameCallbackId);
  }

  count(phase?: P): number | void {
    return this._emitter.listenerCount(phase);
  }

  protected _assertEmptyQueue() {
    if (this._queue.length) {
      throw new Error(`Ticker: Can't tick before the previous tick has finished!`);
    }
  }

  protected _fillQueue() {
    const { _queue, _phases, _getListeners } = this;
    let i = 0;
    let phaseCount = _phases.length;
    let batch: ReturnType<typeof _getListeners>;
    for (; i < phaseCount; i++) {
      batch = _getListeners(_phases[i]);
      if (batch) _queue.push(batch);
    }
    return _queue;
  }

  protected _processQueue(...args: Parameters<FC>) {
    const { _queue } = this;
    if (_queue.length) {
      let i = 0;
      let j = 0;
      let iLength = _queue.length;
      let jLength: number;
      let batch: FC[];

      for (; i < iLength; i++) {
        batch = _queue[i];
        j = 0;
        jLength = batch.length;
        for (; j < jLength; j++) {
          batch[j](...(args as Parameters<FrameCallback>));
        }
      }

      _queue.length = 0;
    }
  }
}
