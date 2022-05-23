export declare type RequestId = any;
export declare type RequestAnimationFrame = (callback: (time: number) => any) => RequestId;
export declare type CancelAnimationFrame = (requestId: RequestId) => any;
declare type RafMethods = {
    requestAnimationFrame: RequestAnimationFrame;
    cancelAnimationFrame: CancelAnimationFrame;
};
export declare function getRafFallbackMethods(frameTime?: number): RafMethods;
export declare function getRafMethods(): RafMethods;
export {};
