import { NextResponse } from "next/server";
import {
  clearAuthCookieOptions,
  getAuthCookieOptions,
  getCurrentWordPressSession,
  WORDPRESS_AUTH_COOKIE,
} from "@/lib/wordpress-auth.server";

export async function GET() {
  try {
    const session = await getCurrentWordPressSession();

    if (!session) {
      const response = NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      );

      response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
      return response;
    }

    const response = NextResponse.json({
      user: session.user,
      authenticated: true,
    });

    response.cookies.set(
      WORDPRESS_AUTH_COOKIE,
      session.token,
      getAuthCookieOptions(session.token)
    );

    return response;
  } catch (error) {
    console.error("Session API Error:", error);
    return NextResponse.json(
      { user: null, authenticated: false, error: "Internal session error" },
      { status: 500 }
    );
  }
}

