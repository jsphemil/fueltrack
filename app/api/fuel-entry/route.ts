import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { summarizeVehicle } from "@/lib/mileage";
import { checkOdometerOrder, parseFuelEntryInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

const entrySelect = {
  id: true,
  odometer: true,
  fuel_price: true,
  amount_paid: true,
  fuel_volume: true,
  is_reserve: true,
  vehicleId: true,
  filled_at: true,
  created_at: true,
} as const;


async function validateOdometerForVehicle(params: {
  userId: string;
  vehicleId: string;
  odometer: number;
  filledAt: Date;
  excludeId?: string;
}) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: params.vehicleId, userId: params.userId },
    select: { initial_odometer: true },
  });

  if (!vehicle) {
    return { ok: false as const, error: "Vehicle not found", status: 404 as const };
  }

  const otherEntries = await prisma.fuelEntry.findMany({
    where: {
      userId: params.userId,
      vehicleId: params.vehicleId,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
    select: { odometer: true, filled_at: true },
  });

  const result = checkOdometerOrder({
    odometer: params.odometer,
    filledAt: params.filledAt,
    initialOdometer: vehicle.initial_odometer,
    otherEntries,
  });

  return result.ok ? result : { ...result, status: 400 as const };
}

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    const entries = await prisma.fuelEntry.findMany({
      where: {
        userId: user.id,
        ...(vehicleId ? { vehicleId } : {}),
      },
      orderBy: [{ filled_at: "desc" }, { odometer: "desc" }],
      select: entrySelect,
    });

    let summary = null;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, userId: user.id },
        select: { initial_odometer: true },
      });
      summary = vehicle ? summarizeVehicle(entries, vehicle.initial_odometer) : null;
    }

    return Response.json({ entries, summary }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch fuel entries", error);
    return Response.json({ error: "Failed to fetch fuel entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const parsed = parseFuelEntryInput(await readJsonBody(request));
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const input = parsed.value;
    const odometerValidation = await validateOdometerForVehicle({
      userId: user.id,
      vehicleId: input.vehicleId,
      odometer: input.odometer,
      filledAt: input.filled_at,
    });
    if (!odometerValidation.ok) {
      return Response.json({ error: odometerValidation.error }, { status: odometerValidation.status });
    }

    const savedEntry = await prisma.fuelEntry.create({
      data: { userId: user.id, ...input },
      select: entrySelect,
    });

    return Response.json({ id: savedEntry.id, entry: savedEntry, success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to save fuel entry", error);
    return Response.json({ error: "Failed to save fuel entry" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const body = await readJsonBody(request);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const existingEntry = await prisma.fuelEntry.findFirst({
      where: { id, userId: user.id },
      select: { id: true, vehicleId: true, filled_at: true },
    });

    if (!existingEntry) {
      return Response.json({ error: "Fuel entry not found" }, { status: 404 });
    }

    // Entries stay on their vehicle; fill date defaults to the stored one.
    const parsed = parseFuelEntryInput({
      ...body,
      vehicleId: existingEntry.vehicleId ?? "",
      filled_at: body?.filled_at ?? existingEntry.filled_at.toISOString(),
    });
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const input = parsed.value;
    const odometerValidation = await validateOdometerForVehicle({
      userId: user.id,
      vehicleId: input.vehicleId,
      odometer: input.odometer,
      filledAt: input.filled_at,
      excludeId: existingEntry.id,
    });
    if (!odometerValidation.ok) {
      return Response.json({ error: odometerValidation.error }, { status: odometerValidation.status });
    }

    const entry = await prisma.fuelEntry.update({
      where: { id: existingEntry.id },
      data: {
        odometer: input.odometer,
        fuel_price: input.fuel_price,
        amount_paid: input.amount_paid,
        fuel_volume: input.fuel_volume,
        is_reserve: input.is_reserve,
        filled_at: input.filled_at,
      },
      select: entrySelect,
    });

    return Response.json({ entry, success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to update fuel entry", error);
    return Response.json({ error: "Failed to update fuel entry" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") ?? "").trim();
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const result = await prisma.fuelEntry.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      return Response.json({ error: "Fuel entry not found" }, { status: 404 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete fuel entry", error);
    return Response.json({ error: "Failed to delete fuel entry" }, { status: 500 });
  }
}
