"use client";

import { useRef, useEffect, useCallback } from "react";

/**
 * HTML5 video player for local/hosted video files.
 *
 * Prevents fast-forwarding beyond the furthest watched position, consistent
 * with the YouTube player behaviour.
 *
 * Playback URLs from R2 are presigned and expire (VIDEO_URL_TTL_SECONDS), so a
 * long lesson would otherwise fail part-way through when the signature lapses
 * and the next range request comes back 403. `onRefresh` is called shortly
 * before that happens — and again if the element errors — and the new URL is
 * swapped in with the playhead and play state preserved, so the learner sees
 * nothing.
 *
 * @param {string}   src         Presigned video URL
 * @param {string}   [captionSrc] Presigned WebVTT URL
 * @param {number}   [expiresIn]  Seconds until `src` stops working
 * @param {Function} [onRefresh]  Async () => ({ videoUrl, captionUrl })
 * @param {*}        [resetKey]   Changes only when the lesson changes
 */
export function LocalVideoPlayer({
  src,
  captionSrc,
  expiresIn,
  onRefresh,
  onProgress,
  resumeAt = 0,
  watchedSeconds = 0,
  resetKey,
  onEnded,
  className = "",
}) {
  const videoRef = useRef(null);
  const maxTimeRef = useRef(0);
  const refreshingRef = useRef(false);
  const reportedRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  // Furthest-watched resets when the lesson changes — NOT when `src` changes,
  // because a mid-playback URL refresh is a new src for the same lesson and
  // must not hand the learner a way to reset the seek guard.
  useEffect(() => {
    // Seed from what the server already has, so a learner returning to a video
    // does not start earning the same minutes over again — and cannot reset
    // the seek guard by reloading the page.
    maxTimeRef.current = watchedSeconds;
    reportedRef.current = watchedSeconds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  /**
   * Reports watch time. Sends the furthest point reached rather than a delta,
   * so a dropped request costs nothing — the next one carries the same total,
   * and the server keeps the maximum.
   */
  const report = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video || !onProgressRef.current) return;

    const watched = Math.floor(maxTimeRef.current);
    // Only worth a request once another 10s of genuinely new material is
    // watched. Rewatching, pausing and seeking backwards all send nothing.
    if (!force && watched - reportedRef.current < 10) return;
    if (watched <= 0) return;

    reportedRef.current = watched;
    onProgressRef.current({
      watchedSeconds: watched,
      positionSeconds: Math.floor(video.currentTime || 0),
    });
  }, []);

  /** Swap in a fresh URL without the learner losing their place. */
  const refresh = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !onRefresh || refreshingRef.current) return;

    refreshingRef.current = true;
    try {
      const next = await onRefresh();
      if (!next?.videoUrl || !videoRef.current) return;

      const resumeAt = video.currentTime;
      const wasPlaying = !video.paused && !video.ended;

      const restore = () => {
        video.removeEventListener("loadedmetadata", restore);
        // Guard against a browser clamping to 0 before metadata is ready.
        if (resumeAt > 0) video.currentTime = resumeAt;
        if (wasPlaying) void video.play().catch(() => {});
      };
      video.addEventListener("loadedmetadata", restore);

      video.src = next.videoUrl;
      video.load();
    } finally {
      refreshingRef.current = false;
    }
  }, [onRefresh]);

  // Re-sign a minute before expiry. A minute is enough slack for the round trip
  // on a slow connection without refreshing so early that it churns.
  useEffect(() => {
    if (!expiresIn || !onRefresh) return;
    const leadSeconds = 60;
    const delay = Math.max(expiresIn - leadSeconds, 30) * 1000;
    const timer = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timer);
  }, [expiresIn, onRefresh, refresh, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.currentTime > maxTimeRef.current) {
        maxTimeRef.current = video.currentTime;
      }
    };

    const onSeeking = () => {
      // Snap back if user tried to seek more than 2 s ahead of max watched
      if (video.currentTime > maxTimeRef.current + 2) {
        video.currentTime = maxTimeRef.current;
      }
    };

    const onEnd = () => {
      report(true);
      onEnded?.();
    };

    const onPause = () => report(true);

    // Resume where they left off, once the browser knows the duration.
    const onLoaded = () => {
      if (resumeAt > 0 && video.currentTime < 1) {
        video.currentTime = Math.min(resumeAt, video.duration || resumeAt);
      }
    };

    // A lapsed signature surfaces here as a decode/network error. One retry
    // with a fresh URL covers it; a genuinely broken file still fails.
    const onError = () => void refresh();

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("ended", onEnd);
    video.addEventListener("error", onError);
    video.addEventListener("pause", onPause);
    video.addEventListener("loadedmetadata", onLoaded);

    // Periodic flush, so closing the tab loses at most a few seconds.
    const ticker = setInterval(() => report(), 15_000);

    return () => {
      clearInterval(ticker);
      // Final flush on unmount — navigating away is the common exit.
      report(true);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("ended", onEnd);
      video.removeEventListener("error", onError);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [src, onEnded, refresh, report, resumeAt]);

  return (
    <div className={`aspect-video w-full bg-navy ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload nofullscreen"
        disablePictureInPicture
        className="w-full h-full"
        preload="metadata"
        // Only when a text track is present: a cross-origin <track> is fetched
        // under CORS rules, and opting in makes the video request CORS too.
        // Video-only lessons therefore keep working without a bucket GET rule.
        {...(captionSrc ? { crossOrigin: "anonymous" } : {})}
      >
        {captionSrc && (
          <track
            kind="subtitles"
            label="English"
            srcLang="en"
            src={captionSrc}
            default
          />
        )}
      </video>
    </div>
  );
}

export function isVideoFile(url) {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mov")
  );
}
