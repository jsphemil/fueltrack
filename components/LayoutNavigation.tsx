"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";

const hiddenRoutes = new Set(["/login", "/signup"]);

export default function LayoutNavigation() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

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

  if (hiddenRoutes.has(pathname) || !session) {
    return null;
  }

  return <Navigation session={session} />;
}
