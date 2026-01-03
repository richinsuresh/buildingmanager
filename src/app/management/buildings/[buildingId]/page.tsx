"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Building, Tenant, Room, Payment } from "@/lib/types"; 
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

// Define the shape of the data needed for rendering
type TenantDisplay = Tenant & { room_number: string; };

export default function BuildingDetailPage() {
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [building, setBuilding] = useState<Building | null>(null);
  const [tenantList, setTenantList] = useState<TenantDisplay[]>([]);
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]); // New State for Payments
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
        // 1. Fetch building details
        const { data: buildingRows } = await supabase
            .from("buildings")
            .select("*")
            .eq("id", id);

        const fetchedBuilding = buildingRows?.[0] ?? null;

        if (!fetchedBuilding) {
            setError("Building not found.");
            setLoading(false);
            return;
        }
        setBuilding(fetchedBuilding as Building);

        // 2. Fetch tenants and rooms
        const [{ data: tenants }, { data: rooms }] = await Promise.all([
            supabase
                .from("tenants")
                .select("*, room:rooms(room_number)")
                .eq("building_id", id)
                .order("name", { ascending: true }),
            supabase
                .from("rooms")
                .select("id, room_number, is_occupied")
                .eq("building_id", id)
                .order("room_number", { ascending: true }),
        ]);

        const processedTenants = (tenants ?? []).map((t: any) => ({
            ...t,
            room_number: t.room?.room_number || "N/A",
        })) as TenantDisplay[];

        setTenantList(processedTenants);
        setRoomList(rooms ?? []);

        // 3. NEW: Fetch Payments for the Current Month
        if (processedTenants.length > 0) {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
            
            // Get IDs of all tenants in this building
            const tenantIds = processedTenants.map(t => t.id);

            const { data: currentPayments } = await supabase
                .from("payments")
                .select("*")
                .in("tenant_id", tenantIds)
                .gte("paid_at", startOfMonth)
                .lte("paid_at", endOfMonth);
            
            setPayments(currentPayments || []);
        }

    } catch (err: any) {
        console.error("Data Fetch Error:", err);
        setError(err.message || "Failed to load data.");
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (buildingId) {
        loadData(buildingId);
    }
  }, [buildingId, loadData]);

  // --- Helper to calculate payment status ---
  const getPaymentStatus = (tenantId: string, rent: number, maintenance: number) => {
    const totalDue = rent + maintenance;
    const tenantPayments = payments.filter(p => p.tenant_id === tenantId);
    const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid === 0) {
        return { status: "pending", label: "Pending", color: "text-red-600 bg-red-50 border-red-200" };
    }
    if (totalPaid >= totalDue) {
        return { status: "paid", label: "Fully Paid", color: "text-green-700 bg-green-50 border-green-200" };
    }
    return { 
        status: "partial", 
        label: `Paid ₹${totalPaid.toLocaleString()} / ₹${totalDue.toLocaleString()}`, 
        color: "text-orange-700 bg-orange-50 border-orange-200" 
    };
  };

  if (loading) {
    return <div className="min-h-screen px-4 py-6 text-sm text-zinc-500">Loading details...</div>;
  }

  if (error) {
    return (
        <div className="min-h-screen px-4 py-6">
            <p className="text-sm text-red-600">{error}</p>
            <Link href="/management/dashboard" className="mt-2 text-xs underline">← Back to dashboard</Link>
        </div>
    );
  }
  
  const tenantCount = tenantList.length;
  const roomCount = roomList.length;
  const totalMonthly = tenantList.reduce((sum, t: any) => sum + (t.rent ?? 0) + (t.maintenance ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">
            <Link href="/management/dashboard" className="underline hover:text-zinc-700">← Back to dashboard</Link>
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">{building!.name}</h1>
          {building!.address && <p className="mt-1 text-sm text-zinc-600">{building!.address}</p>}
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700">
          {building!.code}
        </span>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <p className="text-xs text-zinc-500">Total Units</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{roomCount}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <p className="text-xs text-zinc-500">Monthly Potential</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">₹{totalMonthly.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100 flex flex-col justify-center gap-2">
          <Link
            href={`/management/buildings/${buildingId}/add-room`}
            className="text-center rounded-md bg-zinc-100 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
          >
            + Add Room
          </Link>
           <Link
            href={`/management/tenant/create?buildingId=${buildingId}`}
            className="text-center rounded-md bg-zinc-900 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            + Add Tenant
          </Link>
        </div>
      </section>

      {/* Rooms List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Unit Status</p>
          <p className="text-xs text-zinc-500">{tenantCount} occupied / {roomCount} total</p>
        </div>
        
        {roomList.length === 0 && (
          <p className="text-xs text-zinc-500 italic">No rooms created yet.</p>
        )}

        <div className="grid grid-cols-1 gap-3">
          {roomList.map((room) => {
            const tenant = tenantList.find((t: any) => t.room_id === room.id);
            // Calculate status if tenant exists
            const payInfo = tenant 
                ? getPaymentStatus(tenant.id, tenant.rent, tenant.maintenance) 
                : null;

            return (
              <Link
                key={room.id}
                href={tenant 
                    ? `/management/tenant/${tenant.id}` 
                    : `/management/tenant/create?buildingId=${buildingId}&roomId=${room.id}`
                }
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl p-4 border transition-all ${
                  tenant
                    ? "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-md"
                    : "bg-zinc-50 border-dashed border-zinc-300 hover:border-zinc-400 hover:bg-zinc-100"
                }`}
              >
                {/* Left Side: Room & Tenant Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900">Room {room.room_number}</span>
                    {!tenant && (
                        <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-200 px-1.5 py-0.5 rounded">
                            Vacant
                        </span>
                    )}
                  </div>
                  
                  <div className="mt-1">
                    {tenant ? (
                      <div>
                        <p className="text-sm font-medium text-zinc-800 group-hover:text-blue-600">
                            {tenant.name}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Rent: ₹{(tenant.rent + tenant.maintenance).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 font-medium">+ Click to Assign Tenant</span>
                    )}
                  </div>
                </div>

                {/* Right Side: Payment Status */}
                {tenant && payInfo && (
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-100">
                     <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${payInfo.color}`}>
                        {payInfo.label}
                     </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}