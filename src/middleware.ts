import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper function to manually parse a single cookie from the raw header string
function getCookieValueFromHeader(request: NextRequest, key: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }
  
  // 1. Split the raw cookie string into individual key=value pairs
  const cookies = cookieHeader.split(';').map(s => s.trim());

  // 2. Look for the specific key
  for (const cookie of cookies) {
    // Check if the cookie starts with the key followed by =
    if (cookie.startsWith(`${key}=`)) {
      // Extract the value part, ensuring it handles URL encoding/decoding if necessary
      const value = cookie.substring(key.length + 1).trim();
      
      // Simple check to ensure value is not empty
      return value || null; 
    }
  }
  
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // CRITICAL FIX: Use manual parsing from the raw header
  const role = getCookieValueFromHeader(req, "role");
  const tenantId = getCookieValueFromHeader(req, "tenantId");


  const isManagementRoute = pathname.startsWith("/management");
  const isTenantRoute = pathname.startsWith("/tenant");

  // --- 1. Handling Root Path Redirects ---
  if (pathname === "/") {
      if (role === "management") {
          return NextResponse.redirect(new URL("/management/dashboard", req.url));
      }
      if (role === "tenant" && tenantId) {
          return NextResponse.redirect(new URL("/tenant/dashboard", req.url));
      }
      // If no role, let it proceed to the role selection page
      return NextResponse.next();
  }


  // --- 2. Route Protection ---
  if (isManagementRoute || isTenantRoute) {
      
      // No role at all → send to correct login
      if (!role) {
        const loginPath = isManagementRoute ? "/login/management" : "/login/tenant";
        return NextResponse.redirect(new URL(loginPath, req.url));
      }

      // Wrong role → send to their own login
      if (isManagementRoute && role !== "management") {
        return NextResponse.redirect(new URL("/login/management", req.url));
      }

      if (isTenantRoute && role !== "tenant") {
        return NextResponse.redirect(new URL("/login/tenant", req.url));
      }
      
      // If they are a tenant but the tenantId cookie is missing (shouldn't happen, but safety check)
      if (isTenantRoute && role === "tenant" && !tenantId) {
           return NextResponse.redirect(new URL("/login/tenant", req.url));
      }
  }
  
  // If accessing a login page while already logged in, redirect to dashboard
  if (pathname.startsWith("/login")) {
      if (role === "management") {
          return NextResponse.redirect(new URL("/management/dashboard", req.url));
      }
      if (role === "tenant" && tenantId) {
          return NextResponse.redirect(new URL("/tenant/dashboard", req.url));
      }
  }


  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/management/:path*", "/tenant/:path*", "/login/:path*"],
};