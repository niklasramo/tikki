import { EventName, EventListenerId, Emitter, EventListenerIdDedupeMode } from 'eventti';

declare type FrameCallback = (time: number, ...args: any) => void;
declare type CancelFrame = () => void;
declare type RequestFrame<FC extends FrameCallback> = (callback: FC) => CancelFrame;
declare type Phase = EventName;
declare type PhaseListenerId = EventListenerId;
declare enum AutoTickState {
    PAUSED = 1,
    ON_DEMAND = 2,
    CONTINUOUS = 3
}
declare class Ticker<P extends Phase, FC extends FrameCallback> {
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

declare function createRequestFrame(xrSession?: XRSession, fallbackFPS?: number): (callback: FrameRequestCallback) => () => void;

export { AutoTickState, CancelFrame, FrameCallback, Phase, PhaseListenerId, RequestFrame, Ticker, createRequestFrame };
