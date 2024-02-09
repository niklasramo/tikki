import { EventName, EventListenerId, Emitter, EmitterOptions, EmitterDedupe } from 'eventti';

type FrameCallback = (time: number, ...args: any) => void;
type DefaultFrameCallback = (time: number) => void;
type RequestFrame<FC extends FrameCallback = DefaultFrameCallback> = (callback: FC) => CancelFrame;
type CancelFrame = () => void;
type Phase<T extends Ticker<EventName>> = Parameters<T['on']>[0];
type PhaseListener<T extends Ticker<EventName, FrameCallback> = Ticker<EventName, DefaultFrameCallback>> = Parameters<T['on']>[1];
type PhaseListenerId = EventListenerId;
declare enum TickMode {
    PAUSED = 1,
    ON_DEMAND = 2,
    CONTINUOUS = 3
}
declare class Ticker<P extends EventName, FC extends FrameCallback = DefaultFrameCallback> {
    phases: P[];
    protected _tickMode: TickMode;
    protected _requestFrame: RequestFrame<FC> | null;
    protected _cancelFrame: CancelFrame | null;
    protected _queue: FC[][];
    protected _emitter: Emitter<Record<P, FC>>;
    protected _getListeners: Emitter<Record<P, FC>>['_getListeners'];
    constructor(options?: {
        phases?: P[];
        tickMode?: TickMode;
        requestFrame?: RequestFrame<FC>;
        dedupe?: EmitterOptions['dedupe'];
        getId?: EmitterOptions['getId'];
    });
    get requestFrame(): RequestFrame<FC> | null;
    set requestFrame(requestFrame: RequestFrame<FC> | null);
    get tickMode(): TickMode;
    set tickMode(TickMode: TickMode);
    get dedupe(): EmitterDedupe;
    set dedupe(dedupe: EmitterDedupe);
    get getId(): NonNullable<EmitterOptions['getId']>;
    set getId(getId: NonNullable<EmitterOptions['getId']>);
    tick(...args: Parameters<FC>): void;
    on(phase: P, listener: FC, listenerId?: PhaseListenerId): PhaseListenerId;
    once(phase: P, listener: FC, listenerId?: PhaseListenerId): PhaseListenerId;
    off(phase?: P, listener?: FC | PhaseListenerId): void;
    listenerCount(phase?: P): number | void;
    protected _request(): void;
    protected _cancel(): void;
    protected _kickstart(): void;
}

declare function createRequestFrame(fallbackFPS?: number): (callback: FrameRequestCallback) => () => void;

type XrFrameCallback = XRFrameRequestCallback;
declare function createXrRequestFrame(xrSession: XRSession): (callback: XrFrameCallback) => () => void;

export { type CancelFrame, type DefaultFrameCallback, type FrameCallback, type Phase, type PhaseListener, type PhaseListenerId, type RequestFrame, TickMode, Ticker, type XrFrameCallback, createRequestFrame, createXrRequestFrame };
