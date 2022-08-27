import { EventName, EventListenerId, Emitter, EventListenerIdDedupeMode } from 'eventti';

declare type FrameCallback = (time: number, ...args: any) => void;
declare type DefaultFrameCallback = (time: number) => void;
declare type RequestFrame<FC extends FrameCallback = DefaultFrameCallback> = (callback: FC) => CancelFrame;
declare type CancelFrame = () => void;
declare type Phase<T extends Ticker<EventName>> = Parameters<T['on']>[0];
declare type PhaseListener<T extends Ticker<EventName, FrameCallback> = Ticker<EventName, DefaultFrameCallback>> = Parameters<T['on']>[1];
declare type PhaseListenerId = EventListenerId;
declare enum AutoTickState {
    PAUSED = 1,
    ON_DEMAND = 2,
    CONTINUOUS = 3
}
declare class Ticker<P extends EventName, FC extends FrameCallback = DefaultFrameCallback> {
    phases: P[];
    protected _autoTick: AutoTickState;
    protected _requestFrame: RequestFrame<FC> | null;
    protected _cancelFrame: CancelFrame | null;
    protected _queue: FC[][];
    protected _emitter: Emitter<Record<P, FC>>;
    constructor(options?: {
        phases?: P[];
        autoTick?: AutoTickState;
        allowDuplicateListeners?: boolean;
        idDedupeMode?: EventListenerIdDedupeMode;
        requestFrame?: RequestFrame<FC>;
    });
    get requestFrame(): RequestFrame<FC> | null;
    set requestFrame(requestFrame: RequestFrame<FC> | null);
    get autoTick(): AutoTickState;
    set autoTick(autoTickState: AutoTickState);
    get allowDuplicateListeners(): boolean;
    set allowDuplicateListeners(allowDuplicateListeners: boolean);
    get idDedupeMode(): EventListenerIdDedupeMode;
    set idDedupeMode(idDedupeMode: EventListenerIdDedupeMode);
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

declare type XrFrameCallback = XRFrameRequestCallback;
declare function createXrRequestFrame(xrSession: XRSession): (callback: XrFrameCallback) => () => void;

export { AutoTickState, CancelFrame, DefaultFrameCallback, FrameCallback, Phase, PhaseListener, PhaseListenerId, RequestFrame, Ticker, XrFrameCallback, createRequestFrame, createXrRequestFrame };
