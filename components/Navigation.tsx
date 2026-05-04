"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const navigationItems = [
  { label: "Dashboard", href: "/" },
  { label: "History", href: "/history" },
  { label: "Vehicle", href: "/vehicle" },
  { label: "Account", href: "/account" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const userDisplayName =
    session?.user?.user_metadata?.name ||
    (session?.user as { name?: string } | null)?.name ||
    session?.user?.email || "";

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(data.session);
      }
    }

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

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <nav className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <ul className="flex items-center gap-4">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={`${item.label}-${item.href}`}>
                <Link
                  href={item.href}
                  className={`text-sm ${
                    isActive
                      ? "font-semibold text-zinc-900"
                      : "font-medium text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {userDisplayName ? (
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="truncate">{userDisplayName}</span>
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
