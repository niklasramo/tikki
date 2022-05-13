import { Emitter, EventListenerId } from 'eventti';
export declare type TickerCallback = (time: number) => void;
export declare type TickerCallbackId = EventListenerId;
export declare class Ticker<TickerLane extends string | symbol> {
    lanes: TickerLane[];
    autoTick: boolean;
    protected _rafId: number | null;
    protected _emitter: Emitter<Record<TickerLane, TickerCallback>>;
    protected _callbackLists: TickerCallback[][];
    constructor();
    tick(time: number): void;
    requestTick(): void;
    cancelTick(): void;
    on(lane: TickerLane, callback: TickerCallback): TickerCallbackId;
    once(lane: TickerLane, callback: TickerCallback): TickerCallbackId;
    off(lane?: TickerLane, callback?: TickerCallback | TickerCallbackId): void;
}
