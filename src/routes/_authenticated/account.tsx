import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Save, Settings, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { updateMyProfile } from "@/lib/admin.functions";
import { useAppContext } from "@/lib/app-context";

export const Route = createFileRoute("/_authenticated/account")({ component: AccountPage });

function AccountPage() {
  const context = useAppContext();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isManager = context.roles.some((role) => role !== "crew");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await updateMyProfile({
        data: {
          fullName: String(form.get("fullName")),
          defaultStoreId: String(form.get("defaultStoreId")) || null,
        },
      });
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save profile");
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-5 py-7">
      <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">Preferences</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Account</h1>
      <section className="mt-6 rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#16251f] text-white">
            <ShieldCheck />
          </span>
          <div>
            <p className="font-bold">{context.profile.full_name || context.profile.email}</p>
            <p className="text-sm capitalize text-muted-foreground">
              {context.roles.map((role) => role.replace("_", " ")).join(", ")}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-6">
          <label className="block text-sm font-semibold">
            Display name
            <input
              name="fullName"
              required
              defaultValue={context.profile.full_name ?? ""}
              className="mt-2 h-12 w-full rounded-xl border px-4"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Default store
            <select
              name="defaultStoreId"
              defaultValue={context.profile.default_store_id ?? ""}
              className="mt-2 h-12 w-full rounded-xl border bg-white px-4"
            >
              {context.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  Store {store.store_number}
                  {store.store_name ? ` — ${store.store_name}` : ""}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p className="mt-4 rounded-xl bg-success/10 p-3 text-sm text-success">
              Account preferences saved.
            </p>
          )}
          <button className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-[#e24a32] px-5 font-bold text-white">
            <Save size={17} />
            Save preferences
          </button>
        </form>
      </section>
      <section className="mt-5 rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-3">
          <Building2 className="text-[#a83225]" />
          <div>
            <p className="font-bold">{context.organization?.name}</p>
            <p className="text-sm text-muted-foreground">
              {context.stores.length} assigned store{context.stores.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {isManager && (
          <Link
            to="/admin"
            className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl border font-bold text-[#16251f]"
          >
            <Settings size={18} />
            Open store administration
          </Link>
        )}
      </section>
    </main>
  );
}
