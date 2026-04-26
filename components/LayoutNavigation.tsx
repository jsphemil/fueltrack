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
  const isAuthenticated = Boolean(session?.user);
  const showNavigation = !hideNavRoutes.includes(pathname) && isAuthenticated;

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(data.session ?? null);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

        {session?.user?.email ? (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-zinc-600">{session.user.email}</span>
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
