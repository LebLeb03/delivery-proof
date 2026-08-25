import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  useEffect(() => {
    if (auth.user) void navigate({ to: "/", replace: true });
  }, [auth.user, navigate]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (result.error) setError(result.error.message);
    else if (mode === "signup" && !result.data.session)
      setError("Check your email to confirm the account, then sign in.");
    setBusy(false);
  }
  return (
    <main className="grid min-h-screen bg-[#f6f4ef] lg:grid-cols-2">
      <section className="hidden bg-[#16251f] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 font-display text-xl font-bold">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e24a32]">
            <ClipboardList />
          </span>
          Delivery Proof
        </div>
        <div>
          <p className="font-display text-6xl font-extrabold leading-[1.03]">
            Every delivery.
            <br />
            Photographed.
            <br />
            <span className="text-[#ff806c]">Easy to find.</span>
          </p>
          <p className="mt-6 max-w-md text-lg text-white/65">
            Secure delivery records for every store in your organization.
          </p>
        </div>
        <p className="text-sm text-white/40">Built for fast-moving restaurant teams.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e24a32] text-white lg:hidden">
            <ClipboardList />
          </span>
          <p className="mt-7 text-sm font-bold uppercase tracking-[.16em] text-[#a83225]">
            {mode === "login" ? "Team sign in" : "Create account"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">
            {mode === "login" ? "Welcome back" : "Start your workspace"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "login"
              ? "Use your restaurant account to continue."
              : "The first account can create the organization."}
          </p>
          <label className="mt-7 block text-sm font-semibold">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          {error && (
            <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-6 h-13 w-full rounded-xl bg-[#e24a32] font-bold text-white disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="mt-4 w-full text-sm font-semibold text-[#8f2b20]"
          >
            {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
