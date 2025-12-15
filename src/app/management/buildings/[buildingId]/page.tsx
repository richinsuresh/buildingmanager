"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Building, Tenant, Room } from "@/lib/types"; 
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch all necessary data using the component's state (Client-side)
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

        // 2. Fetch tenants and rooms concurrently
        const [{ data: tenants }, { data: rooms }] = await Promise.all([
            // FIXED: Removed generics from .from()
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

    } catch (err: any) {
        console.error("Data Fetch Error:", err);
        setError(err.message || "Failed to load data. Check Supabase RLS.");
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only run data fetching when we have a valid building ID from the URL params
    if (buildingId) {
        loadData(buildingId);
    }
  }, [buildingId, loadData]);


  if (loading) {
    return (
        <div className="min-h-screen px-4 py-6">
            <p className="text-sm text-zinc-500">Loading building details...</p>
        </div>
    );
  }

  // --- Display Error State (Including "Building not found") ---
  if (error) {
    return (
        <div className="min-h-screen px-4 py-6">
            <p className="text-sm text-red-600">{error}</p>
            <Link
                href="/management/dashboard"
                className="mt-2 inline-block text-xs text-zinc-600 underline"
            >
                ← Back to dashboard
            </Link>
        </div>
    );
  }
  
  // --- Calculations for UI ---
  const tenantCount = tenantList.length;
  const roomCount = roomList.length;
  const totalMonthly =
    tenantList.reduce(
      (sum, t: any) => sum + (t.rent ?? 0) + (t.maintenance ?? 0),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">
            <Link
              href="/management/dashboard"
              className="underline hover:text-zinc-700"
            >
              ← Back to dashboard
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {building!.name}
          </h1>
          {building!.address && (
            <p className="mt-1 text-sm text-zinc-600">{building!.address}</p>
          )}
        </div>

        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700">
          {building!.code}
        </span>
      </header>

      {/* Stats for this building */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Total Units</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {roomCount}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Monthly Potential</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            ₹{totalMonthly.toLocaleString()}
          </p>
        </div>
        {/* ADD ROOM AND TENANT LINK */}
        <div className="rounded-xl bg-white p-4 shadow-sm flex flex-col justify-center gap-1">
          <Link
            href={`/management/buildings/${buildingId}/add-room`}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-300"
          >
            + Add New Room
          </Link>
           <Link
            href={`/management/tenant/create?buildingId=${buildingId}`}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            + Add New Tenant
          </Link>
        </div>
      </section>

      {/* Units & Occupancy List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Units & Occupancy</p>
          <p className="text-xs text-zinc-500">
              {tenantCount} occupied / {roomCount} total
          </p>
        </div>
        
        {roomList.length === 0 && (
          <p className="text-xs text-zinc-500">
            No rooms/units created yet. Click &ldquo;+ Add New Room&rdquo;.
          </p>
        )}

        <div className="space-y-3">
          {roomList.map((room) => {
            // Find the tenant linked to this room
            const tenant = tenantList.find((t: any) => t.room_id === room.id);

            return (
              <Link
                key={room.id}
                // Link to tenant edit page if occupied, or link to tenant creation with pre-selected room
                href={tenant 
                    ? `/management/tenant/${tenant.id}` 
                    : `/management/tenant/create?buildingId=${buildingId}&roomId=${room.id}`
                }
                className={`block rounded-xl p-4 shadow-sm transition-colors ${
                  tenant
                    ? "bg-white hover:bg-zinc-50"
                    : "bg-green-50 hover:bg-green-100 border border-green-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Room {room.room_number}
                    </p>
                    <p className={`mt-1 text-xs ${tenant ? 'text-zinc-500' : 'text-green-600 font-medium'}`}>
                      {tenant ? (
                        <>Tenant: {tenant.name}</>
                      ) : (
                        "Vacant - Click to add tenant"
                      )}
                    </p>
                    {tenant && (
                      <p className="text-[11px] text-zinc-400">
                        Rent: ₹{tenant.rent.toLocaleString()} • Maint: ₹{tenant.maintenance.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wide font-medium ${tenant ? 'bg-red-100 text-red-700' : 'bg-green-200 text-green-800'}`}>
                    {tenant ? "Occupied" : "Vacant"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}