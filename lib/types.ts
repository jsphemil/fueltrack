// Shapes returned by the API (dates arrive as ISO strings).
import type { Cycle, EventKind, Gauge, ServiceStatus, VehicleStats } from "@/lib/engine";

export type { EventKind, Gauge, ServiceStatus, VehicleStats };

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
  services: ServiceStatus[]; // most urgent first
  openIssues: OpenIssue[]; // oldest first
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

export type ServiceItem = {
  id: string;
  vehicleId: string;
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  baselineOdometer: number;
  baselineDate: string;
};

export type OpenIssue = { id: string; title: string; notedOn: string };

export type ServiceKind = "MAINTENANCE" | "REPAIR";

export type ServiceRecord = {
  id: string;
  vehicleId: string;
  kind: ServiceKind;
  occurredOn: string;
  odometer: number;
  costPaise: number | null;
  note: string | null;
  items: Array<{ id: string; name: string }>;
  issues: Array<{ id: string; title: string }>; // fixed by this visit
};

export type VehicleDocument = {
  id: string;
  vehicleId: string | null; // null = personal (e.g. driving licence)
  kind: string;
  expiresOn: string; // ISO; the date part is the expiry date
  note: string | null;
  createdAt: string;
};

export type Me = {
  id: string;
  email: string | null;
  name: string | null;
  lowFuelKm: number | null; // reminder threshold; null = off
  vehicleCount: number;
};
