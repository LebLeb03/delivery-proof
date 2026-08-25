import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, MyContext, StoreInfo } from "./types";

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
    const [rolesResult, storesResult, orgResult] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("user_stores").select("stores(*)").eq("user_id", context.userId),
      profile.organization_id
        ? context.supabase
            .from("organizations")
            .select("*")
            .eq("id", profile.organization_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (rolesResult.error) throw rolesResult.error;
    if (storesResult.error) throw storesResult.error;
    if (orgResult.error) throw orgResult.error;
    const stores = (storesResult.data ?? []).flatMap((row) =>
      row.stores ? [row.stores] : [],
    ) as StoreInfo[];
    return {
      profile,
      roles: (rolesResult.data ?? []).map((row) => row.role as AppRole),
      stores,
      organization: orgResult.data,
    };
  });

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(100),
  storeNumber: z.string().trim().min(1).max(30),
  storeName: z.string().trim().max(100).optional(),
  fullName: z.string().trim().max(100).optional(),
  includeSampleData: z.boolean().default(true),
});

export const onboardOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(onboardingSchema)
  .handler(async ({ context, data }) => {
    const { data: organizationId, error } = await context.supabase.rpc("onboard_my_organization", {
      _organization_name: data.organizationName,
      _store_number: data.storeNumber,
      _store_name: data.storeName ?? null,
      _full_name: data.fullName ?? null,
      _include_sample_data: data.includeSampleData,
    });
    if (error) throw error;
    return { organizationId };
  });
