/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const db = (supabase: unknown) => supabase as any;

export type TravelTemplate = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  items: {
    id: string;
    title: string;
    instructions: string | null;
    photo_required: boolean;
    sort_order: number;
  }[];
};

export const getTravelPathTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TravelTemplate[]> => {
    const { data, error } = await db(context.supabase)
      .from("travel_path_templates")
      .select(
        "id,name,description,active,travel_path_template_items(id,title,instructions,photo_required,sort_order)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((template: any) => ({
      ...template,
      items: [...(template.travel_path_template_items ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    }));
  });

export const getTravelPathRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({ storeId: z.string().uuid().optional(), query: z.string().max(100).default("") }),
  )
  .handler(async ({ context, data }) => {
    let query = db(context.supabase)
      .from("travel_path_runs")
      .select(
        "id,template_name,status,store_id,created_at,completed_at,store:stores(store_number,store_name),travel_path_run_items(id,completed)",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.storeId) query = query.eq("store_id", data.storeId);
    if (data.query.trim()) query = query.ilike("template_name", `%${data.query.trim()}%`);
    const { data: rows, error } = await query;
    if (error) throw error;
    return (rows ?? []).map((row: any) => ({
      ...row,
      total: row.travel_path_run_items?.length ?? 0,
      complete: row.travel_path_run_items?.filter((item: any) => item.completed).length ?? 0,
    }));
  });

const createTemplateSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(240),
        instructions: z.string().trim().max(2000).optional(),
        photoRequired: z.boolean(),
      }),
    )
    .min(1)
    .max(50),
});

export const createTravelPathTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createTemplateSchema)
  .handler(async ({ context, data }) => {
    const client = db(context.supabase);
    const { data: template, error } = await client
      .from("travel_path_templates")
      .insert({
        organization_id: data.organizationId,
        name: data.name,
        description: data.description || null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    const { error: itemError } = await client.from("travel_path_template_items").insert(
      data.items.map((item, index) => ({
        template_id: template.id,
        title: item.title,
        instructions: item.instructions || null,
        photo_required: item.photoRequired,
        sort_order: index,
      })),
    );
    if (itemError) throw itemError;
    return template;
  });

export const startTravelPathRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      templateId: z.string().uuid(),
      storeId: z.string().uuid(),
      organizationId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, data }) => {
    const client = db(context.supabase);
    const { data: template, error: templateError } = await client
      .from("travel_path_templates")
      .select("id,name,travel_path_template_items(id,title,instructions,photo_required,sort_order)")
      .eq("id", data.templateId)
      .single();
    if (templateError) throw templateError;
    const { data: run, error } = await client
      .from("travel_path_runs")
      .insert({
        organization_id: data.organizationId,
        template_id: template.id,
        template_name: template.name,
        store_id: data.storeId,
        started_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    const { error: itemsError } = await client.from("travel_path_run_items").insert(
      (template.travel_path_template_items ?? []).map((item: any) => ({
        run_id: run.id,
        template_item_id: item.id,
        title: item.title,
        instructions: item.instructions,
        photo_required: item.photo_required,
        sort_order: item.sort_order,
      })),
    );
    if (itemsError) throw itemsError;
    return run;
  });

export const getTravelPathRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ runId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: run, error } = await db(context.supabase)
      .from("travel_path_runs")
      .select(
        "id,template_name,status,store_id,created_at,store:stores(store_number,store_name),travel_path_run_items(id,title,instructions,photo_required,sort_order,completed,completed_at,notes,travel_path_photos(id,storage_path,original_filename,created_at))",
      )
      .eq("id", data.runId)
      .single();
    if (error) throw error;
    return {
      ...run,
      items: [...(run.travel_path_run_items ?? [])].sort(
        (a: any, b: any) => a.sort_order - b.sort_order,
      ),
    };
  });

export const updateTravelPathRunItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      itemId: z.string().uuid(),
      completed: z.boolean(),
      notes: z.string().trim().max(2000).nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await db(context.supabase)
      .from("travel_path_run_items")
      .update({
        completed: data.completed,
        notes: data.notes,
        completed_by: data.completed ? context.userId : null,
        completed_at: data.completed ? new Date().toISOString() : null,
      })
      .eq("id", data.itemId);
    if (error) throw error;
    return { ok: true };
  });

export const addTravelPathPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      runItemId: z.string().uuid(),
      storagePath: z.string().min(1).max(500),
      originalFilename: z.string().max(255).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await db(context.supabase)
      .from("travel_path_photos")
      .insert({
        run_item_id: data.runItemId,
        storage_path: data.storagePath,
        original_filename: data.originalFilename ?? null,
        uploaded_by: context.userId,
      });
    if (error) throw error;
    return { ok: true };
  });

export const updateTravelPathRunStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      runId: z.string().uuid(),
      status: z.enum(["in_progress", "ready_for_review", "operational", "needs_attention"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await db(context.supabase)
      .from("travel_path_runs")
      .update({
        status: data.status,
        completed_by: data.status === "in_progress" ? null : context.userId,
        completed_at: data.status === "in_progress" ? null : new Date().toISOString(),
      })
      .eq("id", data.runId);
    if (error) throw error;
    return { ok: true };
  });
