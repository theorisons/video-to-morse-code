"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { BinarySegment } from "./binary-segments";
import { levelAt } from "./binary-segments";

const VISIBLE_UNITS = 28;
const PLAYHEAD_RATIO = 0.3;

type PlayerUiState = "idle" | "playing" | "paused";

type BinaryOscilloscopeProps = {
  segments: BinarySegment[];
  unitMs: number;
  playerState: PlayerUiState;
  /** Frozen time when paused/idle; used as fallback while playing. */
  elapsedMs: number;
  /** Live clock while playing (e.g. player.currentTime). */
  getPlaybackMs?: () => number;
};

type ScopePalette = {
  screen: string;
  plateCenter: string;
  plateEdge: string;
  gridMajor: string;
  gridMinor: string;
  rail: string;
  label: string;
  trace: string;
  glow: string;
  playhead: string;
  scanline: string;
};

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

/** Apply alpha to an `oklch(...)` / `rgb(...)` theme token for canvas use. */
function withAlpha(color: string, alpha: number): string {
  const oklch = color.match(/^oklch\((.+)\)$/i);
  if (oklch) {
    const body = oklch[1].split("/")[0].trim();
    return `oklch(${body} / ${alpha})`;
  }
  const rgb = color.match(/^rgba?\((.+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(",").map((p) => p.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function readPalette(el: Element): ScopePalette {
  const styles = getComputedStyle(el);
  const background = cssVar(styles, "--background", "oklch(0.147 0.004 49.25)");
  const primary = cssVar(styles, "--primary", "oklch(0.432 0.095 166.913)");
  const primaryFg = cssVar(
    styles,
    "--primary-foreground",
    "oklch(0.979 0.021 166.113)"
  );
  const chart1 = cssVar(styles, "--chart-1", "oklch(0.905 0.182 98.111)");
  const mutedFg = cssVar(
    styles,
    "--muted-foreground",
    "oklch(0.709 0.01 56.259)"
  );

  // Dark primary is too muted for a CRT trace — lift it toward primary-foreground.
  const phosphor = `color-mix(in oklch, ${primaryFg} 72%, ${primary})`;

  return {
    screen: `color-mix(in oklch, ${background} 94%, black)`,
    plateCenter: `color-mix(in oklch, ${background} 90%, ${primary})`,
    plateEdge: `color-mix(in oklch, ${background} 96%, black)`,
    gridMajor: withAlpha(primary, 0.14),
    gridMinor: withAlpha(primary, 0.06),
    rail: withAlpha(primary, 0.12),
    label: withAlpha(mutedFg, 0.65),
    trace: phosphor,
    glow: `color-mix(in oklch, ${phosphor} 65%, transparent)`,
    playhead: chart1,
    scanline: "oklch(0 0 0 / 0.06)",
  };
}

function resolveTimeMs(
  playerState: PlayerUiState,
  elapsedMs: number,
  getPlaybackMs?: () => number
): number {
  if (playerState === "idle") return 0;
  if (playerState === "playing" && getPlaybackMs) {
    return Math.max(0, getPlaybackMs());
  }
  return Math.max(0, elapsedMs);
}

function drawScope(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  segments: BinarySegment[],
  unitMs: number,
  playheadMs: number,
  palette: ScopePalette
) {
  const padX = 12;
  const padY = 16;
  const plotW = Math.max(1, width - padX * 2);
  const plotH = Math.max(1, height - padY * 2);

  const yOff = padY + plotH * 0.78;
  const yOn = padY + plotH * 0.22;
  const safeUnit = Math.max(unitMs, 1);
  const windowMs = VISIBLE_UNITS * safeUnit;
  const playheadX = padX + plotW * PLAYHEAD_RATIO;
  const windowStartMs = playheadMs - PLAYHEAD_RATIO * windowMs;
  const msToX = (ms: number) =>
    padX + ((ms - windowStartMs) / windowMs) * plotW;
  const levelToY = (level: 0 | 1) => (level === 1 ? yOn : yOff);

  ctx.fillStyle = palette.screen;
  ctx.fillRect(0, 0, width, height);

  const plate = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    4,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.7
  );
  plate.addColorStop(0, palette.plateCenter);
  plate.addColorStop(1, palette.plateEdge);
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(padX, padY, plotW, plotH);
  ctx.clip();

  const firstUnit = Math.floor(windowStartMs / safeUnit);
  const lastUnit = Math.ceil((windowStartMs + windowMs) / safeUnit);
  for (let u = firstUnit; u <= lastUnit; u++) {
    const x = msToX(u * safeUnit);
    const major = u % 5 === 0;
    ctx.strokeStyle = major ? palette.gridMajor : palette.gridMinor;
    ctx.lineWidth = major ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, padY);
    ctx.lineTo(x, padY + plotH);
    ctx.stroke();
  }

  for (const y of [yOff, yOn]) {
    ctx.strokeStyle = palette.rail;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(padX + plotW, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = palette.label;
  ctx.font = '10px "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace';
  ctx.textAlign = "left";
  ctx.fillText("1", padX + 2, yOn - 4);
  ctx.fillText("0", padX + 2, yOff + 12);

  const windowEndMs = windowStartMs + windowMs;
  let level: 0 | 1 = levelAt(segments, windowStartMs);

  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.strokeStyle = palette.trace;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.75;
  ctx.beginPath();
  ctx.moveTo(msToX(windowStartMs), levelToY(level));

  if (segments.length === 0) {
    ctx.lineTo(msToX(windowEndMs), levelToY(0));
  } else {
    for (const segment of segments) {
      const segStart = segment.startMs;
      const segEnd = segment.startMs + segment.durationMs;
      if (segEnd <= windowStartMs) continue;
      if (segStart >= windowEndMs) break;

      if (segStart > windowStartMs && segment.level !== level) {
        const x = msToX(segStart);
        ctx.lineTo(x, levelToY(level));
        ctx.lineTo(x, levelToY(segment.level));
        level = segment.level;
      } else {
        level = segment.level;
      }

      ctx.lineTo(msToX(Math.min(segEnd, windowEndMs)), levelToY(level));
    }
    ctx.lineTo(msToX(windowEndMs), levelToY(level));
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = withAlpha(palette.playhead, 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(playheadX, padY);
  ctx.lineTo(playheadX, padY + plotH);
  ctx.stroke();

  ctx.fillStyle = withAlpha(palette.playhead, 0.95);
  ctx.beginPath();
  ctx.moveTo(playheadX, padY);
  ctx.lineTo(playheadX - 4, padY - 6);
  ctx.lineTo(playheadX + 4, padY - 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = palette.scanline;
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
}

export function BinaryOscilloscope({
  segments,
  unitMs,
  playerState,
  elapsedMs,
  getPlaybackMs,
}: BinaryOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef(segments);
  const unitMsRef = useRef(unitMs);
  const playerStateRef = useRef(playerState);
  const elapsedMsRef = useRef(elapsedMs);
  const getPlaybackMsRef = useRef(getPlaybackMs);

  useLayoutEffect(() => {
    segmentsRef.current = segments;
    unitMsRef.current = unitMs;
    playerStateRef.current = playerState;
    elapsedMsRef.current = elapsedMs;
    getPlaybackMsRef.current = getPlaybackMs;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    let rafId = 0;
    let disposed = false;

    const paint = () => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = wrapper.clientWidth;
      const cssH = wrapper.clientHeight;
      if (cssW <= 0 || cssH <= 0) return;

      if (
        canvas.width !== Math.round(cssW * dpr) ||
        canvas.height !== Math.round(cssH * dpr)
      ) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = resolveTimeMs(
        playerStateRef.current,
        elapsedMsRef.current,
        getPlaybackMsRef.current
      );
      drawScope(
        ctx,
        cssW,
        cssH,
        segmentsRef.current,
        unitMsRef.current,
        t,
        readPalette(wrapper)
      );
    };

    const loop = () => {
      paint();
      if (playerStateRef.current === "playing") {
        rafId = requestAnimationFrame(loop);
      }
    };

    paint();
    if (playerState === "playing") {
      rafId = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      paint();
    });
    ro.observe(wrapper);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [playerState, segments, unitMs]);

  useEffect(() => {
    if (playerState === "playing") return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = wrapper.clientWidth;
    const cssH = wrapper.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScope(
      ctx,
      cssW,
      cssH,
      segmentsRef.current,
      unitMsRef.current,
      resolveTimeMs(playerState, elapsedMs, getPlaybackMs),
      readPalette(wrapper)
    );
  }, [elapsedMs, playerState, getPlaybackMs]);

  return (
    <div
      className="rounded-lg shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent),0_0_14px_color-mix(in_oklch,var(--primary-foreground)_28%,var(--primary)),0_0_32px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
      role="img"
      aria-label="Binary Morse oscilloscope showing on and off signal levels"
    >
      <div
        ref={wrapperRef}
        className="relative h-40 w-full overflow-hidden rounded-lg bg-background shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_45%,transparent),inset_0_0_20px_color-mix(in_oklch,var(--primary)_8%,transparent)]"
      >
        <canvas ref={canvasRef} className="block size-full" />
      </div>
    </div>
  );
}
