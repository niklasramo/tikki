export type XrFrameCallback = XRFrameRequestCallback;

export function createXrRequestFrame(xrSession: XRSession) {
  return (callback: XrFrameCallback) => {
    const handle = xrSession.requestAnimationFrame(callback);
    return () => xrSession.cancelAnimationFrame(handle);
  };
}
