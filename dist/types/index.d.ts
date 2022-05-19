import { Emitter, EventListenerId, EventName } from 'eventti';
export declare type Phase = EventName;
export declare type PhaseListener = (time: number) => void;
export declare type PhaseListenerId = EventListenerId;
export declare class Ticker<P extends Phase> {
    phases: P[];
    autoTick: boolean;
    protected _raf: number | null;
    protected _queue: PhaseListener[][];
    protected _emitter: Emitter<Record<P, PhaseListener>>;
    constructor(options?: {
        phases?: P[];
        autoTick?: boolean;
    });
    tick(time: number): void;
    start(): void;
    stop(): void;
    on(phase: P, listener: PhaseListener): PhaseListenerId;
    once(phase: P, listener: PhaseListener): PhaseListenerId;
    off(phase?: P, listener?: PhaseListener | PhaseListenerId): void;
    listenerCount(phase?: P): number | void;
}
