import { Ticker, TickerOptions, Phase, FrameCallback, FrameCallbackId } from 'Ticker.js';

import { createRequestFrame } from './utils/createRequestFrame.js';

import { UnionToIntersection } from './types.js';

export type RequestFrame<FC extends FrameCallback = AutoTickerDefaultFrameCallback> = (
  callback: FC,
) => CancelFrame;

export type CancelFrame = () => void;

export type AutoTickerDefaultFrameCallback = (time: number) => void;

export interface AutoTickerOptions<P extends Phase, FC extends FrameCallback>
  extends TickerOptions<P> {
  paused?: boolean;
  onDemand?: boolean;
  requestFrame?: RequestFrame<FC>;
}

export class AutoTicker<
  P extends Phase,
  FC extends FrameCallback = AutoTickerDefaultFrameCallback,
> extends Ticker<P, FC> {
  protected _paused: boolean;
  protected _onDemand: boolean;
  protected _requestFrame: RequestFrame<FC>;
  protected _cancelFrame: CancelFrame | null;
  protected _empty: boolean;

  constructor(options: AutoTickerOptions<P, FC> = {}) {
    const {
      paused = false,
      onDemand = false,
      requestFrame = createRequestFrame(),
      ...tickerOptions
    } = options;

    super(tickerOptions);

    this._paused = paused;
    this._onDemand = onDemand;
    this._requestFrame = requestFrame;
    this._cancelFrame = null;
    this._empty = true;

    // Request the first frame if not paused and not on demand.
    if (!paused && !onDemand) this._request();
  }

  get phases() {
    return this._phases;
  }

  set phases(phases: P[]) {
    this._phases = phases;
    if (phases.length) {
      this._empty = false;
      this._request();
    } else {
      this._empty = true;
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
    return this._onDemand;
  }

  set onDemand(onDemand: boolean) {
    this._onDemand = onDemand;
    if (!onDemand) this._request();
  }

  get requestFrame() {
    return this._requestFrame;
  }

  set requestFrame(requestFrame: RequestFrame<FC>) {
    if (this._requestFrame === requestFrame) return;
    this._requestFrame = requestFrame;
    if (this._cancelFrame) {
      this._cancel();
      this._request();
    }
  }

  tick(...args: Parameters<FC>): void {
    // Make sure the queue is empty.
    this._assertEmptyQueue();

    // Clear the cancel frame reference.
    this._cancelFrame = null;

    // Request the next frame if onDemand is false.
    if (!this._onDemand) this._request();

    // Return early if the ticker has no listeners for _active_ phases.
    if (this._empty) return;

    // Fill the queue with listeners and return early if there are no listeners
    // to call.
    if (!this._fillQueue().length) {
      this._empty = true;
      return;
    }

    // Request the next frame if onDemand is true.
    if (this._onDemand) this._request();

    // Process the queue.
    this._processQueue(...args);
  }

  on(
    phase: P,
    frameCallback: UnionToIntersection<FC>,
    frameCallbackId?: FrameCallbackId,
  ): FrameCallbackId {
    const id = super.on(phase, frameCallback, frameCallbackId);
    this._empty = false;
    this._request();
    return id;
  }

  once(
    phase: P,
    frameCallback: UnionToIntersection<FC>,
    frameCallbackId?: FrameCallbackId,
  ): FrameCallbackId {
    const id = super.once(phase, frameCallback, frameCallbackId);
    this._empty = false;
    this._request();
    return id;
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
