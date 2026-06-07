'use client';

import { useEffect, useRef } from 'react';

const BASE_RATE = 0.60;
const SLOW_RATE = 0.25;

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = BASE_RATE;

    // Ramp playback rate based on position in the video
    const tick = () => {
      if (!video.duration) return;
      const progress = video.currentTime / video.duration;
      if (progress >= 0.5) {
        // Linearly ramp from BASE_RATE → SLOW_RATE over the second half
        const phase = (progress - 0.5) / 0.5; // 0 → 1
        video.playbackRate = BASE_RATE - (BASE_RATE - SLOW_RATE) * phase;
      } else {
        video.playbackRate = BASE_RATE;
      }
    };

    // Manual loop: reset to start at full speed when video ends
    const handleEnded = () => {
      video.currentTime = 0;
      video.playbackRate = BASE_RATE;
      video.play().catch(() => {});
    };

    const interval = setInterval(tick, 100);
    video.addEventListener('ended', handleEnded);

    return () => {
      clearInterval(interval);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover object-center"
    >
      <source src="/videos/hero-bartender.mp4" type="video/mp4" />
    </video>
  );
}
