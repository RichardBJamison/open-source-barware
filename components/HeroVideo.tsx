"use client";

import { useEffect, useRef, useState } from "react";

const BASE_RATE = 0.6;
const SLOW_RATE = 0.25;

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useVideo, setUseVideo] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    setUseVideo(isDesktop && !prefersReducedMotion);
  }, []);

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