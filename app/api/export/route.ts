import { prisma } from "@/lib/prisma";
import { withUser } from "@/lib/server";

export const runtime = "nodejs";

function csvCell(value: string | number | boolean | null) {
  if (value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// All entries as CSV, in display units.
export async function GET(request: Request) {
  return withUser(request, "export data", async (user) => {
    const events = await prisma.event.findMany({
      where: { userId: user.id },
      include: { vehicle: { select: { name: true } } },
      orderBy: [{ vehicleId: "asc" }, { occurredAt: "asc" }],
    });

    const header = ["vehicle", "type", "date", "odometer_km", "odometer_approx", "litres", "amount_inr", "price_per_litre_inr", "full_tank", "note"];
    const rows = events.map((event) => [
      event.vehicle.name,
      event.kind.toLowerCase(),
      event.occurredAt.toISOString(),
      event.odometer !== null ? event.odometer / 10 : null,
      event.odometerApprox,
      event.volumeMl !== null ? event.volumeMl / 1000 : null,
      event.amountPaise !== null ? event.amountPaise / 100 : null,
      event.pricePaise !== null ? event.pricePaise / 100 : null,
      event.fullTank,
      event.note,
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fueltrack-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
