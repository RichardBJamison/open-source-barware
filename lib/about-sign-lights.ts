export const SIGN_FRAME = {
  left: 51.46,
  top: 76.94,
  right: 88.28,
  bottom: 82.65,
};

const TOP_COUNT = 16;
const SIDE_COUNT = 4;
const BOTTOM_COUNT = 16;
export const CHASE_MS = 14_000;

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

  if (delta < 0.05) return delta / 0.05;
  if (delta < 0.1) return 1 - (delta - 0.05) / 0.05;
  if (delta < 0.18) return Math.max(0, 0.4 * (1 - (delta - 0.1) / 0.08));
  return 0;
}

/** Dim trail — bulbs just behind the bright pulse fade slightly. */
export function dimIntensity(
  cyclePos: number,
  bulbIndex: number,
  total: number,
): number {
  const phase = bulbIndex / total;
  let delta = cyclePos - phase - 0.12;
  if (delta < 0) delta += 1;
  if (delta > 0.5) return 0;
  if (delta < 0.06) return delta / 0.06;
  if (delta < 0.12) return 1 - (delta - 0.06) / 0.06;
  return 0;
}

export function startAboutSignLights(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
): () => void {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => undefined;

  const sourceImg = wrap.parentElement?.querySelector("img");
  if (!sourceImg) return () => undefined;

  const bulbs = frameBulbPositions();
  const { left, top, right, bottom } = SIGN_FRAME;
  const frameW = right - left;
  const frameH = bottom - top;
  const startTime = performance.now();
  let frame = 0;

  const tick = (now: number) => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;

    if (
      w >= 2 &&
      h >= 2 &&
      sourceImg.complete &&
      sourceImg.naturalWidth > 0
    ) {
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

      const displayW = sourceImg.clientWidth;
      const displayH = sourceImg.clientHeight;
      const scaleX = sourceImg.naturalWidth / displayW;
      const scaleY = sourceImg.naturalHeight / displayH;
      const cyclePos = ((now - startTime) % CHASE_MS) / CHASE_MS;
      const patchR = Math.max(5, Math.min(w, h) * 0.075);

      const drawBulbPatch = (
        bulb: BulbPoint,
        cx: number,
        cy: number,
        brightness: number,
        saturate: number,
      ) => {
        const pctLeft = left + bulb.x * frameW;
        const pctTop = top + bulb.y * frameH;
        const imgCx = (pctLeft / 100) * displayW;
        const imgCy = (pctTop / 100) * displayH;
        const sx = imgCx * scaleX - patchR * scaleX;
        const sy = imgCy * scaleY - patchR * scaleY;
        const sw = patchR * 2 * scaleX;
        const sh = patchR * 2 * scaleY;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, patchR, 0, Math.PI * 2);
        ctx.clip();
        ctx.filter = `brightness(${brightness}) saturate(${saturate})`;
        ctx.drawImage(
          sourceImg,
          sx,
          sy,
          sw,
          sh,
          cx - patchR,
          cy - patchR,
          patchR * 2,
          patchR * 2,
        );
        ctx.restore();
      };

      for (let i = 0; i < bulbs.length; i++) {
        const cx = bulbs[i].x * w;
        const cy = bulbs[i].y * h;

        const dim = dimIntensity(cyclePos, i, bulbs.length);
        if (dim > 0.08) {
          drawBulbPatch(bulbs[i], cx, cy, 0.72 - dim * 0.18, 0.85);
        }

        const intensity = pulseIntensity(cyclePos, i, bulbs.length);
        if (intensity > 0.05) {
          drawBulbPatch(
            bulbs[i],
            cx,
            cy,
            1 + intensity * 0.85,
            1 + intensity * 0.35,
          );
        }
      }

      ctx.filter = "none";
    }

    frame = requestAnimationFrame(tick);
  };

  const onReady = () => {
    tick(performance.now());
    frame = requestAnimationFrame(tick);
  };

  if (sourceImg.complete) {
    onReady();
  } else {
    sourceImg.addEventListener("load", onReady, { once: true });
  }

  return () => {
    cancelAnimationFrame(frame);
    sourceImg.removeEventListener("load", onReady);
  };
}