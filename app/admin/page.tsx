"use client";

import { useEffect, useState } from "react";

import { BarValueChart } from "@/components/Charts";
import { Notice, Page, PageHeader, StatTile } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDateTime, formatKmPerL, formatMoney, formatNumber, formatRelative } from "@/lib/format";
import { cardClass, mutedTextClass } from "@/lib/ui";

type Overview = {
  usage: {
    users: number;
    active7: number;
    active30: number;
    signupsByWeek: { weekStart: string; count: number }[];
    vehicles: number;
    fills: number;
    reserves: number;
    odometerReadings: number;
    serviceRecords: number;
    expenses: number;
    documents: number;
    issues: number;
  };
  users: {
    email: string | null;
    signedUpAt: string;
    lastSignInAt: string | null;
    lastActivityAt: string | null;
    vehicles: number;
    entries: number;
  }[];
  health: {
    buildId: string;
    databaseBytes: number;
    errors24h: number;
    errors30d: number;
    latestErrors: { createdAt: string; route: string; message: string }[];
  };
  fuel: { litres: number; spendPaise: number; averageKmPerL: number | null; vehiclesWithMileage: number };
};

// Supabase's free plan allows a 500 MB database.
const FREE_DB_BYTES = 500 * 1024 * 1024;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={cardClass}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    void apiRequest<Overview>("/api/admin/overview").then((result) => {
      if (!isMounted) return;
      if (result.ok) setData(result.data);
      else setError(result.status === 404 ? "Not found." : result.error);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <Page>
        <PageHeader title="Admin" />
        <Notice tone={error === "Not found." ? "info" : "danger"}>{error}</Notice>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        <PageHeader title="Admin" />
        <p className={mutedTextClass}>Loading...</p>
      </Page>
    );
  }

  const { usage, users, health, fuel } = data;
  const signups = usage.signupsByWeek.map((week) => ({ label: formatDate(week.weekStart), count: week.count }));
  const dbMb = health.databaseBytes / (1024 * 1024);

  return (
    <Page>
      <PageHeader title="Admin" subtitle="How FuelTrack is used and how healthy it is. Counts only: no one's entries are shown." />

      <Card title="Usage">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Users" value={usage.users} />
          <StatTile label="Active 7 days" value={usage.active7} hint="Logged something" />
          <StatTile label="Active 30 days" value={usage.active30} />
          <StatTile label="Vehicles" value={usage.vehicles} />
          <StatTile label="Fills" value={usage.fills} />
          <StatTile label="Reserve taps" value={usage.reserves} />
          <StatTile label="Odometer readings" value={usage.odometerReadings} />
          <StatTile label="Service visits" value={usage.serviceRecords} />
          <StatTile label="Expenses" value={usage.expenses} />
          <StatTile label="Documents" value={usage.documents} />
          <StatTile label="Issues" value={usage.issues} />
        </div>
        <p className={`mt-6 ${mutedTextClass}`}>Sign-ups per week (last 8 weeks)</p>
        <BarValueChart data={signups} xKey="label" yKey="count" name="Sign-ups" formatValue={(value) => formatNumber(value, 0)} />
      </Card>

      <Card title="Users">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">Email</th>
                <th className="px-2 py-2 font-medium">Signed up</th>
                <th className="px-2 py-2 font-medium">Last sign-in</th>
                <th className="px-2 py-2 font-medium">Last entry</th>
                <th className="px-2 py-2 text-right font-medium">Vehicles</th>
                <th className="px-2 py-2 text-right font-medium">Entries</th>
              </tr>
            </thead>
            <tbody className="tabular text-subtle">
              {users.map((user) => (
                <tr key={`${user.email}-${user.signedUpAt}`} className="border-t border-border">
                  <td className="max-w-[14rem] truncate px-2 py-2 text-foreground">{user.email ?? "—"}</td>
                  <td className="px-2 py-2">{formatDate(user.signedUpAt)}</td>
                  <td className="px-2 py-2">{user.lastSignInAt ? formatRelative(user.lastSignInAt) : "—"}</td>
                  <td className="px-2 py-2">{user.lastActivityAt ? formatRelative(user.lastActivityAt) : "—"}</td>
                  <td className="px-2 py-2 text-right">{user.vehicles}</td>
                  <td className="px-2 py-2 text-right">{user.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="App health">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Build" value={health.buildId.slice(0, 7)} hint="Commit deployed" />
          <StatTile label="Database" value={`${formatNumber(dbMb, 1)} MB`} hint={`${formatNumber((health.databaseBytes / FREE_DB_BYTES) * 100, 0)}% of the free 500 MB`} />
          <StatTile label="Errors 24 h" value={health.errors24h} />
          <StatTile label="Errors 30 days" value={health.errors30d} />
        </div>
        <p className={`mt-6 ${mutedTextClass}`}>Latest errors</p>
        {health.latestErrors.length === 0 ? (
          <p className="mt-2 text-sm text-subtle">None in the last 30 days.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {health.latestErrors.map((item, index) => (
              <li key={index} className="rounded-xl bg-surface-muted px-3 py-2">
                <p className="text-foreground">Failed to {item.route} · <span className="text-muted">{formatDateTime(item.createdAt)}</span></p>
                <p className="mt-0.5 break-words text-xs text-muted">{item.message}</p>
              </li>
            ))}
          </ul>
        )}
        <p className={`mt-4 ${mutedTextClass}`}>
          Request logs and deployments:{" "}
          <a href="https://vercel.com/jsphemils-projects/fueltrack" target="_blank" rel="noopener noreferrer" className="underline">Vercel dashboard</a>
        </p>
      </Card>

      <Card title="Fuel across everyone">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Litres logged" value={`${formatNumber(fuel.litres, 1)} L`} />
          <StatTile label="Spend logged" value={formatMoney(fuel.spendPaise, true)} />
          <StatTile
            label="Average mileage"
            value={formatKmPerL(fuel.averageKmPerL)}
            hint={`Across ${fuel.vehiclesWithMileage} vehicle${fuel.vehiclesWithMileage === 1 ? "" : "s"} with a full cycle`}
          />
        </div>
      </Card>
    </Page>
  );
}
