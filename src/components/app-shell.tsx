import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { ClipboardList, Home, LogOut, PlusCircle, Search, Settings, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppContextProvider } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";
import { getMyContext, onboardOrganization } from "@/lib/context.functions";
import type { MyContext } from "@/lib/types";

export function AuthenticatedShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [context, setContext] = useState<MyContext | null | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && !auth.user) void navigate({ to: "/auth", replace: true });
    if (auth.user)
      getMyContext()
        .then(setContext)
        .catch((reason: unknown) => setError(messageOf(reason)));
  }, [auth.loading, auth.user, navigate]);

  if (auth.loading || (auth.user && context === undefined))
    return <FullPageLoading label="Loading your stores…" />;
  if (!auth.user) return <FullPageLoading label="Opening sign in…" />;
  if (error) return <FullPageError message={error} />;
  if (context && !context.profile.organization_id)
    return <Onboarding onComplete={() => getMyContext().then(setContext)} />;
  if (!context) return <Onboarding onComplete={() => getMyContext().then(setContext)} />;

  const defaultStore =
    context.stores.find((store) => store.id === context.profile.default_store_id) ??
    context.stores[0];
  const isManager = context.roles.some(
    (role) => role === "market_admin" || role === "store_manager",
  );
  return (
    <AppContextProvider value={context}>
      <div className="min-h-screen bg-[#f6f4ef] pb-24">
        <header className="border-b border-white/10 bg-[#16251f] text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e24a32]">
                <ClipboardList size={22} />
              </span>
              <div>
                <p className="font-display font-bold">Delivery Proof</p>
                <p className="text-xs text-white/60">
                  {defaultStore
                    ? `Store ${defaultStore.store_number}${defaultStore.store_name ? ` — ${defaultStore.store_name}` : ""}`
                    : context.organization?.name}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              {isManager && (
                <Link
                  to="/admin"
                  aria-label="Administration"
                  className="rounded-xl p-3 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Settings size={19} />
                </Link>
              )}
              <button
                aria-label="Sign out"
                onClick={() => supabase.auth.signOut()}
                className="rounded-xl p-3 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut size={19} />
              </button>
            </div>
          </div>
        </header>
        <Outlet />
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur">
          <div className="mx-auto grid max-w-xl grid-cols-4 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
            <NavLink to="/" label="Home" icon={<Home />} />
            <NavLink to="/add" label="Add" icon={<PlusCircle />} />
            <NavLink to="/search" label="Search" icon={<Search />} />
            <NavLink to="/account" label="Account" icon={<UserRound />} />
          </div>
        </nav>
      </div>
    </AppContextProvider>
  );
}

function NavLink({
  to,
  label,
  icon,
}: {
  to: "/" | "/add" | "/search" | "/account";
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: "text-[#b53728]" }}
      inactiveProps={{ className: "text-muted-foreground" }}
      className="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold [&_svg]:h-5 [&_svg]:w-5"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await onboardOrganization({
        data: {
          organizationName: String(form.get("organization")),
          storeNumber: String(form.get("storeNumber")),
          storeName: String(form.get("storeName")),
          fullName: String(form.get("fullName")),
          includeSampleData: form.get("sample") === "on",
        },
      });
      onComplete();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f4ef] p-5">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border bg-white p-7 shadow-xl">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e24a32] text-white">
          <ClipboardList />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[.16em] text-[#a83225]">
          First-time setup
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">
          Create your restaurant workspace
        </h1>
        <p className="mt-2 text-muted-foreground">
          You’ll become the market administrator and can add stores, vendors and team access.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field name="fullName" label="Your name" required />
          <Field
            name="organization"
            label="Organization"
            placeholder="North Star Restaurants"
            required
          />
          <Field name="storeNumber" label="First store number" placeholder="5178" required />
          <Field name="storeName" label="Store name" placeholder="Downtown" />
        </div>
        <label className="mt-5 flex items-center gap-3 rounded-xl bg-muted/60 p-4 text-sm">
          <input type="checkbox" name="sample" defaultChecked className="h-4 w-4" />
          Add one sample delivery and a starter vendor list
        </label>
        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}
        <button
          disabled={busy}
          className="mt-6 h-13 w-full rounded-xl bg-[#e24a32] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Creating workspace…" : "Create workspace"}
        </button>
      </form>
    </main>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-xl border bg-white px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
export function FullPageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#16251f] text-white">
      <div className="text-center">
        <ClipboardList className="mx-auto animate-pulse text-[#ff806c]" size={44} />
        <p className="mt-4 font-semibold">{label}</p>
      </div>
    </main>
  );
}
export function FullPageError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f4ef] p-5">
      <div className="max-w-md rounded-2xl border bg-white p-6 text-center">
        <h1 className="font-display text-xl font-bold">This page didn’t load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button
          onClick={() => location.reload()}
          className="mt-5 rounded-xl bg-[#16251f] px-5 py-3 font-bold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
export function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "Something went wrong";
}
