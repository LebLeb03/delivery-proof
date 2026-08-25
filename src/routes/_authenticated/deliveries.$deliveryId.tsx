import { createFileRoute } from "@tanstack/react-router";
import { Camera, Download, Edit3, History, Save, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { getVendors } from "@/lib/admin.functions";
import { getDeliveryDetail, updateDelivery } from "@/lib/delivery.functions";
import {
  formatDateTime,
  statusLabel,
  STATUS_OPTIONS,
  toLocalInputValue,
} from "@/lib/delivery-utils";
import type { DeliveryDetail, DeliveryStatus, VendorInfo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/deliveries/$deliveryId")({
  component: DeliveryDetailPage,
});

function DeliveryDetailPage() {
  const { deliveryId } = Route.useParams();
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    try {
      setDelivery(await getDeliveryDetail({ data: { deliveryId } }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load delivery");
    }
  }
  useEffect(() => {
    void load();
    void getVendors().then(setVendors);
  }, [deliveryId]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!delivery) return;
    const form = new FormData(event.currentTarget);
    try {
      await updateDelivery({
        data: {
          deliveryId,
          orderNumber: String(form.get("orderNumber")),
          vendorId: String(form.get("vendorId")) || null,
          deliveredAt: new Date(String(form.get("deliveredAt"))).toISOString(),
          status: String(form.get("status")) as DeliveryStatus,
          notes: String(form.get("notes")) || null,
        },
      });
      setEditing(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update delivery");
    }
  }
  if (error && !delivery)
    return (
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="rounded-xl bg-destructive/10 p-5 text-destructive">{error}</p>
      </main>
    );
  if (!delivery)
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 text-center text-muted-foreground">
        Loading delivery record…
      </main>
    );
  return (
    <main className="mx-auto max-w-4xl px-5 py-7">
      <section className="rounded-3xl bg-[#16251f] p-6 text-white md:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.16em] text-white/55">
              Order number
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">#{delivery.order_number}</h1>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">
            {statusLabel(delivery.status)}
          </span>
        </div>
        <p className="mt-7 text-xl font-bold text-[#ff806c]">
          {delivery.vendor?.vendor_name ?? "Unknown vendor"}
        </p>
        <p className="mt-2 text-white/70">
          Store {delivery.store?.store_number} · {formatDateTime(delivery.delivered_at)}
        </p>
        {delivery.can_edit && (
          <button
            onClick={() => setEditing(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#16251f]"
          >
            <Edit3 size={16} />
            Correct details
          </button>
        )}
      </section>
      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      {editing && (
        <form onSubmit={save} className="mt-5 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Edit delivery</h2>
            <button type="button" aria-label="Close editor" onClick={() => setEditing(false)}>
              <X />
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <EditField
              name="orderNumber"
              label="Order number"
              defaultValue={delivery.order_number}
            />
            <label className="text-sm font-semibold">
              Vendor
              <select
                name="vendorId"
                defaultValue={delivery.vendor_id ?? ""}
                className="mt-2 h-12 w-full rounded-xl border bg-white px-3"
              >
                <option value="">Unknown vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name}
                  </option>
                ))}
              </select>
            </label>
            <EditField
              type="datetime-local"
              name="deliveredAt"
              label="Delivery time"
              defaultValue={toLocalInputValue(delivery.delivered_at)}
            />
            <label className="text-sm font-semibold">
              Status
              <select
                name="status"
                defaultValue={delivery.status}
                className="mt-2 h-12 w-full rounded-xl border bg-white px-3"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Notes
            <textarea
              name="notes"
              defaultValue={delivery.notes ?? ""}
              className="mt-2 min-h-24 w-full rounded-xl border p-3"
            />
          </label>
          <button className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-[#e24a32] px-5 font-bold text-white">
            <Save size={17} />
            Save correction
          </button>
        </form>
      )}
      <section className="mt-5 rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Photo gallery</h2>
          <span className="text-sm text-muted-foreground">{delivery.photos.length} photos</span>
        </div>
        {delivery.photos.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {delivery.photos.map(
              (photo, index) =>
                photo.signed_url && (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    <img
                      src={photo.signed_url}
                      alt={`Delivery photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <a
                      href={photo.signed_url}
                      download={photo.original_filename ?? `delivery-${index + 1}.jpg`}
                      className="absolute bottom-2 right-2 rounded-lg bg-black/70 p-2 text-white"
                      aria-label="Download photo"
                    >
                      <Download size={17} />
                    </a>
                  </div>
                ),
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed py-10 text-center text-muted-foreground">
            <Camera className="mx-auto" />
            <p className="mt-2">No photos attached</p>
          </div>
        )}
      </section>
      {delivery.notes && (
        <section className="mt-5 rounded-2xl border bg-white p-5">
          <h2 className="font-display text-xl font-bold">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{delivery.notes}</p>
        </section>
      )}
      <section className="mt-5 rounded-2xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <History size={19} />
          Audit history
        </h2>
        <div className="mt-4 space-y-3">
          {delivery.audit.length ? (
            delivery.audit.map((entry) => (
              <div key={entry.id} className="border-l-2 border-[#e24a32]/30 pl-4">
                <p className="font-semibold capitalize">Delivery {entry.action}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(entry.created_at)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          )}
        </div>
      </section>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Internal record ID: {delivery.id}
      </p>
    </main>
  );
}

function EditField({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        type={type}
        name={name}
        required
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-xl border px-3"
      />
    </label>
  );
}
