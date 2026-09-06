import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAppContext } from "@/lib/app-context";
import { createTravelPathTemplate } from "@/lib/travel-path.functions";

export const Route = createFileRoute("/_authenticated/travel-paths/manage")({
  component: TravelPathManagerPage,
});
type DraftItem = { title: string; instructions: string; photoRequired: boolean };

function TravelPathManagerPage() {
  const context = useAppContext();
  const navigate = useNavigate();
  const isAdmin = context.roles.includes("market_admin");
  const [items, setItems] = useState<DraftItem[]>([
    { title: "", instructions: "", photoRequired: true },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isAdmin)
    return (
      <main className="mx-auto max-w-xl px-5 py-12 text-center">
        <ShieldAlert className="mx-auto text-destructive" size={40} />
        <h1 className="mt-4 font-display text-2xl font-bold">Administrator access required</h1>
        <p className="mt-2 text-muted-foreground">
          Only market administrators can build station checklists.
        </p>
        <Link
          to="/travel-paths"
          className="mt-5 inline-block rounded-xl bg-[#16251f] px-5 py-3 font-bold text-white"
        >
          Return to Travel Paths
        </Link>
      </main>
    );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context.profile.organization_id) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createTravelPathTemplate({
        data: {
          organizationId: context.profile.organization_id,
          name: String(form.get("name")),
          description: String(form.get("description") || ""),
          items: items.filter((item) => item.title.trim()),
        },
      });
      await navigate({ to: "/travel-paths" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the checklist");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-5 py-7">
      <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">
        Administrator tools
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Build a Travel Path</h1>
      <p className="mt-2 text-muted-foreground">
        Create the exact readiness checks and photo evidence your crew must complete.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <section className="rounded-2xl border bg-white p-5">
          <label className="text-sm font-semibold">
            Checklist name
            <input
              name="name"
              required
              placeholder="e.g. Delivery station opening check"
              className="mt-2 h-12 w-full rounded-xl border px-4"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Instructions for the crew{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              name="description"
              className="mt-2 min-h-24 w-full rounded-xl border p-4"
              placeholder="Explain when this checklist should be completed."
            />
          </label>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <div>
            <h2 className="font-display text-xl font-bold">Checklist sections</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each section can require photo proof.
            </p>
          </div>
          <div className="mt-5 space-y-4">
            {items.map((item, index) => (
              <div key={index} className="rounded-xl bg-muted/50 p-4">
                <div className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#173327] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <input
                      required
                      value={item.title}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, title: event.target.value } : entry,
                          ),
                        )
                      }
                      placeholder="What must be checked?"
                      className="h-11 w-full rounded-lg border bg-white px-3 font-semibold"
                    />
                    <textarea
                      value={item.instructions}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((entry, itemIndex) =>
                            itemIndex === index
                              ? { ...entry, instructions: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Instructions or standard to meet"
                      className="mt-2 min-h-20 w-full rounded-lg border bg-white p-3 text-sm"
                    />
                    <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={item.photoRequired}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry, itemIndex) =>
                              itemIndex === index
                                ? { ...entry, photoRequired: event.target.checked }
                                : entry,
                            ),
                          )
                        }
                      />{" "}
                      Photo proof is required
                    </label>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove section"
                      onClick={() =>
                        setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                { title: "", instructions: "", photoRequired: true },
              ])
            }
            className="mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold text-[#a83225]"
          >
            <Plus size={17} /> Add section
          </button>
        </section>
        {error && (
          <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
        )}
        <button
          disabled={busy}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#e24a32] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Saving checklist…" : "Save checklist"}
        </button>
      </form>
    </main>
  );
}
