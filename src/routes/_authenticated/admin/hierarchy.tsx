import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  ChevronRight,
  MapPinned,
  Plus,
  Save,
  ShieldAlert,
  Store,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { messageOf } from "@/components/app-shell";
import { useAppContext } from "@/lib/app-context";
import {
  createHierarchyStore,
  createMarket,
  createPatch,
  deletePatch,
  getCompanyHierarchy,
  updatePatch,
} from "@/lib/hierarchy.functions";
import type { MarketHierarchy } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/hierarchy")({
  component: OrganizationHierarchy,
});

function OrganizationHierarchy() {
  const context = useAppContext();
  const canView = context.roles.some((role) =>
    ["company_admin", "consultant", "operations_manager", "market_admin"].includes(role),
  );
  const [markets, setMarkets] = useState<MarketHierarchy[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedPatchId, setSelectedPatchId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(preferredMarketId?: string, preferredPatchId?: string) {
    const next = await getCompanyHierarchy();
    setMarkets(next);
    const market =
      next.find((item) => item.id === (preferredMarketId || selectedMarketId)) ?? next[0];
    setSelectedMarketId(market?.id ?? "");
    const patch =
      market?.patches.find((item) => item.id === (preferredPatchId || selectedPatchId)) ??
      market?.patches[0];
    setSelectedPatchId(patch?.id ?? "");
  }

  useEffect(() => {
    if (canView) load().catch((reason) => setError(messageOf(reason)));
  }, [canView]);

  const selectedMarket = markets.find((market) => market.id === selectedMarketId) ?? markets[0];
  const selectedPatch = selectedMarket?.patches.find((patch) => patch.id === selectedPatchId);
  const assignedStores = useMemo(
    () => selectedMarket?.patches.reduce((total, patch) => total + patch.stores.length, 0) ?? 0,
    [selectedMarket],
  );
  const plannedStores = useMemo(
    () => selectedMarket?.patches.reduce((total, patch) => total + patch.store_capacity, 0) ?? 0,
    [selectedMarket],
  );

  if (!canView)
    return (
      <main className="mx-auto max-w-xl px-5 py-12 text-center">
        <ShieldAlert className="mx-auto text-destructive" size={40} />
        <h1 className="mt-4 font-display text-2xl font-bold">Company access required</h1>
        <p className="mt-2 text-muted-foreground">
          Your account only has access to its assigned store.
        </p>
        <Link
          to="/"
          className="mt-5 inline-block rounded-xl bg-[#16251f] px-5 py-3 font-bold text-white"
        >
          Return home
        </Link>
      </main>
    );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  function addMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("marketName") ?? "").trim();
    if (!name) return;
    void run(async () => {
      const result = await createMarket({ data: { name } });
      await load(result.id);
      formElement.reset();
      setNotice(`${name} was added.`);
    });
  }

  function addPatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMarket?.can_edit) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("patchName") ?? "").trim();
    const storeCapacity = Number(form.get("capacity"));
    void run(async () => {
      await createPatch({ data: { marketId: selectedMarket.id, name, storeCapacity } });
      await load(selectedMarket.id);
      formElement.reset();
      setNotice(`${name} was added to ${selectedMarket.name}.`);
    });
  }

  function savePatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMarket?.can_edit || !selectedPatch) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("editPatchName") ?? "").trim();
    const storeCapacity = Number(form.get("editCapacity"));
    void run(async () => {
      await updatePatch({ data: { patchId: selectedPatch.id, name, storeCapacity } });
      await load(selectedMarket.id, selectedPatch.id);
      setNotice(`${name} was updated.`);
    });
  }

  function removePatch() {
    if (!selectedMarket?.can_edit || !selectedPatch) return;
    if (selectedPatch.stores.length > 0) {
      setError("Move or remove every store from this patch before deleting it.");
      return;
    }
    if (!window.confirm(`Delete ${selectedPatch.name}? This cannot be undone.`)) return;
    const patchName = selectedPatch.name;
    void run(async () => {
      await deletePatch({ data: { patchId: selectedPatch.id } });
      await load(selectedMarket.id);
      setNotice(`${patchName} was deleted.`);
    });
  }

  function addStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMarket?.can_edit || !selectedPatch || !context.organization) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const storeNumber = String(form.get("storeNumber") ?? "").trim();
    const storeName = String(form.get("storeName") ?? "").trim();
    if (selectedPatch.stores.length >= selectedPatch.store_capacity) {
      setError(`${selectedPatch.name} already contains its planned number of stores.`);
      return;
    }
    void run(async () => {
      await createHierarchyStore({
        data: {
          organizationId: context.organization!.id,
          patchId: selectedPatch.id,
          storeNumber,
          storeName,
        },
      });
      await load(selectedMarket.id, selectedPatch.id);
      formElement.reset();
      setNotice(`Store ${storeNumber} ${storeName} was added to ${selectedPatch.name}.`);
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">Organization</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">Company structure</h1>
        <p className="mt-2 text-muted-foreground">
          Consultants and operations managers can organize markets, patches and stores.
        </p>
      </div>

      <section className="mt-7 rounded-3xl bg-[#16251f] p-5 text-white sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e24a32]">
            <Building2 size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-white/60">Company</p>
            <h2 className="font-display text-xl font-bold">{context.organization?.name}</h2>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {markets.map((market) => (
            <button
              key={market.id}
              onClick={() => {
                setSelectedMarketId(market.id);
                setSelectedPatchId(market.patches[0]?.id ?? "");
              }}
              className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${market.id === selectedMarket?.id ? "bg-white text-[#16251f]" : "bg-white/10 text-white"}`}
            >
              <span className="block text-xs font-semibold opacity-60">Market</span>
              {market.name}
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <div
          role="status"
          className="mt-4 rounded-xl bg-[#dff4e8] px-4 py-3 text-sm font-bold text-[#185c3d]"
        >
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive"
        >
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">Market</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold">
                {selectedMarket?.name ?? "No market assigned"}
              </h2>
            </div>
            <p className="text-sm font-bold text-muted-foreground">
              {assignedStores} named · {plannedStores} planned
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {selectedMarket?.patches.map((patch) => (
              <button
                key={patch.id}
                onClick={() => setSelectedPatchId(patch.id)}
                className={`rounded-2xl border p-5 text-left transition ${patch.id === selectedPatch?.id ? "border-[#e24a32] bg-[#fff7f4] ring-2 ring-[#e24a32]/15" : "bg-white hover:border-[#e24a32]/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9efea] text-[#173327]">
                    <MapPinned size={21} />
                  </span>
                  <ChevronRight className="text-muted-foreground" size={20} />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{patch.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {patch.stores.length} of {patch.store_capacity} stores named
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[#e24a32]"
                    style={{
                      width: `${Math.min(100, (patch.stores.length / patch.store_capacity) * 100)}%`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
          {selectedPatch && (
            <section className="mt-6 rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[.12em] text-[#a83225]">
                    Selected patch
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold">{selectedPatch.name}</h3>
                </div>
                <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-bold">
                  {selectedPatch.stores.length}/{selectedPatch.store_capacity}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {selectedPatch.stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/60 p-3"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#173327]">
                      <Store size={18} />
                    </span>
                    <div>
                      <p className="font-bold">Store {store.store_number}</p>
                      <p className="text-sm text-muted-foreground">{store.store_name}</p>
                    </div>
                  </div>
                ))}
                {!selectedPatch.stores.length && (
                  <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    No stores named yet.
                  </p>
                )}
              </div>
            </section>
          )}
        </section>

        {selectedMarket?.can_edit ? (
          <aside className="space-y-4">
            <form onSubmit={addMarket} className="rounded-2xl border bg-white p-5">
              <h3 className="font-display text-lg font-bold">Add another market</h3>
              <input
                name="marketName"
                required
                placeholder="Market name"
                className="mt-4 h-11 w-full rounded-xl border px-3"
              />
              <button
                disabled={busy}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16251f] text-sm font-bold text-white disabled:opacity-50"
              >
                <Plus size={17} /> Add market
              </button>
            </form>
            <form onSubmit={addPatch} className="rounded-2xl border bg-white p-5">
              <h3 className="font-display text-lg font-bold">Add patch</h3>
              <input
                name="patchName"
                required
                placeholder="Patch name"
                className="mt-4 h-11 w-full rounded-xl border px-3"
              />
              <input
                name="capacity"
                required
                type="number"
                min="1"
                max="100"
                placeholder="Planned stores"
                className="mt-2 h-11 w-full rounded-xl border px-3"
              />
              <button
                disabled={busy}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16251f] text-sm font-bold text-white disabled:opacity-50"
              >
                <Plus size={17} /> Add patch
              </button>
            </form>
            {selectedPatch && (
              <>
                <form
                  key={selectedPatch.id}
                  onSubmit={savePatch}
                  className="rounded-2xl border bg-white p-5"
                >
                  <h3 className="font-display text-lg font-bold">Edit selected patch</h3>
                  <input
                    name="editPatchName"
                    required
                    defaultValue={selectedPatch.name}
                    className="mt-4 h-11 w-full rounded-xl border px-3"
                  />
                  <input
                    name="editCapacity"
                    required
                    type="number"
                    min={Math.max(1, selectedPatch.stores.length)}
                    max="100"
                    defaultValue={selectedPatch.store_capacity}
                    className="mt-2 h-11 w-full rounded-xl border px-3"
                  />
                  <button
                    disabled={busy}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold disabled:opacity-50"
                  >
                    <Save size={17} /> Save patch
                  </button>
                  <button
                    type="button"
                    disabled={busy || selectedPatch.stores.length > 0}
                    onClick={removePatch}
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 text-sm font-bold text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={17} /> Delete patch
                  </button>
                  {selectedPatch.stores.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      A patch can only be deleted after all its stores have been moved or removed.
                    </p>
                  )}
                </form>
                <form onSubmit={addStore} className="rounded-2xl border bg-white p-5">
                  <h3 className="font-display text-lg font-bold">Add a store</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Adding to {selectedPatch.name}
                  </p>
                  <input
                    name="storeNumber"
                    required
                    placeholder="Store number"
                    className="mt-4 h-11 w-full rounded-xl border px-3"
                  />
                  <input
                    name="storeName"
                    required
                    placeholder="Store name"
                    className="mt-2 h-11 w-full rounded-xl border px-3"
                  />
                  <button
                    disabled={busy || selectedPatch.stores.length >= selectedPatch.store_capacity}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e24a32] text-sm font-bold text-white disabled:opacity-40"
                  >
                    <Plus size={17} /> Add store
                  </button>
                </form>
              </>
            )}
          </aside>
        ) : (
          <aside className="rounded-2xl border bg-white p-5">
            <h3 className="font-display text-lg font-bold">Read-only structure</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Only consultants and operations managers assigned to this market can make changes.
            </p>
          </aside>
        )}
      </div>
    </main>
  );
}
