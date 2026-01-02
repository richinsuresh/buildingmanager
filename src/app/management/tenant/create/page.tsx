"use client";

import { useEffect, useState, FormEvent, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
import Link from "next/link";

type Building = {
  id: string;
  name: string;
  code: string | null;
};

type Room = {
  id: string;
  room_number: string;
  isOccupied?: boolean;
};

function generateTenantCredentials(buildingCode: string, roomNumber: string) {
  const username = `${roomNumber}@${buildingCode}`.toLowerCase();
  const password = `pass@${roomNumber}@${buildingCode}`.toLowerCase();
  return { username, password };
}

function CreateTenantContent() {
  const searchParams = useSearchParams();
  const paramBuildingId = searchParams.get("buildingId");
  const paramRoomId = searchParams.get("roomId");

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // Refs to handle race conditions and initialization
  const isMounted = useRef(false);
  const initialParamsHandled = useRef(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreementStart, setAgreementStart] = useState("");
  const [agreementEnd, setAgreementEnd] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [monthlyMaintenance, setMonthlyMaintenance] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  // 1. Load Buildings & Handle Initial URL Params
  useEffect(() => {
    const init = async () => {
      isMounted.current = true;
      const { data, error } = await supabase
        .from("buildings")
        .select("id, name, code")
        .order("name", { ascending: true });

      if (error) {
        setError(error.message);
        setLoadingBuildings(false);
        return;
      }

      const fetchedBuildings = (data || []) as Building[];
      setBuildings(fetchedBuildings);
      setLoadingBuildings(false);

      // Handle URL Parameters (Run only once)
      if (!initialParamsHandled.current && paramBuildingId) {
        // Try to find building by ID first, then by Code
        const matched = fetchedBuildings.find(
          b => b.id === paramBuildingId || b.code === paramBuildingId
        );
        
        if (matched) {
          setSelectedBuildingId(matched.id);
          // If we have a room ID too, set it (validation happens in loadRooms)
          if (paramRoomId) {
            setSelectedRoomId(paramRoomId);
          }
        }
        initialParamsHandled.current = true;
      }
    };

    init();
    return () => { isMounted.current = false; };
  }, [paramBuildingId, paramRoomId]);

  // 2. Load Rooms (with Race Condition Protection)
  useEffect(() => {
    let active = true; // Flag to prevent race conditions

    const fetchRooms = async () => {
      if (!selectedBuildingId) {
        setRooms([]);
        return;
      }

      setLoadingRooms(true);
      setError("");
      // Clear rooms immediately to prevent showing wrong building's rooms
      setRooms([]); 

      try {
        // A. Get occupied room IDs for this building
        const { data: occupiedTenants } = await supabase
            .from("tenants")
            .select("room_id")
            .eq("building_id", selectedBuildingId);
            
        const occupiedRoomIds = occupiedTenants?.map((t: any) => t.room_id) || [];

        // B. Get all rooms for this building
        const { data: allRooms, error: roomsError } = await supabase
            .from("rooms")
            .select("id, room_number")
            .eq("building_id", selectedBuildingId)
            .order("room_number", { ascending: true });

        if (!active) return; // If component unmounted or ID changed, stop

        if (roomsError) {
            console.error("Room fetch error:", roomsError);
            setError(roomsError.message);
        } else {
            // Map to include status
            const processedRooms = (allRooms || []).map((room: any) => ({
                id: room.id,
                room_number: room.room_number,
                isOccupied: occupiedRoomIds.includes(room.id)
            }));
            setRooms(processedRooms);
        }
      } catch (err: any) {
         if (active) setError(err.message);
      } finally {
         if (active) setLoadingRooms(false);
      }
    };

    fetchRooms();

    return () => { active = false; }; // Cleanup function
  }, [selectedBuildingId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (!selectedBuildingId || !selectedRoomId || !name.trim() || !monthlyRent || !monthlyMaintenance || !advancePaid) {
        throw new Error("Please fill in all required fields.");
      }

      const building = buildings.find((b) => b.id === selectedBuildingId);
      const room = rooms.find((r) => r.id === selectedRoomId);

      if (!building || !room || !building.code) {
        throw new Error("Invalid selection or missing building code.");
      }

      const { username, password } = generateTenantCredentials(
        building.code, 
        room.room_number
      );

      const { error: insertError } = await supabase
        .from("tenants")
        .insert({
          name: name.trim(),
          phone: phone.trim() || null,
          building_id: selectedBuildingId,
          room_id: selectedRoomId, 
          agreement_start: agreementStart || null,
          agreement_end: agreementEnd || null,
          rent: Number(monthlyRent), 
          maintenance: Number(monthlyMaintenance),
          advance_paid: Number(advancePaid),
          username,
          password,
        })
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
             throw new Error("Error: This room (or username) is already taken.");
        }
        throw insertError;
      }
      
      await supabase.from("rooms").update({ is_occupied: true }).eq("id", selectedRoomId);

      setGeneratedUsername(username);
      setGeneratedPassword(password);
      setSuccess("Tenant created successfully.");

      setName("");
      setPhone("");
      setAgreementStart("");
      setAgreementEnd("");
      setMonthlyRent("");
      setMonthlyMaintenance("");
      setAdvancePaid("");
      
      // Force refresh rooms to update occupancy status
      // We toggle selectedBuildingId briefly or just re-run the logic? 
      // Safest is to just manually re-trigger the effect logic logic or separate it.
      // Ideally, we just update the local state to reflect the change immediately:
      setRooms(prev => prev.map(r => r.id === selectedRoomId ? { ...r, isOccupied: true } : r));

    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingBuildings) return <p className="text-sm p-4">Loading buildings...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create New Tenant</h1>
        <div className="flex gap-3">
          <Link href="/management/tenant" className="text-[11px] underline">
            All tenants
          </Link>
          <Link href="/management/dashboard" className="text-[11px] underline">
            Dashboard
          </Link>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-3 text-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* BUILDING SELECT */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Building *</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedRoomId(""); // Reset room when building changes
              }}
            >
              <option value="">Select building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* ROOM SELECT */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Room *</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              disabled={!selectedBuildingId || loadingRooms || rooms.length === 0}
            >
              <option value="">
                {loadingRooms
                  ? "Loading rooms..."
                  : !selectedBuildingId
                  ? "Select building first"
                  : rooms.length === 0
                  ? "No rooms available"
                  : "Select room"}
              </option>
              {rooms.map((r) => (
                <option 
                  key={r.id} 
                  value={r.id}
                  className={r.isOccupied ? "text-red-500 font-medium" : "text-zinc-900"}
                >
                  {r.room_number} {r.isOccupied ? "(Occupied)" : ""}
                </option>
              ))}
            </select>
            {selectedBuildingId && rooms.length === 0 && !loadingRooms && (
                 <p className="text-[10px] text-red-500 mt-1">
                    No available rooms in this building. <Link href={`/management/buildings/${selectedBuildingId}/add-room`} className="underline">Add a room?</Link>
                 </p>
            )}
          </div>

          {/* FORM FIELDS */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Tenant name *</label>
            <input className="border rounded-lg px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Phone</label>
            <input className="border rounded-lg px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">Start Date</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={agreementStart} onChange={(e) => setAgreementStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">End Date</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={agreementEnd} onChange={(e) => setAgreementEnd(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">Monthly Rent (₹) *</label>
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} min={0} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">Maintenance (₹) *</label>
              <input type="number" className="border rounded-lg px-3 py-2 text-sm" value={monthlyMaintenance} onChange={(e) => setMonthlyMaintenance(e.target.value)} min={0} required />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">Advance Paid (₹) *</label>
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" value={advancePaid} onChange={(e) => setAdvancePaid(e.target.value)} min={0} required />
          </div>

          {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
          {success && <p className="text-[11px] text-green-600 mt-1">{success}</p>}

          <button
            type="submit"
            disabled={saving || !selectedRoomId}
            className="mt-2 rounded-lg px-4 py-2 text-sm font-medium bg-slate-900 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Tenant"}
          </button>
        </form>
      </section>

      {generatedUsername && generatedPassword && (
        <section className="bg-white rounded-xl shadow-sm p-3 text-sm">
          <h2 className="font-semibold mb-2">Login details</h2>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Username</span>
              <span className="font-mono text-xs">{generatedUsername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Password</span>
              <span className="font-mono text-xs">{generatedPassword}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function CreateTenantPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Loading...</div>}>
      <CreateTenantContent />
    </Suspense>
  );
}