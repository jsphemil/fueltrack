"use client";

import { useEffect, useMemo, useState } from "react";

import { BarValueChart, LineTrendChart } from "@/components/Charts";
import { Notice, Page, PageHeader, StatTile, VehicleChips } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useFuel } from "@/lib/fuel-context";
import { formatDate, formatKm, formatKmPerL, formatLitres, formatMoney, formatMonth, formatNumber } from "@/lib/format";
import type { VehicleStats } from "@/lib/types";
import { cardClass, mutedTextClass } from "@/lib/ui";

export default function StatsPage() {
  const { activeVehicle, vehicles } = useFuel();
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [error, setError] = useState("");
  const vehicleId = activeVehicle?.id ?? null;

  useEffect(() => {
    if (!vehicleId) return;
    let isMounted = true;
    const tzOffset = new Date().getTimezoneOffset();
    void apiRequest<{ stats: VehicleStats }>(`/api/vehicles/${vehicleId}/stats?tzOffset=${tzOffset}`).then((result) => {
      if (!isMounted) return;
      if (result.ok) {
        setStats(result.data.stats);
        setError("");
      } else {
        setError(result.error);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [vehicleId, activeVehicle?.eventCount]);

  const cycleData = useMemo(
    () => (stats?.cycles ?? []).map((cycle) => ({ label: formatDate(cycle.date), kmPerL: cycle.kmPerL })),
    [stats]
  );
  const monthData = useMemo(
    () =>
      [...(stats?.months ?? [])].reverse().map((month) => ({
        label: formatMonth(month.month),
        spend: month.spendPaise / 100,
        litres: month.volumeMl / 1000,
      })),
    [stats]
  );

  return (
    <Page>
      <PageHeader title="Stats" subtitle={activeVehicle?.name} />
      <VehicleChips />
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {!stats ? (
        <p className={mutedTextClass}>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Mileage (recent)" value={formatKmPerL(stats.efficiency)} hint="Last 5 cycles" />
            <StatTile label="Mileage (lifetime)" value={formatKmPerL(stats.lifetimeEfficiency)} />
            <StatTile label="Cost per km" value={stats.costPerKmPaise !== null ? formatMoney(stats.costPerKmPaise) : "—"} />
            <StatTile label="Riding per day" value={stats.kmPerDay !== null ? `${formatNumber(stats.kmPerDay, 1)} km` : "—"} />
            <StatTile label="Total spend" value={formatMoney(stats.totalSpendPaise, true)} hint={`${stats.fillCount} fills`} />
            <StatTile label="Fuel bought" value={formatLitres(stats.totalVolumeMl, 1)} hint={stats.avgFillMl !== null ? `Avg fill ${formatLitres(stats.avgFillMl, 1)}` : undefined} />
            <StatTile label="Distance" value={formatKm(stats.distance)} hint="Since you started" />
            <StatTile label="Ridden on reserve" value={stats.avgReserveKm !== null ? `${formatNumber(stats.avgReserveKm, 1)} km` : "—"} hint="Average before filling" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={cardClass}>
              <h2 className="font-semibold text-foreground">Mileage per cycle</h2>
              {cycleData.length === 0 ? (
                <p className={`mt-3 ${mutedTextClass}`}>Appears after two reserve marks (or two full tanks).</p>
              ) : (
                <div className="mt-4">
                  <LineTrendChart data={cycleData} xKey="label" yKey="kmPerL" name="Mileage" color="var(--chart-2)" formatValue={(value) => formatKmPerL(value)} />
                </div>
              )}
            </section>
            <section className={cardClass}>
              <h2 className="font-semibold text-foreground">Spend per month</h2>
              {monthData.length === 0 ? (
                <p className={`mt-3 ${mutedTextClass}`}>No fills yet.</p>
              ) : (
                <div className="mt-4">
                  <BarValueChart data={monthData} xKey="label" yKey="spend" name="Spend" color="var(--chart-1)" formatValue={(value) => formatMoney(value * 100, true)} />
                </div>
              )}
            </section>
          </div>

          {stats.months.length > 0 ? (
            <section className={cardClass}>
              <h2 className="font-semibold text-foreground">By month</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="tabular w-full min-w-[520px] text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 font-medium">Month</th>
                      <th className="py-2 pr-4 font-medium">Fills</th>
                      <th className="py-2 pr-4 font-medium">Spend</th>
                      <th className="py-2 pr-4 font-medium">Litres</th>
                      <th className="py-2 pr-4 font-medium">Distance</th>
                      <th className="py-2 font-medium">Mileage</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {stats.months.map((month) => (
                      <tr key={month.month} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4">{formatMonth(month.month, "long")}</td>
                        <td className="py-2 pr-4">{month.fills}</td>
                        <td className="py-2 pr-4">{formatMoney(month.spendPaise, true)}</td>
                        <td className="py-2 pr-4">{formatLitres(month.volumeMl, 1)}</td>
                        <td className="py-2 pr-4">{month.distance > 0 ? formatKm(month.distance) : "—"}</td>
                        <td className="py-2">{formatKmPerL(month.kmPerL)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {vehicles.length > 1 ? (
            <section className={cardClass}>
              <h2 className="font-semibold text-foreground">Compare vehicles</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="tabular w-full min-w-[480px] text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 font-medium">Vehicle</th>
                      <th className="py-2 pr-4 font-medium">Recent</th>
                      <th className="py-2 pr-4 font-medium">Lifetime</th>
                      <th className="py-2 pr-4 font-medium">To reserve</th>
                      <th className="py-2 font-medium">Cycles</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 font-medium">{vehicle.name}</td>
                        <td className="py-2 pr-4">{formatKmPerL(vehicle.gauge.efficiency)}</td>
                        <td className="py-2 pr-4">{formatKmPerL(vehicle.gauge.lifetimeEfficiency)}</td>
                        <td className="py-2 pr-4">
                          {vehicle.gauge.status === "on-reserve" ? "On reserve" : vehicle.gauge.kmToReserve !== null ? `≈ ${formatNumber(vehicle.gauge.kmToReserve, 0)} km` : "—"}
                        </td>
                        <td className="py-2">{vehicle.gauge.validCycles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </Page>
  );
}
