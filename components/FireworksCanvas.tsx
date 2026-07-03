"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  trail: boolean;
};

type Rocket = {
  x: number;
  y: number;
  vy: number;
  color: string;
  exploded: boolean;
};

const COLORS = [
  "#bf0a30",
  "#ffffff",
  "#002868",
  "#a8784f",
  "#b98a5b",
  "#c3aa6f",
  "#ff6b6b",
  "#4ecdc4",
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const surface = canvas;
    const ctx = context;
    let animationId = 0;
    let width = 0;
    let height = 0;
    const rockets: Rocket[] = [];
    const particles: Particle[] = [];
    let lastLaunch = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      surface.width = width;
      surface.height = height;
    }

    function launchRocket() {
      rockets.push({
        x: rand(width * 0.15, width * 0.85),
        y: height + 10,
        vy: rand(-11, -8),
        color: pickColor(),
        exploded: false,
      });
    }

    function explode(x: number, y: number, color: string) {
      const count = Math.floor(rand(40, 70));
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + rand(-0.2, 0.2);
        const speed = rand(2, 7);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: rand(60, 100),
          color,
          size: rand(1.5, 3),
          trail: Math.random() > 0.6,
        });
      }
      const ringCount = 12;
      for (let i = 0; i < ringCount; i++) {
        const angle = (Math.PI * 2 * i) / ringCount;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 1,
          maxLife: 40,
          color: "#ffffff",
          size: 2,
          trail: false,
        });
      }
    }

    function tick(timestamp: number) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, width, height);

      if (timestamp - lastLaunch > rand(400, 900)) {
        launchRocket();
        if (Math.random() > 0.5) launchRocket();
        lastLaunch = timestamp;
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy;
        r.vy *= 0.98;

        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x, r.y + 18);
        ctx.strokeStyle = `${r.color}88`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (r.vy >= -1 || r.y < height * rand(0.2, 0.45)) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.vx *= 0.99;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, p.life);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.trail) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    animationId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}