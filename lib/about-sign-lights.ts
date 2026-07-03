export const SIGN_FRAME = {
  left: 51.46,
  top: 76.94,
  right: 88.28,
  bottom: 82.65,
};

const TOP_COUNT = 16;
const SIDE_COUNT = 4;
const BOTTOM_COUNT = 16;
export const CHASE_MS = 18_000;

export type BulbPoint = { x: number; y: number };

export function frameBulbPositions(): BulbPoint[] {
  const { left, top, right, bottom } = SIGN_FRAME;
  const width = right - left;
  const height = bottom - top;
  const bulbs: BulbPoint[] = [];

  const toLocal = (leftPct: number, topPct: number) => ({
    x: (leftPct - left) / width,
    y: (topPct - top) / height,
  });

  for (let i = 0; i < TOP_COUNT; i++) {
    bulbs.push(toLocal(left + (i / (TOP_COUNT - 1)) * width, top));
  }
  for (let i = 1; i <= SIDE_COUNT; i++) {
    bulbs.push(toLocal(right, top + (i / (SIDE_COUNT + 1)) * height));
  }
  for (let i = 0; i < BOTTOM_COUNT; i++) {
    bulbs.push(toLocal(right - (i / (BOTTOM_COUNT - 1)) * width, bottom));
  }
  for (let i = 1; i <= SIDE_COUNT; i++) {
    bulbs.push(toLocal(left, bottom - (i / (SIDE_COUNT + 1)) * height));
  }

  return bulbs;
}

export function pulseIntensity(
  cyclePos: number,
  bulbIndex: number,
  total: number,
): number {
  const phase = bulbIndex / total;
  let delta = cyclePos - phase;
  if (delta < 0) delta += 1;

  if (delta < 0.045) return delta / 0.045;
  if (delta < 0.09) return 1 - (delta - 0.045) / 0.045;
  if (delta < 0.15) return Math.max(0, 0.35 * (1 - (delta - 0.09) / 0.06));
  return 0;
}

export function startAboutSignLights(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
): () => void {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => undefined;

  const bulbs = frameBulbPositions();
  const startTime = performance.now();
  let frame = 0;

  const tick = (now: number) => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;

    if (w >= 2 && h >= 2) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bufferW = Math.round(w * dpr);
      const bufferH = Math.round(h * dpr);

      if (canvas.width !== bufferW || canvas.height !== bufferH) {
        canvas.width = bufferW;
        canvas.height = bufferH;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);

      const cyclePos = ((now - startTime) % CHASE_MS) / CHASE_MS;
      const glowRadius = Math.min(w, h) * 0.16;

      for (let i = 0; i < bulbs.length; i++) {
        const intensity = pulseIntensity(cyclePos, i, bulbs.length);
        if (intensity < 0.04) continue;

        const x = bulbs[i].x * w;
        const y = bulbs[i].y * h;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);

        gradient.addColorStop(0, `rgba(255, 240, 200, ${intensity * 0.95})`);
        gradient.addColorStop(0.35, `rgba(255, 200, 100, ${intensity * 0.55})`);
        gradient.addColorStop(1, "rgba(255, 140, 50, 0)");

        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    }

    frame = requestAnimationFrame(tick);
  };

  tick(startTime);
  frame = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frame);
}