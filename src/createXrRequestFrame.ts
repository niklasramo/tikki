export function createXrRequestFrame(xrSession: XRSession) {
  return (callback: XRFrameRequestCallback) => {
    const handle = xrSession.requestAnimationFrame(callback);
    return () => xrSession.cancelAnimationFrame(handle);
  };
}
