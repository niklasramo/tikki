import { Emitter, EventListenerId } from 'eventti';

export type TickerCallback = (time: number) => void;

export type TickerCallbackId = EventListenerId;

export class Ticker<TickerLane extends string | symbol> {
  lanes: TickerLane[];
  autoTick: boolean;
  protected _rafId: number | null;
  protected _emitter: Emitter<Record<TickerLane, TickerCallback>>;
  protected _callbackLists: TickerCallback[][];

  constructor() {
    this.lanes = [];
    this.autoTick = true;

    this._rafId = null;
    this._emitter = new Emitter();
    this._callbackLists = [];

    this.tick = this.tick.bind(this);
  }

  tick(time: number) {
    this._rafId = null;

    const { _callbackLists, lanes } = this;

    let i: number;
    let j: number;
    let iCount: number;
    let jCount: number;
    let callbacks: TickerCallback[];
    let maybeCallbacks: typeof callbacks | null;

    // Create callback lists.
    for (i = 0, iCount = lanes.length; i < iCount; i++) {
      // @ts-ignore
      maybeCallbacks = this._emitter._getListeners(lanes[i]);
      if (maybeCallbacks) _callbackLists.push(maybeCallbacks);
    }

    // Process callback lists.
    for (i = 0, iCount = _callbackLists.length; i < iCount; i++) {
      callbacks = _callbackLists[i];
      for (j = 0, jCount = callbacks.length; j < jCount; j++) {
        callbacks[j](time);
      }
    }

    // Reset callback lists array.
    _callbackLists.length = 0;

    // If we have listeners let's keep on ticking.
    if (this.autoTick && this._emitter.listenerCount()) {
      this.requestTick();
    }
  }

  requestTick() {
    if (this.autoTick && this._rafId === null) {
      this._rafId = requestAnimationFrame(this.tick);
    }
  }

  cancelTick() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  on(lane: TickerLane, callback: TickerCallback): TickerCallbackId {
    const id = this._emitter.on(lane, callback);
    this.requestTick();
    return id;
  }

  once(lane: TickerLane, callback: TickerCallback): TickerCallbackId {
    const id = this._emitter.once(lane, callback);
    this.requestTick();
    return id;
  }

  off(lane?: TickerLane, callback?: TickerCallback | TickerCallbackId) {
    return this._emitter.off(lane, callback);
  }
}
