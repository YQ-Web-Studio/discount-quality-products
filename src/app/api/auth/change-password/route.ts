import { NextResponse } from "next/server";
import {
  WORDPRESS_AUTH_COOKIE,
  changeWordPressPassword,
  clearAuthCookieOptions,
  getCurrentWordPressSession,
  loginWordPressUser,
} from "@/lib/wordpress-auth.server";

interface ChangePasswordRequestBody {
  currentPassword?: string;
  newPassword?: string;
}

function getSessionIdentifier(
  email: string | null | undefined,
  username: string | null | undefined,
  name: string
) {
  return (username || email || name).trim();
}

export async function POST(request: Request) {
  const session = await getCurrentWordPressSession();

  if (!session) {
    const response = NextResponse.json(
      { error: "Please sign in to update your password." },
      { status: 401 }
    );

    response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    return response;
  }

  try {
    const body = (await request.json()) as ChangePasswordRequestBody;
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Please complete all password fields." },
        { status: 400 }
      );
    }

    const identifier = getSessionIdentifier(
      session.user.email,
      session.user.username,
      session.user.name
    );

    try {
      await loginWordPressUser(identifier, currentPassword);
    } catch {
      return NextResponse.json(
        { error: "Your current password does not match our records." },
        { status: 400 }
      );
    }

    await changeWordPressPassword(session.token, newPassword);

    return NextResponse.json({
      success: true,
      message: "Your password has been updated.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "We could not update your password right now.";

    const status = message.toLowerCase().includes("session") ? 401 : 400;
    const response = NextResponse.json({ error: message }, { status });

    if (status === 401) {
      response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    }

    return response;
  }
}
