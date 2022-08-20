import { EventListenerIdDedupeMode, EventName, EventListenerId, Emitter } from 'eventti';

declare enum AutoTickState {
    OFF = 0,
    ON = 1,
    PAUSED = 2
}
declare type TickId = any;
declare type RequestTick = (callback: (time: number) => any) => TickId;
declare type CancelTick = (requestId: TickId) => any;
declare type TickerOptions<P extends Phase> = {
    phases?: P[];
    autoTick?: AutoTickState;
    allowDuplicateListeners?: boolean;
    idDedupeMode?: EventListenerIdDedupeMode;
    requestTick?: RequestTick;
    cancelTick?: CancelTick;
};
declare type Phase = EventName;
declare type PhaseListener = (time: number) => void;
declare type PhaseListenerId = EventListenerId;
declare class Ticker<P extends Phase> {
    phases: P[];
    readonly allowDuplicateListeners: boolean;
    protected _autoTick: AutoTickState;
    protected _autoTickId: TickId;
    protected _requestTick: RequestTick;
    protected _cancelTick: CancelTick;
    protected _queue: PhaseListener[][];
    protected _emitter: Emitter<Record<P, PhaseListener>>;
    constructor(options?: TickerOptions<P>);
    get autoTick(): AutoTickState;
    set autoTick(autoTickState: AutoTickState);
    get idDedupeMode(): EventListenerIdDedupeMode;
    set idDedupeMode(idDedupeMode: EventListenerIdDedupeMode);
    tick(time: number): void;
    on(phase: P, listener: PhaseListener, listenerId?: PhaseListenerId): PhaseListenerId;
    once(phase: P, listener: PhaseListener, listenerId?: PhaseListenerId): PhaseListenerId;
    off(phase?: P, listener?: PhaseListener | PhaseListenerId): void;
    listenerCount(phase?: P): number | void;
    protected _requestFrame(): void;
    protected _cancelFrame(): void;
}

export { AutoTickState, CancelTick, Phase, PhaseListener, PhaseListenerId, RequestTick, TickId, Ticker, TickerOptions };
