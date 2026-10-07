import { supabase } from "@/lib/supabase";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

// Calls an API route with the current user's access token and normalises errors.
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    return { ok: false, error: "Please log in to continue.", status: 401 };
  }

  const headers: HeadersInit = { Authorization: `Bearer ${accessToken}` };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const result = (await response.json().catch(() => null)) as
      | (T & { error?: string; message?: string })
      | null;

    if (!response.ok) {
      return {
        ok: false,
        error: result?.error ?? result?.message ?? "Something went wrong. Please try again.",
        status: response.status,
      };
    }

    return { ok: true, data: result as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again.", status: 0 };
  }
}
