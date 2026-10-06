import type { MonthlySummary, MileageTrendPoint, VehicleSummary } from "@/lib/mileage";

export type { MonthlySummary, MileageTrendPoint, VehicleSummary };

export type FuelEntry = {
  id: string;
  odometer: number;
  fuel_price: number;
  amount_paid: number;
  fuel_volume: number;
  is_reserve: boolean;
  vehicleId: string | null;
  filled_at: string;
  created_at: string;
};

export type Vehicle = {
  id: string;
  name: string;
  vehicleType: string;
  initial_odometer: number;
};

export type VehicleWithStats = Vehicle & VehicleSummary;

export type Profile = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};
