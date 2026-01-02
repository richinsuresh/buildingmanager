import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-8 text-center">
        {/* Logo & Hero */}
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
             {/* Using a simple icon if next.svg isn't perfect, or keep the image */}
             <svg className="h-8 w-8 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
             </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Building Manager
          </h1>
          <p className="mx-auto max-w-lg text-lg text-zinc-600">
            The simplest way to manage properties. Administer buildings or pay your rent, all in one place.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Tenant Card */}
          <Link
            href="/login/tenant"
            className="group relative flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
          >
            <div className="mb-4 rounded-full bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-100">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">I am a Tenant</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Log in to view your rent details, pay dues, and see agreements.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 group-hover:underline">
              Tenant Login &rarr;
            </span>
          </Link>

          {/* Management Card */}
          <Link
            href="/login/management"
            className="group relative flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
          >
            <div className="mb-4 rounded-full bg-zinc-100 p-3 text-zinc-600 transition-colors group-hover:bg-zinc-200 group-hover:text-zinc-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">I am a Manager</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Access the dashboard to manage buildings, rooms, and payments.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-zinc-900 group-hover:underline">
              Admin Login &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}