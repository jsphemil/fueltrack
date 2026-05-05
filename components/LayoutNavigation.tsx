"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

const navigationItems = [
  { label: "Dashboard", href: "/" },
  { label: "History", href: "/history" },
  { label: "Vehicle", href: "/vehicle" },
  { label: "Account", href: "/account" },
];

const hideNavRoutes = ["/login"];

export default function LayoutNavigation() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [profileName, setProfileName] = useState("");
  const isAuthenticated = Boolean(session?.user);
  const showNavigation = !hideNavRoutes.includes(pathname) && isAuthenticated;

  const userDisplayName = profileName || session?.user?.email || "";

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (accessToken?: string) => {
      if (!accessToken) {
        setProfileName("");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok || !isMounted) {
        return;
      }

      const result = (await response.json()) as { profile: { name: string } | null };
      setProfileName(result.profile?.name ?? "");
    };

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(data.session ?? null);
        void loadProfile(data.session?.access_token);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.access_token);
    });

    const handleProfileUpdated = () => {
      void loadProfile(session?.access_token);
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, [session?.access_token]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (!showNavigation) {
    return null;
  }

  // IMPORTANT:
  // Navigation must not use fixed/absolute full-screen layouts.
  // It should not block pointer events.
  return (
    <nav className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={`text-sm ${
                isActive
                  ? "font-semibold text-zinc-900"
                  : "font-medium text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {userDisplayName ? (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-zinc-600">{userDisplayName}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
