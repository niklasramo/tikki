export function createRequestFrame(xrSession?: XRSession, fallbackFPS = 60) {
  if (xrSession) {
    return (callback: XRFrameRequestCallback) => {
      const handle = xrSession.requestAnimationFrame(callback);
      return () => {
        xrSession.cancelAnimationFrame(handle);
      };
    };
  } else if (
    typeof requestAnimationFrame === 'function' &&
    typeof cancelAnimationFrame === 'function'
  ) {
    return (callback: FrameRequestCallback) => {
      const handle = requestAnimationFrame(callback);
      return () => {
        cancelAnimationFrame(handle);
      };
    };
  } else {
    const frameTime = 1000 / fallbackFPS;
    const now = typeof performance === 'undefined' ? () => Date.now() : () => performance.now();
    return (callback: FrameRequestCallback) => {
      const handle = setTimeout(() => callback(now()), frameTime);
      return () => {
        clearTimeout(handle);
      };
    };
  }
}
