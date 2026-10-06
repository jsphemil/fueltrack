"use client";

import { useEffect, useMemo, useState } from "react";

import PageShell from "@/components/PageShell";
import VehicleSelect from "@/components/VehicleSelect";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, toLocalDateKey } from "@/lib/format";
import { useSession, useVehicles } from "@/lib/hooks";
import type { FuelEntry } from "@/lib/types";
import { cardClass, errorTextClass, mutedTextClass, secondaryButtonClass } from "@/lib/ui";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarDay = { dateKey: string; dayNumber: number } | null;

function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const leadingBlanks = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = Array.from({ length: leadingBlanks }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ dateKey: toLocalDateKey(new Date(year, month, day)), dayNumber: day });
  }

  return days;
}

export default function CalendarPage() {
  const { loading: sessionLoading, userId } = useSession();
  const {
    vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    selectedVehicleId,
    setSelectedVehicleId,
  } = useVehicles(userId);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !selectedVehicleId) {
      return;
    }

    let isMounted = true;

    async function load(vehicleId: string) {
      setEntriesLoading(true);
      setEntriesError("");
      setSelectedDate(null);
      const result = await apiRequest<{ entries: FuelEntry[] }>(
        `/api/fuel-entry?vehicleId=${encodeURIComponent(vehicleId)}`
      );
      if (!isMounted) {
        return;
      }
      if (result.ok) {
        setEntries(result.data.entries ?? []);
      } else {
        setEntriesError(result.error);
      }
      setEntriesLoading(false);
    }

    void load(selectedVehicleId);

    return () => {
      isMounted = false;
    };
  }, [userId, selectedVehicleId]);

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth]
  );

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, FuelEntry[]>();
    for (const entry of entries) {
      const key = toLocalDateKey(entry.filled_at);
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }
    return grouped;
  }, [entries]);

  const monthLabel = new Date(visibleMonth.year, visibleMonth.month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const selectedDateEntries = selectedDate ? entriesByDate.get(selectedDate) ?? [] : [];

  function changeMonth(delta: number) {
    setSelectedDate(null);
    setVisibleMonth(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <PageShell
      title="Calendar"
      description="See which days you filled up."
      loading={sessionLoading || !userId}
    >
      <section className={cardClass}>
        <VehicleSelect
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onChange={setSelectedVehicleId}
          loading={vehiclesLoading}
          error={vehiclesError}
        />
      </section>

      {selectedVehicleId ? (
        <section className={cardClass}>
          {entriesError ? <p className={`mb-3 ${errorTextClass}`}>{entriesError}</p> : null}

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => changeMonth(-1)} className={secondaryButtonClass} aria-label="Previous month">
              ‹
            </button>
            <h2 className="text-lg font-semibold text-foreground">{monthLabel}</h2>
            <button type="button" onClick={() => changeMonth(1)} className={secondaryButtonClass} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-muted">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`blank-${index}`} className="h-11 sm:h-12" />;
              }

              const dayEntries = entriesByDate.get(day.dateKey) ?? [];
              const isSelected = selectedDate === day.dateKey;

              return (
                <button
                  type="button"
                  key={day.dateKey}
                  onClick={() => setSelectedDate(day.dateKey)}
                  className={`h-11 rounded-lg border text-sm transition sm:h-12 ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : dayEntries.length > 0
                        ? "border-success/40 bg-success/10 font-semibold text-foreground"
                        : "border-border bg-surface text-subtle hover:bg-surface-muted"
                  }`}
                >
                  {day.dayNumber}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {entriesLoading ? (
              <p className={mutedTextClass}>Loading entries...</p>
            ) : !selectedDate ? (
              <p className={mutedTextClass}>Select a date to see its fills.</p>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-foreground">{formatDate(`${selectedDate}T00:00:00`)}</h3>
                {selectedDateEntries.length === 0 ? (
                  <p className={`mt-2 ${mutedTextClass}`}>No fills on this date.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {selectedDateEntries.map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-border p-3 text-sm text-subtle">
                        {formatNumber(entry.odometer)} km · {formatNumber(entry.fuel_volume, 2)} L ·{" "}
                        {formatCurrency(entry.amount_paid)}
                        {entry.is_reserve ? " · Reserve" : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
