"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
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
  traceWidth: number;
  glowBlur: number;
  /** When set, a crisp inner stroke is drawn on top of the glow (light mode). */
  traceCore: string | null;
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

function isDarkTheme(resolvedTheme?: string): boolean {
  if (resolvedTheme === "light") return false;
  if (resolvedTheme === "dark") return true;
  return document.documentElement.classList.contains("dark");
}

function readPalette(el: Element, resolvedTheme?: string): ScopePalette {
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

  if (!isDarkTheme(resolvedTheme)) {
    return {
      screen: "#ffffff",
      plateCenter: "rgba(22, 163, 74, 0.05)",
      plateEdge: "rgba(22, 163, 74, 0.015)",
      gridMajor: "rgba(22, 101, 52, 0.14)",
      gridMinor: "rgba(22, 101, 52, 0.06)",
      rail: "rgba(21, 128, 61, 0.35)",
      label: "#166534",
      trace: "#15803d",
      glow: "#16a34a",
      playhead: "#ca8a04",
      scanline: "rgba(0, 0, 0, 0)",
      traceWidth: 2,
      glowBlur: 14,
      traceCore: null,
    };
  }

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
    traceWidth: 2.75,
    glowBlur: 14,
    traceCore: null,
  };
}

function resolveTimeMs(
  playerState: PlayerUiState,
  elapsedMs: number,
  getPlaybackMs?: () => number
): number {
  if (playerState === "playing" && getPlaybackMs) {
    const live = getPlaybackMs();
    // MorsePlayer reports 0 as soon as it goes idle, before React's onEnd.
    if (live > 0) return live;
  }
  // Idle (and the idle/playing race at end) uses elapsedMs; Stop sets 0.
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

    // Schedules often end on a tone; the gate returns to 0 after the message.
    const last = segments[segments.length - 1];
    const scheduleEnd = last.startMs + last.durationMs;
    if (scheduleEnd < windowEndMs) {
      if (scheduleEnd > windowStartMs && level !== 0) {
        const x = msToX(scheduleEnd);
        ctx.lineTo(x, levelToY(level));
        ctx.lineTo(x, levelToY(0));
      }
      level = 0;
    }

    ctx.lineTo(msToX(windowEndMs), levelToY(level));
  }

  if (palette.traceCore) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = palette.glow;
    ctx.lineWidth = palette.traceWidth + 1.5;
    ctx.stroke();
    ctx.strokeStyle = palette.traceCore;
    ctx.lineWidth = palette.traceWidth;
    ctx.stroke();
  } else {
    ctx.strokeStyle = palette.trace;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = palette.glowBlur;
    ctx.lineWidth = palette.traceWidth;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.strokeStyle = withAlpha(palette.playhead, 0.9);
  ctx.lineWidth = palette.traceCore ? 2 : 1.5;
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

  if (palette.scanline !== "rgba(0, 0, 0, 0)") {
    ctx.fillStyle = palette.scanline;
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  }
}

export function BinaryOscilloscope({
  segments,
  unitMs,
  playerState,
  elapsedMs,
  getPlaybackMs,
}: BinaryOscilloscopeProps) {
  const t = useTranslations("Oscilloscope");
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef(segments);
  const unitMsRef = useRef(unitMs);
  const playerStateRef = useRef(playerState);
  const elapsedMsRef = useRef(elapsedMs);
  const getPlaybackMsRef = useRef(getPlaybackMs);
  const themeRef = useRef(resolvedTheme);

  useLayoutEffect(() => {
    segmentsRef.current = segments;
    unitMsRef.current = unitMs;
    playerStateRef.current = playerState;
    elapsedMsRef.current = elapsedMs;
    getPlaybackMsRef.current = getPlaybackMs;
    themeRef.current = resolvedTheme;
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
        readPalette(wrapper, themeRef.current)
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

    // Canvas colors come from CSS vars; repaint when the theme class flips.
    const scheduleThemePaint = () => {
      requestAnimationFrame(() => {
        if (!disposed) paint();
      });
    };
    const themeObserver = new MutationObserver(scheduleThemePaint);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    document.addEventListener("visibilitychange", scheduleThemePaint);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", scheduleThemePaint);
    };
  }, [playerState, segments, unitMs, resolvedTheme]);

  useEffect(() => {
    if (playerState === "playing") return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
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
    drawScope(
      ctx,
      cssW,
      cssH,
      segmentsRef.current,
      unitMsRef.current,
      resolveTimeMs(playerState, elapsedMs, getPlaybackMs),
      readPalette(wrapper, resolvedTheme)
    );
  }, [elapsedMs, playerState, getPlaybackMs, resolvedTheme]);

  return (
    <div
      className={cn(
        "rounded-lg",
        "shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_32%,transparent),0_0_12px_color-mix(in_oklch,var(--primary)_18%,transparent),0_0_24px_color-mix(in_oklch,var(--primary)_10%,transparent)]",
        "dark:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent),0_0_14px_color-mix(in_oklch,var(--primary-foreground)_28%,var(--primary)),0_0_32px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
      )}
      role="img"
      aria-label={t("ariaLabel")}
    >
      <div
        ref={wrapperRef}
        className={cn(
          "relative h-40 w-full overflow-hidden rounded-lg bg-background",
          "shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_28%,transparent),inset_0_0_16px_color-mix(in_oklch,var(--primary)_6%,transparent)]",
          "dark:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_45%,transparent),inset_0_0_20px_color-mix(in_oklch,var(--primary)_8%,transparent)]"
        )}
      >
        <canvas ref={canvasRef} className="block size-full" />
      </div>
    </div>
  );
}
