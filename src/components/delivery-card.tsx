import { Link } from "@tanstack/react-router";
import { Camera, Clock3, Store } from "lucide-react";
import { formatDateTime, statusLabel } from "@/lib/delivery-utils";
import type { DeliveryListItem } from "@/lib/types";

export function DeliveryCard({ delivery }: { delivery: DeliveryListItem }) {
  const issue = delivery.status !== "received";
  return (
    <Link
      to="/deliveries/$deliveryId"
      params={{ deliveryId: delivery.id }}
      className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold">Order #{delivery.order_number}</p>
          <p className="mt-1 font-semibold text-[#a83225]">
            {delivery.vendor?.vendor_name ?? "Unknown vendor"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${issue ? "bg-[#fff0cd] text-[#795000]" : "bg-[#daf6e5] text-[#17613a]"}`}
        >
          {statusLabel(delivery.status)}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        <span className="flex items-center gap-2">
          <Store size={15} />
          Store {delivery.store?.store_number}
        </span>
        <span className="flex items-center gap-2">
          <Clock3 size={15} />
          {formatDateTime(delivery.delivered_at)}
        </span>
        <span className="flex items-center gap-2">
          <Camera size={15} />
          {delivery.photo_count} photo{delivery.photo_count === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Uploaded by {delivery.uploader?.full_name || delivery.uploader?.email || "Team member"}
      </p>
    </Link>
  );
}

export function EmptyDeliveries({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white py-14 text-center">
      <Camera className="mx-auto text-muted-foreground" />
      <p className="mt-3 font-semibold">
        {filtered ? "No matching deliveries" : "No deliveries yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered
          ? "Try a different order number or filter."
          : "Add the first delivery to start your record."}
      </p>
    </div>
  );
}
