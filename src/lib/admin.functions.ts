import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, OrgUser, StoreInfo, VendorInfo } from "./types";

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
    const [storesResult, vendorsResult, profilesResult, rolesResult, assignmentsResult] =
      await Promise.all([
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
      ]);
    for (const result of [
      storesResult,
      vendorsResult,
      profilesResult,
      rolesResult,
      assignmentsResult,
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
    }));
    return {
      stores: storesResult.data as StoreInfo[],
      vendors: vendorsResult.data as VendorInfo[],
      users,
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
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("stores").insert({
      organization_id: data.organizationId,
      store_number: data.storeNumber,
      store_name: data.storeName || null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updateUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["market_admin", "store_manager", "crew"]),
      storeIds: z.array(z.string().uuid()).min(1),
    }),
  )
  .handler(async ({ context, data }) => {
    const oldRoles = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId);
    if (oldRoles.error) throw oldRoles.error;
    if (oldRoles.data.length) {
      const removed = await context.supabase
        .from("user_roles")
        .delete()
        .in(
          "id",
          oldRoles.data.map((item) => item.id),
        );
      if (removed.error) throw removed.error;
    }
    const newRole = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (newRole.error) throw newRole.error;
    const oldStores = await context.supabase
      .from("user_stores")
      .select("id")
      .eq("user_id", data.userId);
    if (oldStores.error) throw oldStores.error;
    if (oldStores.data.length) {
      const removed = await context.supabase
        .from("user_stores")
        .delete()
        .in(
          "id",
          oldStores.data.map((item) => item.id),
        );
      if (removed.error) throw removed.error;
    }
    const assigned = await context.supabase
      .from("user_stores")
      .insert(data.storeIds.map((storeId) => ({ user_id: data.userId, store_id: storeId })));
    if (assigned.error) throw assigned.error;
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
