import { activeWithin, ERROR_KEEP_DAYS, signupsByWeek } from "@/lib/admin-stats";
import { withAdmin } from "@/lib/admin";
import { calculateCycles, efficiency, sortEvents } from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import { toEngineVehicle } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

type AuthUserRow = { id: string; email: string | null; created_at: Date; last_sign_in_at: Date | null };

// Everything the admin page shows. Per user: counts and dates only, never entries.
export async function GET(request: Request) {
  return withAdmin(request, "load admin overview", async () => {
    const now = new Date();
    const keepFrom = new Date(now.getTime() - ERROR_KEEP_DAYS * DAY_MS);
    await prisma.errorLog.deleteMany({ where: { createdAt: { lt: keepFrom } } });

    const [authUsers, vehiclesByUser, eventsByUser, eventsByKind, fillTotals, serviceRecords, expenses, documents, issues, dbSize, errorsDay, errorsMonth, latestErrors, vehicles] =
      await Promise.all([
        prisma.$queryRaw<AuthUserRow[]>`select id::text as id, email, created_at, last_sign_in_at from auth.users order by created_at`,
        prisma.vehicle.groupBy({ by: ["userId"], _count: { _all: true } }),
        prisma.event.groupBy({ by: ["userId"], _count: { _all: true }, _max: { createdAt: true } }),
        prisma.event.groupBy({ by: ["kind"], _count: { _all: true } }),
        prisma.event.aggregate({ where: { kind: "FILL" }, _sum: { volumeMl: true, amountPaise: true } }),
        prisma.serviceRecord.count(),
        prisma.expense.count(),
        prisma.document.count(),
        prisma.issue.count(),
        prisma.$queryRaw<{ bytes: bigint }[]>`select pg_database_size(current_database()) as bytes`,
        prisma.errorLog.count({ where: { createdAt: { gte: new Date(now.getTime() - DAY_MS) } } }),
        prisma.errorLog.count(),
        prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { createdAt: true, route: true, message: true } }),
        prisma.vehicle.findMany({ include: { events: true } }),
      ]);

    const vehicleCount = new Map(vehiclesByUser.map((row) => [row.userId, row._count._all]));
    const eventStats = new Map(eventsByUser.map((row) => [row.userId, { entries: row._count._all, lastActivity: row._max.createdAt }]));
    const kindCount = (kind: string) => eventsByKind.find((row) => row.kind === kind)?._count._all ?? 0;

    const users = authUsers.map((user) => ({
      email: user.email,
      signedUpAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      lastActivityAt: eventStats.get(user.id)?.lastActivity ?? null,
      vehicles: vehicleCount.get(user.id) ?? 0,
      entries: eventStats.get(user.id)?.entries ?? 0,
    }));

    // Average of each vehicle's lifetime mileage (vehicles with at least one valid cycle).
    const mileages = vehicles
      .map((vehicle) => efficiency(calculateCycles(toEngineVehicle(vehicle), sortEvents(vehicle.events))))
      .filter((value): value is number => value !== null);

    return Response.json({
      usage: {
        users: authUsers.length,
        active7: activeWithin(users.map((user) => user.lastActivityAt), now, 7),
        active30: activeWithin(users.map((user) => user.lastActivityAt), now, 30),
        signupsByWeek: signupsByWeek(authUsers.map((user) => new Date(user.created_at)), now),
        vehicles: vehicles.length,
        fills: kindCount("FILL"),
        reserves: kindCount("RESERVE"),
        odometerReadings: kindCount("ODOMETER"),
        serviceRecords,
        expenses,
        documents,
        issues,
      },
      users,
      health: {
        buildId: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
        databaseBytes: Number(dbSize[0]?.bytes ?? 0),
        errors24h: errorsDay,
        errors30d: errorsMonth,
        latestErrors,
      },
      fuel: {
        litres: (fillTotals._sum.volumeMl ?? 0) / 1000,
        spendPaise: fillTotals._sum.amountPaise ?? 0,
        averageKmPerL: mileages.length > 0 ? mileages.reduce((sum, value) => sum + value, 0) / mileages.length : null,
        vehiclesWithMileage: mileages.length,
      },
    });
  });
}
