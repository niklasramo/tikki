export type XrFrameCallback = XRFrameRequestCallback;

export function createXrRequestFrame(xrSession: XRSession) {
  return (callback: XrFrameCallback) => {
    const id = xrSession.requestAnimationFrame(callback);
    return () => xrSession.cancelAnimationFrame(id);
  };
}
