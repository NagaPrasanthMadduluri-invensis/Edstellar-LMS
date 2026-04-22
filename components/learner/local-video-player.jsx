"use client";

import { useRef, useEffect } from "react";

/**
 * HTML5 video player for local/hosted video files.
 * Prevents fast-forwarding beyond the furthest watched position,
 * consistent with the YouTube player behaviour.
 */
export function LocalVideoPlayer({ src, onEnded, className = "" }) {
  const videoRef = useRef(null);
  const maxTimeRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    maxTimeRef.current = 0;

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
      maxTimeRef.current = 0;
      onEnded?.();
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("ended", onEnd);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("ended", onEnd);
    };
  }, [src, onEnded]);

  return (
    <div className={`aspect-video w-full bg-black ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload nofullscreen"
        disablePictureInPicture
        className="w-full h-full"
        preload="metadata"
      />
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
