"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import ThemeToggle from "@/components/ThemeToggle";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

const navigationItems = [
  { label: "Dashboard", href: "/" },
  { label: "Add Entry", href: "/entry" },
  { label: "History", href: "/history" },
  { label: "Calendar", href: "/calendar" },
  { label: "Vehicles", href: "/vehicle" },
  { label: "Account", href: "/account" },
];

const hideNavRoutes = ["/login"];

export default function LayoutNavigation() {
  const pathname = usePathname();
  const { session, userId } = useSession({ requireAuth: false });
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;
    const loadProfile = async () => {
      const result = await apiRequest<{ profile: Profile | null }>("/api/profile");
      if (isMounted && result.ok) {
        setProfileName(result.data.profile?.name ?? "");
      }
    };

    void loadProfile();
    window.addEventListener("profile-updated", loadProfile);

    return () => {
      isMounted = false;
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, [userId]);

  if (!session || hideNavRoutes.includes(pathname)) {
    return null;
  }

  const userDisplayName = profileName || session.user.email || "";

  // IMPORTANT:
  // Navigation must not use fixed/absolute full-screen layouts.
  // It should not block pointer events.
  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-base font-semibold text-foreground">
            FuelTrack
          </Link>
          <div className="flex items-center gap-3 sm:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="text-sm font-medium text-muted hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-surface-muted font-semibold text-foreground"
                    : "font-medium text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 sm:ml-auto sm:flex">
          <ThemeToggle />
          <span className="max-w-48 truncate text-sm text-muted">{userDisplayName}</span>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
