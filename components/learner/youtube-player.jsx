"use client";

import { useEffect, useRef, useId, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Settings, Check } from "lucide-react";

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

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function YoutubePlayer({ videoId, onEnded, className = "" }) {
  const uid = useId();
  const playerId = `yt-${uid.replace(/:/g, "")}`;
  const playerRef = useRef(null);
  const maxTimeRef = useRef(0);
  const trackingRef = useRef(null);
  const mountedRef = useRef(true);
  const speedMenuRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [speed, setSpeed] = useState(1);

  const startTracking = useCallback(() => {
    clearInterval(trackingRef.current);
    trackingRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return;
      const t = playerRef.current.getCurrentTime();
      setCurrentTime(t);
      if (t > maxTimeRef.current) maxTimeRef.current = t;
    }, 250);
  }, []);

  const stopTracking = useCallback(() => {
    clearInterval(trackingRef.current);
  }, []);

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
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady(e) {
            if (!mountedRef.current) return;
            setReady(true);
            setDuration(e.target.getDuration());
            setVolume(e.target.getVolume());
          },
          onStateChange(event) {
            if (!mountedRef.current) return;
            const YT = window.YT;

            if (event.data === YT.PlayerState.PLAYING) {
              setPlaying(true);
              startTracking();
            }

            if (
              event.data === YT.PlayerState.PAUSED ||
              event.data === YT.PlayerState.BUFFERING
            ) {
              stopTracking();
              const t = playerRef.current?.getCurrentTime?.() ?? 0;
              if (t > maxTimeRef.current + 2) {
                playerRef.current.seekTo(maxTimeRef.current, true);
                playerRef.current.pauseVideo();
              } else {
                if (t > maxTimeRef.current) maxTimeRef.current = t;
              }
              if (event.data === YT.PlayerState.PAUSED) setPlaying(false);
            }

            if (event.data === YT.PlayerState.ENDED) {
              stopTracking();
              setPlaying(false);
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
      stopTracking();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeed) return;
    const handler = (e) => {
      if (!speedMenuRef.current?.contains(e.target)) setShowSpeed(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSpeed]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    playing ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const handleSeek = (e) => {
    const target = Number(e.target.value);
    const safe = Math.min(target, maxTimeRef.current + 2);
    playerRef.current?.seekTo(safe, true);
    setCurrentTime(safe);
  };

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    playerRef.current?.setVolume(v);
    if (v === 0) { setMuted(true); playerRef.current?.mute(); }
    else { setMuted(false); playerRef.current?.unMute(); }
  };

  const toggleMute = () => {
    if (muted) {
      playerRef.current?.unMute();
      playerRef.current?.setVolume(volume || 50);
      setMuted(false);
    } else {
      playerRef.current?.mute();
      setMuted(true);
    }
  };

  const handleSpeed = (s) => {
    playerRef.current?.setPlaybackRate(s);
    setSpeed(s);
    setShowSpeed(false);
  };

  const playedPct  = duration ? (currentTime / duration) * 100 : 0;
  const maxPct     = duration ? (maxTimeRef.current / duration) * 100 : 0;
  const volPct     = muted ? 0 : volume;

  return (
    <div className={`overflow-hidden rounded-lg bg-black ${className}`}>
      {/* ── Video + transparent overlay (blocks YouTube hover UI) ── */}
      <div className="relative aspect-video">
        <div id={playerId} className="w-full h-full" />
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={togglePlay}
        />
      </div>

      {/* ── Custom Controls ── */}
      {ready && (
        <div className="bg-[#0f0f0f] select-none px-3.5 pt-2.5 pb-3 space-y-2">

          {/* Progress bar */}
          <div className="relative h-1 group cursor-pointer">
            {/* max-watched track */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/25 pointer-events-none"
              style={{ width: `${maxPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* visible track */}
            <div className="absolute inset-0 rounded-full overflow-hidden bg-white/20">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: `${playedPct}%` }}
              />
            </div>
            {/* thumb dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow pointer-events-none"
              style={{ left: `${playedPct}%` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="text-white/90 hover:text-white transition-colors"
            >
              {playing
                ? <Pause className="h-4 w-4 fill-white stroke-none" />
                : <Play  className="h-4 w-4 fill-white stroke-none" />}
            </button>

            {/* Time */}
            <span className="text-[11px] tabular-nums text-white/50">
              {formatTime(currentTime)}
              <span className="mx-1 text-white/25">/</span>
              {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <div
              className="flex items-center gap-2"
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button
                onClick={toggleMute}
                className="text-white/70 hover:text-white transition-colors"
              >
                {muted || volume === 0
                  ? <VolumeX className="h-4 w-4" />
                  : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Volume slider */}
              <div
                className={`relative h-1 transition-all duration-200 ${showVolume ? "w-20 opacity-100" : "w-0 opacity-0"} overflow-hidden`}
              >
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volPct}
                  onChange={handleVolume}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="absolute inset-0 rounded-full overflow-hidden bg-white/20">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${volPct}%` }}
                  />
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-white shadow pointer-events-none"
                  style={{ left: `${volPct}%` }}
                />
              </div>
            </div>

            {/* Settings / Playback speed */}
            <div className="relative" ref={speedMenuRef}>
              <button
                onClick={() => setShowSpeed((v) => !v)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>

              {showSpeed && (
                <div className="absolute bottom-7 right-0 z-20 bg-[#1a1a1a] border border-white/10 rounded-xl py-2 w-44 shadow-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3.5 pb-1.5">
                    Playback Speed
                  </p>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeed(s)}
                      className="flex items-center justify-between w-full px-3.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/8 transition-colors"
                    >
                      <span>{s === 1 ? "Normal" : `${s}×`}</span>
                      {speed === s && <Check className="h-3 w-3 text-white/60" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
