import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppContext } from "@/lib/app-context";
import {
  deleteTravelPathRun,
  getTravelPathRuns,
  getTravelPathTemplates,
  startTravelPathRun,
  type TravelTemplate,
} from "@/lib/travel-path.functions";

export const Route = createFileRoute("/_authenticated/travel-paths/")({
  component: TravelPathsPage,
});

type Run = {
  id: string;
  template_name: string;
  status: string;
  created_at: string;
  total: number;
  complete: number;
  store: { store_number: string; store_name: string | null } | null;
};

function TravelPathsPage() {
  const context = useAppContext();
  const navigate = useNavigate();
  const isAdmin = context.roles.some(
    (role) => role === "company_admin" || role === "consultant" || role === "market_admin",
  );
  const store =
    context.stores.find((item) => item.id === context.profile.default_store_id) ??
    context.stores[0];
  const [templates, setTemplates] = useState<TravelTemplate[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  async function load() {
    try {
      const [nextTemplates, nextRuns] = await Promise.all([
        getTravelPathTemplates(),
        getTravelPathRuns({ data: { storeId: store?.id, query } }),
      ]);
      setTemplates(nextTemplates.filter((template) => template.active));
      setRuns(nextRuns);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load Travel Paths");
    }
  }
  useEffect(() => {
    void load();
  }, [store?.id]);
  async function start(template: TravelTemplate) {
    if (!store || !context.profile.organization_id) return;
    setStarting(template.id);
    try {
      const run = await startTravelPathRun({
        data: {
          templateId: template.id,
          storeId: store.id,
          organizationId: context.profile.organization_id,
        },
      });
      await navigate({ to: "/travel-paths/$runId", params: { runId: run.id } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start the checklist");
    } finally {
      setStarting(null);
    }
  }
  async function remove(run: Run) {
    if (run.status !== "in_progress") return;
    if (!window.confirm(`Delete the unsubmitted ${run.template_name} checklist?`)) return;
    setDeleting(run.id);
    setError(null);
    try {
      await deleteTravelPathRun({ data: { runId: run.id } });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the checklist");
    } finally {
      setDeleting(null);
    }
  }
  return (
    <main className="mx-auto max-w-5xl px-5 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">
            Station readiness
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Travel Paths</h1>
          <p className="mt-2 text-muted-foreground">
            Complete each station check with photo evidence.
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/travel-paths/manage"
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#16251f] px-4 text-sm font-bold text-white"
          >
            <Plus size={17} /> Build checklist
          </Link>
        )}
      </div>
      {error && (
        <p className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      <section className="mt-7">
        <h2 className="font-display text-xl font-bold">Start a station check</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {templates.length ? (
            templates.map((template) => (
              <button
                key={template.id}
                disabled={starting !== null}
                onClick={() => void start(template)}
                className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-[#e24a32]/50 disabled:opacity-60"
              >
                <ClipboardCheck className="text-[#e24a32]" size={26} />
                <p className="mt-4 font-display text-lg font-bold">{template.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {template.items.length} steps ·{" "}
                  {template.items.filter((item) => item.photo_required).length} photos required
                </p>
                <span className="mt-5 inline-block text-sm font-bold text-[#a83225]">
                  {starting === template.id ? "Opening…" : "Start checklist"}
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-muted-foreground">
              No checklist is available yet. Ask an administrator to create one.
            </div>
          )}
        </div>
      </section>
      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Saved checks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Find completed and in-progress station checks.
            </p>
          </div>
          <label className="relative w-48">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={17}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => void load()}
              placeholder="Search"
              className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3">
          {runs.map((run) => (
            <div key={run.id} className="flex items-center gap-2 rounded-2xl border bg-white p-2">
              <Link
                to="/travel-paths/$runId"
                params={{ runId: run.id }}
                className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-xl p-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{run.template_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Store {run.store?.store_number} ·{" "}
                    {new Date(run.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold capitalize">{run.status.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {run.complete}/{run.total} steps
                  </p>
                </div>
              </Link>
              {run.status === "in_progress" && (
                <button
                  type="button"
                  disabled={deleting !== null}
                  onClick={() => void remove(run)}
                  aria-label={`Delete ${run.template_name} checklist`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-40"
                >
                  <Trash2 size={19} />
                </button>
              )}
            </div>
          ))}
          {!runs.length && (
            <p className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground">
              No saved checks for this store yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
