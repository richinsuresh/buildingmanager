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
  payment_month: string | null;
  payment_type: "rent" | "deposit" | "maintenance" | "other" | string; // <--- NEW FIELD
  method: "online" | "cash" | "bank-transfer" | string;
  notes: string | null;
  created_at: string;
};

export type TenantDocument = {
  id: string;
  tenant_id: string;
  url: string;
  label: string | null;
  file_name?: string | null;
  created_at: string;
};

export type Room = {
  id: string;
  building_id: string;
  room_number: string;
  is_occupied: boolean;
  created_at: string;
};

export type Tenant = {
  id: string;
  building_id: string;
  room_id: string;
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
  room_number?: string;
};