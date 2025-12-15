"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AddTenantPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [buildingCode, setBuildingCode] = useState<string>("");

  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [rent, setRent] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [advance, setAdvance] = useState("");
  const [agreementStart, setAgreementStart] = useState("");
  const [agreementEnd, setAgreementEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCreds, setSuccessCreds] = useState<null | {
    username: string;
    password: string;
  }>(null);

  // ✅ Load building code
  useEffect(() => {
    async function loadBuilding() {
      const { data, error } = await supabase
        .from("buildings")
        .select("code")
        .eq("id", buildingId)
        .single();

      if (data?.code) setBuildingCode(data.code);
    }

    loadBuilding();
  }, [buildingId]);

  const username =
    roomNumber && buildingCode
      ? `${roomNumber}@${buildingCode}`
      : "";

  const password =
    roomNumber && buildingCode
      ? `pass@${roomNumber}@${buildingCode}`
      : "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: insertError } = await supabase.from("tenants").insert([
      {
        building_id: buildingId,
        name,
        room_number: roomNumber,
        username,
        password,
        rent: Number(rent),
        maintenance: Number(maintenance),
        advance_paid: Number(advance),
        agreement_start: agreementStart || null,
        agreement_end: agreementEnd || null,
      },
    ]);

    if (insertError) {
      console.error(insertError);
      setError("Could not create tenant. Username may already exist.");
      setLoading(false);
      return;
    }

    setSuccessCreds({ username, password });
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link
          href={`/management/buildings/${buildingId}`}
          className="text-xs text-zinc-600"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">
          Add Tenant
        </h1>
        <div className="w-10" />
      </header>

      {/* ✅ Generated Credentials Preview */}
      {username && (
        <div className="rounded-lg bg-zinc-100 p-3 text-sm">
          <p>
            <strong>Username:</strong> {username}
          </p>
          <p>
            <strong>Password:</strong> {password}
          </p>
        </div>
      )}

      {/* ✅ Success Display */}
      {successCreds && (
        <div className="rounded-lg bg-green-100 p-4 text-sm text-green-800">
          <p className="font-semibold mb-1">✅ Tenant Created</p>
          <p>Username: {successCreds.username}</p>
          <p>Password: {successCreds.password}</p>

          <button
            onClick={() =>
              router.push(`/management/buildings/${buildingId}`)
            }
            className="mt-3 rounded bg-green-700 px-4 py-2 text-white text-xs"
          >
            Back to Building
          </button>
        </div>
      )}

      {/* ✅ Tenant Form */}
      {!successCreds && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Tenant Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Room Number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            required
          />

          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Rent"
            type="number"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            required
          />

          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Maintenance"
            type="number"
            value={maintenance}
            onChange={(e) => setMaintenance(e.target.value)}
            required
          />

          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Advance Paid"
            type="number"
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
            required
          />

          <input
            type="date"
            className="w-full rounded border p-2 text-sm"
            value={agreementStart}
            onChange={(e) => setAgreementStart(e.target.value)}
          />

          <input
            type="date"
            className="w-full rounded border p-2 text-sm"
            value={agreementEnd}
            onChange={(e) => setAgreementEnd(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-zinc-900 py-2 text-sm text-white hover:bg-zinc-800"
          >
            {loading ? "Saving..." : "Create Tenant"}
          </button>
        </form>
      )}
    </div>
  );
}
