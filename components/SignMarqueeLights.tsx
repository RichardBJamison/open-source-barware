"use client";

import { useMemo } from "react";

type RingConfig = {
  count: number;
  rx: number;
  ry: number;
  duration: number;
  phase: number;
  reverse?: boolean;
};

const RINGS: RingConfig[] = [
  { count: 18, rx: 158, ry: 42, duration: 8.4, phase: 0 },
  { count: 12, rx: 142, ry: 34, duration: 11.2, phase: 2.7, reverse: true },
];

function ringPositions(count: number, rx: number, ry: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
    };
  });
}

export default function SignMarqueeLights({
  children,
}: {
  children: React.ReactNode;
}) {
  const bulbs = useMemo(
    () =>
      RINGS.flatMap((ring, ringIndex) =>
        ringPositions(ring.count, ring.rx, ring.ry).map((pos, bulbIndex) => ({
          key: `${ringIndex}-${bulbIndex}`,
          x: pos.x,
          y: pos.y,
          delay:
            ring.phase +
            (bulbIndex / ring.count) * ring.duration * (ring.reverse ? -0.62 : 0.62),
          duration: ring.duration,
          reverse: ring.reverse ?? false,
          size: ringIndex === 0 ? 4 : 3,
        })),
      ),
    [],
  );

  return (
    <div className="sign-marquee relative inline-block">
      <div
        className="sign-marquee-lights pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        {bulbs.map((bulb) => (
          <span
            key={bulb.key}
            className={`sign-marquee-bulb ${bulb.reverse ? "sign-marquee-bulb-reverse" : ""}`}
            style={{
              left: `calc(50% + ${bulb.x}px)`,
              top: `calc(50% + ${bulb.y}px)`,
              width: bulb.size,
              height: bulb.size,
              animationDuration: `${bulb.duration}s`,
              animationDelay: `${bulb.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}