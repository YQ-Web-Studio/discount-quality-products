import { NextResponse } from "next/server";
import {
  AUTH_HINT_COOKIE,
  WORDPRESS_AUTH_COOKIE,
  getAuthCookieOptions,
  getAuthHintCookieOptions,
  registerWordPressUser,
} from "@/lib/wordpress-auth.server";

interface RegisterRequestBody {
  name?: string;
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterRequestBody;
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please complete all registration fields." },
        { status: 400 }
      );
    }

    const session = await registerWordPressUser(name, email, password);
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
        : "We could not create your account right now.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
