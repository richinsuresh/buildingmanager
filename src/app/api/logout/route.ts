// src/app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Redirect to the home page
  const response = NextResponse.redirect(new URL("/", request.url));

  // Clear the authentication cookies
  response.cookies.delete("role");
  response.cookies.delete("tenantId");

  return response;
}