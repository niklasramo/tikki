const T = typeof performance === 'undefined' ? Date : performance;

export type RequestId = any;

export type RequestAnimationFrame = (callback: (time: number) => any) => RequestId;

export type CancelAnimationFrame = (requestId: RequestId) => any;

type RafMethods = {
  requestAnimationFrame: RequestAnimationFrame;
  cancelAnimationFrame: CancelAnimationFrame;
};

export function getRafFallbackMethods(frameTime = 1000 / 60): RafMethods {
  return {
    requestAnimationFrame: (callback: (time: number) => any) => {
      return setTimeout(() => {
        callback(T.now());
      }, frameTime);
    },
    cancelAnimationFrame: (requestId: any) => {
      clearTimeout(requestId);
    },
  };
}

export function getRafMethods(): RafMethods {
  if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
    return { requestAnimationFrame, cancelAnimationFrame };
  } else {
    return getRafFallbackMethods();
  }
}
