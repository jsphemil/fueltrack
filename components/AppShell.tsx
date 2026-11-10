"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  BikeIcon,
  BookIcon,
  CloseIcon,
  DocumentIcon,
  FuelIcon,
  HistoryIcon,
  HomeIcon,
  InfoIcon,
  MenuIcon,
  ReserveIcon,
  SettingsIcon,
  ShieldIcon,
  SignOutIcon,
  StatsIcon,
  WalletIcon,
  WrenchIcon,
} from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";
import { clearFuelCache, FuelProvider, useFuel } from "@/lib/fuel-context";
import { useSession } from "@/lib/hooks";
import { haptic } from "@/lib/motion";
import { supabase } from "@/lib/supabase";

// Every screen, grouped as in the menu.
const NAV_GROUPS = [
  {
    title: "Fuel",
    items: [
      { href: "/", label: "Home", icon: HomeIcon },
      { href: "/history", label: "History", icon: HistoryIcon },
      { href: "/stats", label: "Stats", icon: StatsIcon },
    ],
  },
  {
    title: "Vehicle",
    items: [
      { href: "/vehicles", label: "Vehicles", icon: BikeIcon },
      { href: "/service", label: "Service", icon: WrenchIcon },
      { href: "/documents", label: "Documents", icon: DocumentIcon },
      { href: "/expenses", label: "Expenses", icon: WalletIcon },
    ],
  },
  {
    title: "App",
    items: [
      { href: "/settings", label: "Settings", icon: SettingsIcon },
      { href: "/guide", label: "Guide", icon: BookIcon },
      { href: "/about", label: "About", icon: InfoIcon },
      { href: "/privacy", label: "Privacy", icon: ShieldIcon },
    ],
  },
];
const NAV = NAV_GROUPS.flatMap((group) => group.items);
// Bottom tabs on phones; every other screen is in the menu.
const TABS = NAV.filter((item) => ["/", "/history", "/stats", "/vehicles"].includes(item.href));
// Screens that show one vehicle at a time, so the top bar offers the vehicle switcher.
const VEHICLE_ROUTES = ["/", "/history", "/stats", "/service", "/expenses"];

const PUBLIC_ROUTES = ["/login", "/reset-password"];
// Readable when signed out (bare page); signed in they keep the menu.
const OPEN_ROUTES = ["/about", "/privacy"];
// Focused flows without navigation chrome.
const FOCUS_ROUTES = ["/onboarding", "/quick/reserve", "/fill"];
const NO_VEHICLE_ROUTES = ["/onboarding", "/settings", "/about", "/privacy"];

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
        onClick={() => haptic()}
        className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-sm transition active:scale-[0.98] ${low ? "reserve-glow bg-reserve text-reserve-foreground" : "bg-accent text-accent-foreground"}`}
      >
        <ReserveIcon size={20} />
        On reserve
      </Link>
      <Link
        href="/fill"
        onClick={() => haptic()}
        className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98]"
      >
        <FuelIcon size={20} />
        Add fuel
      </Link>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted">{group.title}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive(pathname, href) ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

async function signOut(router: ReturnType<typeof useRouter>) {
  clearFuelCache();
  await supabase.auth.signOut();
  router.replace("/login");
}

// Slide-out menu on phones with every screen, theme and sign out.
function Drawer({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const router = useRouter();
  const { me } = useFuel();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-surface px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-3">
          <span className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <FuelIcon size={18} />
            </span>
            FuelTrack
          </span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="-mr-2 rounded-full p-2 text-muted">
            <CloseIcon size={20} />
          </button>
        </div>
        <p className="mt-1 truncate px-3 text-sm text-muted">{me?.name ?? me?.email ?? ""}</p>
        <div className="mt-6">
          <NavLinks pathname={pathname} onNavigate={onClose} />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border px-3 pt-4">
          <button type="button" onClick={() => void signOut(router)} className="flex items-center gap-3 text-sm font-medium text-muted">
            <SignOutIcon size={20} /> Sign out
          </button>
          <ThemeToggle />
        </div>
      </aside>
    </div>
  );
}

// Phone top bar: menu button, screen title, vehicle switcher.
function TopBar({ pathname, onMenu }: { pathname: string; onMenu: () => void }) {
  const { vehicles, activeVehicle, setActiveVehicleId } = useFuel();
  const title = pathname === "/" ? "FuelTrack" : (NAV.find((item) => isActive(pathname, item.href))?.label ?? "FuelTrack");
  const showSwitcher = vehicles.length > 1 && VEHICLE_ROUTES.includes(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <button type="button" onClick={onMenu} aria-label="Open menu" className="rounded-full p-2 text-foreground">
        <MenuIcon size={22} />
      </button>
      <span className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground">{title}</span>
      {showSwitcher ? (
        <select
          aria-label="Vehicle"
          value={activeVehicle?.id ?? ""}
          onChange={(event) => setActiveVehicleId(event.target.value)}
          className="max-w-[45%] truncate rounded-full border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium text-foreground"
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
          ))}
        </select>
      ) : null}
    </header>
  );
}

function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loaded, vehicles, me } = useFuel();
  const focus = FOCUS_ROUTES.some((route) => pathname.startsWith(route));
  const needsOnboarding = loaded && vehicles.length === 0 && !NO_VEHICLE_ROUTES.includes(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

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
        <div className="mt-8">
          <NavLinks pathname={pathname} />
        </div>
        <ActionBar className="mt-8 grid-cols-1!" />
        <div className="mt-auto flex items-center justify-between px-3 pt-6">
          <span className="truncate text-sm text-muted">{me?.name ?? me?.email ?? ""}</span>
          <ThemeToggle />
        </div>
      </aside>

      <TopBar pathname={pathname} onMenu={() => setMenuOpen(true)} />
      <Drawer open={menuOpen} onClose={closeMenu} pathname={pathname} />

      <main className="min-w-0 flex-1 pb-44 lg:pb-12">
        {/* Keyed by screen so each new screen slides in. */}
        <div key={pathname} className="page-slide">{children}</div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        <ActionBar className="px-4 pt-3" />
        <nav className="grid grid-cols-4 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1">
          {TABS.map(({ href, label, icon: Icon }) => (
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
  const isOpen = OPEN_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && !session && !isPublic && !isOpen) router.replace("/login");
  }, [loading, session, isPublic, isOpen, router]);

  if (isPublic || (isOpen && !loading && !session)) return <>{children}</>;
  if (loading || !session) return <Splash />;

  return (
    <FuelProvider userId={userId}>
      <Chrome>{children}</Chrome>
    </FuelProvider>
  );
}
