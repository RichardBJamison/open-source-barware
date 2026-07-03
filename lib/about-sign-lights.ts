export const SIGN_FRAME = {
  left: 51.46,
  top: 76.94,
  right: 88.28,
  bottom: 82.65,
};

const TOP_COUNT = 16;
const SIDE_COUNT = 4;
const BOTTOM_COUNT = 16;
export const CHASE_MS = 12_000;

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

/** Leading edge of the chase — returns 0–1 intensity. */
export function pulseIntensity(
  cyclePos: number,
  bulbIndex: number,
  total: number,
): number {
  const phase = bulbIndex / total;
  let delta = cyclePos - phase;
  if (delta < 0) delta += 1;

  if (delta < 0.08) return delta / 0.08;
  if (delta < 0.14) return 1 - (delta - 0.08) / 0.06;
  if (delta < 0.22) return Math.max(0, 0.55 * (1 - (delta - 0.14) / 0.08));
  return 0;
}

/** Bulbs just behind the pulse dip slightly for contrast. */
export function dimIntensity(
  cyclePos: number,
  bulbIndex: number,
  total: number,
): number {
  const phase = bulbIndex / total;
  let delta = cyclePos - phase - 0.1;
  if (delta < 0) delta += 1;
  if (delta > 0.45) return 0;
  if (delta < 0.07) return delta / 0.07;
  if (delta < 0.14) return 1 - (delta - 0.07) / 0.07;
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
  let running = true;

  const supportsFilter = (() => {
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) return false;
    try {
      probe.filter = "brightness(2)";
      return probe.filter === "brightness(2)";
    } catch {
      return false;
    }
  })();

  const tick = (now: number) => {
    if (!running) return;

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
      const patchR = Math.max(6, Math.min(w, h) * 0.11);

      const drawBulbPatch = (
        bulb: BulbPoint,
        cx: number,
        cy: number,
        brightness: number,
        glow: number,
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

        if (supportsFilter) {
          ctx.filter = `brightness(${brightness}) saturate(${1 + glow * 0.5})`;
        }
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
        ctx.filter = "none";

        if (glow > 0.04) {
          const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, patchR * 1.35);
          halo.addColorStop(0, `rgba(255, 238, 180, ${glow * 0.95})`);
          halo.addColorStop(0.45, `rgba(255, 190, 90, ${glow * 0.55})`);
          halo.addColorStop(1, "rgba(255, 140, 40, 0)");
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = halo;
          ctx.fillRect(cx - patchR * 1.5, cy - patchR * 1.5, patchR * 3, patchR * 3);
          ctx.globalCompositeOperation = "source-over";
        } else if (!supportsFilter && brightness > 1.05) {
          const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, patchR);
          const alpha = Math.min(0.85, (brightness - 1) * 0.35);
          halo.addColorStop(0, `rgba(255, 220, 140, ${alpha})`);
          halo.addColorStop(1, "rgba(255, 160, 60, 0)");
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = halo;
          ctx.fillRect(cx - patchR, cy - patchR, patchR * 2, patchR * 2);
          ctx.globalCompositeOperation = "source-over";
        }

        ctx.restore();
      };

      for (let i = 0; i < bulbs.length; i++) {
        const cx = bulbs[i].x * w;
        const cy = bulbs[i].y * h;
        const pulse = pulseIntensity(cyclePos, i, bulbs.length);
        const dim = dimIntensity(cyclePos, i, bulbs.length);

        if (pulse > 0.03) {
          drawBulbPatch(bulbs[i], cx, cy, 1.5 + pulse * 1.8, pulse);
        } else if (dim > 0.05) {
          drawBulbPatch(bulbs[i], cx, cy, 0.45 - dim * 0.12, 0);
        } else {
          drawBulbPatch(bulbs[i], cx, cy, 0.82, 0);
        }
      }
    }

    frame = requestAnimationFrame(tick);
  };

  const boot = async () => {
    if ("decode" in sourceImg) {
      try {
        await sourceImg.decode();
      } catch {
        /* draw with whatever loaded */
      }
    }
    if (!running) return;
    tick(performance.now());
    frame = requestAnimationFrame(tick);
  };

  const resizeObserver = new ResizeObserver(() => {
    tick(performance.now());
  });
  resizeObserver.observe(wrap);
  resizeObserver.observe(sourceImg);

  if (sourceImg.complete) {
    void boot();
  } else {
    sourceImg.addEventListener("load", () => void boot(), { once: true });
  }

  return () => {
    running = false;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    sourceImg.removeEventListener("load", boot);
  };
}