export type MileageInputEntry = {
  odometer: number;
  fuel_volume: number;
  created_at: Date;
};

export type MileageSegment = {
  date: string;
  mileage: number;
};

export function calculateMileageSegments(entries: MileageInputEntry[]): MileageSegment[] {
  const orderedEntries = [...entries].sort((a, b) => a.odometer - b.odometer);
  const segments: MileageSegment[] = [];

  for (let index = 1; index < orderedEntries.length; index += 1) {
    const previous = orderedEntries[index - 1];
    const current = orderedEntries[index];
    const distance = current.odometer - previous.odometer;

    if (distance <= 0 || previous.fuel_volume <= 0) {
      continue;
    }

    segments.push({
      date: current.created_at.toISOString(),
      mileage: Number((distance / previous.fuel_volume).toFixed(2)),
    });
  }

  return segments;
}
