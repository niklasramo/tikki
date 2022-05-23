import { Emitter, EventListenerId, EventName } from 'eventti';
import { RequestAnimationFrame, CancelAnimationFrame } from './raf';
declare type TickerOptions<P extends Phase> = {
    phases?: P[];
    autoTick?: boolean;
    raf?: RequestAnimationFrame;
    caf?: CancelAnimationFrame;
};
export declare type Phase = EventName;
export declare type PhaseListener = (time: number) => void;
export declare type PhaseListenerId = EventListenerId;
export declare class Ticker<P extends Phase> {
    phases: P[];
    autoTick: boolean;
    protected _raf: RequestAnimationFrame;
    protected _caf: CancelAnimationFrame;
    protected _rafId: number | null;
    protected _queue: PhaseListener[][];
    protected _emitter: Emitter<Record<P, PhaseListener>>;
    constructor(options?: TickerOptions<P>);
    tick(time: number): void;
    start(): void;
    stop(): void;
    on(phase: P, listener: PhaseListener): PhaseListenerId;
    once(phase: P, listener: PhaseListener): PhaseListenerId;
    off(phase?: P, listener?: PhaseListener | PhaseListenerId): void;
    listenerCount(phase?: P): number | void;
}
export {};
