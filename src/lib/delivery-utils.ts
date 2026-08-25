import type { DeliveryStatus, StoreInfo } from "./types";

export const STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "damaged", label: "Damaged" },
  { value: "missing_items", label: "Missing Items" },
  { value: "other_issue", label: "Other Issue" },
];

export function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "received":
      return "bg-success/10 text-success";
    case "damaged":
      return "bg-destructive/10 text-destructive";
    case "missing_items":
      return "bg-warning/20 text-warning-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

/** Normalize an order number for searching: lowercase, strip spaces/hyphens and any non-alphanumerics. */
export function normalizeOrderNumber(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Format a timestamp as an exact local date + time including seconds. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Format an ISO timestamp for a datetime-local input (local time, with seconds). */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function storeLabel(
  store: StoreInfo | { store_number: string; store_name: string | null } | null | undefined,
): string {
  if (!store) return "Unknown store";
  return store.store_name
    ? `Store ${store.store_number} — ${store.store_name}`
    : `Store ${store.store_number}`;
}

export function personLabel(
  person: { full_name: string | null; email: string | null } | null | undefined,
): string {
  if (!person) return "Unknown";
  return person.full_name || person.email || "Unknown";
}
