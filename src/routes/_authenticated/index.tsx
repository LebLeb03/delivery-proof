import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { DeliveryCard, EmptyDeliveries } from "@/components/delivery-card";
import { useAppContext } from "@/lib/app-context";
import { searchDeliveries } from "@/lib/delivery.functions";
import type { DeliveryListItem } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

function HomePage() {
  const context = useAppContext();
  const navigate = useNavigate();
  const [items, setItems] = useState<DeliveryListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const store =
    context.stores.find((item) => item.id === context.profile.default_store_id) ??
    context.stores[0];
  useEffect(() => {
    searchDeliveries({ data: { query: "", limit: 8, ...(store ? { storeId: store.id } : {}) } })
      .then(setItems)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load deliveries"),
      )
      .finally(() => setLoading(false));
  }, [store?.id]);
  function submit(event: FormEvent) {
    event.preventDefault();
    void navigate({ to: "/search", search: { q: query } });
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-7">
      <section className="rounded-3xl bg-[#e24a32] p-6 text-white shadow-lg shadow-[#e24a32]/15 md:flex md:items-center md:justify-between md:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-white/70">
            Photo proof in under a minute
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">
            Log a delivery while it’s fresh.
          </h1>
          <p className="mt-2 text-white/75">
            {context.organization?.name} · {store ? `Store ${store.store_number}` : "Your stores"}
          </p>
        </div>
        <Link
          to="/add"
          className="mt-6 flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 font-bold text-[#9f2d21] md:mt-0"
        >
          <Camera size={21} />
          Add delivery
        </Link>
      </section>
      <form onSubmit={submit} className="mt-7 rounded-2xl border bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={21}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search full, partial or last four digits"
            className="h-13 w-full rounded-xl border bg-white pl-12 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
      </form>
      <div className="mt-8 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.15em] text-muted-foreground">
            At a glance
          </p>
          <h2 className="font-display text-2xl font-bold">Recent deliveries</h2>
        </div>
        <Link to="/search" search={{ q: "" }} className="text-sm font-bold text-[#a83225]">
          View all
        </Link>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <p className="py-12 text-center text-muted-foreground">Loading recent deliveries…</p>
        ) : items.length ? (
          items.map((item) => <DeliveryCard key={item.id} delivery={item} />)
        ) : (
          <EmptyDeliveries />
        )}
      </div>
    </main>
  );
}
