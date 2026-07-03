"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const BASE_RATE = 0.6;
const SLOW_RATE = 0.25;

function subscribeMediaQuery(query: string, callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", callback);

  return () => mediaQuery.removeEventListener("change", callback);
}

function getMediaQuerySnapshot(query: string) {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (callback: () => void) => subscribeMediaQuery(query, callback),
    [query],
  );
  const getSnapshot = useCallback(() => getMediaQuerySnapshot(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const useVideo = isDesktop && !prefersReducedMotion;

  useEffect(() => {
    if (!useVideo) return;

    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = BASE_RATE;

    const tick = () => {
      if (!video.duration) return;
      const progress = video.currentTime / video.duration;
      if (progress >= 0.5) {
        const phase = (progress - 0.5) / 0.5;
        video.playbackRate = BASE_RATE - (BASE_RATE - SLOW_RATE) * phase;
      } else {
        video.playbackRate = BASE_RATE;
      }
    };

    const handleEnded = () => {
      video.currentTime = 0;
      video.playbackRate = BASE_RATE;
      video.play().catch(() => {});
    };

    const interval = setInterval(tick, 100);
    video.addEventListener("ended", handleEnded);

    return () => {
      clearInterval(interval);
      video.removeEventListener("ended", handleEnded);
    };
  }, [useVideo]);

  if (!useVideo) {
    return (
      <picture className="absolute inset-0 block h-full w-full">
        <source srcSet="/images/hero-poster.jpg" type="image/jpeg" />
        <img
          src="/images/hero-poster.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      preload="none"
      poster="/images/hero-poster.jpg"
      className="absolute inset-0 h-full w-full object-cover object-center"
    >
      <source
        src="/videos/hero-bartender-compressed.mp4"
        type="video/mp4"
      />
    </video>
  );
}
