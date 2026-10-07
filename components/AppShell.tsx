"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BikeIcon, FuelIcon, HistoryIcon, HomeIcon, ReserveIcon, SettingsIcon, StatsIcon } from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";
import { FuelProvider, useFuel } from "@/lib/fuel-context";
import { useSession } from "@/lib/hooks";

const NAV = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/stats", label: "Stats", icon: StatsIcon },
  { href: "/vehicles", label: "Vehicles", icon: BikeIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const PUBLIC_ROUTES = ["/login"];
// Focused flows without navigation chrome.
const FOCUS_ROUTES = ["/onboarding", "/quick/reserve", "/fill"];
const NO_VEHICLE_ROUTES = ["/onboarding", "/settings"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2 text-muted">
        <FuelIcon size={20} />
        <span className="text-sm font-medium">FuelTrack</span>
      </div>
    </div>
  );
}

function ActionBar({ className = "" }: { className?: string }) {
  const { activeVehicle } = useFuel();
  const gauge = activeVehicle?.gauge;
  // The reserve button turns orange and glows when you're close to (or on) reserve.
  const low = gauge?.status === "on-reserve" || (gauge?.kmToReserve != null && gauge.kmToReserve < 30);
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <Link
        href="/quick/reserve"
        className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-sm transition active:scale-[0.98] ${low ? "reserve-glow bg-reserve text-reserve-foreground" : "bg-accent text-accent-foreground"}`}
      >
        <ReserveIcon size={20} />
        On reserve
      </Link>
      <Link
        href="/fill"
        className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98]"
      >
        <FuelIcon size={20} />
        Add fuel
      </Link>
    </div>
  );
}

function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loaded, vehicles, me } = useFuel();
  const focus = FOCUS_ROUTES.some((route) => pathname.startsWith(route));
  const needsOnboarding = loaded && vehicles.length === 0 && !NO_VEHICLE_ROUTES.includes(pathname);

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (focus) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2 px-3 text-lg font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <FuelIcon size={18} />
          </span>
          FuelTrack
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive(pathname, href) ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <ActionBar className="mt-8 grid-cols-1!" />
        <div className="mt-auto flex items-center justify-between px-3">
          <span className="truncate text-sm text-muted">{me?.name ?? me?.email ?? ""}</span>
          <ThemeToggle />
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-44 lg:pb-12">{children}</main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        <ActionBar className="px-4 pt-3" />
        <nav className="grid grid-cols-5 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
                isActive(pathname, href) ? "text-foreground" : "text-muted"
              }`}
            >
              <span className="relative flex h-7 w-12 items-center justify-center">
                {/* Active pill grows in behind the icon */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 rounded-full bg-surface-muted transition-transform duration-300 ease-out ${
                    isActive(pathname, href) ? "scale-100" : "scale-0"
                  }`}
                />
                <Icon size={22} className="relative" />
              </span>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, userId } = useSession();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && !session && !isPublic) router.replace("/login");
  }, [loading, session, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (loading || !session) return <Splash />;

  return (
    <FuelProvider userId={userId}>
      <Chrome>{children}</Chrome>
    </FuelProvider>
  );
}
