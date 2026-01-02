import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import QuickPaymentModal from "./QuickPaymentModal"; 

export const dynamic = "force-dynamic";

function getMonthRanges() {
  const now = new Date();
  
  // Current Month
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // Last Month
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  return { currentStart, currentEnd, lastStart, lastEnd };
}

export default async function ManagementDashboardPage() {
  const { currentStart, currentEnd, lastStart, lastEnd } = getMonthRanges();

  // Load buildings + tenants + payments
  const [
    { data: buildings }, 
    { data: tenants },
    { data: currentPayments },
    { data: lastMonthPayments }
  ] = await Promise.all([
    supabase.from("buildings").select("*").order("name", { ascending: true }),
    supabase.from("tenants").select("*, room:rooms(room_number)"), 
    
    // Current Month (Stats only)
    supabase
      .from("payments")
      .select("tenant_id, amount")
      .gte("paid_at", currentStart)
      .lte("paid_at", currentEnd),

    // Last Month (Full Details for List)
    supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants (
          name,
          room:rooms (
            room_number
          )
        )
      `)
      .gte("paid_at", lastStart)
      .lte("paid_at", lastEnd)
      .order("paid_at", { ascending: false }),
  ]);

  const buildingCount = buildings?.length ?? 0;
  const tenantCount = tenants?.length ?? 0;

  // --- Current Month Stats ---
  const paidTenantIds = new Set(currentPayments?.map((p: any) => p.tenant_id));
  const paidCount = paidTenantIds.size;
  const pendingCount = Math.max(0, tenantCount - paidCount);

  // --- Last Month Stats ---
  // FIX: Added types (sum: number, p: any) to resolve build error
  const lastMonthTotal = lastMonthPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const lastMonthCount = lastMonthPayments?.length || 0;

  const totalMonthlyPotential =
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
            Overview of properties & financial performance.
          </p>
        </div>
        <div className="flex items-center gap-4">
            {/* Logout Link */}
            <a
                href="/api/logout" 
                className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
            >
                Logout
            </a>
            
            {/* Quick Payment Button */}
            <QuickPaymentModal buildings={buildings || []} tenants={tenants || []} />
            
            <Link
                href="/management/buildings/create"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 transition-colors"
            >
                + Add Property
            </Link>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Paid Count */}
        <StatsCard 
          label="Paid This Month" 
          value={paidCount} 
          subText={`${Math.round((paidCount / (tenantCount || 1)) * 100)}% of tenants`}
          iconColor="text-green-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />

        {/* Card 2: Pending Count */}
        <StatsCard 
          label="Pending Payments" 
          value={pendingCount} 
          subText="Current Month"
          iconColor="text-orange-500"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        
        {/* Card 3: Last Month Revenue Summary */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
             <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-600">Last Month's Revenue</p>
                <div className="rounded-lg bg-white p-1.5 text-blue-500 shadow-sm">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
             </div>
             <p className="mt-4 text-2xl font-bold text-zinc-900">₹{lastMonthTotal.toLocaleString()}</p>
             <p className="mt-1 text-xs text-zinc-500">{lastMonthCount} transactions</p>
        </div>

        {/* Card 4: Active Tenants */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Active Tenants</p>
            <p className="mt-4 text-3xl font-bold text-zinc-900">{tenantCount}</p>
            <p className="mt-1 text-xs text-zinc-400">Across {buildingCount} Buildings</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Properties List */}
        <div className="lg:col-span-2 space-y-6">
           <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
             <h2 className="text-lg font-bold text-zinc-900 mb-4">Your Properties</h2>
             {buildingCount === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-500">No properties yet.</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(buildings ?? []).map((b: any) => (
                    <Link
                      key={b.id}
                      href={`/management/buildings/${b.id}`}
                      className="group flex flex-col justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-4 hover:bg-white hover:border-zinc-300 hover:shadow-sm transition-all"
                    >
                        <div>
                          <div className="flex items-start justify-between">
                              <span className="font-bold text-base text-zinc-900">{b.name}</span>
                              <span className="text-xs font-mono bg-white border border-zinc-200 px-2 py-1 rounded text-zinc-600">{b.code}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{b.address}</p>
                        </div>
                    </Link>
                  ))}
                </div>
             )}
           </section>
        </div>

        {/* RIGHT COLUMN: Last Month's Payment Log */}
        <div className="space-y-6">
           <section className="rounded-xl border border-zinc-200 bg-white shadow-sm flex flex-col max-h-[600px]">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center">
                 <h2 className="text-sm font-bold text-zinc-900">Last Month's History</h2>
                 <span className="text-xs text-zinc-500 bg-white px-2 py-1 rounded border border-zinc-200">
                    {new Date(lastStart).toLocaleString('default', { month: 'short' })}
                 </span>
              </div>
              
              <div className="overflow-y-auto p-2 space-y-2 flex-1">
                 {(!lastMonthPayments || lastMonthPayments.length === 0) ? (
                    <div className="text-center py-10">
                       <p className="text-sm text-zinc-400 italic">No payments recorded last month.</p>
                    </div>
                 ) : (
                    lastMonthPayments.map((p: any) => (
                       <div key={p.id} className="p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                             <div>
                                <p className="text-sm font-bold text-zinc-900">{p.tenant?.name || "Unknown Tenant"}</p>
                                <p className="text-xs text-zinc-500">
                                   Room {p.tenant?.room?.room_number || "N/A"}
                                </p>
                             </div>
                             <span className="font-mono text-sm font-bold text-green-700">
                                +₹{p.amount.toLocaleString()}
                             </span>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                             <div className="flex gap-2">
                                <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                                   {p.method}
                                </span>
                             </div>
                             <span className="text-[10px] text-zinc-400">
                                {new Date(p.paid_at).toLocaleDateString()}
                             </span>
                          </div>
                       </div>
                    ))
                 )}
              </div>
              <div className="p-3 border-t border-zinc-100 text-center">
                 <p className="text-xs text-zinc-400">Showing {lastMonthPayments?.length || 0} records</p>
              </div>
           </section>
        </div>

      </div>
    </div>
  );
}

function StatsCard({ label, value, subText, icon, iconColor }: any) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className={`rounded-lg bg-zinc-50 p-2 ${iconColor}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {icon}
            </svg>
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-zinc-900">{value}</p>
      {subText && <p className="mt-1 text-xs text-zinc-400">{subText}</p>}
    </div>
  );
}