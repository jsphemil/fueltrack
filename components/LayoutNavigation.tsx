"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function LayoutNavigation() {
  const pathname = usePathname();
  const showNavigation = pathname !== "/login";

  return showNavigation ? <Navigation /> : null;
}
