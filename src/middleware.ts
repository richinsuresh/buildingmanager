import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get("role")?.value;

  const isManagementRoute = pathname.startsWith("/management");
  const isTenantRoute = pathname.startsWith("/tenant");

  // Only guard management & tenant routes
  if (!isManagementRoute && !isTenantRoute) {
    return NextResponse.next();
  }

  // No role at all → send to correct login
  if (!role) {
    const loginPath = isManagementRoute ? "/login/management" : "/login/tenant";
    const loginUrl = new URL(loginPath, req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Wrong role → send to their own login
  if (isManagementRoute && role !== "management") {
    const loginUrl = new URL("/login/management", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isTenantRoute && role !== "tenant") {
    const loginUrl = new URL("/login/tenant", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/management/:path*", "/tenant/:path*"],
};
