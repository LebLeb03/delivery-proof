import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, MarketHierarchy, MarketInfo, PatchInfo, StoreInfo } from "./types";

export const getCompanyHierarchy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MarketHierarchy[]> => {
    const [marketsResult, patchesResult, storesResult, rolesResult, assignmentsResult] =
      await Promise.all([
        context.supabase.from("markets").select("*").order("name"),
        context.supabase.from("patches").select("*").order("name"),
        context.supabase.from("stores").select("*").order("store_number"),
        context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
        context.supabase.from("user_markets").select("market_id").eq("user_id", context.userId),
      ]);
    for (const result of [
      marketsResult,
      patchesResult,
      storesResult,
      rolesResult,
      assignmentsResult,
    ]) {
      if (result.error) throw result.error;
    }
    const roles = (rolesResult.data ?? []).map((item) => item.role as AppRole);
    const editable = roles.some((role) => role === "consultant" || role === "operations_manager");
    const assignedMarketIds = new Set((assignmentsResult.data ?? []).map((item) => item.market_id));
    const stores = (storesResult.data ?? []) as StoreInfo[];
    const patches = (patchesResult.data ?? []) as Omit<PatchInfo, "stores">[];
    return ((marketsResult.data ?? []) as MarketInfo[]).map((market) => ({
      ...market,
      can_edit: editable && assignedMarketIds.has(market.id),
      patches: patches
        .filter((patch) => patch.market_id === market.id)
        .map((patch) => ({
          ...patch,
          stores: stores.filter((store) => store.patch_id === patch.id),
        })),
    }));
  });

export const createMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ name: z.string().trim().min(2).max(100) }))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc("create_market_for_my_organization", {
      _name: data.name,
    });
    if (error) throw error;
    return { id };
  });

export const createPatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      marketId: z.string().uuid(),
      name: z.string().trim().min(2).max(100),
      storeCapacity: z.number().int().min(1).max(100),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("patches").insert({
      market_id: data.marketId,
      name: data.name,
      store_capacity: data.storeCapacity,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updatePatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      patchId: z.string().uuid(),
      name: z.string().trim().min(2).max(100),
      storeCapacity: z.number().int().min(1).max(100),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("patches")
      .update({ name: data.name, store_capacity: data.storeCapacity })
      .eq("id", data.patchId);
    if (error) throw error;
    return { ok: true };
  });

export const deletePatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ patchId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { count, error: countError } = await context.supabase
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("patch_id", data.patchId);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new Error("Move or remove every store from this patch before deleting it.");
    }

    const { error } = await context.supabase.from("patches").delete().eq("id", data.patchId);
    if (error) throw error;
    return { ok: true };
  });

export const createHierarchyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      organizationId: z.string().uuid(),
      patchId: z.string().uuid(),
      storeNumber: z.string().trim().min(1).max(30),
      storeName: z.string().trim().max(100).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("stores").insert({
      organization_id: data.organizationId,
      patch_id: data.patchId,
      store_number: data.storeNumber,
      store_name: data.storeName || null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const moveStoreToPatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ storeId: z.string().uuid(), patchId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("stores")
      .update({ patch_id: data.patchId })
      .eq("id", data.storeId);
    if (error) throw error;
    return { ok: true };
  });
