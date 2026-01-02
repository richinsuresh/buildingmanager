import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const role = req.cookies.get("role")?.value;
  const tenantId = req.cookies.get("tenantId")?.value;

  // Debugging logs (Check your server terminal)
  if (pathname.startsWith("/management") || pathname.startsWith("/tenant")) {
    console.log(`[Middleware] Path: ${pathname} | Role: ${role} | TenantId: ${tenantId}`);
  }

  const isManagementRoute = pathname.startsWith("/management");
  const isTenantRoute = pathname.startsWith("/tenant");

  // --- ROOT REDIRECT ---
  if (pathname === "/") {
      if (role === "management") {
          return NextResponse.redirect(new URL("/management/dashboard", req.url));
      }
      if (role === "tenant" && tenantId) {
          return NextResponse.redirect(new URL("/tenant/dashboard", req.url));
      }
      return NextResponse.next();
  }

  // --- PROTECTED ROUTES ---

  // 1. Management
  if (isManagementRoute) {
      if (role !== "management") {
        console.log("[Middleware] Redirecting to Admin Login: Not management role");
        return NextResponse.redirect(new URL("/login/management", req.url));
      }
  }

  // 2. Tenant
  if (isTenantRoute) {
      if (role !== "tenant" || !tenantId) {
        console.log("[Middleware] Redirecting to Tenant Login: Missing role or ID");
        return NextResponse.redirect(new URL("/login/tenant", req.url));
      }
  }

  return NextResponse.next();
}

export const config = {
  // We EXCLUDE /login from the matcher so you can always visit login pages to switch users
  matcher: ["/", "/management/:path*", "/tenant/:path*"],
};