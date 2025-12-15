"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { generateBuildingCode } from "@/lib/buildingCode";

export default function CreateBuildingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const code = generateBuildingCode(name);

      const { data, error: insertError } = await supabase
        .from("buildings")
        .insert([
          {
            name,
            code,
            address: address || null,
            description: description || null,
          },
        ])
        .select("*")
        .single();

      // Only treat it as an error if Supabase actually sent one
      if (insertError && insertError.message) {
        console.error("Supabase insert error:", insertError);
        setError(insertError.message || "Could not create building. Please try again.");
        setLoading(false);
        return;
      }

      if (!data) {
        // Very defensive: no data and no error
        setError("Building was not created. Please try again.");
        setLoading(false);
        return;
      }

      // ✅ Success – go back to dashboard
      router.replace("/management/dashboard");
    } catch (err) {
      console.error("Unexpected error while creating building:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link href="/management/dashboard" className="text-xs text-zinc-600">
          ← Back
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">
          Add new building
        </h1>
        <div className="w-10" /> {/* spacer */}
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Building name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Jehovah Nissi Ravi Enclave"
            required
          />
          {name && (
            <p className="mt-1 text-xs text-zinc-500">
              Code will be:{" "}
              <span className="font-semibold">
                {generateBuildingCode(name)}
              </span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Address (optional)
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            rows={2}
            placeholder="Street, area, city"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Notes / description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            rows={2}
            placeholder="Any internal notes about this building"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Create building"}
        </button>
      </form>
    </div>
  );
}
