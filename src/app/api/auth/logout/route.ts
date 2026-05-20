import { NextResponse } from "next/server";
import {
  clearAuthCookieOptions,
  WORDPRESS_AUTH_COOKIE,
} from "@/lib/wordpress-auth.server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());

  return response;
}

