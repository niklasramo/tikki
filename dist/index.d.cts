import { EventName, EventListenerId, EmitterOptions, Emitter, EmitterDedupe } from 'eventti';

type PhaseName = EventName;
type PhaseListenerId = EventListenerId;
type PhaseListener = (time: number, ...args: any) => void;
type DefaultPhaseListener = (time: number) => void;
type RequestFrame<FC extends PhaseListener = DefaultPhaseListener> = (callback: FC) => CancelFrame;
type CancelFrame = () => void;
type TickerPhase<T extends Ticker<PhaseName>> = Parameters<T['on']>[0];
type TickerPhaseListener<T extends Ticker<PhaseName, PhaseListener> = Ticker<PhaseName, DefaultPhaseListener>> = Parameters<T['on']>[1];
type TickerOptions<P extends PhaseName, FC extends PhaseListener> = {
    phases?: P[];
    paused?: boolean;
    onDemand?: boolean;
    requestFrame?: RequestFrame<FC>;
    dedupe?: EmitterOptions['dedupe'];
    getId?: EmitterOptions['getId'];
};
declare class Ticker<P extends PhaseName, FC extends PhaseListener = DefaultPhaseListener> {
    protected _phases: P[];
    protected _paused: boolean;
    protected _onDemand: boolean;
    protected _requestFrame: RequestFrame<FC>;
    protected _cancelFrame: CancelFrame | null;
    protected _empty: boolean;
    protected _queue: FC[][];
    protected _emitter: Emitter<Record<P, FC>>;
    protected _getListeners: (phase: P) => FC[] | null;
    constructor(options?: TickerOptions<P, FC>);
    get phases(): P[];
    set phases(phases: P[]);
    get requestFrame(): RequestFrame<FC>;
    set requestFrame(requestFrame: RequestFrame<FC>);
    get paused(): boolean;
    set paused(paused: boolean);
    get onDemand(): boolean;
    set onDemand(onDemand: boolean);
    get dedupe(): EmitterDedupe;
    set dedupe(dedupe: EmitterDedupe);
    get getId(): NonNullable<EmitterOptions['getId']>;
    set getId(getId: NonNullable<EmitterOptions['getId']>);
    tick(...args: Parameters<FC>): void;
    on(phase: P, listener: FC, listenerId?: PhaseListenerId): PhaseListenerId;
    once(phase: P, listener: FC, listenerId?: PhaseListenerId): PhaseListenerId;
    off(phase?: P, listenerId?: PhaseListenerId): void;
    listenerCount(phase?: P): number | void;
    protected _request(): void;
    protected _cancel(): void;
}

declare function createRequestFrame(fallbackFPS?: number): (callback: FrameRequestCallback) => () => void;

type XrFrameCallback = XRFrameRequestCallback;
declare function createXrRequestFrame(xrSession: XRSession): (callback: XrFrameCallback) => () => void;

export { type CancelFrame, type DefaultPhaseListener, type PhaseListener, type PhaseListenerId, type PhaseName, type RequestFrame, Ticker, type TickerOptions, type TickerPhase, type TickerPhaseListener, type XrFrameCallback, createRequestFrame, createXrRequestFrame };
