"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartProps<T> = {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  name: string;
  color?: string;
  formatValue: (value: number) => string;
};

const axisProps = {
  tick: { fill: "var(--muted)", fontSize: 12 },
  stroke: "var(--border-strong)",
  tickLine: false,
};

const tooltipProps = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted)" },
  cursor: { fill: "var(--surface-muted)" },
};

export function LineTrendChart<T>({ data, xKey, yKey, name, color = "var(--chart-2)", formatValue }: ChartProps<T>) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipProps} formatter={(value: number) => formatValue(value)} />
          <Line type="monotone" name={name} dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarValueChart<T>({ data, xKey, yKey, name, color = "var(--chart-1)", formatValue }: ChartProps<T>) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipProps} formatter={(value: number) => formatValue(value)} />
          <Bar name={name} dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
