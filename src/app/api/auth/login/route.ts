import { NextResponse } from "next/server";
import {
  AUTH_HINT_COOKIE,
  WORDPRESS_AUTH_COOKIE,
  getAuthCookieOptions,
  getAuthHintCookieOptions,
  loginWordPressUser,
} from "@/lib/wordpress-auth.server";

interface LoginRequestBody {
  identifier?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody;
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please enter your email address or username and password." },
        { status: 400 }
      );
    }

    const session = await loginWordPressUser(identifier, password);
    const response = NextResponse.json({ user: session.user });

    response.cookies.set(
      WORDPRESS_AUTH_COOKIE,
      session.token,
      getAuthCookieOptions(session.token)
    );
    response.cookies.set(
      AUTH_HINT_COOKIE,
      "1",
      getAuthHintCookieOptions(session.token)
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "We could not sign you in right now.";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
