import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, ShieldAlert, Store, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  createStore,
  createVendor,
  getAdministration,
  updateUserAccess,
  updateVendor,
} from "@/lib/admin.functions";
import { useAppContext } from "@/lib/app-context";
import type { AppRole, OrgUser, StoreInfo, VendorInfo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdministrationPage });
type AdminData = { stores: StoreInfo[]; vendors: VendorInfo[]; users: OrgUser[] };

function AdministrationPage() {
  const context = useAppContext();
  const isAdmin = context.roles.includes("market_admin");
  const isManager = isAdmin || context.roles.includes("store_manager");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    try {
      setData(await getAdministration());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load administration");
    }
  }
  useEffect(() => {
    if (isManager) void load();
  }, [isManager]);
  if (!isManager)
    return (
      <main className="mx-auto max-w-xl px-5 py-12 text-center">
        <ShieldAlert className="mx-auto text-destructive" size={40} />
        <h1 className="mt-4 font-display text-2xl font-bold">Manager access required</h1>
        <p className="mt-2 text-muted-foreground">Your account cannot manage stores or vendors.</p>
        <Link
          to="/"
          className="mt-5 inline-block rounded-xl bg-[#16251f] px-5 py-3 font-bold text-white"
        >
          Return home
        </Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl px-5 py-7">
      <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">
        Organization tools
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Store administration</h1>
      <p className="mt-2 text-muted-foreground">
        Manage vendors{isAdmin ? ", stores and team assignments" : " for your assigned stores"}.
      </p>
      {error && (
        <p className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      {!data ? (
        <p className="py-16 text-center text-muted-foreground">Loading administration…</p>
      ) : (
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <AdminSection icon={<Building2 />} title="Vendors">
            <SimpleCreateForm
              kind="vendor"
              onCreate={async (form) => {
                await createVendor({
                  data: {
                    organizationId: context.profile.organization_id!,
                    vendorName: String(form.get("name")),
                  },
                });
                await load();
              }}
            />
            {data.vendors.map((vendor) => (
              <form
                key={vendor.id}
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  await updateVendor({
                    data: {
                      vendorId: vendor.id,
                      vendorName: String(form.get("name")),
                      active: form.get("active") === "on",
                    },
                  });
                  await load();
                }}
                className="mt-3 flex items-center gap-2 rounded-xl border p-3"
              >
                <input
                  name="name"
                  defaultValue={vendor.vendor_name}
                  className="h-10 min-w-0 flex-1 rounded-lg border px-3"
                />
                <label className="flex items-center gap-2 text-xs">
                  <input name="active" type="checkbox" defaultChecked={vendor.active} />
                  Active
                </label>
                <button className="rounded-lg bg-[#16251f] px-3 py-2 text-xs font-bold text-white">
                  Save
                </button>
              </form>
            ))}
          </AdminSection>
          {isAdmin && (
            <AdminSection icon={<Store />} title="Stores">
              <SimpleCreateForm
                kind="store"
                onCreate={async (form) => {
                  await createStore({
                    data: {
                      organizationId: context.profile.organization_id!,
                      storeNumber: String(form.get("number")),
                      storeName: String(form.get("name")),
                    },
                  });
                  await load();
                }}
              />
              {data.stores.map((store) => (
                <div key={store.id} className="mt-3 rounded-xl border p-4">
                  <p className="font-bold">Store {store.store_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {store.store_name || "No store name"}
                  </p>
                </div>
              ))}
            </AdminSection>
          )}
          {isAdmin && (
            <div className="lg:col-span-2">
              <AdminSection icon={<Users />} title="Team access">
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {data.users.map((user) => (
                    <UserAccess key={user.id} user={user} stores={data.stores} onSave={load} />
                  ))}
                </div>
              </AdminSection>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function AdminSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[#16251f]">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
function SimpleCreateForm({
  kind,
  onCreate,
}: {
  kind: "vendor" | "store";
  onCreate: (form: FormData) => Promise<void>;
}) {
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onCreate(new FormData(event.currentTarget));
        event.currentTarget.reset();
      }}
      className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
    >
      {kind === "store" && (
        <input
          name="number"
          required
          placeholder="Store number"
          className="h-11 rounded-xl border px-3"
        />
      )}
      <input
        name="name"
        required
        placeholder={kind === "store" ? "Store name" : "Vendor name"}
        className="h-11 rounded-xl border px-3"
      />
      <button className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[#e24a32] px-4 text-sm font-bold text-white">
        <Plus size={16} />
        Add
      </button>
    </form>
  );
}
function UserAccess({
  user,
  stores,
  onSave,
}: {
  user: OrgUser;
  stores: StoreInfo[];
  onSave: () => Promise<void>;
}) {
  const [role, setRole] = useState<AppRole>(user.roles[0] ?? "crew");
  const [selected, setSelected] = useState(user.store_ids);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await updateUserAccess({ data: { userId: user.id, role, storeIds: selected } });
        await onSave();
      }}
      className="rounded-xl border p-4"
    >
      <p className="font-bold">{user.full_name || user.email}</p>
      <p className="text-xs text-muted-foreground">{user.email}</p>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value as AppRole)}
        className="mt-3 h-10 w-full rounded-lg border bg-white px-3 text-sm"
      >
        <option value="crew">Crew / Employee</option>
        <option value="store_manager">Store Manager</option>
        <option value="market_admin">Market Admin</option>
      </select>
      <div className="mt-3 flex flex-wrap gap-2">
        {stores.map((store) => (
          <label
            key={store.id}
            className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs"
          >
            <input
              type="checkbox"
              checked={selected.includes(store.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, store.id]
                    : current.filter((id) => id !== store.id),
                )
              }
            />
            Store {store.store_number}
          </label>
        ))}
      </div>
      <button
        disabled={!selected.length}
        className="mt-3 rounded-lg bg-[#16251f] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        Save access
      </button>
    </form>
  );
}
