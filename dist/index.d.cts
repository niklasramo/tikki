import { EventName, EventListenerId, EmitterDedupe, Emitter } from 'eventti';

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type Phase = EventName;
type FrameCallbackId = EventListenerId;
type FrameCallback = (...args: any) => void;
interface TickerOptions<P extends Phase> {
    phases?: P[];
    dedupe?: TickerDedupe;
    getId?: (frameCallback: FrameCallback) => FrameCallbackId;
}
type TickerDedupe = EmitterDedupe;
declare const TickerDedupe: {
    readonly ADD: "add";
    readonly UPDATE: "update";
    readonly IGNORE: "ignore";
    readonly THROW: "throw";
};
declare class Ticker<P extends Phase, FC extends FrameCallback = FrameCallback> {
    protected _phases: P[];
    protected _queue: FC[][];
    protected _emitter: Emitter<Record<P, FC>>;
    protected _getListeners: (phase: P) => FC[] | null;
    constructor(options?: TickerOptions<P>);
    get phases(): P[];
    set phases(phases: P[]);
    get dedupe(): TickerDedupe;
    set dedupe(dedupe: TickerDedupe);
    get getId(): (frameCallback: FrameCallback) => FrameCallbackId;
    set getId(getId: (frameCallback: FrameCallback) => FrameCallbackId);
    tick(...args: Parameters<FC>): void;
    on(phase: P, frameCallback: UnionToIntersection<FC>, frameCallbackId?: FrameCallbackId): FrameCallbackId;
    once(phase: P, frameCallback: UnionToIntersection<FC>, frameCallbackId?: FrameCallbackId): FrameCallbackId;
    off(phase?: P, frameCallbackId?: FrameCallbackId): void;
    count(phase?: P): number | void;
    protected _assertEmptyQueue(): void;
    protected _fillQueue(): FC[][];
    protected _processQueue(...args: Parameters<FC>): void;
}

type RequestFrame<FC extends FrameCallback = AutoTickerDefaultFrameCallback> = (callback: FC) => CancelFrame;
type CancelFrame = () => void;
type AutoTickerDefaultFrameCallback = (time: number) => void;
interface AutoTickerOptions<P extends Phase, FC extends FrameCallback> extends TickerOptions<P> {
    paused?: boolean;
    onDemand?: boolean;
    requestFrame?: RequestFrame<FC>;
}
declare class AutoTicker<P extends Phase, FC extends FrameCallback = AutoTickerDefaultFrameCallback> extends Ticker<P, FC> {
    protected _paused: boolean;
    protected _onDemand: boolean;
    protected _requestFrame: RequestFrame<FC>;
    protected _cancelFrame: CancelFrame | null;
    protected _empty: boolean;
    constructor(options?: AutoTickerOptions<P, FC>);
    get phases(): P[];
    set phases(phases: P[]);
    get paused(): boolean;
    set paused(paused: boolean);
    get onDemand(): boolean;
    set onDemand(onDemand: boolean);
    get requestFrame(): RequestFrame<FC>;
    set requestFrame(requestFrame: RequestFrame<FC>);
    tick(...args: Parameters<FC>): void;
    on(phase: P, frameCallback: UnionToIntersection<FC>, frameCallbackId?: FrameCallbackId): FrameCallbackId;
    once(phase: P, frameCallback: UnionToIntersection<FC>, frameCallbackId?: FrameCallbackId): FrameCallbackId;
    protected _request(): void;
    protected _cancel(): void;
}

declare class Clock {
    readonly ticks: number;
    readonly startTime: number;
    readonly time: number;
    readonly deltaTime: number;
    readonly elapsedTime: number;
    timescale: number;
    constructor();
    tick(time: number, dt?: number): void;
}

declare function createRequestFrame(fallbackFPS?: number): (callback: FrameRequestCallback) => () => void;

type XrFrameCallback = XRFrameRequestCallback;
declare function createXrRequestFrame(xrSession: XRSession): (callback: XrFrameCallback) => () => void;

export { AutoTicker, type AutoTickerDefaultFrameCallback, type AutoTickerOptions, type CancelFrame, Clock, type FrameCallback, type FrameCallbackId, type Phase, type RequestFrame, Ticker, TickerDedupe, type TickerOptions, type XrFrameCallback, createRequestFrame, createXrRequestFrame };
