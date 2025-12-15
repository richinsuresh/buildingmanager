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

export type Tenant = {
  id: string;
  building_id: string;
  name: string;
  room_number: string;
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
};
