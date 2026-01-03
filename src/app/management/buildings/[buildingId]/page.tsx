"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Building, Tenant, Room, Payment } from "@/lib/types"; 
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type TenantDisplay = Tenant & { room_number: string; };

export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const buildingId = params.buildingId as string;

  const [building, setBuilding] = useState<Building | null>(null);
  const [tenantList, setTenantList] = useState<TenantDisplay[]>([]);
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // State for selected month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  
  const loadData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
        // 1. Fetch building
        const { data: buildingRows } = await supabase
            .from("buildings")
            .select("*")
            .eq("id", id);

        if (!buildingRows?.[0]) {
            setError("Building not found.");
            setLoading(false);
            return;
        }
        setBuilding(buildingRows[0] as Building);

        // 2. Fetch tenants & rooms
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
            status: t.status || 'active' // Default to active if null
        })) as TenantDisplay[];

        setTenantList(processedTenants);
        setRoomList(rooms ?? []);

        // 3. Fetch ALL payments
        if (processedTenants.length > 0) {
            const tenantIds = processedTenants.map(t => t.id);
            const { data: allPayments } = await supabase
                .from("payments")
                .select("*")
                .in("tenant_id", tenantIds);
            
            setPayments(allPayments || []);
        } else {
            setPayments([]);
        }

    } catch (err: any) {
        console.error("Data Fetch Error:", err);
        setError(err.message || "Failed to load data.");
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (buildingId) loadData(buildingId);
  }, [buildingId, loadData]);

  // --- Delete Room Function ---
  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (!confirm(`Are you sure you want to delete Room ${roomNumber}?`)) return;
    setDeletingRoomId(roomId);
    try {
        const { error } = await supabase.from("rooms").delete().eq("id", roomId);
        if (error) throw error;
        setRoomList(prev => prev.filter(r => r.id !== roomId));
    } catch (err: any) {
        alert("Error deleting room: " + err.message);
    } finally {
        setDeletingRoomId(null);
    }
  };

  // --- Helper: Payment Status ---
  const getPaymentStatus = (tenantId: string, rent: number, maintenance: number) => {
    const totalDue = rent + maintenance;
    const targetMonthStr = `${selectedMonth}-01`;

    const tenantPayments = payments.filter(p => {
        if (p.tenant_id !== tenantId) return false;
        if (p.payment_type === 'deposit') return false; // Exclude deposits

        if (p.payment_month) {
            return p.payment_month === targetMonthStr;
        }
        const paidDate = new Date(p.paid_at);
        const pMonthStr = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;
        return pMonthStr === selectedMonth;
    });

    const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid === 0) return { status: "pending", label: "Pending", color: "text-red-600 bg-red-50 border-red-200" };
    if (totalPaid >= totalDue) return { status: "paid", label: "Fully Paid", color: "text-green-700 bg-green-50 border-green-200" };
    return { status: "partial", label: `Paid ₹${totalPaid.toLocaleString()}`, color: "text-orange-700 bg-orange-50 border-orange-200" };
  };

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading...</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Error: {error}</div>;
  
  // Filter tenants
  const activeTenants = tenantList.filter(t => t.status !== 'vacated');
  const vacatedTenants = tenantList.filter(t => t.status === 'vacated');

  const tenantCount = activeTenants.length;
  const roomCount = roomList.length;
  const totalMonthly = activeTenants.reduce((sum, t: any) => sum + (t.rent ?? 0) + (t.maintenance ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <Link href="/management/dashboard" className="text-xs text-zinc-500 hover:text-zinc-900 underline mb-1 block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{building!.name}</h1>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600 border border-zinc-200">
              {building!.code}
            </span>
          </div>
          <p className="text-sm text-zinc-500">{building!.address}</p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-lg border border-zinc-200">
            <label className="text-xs font-medium text-zinc-500">View Month:</label>
            <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-medium text-zinc-900"
            />
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <p className="text-xs text-zinc-500 uppercase">Occupancy</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            {tenantCount} <span className="text-sm font-normal text-zinc-400">/ {roomCount}</span>
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <p className="text-xs text-zinc-500 uppercase">Est. Monthly Revenue</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">₹{totalMonthly.toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href={`/management/buildings/${buildingId}/add-room`}
            className="flex-1 flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50"
          >
            + Create Room
          </Link>
           <Link
            href={`/management/tenant/create?buildingId=${buildingId}`}
            className="flex-1 flex items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white hover:bg-zinc-800"
          >
            + Add Tenant
          </Link>
        </div>
      </section>

      {/* Rooms List (Active Tenants Only) */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">
            Room Status <span className="text-zinc-400 font-normal text-sm">({selectedMonth})</span>
        </h2>
        
        {roomList.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-zinc-300">
            <p className="text-sm text-zinc-500">No rooms yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {roomList.map((room) => {
              // Find ACTIVE tenant for this room
              const tenant = activeTenants.find((t: any) => t.room_id === room.id);
              const payInfo = tenant ? getPaymentStatus(tenant.id, tenant.rent, tenant.maintenance) : null;

              return (
                <div 
                  key={room.id}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-4 transition-all ${
                    tenant ? "bg-white border-zinc-200" : "bg-zinc-50 border-dashed border-zinc-300"
                  }`}
                >
                  <Link
                    href={tenant ? `/management/tenant/${tenant.id}` : `/management/tenant/create?buildingId=${buildingId}&roomId=${room.id}`}
                    className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-[120px]">
                        <span className="font-bold text-zinc-900 text-lg">{room.room_number}</span>
                        {!tenant && <span className="px-2 py-0.5 rounded bg-zinc-200 text-[10px] uppercase font-bold text-zinc-500">Vacant</span>}
                    </div>

                    {tenant && (
                        <div className="flex-1">
                            <p className="text-sm font-bold text-zinc-900">{tenant.name}</p>
                            <p className="text-xs text-zinc-500">Rent: ₹{(tenant.rent + tenant.maintenance).toLocaleString()}</p>
                        </div>
                    )}

                    {tenant && payInfo && (
                        <div className={`mt-2 sm:mt-0 px-3 py-1 rounded-md text-xs font-bold border ${payInfo.color}`}>
                            {payInfo.label}
                        </div>
                    )}
                  </Link>

                  {!tenant && (
                      <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id, room.room_number);
                        }}
                        disabled={deletingRoomId === room.id}
                        className="absolute top-4 right-4 sm:static sm:ml-4 p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Room"
                      >
                        {deletingRoomId === room.id ? "..." : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                      </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* VACATED TENANTS LIST (Bottom) */}
      {vacatedTenants.length > 0 && (
          <section className="space-y-4 pt-8 border-t border-zinc-200">
            <h2 className="text-lg font-bold text-zinc-700">Vacated Tenants</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vacatedTenants.map((vt) => (
                    <Link 
                        key={vt.id} 
                        href={`/management/tenant/${vt.id}`}
                        className="block rounded-xl border border-zinc-200 bg-zinc-50 p-4 hover:border-zinc-300 hover:bg-white transition-all opacity-75 hover:opacity-100"
                    >
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-sm font-bold text-zinc-900">{vt.name}</p>
                                <p className="text-xs text-zinc-500">Last Room: {vt.room_number}</p>
                             </div>
                             <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-[10px] uppercase font-bold rounded">Vacated</span>
                        </div>
                    </Link>
                ))}
            </div>
          </section>
      )}
    </div>
  );
}