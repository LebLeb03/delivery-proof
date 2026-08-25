import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ImagePlus,
  LogOut,
  PackageCheck,
  Search,
  Store,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import {
  formatDateTime,
  normalizeOrderNumber,
  statusLabel,
  STATUS_OPTIONS,
} from "@/lib/delivery-utils";
import type { DeliveryStatus, ProfileInfo, StoreInfo, VendorInfo } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

type Delivery = {
  id: string;
  order_number: string;
  delivered_at: string;
  status: string;
  notes: string | null;
  store_id: string;
  vendor_id: string | null;
  uploaded_by: string | null;
  stores: { store_number: string; store_name: string | null } | null;
  vendors: { vendor_name: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
  delivery_photos: { id: string; storage_path: string }[];
};

const inputClass =
  "h-12 w-full rounded-xl border border-input bg-white px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [screen, setScreen] = useState<"home" | "add" | "detail">("home");
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadWorkspace(user.id);
    else {
      setProfile(null);
      setDeliveries([]);
    }
  }, [user]);

  async function loadWorkspace(userId: string) {
    setLoading(true);
    setMessage(null);
    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (profileResult.error) {
      setMessage(profileResult.error.message);
      setLoading(false);
      return;
    }
    const nextProfile = profileResult.data as ProfileInfo | null;
    setProfile(nextProfile);
    if (!nextProfile?.organization_id) {
      setLoading(false);
      return;
    }
    const [storeResult, vendorResult] = await Promise.all([
      supabase.from("user_stores").select("stores(*)").eq("user_id", userId),
      supabase
        .from("vendors")
        .select("*")
        .eq("organization_id", nextProfile.organization_id)
        .eq("active", true)
        .order("vendor_name"),
    ]);
    const assignedStores = (storeResult.data ?? []).flatMap((row) =>
      row.stores ? [row.stores] : [],
    ) as StoreInfo[];
    setStores(assignedStores);
    setVendors((vendorResult.data ?? []) as VendorInfo[]);
    await loadDeliveries(assignedStores.map((store) => store.id));
    setLoading(false);
  }

  async function loadDeliveries(storeIds = stores.map((store) => store.id)) {
    if (!storeIds.length) {
      setDeliveries([]);
      return;
    }
    const result = await supabase
      .from("deliveries")
      .select(
        "id, order_number, delivered_at, status, notes, store_id, vendor_id, uploaded_by, stores(store_number, store_name), vendors(vendor_name), profiles(full_name, email), delivery_photos(id, storage_path)",
      )
      .in("store_id", storeIds)
      .order("delivered_at", { ascending: false })
      .limit(100);
    if (result.error) setMessage(result.error.message);
    else setDeliveries((result.data ?? []) as unknown as Delivery[]);
  }

  const filtered = useMemo(
    () =>
      deliveries.filter((delivery) => {
        const normalized = normalizeOrderNumber(query);
        return (
          (!normalized || normalizeOrderNumber(delivery.order_number).includes(normalized)) &&
          (statusFilter === "all" || delivery.status === statusFilter) &&
          (storeFilter === "all" || delivery.store_id === storeFilter)
        );
      }),
    [deliveries, query, statusFilter, storeFilter],
  );

  if (!authReady) return <Splash />;
  if (!user) return <Login onMessage={setMessage} message={message} />;
  if (!profile?.organization_id || stores.length === 0)
    return <NeedsSetup user={user} onSignOut={() => supabase.auth.signOut()} />;

  if (screen === "add")
    return (
      <AddDelivery
        user={user}
        profile={profile}
        stores={stores}
        vendors={vendors}
        onCancel={() => setScreen("home")}
        onSaved={async () => {
          await loadDeliveries();
          setScreen("home");
        }}
      />
    );
  if (screen === "detail" && selected)
    return <Detail delivery={selected} onBack={() => setScreen("home")} />;

  const defaultStore = stores.find((store) => store.id === profile.default_store_id) ?? stores[0];
  return (
    <main className="min-h-screen bg-[#f7f5f1] pb-28">
      <header className="border-b border-black/5 bg-[#16251f] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e24a32]">
              <PackageCheck />
            </span>
            <div>
              <p className="font-display text-xl font-bold">Delivery Proof</p>
              <p className="text-sm text-white/65">
                {defaultStore.store_name || `Store ${defaultStore.store_number}`}
              </p>
            </div>
          </div>
          <button
            aria-label="Sign out"
            onClick={() => supabase.auth.signOut()}
            className="rounded-xl p-3 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-7">
        <div className="rounded-3xl bg-[#e24a32] p-6 text-white shadow-lg shadow-[#e24a32]/15 md:flex md:items-center md:justify-between md:p-8">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[.18em] text-white/70">
              Photo proof in under a minute
            </p>
            <h1 className="font-display text-3xl font-extrabold md:text-4xl">
              Log a delivery while it’s fresh.
            </h1>
          </div>
          <button
            onClick={() => setScreen("add")}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 font-bold text-[#9f2d21] shadow-sm md:mt-0 md:w-auto"
          >
            <Camera size={22} /> Add delivery
          </button>
        </div>

        <div className="mt-7 rounded-2xl border bg-white p-4 shadow-sm">
          <label className="relative block">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={21}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any order number"
              className={`${inputClass} pl-12 pr-11`}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2"
              >
                <X size={18} />
              </button>
            )}
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option value={s.value} key={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="all">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  Store {s.store_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.16em] text-muted-foreground">
              Records
            </p>
            <h2 className="font-display text-2xl font-bold">
              {query ? "Search results" : "Recent deliveries"}
            </h2>
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} found</span>
        </div>
        {message && (
          <p className="mt-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {message}
          </p>
        )}
        <div className="mt-4 grid gap-3">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">Loading deliveries…</p>
          ) : (
            filtered.map((delivery) => (
              <button
                key={delivery.id}
                onClick={() => {
                  setSelected(delivery);
                  setScreen("detail");
                }}
                className="w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-bold">Order #{delivery.order_number}</p>
                    <p className="mt-1 font-semibold text-[#9f2d21]">
                      {delivery.vendors?.vendor_name ?? "Unknown vendor"}
                    </p>
                  </div>
                  <StatusPill status={delivery.status} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-2">
                    <Store size={16} /> Store {delivery.stores?.store_number}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock3 size={16} /> {formatDateTime(delivery.delivered_at)}
                  </span>
                  <span className="flex items-center gap-2">
                    <ImagePlus size={16} /> {delivery.delivery_photos.length} photo
                    {delivery.delivery_photos.length === 1 ? "" : "s"}
                  </span>
                </div>
              </button>
            ))
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-white py-14 text-center">
              <Search className="mx-auto text-muted-foreground" />
              <p className="mt-3 font-semibold">No matching deliveries</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another order number or filter.
              </p>
            </div>
          )}
        </div>
      </section>
      <button
        onClick={() => setScreen("add")}
        className="fixed bottom-5 left-1/2 flex h-16 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-[#e24a32] font-bold text-white shadow-xl md:hidden"
      >
        <Camera /> Add delivery
      </button>
    </main>
  );
}

