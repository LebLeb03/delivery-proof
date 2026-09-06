import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, ClipboardCheck, Search, Truck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { DeliveryCard, EmptyDeliveries } from "@/components/delivery-card";
import { getVendors } from "@/lib/admin.functions";
import { useAppContext } from "@/lib/app-context";
import { searchDeliveries } from "@/lib/delivery.functions";
import type { DeliveryListItem, VendorInfo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

function HomePage() {
  const context = useAppContext();
  const navigate = useNavigate();
  const [items, setItems] = useState<DeliveryListItem[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
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
  useEffect(() => {
    getVendors()
      .then((items) => setVendors(items.filter((item) => item.active)))
      .catch(() => {});
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    void navigate({ to: "/search", search: { q: query } });
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-7">
      <section className="rounded-3xl bg-[#e24a32] p-6 text-white shadow-lg shadow-[#e24a32]/15 md:p-8">
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
      </section>
      <section className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">
              New delivery
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">
              Tap a partner. Take a photo.
            </h2>
          </div>
          <Camera className="mb-1 shrink-0 text-[#e24a32]" size={26} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {vendors.slice(0, 3).map((vendor, index) => (
            <Link
              key={vendor.id}
              to="/add"
              search={{ vendor: vendor.id }}
              className={`group min-h-40 rounded-3xl p-5 text-white shadow-sm transition active:scale-[.98] ${index === 0 ? "bg-[#171717]" : index === 1 ? "bg-[#f58228]" : "bg-[#dc3826]"}`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-xl font-extrabold">
                {vendor.vendor_name.charAt(0)}
              </span>
              <p className="mt-7 text-xl font-extrabold">{vendor.vendor_name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-white/80">
                <Camera size={16} /> Open camera
              </p>
            </Link>
          ))}
          <Link
            to="/travel-paths"
            className="group min-h-40 rounded-3xl bg-[#173327] p-5 text-white shadow-sm transition active:scale-[.98]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <ClipboardCheck size={25} />
            </span>
            <p className="mt-7 text-xl font-extrabold">Travel Paths</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-white/80">
              <Truck size={16} /> Station readiness
            </p>
          </Link>
        </div>
        <p className="mt-3 rounded-2xl bg-[#e9efea] px-4 py-3 text-sm text-[#425248]">
          Choose a partner or open a station checklist. No extra steps.
        </p>
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
