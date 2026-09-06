import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/lib/app-context";
import {
  addTravelPathPhoto,
  getTravelPathRun,
  updateTravelPathRunItem,
  updateTravelPathRunStatus,
} from "@/lib/travel-path.functions";
import { compressImage } from "@/lib/image-utils";

export const Route = createFileRoute("/_authenticated/travel-paths/$runId")({
  component: TravelPathRunPage,
});
type RunItem = {
  id: string;
  title: string;
  instructions: string | null;
  photo_required: boolean;
  completed: boolean;
  notes: string | null;
  travel_path_photos: { id: string; storage_path: string; original_filename: string | null }[];
};
type Run = {
  id: string;
  template_name: string;
  status: TravelPathStatus;
  store_id: string;
  store: { store_number: string; store_name: string | null } | null;
  items: RunItem[];
};
type TravelPathStatus = "in_progress" | "ready_for_review" | "operational" | "needs_attention";

const STATUS_LABELS: Record<TravelPathStatus, string> = {
  in_progress: "In progress",
  ready_for_review: "Ready for review",
  operational: "Operational",
  needs_attention: "Needs attention",
};

function TravelPathRunPage() {
  const { runId } = Route.useParams();
  const context = useAppContext();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  async function load() {
    try {
      setRun(await getTravelPathRun({ data: { runId } }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this checklist");
    }
  }
  useEffect(() => {
    void load();
  }, [runId]);
  async function saveItem(item: RunItem, completed = item.completed, notes = item.notes) {
    setBusyId(item.id);
    try {
      await updateTravelPathRunItem({
        data: { itemId: item.id, completed, notes: notes?.trim() || null },
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this step");
    } finally {
      setBusyId(null);
    }
  }
  async function upload(item: RunItem, file: File) {
    if (!run) return;
    setBusyId(item.id);
    try {
      const blob = await compressImage(file);
      const path = `${run.store_id}/travel-paths/${run.id}/${item.id}/${crypto.randomUUID()}.jpg`;
      const result = await supabase.storage
        .from("travel-path-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (result.error) throw result.error;
      await addTravelPathPhoto({
        data: { runItemId: item.id, storagePath: path, originalFilename: file.name },
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload the photo");
    } finally {
      setBusyId(null);
    }
  }
  async function submit(status: Exclude<TravelPathStatus, "in_progress">) {
    if (!run) return;
    const missing = run.items.filter(
      (item) => item.photo_required && item.travel_path_photos.length === 0,
    );
    if (missing.length) {
      setError(
        `Add photo proof for ${missing.length} required section${missing.length === 1 ? "" : "s"} before submitting.`,
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    setSavedMessage(null);
    try {
      await updateTravelPathRunStatus({ data: { runId: run.id, status } });
      setRun((current) => (current ? { ...current, status } : current));
      setSavedMessage(`Station check updated to ${STATUS_LABELS[status]}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the checklist");
    } finally {
      setSubmitting(false);
    }
  }
  if (!run)
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center text-muted-foreground">
        {error ?? "Loading checklist…"}
      </main>
    );
  const complete = run.items.filter((item) => item.completed).length;
  return (
    <main className="mx-auto max-w-3xl px-5 py-7">
      <Link to="/travel-paths" className="text-sm font-bold text-[#a83225]">
        ← Travel Paths
      </Link>
      <div className="mt-4 rounded-3xl bg-[#173327] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-[.15em] text-white/60">
            Store {run.store?.store_number}
          </p>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
            {STATUS_LABELS[run.status]}
          </span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{run.template_name}</h1>
        <p className="mt-3 text-sm text-white/70">
          {complete} of {run.items.length} sections checked
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-[#ff806c]"
            style={{ width: `${run.items.length ? (complete / run.items.length) * 100 : 0}%` }}
          />
        </div>
      </div>
      {error && (
        <p className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      {savedMessage && (
        <div
          role="status"
          className="mt-5 flex items-center gap-3 rounded-xl bg-[#dff4e8] p-4 text-sm font-bold text-[#185c3d]"
        >
          <CheckCircle2 className="shrink-0" size={21} />
          {savedMessage}
        </div>
      )}
      <section className="mt-6 space-y-4">
        {run.items.map((item, index) => (
          <article key={item.id} className="rounded-2xl border bg-white p-5">
            <div className="flex items-start gap-3">
              <button
                aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
                disabled={busyId === item.id}
                onClick={() => void saveItem(item, !item.completed)}
                className={`mt-0.5 shrink-0 ${item.completed ? "text-[#2a7a58]" : "text-muted-foreground"}`}
              >
                {item.completed ? <CheckCircle2 size={27} /> : <Circle size={27} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold">
                  {index + 1}. {item.title}
                </p>
                {item.instructions && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.instructions}</p>
                )}
                <label className="mt-4 block text-sm font-semibold">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  <textarea
                    defaultValue={item.notes ?? ""}
                    onBlur={(event) => {
                      if (event.target.value !== (item.notes ?? ""))
                        void saveItem(item, item.completed, event.target.value);
                    }}
                    className="mt-2 min-h-20 w-full rounded-xl border p-3 text-sm"
                    placeholder="Add an issue or note"
                  />
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#e24a32] px-4 py-3 text-sm font-bold text-white">
                    <Camera size={17} />
                    {busyId === item.id
                      ? "Uploading…"
                      : item.photo_required
                        ? "Add required photo"
                        : "Add photo"}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void upload(item, file);
                      }}
                    />
                  </label>
                  {item.photo_required && (
                    <span className="text-xs font-bold text-[#a83225]">Photo required</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {item.travel_path_photos.length} photo
                    {item.travel_path_photos.length === 1 ? "" : "s"} saved
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="font-display text-lg font-bold">Finish station check</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Required photos must be added before you submit.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            disabled={submitting}
            onClick={() => void submit("ready_for_review")}
            aria-pressed={run.status === "ready_for_review"}
            className={`rounded-xl bg-[#173327] px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${run.status === "ready_for_review" ? "ring-4 ring-[#173327]/25 ring-offset-2" : ""}`}
          >
            {submitting ? "Updating…" : "Ready for review"}
          </button>
          <button
            disabled={submitting}
            onClick={() => void submit("operational")}
            aria-pressed={run.status === "operational"}
            className={`rounded-xl bg-[#2a7a58] px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${run.status === "operational" ? "ring-4 ring-[#2a7a58]/25 ring-offset-2" : ""}`}
          >
            {submitting ? "Updating…" : "Mark operational"}
          </button>
          <button
            disabled={submitting}
            onClick={() => void submit("needs_attention")}
            aria-pressed={run.status === "needs_attention"}
            className={`rounded-xl bg-[#e24a32] px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${run.status === "needs_attention" ? "ring-4 ring-[#e24a32]/25 ring-offset-2" : ""}`}
          >
            {submitting ? "Updating…" : "Needs attention"}
          </button>
        </div>
      </section>
    </main>
  );
}
