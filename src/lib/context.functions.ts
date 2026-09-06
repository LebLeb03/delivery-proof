import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, MarketInfo, MyContext, StoreInfo } from "./types";

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyContext | null> => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return null;
    const [rolesResult, storesResult, orgResult, marketsResult] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("stores").select("*").order("store_number"),
      profile.organization_id
        ? context.supabase
            .from("organizations")
            .select("*")
            .eq("id", profile.organization_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      context.supabase.from("markets").select("*").order("name"),
    ]);
    if (rolesResult.error) throw rolesResult.error;
    if (storesResult.error) throw storesResult.error;
    if (orgResult.error) throw orgResult.error;
    if (marketsResult.error) throw marketsResult.error;
    const stores = (storesResult.data ?? []) as StoreInfo[];
    return {
      profile,
      roles: (rolesResult.data ?? []).map((row) => row.role as AppRole),
      stores,
      organization: orgResult.data,
      markets: (marketsResult.data ?? []) as MarketInfo[],
    };
  });

const onboardingSchema = z.object({
  organizationCode: z.string().trim().min(8).max(40),
  fullName: z.string().trim().max(100).optional(),
});

export const onboardOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(onboardingSchema)
  .handler(async ({ context, data }) => {
    const { data: organizationId, error } = await context.supabase.rpc(
      "join_organization_by_code",
      {
        _code: data.organizationCode,
        _full_name: data.fullName ?? null,
      },
    );
    if (error) throw error;
    return { organizationId };
  });