function Login({
  onMessage,
  message,
}: {
  onMessage: (value: string | null) => void;
  message: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    onMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) onMessage(error.message);
    setBusy(false);
  }
  return (
    <main className="grid min-h-screen bg-[#f7f5f1] md:grid-cols-2">
      <section className="hidden bg-[#16251f] p-12 text-white md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-3 font-display text-xl font-bold">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e24a32]">
            <PackageCheck />
          </span>
          Delivery Proof
        </div>
        <div>
          <p className="max-w-xl font-display text-5xl font-extrabold leading-[1.05]">
            Every delivery.
            <br />
            Photographed, logged,
            <br />
            <span className="text-[#ff806c]">easy to find.</span>
          </p>
          <p className="mt-6 max-w-md text-lg text-white/65">
            Fast photo proof for busy restaurant teams.
          </p>
        </div>
        <p className="text-sm text-white/40">Secure records for every store.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-xl shadow-black/5 md:p-10"
        >
          <div className="mb-8 md:hidden">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e24a32] text-white">
              <PackageCheck />
            </span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#9f2d21]">
            Team sign in
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Use your restaurant account to continue.</p>
          <label className="mt-7 block text-sm font-semibold">
            Email
            <input
              className={`${inputClass} mt-2`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Password
            <input
              className={`${inputClass} mt-2`}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {message && (
            <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {message}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-6 h-13 w-full rounded-xl bg-[#e24a32] font-bold text-white disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function AddDelivery({
  user,
  profile,
  stores,
  vendors,
  onCancel,
  onSaved,
}: {
  user: User;
  profile: ProfileInfo;
  stores: StoreInfo[];
  vendors: VendorInfo[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [order, setOrder] = useState("");
  const [vendor, setVendor] = useState("");
  const [store, setStore] = useState(profile.default_store_id ?? stores[0].id);
  const [status, setStatus] = useState<DeliveryStatus>("received");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!files.length) {
      setError("Add at least one delivery photo.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: delivery, error: insertError } = await supabase
      .from("deliveries")
      .insert({
        organization_id: profile.organization_id!,
        store_id: store,
        vendor_id: vendor || null,
        order_number: order.trim(),
        delivered_at: new Date().toISOString(),
        status,
        notes: notes.trim() || null,
        uploaded_by: user.id,
      })
      .select("id")
      .single();
    if (insertError || !delivery) {
      setError(insertError?.message ?? "Could not save delivery");
      setBusy(false);
      return;
    }
    for (const [index, file] of files.entries()) {
      try {
        const image = await compressImage(file);
        const path = `${store}/${delivery.id}/${Date.now()}-${index}.jpg`;
        const upload = await supabase.storage
          .from("delivery-photos")
          .upload(path, image, { contentType: "image/jpeg" });
        if (upload.error) throw upload.error;
        const record = await supabase.from("delivery_photos").insert({
          delivery_id: delivery.id,
          storage_path: path,
          original_filename: file.name,
          uploaded_by: user.id,
        });
        if (record.error) throw record.error;
      } catch (uploadError: unknown) {
        const reason = uploadError instanceof Error ? uploadError.message : "Unknown upload error";
        setError(`Delivery saved, but a photo failed: ${reason}`);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onSaved();
  }
  return (
    <main className="min-h-screen bg-[#f7f5f1]">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button onClick={onCancel} className="rounded-xl p-2 hover:bg-muted">
            <ChevronLeft />
          </button>
          <div>
            <p className="font-display text-xl font-bold">Add delivery</p>
            <p className="text-sm text-muted-foreground">Photos, order and vendor</p>
          </div>
        </div>
      </header>
      <form onSubmit={save} className="mx-auto max-w-2xl space-y-6 px-5 py-6 pb-28">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-bold">Delivery photos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture labels, condition and quantity clearly.
          </p>
          <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e24a32]/35 bg-[#e24a32]/5 text-center">
            <Camera className="text-[#e24a32]" />
            <span className="mt-2 font-bold">Take or upload photos</span>
            <span className="mt-1 text-xs text-muted-foreground">Multiple photos supported</span>
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    className="h-full w-full object-cover"
                    alt={`Delivery preview ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-bold">Delivery details</h2>
          <label className="mt-5 block text-sm font-semibold">
            Order number
            <input
              required
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className={`${inputClass} mt-2`}
              placeholder="e.g. MB-00981"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Vendor
            <select
              required
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className={`${inputClass} mt-2`}
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendor_name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Store
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className={`${inputClass} mt-2`}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  Store {s.store_number}
                  {s.store_name ? ` — ${s.store_name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
              className={`${inputClass} mt-2`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Notes <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border bg-white p-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              placeholder="Damage, shortages or other details"
            />
          </label>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 size={16} /> Date and exact time will be recorded automatically.
          </p>
        </section>
        {error && (
          <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
        )}
        <button
          disabled={busy}
          className="h-14 w-full rounded-2xl bg-[#e24a32] font-bold text-white shadow-lg disabled:opacity-60"
        >
          {busy ? "Saving delivery…" : "Save delivery"}
        </button>
      </form>
    </main>
  );
}

function Detail({ delivery, onBack }: { delivery: Delivery; onBack: () => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    Promise.all(
      delivery.delivery_photos.map(
        async (p) =>
          (await supabase.storage.from("delivery-photos").createSignedUrl(p.storage_path, 3600))
            .data?.signedUrl,
      ),
    ).then((items) => setUrls(items.filter(Boolean) as string[]));
  }, [delivery]);
  return (
    <main className="min-h-screen bg-[#f7f5f1]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <button onClick={onBack} className="rounded-xl p-2 hover:bg-muted">
            <ChevronLeft />
          </button>
          <p className="font-display text-xl font-bold">Delivery record</p>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-5 py-7">
        <div className="rounded-3xl bg-[#16251f] p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[.16em] text-white/55">Order number</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold">
                #{delivery.order_number}
              </h1>
            </div>
            <StatusPill status={delivery.status} />
          </div>
          <p className="mt-6 text-xl font-bold text-[#ff806c]">
            {delivery.vendors?.vendor_name ?? "Unknown vendor"}
          </p>
          <p className="mt-2 text-white/70">
            Store {delivery.stores?.store_number} • {formatDateTime(delivery.delivered_at)}
          </p>
        </div>
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-bold">Photo proof</h2>
          {urls.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {urls.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={url}
                    className="h-full w-full object-cover"
                    alt={`Delivery photo ${i + 1}`}
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No photos attached to this record.</p>
          )}
        </div>
        {delivery.notes && (
          <div className="mt-4 rounded-2xl border bg-white p-5">
            <h2 className="font-display text-lg font-bold">Notes</h2>
            <p className="mt-2 text-muted-foreground">{delivery.notes}</p>
          </div>
        )}
        <div className="mt-4 rounded-2xl border bg-white p-5 text-sm text-muted-foreground">
          <p>
            Uploaded by{" "}
            {delivery.profiles?.full_name || delivery.profiles?.email || "Unknown team member"}
          </p>
          <p className="mt-1">Record ID: {delivery.id}</p>
        </div>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const issue = status !== "received";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${issue ? "bg-[#fff0cd] text-[#795000]" : "bg-[#daf6e5] text-[#17613a]"}`}
    >
      <CheckCircle2 size={13} />
      {statusLabel(status)}
    </span>
  );
}
function Splash() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#16251f] text-white">
      <div className="text-center">
        <PackageCheck className="mx-auto text-[#ff806c]" size={48} />
        <p className="mt-4 font-display text-2xl font-bold">Delivery Proof</p>
      </div>
    </main>
  );
}
function NeedsSetup({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5f1] p-6">
      <div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-xl">
        <Store className="mx-auto text-[#e24a32]" size={42} />
        <h1 className="mt-4 font-display text-2xl font-bold">Your account needs a store</h1>
        <p className="mt-3 text-muted-foreground">
          Ask your market administrator to assign {user.email} to an organization and store, then
          sign in again.
        </p>
        <button
          onClick={onSignOut}
          className="mt-6 h-12 w-full rounded-xl bg-[#16251f] font-bold text-white"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
