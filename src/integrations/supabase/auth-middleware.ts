import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Supabase server environment is not configured");

    const header = getRequest().headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = header.slice(7);
    const client = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Validate the access token with Supabase Auth. Unlike getClaims(), getUser()
    // works with both legacy HS256 projects and asymmetric JWT signing keys.
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw new Error("Unauthorized");
    return next({ context: { supabase: client, userId: data.user.id } });
  },
);
