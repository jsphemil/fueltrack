// The build currently deployed, so open copies of the app can tell they're stale.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ buildId: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
