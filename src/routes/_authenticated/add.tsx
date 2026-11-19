import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  ImagePlus,
  PackageX,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getVendors } from "@/lib/admin.functions";
import { useAppContext } from "@/lib/app-context";
import { addDeliveryPhoto, checkDuplicateOrder, createDelivery } from "@/lib/delivery.functions";
import { compressImage } from "@/lib/image-utils";
import type { DeliveryStatus, VendorInfo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/add")({
  validateSearch: z.object({ vendor: z.string().uuid().optional() }),
  component: AddDeliveryPage,
});

const statusOptions: Array<{
  value: DeliveryStatus;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
}> = [
  { value: "received", label: "Received", description: "Everything arrived", icon: CheckCircle2 },
  { value: "damaged", label: "Damaged", description: "Items arrived damaged", icon: PackageX },
  {
    value: "missing_items",
    label: "Missing items",
    description: "The order is incomplete",
    icon: TriangleAlert,
  },
  {
    value: "other_issue",
    label: "Other issue",
    description: "Something else is wrong",
    icon: AlertTriangle,
  },
];

const fieldClass =
  "mt-2 h-13 w-full rounded-xl border bg-white px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

function AddDeliveryPage() {
  const context = useAppContext();
  const navigate = useNavigate();
  const { vendor: selectedVendorId } = Route.useSearch();
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [storeId, setStoreId] = useState(
    context.profile.default_store_id ?? context.stores[0]?.id ?? "",
  );
  const [orderNumber, setOrderNumber] = useState("");
  const [vendorId, setVendorId] = useState(selectedVendorId ?? "");
  const [status, setStatus] = useState<DeliveryStatus>("received");
  const [notes, setNotes] = useState("");
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVendors()
      .then((items) => setVendors(items.filter((item) => item.active)))
      .catch(() => setError("Delivery partners could not be loaded. Try again."));
  }, []);

  useEffect(() => {
    if (selectedVendorId) setVendorId(selectedVendorId);
  }, [selectedVendorId]);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  const selectedVendor = vendors.find((vendor) => vendor.id === vendorId);
  const canSubmit = Boolean(files.length && storeId && vendorId && orderNumber.trim());

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
      setError("Add at least one clear delivery photo.");
      return;
    }
    if (!canSubmit) {
      setError("Complete the partner, order number, store, and photo fields.");
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
      void navigate({
        to: "/deliveries/$deliveryId",
        params: { deliveryId: delivery.id },
        search: { saved: "1" },
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `The delivery was not saved. ${reason.message}`
          : "The delivery was not saved. Check your connection and try again.",
      );
      setBusy(false);
    }
  }

  if (!vendorId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
        <h1 className="font-display text-3xl font-extrabold">Choose a delivery partner</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Your selection is saved with the record.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {vendors.map((vendor) => (
            <button
              key={vendor.id}
              type="button"
              onClick={() => setVendorId(vendor.id)}
              className="flex min-h-32 flex-col justify-between rounded-2xl bg-[#16251f] p-5 text-left text-white shadow-[0_8px_24px_rgba(20,30,25,.12)] transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[#e24a32]/30 active:scale-[.98]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/12 text-lg font-extrabold">
                {vendor.vendor_name.charAt(0)}
              </span>
              <span className="mt-7 text-lg font-extrabold">{vendor.vendor_name}</span>
            </button>
          ))}
        </div>
        {error && <StatusMessage>{error}</StatusMessage>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Record delivery</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {selectedVendor?.vendor_name ?? "Delivery partner"}
          </p>
        </div>
        <Link
          to="/"
          className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-[#16251f]"
        >
          Change partner
        </Link>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-7">
        <section aria-labelledby="photos-heading">
          <StepHeading
            number="1"
            id="photos-heading"
            title="Add photo proof"
            description="Show labels, quantity, and condition."
          />
          <label className="mt-4 flex min-h-48 cursor-pointer touch-manipulation flex-col items-center justify-center rounded-2xl bg-white px-5 text-center shadow-[0_8px_24px_rgba(20,30,25,.08)] ring-1 ring-[#e24a32]/20 transition active:bg-[#fff5f2]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e24a32] text-white">
              <Camera size={27} />
            </span>
            <span className="mt-3 text-lg font-extrabold">Take photos</span>
            <span className="mt-1 text-sm text-muted-foreground">Camera or photo library</span>
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => {
                setFiles((current) => [...current, ...Array.from(event.target.files ?? [])]);
                event.currentTarget.value = "";
              }}
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
                    alt={`Delivery photo ${index + 1}`}
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() =>
                      setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="details-heading">
          <StepHeading
            number="2"
            id="details-heading"
            title="Add delivery details"
            description="Only the essentials are required."
          />
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(20,30,25,.08)] sm:p-5">
            <label className="block text-sm font-bold">
              Order number
              <input
                required
                autoComplete="off"
                maxLength={100}
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                onBlur={duplicateCheck}
                placeholder="Enter the order number"
                className={fieldClass}
              />
            </label>

            {context.stores.length > 1 ? (
              <label className="mt-5 block text-sm font-bold">
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
                      {store.store_name ? ` ${store.store_name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-5 rounded-xl bg-[#edf1ee] px-4 py-3 text-sm text-[#34473d]">
                Saving to Store {context.stores[0]?.store_number}
                {context.stores[0]?.store_name ? ` ${context.stores[0].store_name}` : ""}
              </p>
            )}

            {duplicateCount > 0 && (
              <div
                className="mt-4 flex gap-3 rounded-xl bg-[#fff0cd] p-4 text-sm text-[#684800]"
                role="status"
              >
                <AlertTriangle className="shrink-0" size={19} />
                <p>
                  This order number already has {duplicateCount} record
                  {duplicateCount === 1 ? "" : "s"} at this store. Confirm the number before saving.
                </p>
              </div>
            )}

            <fieldset className="mt-5">
              <legend className="text-sm font-bold">Delivery condition</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = status === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`relative min-h-28 cursor-pointer rounded-xl p-3 transition ${selected ? "bg-[#16251f] text-white ring-2 ring-[#16251f]" : "bg-[#f3f2ee] text-[#27342e] hover:bg-[#ebeae5]"}`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={selected}
                        onChange={() => setStatus(option.value)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between gap-2">
                        <Icon size={20} />
                        {selected && <Check size={18} aria-hidden="true" />}
                      </div>
                      <span className="mt-4 block text-sm font-extrabold">{option.label}</span>
                      <span
                        className={`mt-1 block text-xs ${selected ? "text-white/70" : "text-muted-foreground"}`}
                      >
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-5 block text-sm font-bold">
              Notes <span className="font-normal text-muted-foreground">optional</span>
              <textarea
                value={notes}
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add damage, shortages, or follow-up details"
                className="mt-2 min-h-28 w-full rounded-xl border bg-white p-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 size={16} /> Date and time are recorded automatically.
            </p>
          </div>
        </section>

        {error && <StatusMessage>{error}</StatusMessage>}

        {busy && (
          <div
            className="rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(20,30,25,.08)]"
            aria-live="polite"
          >
            <div className="mb-2 flex justify-between text-sm font-bold">
              <span>Saving photos</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-[#e24a32] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Keep this page open until the record is complete.
            </p>
          </div>
        )}

        <div className="sticky bottom-20 z-10 -mx-2 rounded-2xl bg-[#f6f4ef]/95 p-2 backdrop-blur-sm">
          <button
            disabled={busy || !canSubmit}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#e24a32] px-5 font-extrabold text-white shadow-[0_8px_24px_rgba(226,74,50,.24)] transition enabled:hover:bg-[#cf3f2a] enabled:active:scale-[.99] disabled:cursor-not-allowed disabled:bg-[#c9cdca] disabled:text-[#68716c] disabled:shadow-none"
          >
            <ImagePlus size={20} />
            {busy ? "Saving delivery" : "Save delivery record"}
          </button>
          {!canSubmit && !busy && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Add a photo and order number to continue.
            </p>
          )}
        </div>
      </form>
    </main>
  );
}

function StepHeading({
  number,
  id,
  title,
  description,
}: {
  number: string;
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#16251f] font-extrabold text-white">
        {number}
      </span>
      <div>
        <h2 id={id} className="font-display text-xl font-bold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-4 rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive"
      role="alert"
    >
      {children}
    </p>
  );
}
