import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-md flex-col justify-between py-10 px-6 bg-white dark:bg-black">
        {/* Logo / App name */}
        <div className="flex items-center gap-2 mb-10">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Building Manager"
            width={32}
            height={32}
          />
          <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Building Manager
          </span>
        </div>

        {/* Hero section */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            Manage rents without spreadsheets.
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Choose how you want to log in. Management can see all buildings,
            tenants get a simple view of their own rent and dues.
          </p>
        </div>

        {/* Login options */}
        <div className="mt-10 flex flex-col gap-4">
          <Link
            href="/login/management"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 text-sm font-medium shadow-sm hover:bg-zinc-800 transition-colors"
          >
            Login as Management
          </Link>

          <Link
            href="/login/tenant"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            Login as Tenant
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-zinc-400 text-center">
          You can change role anytime by going back to this screen.
        </p>
      </main>
    </div>
  );
}
