import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Ensure this page always fetches fresh data from Supabase
export const dynamic = "force-dynamic";

function getCurrentMonthRange() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  // Get last day of month by going to day 0 of next month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  return { startOfMonth, endOfMonth };
}

export default async function ManagementDashboardPage() {
  const { startOfMonth, endOfMonth } = getCurrentMonthRange();

  // Load buildings + tenants + payments(current month) from Supabase
  const [
    { data: buildings }, 
    { data: tenants },
    { data: payments }
  ] = await Promise.all([
    supabase.from("buildings").select("*").order("name", { ascending: true }),
    supabase.from("tenants").select("*"),
    // Fetch only this month's payments to calculate "Paid vs Pending"
    supabase
      .from("payments")
      .select("tenant_id, amount")
      .gte("paid_at", startOfMonth)
      .lte("paid_at", endOfMonth),
  ]);

  const buildingCount = buildings?.length ?? 0;
  const tenantCount = tenants?.length ?? 0;

  // Calculate Payment Stats
  // 1. Get list of tenant IDs who have paid at least once this month
  const paidTenantIds = new Set(payments?.map((p: any) => p.tenant_id));
  const paidCount = paidTenantIds.size;
  
  // 2. Pending is simply Total Tenants - Paid Tenants
  // (Assuming all active tenants are expected to pay)
  const pendingCount = Math.max(0, tenantCount - paidCount);

  const totalMonthlyRent =
    tenants?.reduce(
      (sum: number, t: any) => sum + (t.rent ?? 0) + (t.maintenance ?? 0),
      0
    ) ?? 0;

  return (
    <div className="min-h-screen space-y-8 pb-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Overview of your properties and financial performance.
          </p>
        </div>
        <div>
          <Link
            href="/management/buildings/create"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
          >
            + Add Property
          </Link>
        </div>
      </header>

      {/* Stats Cards - IMPROVED GRID */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Row 1: Property Stats */}
        <StatsCard 
          label="Total Buildings" 
          value={buildingCount} 
          icon={
            <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatsCard 
          label="Active Tenants" 
          value={tenantCount} 
          icon={
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        {/* Row 2: Payment Stats (NEW) */}
        <StatsCard 
          label="Paid This Month" 
          value={paidCount} 
          subText={`${Math.round((paidCount / (tenantCount || 1)) * 100)}% of tenants`}
          icon={
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard 
          label="Pending Payments" 
          value={pendingCount} 
          subText="Action needed"
          icon={
            <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </section>

      {/* Revenue Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-50 p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
               <p className="text-sm font-medium text-zinc-500">Total Monthly Potential</p>
               <p className="text-3xl font-bold text-zinc-900">₹{totalMonthlyRent.toLocaleString()}</p>
            </div>
         </div>
      </section>

      {/* Buildings Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Your Properties</h2>
        
        {buildingCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 py-16 text-center">
            <div className="rounded-full bg-zinc-100 p-3">
              <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-900">No properties yet</h3>
            <p className="mt-1 text-sm text-zinc-500">Get started by adding your first building.</p>
            <Link
              href="/management/buildings/create"
              className="mt-4 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              Add Building
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(buildings ?? []).map((b: any) => (
              <Link
                key={b.id}
                href={`/management/buildings/${b.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-zinc-100 p-2 text-zinc-900 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 border border-zinc-200">
                      {b.code}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-zinc-900 group-hover:text-blue-600">
                    {b.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 line-clamp-2 h-10">
                    {b.address || "No address provided"}
                  </p>
                </div>
                <div className="mt-4 flex items-center pt-4 border-t border-zinc-50">
                  <span className="text-xs font-medium text-blue-600 group-hover:underline">
                    Manage Building →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatsCard({ label, value, subText, icon }: { label: string, value: string | number, subText?: string, icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className="rounded-lg bg-zinc-50 p-2">
            {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-zinc-900">{value}</p>
      {subText && <p className="mt-1 text-xs text-zinc-400">{subText}</p>}
    </div>
  );
}