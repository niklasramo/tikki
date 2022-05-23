import { Emitter, EventListenerId, EventName } from 'eventti';
import { getRafMethods, RequestAnimationFrame, CancelAnimationFrame } from './raf';

const { requestAnimationFrame: RAF, cancelAnimationFrame: CAF } = getRafMethods();

type TickerOptions<P extends Phase> = {
  phases?: P[];
  autoTick?: boolean;
  raf?: RequestAnimationFrame;
  caf?: CancelAnimationFrame;
};

export type Phase = EventName;

export type PhaseListener = (time: number) => void;

export type PhaseListenerId = EventListenerId;

export class Ticker<P extends Phase> {
  phases: P[];
  autoTick: boolean;
  protected _raf: RequestAnimationFrame;
  protected _caf: CancelAnimationFrame;
  protected _rafId: number | null;
  protected _queue: PhaseListener[][];
  protected _emitter: Emitter<Record<P, PhaseListener>>;

  constructor(options: TickerOptions<P> = {}) {
    const { phases = [], autoTick = true, raf = RAF, caf = CAF } = options;

    this.phases = phases;
    this.autoTick = autoTick;
    this._raf = raf;
    this._caf = caf;

    this._rafId = null;
    this._emitter = new Emitter();
    this._queue = [];

    this.tick = this.tick.bind(this);
  }

  tick(time: number): void {
    this._rafId = null;

    const { _queue } = this;
    if (_queue.length) {
      throw new Error(`Can't tick before the previous tick has finished.`);
    }

    // Queue next tick always before processing the queue in case the
    // auto-ticking method is not using requestAnimationFrame. If we would
    // queue the next frame _after_ processing the queue and the raf
    // implementation used setTimeout for example, the frame time would be
    // stretched unnecessarily.
    this.start();

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

    // Cancel the next frame and stop ticking (in auto-tick mode) if there are
    // no listeners left in the ticker.
    if (this.autoTick && !_emitter.listenerCount()) {
      this.stop();
    }
  }

  start(): void {
    if (this.autoTick && this._rafId === null) {
      this._rafId = this._raf(this.tick);
    }
  }

  stop(): void {
    if (this._rafId !== null) {
      this._caf(this._rafId);
      this._rafId = null;
    }
  }

  on(phase: P, listener: PhaseListener): PhaseListenerId {
    const id = this._emitter.on(phase, listener);
    this.start();
    return id;
  }

  once(phase: P, listener: PhaseListener): PhaseListenerId {
    const id = this._emitter.once(phase, listener);
    this.start();
    return id;
  }

  off(phase?: P, listener?: PhaseListener | PhaseListenerId): void {
    return this._emitter.off(phase, listener);
  }

  listenerCount(phase?: P): number | void {
    return this._emitter.listenerCount(phase);
  }
}
