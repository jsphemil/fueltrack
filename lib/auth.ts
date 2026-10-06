import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type AuthResult =
  | { user: AuthenticatedUser; error: null; status: 200 }
  | { user: null; error: string; status: 401 | 500 };

function getBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export async function getUserFromRequest(request: Request): Promise<AuthResult> {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { user: null, error: "Unauthorized", status: 401 };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: "Missing Supabase environment variables", status: 500 };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: "Unauthorized", status: 401 };
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    error: null,
    status: 200,
  };
}

// Vehicle and profile rows reference User, so make sure the row exists first.
export async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
}
