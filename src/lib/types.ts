export type AppRole = "market_admin" | "store_manager" | "crew";

export type DeliveryStatus = "received" | "damaged" | "missing_items" | "other_issue";

export interface OrganizationInfo {
  id: string;
  name: string;
}

export interface StoreInfo {
  id: string;
  organization_id: string;
  store_number: string;
  store_name: string | null;
}

export interface ProfileInfo {
  id: string;
  email: string | null;
  full_name: string | null;
  organization_id: string | null;
  default_store_id: string | null;
}

export interface MyContext {
  profile: ProfileInfo;
  roles: AppRole[];
  stores: StoreInfo[];
  organization: OrganizationInfo | null;
}

export interface VendorInfo {
  id: string;
  organization_id: string;
  vendor_name: string;
  active: boolean;
}

export interface DeliveryListItem {
  id: string;
  order_number: string;
  order_last_four: string | null;
  delivered_at: string;
  status: DeliveryStatus;
  notes: string | null;
  store: { store_number: string; store_name: string | null } | null;
  vendor: { vendor_name: string } | null;
  uploader: { full_name: string | null; email: string | null } | null;
  photo_count: number;
}

export interface DeliveryPhotoInfo {
  id: string;
  storage_path: string;
  original_filename: string | null;
  created_at: string;
  signed_url: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  changed_by: string | null;
  changer_name: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export interface DeliveryDetail extends DeliveryListItem {
  store_id: string;
  vendor_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  photos: DeliveryPhotoInfo[];
  audit: AuditEntry[];
  can_edit: boolean;
}

export interface OrgUser {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRole[];
  store_ids: string[];
}
