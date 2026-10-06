"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BarValueChart, LineTrendChart } from "@/components/Charts";
import PageShell from "@/components/PageShell";
import ProfileSetupCard from "@/components/ProfileSetupCard";
import StatCard from "@/components/StatCard";
import VehicleSelect from "@/components/VehicleSelect";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime, formatMonthKey, formatNumber } from "@/lib/format";
import { useSession, useVehicles } from "@/lib/hooks";
import type { FuelEntry, MileageTrendPoint, MonthlySummary, Profile, VehicleSummary } from "@/lib/types";
import {
  cardClass,
  errorTextClass,
  mutedTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

type DashboardData = {
  entries: FuelEntry[];
  summary: VehicleSummary | null;
  monthly: MonthlySummary[];
  trend: MileageTrendPoint[];
};

const emptyData: DashboardData = { entries: [], summary: null, monthly: [], trend: [] };

export default function DashboardPage() {
  const { loading: sessionLoading, userId } = useSession();
  const {
    vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    selectedVehicleId,
    selectedVehicle,
    setSelectedVehicleId,
  } = useVehicles(userId);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;
    void apiRequest<{ profile: Profile | null }>("/api/profile").then((result) => {
      if (isMounted && result.ok) {
        setProfile(result.data.profile);
        setProfileChecked(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !selectedVehicleId) {
      return;
    }

    let isMounted = true;
    const query = `?vehicleId=${encodeURIComponent(selectedVehicleId)}`;
    const tzOffset = new Date().getTimezoneOffset();

    async function load() {
      setDataLoading(true);
      setDataError("");

      const [entriesResult, monthlyResult, trendResult] = await Promise.all([
        apiRequest<{ entries: FuelEntry[]; summary: VehicleSummary | null }>(`/api/fuel-entry${query}`),
        apiRequest<{ monthly: Array<{ vehicleId: string; monthly: MonthlySummary[] }> }>(
          `/api/analytics/monthly${query}&tzOffset=${tzOffset}`
        ),
        apiRequest<{ trend: MileageTrendPoint[] }>(`/api/analytics/mileage-trend${query}`),
      ]);

      if (!isMounted) {
        return;
      }

      if (!entriesResult.ok || !monthlyResult.ok || !trendResult.ok) {
        setDataError("Could not load dashboard data.");
        setData(emptyData);
      } else {
        setData({
          entries: entriesResult.data.entries ?? [],
          summary: entriesResult.data.summary,
          monthly: monthlyResult.data.monthly?.[0]?.monthly ?? [],
          trend: trendResult.data.trend ?? [],
        });
      }
      setDataLoading(false);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [userId, selectedVehicleId]);

  const { entries, summary, monthly, trend } = data;
  const recentEntries = entries.slice(0, 3);

  const monthlySpendChartData = useMemo(
    () =>
      [...monthly].reverse().map((item) => ({
        label: formatMonthKey(item.month),
        totalSpend: item.total_spend,
      })),
    [monthly]
  );

  const mileageTrendChartData = useMemo(
    () => trend.map((item) => ({ label: formatDate(item.date), mileage: item.mileage })),
    [trend]
  );

  const mileageComparisonChartData = useMemo(
    () =>
      vehicles
        .filter((vehicle) => vehicle.averageMileage !== null)
        .map((vehicle) => ({ name: vehicle.name, averageMileage: vehicle.averageMileage ?? 0 })),
    [vehicles]
  );

  const latestMonth = monthly[0];
  const showData = Boolean(selectedVehicleId) && !dataError;

  return (
    <PageShell
      title="Dashboard"
      description={selectedVehicle ? `${selectedVehicle.name} · ${selectedVehicle.vehicleType}` : undefined}
      loading={sessionLoading || !userId}
      actions={
        selectedVehicleId ? (
          <Link href="/entry" className={primaryButtonClass}>
            Add fuel entry
          </Link>
        ) : null
      }
    >
      {profileChecked && !profile ? <ProfileSetupCard onSaved={setProfile} /> : null}

      <section className={cardClass}>
        <VehicleSelect
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onChange={setSelectedVehicleId}
          loading={vehiclesLoading}
          error={vehiclesError}
        />
      </section>

      {dataError ? <p className={errorTextClass}>{dataError}</p> : null}

      {showData ? (
        <>
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Average mileage"
                value={summary?.averageMileage != null ? `${formatNumber(summary.averageMileage)} km/l` : "—"}
                hint={summary ? `${summary.cycleCount} reserve-to-reserve cycle${summary.cycleCount === 1 ? "" : "s"}` : undefined}
              />
              <StatCard
                label="Latest cycle"
                value={summary?.latestMileage != null ? `${formatNumber(summary.latestMileage)} km/l` : "—"}
              />
              <StatCard
                label="Estimated range left"
                value={summary?.remainingRange != null ? `${formatNumber(summary.remainingRange, 0)} km` : "—"}
                hint={
                  summary?.nextReserveOdometer != null
                    ? `Reserve expected near ${formatNumber(summary.nextReserveOdometer, 0)} km`
                    : undefined
                }
              />
              <StatCard
                label="Cost per km"
                value={summary?.costPerKm != null ? formatCurrency(summary.costPerKm) : "—"}
              />
              <StatCard label="Total spend" value={formatCurrency(summary?.totalSpend ?? 0)} />
              <StatCard
                label="Fuel purchased"
                value={`${formatNumber(summary?.totalLitres ?? 0)} L`}
                hint={summary ? `${summary.entryCount} fill${summary.entryCount === 1 ? "" : "s"}` : undefined}
              />
              <StatCard
                label="Distance tracked"
                value={`${formatNumber(summary?.distanceTracked ?? 0, 0)} km`}
              />
              <StatCard
                label={latestMonth ? `Spend in ${formatMonthKey(latestMonth.month, "long")}` : "Monthly spend"}
                value={latestMonth ? formatCurrency(latestMonth.total_spend) : "—"}
              />
            </div>

            {!dataLoading && summary && summary.cycleCount === 0 ? (
              <p className={`rounded-xl border border-border bg-surface px-4 py-3 ${mutedTextClass}`}>
                Mileage appears after two fills marked <strong>Filled at reserve</strong>. Fill up when
                the bike hits reserve and tick the box when adding the entry.
              </p>
            ) : null}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">Monthly spend</h2>
              {monthlySpendChartData.length === 0 ? (
                <p className={`mt-3 ${mutedTextClass}`}>{dataLoading ? "Loading..." : "No fuel entries yet."}</p>
              ) : (
                <div className="mt-4">
                  <BarValueChart
                    data={monthlySpendChartData}
                    xKey="label"
                    yKey="totalSpend"
                    name="Spend"
                    formatValue={(value) => formatCurrency(value)}
                  />
                </div>
              )}
            </section>

            <section className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">Mileage trend</h2>
              {mileageTrendChartData.length === 0 ? (
                <p className={`mt-3 ${mutedTextClass}`}>{dataLoading ? "Loading..." : "Not enough reserve fills yet."}</p>
              ) : (
                <div className="mt-4">
                  <LineTrendChart
                    data={mileageTrendChartData}
                    xKey="label"
                    yKey="mileage"
                    name="Mileage"
                    formatValue={(value) => `${formatNumber(value)} km/l`}
                  />
                </div>
              )}
            </section>
          </div>

          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-foreground">Monthly summary</h2>
            {monthly.length === 0 ? (
              <p className={`mt-3 ${mutedTextClass}`}>{dataLoading ? "Loading..." : "No monthly data yet."}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 font-medium">Month</th>
                      <th className="py-2 pr-4 font-medium">Fills</th>
                      <th className="py-2 pr-4 font-medium">Spend</th>
                      <th className="py-2 pr-4 font-medium">Litres</th>
                      <th className="py-2 pr-4 font-medium">Distance</th>
                      <th className="py-2 pr-4 font-medium">Mileage</th>
                      <th className="py-2 font-medium">Cost/km</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {monthly.map((item) => (
                      <tr key={item.month} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4">{formatMonthKey(item.month, "long")}</td>
                        <td className="py-2 pr-4">{item.fill_count}</td>
                        <td className="py-2 pr-4">{formatCurrency(item.total_spend)}</td>
                        <td className="py-2 pr-4">{formatNumber(item.total_litres, 2)} L</td>
                        <td className="py-2 pr-4">{item.total_distance > 0 ? `${formatNumber(item.total_distance, 0)} km` : "—"}</td>
                        <td className="py-2 pr-4">{item.average_mileage !== null ? `${formatNumber(item.average_mileage)} km/l` : "—"}</td>
                        <td className="py-2">{item.cost_per_km !== null ? formatCurrency(item.cost_per_km) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className={`mt-3 text-xs ${mutedTextClass}`}>
              Distance and mileage are counted in the month a reserve-to-reserve cycle ends.
            </p>
          </section>

          {mileageComparisonChartData.length > 1 ? (
            <section className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">Mileage by vehicle</h2>
              <div className="mt-4">
                <BarValueChart
                  data={mileageComparisonChartData}
                  xKey="name"
                  yKey="averageMileage"
                  name="Average mileage"
                  color="var(--chart-3)"
                  formatValue={(value) => `${formatNumber(value)} km/l`}
                />
              </div>
            </section>
          ) : null}

          <section className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Recent entries</h2>
              <Link href="/history" className={secondaryButtonClass}>
                View history
              </Link>
            </div>
            {recentEntries.length === 0 ? (
              <p className={`mt-3 ${mutedTextClass}`}>{dataLoading ? "Loading..." : "No fuel entries yet."}</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {recentEntries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span className="text-foreground">{formatDateTime(entry.filled_at)}</span>
                    <span className="text-muted">
                      {formatNumber(entry.odometer)} km · {formatNumber(entry.fuel_volume, 2)} L ·{" "}
                      {formatCurrency(entry.amount_paid)}
                      {entry.is_reserve ? " · Reserve" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
