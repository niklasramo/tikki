import { Emitter, EventListenerId, EventName } from 'eventti';

export type Phase = EventName;

export type PhaseListener = (time: number) => void;

export type PhaseListenerId = EventListenerId;

export class Ticker<P extends Phase> {
  phases: P[];
  autoTick: boolean;
  protected _raf: number | null;
  protected _queue: PhaseListener[][];
  protected _emitter: Emitter<Record<P, PhaseListener>>;

  constructor(options: { phases?: P[]; autoTick?: boolean } = {}) {
    const { phases = [], autoTick = true } = options;

    this.phases = phases;
    this.autoTick = autoTick;

    this._raf = null;
    this._emitter = new Emitter();
    this._queue = [];

    this.tick = this.tick.bind(this);
  }

  tick(time: number): void {
    this._raf = null;

    const { _queue, phases } = this;

    if (_queue.length) {
      throw new Error(`Can't tick before the previous tick has finished.`);
    }

    let i: number;
    let j: number;
    let iCount: number;
    let jCount: number;
    let listeners: PhaseListener[];
    let maybeListeners: typeof listeners | null;

    // Populate queue.
    for (i = 0, iCount = phases.length; i < iCount; i++) {
      maybeListeners = this._emitter['_getListeners'](phases[i]);
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

    // If we have listeners let's keep on ticking.
    if (this.autoTick && this._emitter.listenerCount()) {
      this.start();
    }
  }

  start(): void {
    if (this.autoTick && this._raf === null) {
      this._raf = requestAnimationFrame(this.tick);
    }
  }

  stop(): void {
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
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
