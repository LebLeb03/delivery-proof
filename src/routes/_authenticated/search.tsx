import { createFileRoute } from "@tanstack/react-router";
import { Filter, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { getVendors } from "@/lib/admin.functions";
import { useAppContext } from "@/lib/app-context";
import { searchDeliveries } from "@/lib/delivery.functions";
import { STATUS_OPTIONS } from "@/lib/delivery-utils";
import type { DeliveryListItem, VendorInfo } from "@/lib/types";
import { DeliveryCard, EmptyDeliveries } from "@/components/delivery-card";

const schema = z.object({ q: z.string().catch("") });
export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: schema,
  component: SearchPage,
});

function SearchPage() {
  const context = useAppContext();
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.q);
  const [storeId, setStoreId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [items, setItems] = useState<DeliveryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getVendors().then(setVendors);
  }, []);
  async function run() {
    setLoading(true);
    setError(null);
    try {
      setItems(
        await searchDeliveries({
          data: {
            query,
            limit: 100,
            ...(storeId ? { storeId } : {}),
            ...(vendorId ? { vendorId } : {}),
            ...(status
              ? { status: status as "received" | "damaged" | "missing_items" | "other_issue" }
              : {}),
            ...(dateFrom ? { dateFrom } : {}),
            ...(dateTo ? { dateTo } : {}),
          },
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void run();
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    void run();
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-7">
      <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">
        Delivery archive
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Search records</h1>
      <form onSubmit={submit} className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Full, partial or last four digits"
            className="h-13 w-full rounded-xl border pl-12 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            className="h-11 rounded-xl border bg-white px-3"
          >
            <option value="">All vendors</option>
            {vendors.map((vendor) => (
              <option value={vendor.id} key={vendor.id}>
                {vendor.vendor_name}
              </option>
            ))}
          </select>
          <select
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            className="h-11 rounded-xl border bg-white px-3"
          >
            <option value="">All stores</option>
            {context.stores.map((store) => (
              <option value={store.id} key={store.id}>
                Store {store.store_number}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-xl border bg-white px-3"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-11 rounded-xl border bg-white px-3"
          />
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-11 rounded-xl border bg-white px-3"
          />
        </div>
        <button className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16251f] font-bold text-white sm:w-auto sm:px-7">
          <Filter size={17} />
          Apply filters
        </button>
      </form>
      <div className="mt-7 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.15em] text-muted-foreground">
            Newest first
          </p>
          <h2 className="font-display text-2xl font-bold">Results</h2>
        </div>
        <span className="text-sm text-muted-foreground">{items.length} found</span>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <p className="py-12 text-center text-muted-foreground">Searching deliveries…</p>
        ) : items.length ? (
          items.map((item) => <DeliveryCard key={item.id} delivery={item} />)
        ) : (
          <EmptyDeliveries filtered />
        )}
      </div>
    </main>
  );
}
