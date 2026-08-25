import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeOrderNumber } from "./delivery-utils";
import type { DeliveryDetail, DeliveryListItem, DeliveryStatus } from "./types";

const searchSchema = z.object({
  query: z.string().max(100).default(""),
  vendorId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  status: z.enum(["received", "damaged", "missing_items", "other_issue"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const searchDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(searchSchema)
  .handler(async ({ context, data }): Promise<DeliveryListItem[]> => {
    let query = context.supabase
      .from("deliveries")
      .select(
        "id,order_number,order_last_four,delivered_at,status,notes,store:stores(store_number,store_name),vendor:vendors(vendor_name),uploader:profiles!deliveries_uploaded_by_fkey(full_name,email),delivery_photos(count)",
      );
    const order = normalizeOrderNumber(data.query);
    if (order) query = query.ilike("order_search", `%${order}%`);
    if (data.vendorId) query = query.eq("vendor_id", data.vendorId);
    if (data.storeId) query = query.eq("store_id", data.storeId);
    if (data.status) query = query.eq("status", data.status);
    if (data.dateFrom) query = query.gte("delivered_at", `${data.dateFrom}T00:00:00`);
    if (data.dateTo) query = query.lte("delivered_at", `${data.dateTo}T23:59:59.999`);
    const { data: rows, error } = await query
      .order("delivered_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return (rows ?? []).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      order_last_four: row.order_last_four,
      delivered_at: row.delivered_at,
      status: row.status as DeliveryStatus,
      notes: row.notes,
      store: row.store,
      vendor: row.vendor,
      uploader: row.uploader,
      photo_count: row.delivery_photos?.[0]?.count ?? 0,
    }));
  });

const duplicateSchema = z.object({
  orderNumber: z.string().trim().min(1),
  storeId: z.string().uuid(),
});

export const checkDuplicateOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(duplicateSchema)
  .handler(async ({ context, data }) => {
    const { count, error } = await context.supabase
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .eq("store_id", data.storeId)
      .eq("order_search", normalizeOrderNumber(data.orderNumber));
    if (error) throw error;
    return { count: count ?? 0 };
  });

const createSchema = z.object({
  organizationId: z.string().uuid(),
  storeId: z.string().uuid(),
  vendorId: z.string().uuid(),
  orderNumber: z.string().trim().min(1).max(100),
  deliveredAt: z.string().datetime(),
  status: z.enum(["received", "damaged", "missing_items", "other_issue"]),
  notes: z.string().trim().max(2000).optional(),
});

export const createDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createSchema)
  .handler(async ({ context, data }) => {
    const { data: delivery, error } = await context.supabase
      .from("deliveries")
      .insert({
        organization_id: data.organizationId,
        store_id: data.storeId,
        vendor_id: data.vendorId,
        order_number: data.orderNumber,
        delivered_at: data.deliveredAt,
        status: data.status,
        notes: data.notes || null,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return delivery;
  });

const photoSchema = z.object({
  deliveryId: z.string().uuid(),
  storagePath: z.string().min(1).max(500),
  originalFilename: z.string().max(255).optional(),
});

export const addDeliveryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(photoSchema)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("delivery_photos").insert({
      delivery_id: data.deliveryId,
      storage_path: data.storagePath,
      original_filename: data.originalFilename ?? null,
      uploaded_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const getDeliveryDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ deliveryId: z.string().uuid() }))
  .handler(async ({ context, data }): Promise<DeliveryDetail> => {
    const { data: row, error } = await context.supabase
      .from("deliveries")
      .select(
        "*,store:stores(store_number,store_name),vendor:vendors(vendor_name),uploader:profiles!deliveries_uploaded_by_fkey(full_name,email),delivery_photos(id,storage_path,original_filename,created_at),delivery_audit_log(id,action,created_at,changed_by,previous_values,new_values)",
      )
      .eq("id", data.deliveryId)
      .single();
    if (error) throw error;
    const photos = await Promise.all(
      (row.delivery_photos ?? []).map(async (photo) => {
        const signed = await context.supabase.storage
          .from("delivery-photos")
          .createSignedUrl(photo.storage_path, 3600);
        return { ...photo, signed_url: signed.data?.signedUrl ?? null };
      }),
    );
    const { data: canEdit } = await context.supabase.rpc("can_manage_deliveries", {
      _store_id: row.store_id,
    });
    return {
      id: row.id,
      order_number: row.order_number,
      order_last_four: row.order_last_four,
      delivered_at: row.delivered_at,
      status: row.status as DeliveryStatus,
      notes: row.notes,
      store: row.store,
      vendor: row.vendor,
      uploader: row.uploader,
      photo_count: photos.length,
      store_id: row.store_id,
      vendor_id: row.vendor_id,
      organization_id: row.organization_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      photos,
      audit: (row.delivery_audit_log ?? []).map((entry) => ({ ...entry, changer_name: null })),
      can_edit: Boolean(canEdit),
    };
  });

export const updateDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      deliveryId: z.string().uuid(),
      vendorId: z.string().uuid().nullable(),
      orderNumber: z.string().trim().min(1).max(100),
      deliveredAt: z.string().datetime(),
      status: z.enum(["received", "damaged", "missing_items", "other_issue"]),
      notes: z.string().trim().max(2000).nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("deliveries")
      .update({
        vendor_id: data.vendorId,
        order_number: data.orderNumber,
        delivered_at: data.deliveredAt,
        status: data.status,
        notes: data.notes,
      })
      .eq("id", data.deliveryId);
    if (error) throw error;
    return { ok: true };
  });
