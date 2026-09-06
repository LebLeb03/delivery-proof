import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Home, MapPinOff, RefreshCw } from "lucide-react";

function ScreenFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-[#f6f4ef] px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border bg-white p-6 text-center shadow-sm sm:p-8">
        {children}
      </section>
    </main>
  );
}

function HomeButton() {
  return (
    <Link
      to="/"
      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#16251f] px-4 font-bold text-white"
    >
      <Home size={18} /> Home
    </Link>
  );
}

export function NotFoundScreen() {
  return (
    <ScreenFrame>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fff0ec] text-[#e24a32]">
        <MapPinOff size={32} />
      </span>
      <p className="mt-6 text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">404</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">That page is not here</h1>
      <p className="mt-3 text-muted-foreground">
        The link may be incorrect, expired, or opened by mistake.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 font-bold text-[#16251f]"
        >
          <ArrowLeft size={18} /> Go back
        </button>
        <HomeButton />
      </div>
    </ScreenFrame>
  );
}

export function RouteErrorScreen({ reset }: ErrorComponentProps) {
  return (
    <ScreenFrame>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fff0ec] text-[#e24a32]">
        <AlertTriangle size={32} />
      </span>
      <p className="mt-6 text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">
        Something went wrong
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">This page did not load</h1>
      <p className="mt-3 text-muted-foreground">
        Your information is still safe. Try loading the page again or return home.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 font-bold text-[#16251f]"
        >
          <RefreshCw size={18} /> Try again
        </button>
        <HomeButton />
      </div>
    </ScreenFrame>
  );
}
