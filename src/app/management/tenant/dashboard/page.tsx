import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenantId")?.value;

  if (!tenantId) {
    redirect("/login/tenant");
  }

  // Fetch tenant details + building info
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select(`
      *,
      buildings (
        name,
        address
      )
    `)
    .eq("id", tenantId)
    .single();

  if (error || !tenant) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Error loading profile</h1>
        <p className="text-zinc-500">Please contact management.</p>
        <a href="/api/logout" className="mt-4 inline-block text-sm underline">Logout</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-10">
      <div className="mx-auto max-w-lg px-4 pt-8">
        
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">My Home</h1>
            <p className="text-sm text-zinc-500">
              {tenant.buildings?.name || "Building Code: " + tenant.building_id}
            </p>
          </div>
          <a
            href="/api/logout"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 hover:text-red-600"
          >
            Logout
          </a>
        </header>

        {/* Rent Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
             <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
               Active
             </span>
             <span className="text-xs text-zinc-400">Room {tenant.room_no}</span>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-zinc-500">Total Monthly Rent</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
              ₹{(tenant.rent || 0) + (tenant.maintenance || 0)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              (₹{tenant.rent} Rent + ₹{tenant.maintenance} Maint.)
            </p>
          </div>

          <form action="/api/payments/initiate" method="POST" className="mt-8">
            <input type="hidden" name="tenantId" value={tenant.id} />
            <input type="hidden" name="amount" value={(tenant.rent || 0) + (tenant.maintenance || 0)} />
            
            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.98] hover:bg-zinc-800"
            >
              Pay Rent Now
            </button>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
            <p className="text-xs text-zinc-400">Move-in Date</p>
            <p className="mt-1 font-semibold text-zinc-900">
              {new Date(tenant.created_at).toLocaleDateString()}
            </p>
          </div>
          <LinkCard href="/tenant/documents" label="Documents" icon="📄" />
        </div>
        
      </div>
    </div>
  );
}

function LinkCard({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <span className="text-xl">{icon}</span>
      <span className="mt-2 text-sm font-medium text-zinc-900">{label}</span>
    </a>
  );
}