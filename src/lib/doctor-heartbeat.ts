/** How often an open doctor dashboard tells the server it is still there. */
export const DOCTOR_HEARTBEAT_MS = 60_000;

/**
 * Sends a heartbeat immediately and then on the interval.
 * A hidden tab does not count as presence. Closing, reloading, and opening
 * another tab are not distinguished: the server turns instant off only after
 * the heartbeat has been missing for about 3 minutes.
 */
export function startDoctorHeartbeat(
  send: () => void,
  intervalMs = DOCTOR_HEARTBEAT_MS,
  isVisible: () => boolean = () => typeof document === "undefined" || document.visibilityState !== "hidden",
): () => void {
  const beat = () => {
    if (!isVisible()) return;
    send();
  };
  beat();
  const id = setInterval(beat, intervalMs);
  return () => clearInterval(id);
}
