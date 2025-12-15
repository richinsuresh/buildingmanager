import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Tenant, Payment } from "@/lib/types";
import { getPendingAmount } from "@/lib/payments";

export default async function TenantDashboardPage() {
  const cookieStore = cookies();
  const tenantId = cookieStore.get("tenantId")?.value;

  if (!tenantId) {
    redirect("/login/tenant");
  }

  const [{ data: tenant }, { data: payments }] = await Promise.all([
    supabase
      .from<Tenant>("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle(),
    supabase
      .from<Payment>("payments")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("paid_at", { ascending: false }),
  ]);

  if (!tenant) {
    redirect("/login/tenant");
  }

  const paymentList = payments ?? [];
  const pending = getPendingAmount(
    tenant.rent,
    tenant.maintenance,
    paymentList
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-4 dark:bg-black">
      <header className="mb-4">
        <p className="text-xs text-zinc-500">Welcome</p>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {tenant.name}
        </h1>
        <p className="text-xs text-zinc-500">
          Room {tenant.room_number}
        </p>
      </header>

      {/* same UI as before, but using tenant + pending + paymentList */}
    </div>
  );
}
