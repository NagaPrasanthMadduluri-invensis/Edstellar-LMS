"use client";

import { useEffect, useRef, useId } from "react";

// Singleton promise so the script only loads once across all instances
let _ytApiPromise = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (_ytApiPromise) return _ytApiPromise;
  if (window.YT?.Player) {
    _ytApiPromise = Promise.resolve();
    return _ytApiPromise;
  }
  _ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return _ytApiPromise;
}

export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function isYouTubeUrl(url) {
  return !!(url && (url.includes("youtu.be") || url.includes("youtube.com")));
}

/**
 * YouTube embed that prevents fast-forwarding beyond the furthest watched position.
 * Uses the YouTube IFrame Player API to track currentTime and snap back if the
 * user tries to seek ahead.
 */
export function YoutubePlayer({ videoId, onEnded, className = "" }) {
  const uid = useId();
  const playerId = `yt-${uid.replace(/:/g, "")}`;
  const playerRef = useRef(null);
  const maxTimeRef = useRef(0);     // furthest second the learner has actually watched
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let destroyed = false;

    loadYouTubeApi().then(() => {
      if (destroyed || !mountedRef.current) return;

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          iv_load_policy: 3,   // hide annotations
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onStateChange(event) {
            const YT = window.YT;

            if (event.data === YT.PlayerState.PLAYING) {
              // Track max watched time every 500 ms
              clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.() ?? 0;
                if (t > maxTimeRef.current) maxTimeRef.current = t;
              }, 500);
            }

            if (
              event.data === YT.PlayerState.PAUSED ||
              event.data === YT.PlayerState.BUFFERING
            ) {
              clearInterval(intervalRef.current);
              const t = playerRef.current?.getCurrentTime?.() ?? 0;
              // If user seeked more than 2 s ahead of max watched, snap back
              if (t > maxTimeRef.current + 2) {
                playerRef.current.seekTo(maxTimeRef.current, true);
                playerRef.current.pauseVideo();
              } else {
                // Normal pause — update max if they're at or before it
                if (t > maxTimeRef.current) maxTimeRef.current = t;
              }
            }

            if (event.data === YT.PlayerState.ENDED) {
              clearInterval(intervalRef.current);
              maxTimeRef.current = 0;
              onEnded?.();
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className={`aspect-video w-full bg-black ${className}`}>
      <div id={playerId} className="w-full h-full" />
    </div>
  );
}
