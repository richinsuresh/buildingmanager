export type Building = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  description: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  tenant_id: string;
  amount: number;
  paid_at: string;
  method: "online" | "cash" | "bank-transfer" | string;
  notes: string | null;
  created_at: string;
};

export type TenantDocument = {
  id: string;
  tenant_id: string;
  url: string;
  label: string | null;
  created_at: string;
};

// NEW: Separate model for Room/Unit linked to a Building
export type Room = {
  id: string;
  building_id: string; // Foreign key to Building
  room_number: string; // e.g. "A-101"
  is_occupied: boolean; // Flag to check occupancy status
  created_at: string;
};

// UPDATED: Tenant now links to a Room via room_id (and the form uses 'name' and 'phone')
export type Tenant = {
  id: string;
  building_id: string; // Foreign key to Building
  room_id: string; // NEW: Foreign key to Room
  name: string;
  phone: string | null;
  username: string;
  password: string;
  rent: number;
  maintenance: number;
  advance_paid: number;
  agreement_start: string | null;
  agreement_end: string | null;
  created_at: string;
};

export type TenantWithExtras = Tenant & {
  building?: Building | null;
  payments?: Payment[];
  documents?: TenantDocument[];
  room_number?: string; // For convenient display after a database join
};