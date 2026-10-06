import { prisma } from "@/lib/prisma";
import { ensureUser, getUserFromRequest } from "@/lib/auth";
import { summarizeVehicle } from "@/lib/mileage";
import { parseVehicleInput, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

const vehicleSelect = {
  id: true,
  name: true,
  vehicleType: true,
  initial_odometer: true,
} as const;


export async function POST(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const parsed = parseVehicleInput(await readJsonBody(request));
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    await ensureUser(user.id);

    const vehicle = await prisma.vehicle.create({
      data: { userId: user.id, ...parsed.value },
      select: vehicleSelect,
    });

    return Response.json({ vehicle, success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to save vehicle", error);
    return Response.json({ error: "Failed to save vehicle" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { user, error, status } = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error }, { status });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: { created_at: "asc" },
      select: {
        ...vehicleSelect,
        fuelEntries: {
          select: {
            odometer: true,
            amount_paid: true,
            fuel_volume: true,
            is_reserve: true,
            filled_at: true,
          },
        },
      },
    });

    const vehiclesWithStatistics = vehicles.map(({ fuelEntries, ...vehicle }) => ({
      ...vehicle,
      ...summarizeVehicle(fuelEntries, vehicle.initial_odometer),
    }));

    return Response.json({ vehicles: vehiclesWithStatistics }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch vehicles", error);
    return Response.json({ error: "Failed to fetch vehicles" }, { status: 500 });
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

    const parsed = parseVehicleInput(body);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const existingVehicle = await prisma.vehicle.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existingVehicle) {
      return Response.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const firstEntry = await prisma.fuelEntry.findFirst({
      where: { userId: user.id, vehicleId: existingVehicle.id },
      orderBy: { odometer: "asc" },
      select: { odometer: true },
    });

    if (firstEntry && parsed.value.initial_odometer >= firstEntry.odometer) {
      return Response.json(
        {
          error: `Initial odometer must be less than the first fuel entry reading (${firstEntry.odometer})`,
        },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: existingVehicle.id },
      data: parsed.value,
      select: vehicleSelect,
    });

    return Response.json({ vehicle, success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to update vehicle", error);
    return Response.json({ error: "Failed to update vehicle" }, { status: 500 });
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

    const existingVehicle = await prisma.vehicle.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existingVehicle) {
      return Response.json({ error: "Vehicle not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.fuelEntry.deleteMany({
        where: { userId: user.id, vehicleId: existingVehicle.id },
      }),
      prisma.vehicle.delete({
        where: { id: existingVehicle.id },
      }),
    ]);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete vehicle", error);
    return Response.json({ error: "Failed to delete vehicle" }, { status: 500 });
  }
}
