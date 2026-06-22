// Picture-in-Picture for the consultation call.
//
// Floats a call video in a small always-on-top window that stays while the user
// is on another tab — like Google Meet. It prefers the REMOTE (other person's)
// video, and falls back to the LOCAL self-view when the remote has no media yet
// (e.g. still connecting) so the pop-out button always does something.
//
// Auto-pop on tab-hide uses the native `autoPictureInPicture` attribute (Chrome),
// which is the only reliable way to auto-enter PiP without a user gesture; the
// manual toggle (a real click) always works.

import { useCallback, useEffect, useState } from "react";

type VRef = React.RefObject<HTMLVideoElement | null>;

interface Options {
  /** Auto-enter PiP when the tab is hidden (native autoPictureInPicture). */
  autoOnHide?: boolean;
  /** Only auto-pop while this is true (e.g. connected & not minimized). */
  active?: boolean;
  /** Fallback video (the local self-view) used when the primary has no media. */
  fallbackRef?: VRef;
}

export function usePictureInPicture(primaryRef: VRef, opts: Options = {}) {
  const supported =
    typeof document !== "undefined" &&
    "pictureInPictureEnabled" in document &&
    (document as any).pictureInPictureEnabled;

  const [isPipActive, setIsPipActive] = useState(false);

  // Choose the video to float: the remote if it has media, else the local one.
  const pickVideo = useCallback((): HTMLVideoElement | null => {
    const p = primaryRef.current;
    if (p && !p.disablePictureInPicture && p.readyState >= 1) return p;
    const f = opts.fallbackRef?.current;
    if (f && !f.disablePictureInPicture && f.readyState >= 1) return f;
    return p ?? opts.fallbackRef?.current ?? null;
  }, [primaryRef, opts.fallbackRef]);

  const enter = useCallback(async () => {
    if (!supported) return;
    const v = pickVideo();
    if (!v) return;
    try {
      if ((document as any).pictureInPictureElement) return; // already in PiP
      await v.requestPictureInPicture();
    } catch {
      /* no media yet / needs gesture — ignore */
    }
  }, [supported, pickVideo]);

  const exit = useCallback(async () => {
    try {
      if ((document as any).pictureInPictureElement) {
        await (document as any).exitPictureInPicture();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPipActive) exit();
    else enter();
  }, [isPipActive, enter, exit]);

  // Track PiP state from both video elements' events.
  useEffect(() => {
    const vids = [primaryRef.current, opts.fallbackRef?.current].filter(
      Boolean,
    ) as HTMLVideoElement[];
    const onEnter = () => setIsPipActive(true);
    const onLeave = () => setIsPipActive(false);
    vids.forEach((v) => {
      v.addEventListener("enterpictureinpicture", onEnter);
      v.addEventListener("leavepictureinpicture", onLeave);
    });
    return () =>
      vids.forEach((v) => {
        v.removeEventListener("enterpictureinpicture", onEnter);
        v.removeEventListener("leavepictureinpicture", onLeave);
      });
  }, [primaryRef, opts.fallbackRef]);

  // Native auto-PiP: Chrome auto-enters PiP for a video flagged
  // autoPictureInPicture when the tab is hidden. Toggle the flag on the video
  // that currently has media so the right one floats.
  useEffect(() => {
    if (!supported) return;
    const want = !!opts.autoOnHide && opts.active !== false;
    const apply = () => {
      const active = pickVideo();
      [primaryRef.current, opts.fallbackRef?.current].forEach((v) => {
        if (!v) return;
        try {
          (v as any).autoPictureInPicture = want && v === active;
        } catch {
          /* attribute unsupported */
        }
      });
    };
    apply();
    // Re-apply when the primary gets media so the remote becomes the auto target.
    const p = primaryRef.current;
    p?.addEventListener("loadedmetadata", apply);
    return () => p?.removeEventListener("loadedmetadata", apply);
  }, [supported, opts.autoOnHide, opts.active, primaryRef, opts.fallbackRef, pickVideo]);

  return { supported, isPipActive, enter, exit, toggle };
}
