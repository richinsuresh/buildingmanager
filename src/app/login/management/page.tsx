"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin@123";

export default function ManagementLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // ✅ Tell middleware we're management
      if (typeof document !== "undefined") {
        document.cookie = "role=management; path=/";
      }

      router.replace("/management/dashboard");
    } else {
      setError("Invalid management credentials.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Management Login
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in to manage buildings, tenants and rent.
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
              placeholder="admin"
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
