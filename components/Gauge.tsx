// Virtual fuel gauge: a semicircle from Empty (left) to Full (right) with the
// reserve zone in the fuel-amber colour.

type GaugeProps = {
  fraction: number | null; // 0–1 of the range above reserve; null when unknown
  onReserve?: boolean;
  size?: number;
};

const RESERVE_SHARE = 0.15; // portion of the arc drawn as the reserve zone

function point(angle: number, radius: number) {
  return { x: 100 + radius * Math.cos(angle), y: 100 - radius * Math.sin(angle) };
}

function arc(from: number, to: number, radius: number) {
  const start = point(Math.PI * (1 - from), radius);
  const end = point(Math.PI * (1 - to), radius);
  const large = to - from > 1 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

export default function Gauge({ fraction, onReserve = false, size = 260 }: GaugeProps) {
  const known = fraction !== null;
  // Position on the full arc: reserve zone first, then the range above reserve.
  const level = onReserve ? RESERVE_SHARE * 0.5 : known ? RESERVE_SHARE + (1 - RESERVE_SHARE) * Math.min(1, Math.max(0, fraction)) : 0;
  const needle = point(Math.PI * (1 - level), 70);
  const colour = onReserve || (known && (fraction as number) < 0.15) ? "var(--reserve)" : "var(--foreground)";

  return (
    <svg viewBox="0 0 200 124" width={size} height={(size * 124) / 200} role="img" aria-label="Estimated fuel level">
      <path d={arc(0, 1, 84)} stroke="var(--gauge-track)" strokeWidth={14} fill="none" strokeLinecap="round" />
      <path d={arc(0, RESERVE_SHARE, 84)} stroke="var(--reserve)" strokeOpacity={0.35} strokeWidth={14} fill="none" strokeLinecap="round" />
      {known || onReserve ? (
        <path d={arc(0, Math.max(level, 0.001), 84)} stroke={colour} strokeWidth={14} fill="none" strokeLinecap="round" />
      ) : null}
      <text x={16} y={122} fontSize={11} fill="var(--muted)" textAnchor="middle">E</text>
      <text x={184} y={122} fontSize={11} fill="var(--muted)" textAnchor="middle">F</text>
      {known || onReserve ? (
        <>
          <line x1={100} y1={100} x2={needle.x} y2={needle.y} stroke={colour} strokeWidth={3} strokeLinecap="round" />
          <circle cx={100} cy={100} r={6} fill={colour} />
        </>
      ) : null}
    </svg>
  );
}
