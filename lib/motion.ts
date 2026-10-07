"use client";

import { useEffect, useRef, useState } from "react";

// Small animation helpers (no animation library). Everything respects the
// "reduce motion" accessibility setting by jumping straight to the end value.

export type Easing = (t: number) => number;

export const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3;
export const easeInOutCubic: Easing = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
// Slight overshoot, like a needle settling.
export const easeOutBack: Easing = (t) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Runs a sequence of tweens [{ to, duration, easing }] starting from `from`.
// Returns a cancel function.
export function animateSequence(
  from: number,
  steps: Array<{ to: number; duration: number; easing?: Easing; delay?: number }>,
  onUpdate: (value: number) => void,
  onDone?: () => void
) {
  let frame = 0;
  let cancelled = false;
  let index = 0;
  let start = from;
  let startedAt: number | null = null;

  const tick = (now: number) => {
    if (cancelled) return;
    const step = steps[index];
    if (startedAt === null) startedAt = now + (step.delay ?? 0);
    const t = Math.min(1, Math.max(0, (now - startedAt) / step.duration));
    onUpdate(start + (step.to - start) * (step.easing ?? easeOutCubic)(t));
    if (t < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }
    index += 1;
    if (index >= steps.length) {
      onDone?.();
      return;
    }
    start = step.to;
    startedAt = null;
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

// A number that animates towards `target` whenever it changes.
export function useAnimatedNumber(target: number, duration = 900, from?: number) {
  const [value, setValue] = useState(from ?? target);
  const current = useRef(from ?? target);

  useEffect(() => {
    if (prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => {
        current.current = target;
        setValue(target);
      });
      return () => cancelAnimationFrame(frame);
    }
    return animateSequence(current.current, [{ to: target, duration, easing: easeOutCubic }], (next) => {
      current.current = next;
      setValue(next);
    });
  }, [target, duration]);

  return value;
}
