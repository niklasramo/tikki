export function createRequestFrame(fallbackFPS = 60) {
  if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
    return (callback: FrameRequestCallback) => {
      const id = requestAnimationFrame(callback);
      return () => cancelAnimationFrame(id);
    };
  } else {
    const frameTime = 1000 / fallbackFPS;
    const now = typeof performance === 'undefined' ? () => Date.now() : () => performance.now();
    return (callback: FrameRequestCallback) => {
      const id = setTimeout(() => callback(now()), frameTime);
      return () => clearTimeout(id);
    };
  }
}
