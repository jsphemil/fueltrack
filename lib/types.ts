// Shapes returned by the API (dates arrive as ISO strings).
import type { Cycle, EventKind, Gauge, VehicleStats } from "@/lib/engine";

export type { EventKind, Gauge, VehicleStats };

export type FuelEvent = {
  id: string;
  vehicleId: string;
  kind: EventKind;
  occurredAt: string;
  odometer: number | null;
  odometerApprox: boolean;
  volumeMl: number | null;
  amountPaise: number | null;
  pricePaise: number | null;
  fullTank: boolean;
  note: string | null;
  createdAt: string;
};

export type Vehicle = {
  id: string;
  name: string;
  kind: string;
  startOdometer: number;
  tankCapacityMl: number | null;
  reserveMl: number | null;
  archived: boolean;
  createdAt: string;
};

export type VehicleSummary = Vehicle & {
  gauge: Gauge;
  rangeScaleKm: number | null;
  lastFill: FuelEvent | null;
  lastPrice: number | null;
  openReserve: FuelEvent | null;
  eventCount: number;
};

export type TimelineCycle = {
  startId: string;
  endId: string;
  type: Cycle["type"];
  distance: number;
  addedMl: number;
  burnedMl: number | null;
  kmPerL: number | null;
  status: Cycle["status"];
  approx: boolean;
};

export type Me = {
  id: string;
  email: string | null;
  name: string | null;
  vehicleCount: number;
};
