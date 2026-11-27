import { NextResponse } from "next/server";
import {
  AUTH_HINT_COOKIE,
  clearAuthCookieOptions,
  clearAuthHintCookieOptions,
  WORDPRESS_AUTH_COOKIE,
} from "@/lib/wordpress-auth.server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
  response.cookies.set(AUTH_HINT_COOKIE, "", clearAuthHintCookieOptions());

  return response;
}

