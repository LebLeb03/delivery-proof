import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Camera, Clock3, ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVendors } from "@/lib/admin.functions";
import { useAppContext } from "@/lib/app-context";
import { addDeliveryPhoto, checkDuplicateOrder, createDelivery } from "@/lib/delivery.functions";
import { STATUS_OPTIONS } from "@/lib/delivery-utils";
import { compressImage } from "@/lib/image-utils";
import type { DeliveryStatus, VendorInfo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/add")({ component: AddDeliveryPage });
const fieldClass =
  "mt-2 h-12 w-full rounded-xl border bg-white px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function AddDeliveryPage() {
  const context = useAppContext();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [storeId, setStoreId] = useState(
    context.profile.default_store_id ?? context.stores[0]?.id ?? "",
  );
  const [orderNumber, setOrderNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [status, setStatus] = useState<DeliveryStatus>("received");
  const [notes, setNotes] = useState("");
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getVendors()
      .then(setVendors)
      .catch(() => setError("Could not load vendors"));
  }, []);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  async function duplicateCheck() {
    if (!orderNumber.trim() || !storeId) return;
    try {
      const result = await checkDuplicateOrder({ data: { orderNumber, storeId } });
      setDuplicateCount(result.count);
    } catch {
      setDuplicateCount(0);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!files.length) {
      setError("Add at least one delivery photo.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(2);
    try {
      const delivery = await createDelivery({
        data: {
          organizationId: context.profile.organization_id!,
          storeId,
          vendorId,
          orderNumber,
          deliveredAt: new Date().toISOString(),
          status,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      for (const [index, file] of files.entries()) {
        const blob = await compressImage(file);
        const path = `${storeId}/${delivery.id}/${crypto.randomUUID()}.jpg`;
        const upload = await supabase.storage
          .from("delivery-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upload.error) throw upload.error;
        await addDeliveryPhoto({
          data: { deliveryId: delivery.id, storagePath: path, originalFilename: file.name },
        });
        setProgress(Math.round(((index + 1) / files.length) * 100));
      }
      void navigate({ to: "/deliveries/$deliveryId", params: { deliveryId: delivery.id } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save delivery");
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-5 py-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.15em] text-[#a83225]">New record</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">Add delivery</h1>
        <p className="mt-2 text-muted-foreground">
          Capture clear photos and the essential delivery details.
        </p>
      </div>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-bold">Photo proof</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Labels, quantity and condition should be readable.
          </p>
          <label className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e24a32]/35 bg-[#e24a32]/5 text-center">
            <Camera className="text-[#e24a32]" />
            <span className="mt-2 font-bold">Take photos or choose files</span>
            <span className="mt-1 text-xs text-muted-foreground">Multiple images supported</span>
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) =>
                setFiles((current) => [...current, ...Array.from(event.target.files ?? [])])
              }
            />
          </label>
          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map(({ file, url }, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={url}
                    className="h-full w-full object-cover"
                    alt={`Preview ${index + 1}`}
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() =>
                      setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-bold">Delivery details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Order number
              <input
                required
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                onBlur={duplicateCheck}
                placeholder="e.g. MB-00981"
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold">
              Vendor
              <select
                required
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Select vendor</option>
                {vendors
                  .filter((vendor) => vendor.active)
                  .map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Store
              <select
                required
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className={fieldClass}
              >
                {context.stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    Store {store.store_number}
                    {store.store_name ? ` — ${store.store_name}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as DeliveryStatus)}
                className={fieldClass}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {duplicateCount > 0 && (
            <div className="mt-4 flex gap-3 rounded-xl bg-[#fff0cd] p-4 text-sm text-[#684800]">
              <AlertTriangle className="shrink-0" size={19} />
              <p>
                <strong>
                  {duplicateCount} existing record{duplicateCount === 1 ? "" : "s"}
                </strong>{" "}
                use this order number at the selected store. Saving will create a separate
                delivery—it will never overwrite the others.
              </p>
            </div>
          )}
          <label className="mt-4 block text-sm font-semibold">
            Notes <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border bg-white p-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 size={16} />
            The exact date and time, including seconds, is recorded automatically.
          </p>
        </section>
        {error && (
          <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
        )}
        {busy && (
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 flex justify-between text-sm font-semibold">
              <span>Uploading delivery</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-[#e24a32] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <button
          disabled={busy}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#e24a32] font-bold text-white shadow-lg disabled:opacity-60"
        >
          <ImagePlus size={20} />
          {busy ? "Saving delivery…" : "Save delivery"}
        </button>
      </form>
    </main>
  );
}
