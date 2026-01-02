"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function TenantLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        setError("Please enter both username and password.");
        setLoading(false);
        return;
      }

      // 1. Fetch tenant
      const { data, error: dbError } = await supabase
        .from("tenants")
        .select("id, username, password")
        .eq("username", username.trim())
        .maybeSingle();

      if (dbError) {
        console.error("Database Error:", dbError);
        setError("System error. Please try again later.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Tenant account not found.");
        setLoading(false);
        return;
      }

      // 2. Verify password
      if (data.password !== password.trim()) {
        setError("Incorrect password.");
        setLoading(false);
        return;
      }

      // 3. Set Cookies (Robust Method)
      if (typeof document !== "undefined") {
        // A. Clear any existing cookies first to avoid conflicts
        document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "tenantId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // B. Set new cookies
        const expires = new Date(Date.now() + 86400 * 1000).toUTCString(); // 1 day
        document.cookie = `role=tenant; path=/; expires=${expires}; SameSite=Lax`;
        document.cookie = `tenantId=${data.id}; path=/; expires=${expires}; SameSite=Lax`;
        
        // C. Force Hard Navigation
        console.log("Login success. Redirecting to dashboard...");
        window.location.href = "/tenant/dashboard";
      }

    } catch (err) {
      console.error("Login Error:", err);
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Tenant Portal</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to pay rent and view documents.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-50"
              placeholder="e.g. Room-101"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-50"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-inset ring-red-500/10">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
            &larr; Back to role selection
          </Link>
        </div>
      </div>
    </div>
  );
}