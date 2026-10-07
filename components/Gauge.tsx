"use client";

import { useEffect, useRef, useState } from "react";

import { animateSequence, easeInOutCubic, easeOutBack, prefersReducedMotion } from "@/lib/motion";

// Virtual fuel gauge: a semicircle from Empty (left) to Full (right) with the
// reserve zone in the fuel-amber colour. The needle animates: on the first
// open it sweeps to Full and back like an ignition check; after that it moves
// from its last position (so a fill visibly "pours in").

type GaugeProps = {
  fraction: number | null; // 0–1 of the range above reserve; null when unknown
  onReserve?: boolean;
  size?: number;
  id?: string; // remembers the last position per vehicle
};

const RESERVE_SHARE = 0.15; // portion of the arc drawn as the reserve zone
const TICKS = 10;

// Shared across mounts so navigating back animates from where the needle was.
let ignitionDone = false;
const lastLevels = new Map<string, number>();

function point(level: number, radius: number) {
  const angle = Math.PI * (1 - level);
  return { x: 100 + radius * Math.cos(angle), y: 100 - radius * Math.sin(angle) };
}

function arc(from: number, to: number, radius: number) {
  const start = point(from, radius);
  const end = point(to, radius);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export default function Gauge({ fraction, onReserve = false, size = 260, id = "default" }: GaugeProps) {
  const known = fraction !== null;
  const target = onReserve
    ? RESERVE_SHARE * 0.5
    : known
      ? RESERVE_SHARE + (1 - RESERVE_SHARE) * Math.min(1, Math.max(0, fraction))
      : 0;
  const [level, setLevel] = useState(() => lastLevels.get(id) ?? 0);
  const levelRef = useRef(level);

  useEffect(() => {
    const update = (value: number) => {
      levelRef.current = value;
      lastLevels.set(id, value);
      setLevel(value);
    };

    if (prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => update(target));
      return () => cancelAnimationFrame(frame);
    }

    const steps = ignitionDone
      ? [{ to: target, duration: 1100, easing: easeOutBack }]
      : [
          { to: 1, duration: 650, easing: easeInOutCubic, delay: 150 },
          { to: target, duration: 1100, easing: easeOutBack, delay: 80 },
        ];
    ignitionDone = true;
    return animateSequence(levelRef.current, steps, update);
  }, [target, id]);

  const shown = Math.min(1, Math.max(0, level));
  const low = onReserve || (known && (fraction as number) < 0.15);
  const colour = low ? "var(--reserve)" : "var(--foreground)";
  const needle = point(shown, 68);
  const showNeedle = known || onReserve;

  return (
    <svg viewBox="0 0 200 124" width={size} height={(size * 124) / 200} role="img" aria-label="Estimated fuel level" className="overflow-visible">
      {/* Tick marks around the dial */}
      {Array.from({ length: TICKS + 1 }, (_, index) => {
        const at = index / TICKS;
        const outer = point(at, 99);
        const inner = point(at, index % 5 === 0 ? 94 : 96);
        return (
          <line
            key={index}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--muted)"
            strokeOpacity={index % 5 === 0 ? 0.6 : 0.3}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        );
      })}

      <path d={arc(0, 1, 82)} stroke="var(--gauge-track)" strokeWidth={12} fill="none" strokeLinecap="round" />
      <path
        d={arc(0, RESERVE_SHARE, 82)}
        stroke="var(--reserve)"
        strokeOpacity={0.35}
        strokeWidth={12}
        fill="none"
        strokeLinecap="round"
        className={low ? "gauge-breathe" : undefined}
      />
      {showNeedle && shown > 0.002 ? (
        <path d={arc(0, shown, 82)} stroke={colour} strokeWidth={12} fill="none" strokeLinecap="round" />
      ) : null}

      <text x={16} y={122} fontSize={10} fill="var(--muted)" textAnchor="middle" fontWeight={500}>E</text>
      <text x={184} y={122} fontSize={10} fill="var(--muted)" textAnchor="middle" fontWeight={500}>F</text>

      {showNeedle ? (
        <g>
          <line x1={100} y1={100} x2={needle.x} y2={needle.y} stroke={colour} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={needle.x} cy={needle.y} r={3.2} fill={colour} className="gauge-tip" />
          <circle cx={100} cy={100} r={7} fill="var(--surface)" stroke={colour} strokeWidth={2.5} />
        </g>
      ) : null}
    </svg>
  );
}
