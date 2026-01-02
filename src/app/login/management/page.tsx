"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin@123";

export default function ManagementLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      if (typeof document !== "undefined") {
        document.cookie = "role=management; path=/; max-age=86400"; // 1 day
        // Force hard navigation so middleware sees the cookie
        window.location.href = "/management/dashboard";
      }
    } else {
      setError("Invalid management credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-900">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Admin Login</h1>
          <p className="mt-2 text-sm text-zinc-500">Enter your credentials to access the dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50"
              placeholder="admin"
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
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50"
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
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Sign In"}
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