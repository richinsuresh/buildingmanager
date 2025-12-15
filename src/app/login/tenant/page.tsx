"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Tenant } from "@/lib/types";

export default function TenantLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const { data, error: dbError } = await supabase
      // FIX: Removed the generic type <Tenant> to resolve the "Expected 2 type arguments" error
      .from("tenants")
      .select("id, username, password")
      .eq("username", username.trim())
      .maybeSingle();

    if (dbError) {
      console.error(dbError);
      setError("Something went wrong. Try again.");
      return;
    }

    if (!data) {
      setError("Tenant not found. Check your username.");
      return;
    }

    if (data.password !== password.trim()) {
      setError("Incorrect password.");
      return;
    }

    // set cookies for middleware
    if (typeof document !== "undefined") {
      document.cookie = "role=tenant; path=/";
      document.cookie = `tenantId=${data.id}; path=/`;
    }

    router.replace("/tenant/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Tenant Login
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Use the username and password given by your building management.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="Room@BuildingCode"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="mt-1 text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-zinc-50 hover:bg-zinc-800 transition-colors"
          >
            Login
          </button>
        </form>

        <Link
          href="/"
          className="mt-4 block text-center text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to role selection
        </Link>
      </main>
    </div>
  );
}