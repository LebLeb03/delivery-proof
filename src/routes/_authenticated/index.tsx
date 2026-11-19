import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Camera, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { DeliveryCard, EmptyDeliveries } from "@/components/delivery-card";
import { getVendors } from "@/lib/admin.functions";
import { useAppContext } from "@/lib/app-context";
import { searchDeliveries } from "@/lib/delivery.functions";
import type { DeliveryListItem, VendorInfo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

function vendorColor(vendorName: string) {
  const name = vendorName.toLowerCase();
  if (name === "doordash") return "bg-[#dc3826]";
  if (name === "skipthedishes") return "bg-[#f58228]";
  if (name === "uber") return "bg-[#171717]";
  return "bg-[#173327]";
}

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
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-7">
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Record a delivery
        </h1>
        <p className="mt-2 text-base text-muted-foreground">Choose the delivery partner.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vendors.slice(0, 3).map((vendor) => (
            <Link
              key={vendor.id}
              to="/add"
              search={{ vendor: vendor.id }}
              className={`group flex min-h-40 flex-col rounded-2xl p-4 text-white shadow-[0_8px_24px_rgba(20,30,25,.12)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e24a32]/30 active:scale-[.98] sm:min-h-44 sm:p-5 ${vendorColor(vendor.vendor_name)} ${vendors.slice(0, 3).length === 3 ? "last:col-span-2 sm:last:col-span-1" : ""}`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-xl font-extrabold">
                {vendor.vendor_name.charAt(0)}
              </span>
              <p className="mt-auto pt-7 text-lg font-extrabold sm:text-xl">{vendor.vendor_name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-white/80">
                <Camera size={16} /> Take photos <ArrowRight size={15} />
              </p>
            </Link>
          ))}
        </div>
        {!loading && vendors.length === 0 && (
          <p className="mt-4 rounded-xl bg-[#fff0cd] p-4 text-sm font-semibold text-[#684800]">
            No delivery partners are available. Ask an administrator to activate a partner.
          </p>
        )}
      </section>
      <form
        onSubmit={submit}
        className="mt-8 rounded-2xl bg-white p-3 shadow-[0_8px_24px_rgba(20,30,25,.08)]"
      >
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
      <div className="mt-9 flex items-end justify-between">
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
