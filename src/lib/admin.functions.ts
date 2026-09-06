import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, MarketInfo, OrgUser, StoreInfo, VendorInfo } from "./types";

export const getVendors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VendorInfo[]> => {
    const { data, error } = await context.supabase.from("vendors").select("*").order("vendor_name");
    if (error) throw error;
    return data;
  });

export const getAdministration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .single();
    if (!profile?.organization_id) throw new Error("Organization not configured");
    const [
      storesResult,
      vendorsResult,
      profilesResult,
      rolesResult,
      assignmentsResult,
      marketsResult,
      marketAssignmentsResult,
      joinCodeResult,
    ] = await Promise.all([
      context.supabase
        .from("stores")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("store_number"),
      context.supabase
        .from("vendors")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("vendor_name"),
      context.supabase
        .from("profiles")
        .select("id,email,full_name")
        .eq("organization_id", profile.organization_id),
      context.supabase.from("user_roles").select("user_id,role"),
      context.supabase.from("user_stores").select("user_id,store_id"),
      context.supabase
        .from("markets")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("name"),
      context.supabase.from("user_markets").select("user_id,market_id"),
      context.supabase
        .from("organization_join_codes")
        .select("code")
        .eq("organization_id", profile.organization_id)
        .maybeSingle(),
    ]);
    for (const result of [
      storesResult,
      vendorsResult,
      profilesResult,
      rolesResult,
      assignmentsResult,
      marketsResult,
      marketAssignmentsResult,
    ]) {
      if (result.error) throw result.error;
    }
    const users: OrgUser[] = (profilesResult.data ?? []).map((person) => ({
      ...person,
      roles: (rolesResult.data ?? [])
        .filter((role) => role.user_id === person.id)
        .map((role) => role.role as AppRole),
      store_ids: (assignmentsResult.data ?? [])
        .filter((item) => item.user_id === person.id)
        .map((item) => item.store_id),
      market_ids: (marketAssignmentsResult.data ?? [])
        .filter((item) => item.user_id === person.id)
        .map((item) => item.market_id),
    }));
    return {
      stores: storesResult.data as StoreInfo[],
      vendors: vendorsResult.data as VendorInfo[],
      users,
      markets: marketsResult.data as MarketInfo[],
      organizationCode: joinCodeResult.data?.code ?? null,
    };
  });

export const createVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({ organizationId: z.string().uuid(), vendorName: z.string().trim().min(2).max(100) }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("vendors").insert({
      organization_id: data.organizationId,
      vendor_name: data.vendorName,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updateVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      vendorId: z.string().uuid(),
      vendorName: z.string().trim().min(2).max(100),
      active: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("vendors")
      .update({ vendor_name: data.vendorName, active: data.active })
      .eq("id", data.vendorId);
    if (error) throw error;
    return { ok: true };
  });

export const createStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      organizationId: z.string().uuid(),
      storeNumber: z.string().trim().min(1).max(30),
      storeName: z.string().trim().max(100).optional(),
      patchId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("stores").insert({
      organization_id: data.organizationId,
      store_number: data.storeNumber,
      store_name: data.storeName || null,
      patch_id: data.patchId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updateUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      userId: z.string().uuid(),
      role: z.enum([
        "company_admin",
        "consultant",
        "operations_manager",
        "delivery_manager",
        "general_manager",
        "crew",
      ]),
      storeIds: z.array(z.string().uuid()),
      marketIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("set_user_access", {
      _user_id: data.userId,
      _role: data.role,
      _store_ids: data.storeIds,
      _market_ids: data.marketIds,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      fullName: z.string().trim().min(1).max(100),
      defaultStoreId: z.string().uuid().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName, default_store_id: data.defaultStoreId })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
