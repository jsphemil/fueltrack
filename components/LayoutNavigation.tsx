"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Dashboard", href: "/" },
  { label: "History", href: "/history" },
];

export default function LayoutNavigation() {
  const pathname = usePathname();
  const showNavigation = pathname !== "/login";

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
      </div>
    </nav>
  );
}
